/**
 * CatalogEntity validation logic.
 *
 * Validates CatalogEntityInput fields using Zod schemas from @idp/config
 * and returns structured validation errors in APIErrorResponse format.
 *
 * Validates: Requirements 1.4, 2.1, 2.2, 2.3
 */
import { CatalogEntityInputSchema } from '@idp/config';
import type { CatalogEntityInput, APIErrorResponse, APIErrorDetail } from '@idp/shared';
import { ERROR_CODES } from '@idp/shared';
import { z } from 'zod';

/**
 * Result type for catalog entity validation.
 * Either returns the validated input or a structured error response.
 */
export type ValidationResult =
  | { success: true; data: CatalogEntityInput }
  | { success: false; error: APIErrorResponse };

/**
 * Extended input schema that includes sourceRepository field
 * which is part of CatalogEntityInput but not in the base config schema.
 */
const CatalogEntityInputValidationSchema = CatalogEntityInputSchema.extend({
  sourceRepository: z.string().url(),
});

/**
 * Validates a CatalogEntityInput and returns either the validated data
 * or a structured error response listing each failing field with reason.
 *
 * @param input - The raw input to validate
 * @returns ValidationResult with either validated data or structured errors
 */
export function validateCatalogEntityInput(input: unknown): ValidationResult {
  const result = CatalogEntityInputValidationSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data as CatalogEntityInput };
  }

  const details: APIErrorDetail[] = result.error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : undefined,
    message: formatZodMessage(issue),
    constraint: getConstraintDescription(issue),
  }));

  // Limit details to 50 entries per API contract
  const limitedDetails = details.slice(0, 50);

  const errorResponse: APIErrorResponse = {
    error: 'Catalog entity validation failed',
    code: ERROR_CODES.VALIDATION_ERROR,
    details: limitedDetails,
  };

  return { success: false, error: errorResponse };
}

/**
 * Formats a Zod issue into a human-readable message.
 */
function formatZodMessage(issue: z.ZodIssue): string {
  switch (issue.code) {
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return issue.minimum === 1
          ? 'Must not be empty'
          : `Must be at least ${issue.minimum} characters`;
      }
      if (issue.type === 'array') {
        return `Must contain at least ${issue.minimum} items`;
      }
      return issue.message;

    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return `Must be at most ${issue.maximum} characters`;
      }
      if (issue.type === 'array') {
        return `Must contain at most ${issue.maximum} items`;
      }
      return issue.message;

    case z.ZodIssueCode.invalid_enum_value:
      return `Must be one of: ${issue.options.join(', ')}`;

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'url') {
        return 'Must be a valid URL';
      }
      return issue.message;

    case z.ZodIssueCode.invalid_type:
      return `Expected ${issue.expected}, received ${issue.received}`;

    default:
      return issue.message;
  }
}

/**
 * Returns a constraint description for a Zod issue.
 */
function getConstraintDescription(issue: z.ZodIssue): string | undefined {
  switch (issue.code) {
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return `min_length:${issue.minimum}`;
      }
      if (issue.type === 'array') {
        return `min_count:${issue.minimum}`;
      }
      return undefined;

    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return `max_length:${issue.maximum}`;
      }
      if (issue.type === 'array') {
        return `max_count:${issue.maximum}`;
      }
      return undefined;

    case z.ZodIssueCode.invalid_enum_value:
      return `enum:${issue.options.join(',')}`;

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'url') {
        return 'format:url';
      }
      return undefined;

    default:
      return undefined;
  }
}
