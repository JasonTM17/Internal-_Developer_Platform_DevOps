/**
 * Config Command
 *
 * Manages platform configuration from the CLI:
 * - idp config get      - Get a configuration value
 * - idp config set      - Set a configuration value
 * - idp config delete   - Delete a configuration value
 * - idp config list     - List configuration entries
 * - idp config resolve  - Resolve effective config for a service
 * - idp config history  - View config change history
 * - idp config rollback - Rollback to a previous version
 */

import type { Command } from 'commander';
import type { ApiClient } from '../utils/api-client.js';
import { formatTable, printSuccess, printError } from '../utils/output.js';

/**
 * Register the config command and its subcommands.
 */
export function registerConfigCommand(program: Command): void {
  const config = program
    .command('config')
    .description('Manage platform configuration');

  // idp config get
  config
    .command('get <key>')
    .description('Get a configuration value')
    .option('-s, --scope <scope>', 'Configuration scope (global|environment|service)', 'global')
    .option('--scope-id <id>', 'Scope identifier (environment name or service ID)')
    .action(async (key: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;
      const isJson = cmd.parent.parent.opts().json;

      try {
        const params = new URLSearchParams({ scope: opts.scope });
        if (opts.scopeId) params.set('scopeId', opts.scopeId);

        const response = await client.get(`/api/v1/config/${key}?${params.toString()}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        const entry = response.data;
        console.log(`${entry.key} = ${entry.value}`);
        console.log(`  Scope:   ${entry.scope}${entry.scopeId ? `:${entry.scopeId}` : ''}`);
        console.log(`  Type:    ${entry.valueType}`);
        console.log(`  Version: ${entry.version}`);
        if (entry.description) {
          console.log(`  Desc:    ${entry.description}`);
        }
      } catch (error) {
        printError(`Configuration '${key}' not found`, error);
      }
    });

  // idp config set
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .option('-s, --scope <scope>', 'Configuration scope', 'global')
    .option('--scope-id <id>', 'Scope identifier')
    .option('-t, --type <type>', 'Value type (string|number|boolean|json|secret)', 'string')
    .option('-d, --description <text>', 'Description of this config entry')
    .option('--tags <tags>', 'Comma-separated tags')
    .action(async (key: string, value: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;

      try {
        const response = await client.post('/api/v1/config', {
          key,
          value,
          scope: opts.scope,
          scopeId: opts.scopeId,
          valueType: opts.type,
          description: opts.description,
          tags: opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : undefined,
        });

        printSuccess(`Configuration '${key}' set (v${response.data.version})`);
      } catch (error) {
        printError('Failed to set configuration', error);
      }
    });

  // idp config delete
  config
    .command('delete <key>')
    .description('Delete a configuration value')
    .option('-s, --scope <scope>', 'Configuration scope', 'global')
    .option('--scope-id <id>', 'Scope identifier')
    .option('-f, --force', 'Skip confirmation')
    .action(async (key: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;

      if (!opts.force) {
        console.log(`Warning: This will delete configuration '${key}' from scope '${opts.scope}'.`);
        console.log('Use --force to skip this confirmation.');
        return;
      }

      try {
        const params = new URLSearchParams({ scope: opts.scope });
        if (opts.scopeId) params.set('scopeId', opts.scopeId);

        await client.delete(`/api/v1/config/${key}?${params.toString()}`);
        printSuccess(`Configuration '${key}' deleted`);
      } catch (error) {
        printError('Failed to delete configuration', error);
      }
    });

  // idp config resolve
  config
    .command('resolve <serviceId>')
    .description('Resolve effective configuration for a service')
    .requiredOption('-e, --env <environment>', 'Target environment')
    .action(async (serviceId: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;
      const isJson = cmd.parent.parent.opts().json;

      try {
        const params = new URLSearchParams({ environment: opts.env });
        const response = await client.get(`/api/v1/config/resolve/${serviceId}?${params.toString()}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        if (response.data.length === 0) {
          console.log('No configuration resolved.');
          return;
        }

        const rows = response.data.map((c: Record<string, unknown>) => ({
          Key: c.key,
          Value: c.isSecret ? '********' : c.value,
          Source: c.source,
          Version: `v${c.version}`,
        }));

        console.log(`\nResolved config for ${serviceId} in ${opts.env}:\n`);
        formatTable(rows);
      } catch (error) {
        printError('Failed to resolve configuration', error);
      }
    });

  // idp config history
  config
    .command('history <key>')
    .description('View configuration change history')
    .option('-s, --scope <scope>', 'Configuration scope', 'global')
    .option('--scope-id <id>', 'Scope identifier')
    .action(async (key: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;
      const isJson = cmd.parent.parent.opts().json;

      try {
        const params = new URLSearchParams({ scope: opts.scope });
        if (opts.scopeId) params.set('scopeId', opts.scopeId);

        const response = await client.get(`/api/v1/config/${key}/history?${params.toString()}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        if (response.data.length === 0) {
          console.log('No version history found.');
          return;
        }

        const rows = response.data.map((v: Record<string, unknown>) => ({
          Version: `v${v.version}`,
          Value: (v.value as string).length > 40 ? (v.value as string).slice(0, 40) + '...' : v.value,
          'Changed By': v.changedBy,
          'Changed At': new Date(v.changedAt as string).toLocaleString(),
        }));

        formatTable(rows);
      } catch (error) {
        printError('Failed to get config history', error);
      }
    });

  // idp config rollback
  config
    .command('rollback <key>')
    .description('Rollback configuration to a previous version')
    .requiredOption('--to-version <version>', 'Target version number')
    .option('-s, --scope <scope>', 'Configuration scope', 'global')
    .option('--scope-id <id>', 'Scope identifier')
    .action(async (key: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;

      try {
        const response = await client.post(`/api/v1/config/${key}/rollback`, {
          version: parseInt(opts.toVersion, 10),
          scope: opts.scope,
          scopeId: opts.scopeId,
        });

        printSuccess(`Configuration '${key}' rolled back to v${opts.toVersion} (now v${response.data.version})`);
      } catch (error) {
        printError('Failed to rollback configuration', error);
      }
    });
}
