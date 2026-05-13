/**
 * IDP CLI - Entry Point
 *
 * Main entry point for the Internal Developer Platform CLI.
 * Sets up the commander program with all available commands
 * and global options.
 */

import { Command } from 'commander';
import { registerDeployCommand } from './commands/deploy.js';
import { registerEnvCommand } from './commands/env.js';
import { registerCatalogCommand } from './commands/catalog.js';
import { registerConfigCommand } from './commands/config.js';
import { registerStatusCommand } from './commands/status.js';
import { registerLogsCommand } from './commands/logs.js';
import { getCliConfig } from './utils/config.js';
import { createApiClient } from './utils/api-client.js';

/** CLI version from package.json */
const VERSION = '0.1.0';

/**
 * Create and configure the CLI program.
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('idp')
    .description('Internal Developer Platform CLI - manage services, deployments, and environments')
    .version(VERSION, '-v, --version', 'Display the CLI version')
    .option('--api-url <url>', 'Override the API base URL')
    .option('--profile <name>', 'Use a specific configuration profile', 'default')
    .option('--json', 'Output results as JSON')
    .option('--no-color', 'Disable colored output')
    .option('--verbose', 'Enable verbose logging')
    .option('--quiet', 'Suppress non-essential output');

  // Global hook to set up context before commands run
  program.hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    const config = getCliConfig(opts.profile);

    // Set up API client with resolved configuration
    const apiUrl = opts.apiUrl || config.apiUrl || 'http://localhost:3001';
    const client = createApiClient({
      baseUrl: apiUrl,
      token: config.token,
      timeout: config.timeout || 30000,
    });

    // Attach to command context for subcommands to use
    thisCommand.setOptionValue('_apiClient', client);
    thisCommand.setOptionValue('_config', config);
  });

  // Register all commands
  registerDeployCommand(program);
  registerEnvCommand(program);
  registerCatalogCommand(program);
  registerConfigCommand(program);
  registerStatusCommand(program);
  registerLogsCommand(program);

  // Default action (no command specified)
  program.action(() => {
    program.help();
  });

  return program;
}

/**
 * Run the CLI program.
 */
export async function run(argv?: string[]): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(argv || process.argv);
  } catch (error) {
    if (error instanceof Error) {
      if (process.env.IDP_DEBUG === 'true') {
        console.error(error.stack);
      } else {
        console.error(`Error: ${error.message}`);
      }
    }
    process.exit(1);
  }
}
