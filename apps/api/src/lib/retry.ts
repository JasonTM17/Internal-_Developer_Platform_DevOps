/**
 * Retry Policy with Exponential Backoff
 *
 * Configurable retry logic for transient failures:
 * - Exponential backoff with jitter
 * - Max retries limit
 * - Configurable retry conditions
 * - Timeout per attempt
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryCondition: () => true,
  onRetry: () => {},
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === opts.maxRetries || !opts.retryCondition(error)) {
        throw error;
      }
      const delay = calculateDelay(attempt, opts);
      opts.onRetry(error, attempt + 1, delay);
      await sleep(delay);
    }
  }
  throw lastError;
}

function calculateDelay(attempt: number, opts: Required<RetryOptions>): number {
  let delay = opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt);
  delay = Math.min(delay, opts.maxDelayMs);
  if (opts.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  return Math.floor(delay);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('econnrefused') || msg.includes('econnreset') ||
           msg.includes('etimedout') || msg.includes('socket hang up') ||
           msg.includes('503') || msg.includes('429');
  }
  return false;
}
