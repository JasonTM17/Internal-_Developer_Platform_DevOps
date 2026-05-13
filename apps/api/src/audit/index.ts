/**
 * Audit module - Append-only audit logging with hash chain integrity.
 */

export {
  AuditLogger,
  AuditLogStore,
  AuditWriteError,
  computeIntegrityHash,
  GENESIS_HASH,
  MAX_QUERY_LIMIT,
  MIN_RETENTION_DAYS,
} from './audit-logger';

export { InMemoryAuditStore } from './in-memory-audit-store';
