/**
 * Authentication middleware module.
 *
 * Provides OAuth2/OIDC authentication middleware that validates JWT tokens
 * from an OIDC provider using JWKS endpoint verification.
 */

export { authMiddleware } from './middleware';
export { createAuthMiddleware } from './middleware';
export type { AuthMiddlewareConfig } from './middleware';
