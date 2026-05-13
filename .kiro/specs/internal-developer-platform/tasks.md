# Implementation Plan: Internal Developer Platform

## Overview

This implementation plan breaks down the Internal Developer Platform into incremental coding tasks. The platform is a monorepo (pnpm + Turborepo) with a Backstage-based portal frontend, a Node.js/TypeScript API server, shared packages, Terraform infrastructure modules, Kubernetes manifests, and CI/CD pipelines. Each task builds on previous steps, culminating in a fully wired, tested system.

## Tasks

- [x] 1. Set up monorepo structure and shared packages
  - [x] 1.1 Initialize monorepo with pnpm workspaces and Turborepo
    - Create root `package.json`, `pnpm-workspace.yaml`, and `turbo.json`
    - Create directory structure: `apps/portal`, `apps/api`, `packages/shared`, `packages/config`, `packages/ui`, `infra/terraform`, `infra/kubernetes`, `infra/argocd`, `docs`, `scripts`
    - Configure TypeScript strict mode with `tsconfig.json` at root and per workspace
    - Set up ESLint and Prettier with shared configs
    - Configure pre-commit hooks (husky + lint-staged) to block on lint/format violations
    - _Requirements: 12.1, 12.2, 12.5, 12.8_

  - [x] 1.2 Create shared TypeScript interfaces and types package
    - Define `CatalogEntity`, `CatalogEntityInput`, `CatalogEntityVersion`, `DependencyEdge` interfaces
    - Define `Deployment`, `DeploymentAction`, `DeploymentStatus`, `DeploymentPhase`, `DeploymentError` interfaces
    - Define `Environment`, `EnvironmentRequest`, `ResourceQuota`, `EnvironmentLabels` interfaces
    - Define `ConfigEntry`, `ConfigSchema`, `ConfigFieldSchema` interfaces
    - Define `AuditLogEntry`, `AuditEntry`, `AuditQueryFilters` interfaces
    - Define `RoleAssignment`, `Permission`, `AuthenticatedUser`, `AuthzResult` interfaces
    - Define `APIErrorResponse` interface and error code constants
    - Define `ManifestSet`, `KubernetesManifest`, `SyncStatus`, `HealthStatus` interfaces
    - _Requirements: 2.1, 15.4_

  - [x] 1.3 Create shared configuration schemas package
    - Define Zod schemas for all shared types (CatalogEntity, Deployment, Environment, Config)
    - Define environment type resource quota mappings
    - Define role permission matrix constants
    - Define validation constraints (field lengths, allowed values, URL patterns)
    - _Requirements: 2.1, 2.2, 6.5, 9.2, 15.1_

