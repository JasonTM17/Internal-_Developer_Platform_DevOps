# ADR-002: TypeScript Strict Mode

## Status

Accepted

## Date

2026-01-15

## Context

We need to establish TypeScript configuration standards across the monorepo. The platform handles sensitive operations (deployments, infrastructure provisioning, RBAC) where type safety directly impacts reliability.

## Decision

We will enforce **TypeScript strict mode** across all packages with additional strict checks enabled.

## Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true
  }
}
```

## Rationale

- **`strict: true`** enables: strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, noImplicitAny, noImplicitThis, alwaysStrict
- **`noUncheckedIndexedAccess`** prevents undefined access on arrays/objects - critical for API response handling
- **`exactOptionalPropertyTypes`** distinguishes between `undefined` and missing properties
- **Platform criticality**: Type errors in RBAC or deployment logic could have severe consequences

## Consequences

### Positive

- Catches null/undefined errors at compile time (estimated 30% fewer runtime errors)
- Self-documenting code through explicit types
- Better IDE support (autocomplete, refactoring)
- Safer refactoring across the monorepo

### Negative

- Higher initial development friction (more explicit typing required)
- Some third-party libraries require `@types/*` packages or type assertions
- Slightly longer compilation times

## Enforcement

- `tsconfig.json` in repo root with strict settings (inherited by all packages)
- CI pipeline runs `tsc --noEmit` on every PR
- ESLint `@typescript-eslint/strict` ruleset enabled
- No `// @ts-ignore` without accompanying explanation comment
