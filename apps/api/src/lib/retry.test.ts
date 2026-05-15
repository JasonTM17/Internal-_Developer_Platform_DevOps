import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { withRetry, isTransientError } from './retry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100, jitter: false });

    // Advance through retry delays
    await vi.advanceTimersByTimeAsync(100); // first retry delay
    await vi.advanceTimersByTimeAsync(200); // second retry delay

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after exhausting all retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

    const promise = withRetry(fn, { maxRetries: 2, baseDelayMs: 100, jitter: false });

    // Catch the rejection to prevent unhandled rejection
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const caught = promise.catch((e) => e);

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);

    const error = await caught;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('persistent failure');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should respect retryCondition and stop early', async () => {
    const nonRetryableError = new Error('not retryable');
    const fn = vi.fn().mockRejectedValue(nonRetryableError);

    await expect(
      withRetry(fn, {
        maxRetries: 5,
        retryCondition: (err) => (err as Error).message !== 'not retryable',
      }),
    ).rejects.toThrow('not retryable');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback with attempt info', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('ok');

    const promise = withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 100,
      jitter: false,
      onRetry,
    });

    await vi.advanceTimersByTimeAsync(100);
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 100);
  });

  it('should apply exponential backoff', async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 100,
      backoffMultiplier: 2,
      jitter: false,
      onRetry,
    });

    await vi.advanceTimersByTimeAsync(100); // 100 * 2^0 = 100
    await vi.advanceTimersByTimeAsync(200); // 100 * 2^1 = 200
    await vi.advanceTimersByTimeAsync(400); // 100 * 2^2 = 400
    await promise;

    expect(onRetry).toHaveBeenNthCalledWith(1, expect.any(Error), 1, 100);
    expect(onRetry).toHaveBeenNthCalledWith(2, expect.any(Error), 2, 200);
    expect(onRetry).toHaveBeenNthCalledWith(3, expect.any(Error), 3, 400);
  });

  it('should cap delay at maxDelayMs', async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 5000,
      maxDelayMs: 8000,
      backoffMultiplier: 2,
      jitter: false,
      onRetry,
    });

    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(8000); // capped at 8000 instead of 10000
    await promise;

    expect(onRetry).toHaveBeenNthCalledWith(1, expect.any(Error), 1, 5000);
    expect(onRetry).toHaveBeenNthCalledWith(2, expect.any(Error), 2, 8000);
  });

  it('should work with zero retries (no retry)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(withRetry(fn, { maxRetries: 0 })).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('isTransientError', () => {
  it('should return true for connection refused', () => {
    expect(isTransientError(new Error('ECONNREFUSED'))).toBe(true);
  });

  it('should return true for connection reset', () => {
    expect(isTransientError(new Error('ECONNRESET'))).toBe(true);
  });

  it('should return true for timeout', () => {
    expect(isTransientError(new Error('ETIMEDOUT'))).toBe(true);
  });

  it('should return true for socket hang up', () => {
    expect(isTransientError(new Error('socket hang up'))).toBe(true);
  });

  it('should return true for 503 errors', () => {
    expect(isTransientError(new Error('Request failed with status 503'))).toBe(true);
  });

  it('should return true for 429 errors', () => {
    expect(isTransientError(new Error('Request failed with status 429'))).toBe(true);
  });

  it('should return false for non-transient errors', () => {
    expect(isTransientError(new Error('Invalid input'))).toBe(false);
  });

  it('should return false for non-Error values', () => {
    expect(isTransientError('string error')).toBe(false);
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
  });
});
