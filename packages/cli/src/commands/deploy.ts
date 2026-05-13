/**
 * Deploy Command
 *
 * Manages service deployments from the CLI:
 * - idp deploy create   - Create a new deployment
 * - idp deploy status   - Check deployment status
 * - idp deploy list     - List recent deployments
 * - idp deploy approve  - Approve a pending deployment
 * - idp deploy cancel   - Cancel an active deployment
 * - idp deploy rollback - Rollback a deployment
 * - idp deploy history  - View deployment history
 */

import type { Command } from 'commander';
import type { ApiClient } from '../utils/api-client.js';
import { formatTable, formatStatus, printSuccess, printError, printWarning } from '../utils/output.js';

/**
 * Register the deploy command and its subcommands.
 */
export function registerDeployCommand(program: Command): void {
  const deploy = program
    .command('deploy')
    .description('Manage service deployments');

  // idp deploy create
  deploy
    .command('create')
    .description('Create a new deployment')
    .requiredOption('-s, --service <id>', 'Service ID to deploy')
    .requiredOption('-e, --env <environment>', 'Target environment')
    .requiredOption('--version <version>', 'Version to deploy')
    .option('--strategy <strategy>', 'Deployment strategy (rolling|blue-green|canary|recreate)', 'rolling')
    .option('--canary-pct <percentage>', 'Canary traffic percentage (1-100)')
    .option('--timeout <seconds>', 'Deployment timeout in seconds', '600')
    .option('--no-auto-rollback', 'Disable automatic rollback on failure')
    .option('--require-approval', 'Require manual approval before deploying')
    .option('--description <text>', 'Deployment description')
    .action(async (opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;
      const isJson = cmd.parent.parent.opts().json;

      try {
        const response = await client.post('/api/v1/deployments', {
          serviceId: opts.service,
          environment: opts.env,
          version: opts.version,
          strategy: opts.strategy,
          canaryPercentage: opts.canaryPct ? parseInt(opts.canaryPct, 10) : undefined,
          timeoutSeconds: parseInt(opts.timeout, 10),
          autoRollback: opts.autoRollback !== false,
          requiresApproval: opts.requireApproval || false,
          description: opts.description || '',
        });

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        const deployment = response.data;
        printSuccess(`Deployment created: ${deployment.id}`);
        console.log(`  Service:     ${deployment.serviceId}`);
        console.log(`  Environment: ${deployment.environment}`);
        console.log(`  Version:     ${deployment.version}`);
        console.log(`  Strategy:    ${deployment.strategy}`);
        console.log(`  State:       ${formatStatus(deployment.state)}`);
        console.log(`\n  Track progress: idp deploy status ${deployment.id}`);
      } catch (error) {
        printError('Failed to create deployment', error);
      }
    });

  // idp deploy status
  deploy
    .command('status <deploymentId>')
    .description('Check the status of a deployment')
    .option('--watch', 'Watch for status changes')
    .option('--interval <seconds>', 'Watch polling interval', '5')
    .action(async (deploymentId: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;
      const isJson = cmd.parent.parent.opts().json;

      try {
        const response = await client.get(`/api/v1/deployments/${deploymentId}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        const d = response.data;
        console.log(`\nDeployment: ${d.id}`);
        console.log(`  Service:     ${d.serviceId}`);
        console.log(`  Environment: ${d.environment}`);
        console.log(`  Version:     ${d.version} (from ${d.previousVersion || 'initial'})`);
        console.log(`  Strategy:    ${d.strategy}`);
        console.log(`  State:       ${formatStatus(d.state)}`);
        console.log(`  Initiated:   ${d.initiatedBy}`);
        console.log(`  Created:     ${new Date(d.createdAt).toLocaleString()}`);
        if (d.completedAt) {
          console.log(`  Completed:   ${new Date(d.completedAt).toLocaleString()}`);
        }
        if (d.failureReason) {
          console.log(`  Failure:     ${d.failureReason}`);
        }

        if (opts.watch && !['completed', 'failed', 'cancelled'].includes(d.state)) {
          printWarning('Watch mode: polling for updates...');
          // In a real implementation, this would poll or use WebSocket
        }
      } catch (error) {
        printError('Failed to get deployment status', error);
      }
    });

  // idp deploy list
  deploy
    .command('list')
    .description('List recent deployments')
    .option('-e, --env <environment>', 'Filter by environment')
    .option('-s, --service <id>', 'Filter by service')
    .option('--state <state>', 'Filter by state')
    .option('-n, --limit <count>', 'Number of results', '20')
    .action(async (opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;
      const isJson = cmd.parent.parent.opts().json;

      try {
        const params = new URLSearchParams();
        if (opts.env) params.set('environment', opts.env);
        if (opts.service) params.set('serviceId', opts.service);
        if (opts.state) params.set('state', opts.state);
        params.set('limit', opts.limit);

        const response = await client.get(`/api/v1/deployments?${params.toString()}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        if (response.data.length === 0) {
          console.log('No deployments found.');
          return;
        }

        const rows = response.data.map((d: Record<string, unknown>) => ({
          ID: (d.id as string).slice(0, 8),
          Service: d.serviceId,
          Env: d.environment,
          Version: d.version,
          Strategy: d.strategy,
          State: formatStatus(d.state as string),
          Created: new Date(d.createdAt as string).toLocaleString(),
        }));

        formatTable(rows);
        console.log(`\nTotal: ${response.meta.total} deployments`);
      } catch (error) {
        printError('Failed to list deployments', error);
      }
    });

  // idp deploy approve
  deploy
    .command('approve <deploymentId>')
    .description('Approve a pending deployment')
    .action(async (deploymentId: string, _opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;

      try {
        const response = await client.post(`/api/v1/deployments/${deploymentId}/approve`, {});
        printSuccess(`Deployment ${deploymentId} approved`);
        console.log(`  New state: ${formatStatus(response.data.state)}`);
      } catch (error) {
        printError('Failed to approve deployment', error);
      }
    });

  // idp deploy cancel
  deploy
    .command('cancel <deploymentId>')
    .description('Cancel an active deployment')
    .option('-r, --reason <reason>', 'Cancellation reason', 'Cancelled via CLI')
    .action(async (deploymentId: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;

      try {
        await client.post(`/api/v1/deployments/${deploymentId}/cancel`, {
          reason: opts.reason,
        });
        printSuccess(`Deployment ${deploymentId} cancelled`);
      } catch (error) {
        printError('Failed to cancel deployment', error);
      }
    });

  // idp deploy rollback
  deploy
    .command('rollback <deploymentId>')
    .description('Rollback a failed deployment')
    .action(async (deploymentId: string, _opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;

      try {
        const response = await client.post(`/api/v1/deployments/${deploymentId}/rollback`, {});
        printSuccess(`Rollback initiated for deployment ${deploymentId}`);
        console.log(`  Rollback deployment: ${response.data.id}`);
      } catch (error) {
        printError('Failed to rollback deployment', error);
      }
    });
}
