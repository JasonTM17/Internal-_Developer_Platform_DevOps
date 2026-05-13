import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheLayer } from './cache';

// Mock Redis client
function createMockRedis() {
  const store = new Map<string, string>();
  const ttls = new Map<string, number>();

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    setex: vi.fn(async (key: string, ttl: number, value: string) => {
      store.set(key, value);
      ttls.set(key, ttl);
      return 'OK';
    }),
    del: vi.fn(async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        if (store.delete(key)) count++;
      }
      return count;
    }),
    exists: vi.fn(async (key: string) => (store.has(key) ? 1 : 0)),
    ttl: vi.fn(async (key: string) => ttls.get(key) ?? -2),
    incrby: vi.fn(async (key: string, amount: number) => {
      const current = parseInt(store.get(key) ?? '0', 10);
      const newVal = current + amount;
      store.set(key, String(newVal));
      return newVal;
    }),
    expire: vi.fn(async () => 1),
    mget: vi.fn(async (...keys: string[]) => keys.map(k => store.get(k) ?? null)),
    scan: vi.fn(async () => ['0', [] as string[]]),
    _store: store,
    _ttls: ttls,
  };
}

describe('CacheLayer', () => {
  let cache: CacheLayer;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockRedis = createMockRedis();
    cache = new CacheLayer({
      redis: mockRedis as any,
      defaultTtlSeconds: 300,
      namespace: 'test',
    });
  });

  describe('get/set', () => {
    it('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should set and get a value', async () => {
      await cache.set('user:1', { name: 'Alice', age: 30 });
      const result = await cache.get<{ name: string; age: number }>('user:1');
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('should use namespace prefix in keys', async () => {
      await cache.set('key', 'value');
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test:key',
        300,
        expect.any(String),
      );
    });

    it('should use custom TTL when provided', async () => {
      await cache.set('key', 'value', 60);
      expect(mockRedis.setex).toHaveBeenCalledWith('test:key', 60, expect.any(String));
    });

    it('should handle corrupted cache entries gracefully', async () => {
      mockRedis._store.set('test:bad', 'not-json{{{');
      const result = await cache.get('bad');
      expect(result).toBeNull();
      expect(mockRedis.del).toHaveBeenCalledWith('test:bad');
    });
  });

  describe('getOrSet (cache-aside)', () => {
    it('should return cached value without calling fetcher', async () => {
      await cache.set('cached', 'existing-value');
      const fetcher = vi.fn().mockResolvedValue('new-value');

      const result = await cache.getOrSet('cached', fetcher);
      expect(result).toBe('existing-value');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher and cache result on miss', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1, name: 'fetched' });

      const result = await cache.getOrSet('miss', fetcher, 120);
      expect(result).toEqual({ id: 1, name: 'fetched' });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(mockRedis.setex).toHaveBeenCalledWith('test:miss', 120, expect.any(String));
    });
  });

  describe('writeThrough', () => {
    it('should call writer and cache the value', async () => {
      const writer = vi.fn().mockResolvedValue(undefined);

      await cache.writeThrough('key', { data: 'value' }, writer, 600);

      expect(writer).toHaveBeenCalledWith({ data: 'value' });
      expect(mockRedis.setex).toHaveBeenCalledWith('test:key', 600, expect.any(String));
    });

    it('should not cache if writer throws', async () => {
      const writer = vi.fn().mockRejectedValue(new Error('write failed'));

      await expect(cache.writeThrough('key', 'val', writer)).rejects.toThrow('write failed');
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a key and return true', async () => {
      await cache.set('to-delete', 'value');
      const result = await cache.delete('to-delete');
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const result = await cache.delete('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await cache.set('exists', 'value');
      const result = await cache.has('exists');
      expect(result).toBe(true);
    });

    it('should return false for missing key', async () => {
      const result = await cache.has('missing');
      expect(result).toBe(false);
    });
  });

  describe('increment', () => {
    it('should increment a counter', async () => {
      const result = await cache.increment('counter', 1);
      expect(result).toBe(1);
    });

    it('should increment by custom amount', async () => {
      await cache.increment('counter', 5);
      const result = await cache.increment('counter', 3);
      expect(result).toBe(8);
    });

    it('should set TTL when provided', async () => {
      await cache.increment('counter', 1, 60);
      expect(mockRedis.expire).toHaveBeenCalledWith('test:counter', 60);
    });
  });

  describe('mget', () => {
    it('should return map of values for multiple keys', async () => {
      await cache.set('a', 'value-a');
      await cache.set('b', 'value-b');

      const result = await cache.mget<string>(['a', 'b', 'c']);
      expect(result.get('a')).toBe('value-a');
      expect(result.get('b')).toBe('value-b');
      expect(result.get('c')).toBeNull();
    });
  });

  describe('withNamespace', () => {
    it('should create child cache with sub-namespace', async () => {
      const child = cache.withNamespace('users');
      await child.set('1', { name: 'Bob' });
      expect(mockRedis.setex).toHaveBeenCalledWith('test:users:1', 300, expect.any(String));
    });
  });
});
