/**
 * OpenAPI 3.0 Specification
 *
 * Defines the IDP API documentation served at /api-docs via Swagger UI.
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'IDP API Documentation',
    version: '1.1.0',
    description:
      'Internal Developer Platform API providing service catalog management, deployment orchestration, environment provisioning, and configuration management.',
    contact: {
      name: 'IDP Platform Team',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Current server',
    },
  ],
  tags: [
    { name: 'Health', description: 'Health check and readiness endpoints' },
    { name: 'Catalog', description: 'Service catalog registration and discovery' },
    { name: 'Deployments', description: 'Deployment lifecycle management' },
    { name: 'Environments', description: 'Environment provisioning and management' },
    { name: 'Config', description: 'Application configuration management' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the API service.',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    version: { type: 'string', example: '1.1.0' },
                    uptime: { type: 'number', example: 12345 },
                  },
                },
              },
            },
          },
          '503': { description: 'Service is unhealthy' },
        },
      },
    },
    '/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness check',
        description: 'Returns whether the service is ready to accept traffic.',
        responses: {
          '200': { description: 'Service is ready' },
          '503': { description: 'Service is not ready' },
        },
      },
    },

    // --- Catalog ---
    '/api/v1/catalog': {
      post: {
        tags: ['Catalog'],
        summary: 'Register a new service',
        description: 'Register a new service in the catalog.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateServiceRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Service registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Service' },
                    meta: { type: 'object' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '409': { description: 'Service name conflict' },
        },
      },
    },
    '/api/v1/catalog/search': {
      get: {
        tags: ['Catalog'],
        summary: 'Search services',
        description: 'Search services by query string.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Search query',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
            description: 'Maximum results to return',
          },
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Service' } },
                    meta: {
                      type: 'object',
                      properties: { total: { type: 'integer' }, query: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/v1/catalog/{id}': {
      get: {
        tags: ['Catalog'],
        summary: 'Get service by ID',
        description: 'Retrieve a service by its unique identifier.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Service details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { $ref: '#/components/schemas/Service' } },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Catalog'],
        summary: 'Update a service',
        description: 'Update an existing service in the catalog.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateServiceRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Service updated successfully' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/catalog/{id}/versions': {
      get: {
        tags: ['Catalog'],
        summary: 'Get version history',
        description: 'Get the version history for a service.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
        ],
        responses: {
          '200': { description: 'Version history' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/catalog/{id}/dependencies': {
      get: {
        tags: ['Catalog'],
        summary: 'Get service dependencies',
        description: 'Get all dependencies for a service.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'List of dependencies' },
        },
      },
      post: {
        tags: ['Catalog'],
        summary: 'Add a dependency',
        description: 'Add a dependency relationship between services.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['targetEntityId', 'dependencyType'],
                properties: {
                  targetEntityId: { type: 'string' },
                  dependencyType: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Dependency added' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/catalog/{id}/dependencies/{targetId}': {
      delete: {
        tags: ['Catalog'],
        summary: 'Remove a dependency',
        description: 'Remove a dependency relationship between services.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'targetId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '204': { description: 'Dependency removed' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // --- Deployments ---
    '/api/v1/deployments': {
      post: {
        tags: ['Deployments'],
        summary: 'Create a deployment',
        description: 'Create and initiate a new deployment.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDeploymentRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Deployment created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Deployment' },
                    meta: { type: 'object' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '422': { description: 'Deployment creation failed' },
        },
      },
      get: {
        tags: ['Deployments'],
        summary: 'List deployments',
        description: 'List deployments with optional filters.',
        parameters: [
          {
            name: 'serviceId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by service ID',
          },
          {
            name: 'environment',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by environment',
          },
          {
            name: 'state',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'pending_approval',
                'approved',
                'in_progress',
                'completed',
                'failed',
                'cancelled',
                'rolled_back',
              ],
            },
            description: 'Filter by state',
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': {
            description: 'List of deployments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Deployment' } },
                    meta: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        limit: { type: 'integer' },
                        offset: { type: 'integer' },
                        hasMore: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/deployments/{id}': {
      get: {
        tags: ['Deployments'],
        summary: 'Get deployment details',
        description: 'Get deployment details by ID.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Deployment details' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/deployments/{id}/approve': {
      post: {
        tags: ['Deployments'],
        summary: 'Approve a deployment',
        description: 'Approve a deployment that is pending approval.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Deployment approved' },
          '422': { description: 'Approval failed' },
        },
      },
    },
    '/api/v1/deployments/{id}/cancel': {
      post: {
        tags: ['Deployments'],
        summary: 'Cancel a deployment',
        description: 'Cancel an active deployment.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: { reason: { type: 'string', description: 'Cancellation reason' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Deployment cancelled' },
          '422': { description: 'Cancellation failed' },
        },
      },
    },
    '/api/v1/deployments/{id}/rollback': {
      post: {
        tags: ['Deployments'],
        summary: 'Rollback a deployment',
        description: 'Trigger a rollback for a failed deployment.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Rollback initiated' },
          '422': { description: 'Rollback failed' },
        },
      },
    },
    '/api/v1/deployments/{id}/events': {
      get: {
        tags: ['Deployments'],
        summary: 'Get deployment events',
        description: 'Get the event log for a deployment.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Deployment event log' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // --- Environments ---
    '/api/v1/environments': {
      post: {
        tags: ['Environments'],
        summary: 'Create an environment',
        description: 'Create a new environment.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateEnvironmentRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Environment created' },
          '400': { $ref: '#/components/responses/ValidationError' },
          '422': { description: 'Environment creation failed' },
        },
      },
      get: {
        tags: ['Environments'],
        summary: 'List environments',
        description: 'List environments with optional filters.',
        parameters: [
          {
            name: 'tier',
            in: 'query',
            schema: { type: 'string', enum: ['development', 'staging', 'production'] },
            description: 'Filter by tier',
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by status',
          },
          {
            name: 'region',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by region',
          },
        ],
        responses: {
          '200': { description: 'List of environments' },
        },
      },
    },
    '/api/v1/environments/{id}': {
      get: {
        tags: ['Environments'],
        summary: 'Get environment details',
        description: 'Get environment details by ID.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Environment details' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Environments'],
        summary: 'Update an environment',
        description: 'Update an existing environment.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateEnvironmentRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Environment updated' },
          '400': { $ref: '#/components/responses/ValidationError' },
          '422': { description: 'Update failed' },
        },
      },
      delete: {
        tags: ['Environments'],
        summary: 'Delete an environment',
        description: 'Delete (decommission) an environment.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Environment deleted' },
          '404': { $ref: '#/components/responses/NotFound' },
          '422': { description: 'Deletion failed' },
        },
      },
    },
    '/api/v1/environments/{id}/promote': {
      post: {
        tags: ['Environments'],
        summary: 'Promote environment',
        description: 'Promote environment configuration to the next tier.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['targetTier'],
                properties: {
                  targetTier: { type: 'string', enum: ['development', 'staging', 'production'] },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Environment promoted' },
          '422': { description: 'Promotion failed' },
        },
      },
    },
    '/api/v1/environments/{id}/variables': {
      get: {
        tags: ['Environments'],
        summary: 'Get environment variables',
        description: 'Get environment variables (secrets are masked).',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'List of environment variables' },
        },
      },
    },
    '/api/v1/environments/{id}/variables/{key}': {
      put: {
        tags: ['Environments'],
        summary: 'Set environment variable',
        description: 'Set an environment variable.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['value'],
                properties: {
                  value: { type: 'string' },
                  isSecret: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Variable set' },
          '422': { description: 'Failed to set variable' },
        },
      },
    },

    // --- Config ---
    '/api/v1/config': {
      post: {
        tags: ['Config'],
        summary: 'Set a config value',
        description: 'Set a configuration value.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SetConfigRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Config value set' },
          '400': { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/v1/config/bulk': {
      post: {
        tags: ['Config'],
        summary: 'Bulk set config values',
        description: 'Set multiple configuration values at once.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['entries'],
                properties: {
                  entries: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/SetConfigRequest' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Config values set' },
          '400': { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/v1/config/resolve/{serviceId}': {
      get: {
        tags: ['Config'],
        summary: 'Resolve config for a service',
        description: 'Resolve the effective configuration for a service by merging scopes.',
        parameters: [
          { name: 'serviceId', in: 'path', required: true, schema: { type: 'string' } },
          {
            name: 'environment',
            in: 'query',
            schema: { type: 'string' },
            description: 'Environment context',
          },
        ],
        responses: {
          '200': { description: 'Resolved configuration' },
        },
      },
    },
    '/api/v1/config/{key}': {
      get: {
        tags: ['Config'],
        summary: 'Get a config value',
        description: 'Get a configuration value by key.',
        parameters: [
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'scope', in: 'query', schema: { type: 'string' }, description: 'Config scope' },
          {
            name: 'scopeId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Scope identifier',
          },
        ],
        responses: {
          '200': { description: 'Config value' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Config'],
        summary: 'Delete a config value',
        description: 'Delete a configuration value.',
        parameters: [
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'scope', in: 'query', schema: { type: 'string' } },
          { name: 'scopeId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '204': { description: 'Config value deleted' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/config/{key}/history': {
      get: {
        tags: ['Config'],
        summary: 'Get config version history',
        description: 'Get the version history for a configuration key.',
        parameters: [
          { name: 'key', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'scope', in: 'query', schema: { type: 'string' } },
          { name: 'scopeId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Version history' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/config/{key}/rollback': {
      post: {
        tags: ['Config'],
        summary: 'Rollback config to a version',
        description: 'Rollback a configuration key to a previous version.',
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['version'],
                properties: {
                  version: { type: 'integer', description: 'Version number to rollback to' },
                  scope: { type: 'string' },
                  scopeId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Config rolled back' },
          '404': { $ref: '#/components/responses/NotFound' },
          '422': { description: 'Rollback failed' },
        },
      },
    },
  },
  components: {
    schemas: {
      Service: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          owner: { type: 'string' },
          tier: { type: 'string', enum: ['critical', 'standard', 'internal'] },
          lifecycle: { type: 'string', enum: ['active', 'deprecated', 'decommissioned'] },
          version: { type: 'integer' },
          tags: { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateServiceRequest: {
        type: 'object',
        required: ['name', 'owner'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 128 },
          description: { type: 'string' },
          owner: { type: 'string' },
          tier: { type: 'string', enum: ['critical', 'standard', 'internal'] },
          tags: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' },
        },
      },
      UpdateServiceRequest: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          owner: { type: 'string' },
          tier: { type: 'string', enum: ['critical', 'standard', 'internal'] },
          lifecycle: { type: 'string', enum: ['active', 'deprecated', 'decommissioned'] },
          tags: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' },
        },
      },
      Deployment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          serviceId: { type: 'string' },
          environment: { type: 'string' },
          version: { type: 'string' },
          strategy: { type: 'string', enum: ['rolling', 'blue-green', 'canary', 'recreate'] },
          state: {
            type: 'string',
            enum: [
              'pending_approval',
              'approved',
              'in_progress',
              'completed',
              'failed',
              'cancelled',
              'rolled_back',
            ],
          },
          initiatedBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          events: { type: 'array', items: { type: 'object' } },
        },
      },
      CreateDeploymentRequest: {
        type: 'object',
        required: ['serviceId', 'environment', 'version'],
        properties: {
          serviceId: { type: 'string' },
          environment: { type: 'string' },
          version: { type: 'string' },
          strategy: {
            type: 'string',
            enum: ['rolling', 'blue-green', 'canary', 'recreate'],
            default: 'rolling',
          },
          config: { type: 'object', description: 'Deployment-specific configuration' },
        },
      },
      CreateEnvironmentRequest: {
        type: 'object',
        required: ['name', 'tier'],
        properties: {
          name: { type: 'string' },
          tier: { type: 'string', enum: ['development', 'staging', 'production'] },
          region: { type: 'string' },
          description: { type: 'string' },
          config: { type: 'object' },
        },
      },
      UpdateEnvironmentRequest: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          config: { type: 'object' },
          status: { type: 'string' },
        },
      },
      SetConfigRequest: {
        type: 'object',
        required: ['key', 'value'],
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
          scope: { type: 'string', enum: ['global', 'service', 'environment'] },
          scopeId: { type: 'string' },
          isSecret: { type: 'boolean', default: false },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
            required: ['code', 'message'],
          },
        },
      },
    },
    responses: {
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from the OIDC provider',
      },
    },
  },
  security: [{ bearerAuth: [] }],
};
