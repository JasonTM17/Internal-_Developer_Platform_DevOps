/* eslint-disable */
/**
 * Rate Limiting Middleware with Redis Backend
 *
 * Implements sliding window rate limiting using Redis:
 * - Per-client rate limiting based on IP or authenticated user
 * - Configurable windows and limits per route group
 * - Standard rate limit headers (X-RateLimit-*)
 * - Graceful degradation when Redis is unavailable
 * - Support for rate limit bypass tokens (for internal services)
 */

import type { Request, Response, NextFunction } from 'express';

/** Rate limit configuration for a route group. */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Custom key generator (defaults to IP-based) */
  keyGenerator?: (req: Request) => string;
  /** Whether to skip rate limiting for authenticated users */
  skipAuthenticated?: boolean;
  /** Custom message for rate limit exceeded response */
  message?: string;
  /** Whether to include standard rate limit headers */
  includeHeaders?: boolean;
}

/** Rate limit state for a client. */
export interface RateLimitState {
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Total limit for the window */
  limit: number;
  /** Unix timestamp (seconds) when the window resets */
  resetAt: number;
  /** Whether the client is currently rate limited */
  isLimited: boolean;
}

/** Redis client interface for rate limiting. */
export interface RateLimitRedisClient {
  /** Execute a multi/pipeline of commands atomically */
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
  /** Check if the client is connected */
  isReady(): boolean;
}

/** In-memory fallback store for when Redis is unavailable. */
interface InMemoryEntry {
  count: number;
  resetAt: number;
}

/**
 * Sliding window rate limiter using Redis sorted sets.
 *
 * Algorithm:
 * 1. Remove expired entries from the sorted set (older than window)
 * 2. Count remaining entries in the set
 * 3. If under limit, add current timestamp to the set
 * 4. Set TTL on the key to auto-cleanup
 */
export class RateLimiter {
  private readonly inMemoryStore: Map<string, InMemoryEntry> = new Map();
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  /** Lua script for atomic sliding window rate limiting. */
  private static readonly SLIDING_WINDOW_SCRIPT = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local member = ARGV[4]

    -- Remove expired entries
    redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

    -- Count current entries
    local count = redis.call('ZCARD', key)

