/**
 * Cursor-Based Pagination
 *
 * Production-ready pagination implementation:
 * - Cursor encoding/decoding (base64url for opaque cursors)
 * - Page info response with hasNextPage/hasPreviousPage
 * - Configurable limit enforcement (min/max/default)
 * - Sort direction support (ASC/DESC)
 * - Type-safe cursor fields
 * - Compatible with Relay-style pagination
 */

export type SortDirection = 'ASC' | 'DESC';

export interface PaginationParams {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
  totalCount?: number;
}

export interface PaginatedResult<T> {
  edges: Array<{ node: T; cursor: string }>;
  pageInfo: PageInfo;
}

export interface CursorData {
  id: string;
  sortValue?: string | number;
  sortField?: string;
}

export interface PaginationConfig {
  defaultLimit: number;
  maxLimit: number;
  minLimit: number;
}

const DEFAULT_CONFIG: PaginationConfig = {
  defaultLimit: 20,
  maxLimit: 100,
  minLimit: 1,
};

/**
 * Encode cursor data to an opaque base64url string.
 */
export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json, 'utf8').toString('base64url');
}

/**
 * Decode an opaque cursor string back to cursor data.
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const data = JSON.parse(json);
    if (!data.id) return null;
    return data as CursorData;
  } catch {
    return null;
  }
}

/**
 * Enforce pagination limits within configured bounds.
 */
export function enforceLimit(requested: number | undefined, config?: PaginationConfig): number {
  const cfg = config ?? DEFAULT_CONFIG;
  if (requested === undefined) return cfg.defaultLimit;
  return Math.max(cfg.minLimit, Math.min(requested, cfg.maxLimit));
}

/**
 * Build a paginated result from a list of items.
 * Assumes items are fetched with limit + 1 to determine hasNextPage.
 */
export function buildPaginatedResult<T extends { id: string }>(
  items: T[],
  params: PaginationParams,
  config?: PaginationConfig,
  options?: { totalCount?: number; sortField?: string },
): PaginatedResult<T> {
  const limit = enforceLimit(params.first ?? params.last, config);
  const hasExtra = items.length > limit;
  const trimmedItems = hasExtra ? items.slice(0, limit) : items;

  // If using 'last', reverse the results
  const orderedItems = params.last ? trimmedItems.reverse() : trimmedItems;

  const edges = orderedItems.map(item => ({
    node: item,
    cursor: encodeCursor({
      id: item.id,
      sortField: options?.sortField,
      sortValue: options?.sortField ? (item as Record<string, unknown>)[options.sortField] as string : undefined,
    }),
  }));

  const pageInfo: PageInfo = {
    hasNextPage: params.first ? hasExtra : !!params.before,
    hasPreviousPage: params.last ? hasExtra : !!params.after,
    startCursor: edges.length > 0 ? edges[0].cursor : null,
    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    totalCount: options?.totalCount,
  };

  return { edges, pageInfo };
}

/**
 * Build SQL WHERE clause for cursor-based pagination.
 */
export function buildCursorWhereClause(
  cursor: string | undefined,
  direction: 'forward' | 'backward',
  sortField = 'id',
  sortDirection: SortDirection = 'ASC',
): { clause: string; values: unknown[] } | null {
  if (!cursor) return null;

  const decoded = decodeCursor(cursor);
  if (!decoded) return null;

  const operator = direction === 'forward'
    ? (sortDirection === 'ASC' ? '>' : '<')
    : (sortDirection === 'ASC' ? '<' : '>');

  if (decoded.sortValue !== undefined && decoded.sortField) {
    return {
      clause: `(${decoded.sortField} ${operator} $1 OR (${decoded.sortField} = $1 AND id ${operator} $2))`,
      values: [decoded.sortValue, decoded.id],
    };
  }

  return {
    clause: `${sortField} ${operator} $1`,
    values: [decoded.id],
  };
}

/**
 * Parse pagination parameters from query string.
 */
export function parsePaginationParams(query: Record<string, string | undefined>): PaginationParams {
  return {
    first: query.first ? parseInt(query.first, 10) : undefined,
    after: query.after ?? undefined,
    last: query.last ? parseInt(query.last, 10) : undefined,
    before: query.before ?? undefined,
    sortBy: query.sortBy ?? undefined,
    sortDirection: (query.sortDirection?.toUpperCase() as SortDirection) ?? 'ASC',
  };
}
