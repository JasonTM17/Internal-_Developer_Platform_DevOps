/**
 * @idp/config - Shared configuration schemas and defaults
 *
 * This package contains:
 * - Zod validation schemas for all shared types (CatalogEntity, Deployment, Environment, Config)
 * - Environment type resource quota mappings
 * - Role permission matrix constants
 * - Validation constraints (field lengths, allowed values, URL patterns)
 * - Shared ESLint, Prettier, and TypeScript configurations
 */

export * from './schemas';
export * from './constants';
