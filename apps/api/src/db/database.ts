/**
 * Database connection interface.
 *
 * Provides a lightweight abstraction over the database connection pool.
 * This allows for dependency injection and testability without coupling
 * to a specific PostgreSQL client library.
 */

/**
 * Represents a single row returned from a query.
 */
export type QueryResultRow = Record<string, unknown>;

/**
 * Result of a database query.
 */
export interface QueryResult<T extends QueryResultRow = QueryResultRow> {
  /** Array of rows returned by the query. */
  rows: T[];
  /** Number of rows affected (for INSERT/UPDATE/DELETE). */
  rowCount: number;
}

/**
 * Database pool interface for executing queries.
 * Implementations can use pg.Pool, test doubles, etc.
 */
export interface DatabasePool {
  /**
   * Execute a parameterized SQL query.
   * @param text - SQL query string with $1, $2, ... placeholders
   * @param params - Array of parameter values
   * @returns Query result with rows and row count
   */
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
}
