/**
 * API Key Management Service
 *
 * Production-ready API key lifecycle management:
 * - Secure key generation (crypto.randomBytes)
 * - Key hashing with SHA-256 (never store plaintext)
 * - Key validation middleware for Express
 * - Rate limiting per key with sliding window
 * - Key rotation support (grace period for old keys)
 * - Scoped permissions per key
 */
import { createHash, randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface ApiKey {
  id: string;
  name: string;
  hashedKey: string;
  prefix: string;
  scopes: string[];
  rateLimit: number;
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  rotatedFromId: string | null;
  active: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  rateLimit?: number;
  expiresInDays?: number;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  key?: ApiKey;
  error?: string;
}

export interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class ApiKeyService {
  private keys: Map<string, ApiKey> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;

  constructor(windowMs = 60000) {
    this.windowMs = windowMs;
  }

  /**
   * Generate a new API key. Returns the plaintext key only once.
   */
  generateKey(request: CreateApiKeyRequest): { apiKey: ApiKey; plaintextKey: string } {
    const rawKey = randomBytes(32).toString('base64url');
    const prefix = rawKey.substring(0, 8);
    const plaintextKey = `idp_${rawKey}`;
    const hashedKey = this.hashKey(plaintextKey);

    const apiKey: ApiKey = {
      id: randomBytes(16).toString('hex'),
      name: request.name,
      hashedKey,
      prefix,
      scopes: request.scopes,
      rateLimit: request.rateLimit ?? 1000,
      createdAt: new Date(),
      expiresAt: request.expiresInDays
        ? new Date(Date.now() + request.expiresInDays * 86400000)
        : null,
      lastUsedAt: null,
      rotatedFromId: null,
      active: true,
    };

    this.keys.set(apiKey.id, apiKey);
    return { apiKey, plaintextKey };
  }

  /**
   * Validate an API key and check rate limits.
   */
  validateKey(plaintextKey: string): ApiKeyValidationResult {
    const hashedKey = this.hashKey(plaintextKey);
    const key = Array.from(this.keys.values()).find(k => k.hashedKey === hashedKey);

    if (!key) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (!key.active) {
      return { valid: false, error: 'API key is deactivated' };
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    if (!this.checkRateLimit(key.id, key.rateLimit)) {
      return { valid: false, error: 'Rate limit exceeded' };
    }

    // Update last used timestamp
    key.lastUsedAt = new Date();

    return { valid: true, key };
  }

  /**
   * Rotate an API key. Creates a new key and optionally keeps the old one active
   * for a grace period.
   */
  rotateKey(keyId: string, gracePeriodMs = 3600000): { newKey: ApiKey; plaintextKey: string } | null {
    const oldKey = this.keys.get(keyId);
    if (!oldKey) return null;

    const { apiKey: newKey, plaintextKey } = this.generateKey({
      name: oldKey.name,
      scopes: oldKey.scopes,
      rateLimit: oldKey.rateLimit,
    });

    newKey.rotatedFromId = oldKey.id;

    // Schedule old key deactivation after grace period
    if (gracePeriodMs > 0) {
      setTimeout(() => {
        oldKey.active = false;
      }, gracePeriodMs);
    } else {
      oldKey.active = false;
    }

    return { newKey, plaintextKey };
  }

  /**
   * Revoke an API key immediately.
   */
  revokeKey(keyId: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;
    key.active = false;
    return true;
  }

  /**
   * Express middleware for API key authentication.
   */
  middleware(requiredScopes?: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authHeader = req.headers.authorization;
      const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

      const plaintextKey = apiKeyHeader ?? this.extractBearerToken(authHeader);

      if (!plaintextKey) {
        res.status(401).json({ error: 'API key required' });
        return;
      }

      const result = this.validateKey(plaintextKey);

      if (!result.valid) {
        const statusCode = result.error === 'Rate limit exceeded' ? 429 : 401;
        res.status(statusCode).json({ error: result.error });
        return;
      }

      // Check scopes
      if (requiredScopes && requiredScopes.length > 0) {
        const hasScope = requiredScopes.every(scope => result.key!.scopes.includes(scope));
        if (!hasScope) {
          res.status(403).json({ error: 'Insufficient permissions' });
          return;
        }
      }

      // Attach key info to request for downstream use
      (req as Request & { apiKey?: ApiKey }).apiKey = result.key;
      next();
    };
  }

  /**
   * List all API keys (without hashed values).
   */
  listKeys(): Omit<ApiKey, 'hashedKey'>[] {
    return Array.from(this.keys.values()).map(({ hashedKey, ...rest }) => rest);
  }

  /**
   * Get rate limit status for a key.
   */
  getRateLimitStatus(keyId: string): { remaining: number; limit: number; resetAt: number } | null {
    const key = this.keys.get(keyId);
    if (!key) return null;

    const entry = this.rateLimits.get(keyId);
    const now = Date.now();

    if (!entry || now - entry.windowStart >= this.windowMs) {
      return { remaining: key.rateLimit, limit: key.rateLimit, resetAt: now + this.windowMs };
    }

    return {
      remaining: Math.max(0, key.rateLimit - entry.count),
      limit: key.rateLimit,
      resetAt: entry.windowStart + this.windowMs,
    };
  }

  private checkRateLimit(keyId: string, limit: number): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(keyId);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.rateLimits.set(keyId, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    return true;
  }

  private hashKey(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }

  private extractBearerToken(header: string | undefined): string | null {
    if (!header?.startsWith('Bearer ')) return null;
    return header.slice(7);
  }
}
