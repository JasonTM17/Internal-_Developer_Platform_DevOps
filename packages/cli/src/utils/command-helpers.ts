import type { Command } from 'commander';
import type { ApiClient } from './api-client.js';

interface RootOpts {
  _apiClient: ApiClient;
  json: boolean;
}

export function getRootOpts(cmd: Command): RootOpts {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const opts = (cmd as any).parent?.parent?.opts() as RootOpts;
  return opts;
}

export function getRootOptsDeep(cmd: Command): RootOpts {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const opts = (cmd as any).parent?.parent?.parent?.opts() as RootOpts;
  return opts;
}
