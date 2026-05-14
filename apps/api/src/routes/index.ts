/**
 * API Route Aggregator
 *
 * Centralizes all API route registration in a single module.
 * Provides versioned API routing with:
 * - Module-based route organization
 * - API version prefix (/api/v1)
 * - Route-specific middleware (auth, rate limiting)
 * - OpenAPI documentation metadata
 */

import type { Router as RouterType } from 'express';

import { InMemoryCatalogStore } from '../catalog/in-memory-catalog-store';
import { registerCatalogRoutes } from '../catalog/routes';
import { ServiceCatalog } from '../catalog/service-catalog';
import { ConfigService } from '../config-mgmt/config-service';
import { InMemoryConfigStore } from '../config-mgmt/config-store';
import { registerConfigRoutes } from '../config-mgmt/routes';
import { DeploymentEngine } from '../deployment/deployment-engine';
import { InMemoryDeploymentStore } from '../deployment/deployment-store';
import { registerDeploymentRoutes } from '../deployment/routes';
import { EnvironmentManager } from '../environment/environment-manager';
import { InMemoryEnvironmentStore } from '../environment/environment-store';
import { registerEnvironmentRoutes } from '../environment/routes';

/**
 * API module metadata for documentation and discovery.
 */
export interface ApiModule {
  name: string;
  version: string;
  basePath: string;
  description: string;
}

/** Registered API modules. */
export const API_MODULES: ApiModule[] = [
  {
    name: 'catalog',
    version: 'v1',
    basePath: '/api/v1/catalog',
    description: 'Service Catalog - register, search, and manage services',
  },
  {
    name: 'deployments',
    version: 'v1',
    basePath: '/api/v1/deployments',
    description: 'Deployment Management - create, approve, and monitor deployments',
  },
  {
    name: 'environments',
    version: 'v1',
    basePath: '/api/v1/environments',
    description: 'Environment Management - provision and manage environments',
  },
  {
    name: 'config',
    version: 'v1',
    basePath: '/api/v1/config',
    description: 'Configuration Management - manage application configuration',
  },
];

/**
 * Create service instances with dependency injection.
 * In production, these would use real database stores.
 * For development/testing, in-memory stores are used.
 */
function createServices() {
  // Catalog service
  const catalogStore = new InMemoryCatalogStore();
  const catalog = new ServiceCatalog(catalogStore);

  // Deployment service
  const deploymentStore = new InMemoryDeploymentStore();
  const deploymentEngine = new DeploymentEngine(deploymentStore, {
    maxConcurrentDeployments: 5,
    defaultTimeoutSeconds: 600,
    defaultStrategy: 'rolling',
    requireApprovalForProduction: true,
  });

  // Environment service
  const environmentStore = new InMemoryEnvironmentStore();
  const environmentManager = new EnvironmentManager(environmentStore);

  // Config service
  const configStore = new InMemoryConfigStore();
  const configService = new ConfigService(configStore, process.env.CONFIG_ENCRYPTION_KEY);

  return {
    catalog,
    deploymentEngine,
    environmentManager,
    configService,
  };
}

/**
 * Register all API routes on the given Express router.
 *
 * This is the main entry point for route registration.
 * All domain modules are wired up with their dependencies here.
 */
export function registerApiRoutes(router: RouterType): void {
  const services = createServices();

  // Health and meta (unversioned)
  router.get('/version', (_req, res) => {
    res.json({ version: process.env.VERSION || '1.0.0', api: 'v1' });
  });

  // API discovery endpoint
  router.get('/api', (_req, res) => {
    res.status(200).json({
      name: 'IDP Platform API',
      version: '1.0.0',
      modules: API_MODULES,
      documentation: '/api/docs',
      health: '/health',
      metrics: '/metrics',
    });
  });

  // API v1 info endpoint
  router.get('/api/v1', (_req, res) => {
    res.status(200).json({
      version: 'v1',
      status: 'stable',
      modules: API_MODULES.filter((m) => m.version === 'v1'),
    });
  });

  // Register domain routes (these register their own sub-paths)
  registerCatalogRoutes(router, services.catalog);
  registerDeploymentRoutes(router, services.deploymentEngine);
  registerEnvironmentRoutes(router, services.environmentManager);
  registerConfigRoutes(router, services.configService);
}
