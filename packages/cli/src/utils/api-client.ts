/**
 * API Client Wrapper
 *
 * HTTP client for communicating with the IDP API:
 * - Automatic authentication header injection
 * - Request/response interceptors
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Error response parsing
 * - Request ID tracking
 */

import { randomUUID } from 'crypto';

/** API client configuration. */
export interface ApiClientConfig {
  /** Base URL of the API server */
  baseUrl: string;
  /** Authentication token */
  token?: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
}

/** API error response structure. */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

/** API client error. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly requestId?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** API client interface. */
export interface ApiClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body: unknown): Promise<T>;
  put<T = unknown>(path: string, body: unknown): Promise<T>;
  patch<T = unknown>(path: string, body: unknown): Promise<T>;
  delete<T = unknown>(path: string): Promise<T>;
}

/**
 * Create an API client instance.
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  const { baseUrl, token, timeout, maxRetries = 2, headers: customHeaders = {} } = config;

  /**
   * Build request headers.
   */
  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Request-ID': randomUUID(),
      'User-Agent': 'idp-cli/0.1.0',
      ...customHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Parse error response from the API.
   */
  async function parseErrorResponse(response: Response, requestId: string): Promise<ApiClientError> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode = 'UNKNOWN_ERROR';
    let details: unknown;

    try {
      const body = await response.json();
      if (body.error) {
        if (typeof body.error === 'string') {
          errorMessage = body.error;
        } else {
          errorMessage = body.error.message || errorMessage;
          errorCode = body.error.code || errorCode;
          details = body.error.details;
        }
      }
    } catch {
      // Response body is not JSON
    }

    return new ApiClientError(errorMessage, response.status, errorCode, requestId, details);
  }

  /**
   * Determine if a request should be retried.
   */
  function shouldRetry(statusCode: number, attempt: number): boolean {
    if (attempt >= maxRetries) return false;
    // Retry on server errors and rate limiting
    return statusCode >= 500 || statusCode === 429 || statusCode === 408;
  }

  /**
   * Calculate retry delay with exponential backoff.
   */
  function getRetryDelay(attempt: number, response?: Response): number {
    // Respect Retry-After header if present
    const retryAfter = response?.headers.get('Retry-After');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }
    // Exponential backoff: 1s, 2s, 4s...
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  }

  /**
   * Execute an HTTP request with retry logic.
   */
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${baseUrl}${path}`;
    const headers = buildHeaders();
    const requestId = headers['X-Request-ID'];

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeout),
    };

    if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
      fetchOptions.body = JSON.stringify(body);
    }

    let lastError: ApiClientError | Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);

        if (response.ok) {
          // Handle 204 No Content
          if (response.status === 204) {
            return {} as T;
          }
          return await response.json() as T;
        }

        // Check if we should retry
        if (shouldRetry(response.status, attempt)) {
          const delay = getRetryDelay(attempt, response);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Non-retryable error
        throw await parseErrorResponse(response, requestId);
      } catch (error) {
        if (error instanceof ApiClientError) {
          throw error;
        }

        lastError = error as Error;

        // Retry on network errors
        if (attempt < maxRetries) {
          const delay = getRetryDelay(attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries exhausted
    if (lastError instanceof ApiClientError) {
      throw lastError;
    }

    const errorMessage = lastError instanceof Error
      ? lastError.message
      : 'Request failed after all retries';

    throw new ApiClientError(
      errorMessage.includes('timeout') ? `Request timed out after ${timeout}ms` : errorMessage,
      0,
      'NETWORK_ERROR',
      requestId,
    );
  }

  return {
    get<T = unknown>(path: string): Promise<T> {
      return request<T>('GET', path);
    },
    post<T = unknown>(path: string, body: unknown): Promise<T> {
      return request<T>('POST', path, body);
    },
    put<T = unknown>(path: string, body: unknown): Promise<T> {
      return request<T>('PUT', path, body);
    },
    patch<T = unknown>(path: string, body: unknown): Promise<T> {
      return request<T>('PATCH', path, body);
    },
    delete<T = unknown>(path: string): Promise<T> {
      return request<T>('DELETE', path);
    },
  };
}
