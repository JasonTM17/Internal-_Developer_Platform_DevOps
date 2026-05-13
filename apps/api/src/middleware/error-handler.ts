/**
 * Global Error Handling Middleware
 *
 * Centralized error handling for the Express application:
 * - Catches all unhandled errors from route handlers
 * - Maps known error types to appropriate HTTP status codes
 * - Produces structured JSON error responses
 * - Sanitizes error details in production (no stack traces leaked)
 * - Logs errors with correlation IDs for debugging
 * - Handles async errors properly
 */

import type { Request, Response, NextFunction } from 'express';

/** Structured error response format. */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    timestamp: string;
  };
}

/** Base application error with HTTP status code. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(options: {
    message: string;
    statusCode: number;
    code: string;
    isOperational?: boolean;
    details?: unknown;
    cause?: Error;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
  }
}

/** 400 Bad Request */
export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ message, statusCode: 400, code: 'BAD_REQUEST', details });
    this.name = 'BadRequestError';
  }
}

/** 401 Unauthorized */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super({ message, statusCode: 401, code: 'UNAUTHORIZED' });
    this.name = 'UnauthorizedError';
  }
}

/** 403 Forbidden */
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super({ message, statusCode: 403, code: 'FORBIDDEN' });
    this.name = 'ForbiddenError';
  }
}

/** 404 Not Found */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} '${id}' not found` : `${resource} not found`;
    super({ message, statusCode: 404, code: 'NOT_FOUND' });
    this.name = 'NotFoundError';
  }
}

/** 409 Conflict */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ message, statusCode: 409, code: 'CONFLICT', details });
    this.name = 'ConflictError';
  }
}

/** 422 Unprocessable Entity */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ message, statusCode: 422, code: 'VALIDATION_ERROR', details });
    this.name = 'ValidationError';
  }
}

/** 429 Too Many Requests */
export class RateLimitError extends AppError {
  constructor(retryAfterSeconds?: number) {
    super({
      message: 'Rate limit exceeded',
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      details: retryAfterSeconds ? { retryAfterSeconds } : undefined,
    });
    this.name = 'RateLimitError';
  }
}

/** 503 Service Unavailable */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super({ message, statusCode: 503, code: 'SERVICE_UNAVAILABLE', isOperational: true });
    this.name = 'ServiceUnavailableError';
  }
}

/** Logger interface for error handler. */
export interface ErrorLogger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

/** Default console-based logger. */
const defaultLogger: ErrorLogger = {
  error(message: string, meta?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() }));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }));
  },
};

/** Options for the error handler middleware. */
export interface ErrorHandlerOptions {
  /** Whether to include stack traces in responses */
  includeStackTrace?: boolean;
  /** Logger instance */
  logger?: ErrorLogger;
  /** Whether to include error details in responses */
  includeDetails?: boolean;
}

/**
 * Determine the HTTP status code for an error.
 */
function getStatusCode(error: Error): number {
  if (error instanceof AppError) return error.statusCode;

  // Handle common Node.js/Express errors
  if (error.name === 'SyntaxError' && 'status' in error) return 400;
  if (error.name === 'PayloadTooLargeError' || error.message.includes('too large')) return 413;
  if (error.name === 'URIError') return 400;

  return 500;
}

/**
 * Determine the error code string.
 */
function getErrorCode(error: Error): string {
  if (error instanceof AppError) return error.code;
  if (error.name === 'SyntaxError') return 'INVALID_JSON';
  if (error.name === 'PayloadTooLargeError') return 'PAYLOAD_TOO_LARGE';
  return 'INTERNAL_SERVER_ERROR';
}

/**
 * Create the global error handling middleware.
 *
 * This middleware should be registered LAST in the middleware chain.
 * It catches all errors thrown or passed via next(error) in route handlers.
 */
export function createErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    includeStackTrace = process.env.NODE_ENV !== 'production',
    logger = defaultLogger,
    includeDetails = process.env.NODE_ENV !== 'production',
  } = options;

  return function errorHandler(
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void {
    const statusCode = getStatusCode(error);
    const errorCode = getErrorCode(error);
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    // Log the error
    const logMeta: Record<string, unknown> = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      errorCode,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    if (statusCode >= 500) {
      logMeta.stack = error.stack;
      logger.error(`Unhandled error: ${error.message}`, logMeta);
    } else {
      logger.warn(`Client error: ${error.message}`, logMeta);
    }

    // Build the response
    const response: ErrorResponse = {
      error: {
        code: errorCode,
        message: statusCode >= 500 && !includeStackTrace
          ? 'An internal server error occurred'
          : error.message,
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    // Include details for operational errors in non-production
    if (includeDetails && error instanceof AppError && error.details) {
      response.error.details = error.details;
    }

    // Include stack trace in development
    if (includeStackTrace && statusCode >= 500) {
      response.error.details = {
        ...(response.error.details as Record<string, unknown> || {}),
        stack: error.stack?.split('\n').map((line) => line.trim()),
      };
    }

    // Send the response
    if (!res.headersSent) {
      res.status(statusCode).json(response);
    }
  };
}

/**
 * Middleware to handle 404 Not Found for unmatched routes.
 * Should be registered after all route handlers but before the error handler.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError('Route', `${req.method} ${req.path}`));
}

/**
 * Wrap an async route handler to properly catch and forward errors.
 * Eliminates the need for try/catch in every route handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
