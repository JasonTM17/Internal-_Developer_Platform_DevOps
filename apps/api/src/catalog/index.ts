/**
 * Service Catalog module.
 *
 * Exports validation logic, catalog operations, and persistence interfaces.
 */
export { validateCatalogEntityInput } from './validation';
export type { ValidationResult } from './validation';

export { ServiceCatalog } from './service-catalog';
export type { Actor, RegisterResult } from './service-catalog';

export { DuplicateEntityError } from './catalog-store';
export type { CatalogStore, CatalogEntityRow } from './catalog-store';

export { InMemoryCatalogStore } from './in-memory-catalog-store';
