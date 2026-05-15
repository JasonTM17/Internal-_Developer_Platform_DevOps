/**
 * Environment Command
 *
 * Manages environments from the CLI:
 * - idp env list      - List all environments
 * - idp env create    - Create a new environment
 * - idp env info      - Get environment details
 * - idp env delete    - Delete an environment
 * - idp env promote   - Promote to next tier
 * - idp env vars      - Manage environment variables
 */

import type { Command } from 'commander';
import { getRootOpts, getRootOptsDeep } from '../utils/command-helpers.js';
import { formatTable, formatStatus, printSuccess, printError } from '../utils/output.js';

/**
 * Register the env command and its subcommands.
 */
export function registerEnvCommand(program: Command): void {
  const env = program.command('env').description('Manage environments');

  // idp env list
  env
    .command('list')
    .description('List all environments')
    .option('-t, --tier <tier>', 'Filter by tier (development|staging|production|preview)')
    .option('--status <status>', 'Filter by status')
    .option('--region <region>', 'Filter by region')
    .action(async (opts, cmd) => {
      const { _apiClient: client, json: isJson } = getRootOpts(cmd);

      try {
        const params = new URLSearchParams();
        if (opts.tier) params.set('tier', opts.tier);
        if (opts.status) params.set('status', opts.status);
        if (opts.region) params.set('region', opts.region);

        const response = await client.get(`/api/v1/environments?${params.toString()}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        if (response.data.length === 0) {
          console.log('No environments found.');
          return;
        }

        const rows = response.data.map((e: Record<string, unknown>) => ({
          Name: e.name,
          Tier: e.tier,
          Status: formatStatus(e.status as string),
          Region: e.region,
          Cluster: e.clusterName,
          Namespace: e.namespace,
        }));

        formatTable(rows);
        console.log(`\nTotal: ${response.meta.total} environments`);
      } catch (error) {
        printError('Failed to list environments', error);
      }
    });

  // idp env create
  env
    .command('create')
    .description('Create a new environment')
    .requiredOption('-n, --name <name>', 'Environment name')
    .requiredOption(
      '-t, --tier <tier>',
      'Environment tier (development|staging|production|preview)',
    )
    .option('-d, --description <text>', 'Environment description')
    .option('--region <region>', 'Cloud region', 'us-east-1')
    .option('--cluster <name>', 'Target cluster name')
    .option('--namespace <name>', 'Kubernetes namespace')
    .option('--auto-scaling', 'Enable auto-scaling')
    .option('--ttl <hours>', 'TTL in hours (preview environments only)')
    .action(async (opts, cmd) => {
      const { _apiClient: client, json: isJson } = getRootOpts(cmd);

      try {
        const response = await client.post('/api/v1/environments', {
          name: opts.name,
          tier: opts.tier,
          description: opts.description || '',
          region: opts.region,
          clusterName: opts.cluster,
          namespace: opts.namespace,
          autoScaling: opts.autoScaling || false,
          ttlHours: opts.ttl ? parseInt(opts.ttl, 10) : undefined,
        });

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        const environment = response.data;
        printSuccess(`Environment '${environment.name}' created`);
        console.log(`  ID:        ${environment.id}`);
        console.log(`  Tier:      ${environment.tier}`);
        console.log(`  Region:    ${environment.region}`);
        console.log(`  Cluster:   ${environment.clusterName}`);
        console.log(`  Namespace: ${environment.namespace}`);
        console.log(`  Status:    ${formatStatus(environment.status)}`);
      } catch (error) {
        printError('Failed to create environment', error);
      }
    });

  // idp env info
  env
    .command('info <id>')
    .description('Get environment details')
    .action(async (id: string, _opts, cmd) => {
      const { _apiClient: client, json: isJson } = getRootOpts(cmd);

      try {
        const response = await client.get(`/api/v1/environments/${id}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        const e = response.data;
        console.log(`\nEnvironment: ${e.name}`);
        console.log(`  ID:           ${e.id}`);
        console.log(`  Tier:         ${e.tier}`);
        console.log(`  Status:       ${formatStatus(e.status)}`);
        console.log(`  Region:       ${e.region}`);
        console.log(`  Cluster:      ${e.clusterName}`);
        console.log(`  Namespace:    ${e.namespace}`);
        console.log(`  Auto-scaling: ${e.autoScaling ? 'enabled' : 'disabled'}`);
        console.log(`  Created by:   ${e.createdBy}`);
        console.log(`  Created at:   ${new Date(e.createdAt).toLocaleString()}`);
        console.log(`\n  Resource Quotas:`);
        console.log(`    CPU:       ${e.quota.maxCpuCores} cores`);
        console.log(`    Memory:    ${e.quota.maxMemoryMb} MB`);
        console.log(`    Storage:   ${e.quota.maxStorageGb} GB`);
        console.log(`    Instances: ${e.quota.maxInstances}`);
        console.log(`    Services:  ${e.quota.maxServices}`);
      } catch (error) {
        printError('Failed to get environment info', error);
      }
    });

  // idp env delete
  env
    .command('delete <id>')
    .description('Delete an environment')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(async (id: string, opts, cmd) => {
      const { _apiClient: client } = getRootOpts(cmd);

      if (!opts.force) {
        console.log(`Warning: This will permanently delete environment '${id}'.`);
        console.log('Use --force to skip this confirmation.');
        return;
      }

      try {
        await client.delete(`/api/v1/environments/${id}`);
        printSuccess(`Environment '${id}' deleted`);
      } catch (error) {
        printError('Failed to delete environment', error);
      }
    });

  // idp env promote
  env
    .command('promote <id>')
    .description('Promote environment to next tier')
    .requiredOption('--target <tier>', 'Target tier (staging|production)')
    .action(async (id: string, opts, cmd) => {
      const { _apiClient: client } = getRootOpts(cmd);

      try {
        const response = await client.post(`/api/v1/environments/${id}/promote`, {
          targetTier: opts.target,
        });
        printSuccess(`Environment promoted to ${opts.target}`);
        console.log(`  New environment: ${response.data.name} (${response.data.id})`);
      } catch (error) {
        printError('Failed to promote environment', error);
      }
    });

  // idp env vars
  const vars = env.command('vars').description('Manage environment variables');

  vars
    .command('list <environmentId>')
    .description('List environment variables')
    .action(async (environmentId: string, _opts, cmd) => {
      const { _apiClient: client, json: isJson } = getRootOptsDeep(cmd);

      try {
        const response = await client.get(`/api/v1/environments/${environmentId}/variables`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        if (response.data.length === 0) {
          console.log('No variables configured.');
          return;
        }

        const rows = response.data.map((v: Record<string, unknown>) => ({
          Key: v.key,
          Value: v.isSecret ? '********' : v.value,
          Secret: v.isSecret ? 'yes' : 'no',
        }));

        formatTable(rows);
      } catch (error) {
        printError('Failed to list variables', error);
      }
    });

  vars
    .command('set <environmentId> <key> <value>')
    .description('Set an environment variable')
    .option('--secret', 'Mark as secret (encrypted at rest)')
    .action(async (environmentId: string, key: string, value: string, opts, cmd) => {
      const { _apiClient: client } = getRootOptsDeep(cmd);

      try {
        await client.put(`/api/v1/environments/${environmentId}/variables/${key}`, {
          value,
          isSecret: opts.secret || false,
        });
        printSuccess(`Variable '${key}' set`);
      } catch (error) {
        printError('Failed to set variable', error);
      }
    });
}
