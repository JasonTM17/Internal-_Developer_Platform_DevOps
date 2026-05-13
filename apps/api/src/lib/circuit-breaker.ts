/**
 * Circuit Breaker Pattern
 *
 * Prevents cascading failures by tracking error rates and opening
 * the circuit when a threshold is exceeded.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Requests fail immediately without calling the service
 * - HALF_OPEN: Limited requests allowed to test if service recovered
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(opts: CircuitBreakerOptions) {
    this.options = {
      name: opts.name,
      failureThreshold: opts.failureThreshold ?? 5,
      successThreshold: opts.successThreshold ?? 3,
      timeout: opts.timeout ?? 30000,
      resetTimeout: opts.resetTimeout ?? 60000,
      onStateChange: opts.onStateChange ?? (() => {}),
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - (this.lastFailureTime ?? 0) > this.options.resetTimeout) {
        this.transition('HALF_OPEN');
      } else {
        throw new CircuitOpenError(this.options.name);
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        this.createTimeout(),
      ]) as T;
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.transition('CLOSED');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;
    if (this.failureCount >= this.options.failureThreshold) {
      this.transition('OPEN');
    }
  }

  private transition(to: CircuitState): void {
    const from = this.state;
    this.state = to;
    if (to === 'CLOSED') {
      this.failureCount = 0;
      this.successCount = 0;
    }
    this.options.onStateChange(from, to);
  }

  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Circuit breaker timeout: ${this.options.name}`)), this.options.timeout);
    });
  }

  getState(): CircuitState { return this.state; }
  getStats() { return { state: this.state, failures: this.failureCount, successes: this.successCount }; }
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker '${name}' is OPEN - service unavailable`);
    this.name = 'CircuitOpenError';
  }
}
