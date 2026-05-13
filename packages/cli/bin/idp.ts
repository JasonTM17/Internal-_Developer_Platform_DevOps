#!/usr/bin/env node
/**
 * IDP CLI Binary Entry Point
 *
 * This is the executable entry point for the `idp` command.
 * It bootstraps the CLI application and handles top-level errors.
 */

import { run } from '../src/index.js';

// Set process title for identification in process managers
process.title = 'idp';

// Run the CLI
run().catch((error: Error) => {
  // Handle any unhandled errors that escape the CLI framework
  if (process.env.IDP_DEBUG === 'true') {
    console.error('\nFatal error:', error);
    console.error(error.stack);
  } else {
    console.error(`\nFatal error: ${error.message}`);
    console.error('Run with IDP_DEBUG=true for full stack trace.');
  }
  process.exit(1);
});
