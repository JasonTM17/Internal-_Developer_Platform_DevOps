/**
 * OAuth2/OIDC Authentication Middleware
 *
 * Validates JWT tokens from an OIDC provider using JWKS endpoint verification.
 * Implements session expiry detection, token validation, and provider availability checks.
 *
 * Requirements: 9.1, 9.5, 9.6
 */

import type { AuthenticatedUser, APIErrorResponse, RoleAssignment } from '@idp/shared';
import { ERROR_CODES } from '@idp/shared';
import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from 'jose';

/**
 * Configuration for the authentication middleware.
 */
export interface AuthMiddlewareConfig {
  /** OIDC provider's JWKS endpoint URL. */
  jwksUri: string;
  /** Expected JWT issuer (iss claim). */
  issuer: string;
  /** Expected JWT audience (aud claim). */
  audience: string;
  /** Session inactivity timeout in minutes. Defaults to 60. */
  sessionTimeoutMinutes?: number;
  /** Custom JWKS fetcher (for testing/DI). */
  jwksClient?: ReturnType<typeof createRemoteJWKSet>;
}

/**
 * Extended Express Request with authenticated user attached.
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * JWT payload claims expected from the OIDC provider.
 */
interface OIDCTokenPayload {
  sub: string;
  email: string;
  teams?: string[];
  roles?: Array<{ role: string; team: string; assignedBy: string; assignedAt: string }>;
  iat?: number;
  exp?: number;
  last_activity?: number;
}

/**
 * Creates an authentication middleware instance with the given configuration.
 *
 * The middleware:
 * 1. Extracts Bearer token from Authorization header
 * 2. Validates JWT signature against OIDC provider's JWKS endpoint
 * 3. Checks token expiry and session inactivity (60 min default)
 * 4. Returns 401 with APIErrorResponse for expired/invalid tokens
 * 5. Returns 503 with APIErrorResponse when OIDC provider is unreachable
 * 6. Attaches AuthenticatedUser to request on success
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig) {
  const { jwksUri, issuer, audience, sessionTimeoutMinutes = 60 } = config;

  // Create JWKS client for verifying token signatures
  const jwks = config.jwksClient ?? createRemoteJWKSet(new URL(jwksUri));

  return async function authMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // Step 1: Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      const errorResponse: APIErrorResponse = {
        error: 'Authentication required. Please provide a valid Bearer token.',
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        details: [
          {
            field: 'Authorization',
            message: 'Missing Authorization header',
          },
        ],
      };
      res.status(401).json(errorResponse);
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      const errorResponse: APIErrorResponse = {
        error: 'Invalid authorization format. Expected Bearer token.',
        code: ERROR_CODES.TOKEN_INVALID,
        details: [
          {
            field: 'Authorization',
            message: 'Authorization header must use Bearer scheme',
          },
        ],
      };
      res.status(401).json(errorResponse);
      return;
    }

    const token = authHeader.slice(7);

    if (!token) {
      const errorResponse: APIErrorResponse = {
        error: 'Authentication required. Please provide a valid Bearer token.',
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        details: [
          {
            field: 'Authorization',
            message: 'Bearer token is empty',
          },
        ],
      };
      res.status(401).json(errorResponse);
      return;
    }

    // Step 2 & 3: Validate JWT signature and claims
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience,
      });

      const tokenPayload = payload as unknown as OIDCTokenPayload;

      // Step 3: Check session inactivity timeout
      const now = Math.floor(Date.now() / 1000);
      const lastActivity = tokenPayload.last_activity ?? tokenPayload.iat ?? 0;
      const inactivityThreshold = sessionTimeoutMinutes * 60;

      if (now - lastActivity > inactivityThreshold) {
        const errorResponse: APIErrorResponse = {
          error: 'Session expired due to inactivity. Please re-authenticate.',
          code: ERROR_CODES.TOKEN_EXPIRED,
          details: [
            {
              message: `Session inactive for more than ${sessionTimeoutMinutes} minutes`,
              constraint: `Maximum inactivity: ${sessionTimeoutMinutes} minutes`,
            },
          ],
        };
        res.status(401).json(errorResponse);
        return;
      }

      // Step 6: Build AuthenticatedUser and attach to request
      const roles: RoleAssignment[] = (tokenPayload.roles ?? []).map((r) => ({
        userId: tokenPayload.sub,
        role: r.role as RoleAssignment['role'],
        team: r.team,
        assignedBy: r.assignedBy,
        assignedAt: new Date(r.assignedAt),
      }));

      const sessionExpiry = new Date((lastActivity + inactivityThreshold) * 1000);

      const user: AuthenticatedUser = {
        id: tokenPayload.sub,
        email: tokenPayload.email,
        teams: tokenPayload.teams ?? [],
        roles,
        sessionExpiry,
      };

      req.user = user;
      next();
    } catch (error: unknown) {
      // Step 5: Return 503 when OIDC provider is unreachable
      if (isProviderUnavailableError(error)) {
        const errorResponse: APIErrorResponse = {
          error: 'Authentication service temporarily unavailable. Please try again later.',
          code: ERROR_CODES.OIDC_PROVIDER_UNAVAILABLE,
          details: [
            {
              message: 'Unable to reach OIDC provider for token verification',
            },
          ],
        };
        res.status(503).json(errorResponse);
        return;
      }

      // Step 4: Return 401 for expired/invalid tokens
      if (error instanceof joseErrors.JWTExpired) {
        const errorResponse: APIErrorResponse = {
          error: 'Token has expired. Please re-authenticate.',
          code: ERROR_CODES.TOKEN_EXPIRED,
          details: [
            {
              message: 'JWT token has expired',
            },
          ],
        };
        res.status(401).json(errorResponse);
        return;
      }

      if (error instanceof joseErrors.JWTClaimValidationFailed) {
        const errorResponse: APIErrorResponse = {
          error: 'Token validation failed. Please re-authenticate.',
          code: ERROR_CODES.TOKEN_INVALID,
          details: [
            {
              message: `Claim validation failed: ${error.claim}`,
              constraint: error.reason,
            },
          ],
        };
        res.status(401).json(errorResponse);
        return;
      }

      // Any other jose error (invalid signature, malformed token, etc.)
      const errorResponse: APIErrorResponse = {
        error: 'Invalid token. Please re-authenticate.',
        code: ERROR_CODES.TOKEN_INVALID,
        details: [
          {
            message: error instanceof Error ? error.message : 'Token verification failed',
          },
        ],
      };
      res.status(401).json(errorResponse);
      return;
    }
  };
}

/**
 * Determines if an error indicates the OIDC provider is unreachable.
 * Network errors, DNS failures, timeouts, and fetch failures all indicate
 * provider unavailability.
 */
function isProviderUnavailableError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // fetch() throws TypeError for network failures
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const networkIndicators = [
      'fetch',
      'network',
      'econnrefused',
      'enotfound',
      'etimedout',
      'econnreset',
      'socket',
      'dns',
      'unreachable',
      'connect',
    ];
    return networkIndicators.some((indicator) => message.includes(indicator));
  }

  return false;
}

/**
 * Default auth middleware instance (requires configuration via createAuthMiddleware).
 * This is a convenience re-export for use when config is provided at module level.
 */
export const authMiddleware = createAuthMiddleware;
