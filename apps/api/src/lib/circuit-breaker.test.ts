import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000,
      resetTimeout: 1000,
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should report zero failures and successes', () => {
      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
    });
  });

  describe('CLOSED state', () => {
    it('should execute function and return result', async () => {
      const result = await breaker.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should pass through errors without opening circuit below threshold', async () => {
      const fn = () => Promise.reject(new Error('fail'));

      await expect(breaker.execute(fn)).rejects.toThrow('fail');
      await expect(breaker.execute(fn)).rejects.toThrow('fail');

      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should transition to OPEN after reaching failure threshold', async () => {
      const fn = () => Promise.reject(new Error('fail'));

      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow('fail');
      }

      expect(breaker.getState()).toBe('OPEN');
    });

    it('should reset failure count on success', async () => {
      const failFn = () => Promise.reject(new Error('fail'));
      const successFn = () => Promise.resolve('ok');

      await expect(breaker.execute(failFn)).rejects.toThrow();
      await expect(breaker.execute(failFn)).rejects.toThrow();
      await breaker.execute(successFn);

      // Failure count reset, need 3 more failures to open
      await expect(breaker.execute(failFn)).rejects.toThrow();
      await expect(breaker.execute(failFn)).rejects.toThrow();
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      const fn = () => Promise.reject(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow();
      }
    });

    it('should reject requests immediately with CircuitOpenError', async () => {
      await expect(breaker.execute(() => Promise.resolve('ok'))).rejects.toThrow(CircuitOpenError);
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      vi.useFakeTimers();
      vi.advanceTimersByTime(1100);

      // Next call should be allowed (transitions to HALF_OPEN)
      const result = await breaker.execute(() => Promise.resolve('recovered'));
      expect(result).toBe('recovered');
      expect(breaker.getState()).toBe('HALF_OPEN');

      vi.useRealTimers();
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      const fn = () => Promise.reject(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fn)).rejects.toThrow();
      }
      vi.advanceTimersByTime(1100);
      // Trigger transition to HALF_OPEN
      await breaker.execute(() => Promise.resolve('ok'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should transition to CLOSED after success threshold', async () => {
      // Already had 1 success from beforeEach, need 1 more
      await breaker.execute(() => Promise.resolve('ok'));
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should transition back to OPEN on failure', async () => {
      await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
      // After failure in HALF_OPEN, failureCount becomes 1
      // Need to reach threshold again
      await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
      await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('timeout', () => {
    it('should reject if function exceeds timeout', async () => {
      const slowBreaker = new CircuitBreaker({
        name: 'slow-service',
        timeout: 100,
        failureThreshold: 5,
      });

      const slowFn = () => new Promise((resolve) => setTimeout(resolve, 200));
      await expect(slowBreaker.execute(slowFn)).rejects.toThrow('Circuit breaker timeout');
    });
  });

  describe('state change callback', () => {
    it('should call onStateChange when transitioning', async () => {
      const onStateChange = vi.fn();
      const cb = new CircuitBreaker({
        name: 'callback-test',
        failureThreshold: 2,
        onStateChange,
      });

      const fn = () => Promise.reject(new Error('fail'));
      await expect(cb.execute(fn)).rejects.toThrow();
      await expect(cb.execute(fn)).rejects.toThrow();

      expect(onStateChange).toHaveBeenCalledWith('CLOSED', 'OPEN');
    });
  });
});
