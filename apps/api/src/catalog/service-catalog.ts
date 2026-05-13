/**
 * Service Catalog - Registration and Persistence.
 *
 * Implements entity registration with:
 * - Input validation via Zod schemas
 * - Duplicate name detection within namespace (unique constraint enforcement)
 * - Audit metadata recording (user, timestamp, source repository)
 * - Version counter initialization (starts at 1)
 *
 * Requirements: 1.1, 1.3, 1.5, 1.6
 */

import { randomUUID } from 'crypto';
import type { CatalogEntity, CatalogEntityInput, APIErrorResponse } from '@idp/shared';
import { ERROR_CODES } from '@idp/shared';
import { validateCatalogEntityInput } from './validation';
import type { CatalogStore } from './catalog-store';
import { DuplicateEntityError } from './catalog-store';

/**
 * Actor information for audit metadata.
 */
export interface Actor {
  /** User identity (user ID or service name). */
  id: string;
}

/**
 * Result type for catalog registration.
 * Either returns the persisted entity or a structured error response.
 */
export type RegisterResult =
  | { success: true; entity: CatalogEntity }
  | { success: false; error: APIErrorResponse };

/**
 * ServiceCatalog handles entity registration and persistence.
 */
export class ServiceCatalog {
  constructor(private readonly store: CatalogStore) {}

  /**
   * Register a new catalog entity.
   *
   * This method:
   * 1. Validates the input against the CatalogEntityInput schema
   * 2. Checks for duplicate name within the namespace
   * 3. Persists the entity with audit metadata (user, timestamp, source repo)
   * 4. Initializes the version counter to 1
   *
   * @param input - The raw entity input to register
   * @param actor - The user performing the registration
   * @returns RegisterResult with either the persisted entity or a structured error
   */
  async register(input: unknown, actor: Actor): Promise<RegisterResult> {
    // Step 1: Validate input
    const validationResult = validateCatalogEntityInput(input);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error };
    }

    const validatedInput: CatalogEntityInput = validationResult.data;

    // Step 2: Check for duplicate name within namespace
    const duplicateExists = await this.store.existsByNameAndNamespace(
      validatedInput.name,
      validatedInput.namespace,
    );

    if (duplicateExists) {
      const conflictError: APIErrorResponse = {
        error: `Entity with name '${validatedInput.name}' already exists in namespace '${validatedInput.namespace}'`,
        code: ERROR_CODES.ENTITY_NAME_CONFLICT,
        details: [
          {
            field: 'name',
            message: `An entity with name '${validatedInput.name}' already exists in namespace '${validatedInput.namespace}'`,
            constraint: 'unique_name_per_namespace',
          },
        ],
      };
      return { success: false, error: conflictError };
    }

    // Step 3: Build the full entity with system-generated fields
    const now = new Date();
    const entity: CatalogEntity = {
      id: randomUUID(),
      name: validatedInput.name,
      namespace: validatedInput.namespace,
      owner: validatedInput.owner,
      description: validatedInput.description,
      lifecycleStage: validatedInput.lifecycleStage,
      repositoryUrl: validatedInput.repositoryUrl,
      tags: validatedInput.tags,
      version: 1, // Version counter initialized to 1 on registration
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id, // Audit metadata: registering user
      sourceRepository: validatedInput.sourceRepository, // Audit metadata: source repo
    };

    // Step 4: Persist the entity
    try {
      await this.store.insert(entity);
    } catch (error) {
      // Handle race condition: duplicate detected at DB level
      if (error instanceof DuplicateEntityError) {
        const conflictError: APIErrorResponse = {
          error: `Entity with name '${validatedInput.name}' already exists in namespace '${validatedInput.namespace}'`,
          code: ERROR_CODES.ENTITY_NAME_CONFLICT,
          details: [
            {
              field: 'name',
              message: `An entity with name '${validatedInput.name}' already exists in namespace '${validatedInput.namespace}'`,
              constraint: 'unique_name_per_namespace',
            },
          ],
        };
        return { success: false, error: conflictError };
      }
      throw error; // Re-throw unexpected errors
    }

    return { success: true, entity };
  }
}