- [x] 2. Implement Service Catalog core
  - [x] 2.1 Implement CatalogEntity validation logic
    - Create validation functions using Zod schemas for all entity fields
    - Validate name (1-128 chars), owner (1-128 chars), description (1-1024 chars)
    - Validate lifecycle stage enum (experimental, development, production, deprecated)
    - Validate repository URL format, tags (0-20 tags, each 1-64 chars)
    - Return structured validation errors listing each failing field with reason
    - _Requirements: 1.4, 2.1, 2.2, 2.3_

  - [ ]\* 2.2 Write property test for CatalogEntity validation rejects invalid inputs
    - **Property 4: CatalogEntity Validation Rejects Invalid Inputs Without Persistence**
    - **Validates: Requirements 1.4, 2.1, 2.2, 2.3**

  - [x] 2.3 Implement Service Catalog registration and persistence
    - Create PostgreSQL schema for catalog entities with unique constraint on (name, namespace)
    - Implement `register()` method that persists entity with audit metadata (user, timestamp, source repo)
    - Implement duplicate name detection within namespace returning conflict error
    - Implement version counter initialization on registration
    - _Requirements: 1.1, 1.3, 1.5, 1.6_

  - [ ]\* 2.4 Write property tests for entity registration and uniqueness
    - **Property 5: Unique Name Constraint Enforcement**
    - **Validates: Requirements 1.3, 1.6**
    - **Property 6: Valid Entity Registration Persists With Audit Metadata**
    - **Validates: Requirements 1.1, 1.5**

  - [x] 2.5 Implement Service Catalog search
    - Implement case-insensitive substring search across name, owner, and tags
    - Limit results to 50 entries maximum
    - Ensure search responds within 1 second (use in-memory caching layer)
    - _Requirements: 1.2_

  - [ ]\* 2.6 Write property test for catalog search correctness
    - **Property 7: Catalog Search Returns Only Matching Results**
    - **Validates: Requirements 1.2**

  - [x] 2.7 Implement entity update with version history
    - Implement `update()` method that increments version counter
    - Preserve previous version in history table (retain at least 50 most recent versions)
    - Record actor and timestamp for each version change
    - _Requirements: 2.4_

  - [ ]\* 2.8 Write property test for version history preservation
    - **Property 8: Version History Preservation on Update**
    - **Validates: Requirements 2.4**

  - [x] 2.9 Implement dependency graph management
    - Implement `addDependency()` with referential integrity check (target must exist)
    - Store directed edges with source, target, and dependency type
    - Return error identifying unknown target entity if target doesn't exist
    - Implement `getDependencies()` and `removeDependency()`
    - _Requirements: 2.5, 2.6_

  - [ ]\* 2.10 Write property test for dependency edge referential integrity
    - **Property 9: Dependency Edge Referential Integrity**
    - **Validates: Requirements 2.5, 2.6**

  - [ ]\* 2.11 Write property test for CatalogEntity serialization round-trip
    - **Property 1: CatalogEntity Serialization Round-Trip**
    - **Validates: Requirements 2.7**

- [x] 3. Checkpoint - Ensure all Service Catalog tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement RBAC System
  - [x] 4.1 Implement OAuth2/OIDC authentication middleware
    - Create authentication middleware that validates JWT tokens from OIDC provider
    - Implement session expiry detection (default 60 minutes of inactivity)
    - Return 401 for expired/invalid tokens with re-authentication message
    - Return 503 when OIDC provider is unreachable without granting access
    - _Requirements: 9.1, 9.5, 9.6_

  - [ ]\* 4.2 Write property test for expired/invalid token rejection
    - **Property 12: Expired or Invalid Token Rejection**
    - **Validates: Requirements 9.5**

  - [x] 4.3 Implement role-based permission evaluation engine
    - Define three base roles: viewer (read-only), developer (read + deploy non-prod + provision + config), admin (all)
    - Implement team-scoped permission resolution (permissions apply only to team-owned resources)
    - Support multiple team memberships with independent per-team evaluation
    - Ensure permission evaluation completes within 500ms
    - Return 403 with denial reason for unauthorized requests
    - _Requirements: 9.2, 9.3, 9.4_

  - [ ]\* 4.4 Write property test for RBAC permission evaluation correctness
    - **Property 11: RBAC Permission Evaluation Correctness**
    - **Validates: Requirements 3.5, 3.6, 9.2, 9.3, 9.4**

