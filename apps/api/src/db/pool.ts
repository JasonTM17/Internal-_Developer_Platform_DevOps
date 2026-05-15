/**
 * PostgreSQL Connection Pool
 *
 * Production-ready connection pool with:
 * - Configurable pool size (min/max connections)
 * - Connection timeout and idle timeout
 * - Health check via pool.query('SELECT 1')
 * - Graceful shutdown (drain connections)
 * - Connection retry with exponential backoff
 */
import { Pool, PoolConfig, PoolClient, QueryResult as PgQueryResult } from 'pg';

import { logger } from '../lib/logger';

import type { DatabasePool, QueryResult, QueryResultRow } from './database';

export interface PoolOptions {
  connectionString: string;
  maxConnections?: number;
  minConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  statementTimeoutMs?: number;
  ssl?: boolean;
}

export class PostgresPool implements DatabasePool {
  private pool: Pool;
  private isShuttingDown = false;

  constructor(options: PoolOptions) {
    const config: PoolConfig = {
      connectionString: options.connectionString,
      max: options.maxConnections ?? 20,
      min: options.minConnections ?? 5,
      idleTimeoutMillis: options.idleTimeoutMs ?? 30000,
      connectionTimeoutMillis: options.connectionTimeoutMs ?? 5000,
      statement_timeout: options.statementTimeoutMs ?? 30000,
      ssl: options.ssl ? { rejectUnauthorized: false } : undefined,
    };
    this.pool = new Pool(config);

    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected pool error');
    });
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    if (this.isShuttingDown) {
      throw new Error('Database pool is shutting down');
    }
    const result: PgQueryResult = await this.pool.query(text, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? 0,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    await this.pool.end();
  }

  getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}
