/**
 * Logs Command
 *
 * Stream and query logs from services:
 * - idp logs stream   - Real-time log streaming via WebSocket
 * - idp logs search   - Search historical logs
 * - idp logs tail     - Tail recent logs
 */

import type { Command } from 'commander';
import { getRootOpts } from '../utils/command-helpers.js';
import { printError, printWarning } from '../utils/output.js';

/** Log entry structure. */
interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/** Log level colors for terminal output. */
const LEVEL_COLORS: Record<string, string> = {
  debug: '\x1b[90m', // gray
  info: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  fatal: '\x1b[35m', // magenta
};

const RESET = '\x1b[0m';

/**
 * Format a log entry for terminal display.
 */
function formatLogEntry(entry: LogEntry, opts: { noColor?: boolean; verbose?: boolean }): string {
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  const level = entry.level.toUpperCase().padEnd(5);
  const color = opts.noColor ? '' : LEVEL_COLORS[entry.level] || '';
  const reset = opts.noColor ? '' : RESET;

  let line = `${color}${timestamp} [${level}] ${entry.service}: ${entry.message}${reset}`;

  if (opts.verbose && entry.metadata && Object.keys(entry.metadata).length > 0) {
    line += `\n  ${JSON.stringify(entry.metadata)}`;
  }

  return line;
}

/**
 * Register the logs command and its subcommands.
 */
export function registerLogsCommand(program: Command): void {
  const logs = program.command('logs').description('Stream and search service logs');

  // idp logs stream
  logs
    .command('stream')
    .description('Stream real-time logs via WebSocket')
    .requiredOption('-s, --service <id>', 'Service ID to stream logs from')
    .option('-e, --env <environment>', 'Environment', 'development')
    .option('-l, --level <level>', 'Minimum log level (debug|info|warn|error)', 'info')
    .option('--filter <pattern>', 'Filter logs by message pattern')
    .option('--no-color', 'Disable colored output')
    .action(async (opts, cmd) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const parentOpts = (cmd as any).parent?.parent?.opts() as Record<string, any>;
      const apiUrl = parentOpts._config?.apiUrl || 'http://localhost:3001';
      const noColor = parentOpts.noColor || opts.noColor;
      const verbose = parentOpts.verbose;

      // Convert HTTP URL to WebSocket URL
      const wsUrl = apiUrl.replace(/^http/, 'ws');
      const streamUrl = `${wsUrl}/api/v1/logs/stream?service=${opts.service}&env=${opts.env}&level=${opts.level}`;

      console.log(`Connecting to log stream for ${opts.service} (${opts.env})...`);
      console.log(`URL: ${streamUrl}`);
      console.log('Press Ctrl+C to stop.\n');

      try {
        // Dynamic import for WebSocket (ESM compatible)
        const { WebSocket } = await import('ws');
        const ws = new WebSocket(streamUrl);

        ws.on('open', () => {
          console.log('Connected. Streaming logs...\n');
        });

        ws.on('message', (data: Buffer) => {
          try {
            const entry: LogEntry = JSON.parse(data.toString());

            // Apply client-side filter
            if (opts.filter && !entry.message.includes(opts.filter)) {
              return;
            }

            console.log(formatLogEntry(entry, { noColor, verbose }));
          } catch {
            // Raw message (non-JSON)
            console.log(data.toString());
          }
        });

        ws.on('error', (error: Error) => {
          printError('WebSocket error', error);
        });

        ws.on('close', (code: number, reason: Buffer) => {
          console.log(
            `\nConnection closed (code: ${code}, reason: ${reason.toString() || 'none'})`,
          );
        });

        // Handle Ctrl+C gracefully
        process.on('SIGINT', () => {
          console.log('\nDisconnecting...');
          ws.close();
          process.exit(0);
        });

        // Keep the process alive
        await new Promise(() => {});
      } catch (error) {
        printError('Failed to connect to log stream', error);
        printWarning('Make sure the API server is running and WebSocket endpoint is available.');
      }
    });

  // idp logs tail
  logs
    .command('tail')
    .description('Show recent logs')
    .requiredOption('-s, --service <id>', 'Service ID')
    .option('-e, --env <environment>', 'Environment', 'development')
    .option('-n, --lines <count>', 'Number of lines to show', '50')
    .option('-l, --level <level>', 'Minimum log level', 'info')
    .option('--since <duration>', 'Show logs since duration (e.g., 1h, 30m, 1d)', '1h')
    .option('--no-color', 'Disable colored output')
    .action(async (opts, cmd) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const parentOpts = (cmd as any).parent?.parent?.opts() as Record<string, any>;
      const client = parentOpts._apiClient as import('../utils/api-client.js').ApiClient;
      const isJson = parentOpts.json as boolean;
      const noColor = parentOpts.noColor || opts.noColor;
      const verbose = parentOpts.verbose;

      try {
        const params = new URLSearchParams({
          service: opts.service,
          environment: opts.env,
          limit: opts.lines,
          level: opts.level,
          since: opts.since,
        });

        const response = await client.get(`/api/v1/logs?${params.toString()}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        if (!response.data || response.data.length === 0) {
          console.log('No logs found for the specified criteria.');
          return;
        }

        for (const entry of response.data) {
          console.log(formatLogEntry(entry, { noColor, verbose }));
        }

        console.log(`\n--- ${response.data.length} log entries ---`);
      } catch (error) {
        printError('Failed to fetch logs', error);
      }
    });

  // idp logs search
  logs
    .command('search <query>')
    .description('Search historical logs')
    .requiredOption('-s, --service <id>', 'Service ID')
    .option('-e, --env <environment>', 'Environment')
    .option('--from <datetime>', 'Start time (ISO 8601)')
    .option('--to <datetime>', 'End time (ISO 8601)')
    .option('-n, --limit <count>', 'Maximum results', '100')
    .option('-l, --level <level>', 'Minimum log level')
    .action(async (query: string, opts, cmd) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const parentOpts = (cmd as any).parent?.parent?.opts() as Record<string, any>;
      const client = parentOpts._apiClient as import('../utils/api-client.js').ApiClient;
      const isJson = parentOpts.json as boolean;
      const noColor = parentOpts.noColor;
      const verbose = parentOpts.verbose;

      try {
        const params = new URLSearchParams({
          q: query,
          service: opts.service,
          limit: opts.limit,
        });
        if (opts.env) params.set('environment', opts.env);
        if (opts.from) params.set('from', opts.from);
        if (opts.to) params.set('to', opts.to);
        if (opts.level) params.set('level', opts.level);

        const response = await client.get(`/api/v1/logs/search?${params.toString()}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        if (!response.data || response.data.length === 0) {
          console.log(`No logs found matching "${query}".`);
          return;
        }

        for (const entry of response.data) {
          console.log(formatLogEntry(entry, { noColor, verbose }));
        }

        console.log(
          `\n--- ${response.data.length} results (of ${response.meta?.total || 'unknown'} total) ---`,
        );
      } catch (error) {
        printError('Failed to search logs', error);
      }
    });
}
