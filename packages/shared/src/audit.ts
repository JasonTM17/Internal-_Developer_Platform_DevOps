/**
 * Audit logging interfaces and types.
 *
 * Defines the audit log entry model with hash chain integrity,
 * query filtering, and pagination support.
 */

/**
 * Outcome of an audited action.
 */
export type AuditOutcome = 'success' | 'failure';

/**
 * An audit log entry with integrity hash chain support.
 * Stored in append-only format with tamper detection.
 */
export interface AuditLogEntry {
  /** Unique identifier (UUID). */
  id: string;
  /** Identity of the actor (user ID or system service name). */
  actor: string;
  /** Action performed. */
  action: string;
  /** Target resource identifier. */
  resource: string;
  /** Timestamp in UTC with millisecond precision. */
  timestamp: Date;
  /** Outcome of the action. */
  outcome: AuditOutcome;
  /** Failure reason if outcome is 'failure'. */
  reason?: string;
  /** Additional context metadata. */
  metadata?: Record<string, unknown>;
  /** SHA-256 integrity hash incorporating previous entry hash. */
  integrityHash: string;
  /** Hash of the preceding entry (forms the chain). */
  previousHash: string;
}

/**
 * Input for recording an audit entry.
 * Excludes system-generated fields (id, integrityHash, previousHash).
 */
export interface AuditEntry {
  /** Identity of the actor (user ID or system service name). */
  actor: string;
  /** Action performed. */
  action: string;
  /** Target resource identifier. */
  resource: string;
  /** Timestamp in UTC with millisecond precision. */
  timestamp: Date;
  /** Outcome of the action. */
  outcome: AuditOutcome;
  /** Failure reason if outcome is 'failure'. */
  reason?: string;
  /** Additional context metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Filters for querying audit log entries.
 */
export interface AuditQueryFilters {
  /** Filter by actor identity. */
  actor?: string;
  /** Filter by action type. */
  action?: string;
  /** Filter entries from this timestamp (inclusive). */
  startTime?: Date;
  /** Filter entries until this timestamp (inclusive). */
  endTime?: Date;
  /** Maximum number of entries to return (default/max: 1000). */
  limit?: number;
  /** Pagination cursor for fetching subsequent pages. */
  cursor?: string;
}

/**
 * Paginated result set for audit log queries.
 */
export interface PaginatedAuditResult {
  /** The audit log entries matching the query. */
  entries: AuditLogEntry[];
  /** Total number of entries matching the filters (if available). */
  totalCount?: number;
  /** Cursor for fetching the next page. Null if no more results. */
  nextCursor: string | null;
  /** Whether there are more results beyond this page. */
  hasMore: boolean;
}