- [x] 5. Implement Audit Logger
  - [x] 5.1 Implement append-only audit log with hash chain integrity
    - Create PostgreSQL schema for audit log entries with integrity hash column
    - Implement SHA-256 hash chain (each entry incorporates previous entry's hash)
    - Record: actor, action, resource, UTC timestamp (ms precision), outcome, reason
    - Implement fail-closed behavior: block triggering action if audit write fails
    - _Requirements: 10.1, 10.2, 10.5_

  - [ ]\* 5.2 Write property tests for audit log integrity
    - **Property 21: Audit Log Entry Completeness**
    - **Validates: Requirements 10.1**
    - **Property 22: Audit Log Hash Chain Integrity**
    - **Validates: Requirements 10.2**
    - **Property 24: Audit Fail-Closed Behavior**
    - **Validates: Requirements 10.5**

  - [x] 5.3 Implement audit log query with filtering and pagination
    - Support filters: actor, action, time range
    - Return results within 2 seconds for most recent 90 days
    - Limit to 1000 entries per response with pagination support
    - Enforce 1-year minimum retention policy
    - _Requirements: 10.3, 10.4_

  - [ ]\* 5.4 Write property test for audit log query filtering
    - **Property 23: Audit Log Query Filtering Correctness**
    - **Validates: Requirements 10.3**

- [x] 6. Checkpoint - Ensure RBAC and Audit tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Deployment Engine
  - [x] 7.1 Implement deployment request validation and creation
    - Validate service exists, environment exists, version matches known artifact
    - Prevent concurrent deployments for same service+environment pair
    - Check RBAC permissions (deploy permission for target environment)
    - Create deployment record with status "pending" within 1 second
    - Return appropriate errors for missing resources, active deployments, insufficient permissions
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]\* 7.2 Write property test for deployment validation and concurrency
    - **Property 10: Deployment Action Validation and Concurrent Prevention**
    - **Validates: Requirements 3.1, 3.3, 3.4, 13.6**

  - [x] 7.3 Implement deployment lifecycle state machine
    - Implement phase transitions: pending → validating → generating_manifests → committing → syncing → health_checking → success/failed
    - Track progress percentage (0-100) per phase
    - Report status updates at intervals of no more than 5 seconds
    - Record error details on failure (phase, message, triggering inputs)
    - _Requirements: 3.2_

  - [x] 7.4 Implement deployment history and rollback
    - Return last 50 deployments in reverse chronological order with all required fields
    - Implement rollback: target most recent "success" deployment prior to current version
    - Reject rollback if no previous successful deployment exists
    - Reject rollback if deployment already in progress for same service+environment
    - Update service's current version reference on successful rollback
    - Send notification to service owner and platform team on rollback failure within 60 seconds
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [ ]\* 7.5 Write property tests for deployment history and rollback
    - **Property 26: Deployment History Ordering and Limit**
    - **Validates: Requirements 13.1**
    - **Property 27: Rollback Target Selection**
    - **Validates: Requirements 13.2, 13.3**
    - **Property 28: Rollback Version Reference Update**
    - **Validates: Requirements 13.5**

- [x] 8. Implement Manifest Generator
  - [x] 8.1 Implement Kubernetes manifest template engine
    - Create Handlebars/EJS templates for Deployment, Service, and ConfigMap manifests
    - Template using service metadata, environment config, and requested version
    - Include container image reference tagged with requested version
    - Place manifests under path scoped by environment and service name
    - _Requirements: 4.1, 4.2_

  - [ ]\* 8.2 Write property tests for manifest template correctness
    - **Property 13: Manifest Template Correctness**
    - **Validates: Requirements 4.2**
    - **Property 15: Generated Manifests Pass Kubernetes Schema Validation**
    - **Validates: Requirements 4.7**

  - [x] 8.3 Implement manifest validation and YAML round-trip
    - Validate generated manifests against Kubernetes API version schemas
    - Implement YAML parse → serialize → parse round-trip verification
    - Report template errors with template name and triggering input values on failure
    - _Requirements: 4.4, 4.6, 4.7_

  - [ ]\* 8.4 Write property test for manifest YAML round-trip
    - **Property 2: Manifest YAML Round-Trip**
    - **Validates: Requirements 4.6**

  - [x] 8.5 Implement Git commit and push with retry logic
    - Use conventional commit format: "deploy(service-name): version to environment"
    - Implement retry up to 3 times with exponential backoff (1s, 2s, 4s)
    - Mark deployment as failed if all retries exhausted (repository unreachable)
    - _Requirements: 4.3, 4.5_

  - [ ]\* 8.6 Write property test for commit message and path format
    - **Property 14: Manifest Commit Message and Path Format**
    - **Validates: Requirements 4.3**

