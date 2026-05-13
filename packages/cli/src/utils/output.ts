/**
 * Formatted Output Helpers
 *
 * Utilities for consistent CLI output formatting:
 * - Colored status indicators
 * - Table formatting
 * - Progress spinners
 * - Success/error/warning messages
 * - JSON output mode support
 */

/** ANSI color codes. */
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
} as const;

/** Check if color output is enabled. */
function isColorEnabled(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return process.stdout.isTTY === true;
}

/**
 * Apply color to text if colors are enabled.
 */
function colorize(text: string, color: keyof typeof COLORS): string {
  if (!isColorEnabled()) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

/**
 * Print a success message.
 */
export function printSuccess(message: string): void {
  console.log(`${colorize('✓', 'green')} ${message}`);
}

/**
 * Print an error message.
 */
export function printError(message: string, error?: unknown): void {
  console.error(`${colorize('✗', 'red')} ${colorize(message, 'red')}`);
  if (error) {
    if (error instanceof Error) {
      console.error(`  ${colorize(error.message, 'dim')}`);
      if (process.env.IDP_DEBUG === 'true' && error.stack) {
        console.error(colorize(error.stack, 'dim'));
      }
    } else if (typeof error === 'string') {
      console.error(`  ${colorize(error, 'dim')}`);
    }
  }
}

/**
 * Print a warning message.
 */
export function printWarning(message: string): void {
  console.log(`${colorize('⚠', 'yellow')} ${colorize(message, 'yellow')}`);
}

/**
 * Print an info message.
 */
export function printInfo(message: string): void {
  console.log(`${colorize('ℹ', 'blue')} ${message}`);
}

/**
 * Format a status string with appropriate color.
 */
export function formatStatus(status: string): string {
  const statusColors: Record<string, keyof typeof COLORS> = {
    // Positive states
    pass: 'green',
    healthy: 'green',
    active: 'green',
    completed: 'green',
    production: 'green',
    success: 'green',
    rolled_back: 'green',

    // Warning states
    warn: 'yellow',
    warning: 'yellow',
    degraded: 'yellow',
    in_progress: 'yellow',
    verifying: 'yellow',
    pending_approval: 'yellow',
    queued: 'yellow',
    development: 'yellow',
    staging: 'yellow',
    experimental: 'yellow',
    provisioning: 'yellow',
    maintenance: 'yellow',
    rolling_back: 'yellow',

    // Error states
    fail: 'red',
    error: 'red',
    unhealthy: 'red',
    failed: 'red',
    cancelled: 'red',
    rollback_failed: 'red',
    deleted: 'red',
    deprecated: 'red',
    decommissioning: 'red',

    // Neutral states
    unknown: 'gray',
    preview: 'cyan',
  };

  const color = statusColors[status.toLowerCase()] || 'white';
  return colorize(status, color);
}

/**
 * Format data as a table.
 * Automatically calculates column widths based on content.
 */
export function formatTable(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  // Calculate column widths
  const widths: Record<string, number> = {};
  for (const header of headers) {
    widths[header] = header.length;
  }
  for (const row of rows) {
    for (const header of headers) {
      const value = stripAnsi(String(row[header] ?? ''));
      widths[header] = Math.max(widths[header], value.length);
    }
  }

  // Print header
  const headerLine = headers
    .map((h) => h.padEnd(widths[h]))
    .join('  ');
  console.log(colorize(headerLine, 'bold'));

  // Print separator
  const separator = headers
    .map((h) => '─'.repeat(widths[h]))
    .join('──');
  console.log(colorize(separator, 'dim'));

  // Print rows
  for (const row of rows) {
    const line = headers
      .map((h) => {
        const value = String(row[h] ?? '');
        const stripped = stripAnsi(value);
        const padding = widths[h] - stripped.length;
        return value + ' '.repeat(Math.max(0, padding));
      })
      .join('  ');
    console.log(line);
  }
}

/**
 * Strip ANSI escape codes from a string.
 */
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Format bytes into human-readable size.
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Format a duration in milliseconds to human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

/**
 * Format a relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return new Date(date).toLocaleDateString();
}

/**
 * Create a simple progress indicator for async operations.
 */
export function createSpinner(message: string): { stop: (finalMessage?: string) => void } {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;
  let stopped = false;

  const interval = setInterval(() => {
    if (stopped) return;
    process.stdout.write(`\r${colorize(frames[frameIndex], 'cyan')} ${message}`);
    frameIndex = (frameIndex + 1) % frames.length;
  }, 80);

  return {
    stop(finalMessage?: string) {
      stopped = true;
      clearInterval(interval);
      process.stdout.write('\r' + ' '.repeat(message.length + 4) + '\r');
      if (finalMessage) {
        console.log(finalMessage);
      }
    },
  };
}
