/**
 * Catalog Command
 *
 * Manages the service catalog from the CLI:
 * - idp catalog list     - List services in the catalog
 * - idp catalog register - Register a new service
 * - idp catalog info     - Get service details
 * - idp catalog search   - Search the catalog
 * - idp catalog update   - Update a service
 * - idp catalog deps     - View service dependencies
 */

import type { Command } from 'commander';
import type { ApiClient } from '../utils/api-client.js';
import { formatTable, formatStatus, printSuccess, printError } from '../utils/output.js';

/**
 * Register the catalog command and its subcommands.
 */
export function registerCatalogCommand(program: Command): void {
  const catalog = program
    .command('catalog')
    .description('Manage the service catalog');

  // idp catalog search
  catalog
    .command('search <query>')
    .description('Search the service catalog')
    .option('-n, --limit <count>', 'Maximum results', '50')
    .action(async (query: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;
      const isJson = cmd.parent.parent.opts().json;

      try {
        const params = new URLSearchParams({ q: query });
        if (opts.limit) params.set('limit', opts.limit);

        const response = await client.get(`/api/v1/catalog/search?${params.toString()}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        if (response.data.length === 0) {
          console.log(`No services found matching "${query}".`);
          return;
        }

        const rows = response.data.map((s: Record<string, unknown>) => ({
          Name: s.name,
          Namespace: s.namespace,
          Owner: s.owner,
          Lifecycle: formatStatus(s.lifecycleStage as string),
          Version: `v${s.version}`,
          Tags: (s.tags as string[]).join(', '),
        }));

        formatTable(rows);
        console.log(`\nFound ${response.meta.total} services`);
      } catch (error) {
        printError('Search failed', error);
      }
    });

  // idp catalog register
  catalog
    .command('register')
    .description('Register a new service in the catalog')
    .requiredOption('-n, --name <name>', 'Service name')
    .requiredOption('--namespace <namespace>', 'Service namespace')
    .requiredOption('--owner <owner>', 'Service owner (team)')
    .requiredOption('--repo <url>', 'Repository URL')
    .option('-d, --description <text>', 'Service description', '')
    .option('--lifecycle <stage>', 'Lifecycle stage (experimental|development|production|deprecated)', 'development')
    .option('--tags <tags>', 'Comma-separated tags', '')
    .option('--source-repo <url>', 'Source repository for catalog definition')
    .action(async (opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;
      const isJson = cmd.parent.parent.opts().json;

      try {
        const response = await client.post('/api/v1/catalog', {
          name: opts.name,
          namespace: opts.namespace,
          owner: opts.owner,
          description: opts.description,
          lifecycleStage: opts.lifecycle,
          repositoryUrl: opts.repo,
          tags: opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : [],
          sourceRepository: opts.sourceRepo || opts.repo,
        });

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        const entity = response.data;
        printSuccess(`Service '${entity.name}' registered`);
        console.log(`  ID:        ${entity.id}`);
        console.log(`  Namespace: ${entity.namespace}`);
        console.log(`  Owner:     ${entity.owner}`);
        console.log(`  Version:   v${entity.version}`);
      } catch (error) {
        printError('Failed to register service', error);
      }
    });

  // idp catalog info
  catalog
    .command('info <id>')
    .description('Get detailed information about a service')
    .option('--versions', 'Include version history')
    .action(async (id: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;
      const isJson = cmd.parent.parent.opts().json;

      try {
        const response = await client.get(`/api/v1/catalog/${id}`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        const s = response.data;
        console.log(`\nService: ${s.name}`);
        console.log(`  ID:          ${s.id}`);
        console.log(`  Namespace:   ${s.namespace}`);
        console.log(`  Owner:       ${s.owner}`);
        console.log(`  Description: ${s.description}`);
        console.log(`  Lifecycle:   ${formatStatus(s.lifecycleStage)}`);
        console.log(`  Repository:  ${s.repositoryUrl}`);
        console.log(`  Version:     v${s.version}`);
        console.log(`  Tags:        ${s.tags.join(', ') || 'none'}`);
        console.log(`  Created by:  ${s.createdBy}`);
        console.log(`  Created at:  ${new Date(s.createdAt).toLocaleString()}`);
        console.log(`  Updated at:  ${new Date(s.updatedAt).toLocaleString()}`);

        if (opts.versions) {
          const versionsResp = await client.get(`/api/v1/catalog/${id}/versions`);
          if (versionsResp.data.length > 0) {
            console.log(`\n  Version History:`);
            for (const v of versionsResp.data.slice(0, 10)) {
              console.log(`    v${v.version} - ${v.changedBy} at ${new Date(v.changedAt).toLocaleString()}`);
            }
          }
        }
      } catch (error) {
        printError('Failed to get service info', error);
      }
    });

  // idp catalog update
  catalog
    .command('update <id>')
    .description('Update a service in the catalog')
    .option('-d, --description <text>', 'New description')
    .option('--owner <owner>', 'New owner')
    .option('--lifecycle <stage>', 'New lifecycle stage')
    .option('--tags <tags>', 'New comma-separated tags')
    .action(async (id: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;

      const updates: Record<string, unknown> = {};
      if (opts.description) updates.description = opts.description;
      if (opts.owner) updates.owner = opts.owner;
      if (opts.lifecycle) updates.lifecycleStage = opts.lifecycle;
      if (opts.tags) updates.tags = opts.tags.split(',').map((t: string) => t.trim());

      if (Object.keys(updates).length === 0) {
        printError('No updates specified. Use --help to see available options.');
        return;
      }

      try {
        const response = await client.put(`/api/v1/catalog/${id}`, updates);
        printSuccess(`Service updated to v${response.data.version}`);
      } catch (error) {
        printError('Failed to update service', error);
      }
    });

  // idp catalog deps
  catalog
    .command('deps <id>')
    .description('View service dependencies')
    .option('--add <targetId>', 'Add a dependency')
    .option('--type <type>', 'Dependency type', 'runtime')
    .option('--remove <targetId>', 'Remove a dependency')
    .action(async (id: string, opts, cmd) => {
      const client: ApiClient = cmd.parent.parent.opts()._apiClient;
      const isJson = cmd.parent.parent.opts().json;

      try {
        if (opts.add) {
          await client.post(`/api/v1/catalog/${id}/dependencies`, {
            targetEntityId: opts.add,
            dependencyType: opts.type,
          });
          printSuccess(`Dependency added: ${id} → ${opts.add} (${opts.type})`);
          return;
        }

        if (opts.remove) {
          await client.delete(`/api/v1/catalog/${id}/dependencies/${opts.remove}`);
          printSuccess(`Dependency removed: ${id} → ${opts.remove}`);
          return;
        }

        // List dependencies
        const response = await client.get(`/api/v1/catalog/${id}/dependencies`);

        if (isJson) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        if (response.data.length === 0) {
          console.log('No dependencies configured.');
          return;
        }

        const rows = response.data.map((d: Record<string, unknown>) => ({
          Target: d.targetEntityId,
          Type: d.dependencyType,
          Created: new Date(d.createdAt as string).toLocaleString(),
        }));

        formatTable(rows);
      } catch (error) {
        printError('Failed to manage dependencies', error);
      }
    });
}