- [x] 9. Checkpoint - Ensure Deployment and Manifest tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Environment Manager
  - [x] 10.1 Implement environment provisioning
    - Provision Kubernetes namespace with resource quotas, network policies, and RBAC bindings within 60 seconds
    - Apply network policies denying all inter-namespace traffic by default
    - Apply standard labels (team, environment-type, created-by, expiry-date) with 30-day default expiry
    - Enforce environment limit (max 5 active environments per developer)
    - Roll back partially created resources within 30 seconds on failure
    - Return confirmation with namespace name and access details
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.8_

  - [ ]\* 10.2 Write property tests for environment provisioning
    - **Property 16: Environment Label Generation With Defaults**
    - **Validates: Requirements 6.3**
    - **Property 17: Environment Type to Resource Quota Mapping**
    - **Validates: Requirements 6.5**
    - **Property 18: Environment Limit Enforcement**
    - **Validates: Requirements 6.8**

  - [x] 10.3 Implement environment lifecycle management
    - Implement expiry notification 7 days before configured expiry date
    - Implement deprovisioning on expiry (delete all resources within 24 hours after expiry)
    - Implement renewal functionality
    - Support three environment types with distinct resource quotas (dev: 4CPU/8GiB/50GiB, staging: 8CPU/16GiB/100GiB, prod: 16CPU/32GiB/200GiB)
    - _Requirements: 6.5, 6.6, 6.7_

  - [x] 10.4 Implement configuration and secret management
    - Store environment-specific configuration values independent of source code
    - Version configuration changes with actor identity and UTC timestamp
    - Distinguish plain config values from secrets (user-designated at creation)
    - Encrypt secrets at rest, restrict read access to authorized services/users
    - Ensure secrets never appear in plaintext in logs, API responses, or UI
    - Validate config values against service's declared configuration schema
    - Fail deployment if referenced config key doesn't exist in target environment
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [ ]\* 10.5 Write property tests for configuration management
    - **Property 29: Configuration Versioning**
    - **Validates: Requirements 14.2**
    - **Property 30: Secret Non-Exposure**
    - **Validates: Requirements 14.3, 14.7**
    - **Property 31: Configuration Schema Validation**
    - **Validates: Requirements 14.4, 14.5, 14.6**

- [x] 11. Implement GitOps Controller (ArgoCD Integration)
  - [x] 11.1 Implement ArgoCD sync status monitoring
    - Detect new manifest commits and initiate synchronization within 30 seconds
    - Report sync status transitions (Syncing, Synced, OutOfSync, Failed) to Deployment Engine
    - Implement 10-minute sync timeout detection, mark deployment as failed on timeout
    - Update deployment record to "deployed" on successful sync
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 11.2 Implement automatic rollback on health check failure
    - Monitor readiness probes after successful sync
    - If not-ready within 5 minutes of sync completion, revert GitOps repo to previous manifest version
    - Initiate resynchronization after rollback
    - Report "rollback_failed" if rollback sync fails or doesn't reach "Synced" within 10 minutes
    - _Requirements: 5.5, 5.6_

- [x] 12. Implement Health Monitor
  - [x] 12.1 Implement health probe collection and alerting
    - Begin collecting readiness/liveness probes within 30 seconds of deployment completion
    - Collect probes every 10 seconds
    - Emit alert and set status to "degraded" after 3 consecutive probe failures
    - Mark status as "unknown" and emit alert if connectivity lost for more than 60 seconds
    - _Requirements: 8.1, 8.4, 8.7_

  - [ ]\* 12.2 Write property tests for health monitoring
    - **Property 19: Health Check Consecutive Failure Alerting**
    - **Validates: Requirements 8.4**
    - **Property 20: Connectivity Loss Detection**
    - **Validates: Requirements 8.7**

  - [x] 12.3 Implement observability metrics and dashboards
    - Expose deployment metrics (success rate, rollback count, mean time to deploy) via Prometheus endpoints
    - Calculate metrics over rolling 24-hour window, update at least every 60 seconds
    - Auto-generate Grafana dashboards within 30 seconds (request rate, error rate, latency p50/p95/p99, resource usage)
    - Configure metrics retention (30 days) and log retention (14 days)
    - Display current health, last 24h metrics, and most recent 100 log entries in Portal
    - _Requirements: 8.2, 8.3, 8.5, 8.6_

