/**
 * In-memory implementation of AuditLogStore.
 *
 * Provides filtering, pagination, and retention enforcement for audit log queries.
 * Suitable for testing and development environments.
 *
 * Requirements: 10.3, 10.4
 */

import type { AuditLogEntry, AuditQueryFilters, PaginatedAuditResult } from '@idp/shared';
import { type AuditLogStore, MAX_QUERY_LIMIT, MIN_RETENTION_DAYS } from './audit-logger';

/**
 * In-memory audit log store with query support.
 *
 * Stores entries in an array ordered by insertion time.
 * Supports filtering by actor, action, and time range.
 * Implements cursor-based pagination using entry IDs.
 * Enforces 1-year minimum retention policy.
 */
export class InMemoryAuditStore implements AuditLogStore {
  private entries: AuditLogEntry[] = [];

  async getLastEntryHash(): Promise<string | null> {
    if (this.entries.length === 0) return null;
    return this.entries[this.entries.length - 1].integrityHash;
  }

  async insert(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async query(filters: AuditQueryFilters): Promise<PaginatedAuditResult> {
    const limit = Math.min(filters.limit ?? MAX_QUERY_LIMIT, MAX_QUERY_LIMIT);

    // Apply retention policy: ensure we can access entries within MIN_RETENTION_DAYS
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - MIN_RETENTION_DAYS);

    // Filter entries
    let filtered = this.entries.filter((entry) => {
      // Actor filter (exact match)
      if (filters.actor && entry.actor !== filters.actor) {
        return false;
      }

      // Action filter (exact match)
      if (filters.action && entry.action !== filters.action) {
        return false;
      }

      // Time range filter (inclusive)
      if (filters.startTime && entry.timestamp < filters.startTime) {
        return false;
      }
      if (filters.endTime && entry.timestamp > filters.endTime) {
        return false;
      }

      return true;
    });

    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply cursor-based pagination
    let startIndex = 0;
    if (filters.cursor) {
      const cursorIndex = filtered.findIndex((entry) => entry.id === filters.cursor);
      if (cursorIndex >= 0) {
        // Start after the cursor entry
        startIndex = cursorIndex + 1;
      }
    }

    // Slice to the requested page
    const pageEntries = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filtered.length;

    // Next cursor is the ID of the last entry in this page
    const nextCursor = hasMore && pageEntries.length > 0
      ? pageEntries[pageEntries.length - 1].id
      : null;

    return {
      entries: pageEntries,
      totalCount: filtered.length,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get the minimum retention date. Entries older than this date
   * are eligible for deletion, but entries within this window
   * must be preserved.
   */
  getRetentionCutoffDate(): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MIN_RETENTION_DAYS);
    return cutoff;
  }

  /**
   * Check if an entry is within the retention period.
   * Returns true if the entry must be retained.
   */
  isWithinRetention(entry: AuditLogEntry): boolean {
    return entry.timestamp >= this.getRetentionCutoffDate();
  }

  /**
   * Get all entries (for testing purposes).
   */
  getAll(): AuditLogEntry[] {
    return [...this.entries];
  }

  /**
   * Get the count of entries (for testing purposes).
   */
  getCount(): number {
    return this.entries.length;
  }
}
