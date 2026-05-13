/**
 * Redis Caching Layer
 *
 * Production-ready caching with multiple patterns:
 * - Cache-aside (lazy loading): Read from cache, fallback to source
 * - Write-through: Write to cache and source simultaneously
 * - TTL management with per-key and namespace defaults
 * - Cache invalidation (single key, pattern, namespace)
 * - Namespace support for logical grouping
 * - Serialization/deserialization with JSON
 */
import { Redis } from 'ioredis';

export interface CacheOptions {
  redis: Redis;
  defaultTtlSeconds?: number;
  namespace?: string;
  keyPrefix?: string;
}

export interface CacheEntry<T> {
  data: T;
  cachedAt: string;
  ttl: number;
}

export class CacheLayer {
  private redis: Redis;
  private defaultTtl: number;
  private prefix: string;

  constructor(options: CacheOptions) {
    this.redis = options.redis;
    this.defaultTtl = options.defaultTtlSeconds ?? 300;
    this.prefix = [options.keyPrefix, options.namespace].filter(Boolean).join(':');
  }

  /**
   * Cache-aside pattern: Get from cache, or fetch from source and cache.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Write-through pattern: Write to cache and execute the writer.
   */
  async writeThrough<T>(
    key: string,
    value: T,
    writer: (value: T) => Promise<void>,
    ttlSeconds?: number,
  ): Promise<void> {
    await writer(value);
    await this.set(key, value, ttlSeconds);
  }

  /**
   * Get a value from cache.
   */
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(this.buildKey(key));
    if (!raw) return null;

    try {
      const entry: CacheEntry<T> = JSON.parse(raw);
      return entry.data;
    } catch {
      // Corrupted cache entry, remove it
      await this.delete(key);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtl;
    const entry: CacheEntry<T> = {
      data: value,
      cachedAt: new Date().toISOString(),
      ttl,
    };
    await this.redis.setex(this.buildKey(key), ttl, JSON.stringify(entry));
  }

  /**
   * Delete a specific key from cache.
   */
  async delete(key: string): Promise<boolean> {
    const result = await this.redis.del(this.buildKey(key));
    return result > 0;
  }

  /**
   * Invalidate all keys matching a pattern within the namespace.
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = this.buildKey(pattern);
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        fullPattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');

    return deletedCount;
  }

  /**
   * Invalidate all keys in the current namespace.
   */
  async invalidateNamespace(): Promise<number> {
    return this.invalidatePattern('*');
  }

  /**
   * Check if a key exists in cache.
   */
  async has(key: string): Promise<boolean> {
    const exists = await this.redis.exists(this.buildKey(key));
    return exists === 1;
  }

  /**
   * Get remaining TTL for a key in seconds.
   */
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(this.buildKey(key));
  }

  /**
   * Increment a numeric value in cache (useful for counters/rate limiting).
   */
  async increment(key: string, amount = 1, ttlSeconds?: number): Promise<number> {
    const fullKey = this.buildKey(key);
    const result = await this.redis.incrby(fullKey, amount);
    if (ttlSeconds) {
      await this.redis.expire(fullKey, ttlSeconds);
    }
    return result;
  }

  /**
   * Get multiple keys at once.
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const fullKeys = keys.map(k => this.buildKey(k));
    const values = await this.redis.mget(...fullKeys);
    const result = new Map<string, T | null>();

    keys.forEach((key, index) => {
      const raw = values[index];
      if (raw) {
        try {
          const entry: CacheEntry<T> = JSON.parse(raw);
          result.set(key, entry.data);
        } catch {
          result.set(key, null);
        }
      } else {
        result.set(key, null);
      }
    });

    return result;
  }

  /**
   * Create a child cache layer with a sub-namespace.
   */
  withNamespace(namespace: string): CacheLayer {
    return new CacheLayer({
      redis: this.redis,
      defaultTtlSeconds: this.defaultTtl,
      keyPrefix: this.prefix,
      namespace,
    });
  }

  private buildKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }
}
