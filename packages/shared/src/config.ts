/**
 * Configuration management interfaces and types.
 *
 * Defines the configuration entry model, schema validation,
 * and field-level schema definitions for service configuration.
 */

/**
 * Allowed types for configuration field values.
 */
export type ConfigFieldType = 'string' | 'number' | 'boolean' | 'url' | 'email';

/**
 * A single configuration entry for a service in an environment.
 */
export interface ConfigEntry {
  /** Configuration key name. */
  key: string;
  /** Configuration value (encrypted if secret). */
  value: string;
  /** Whether this entry is a secret (encrypted at rest, restricted access). */
  isSecret: boolean;
  /** ID of the service this config belongs to. */
  serviceId: string;
  /** ID of the environment this config belongs to. */
  environmentId: string;
  /** Version counter, incremented on each update. */
  version: number;
  /** Identity of the user who last updated this entry. */
  updatedBy: string;
  /** Timestamp of the last update. */
  updatedAt: Date;
}

/**
 * Schema definition for a single configuration field.
 */
export interface ConfigFieldSchema {
  /** Expected value type. */
  type: ConfigFieldType;
  /** Whether this field is required. */
  required: boolean;
  /** Regex pattern for string validation. */
  pattern?: string;
  /** Minimum value (for numbers) or minimum length (for strings). */
  min?: number;
  /** Maximum value (for numbers) or maximum length (for strings). */
  max?: number;
  /** Human-readable description of the field. */
  description?: string;
}

/**
 * Configuration schema for a service, defining expected fields and constraints.
 */
export interface ConfigSchema {
  /** ID of the service this schema belongs to. */
  serviceId: string;
  /** Map of field names to their schema definitions. */
  schema: Record<string, ConfigFieldSchema>;
}
