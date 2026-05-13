import type { Response } from 'express';

export function success<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ data, meta: { timestamp: new Date().toISOString() } });
}

export function created<T>(res: Response, data: T) {
  return success(res, data, 201);
}

export function paginated<T>(res: Response, items: T[], total: number, page: number, limit: number) {
  return res.json({
    data: items,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      timestamp: new Date().toISOString(),
    },
  });
}
