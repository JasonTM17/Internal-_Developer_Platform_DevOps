/**
 * Status Command
 *
 * Shows platform-wide status and health information:
 * - idp status          - Overall platform health
 * - idp status services - Service health overview
 * - idp status deploys  - Active deployments
 * - idp status envs     - Environment status
 */

import type { Command } from 'commander';
import { getRootOpts } from '../utils/command-helpers.js';
import {
  formatTable,
  formatStatus,
  printSuccess,
  printError,
  printWarning,
} from '../utils/output.js';

/**
 * Register the status command and its subcommands.
 */
export function registerStatusCommand(program: Command): void {
  const status = program.command('status').description('Platform status and health overview');

  // idp status (default - overall health)
  status
    .command('platform', { isDefault: true })
    .description('Show overall platform health')
    .action(async (_opts, cmd) => {
      const { _apiClient: client, json: isJson } = getRootOpts(cmd);

      try {
        // Fetch health and readiness
        const [health, ready] = await Promise.allSettled([
          client.get('/health'),
          client.get('/ready'),
        ]);

        if (isJson) {
          console.log(
            JSON.stringify(
              {
                health: health.status === 'fulfilled' ? health.value : null,
                ready: ready.status === 'fulfilled' ? ready.value : null,
              },
              null,
              2,
            ),
          );
          return;
        }

        console.log('\n╔══════════════════════════════════════╗');
        console.log('║   IDP Platform Status                ║');
        console.log('╚══════════════════════════════════════╝\n');

        // Health status
        if (health.status === 'fulfilled') {
          const h = health.value;
          printSuccess(`API Server: ${h.status} (uptime: ${h.uptime}s)`);
        } else {
          printError('API Server: unreachable');
        }

        // Readiness status
        if (ready.status === 'fulfilled') {
          const r = ready.value;
          console.log(`\n  Readiness: ${formatStatus(r.status)}`);
          if (r.checks) {
            for (const [name, checks] of Object.entries(r.checks)) {
              const checkList = checks as Array<{
                status: string;
                observedValue?: number;
                observedUnit?: string;
              }>;
              for (const check of checkList) {
                const timing = check.observedValue
                  ? ` (${check.observedValue}${check.observedUnit || 'ms'})`
                  : '';
                console.log(`    ${formatStatus(check.status)} ${name}${timing}`);
              }
            }
          }
        } else {
          printWarning('Readiness check failed - some dependencies may be unavailable');
        }

        // API info
        try {
          const apiInfo = await client.get('/api');
          console.log(`\n  API Version: ${apiInfo.version}`);
          console.log(
            `  Modules: ${apiInfo.modules.map((m: { name: string }) => m.name).join(', ')}`,
          );
        } catch {
          // API info endpoint not critical
        }

        console.log('');
      } catch (error) {
        printError('Failed to get platform status', error);
      }
    });

  // idp status services
  status
    .command('services')
    .description('Show service health overview')
    .option('-e, --env <environment>', 'Filter by environment')
    .action(async (opts, cmd) => {
      const { _apiClient: client, json: isJson } = getRootOpts(cmd);

      try {
        const params = new URLSearchParams();
        if (opts.env) params.set('environment', opts.env);

        // Get catalog services
        const response = await client.get(`/api/v1/catalog/search?q=*&${params.toString()}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        if (response.data.length === 0) {
          console.log('No services found.');
          return;
        }

        const rows = response.data.map((s: Record<string, unknown>) => ({
          Service: s.name,
          Namespace: s.namespace,
          Owner: s.owner,
          Lifecycle: formatStatus(s.lifecycleStage as string),
          Version: `v${s.version}`,
        }));

        console.log('\nService Catalog Overview:\n');
        formatTable(rows);
        console.log(`\nTotal: ${response.data.length} services`);
      } catch (error) {
        printError('Failed to get service status', error);
      }
    });

  // idp status deploys
  status
    .command('deploys')
    .description('Show active deployments')
    .option('-e, --env <environment>', 'Filter by environment')
    .action(async (opts, cmd) => {
      const { _apiClient: client, json: isJson } = getRootOpts(cmd);

      try {
        const params = new URLSearchParams({ limit: '20' });
        if (opts.env) params.set('environment', opts.env);

        const response = await client.get(`/api/v1/deployments?${params.toString()}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        const active = response.data.filter(
          (d: Record<string, unknown>) =>
            !['completed', 'failed', 'cancelled'].includes(d.state as string),
        );

        if (active.length === 0) {
          console.log('No active deployments.');
          return;
        }

        const rows = active.map((d: Record<string, unknown>) => ({
          ID: (d.id as string).slice(0, 8),
          Service: d.serviceId,
          Env: d.environment,
          Version: d.version,
          State: formatStatus(d.state as string),
          Started: new Date(d.createdAt as string).toLocaleString(),
        }));

        console.log('\nActive Deployments:\n');
        formatTable(rows);
      } catch (error) {
        printError('Failed to get deployment status', error);
      }
    });

  // idp status envs
  status
    .command('envs')
    .description('Show environment status')
    .action(async (_opts, cmd) => {
      const { _apiClient: client, json: isJson } = getRootOpts(cmd);

      try {
        const response = await client.get('/api/v1/environments');

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        if (response.data.length === 0) {
          console.log('No environments configured.');
          return;
        }

        const rows = response.data.map((e: Record<string, unknown>) => ({
          Name: e.name,
          Tier: e.tier,
          Status: formatStatus(e.status as string),
          Region: e.region,
          'Auto-scale': (e as Record<string, unknown>).autoScaling ? '✓' : '✗',
        }));

        console.log('\nEnvironment Status:\n');
        formatTable(rows);
      } catch (error) {
        printError('Failed to get environment status', error);
      }
    });
}
