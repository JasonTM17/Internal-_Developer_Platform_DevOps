/**
 * CLI Configuration File Management
 *
 * Manages CLI configuration stored in the user's home directory:
 * - Multiple profile support (default, staging, production)
 * - Configuration file at ~/.idp/config.yaml
 * - Credentials stored separately at ~/.idp/credentials
 * - Environment variable overrides
 * - Configuration validation
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/** CLI configuration structure. */
export interface CliConfig {
  /** API server base URL */
  apiUrl?: string;
  /** Authentication token */
  token?: string;
  /** Token refresh token */
  refreshToken?: string;
  /** Authentication method */
  authMethod?: string;
  /** Token expiration timestamp (ISO 8601) */
  tokenExpiresAt?: string;
  /** User ID */
  userId?: string;
  /** User email */
  email?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Default environment for commands */
  defaultEnvironment?: string;
  /** Default output format */
  outputFormat?: 'text' | 'json' | 'yaml';
  /** Whether to enable color output */
  color?: boolean;
  /** Custom headers to include in API requests */
  headers?: Record<string, string>;
  /** Telemetry opt-out */
  telemetryEnabled?: boolean;
}

/** Configuration directory path. */
const CONFIG_DIR = join(homedir(), '.idp');

/** Configuration file path. */
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/** Credentials file path (separate for security). */
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

/** All profiles stored in config. */
interface ConfigStore {
  profiles: Record<string, CliConfig>;
  activeProfile: string;
}

/**
 * Ensure the configuration directory exists.
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Read the configuration store from disk.
 */
function readConfigStore(): ConfigStore {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Corrupted config file, start fresh
  }

  return { profiles: { default: {} }, activeProfile: 'default' };
}

/**
 * Write the configuration store to disk.
 */
function writeConfigStore(store: ConfigStore): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
}

/**
 * Read credentials from the separate credentials file.
 */
function readCredentials(): Record<string, { token?: string; refreshToken?: string }> {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      const content = readFileSync(CREDENTIALS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Corrupted credentials file
  }
  return {};
}

/**
 * Write credentials to the separate credentials file.
 */
function writeCredentials(credentials: Record<string, { token?: string; refreshToken?: string }>): void {
  ensureConfigDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), { mode: 0o600 });
}

/**
 * Get the CLI configuration for a profile.
 * Merges file config with environment variable overrides.
 */
export function getCliConfig(profile = 'default'): CliConfig {
  const store = readConfigStore();
  const fileConfig = store.profiles[profile] || {};
  const credentials = readCredentials();
  const profileCreds = credentials[profile] || {};

  // Environment variable overrides
  const envOverrides: Partial<CliConfig> = {};
  if (process.env.IDP_API_URL) envOverrides.apiUrl = process.env.IDP_API_URL;
  if (process.env.IDP_TOKEN) envOverrides.token = process.env.IDP_TOKEN;
  if (process.env.IDP_TIMEOUT) envOverrides.timeout = parseInt(process.env.IDP_TIMEOUT, 10);
  if (process.env.IDP_DEFAULT_ENV) envOverrides.defaultEnvironment = process.env.IDP_DEFAULT_ENV;
  if (process.env.IDP_OUTPUT_FORMAT) envOverrides.outputFormat = process.env.IDP_OUTPUT_FORMAT as CliConfig['outputFormat'];

  return {
    ...fileConfig,
    token: envOverrides.token || profileCreds.token || fileConfig.token,
    refreshToken: profileCreds.refreshToken || fileConfig.refreshToken,
    ...envOverrides,
  };
}

/**
 * Save CLI configuration for a profile.
 * Credentials (token, refreshToken) are stored separately.
 */
export function saveCliConfig(profile: string, updates: Partial<CliConfig>): void {
  const store = readConfigStore();

  if (!store.profiles[profile]) {
    store.profiles[profile] = {};
  }

  // Separate credentials from config
  const { token, refreshToken, ...configUpdates } = updates;

  // Update config (non-credential fields)
  Object.assign(store.profiles[profile], configUpdates);

  // Remove undefined values
  for (const [key, value] of Object.entries(store.profiles[profile])) {
    if (value === undefined) {
      delete (store.profiles[profile] as Record<string, unknown>)[key];
    }
  }

  writeConfigStore(store);

  // Update credentials separately
  if (token !== undefined || refreshToken !== undefined) {
    const credentials = readCredentials();
    if (!credentials[profile]) {
      credentials[profile] = {};
    }
    if (token !== undefined) credentials[profile].token = token || undefined;
    if (refreshToken !== undefined) credentials[profile].refreshToken = refreshToken || undefined;
    writeCredentials(credentials);
  }
}

/**
 * Get the active profile name.
 */
export function getActiveProfile(): string {
  const store = readConfigStore();
  return store.activeProfile;
}

/**
 * Set the active profile.
 */
export function setActiveProfile(profile: string): void {
  const store = readConfigStore();
  if (!store.profiles[profile]) {
    store.profiles[profile] = {};
  }
  store.activeProfile = profile;
  writeConfigStore(store);
}

/**
 * List all configured profiles.
 */
export function listProfiles(): string[] {
  const store = readConfigStore();
  return Object.keys(store.profiles);
}

/**
 * Delete a profile.
 */
export function deleteProfile(profile: string): boolean {
  if (profile === 'default') return false;

  const store = readConfigStore();
  if (!store.profiles[profile]) return false;

  delete store.profiles[profile];
  if (store.activeProfile === profile) {
    store.activeProfile = 'default';
  }
  writeConfigStore(store);

  // Remove credentials
  const credentials = readCredentials();
  delete credentials[profile];
  writeCredentials(credentials);

  return true;
}

/**
 * Get the configuration directory path.
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Reset all configuration (for testing or troubleshooting).
 */
export function resetConfig(): void {
  writeConfigStore({ profiles: { default: {} }, activeProfile: 'default' });
  writeCredentials({});
}
