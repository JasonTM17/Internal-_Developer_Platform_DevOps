import type { Request, Response, NextFunction } from 'express';

const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_PATTERN = /\s*on\w+\s*=\s*["'][^"']*["']/gi;
const TAG_PATTERN = /<\/?(?:script|iframe|object|embed|form|input|link|meta)\b[^>]*>/gi;

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(SCRIPT_PATTERN, '')
      .replace(EVENT_HANDLER_PATTERN, '')
      .replace(TAG_PATTERN, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = sanitizeValue(val);
  }
  return result;
}

export function createSanitizeMiddleware() {
  return function sanitize(req: Request, _res: Response, next: NextFunction): void {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      next();
      return;
    }

    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body as Record<string, unknown>);
    }

    if (req.query && typeof req.query === 'object') {
      for (const [key, val] of Object.entries(req.query)) {
        if (typeof val === 'string') {
          (req.query as Record<string, unknown>)[key] = sanitizeValue(val);
        }
      }
    }

    next();
  };
}