    if count < limit then
      -- Add new entry
      redis.call('ZADD', key, now, member)
      -- Set TTL for auto-cleanup
      redis.call('PEXPIRE', key, window)
      return {limit - count - 1, 0}
    else
      return {0, 1}
    end
  `;

  constructor(
    private readonly redis: RateLimitRedisClient | null,
    private readonly config: RateLimitConfig,
  ) {
    // Periodic cleanup of in-memory store
    this.cleanupInterval = setInterval(() => {
      this.cleanupInMemoryStore();
    }, 60000);
  }

  /**
   * Check and consume a rate limit token for the given request.
   */
  async consume(req: Request): Promise<RateLimitState> {
    const key = this.getKey(req);
    const now = Date.now();
    const resetAt = Math.ceil((now + this.config.windowMs) / 1000);

    // Try Redis first, fall back to in-memory
    if (this.redis && this.redis.isReady()) {
      return this.consumeRedis(key, now, resetAt);
    }

    return this.consumeInMemory(key, now, resetAt);
  }

  /**
   * Consume using Redis sliding window.
   */
  private async consumeRedis(key: string, now: number, resetAt: number): Promise<RateLimitState> {
    try {
      const result = await this.redis!.eval(
        RateLimiter.SLIDING_WINDOW_SCRIPT,
        [`ratelimit:${key}`],
        [
          String(now),
          String(this.config.windowMs),
          String(this.config.maxRequests),
          `${now}:${Math.random().toString(36).slice(2)}`,
        ],
      );

      const [remaining, isLimited] = result as [number, number];

      return {
        remaining: Math.max(0, remaining),
        limit: this.config.maxRequests,
        resetAt,
        isLimited: isLimited === 1,
      };
    } catch {
      // Fall back to in-memory on Redis error
      return this.consumeInMemory(key, now, resetAt);
    }
  }

  /**
   * Consume using in-memory sliding window (fallback).
   */
  private consumeInMemory(key: string, now: number, resetAt: number): RateLimitState {
    const entry = this.inMemoryStore.get(key);

    if (!entry || now > entry.resetAt * 1000) {
      // New window
      this.inMemoryStore.set(key, { count: 1, resetAt });
      return {
        remaining: this.config.maxRequests - 1,
        limit: this.config.maxRequests,
        resetAt,
        isLimited: false,
      };
    }

    entry.count++;

    if (entry.count > this.config.maxRequests) {
      return {
        remaining: 0,
        limit: this.config.maxRequests,
        resetAt: entry.resetAt,
        isLimited: true,
      };
    }

    return {
      remaining: this.config.maxRequests - entry.count,
      limit: this.config.maxRequests,
      resetAt: entry.resetAt,
      isLimited: false,
    };
  }

  /**
   * Public fallback for use when Redis errors occur in middleware.
   */
  consumeFallback(req: Request): RateLimitState {
    const key = this.getKey(req);
    const now = Date.now();
    const resetAt = Math.ceil((now + this.config.windowMs) / 1000);
    return this.consumeInMemory(key, now, resetAt);
  }

  /**
   * Generate the rate limit key for a request.
   */
  private getKey(req: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }

    // Default: use authenticated user ID or IP address
    const userId = (req as unknown as Record<string, unknown>).userId as string | undefined;
    if (userId) return `user:${userId}`;

    const ip = req.headers['x-forwarded-for']
      ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
      : req.ip || req.socket.remoteAddress || 'unknown';

    return `ip:${ip}`;
  }

  /**
   * Clean up expired entries from the in-memory store.
   */
  private cleanupInMemoryStore(): void {
    const now = Math.ceil(Date.now() / 1000);
    for (const [key, entry] of this.inMemoryStore.entries()) {
      if (now > entry.resetAt) {
        this.inMemoryStore.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter and clean up resources.
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.inMemoryStore.clear();
  }
}

/**
 * Create rate limiting middleware.
 *
 * Applies sliding window rate limiting and sets standard headers:
 * - X-RateLimit-Limit: Maximum requests per window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when the window resets
 * - Retry-After: Seconds until the client can retry (when limited)
 */
export function createRateLimiter(redis: RateLimitRedisClient | null, config: RateLimitConfig) {
  const limiter = new RateLimiter(redis, config);
  const includeHeaders = config.includeHeaders !== false;
  const message = config.message || 'Too many requests, please try again later';

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Check for bypass token (internal services)
    const bypassToken = req.headers['x-ratelimit-bypass'];
    if (bypassToken && process.env.RATE_LIMIT_BYPASS_TOKEN === bypassToken) {
      next();
      return;
    }

    // Skip for authenticated users if configured
    if (config.skipAuthenticated && (req as unknown as Record<string, unknown>).userId) {
      next();
      return;
    }

    limiter
      .consume(req)
      .then((state) => {
        // Set rate limit headers
        if (includeHeaders) {
          res.setHeader('X-RateLimit-Limit', state.limit);
          res.setHeader('X-RateLimit-Remaining', state.remaining);
          res.setHeader('X-RateLimit-Reset', state.resetAt);
        }

        if (state.isLimited) {
          const retryAfter = Math.max(1, state.resetAt - Math.ceil(Date.now() / 1000));
          res.setHeader('Retry-After', retryAfter);
          res.status(429).json({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message,
              retryAfter,
            },
          });
          return;
        }

        next();
      })
      .catch((error) => {
        console.error('Rate limiter error, using in-memory fallback:', error);
        const state = limiter.consumeFallback(req);
        if (includeHeaders) {
          res.setHeader('X-RateLimit-Limit', state.limit);
          res.setHeader('X-RateLimit-Remaining', state.remaining);
          res.setHeader('X-RateLimit-Reset', state.resetAt);
        }
        if (state.isLimited) {
          const retryAfter = Math.max(1, state.resetAt - Math.ceil(Date.now() / 1000));
          res.setHeader('Retry-After', retryAfter);
          res.status(429).json({
            error: { code: 'RATE_LIMIT_EXCEEDED', message, retryAfter },
          });
          return;
        }
        next();
      });
  };
}

/** Default rate limit configurations for different route groups. */
export const RATE_LIMIT_PRESETS = {
  /** Standard API endpoints */
  standard: { maxRequests: 100, windowMs: 60000 } as RateLimitConfig,
  /** Authentication endpoints (stricter) */
  auth: { maxRequests: 10, windowMs: 60000 } as RateLimitConfig,
  /** Search/listing endpoints */
  search: { maxRequests: 30, windowMs: 60000 } as RateLimitConfig,
  /** Write operations */
  write: { maxRequests: 20, windowMs: 60000 } as RateLimitConfig,
  /** Deployment triggers (very strict) */
  deploy: { maxRequests: 5, windowMs: 300000 } as RateLimitConfig,
} as const;