- [x] 13. Checkpoint - Ensure Environment, GitOps, and Health Monitor tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement API Server and validation layer
  - [x] 14.1 Implement API Server with Express and Zod validation middleware
    - Set up Express server with TypeScript strict mode
    - Create validation middleware using Zod schemas for body, query, and path params
    - Return HTTP 400 with structured error response (up to 50 violations) for invalid requests
    - Ensure invalid requests never modify persisted state
    - Implement consistent error response format: `error`, `code`, `details` array
    - _Requirements: 15.1, 15.3, 15.6_

  - [ ]\* 14.2 Write property tests for API validation
    - **Property 32: API Request Validation Without State Change**
    - **Validates: Requirements 15.1, 15.6**
    - **Property 33: Consistent Error Response Format**
    - **Validates: Requirements 15.3**

  - [x] 14.3 Implement OpenAPI specification auto-generation
    - Auto-generate OpenAPI 3.x spec from route definitions at build time
    - Fail build if generated spec diverges from implemented route signatures
    - Use shared TypeScript interfaces as single source of truth for request/response types
    - _Requirements: 15.2, 15.4_

  - [ ]\* 14.4 Write property test for API JSON round-trip
    - **Property 3: API Request/Response JSON Round-Trip**
    - **Validates: Requirements 15.5**

  - [x] 14.5 Wire API routes to platform services
    - Implement catalog routes: POST /catalog, GET /catalog/search, PUT /catalog/:id
    - Implement deployment routes: POST /deployments, GET /deployments/:id/status, GET /deployments/history/:serviceId, POST /deployments/rollback
    - Implement environment routes: POST /environments, GET /environments, DELETE /environments/:id
    - Implement config routes: GET /config/:serviceId/:env, PUT /config/:serviceId/:env
    - Implement audit routes: GET /audit with query filters
    - Integrate RBAC middleware on all routes
    - Integrate audit logging on all state-changing routes
    - _Requirements: 1.1, 1.2, 3.1, 6.1, 10.3, 14.1_

- [x] 15. Implement Infrastructure Provisioner (Terraform)
  - [x] 15.1 Create Terraform modules organized by concern
    - Create modules: networking, compute, database, monitoring, security
    - Configure remote state storage with state locking
    - Implement validation gate (terraform validate, terraform fmt -check)
    - Reject execution if validation fails, report specific errors
    - Reject provisioning if remote state storage is unavailable (no local state fallback)
    - _Requirements: 7.1, 7.3, 7.5, 7.7_

  - [x] 15.2 Implement Terraform plan/apply orchestration
    - Execute terraform plan and present change summary (additions, modifications, deletions)
    - Require explicit approval before applying
    - Preserve state file on failure, log error with failed resource identifiers
    - Record audit artifacts (plan output, apply output, state version, user, timestamp) retained 90 days minimum
    - _Requirements: 7.2, 7.4, 7.6_

- [x] 16. Implement CI/CD Pipeline
  - [x] 16.1 Create GitHub Actions workflow for PR validation
    - Execute linting, type checking, unit tests, and integration tests on feature branch push
    - Report pass/fail status check on pull request within 10 minutes
    - Halt execution and skip subsequent stages on any failure
    - Report failure reason (stage name, error output) in GitHub Actions summary
    - Notify committer via commit status check and PR comment on failure
    - _Requirements: 11.1, 11.3, 11.4, 11.5_

  - [x] 16.2 Create GitHub Actions workflow for post-merge builds
    - Build container images for portal and api workspaces on merge to main
    - Tag images with full Git SHA
    - Push to container registry within 15 minutes
    - _Requirements: 11.2_

  - [x] 16.3 Implement workspace-aware selective pipeline execution
    - Detect modified file paths and resolve affected workspaces from dependency graph
    - Execute validation only for affected workspaces and their dependents
    - _Requirements: 11.6_

  - [ ]\* 16.4 Write property test for workspace dependency graph resolution
    - **Property 25: Workspace Dependency Graph Resolution**
    - **Validates: Requirements 11.6**

