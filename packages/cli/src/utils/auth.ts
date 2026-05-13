/**
 * CLI Authentication
 *
 * Handles authentication for the CLI:
 * - Token-based authentication (API keys)
 * - OAuth2 device flow for interactive login
 * - Token storage in system keychain or config file
 * - Token refresh and expiration handling
 * - Multiple profile support
 */

import { randomUUID } from 'crypto';
import { getCliConfig, saveCliConfig } from './config.js';

/** Authentication method. */
export type AuthMethod = 'token' | 'oauth2' | 'api-key';

/** Authentication state. */
export interface AuthState {
  method: AuthMethod;
  token: string;
  refreshToken?: string;
  expiresAt?: Date;
  userId?: string;
  email?: string;
  profile: string;
}

/** OAuth2 device code response. */
export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

/** OAuth2 token response. */
export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

/** Authentication configuration. */
export interface AuthConfig {
  /** OAuth2 issuer URL */
  issuerUrl: string;
  /** OAuth2 client ID */
  clientId: string;
  /** OAuth2 scopes */
  scopes: string[];
  /** Token storage method */
  storageMethod: 'config' | 'keychain';
}

const DEFAULT_AUTH_CONFIG: AuthConfig = {
  issuerUrl: 'https://auth.idp.internal',
  clientId: 'idp-cli',
  scopes: ['openid', 'profile', 'email', 'platform:read', 'platform:write'],
  storageMethod: 'config',
};

/**
 * Check if the current authentication is valid.
 */
export function isAuthenticated(profile = 'default'): boolean {
  const config = getCliConfig(profile);
  if (!config.token) return false;

  // Check expiration
  if (config.tokenExpiresAt) {
    const expiresAt = new Date(config.tokenExpiresAt);
    if (expiresAt <= new Date()) return false;
  }

  return true;
}

/**
 * Get the current authentication token.
 * Returns null if not authenticated or token is expired.
 */
export function getToken(profile = 'default'): string | null {
  if (!isAuthenticated(profile)) return null;
  const config = getCliConfig(profile);
  return config.token || null;
}

/**
 * Login with an API key (non-interactive).
 */
export function loginWithApiKey(apiKey: string, profile = 'default'): void {
  saveCliConfig(profile, {
    token: apiKey,
    authMethod: 'api-key',
    tokenExpiresAt: undefined, // API keys don't expire (managed server-side)
  });
}

/**
 * Login with a pre-existing token (e.g., from CI/CD).
 */
export function loginWithToken(token: string, expiresIn?: number, profile = 'default'): void {
  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : undefined;

  saveCliConfig(profile, {
    token,
    authMethod: 'token',
    tokenExpiresAt: expiresAt,
  });
}

/**
 * Initiate OAuth2 device authorization flow.
 * Returns the device code for the user to authorize.
 */
export async function initiateDeviceFlow(
  authConfig: AuthConfig = DEFAULT_AUTH_CONFIG,
): Promise<DeviceCodeResponse> {
  const deviceAuthUrl = `${authConfig.issuerUrl}/oauth/device/code`;

  const response = await fetch(deviceAuthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: authConfig.clientId,
      scope: authConfig.scopes.join(' '),
    }),
  });

  if (!response.ok) {
    throw new Error(`Device authorization failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    verificationUriComplete: data.verification_uri_complete,
    expiresIn: data.expires_in,
    interval: data.interval || 5,
  };
}

/**
 * Poll for token after device authorization.
 */
export async function pollForToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
  authConfig: AuthConfig = DEFAULT_AUTH_CONFIG,
): Promise<TokenResponse> {
  const tokenUrl = `${authConfig.issuerUrl}/oauth/token`;
  const deadline = Date.now() + expiresIn * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: authConfig.clientId,
        device_code: deviceCode,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        scope: data.scope,
      };
    }

    const error = await response.json();
    if (error.error === 'authorization_pending') {
      continue; // User hasn't authorized yet
    }
    if (error.error === 'slow_down') {
      interval += 5; // Increase polling interval
      continue;
    }

    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  throw new Error('Device authorization timed out');
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(
  refreshToken: string,
  authConfig: AuthConfig = DEFAULT_AUTH_CONFIG,
): Promise<TokenResponse> {
  const tokenUrl = `${authConfig.issuerUrl}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: authConfig.clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed. Please login again.');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

/**
 * Logout - clear stored credentials.
 */
export function logout(profile = 'default'): void {
  saveCliConfig(profile, {
    token: undefined,
    refreshToken: undefined,
    authMethod: undefined,
    tokenExpiresAt: undefined,
    userId: undefined,
    email: undefined,
  });
}

/**
 * Get authentication status information.
 */
export function getAuthStatus(profile = 'default'): {
  authenticated: boolean;
  method?: AuthMethod;
  email?: string;
  expiresAt?: string;
} {
  const config = getCliConfig(profile);

  if (!isAuthenticated(profile)) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    method: config.authMethod as AuthMethod,
    email: config.email,
    expiresAt: config.tokenExpiresAt,
  };
}
