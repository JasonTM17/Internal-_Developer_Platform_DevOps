/**
 * Audit Logger with append-only hash chain integrity.
 *
 * Implements SHA-256 hash chain where each entry incorporates the previous
 * entry's hash, enabling tamper detection. Follows fail-closed behavior:
 * if audit write fails, the triggering action is blocked.
 *
 * Requirements: 10.1, 10.2, 10.5
 */

import { createHash } from 'crypto';
import type { AuditEntry, AuditLogEntry } from '@idp/shared';

/**
 * Genesis hash used as the previous_hash for the very first audit log entry.
 * This is a well-known constant (64 zeros) representing the start of the chain.
 */
export const GENESIS_HASH = '0'.repeat(64);

/**
 * Error thrown when audit log write fails, implementing fail-closed behavior.
 * This error should propagate to block the triggering action.
 */
export class AuditWriteError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AuditWriteError';
  }
}

/**
 * Interface for the database layer that the AuditLogger depends on.
 * This allows for dependency injection and testability.
 */
export interface AuditLogStore {
  /** Retrieve the most recent audit log entry's integrity hash. Returns null if no entries exist. */
  getLastEntryHash(): Promise<string | null>;
  /** Insert a new audit log entry. Throws on failure. */
  insert(entry: AuditLogEntry): Promise<void>;
}

/**
 * Computes the SHA-256 integrity hash for an audit log entry.
 * The hash incorporates the previous entry's hash to form a chain.
 *
 * Hash input: previous_hash + actor + action + resource + timestamp (ISO string) + outcome
 */
export function computeIntegrityHash(
  previousHash: string,
  actor: string,
  action: string,
  resource: string,
  timestamp: Date,
  outcome: string,
): string {
  const data = `${previousHash}${actor}${action}${resource}${timestamp.toISOString()}${outcome}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * AuditLogger class implementing append-only audit logging with hash chain integrity.
 *
 * Key behaviors:
 * - Each entry's integrity hash incorporates the previous entry's hash (chain)
 * - First entry uses GENESIS_HASH as the previous hash
 * - Fail-closed: throws AuditWriteError if write fails, blocking the triggering action
 * - Records actor, action, resource, UTC timestamp (ms precision), outcome, and optional reason
 */
export class AuditLogger {
  constructor(private readonly store: AuditLogStore) {}

  /**
   * Log an audit entry with hash chain integrity.
   *
   * This method:
   * 1. Retrieves the last entry's hash (or uses GENESIS_HASH for the first entry)
   * 2. Computes SHA-256 hash of (previous_hash + actor + action + resource + timestamp + outcome)
   * 3. Inserts the new entry with computed hash
   * 4. Throws AuditWriteError if any step fails (fail-closed behavior)
   *
   * @param entry - The audit entry to record
   * @returns The complete AuditLogEntry with generated id and hashes
   * @throws AuditWriteError if the write fails (blocks triggering action)
   */
  async log(entry: AuditEntry): Promise<AuditLogEntry> {
    let previousHash: string;

    try {
      const lastHash = await this.store.getLastEntryHash();
      previousHash = lastHash ?? GENESIS_HASH;
    } catch (error) {
      throw new AuditWriteError(
        'Failed to retrieve last audit entry hash. Action blocked due to audit logging failure.',
        error,
      );
    }

    const integrityHash = computeIntegrityHash(
      previousHash,
      entry.actor,
      entry.action,
      entry.resource,
      entry.timestamp,
      entry.outcome,
    );

    const logEntry: AuditLogEntry = {
      id: generateId(),
      actor: entry.actor,
      action: entry.action,
      resource: entry.resource,
      timestamp: entry.timestamp,
      outcome: entry.outcome,
      reason: entry.reason,
      metadata: entry.metadata,
      integrityHash,
      previousHash,
    };

    try {
      await this.store.insert(logEntry);
    } catch (error) {
      throw new AuditWriteError(
        'Failed to write audit log entry. Action blocked due to audit logging failure.',
        error,
      );
    }

    return logEntry;
  }

  /**
   * Verify the integrity of the hash chain for a sequence of entries.
   * Returns true if the chain is valid, false if tampering is detected.
   */
  static verifyChain(entries: AuditLogEntry[]): boolean {
    if (entries.length === 0) return true;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedPreviousHash = i === 0 ? GENESIS_HASH : entries[i - 1].integrityHash;

      // Verify the previous hash reference
      if (entry.previousHash !== expectedPreviousHash) {
        return false;
      }

      // Verify the integrity hash computation
      const expectedHash = computeIntegrityHash(
        entry.previousHash,
        entry.actor,
        entry.action,
        entry.resource,
        entry.timestamp,
        entry.outcome,
      );

      if (entry.integrityHash !== expectedHash) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Generate a UUID v4 identifier.
 * Uses crypto.randomUUID when available, falls back to manual generation.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