- [x] 17. Implement Portal Frontend
  - [x] 17.1 Set up Backstage portal application
    - Initialize Backstage app with React/TypeScript/Material UI
    - Configure API client to communicate with backend API server
    - Set up embedded Grafana for observability dashboards
    - _Requirements: 12.1_

  - [x] 17.2 Implement service catalog UI
    - Create service registration form with all required fields
    - Implement search interface with real-time results (case-insensitive, max 50 results)
    - Display entity details, dependencies, and version history
    - _Requirements: 1.1, 1.2, 2.1_

  - [x] 17.3 Implement deployment UI
    - Create deployment initiation form (service, version, environment selection)
    - Display deployment status updates every 5 seconds (phase name, progress percentage)
    - Show deployment history (last 50, reverse chronological) with all required fields
    - Implement rollback controls
    - _Requirements: 3.1, 3.2, 13.1_

  - [x] 17.4 Implement environment and configuration UI
    - Create environment provisioning interface
    - Display environment list with status, quotas, and expiry info
    - Implement configuration management UI (view/edit config values per service per environment)
    - Ensure secret values are never displayed in plaintext
    - _Requirements: 6.1, 14.1, 14.7_

- [x] 18. Implement Developer Experience tooling
  - [x] 18.1 Create developer setup script
    - Single-command setup: install dependencies, configure git hooks, set up environment variables
    - Detect missing prerequisites (Node.js >= 18, pnpm >= 8, Docker) and exit with clear error
    - Complete within 120 seconds on standard broadband (10 Mbps+)
    - _Requirements: 12.3, 12.4_

  - [x] 18.2 Create docker-compose local development environment
    - Define services: database (PostgreSQL), cache (Redis), mock APIs
    - Start all services with single `docker-compose up` command within 60 seconds
    - Display error indicating which service failed if any service doesn't become healthy within 60 seconds
    - _Requirements: 12.6, 12.7_

- [x] 19. Checkpoint - Ensure all integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Final wiring and end-to-end integration
  - [x] 20.1 Wire all components together end-to-end
    - Connect Portal → API Server → RBAC → Audit → Service Catalog
    - Connect Portal → API Server → Deployment Engine → Manifest Generator → Git → ArgoCD
    - Connect Portal → API Server → Environment Manager → Namespace Controller → Kubernetes
    - Connect Health Monitor → Prometheus → Grafana → Portal
    - Verify full request flow from developer action to cluster state change
    - _Requirements: 1.1, 3.1, 5.1, 6.1, 8.3_

  - [ ]\* 20.2 Write integration tests for critical paths
    - Test service registration → deployment → health monitoring flow
    - Test environment provisioning → configuration → deployment flow
    - Test rollback workflow (deploy → failure → auto-rollback)
    - Test RBAC enforcement across full request path
    - _Requirements: 3.1, 5.5, 6.1, 9.3_

- [x] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness properties defined in the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout with fast-check for property-based testing
- All shared types are defined in `packages/shared` and imported by both frontend and backend

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "4.1", "5.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "4.2", "4.3", "5.2", "5.3"] },
    { "id": 4, "tasks": ["2.4", "2.5", "4.4", "5.4"] },
    { "id": 5, "tasks": ["2.6", "2.7"] },
    { "id": 6, "tasks": ["2.8", "2.9"] },
    { "id": 7, "tasks": ["2.10", "2.11"] },
    { "id": 8, "tasks": ["7.1", "8.1", "10.1"] },
    { "id": 9, "tasks": ["7.2", "7.3", "8.2", "8.3", "10.2", "10.3"] },
    { "id": 10, "tasks": ["7.4", "8.4", "8.5", "10.4"] },
    { "id": 11, "tasks": ["7.5", "8.6", "10.5", "11.1"] },
    { "id": 12, "tasks": ["11.2", "12.1"] },
    { "id": 13, "tasks": ["12.2", "12.3"] },
    { "id": 14, "tasks": ["14.1", "15.1"] },
    { "id": 15, "tasks": ["14.2", "14.3", "15.2"] },
    { "id": 16, "tasks": ["14.4", "14.5", "16.1", "16.2"] },
    { "id": 17, "tasks": ["16.3", "16.4", "17.1"] },
    { "id": 18, "tasks": ["17.2", "17.3", "17.4"] },
    { "id": 19, "tasks": ["18.1", "18.2"] },
    { "id": 20, "tasks": ["20.1"] },
    { "id": 21, "tasks": ["20.2"] }
  ]
}
```
