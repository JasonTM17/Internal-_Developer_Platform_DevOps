/**
 * Audit module - Append-only audit logging with hash chain integrity.
 */

export {
  AuditLogger,
  AuditLogStore,
  AuditWriteError,
  computeIntegrityHash,
  GENESIS_HASH,
} from './audit-logger';
