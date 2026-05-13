/**
 * Platform API client - uses mock data for standalone Docker dev mode.
 * In production, this would call the real API at VITE_API_URL.
 */

import type { Service, Deployment, Environment, PaginatedResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Mock data for standalone development
const mockServices: Service[] = [
  {
    id: '1',
    name: 'payment-service',
    description: 'Handles payment processing, refunds, and subscription billing',
    team: 'payments-squad',
    tier: 'critical',
    lifecycle: 'production',
    repository: 'https://github.com/org/payment-service',
    language: 'typescript',
    framework: 'nestjs',
    metadata: { healthStatus: 'healthy', lastDeployedAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    createdAt: '2023-09-12T10:00:00Z',
    updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: '2',
    name: 'user-auth',
    description: 'OAuth2/OIDC authentication and RBAC authorization',
    team: 'platform-team',
    tier: 'critical',
    lifecycle: 'production',
    repository: 'https://github.com/org/user-auth',
    language: 'go',
    framework: 'gin',
    metadata: { healthStatus: 'healthy', lastDeployedAt: new Date(Date.now() - 18 * 3600000).toISOString() },
    createdAt: '2023-06-20T08:00:00Z',
    updatedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
  },
  {
    id: '3',
    name: 'notification-gateway',
    description: 'Multi-channel delivery: email, SMS, push, and webhooks',
    team: 'growth-team',
    tier: 'standard',
    lifecycle: 'production',
    language: 'typescript',
    framework: 'fastify',
    metadata: { healthStatus: 'degraded', lastDeployedAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    createdAt: '2023-11-01T12:00:00Z',
    updatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: '4',
    name: 'order-processor',
    description: 'Order lifecycle management and fulfillment orchestration',
    team: 'payments-squad',
    tier: 'critical',
    lifecycle: 'production',
    language: 'java',
    framework: 'spring-boot',
    metadata: { healthStatus: 'healthy', lastDeployedAt: new Date(Date.now() - 36 * 3600000).toISOString() },
    createdAt: '2023-08-15T09:00:00Z',
    updatedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
  },
  {
    id: '5',
    name: 'inventory-api',
    description: 'Real-time stock levels and warehouse allocation',
    team: 'platform-team',
    tier: 'standard',
    lifecycle: 'production',
    language: 'go',
    framework: 'gin',
    metadata: { healthStatus: 'healthy', lastDeployedAt: new Date(Date.now() - 72 * 3600000).toISOString() },
    createdAt: '2023-10-05T14:00:00Z',
    updatedAt: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
  {
    id: '6',
    name: 'analytics-engine',
    description: 'Event ingestion, aggregation, and reporting pipelines',
    team: 'growth-team',
    tier: 'standard',
    lifecycle: 'production',
    language: 'python',
    framework: 'fastapi',
    metadata: { healthStatus: 'healthy', lastDeployedAt: new Date(Date.now() - 48 * 3600000).toISOString() },
    createdAt: '2023-07-22T11:00:00Z',
    updatedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: '7',
    name: 'search-service',
    description: 'Full-text search powered by Elasticsearch',
    team: 'platform-team',
    tier: 'standard',
    lifecycle: 'production',
    language: 'typescript',
    framework: 'nestjs',
    metadata: { healthStatus: 'healthy', lastDeployedAt: new Date(Date.now() - 96 * 3600000).toISOString() },
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: new Date(Date.now() - 96 * 3600000).toISOString(),
  },
  {
    id: '8',
    name: 'cdn-proxy',
    description: 'Edge caching and static asset delivery',
    team: 'infrastructure',
    tier: 'critical',
    lifecycle: 'production',
    language: 'rust',
    metadata: { healthStatus: 'healthy', lastDeployedAt: new Date(Date.now() - 120 * 3600000).toISOString() },
    createdAt: '2023-05-10T07:00:00Z',
    updatedAt: new Date(Date.now() - 120 * 3600000).toISOString(),
  },
  {
    id: '9',
    name: 'email-worker',
    description: 'Transactional email rendering and delivery queue',
    team: 'growth-team',
    tier: 'standard',
    lifecycle: 'production',
    language: 'typescript',
    framework: 'nestjs',
    metadata: { healthStatus: 'healthy', lastDeployedAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    createdAt: '2024-01-08T09:00:00Z',
    updatedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: '10',
    name: 'billing-service',
    description: 'Invoice generation, metering, and Stripe integration',
    team: 'payments-squad',
    tier: 'critical',
    lifecycle: 'production',
    language: 'typescript',
    framework: 'nestjs',
    metadata: { healthStatus: 'healthy', lastDeployedAt: new Date(Date.now() - 8 * 3600000).toISOString() },
    createdAt: '2023-11-20T13:00:00Z',
    updatedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: '11',
    name: 'api-gateway',
    description: 'Central ingress with rate limiting, auth, and routing',
    team: 'infrastructure',
    tier: 'critical',
    lifecycle: 'production',
    language: 'go',
    framework: 'gin',
    metadata: { healthStatus: 'healthy', lastDeployedAt: new Date(Date.now() - 12 * 3600000).toISOString() },
    createdAt: '2023-04-01T07:00:00Z',
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: '12',
    name: 'config-server',
    description: 'Centralized configuration and feature flag management',
    team: 'infrastructure',
    tier: 'standard',
    lifecycle: 'production',
    language: 'go',
    metadata: { healthStatus: 'healthy', lastDeployedAt: new Date(Date.now() - 144 * 3600000).toISOString() },
    createdAt: '2023-08-01T10:00:00Z',
    updatedAt: new Date(Date.now() - 144 * 3600000).toISOString(),
  },
];

const mockDeployments: Deployment[] = [
  {
    id: 'd1',
    serviceId: '1',
    version: 'v2.14.3',
    environment: 'production',
    status: 'succeeded',
    strategy: 'blue_green',
    artifacts: { image: 'registry/payment-service:v2.14.3', commit_sha: 'a3f8c21' },
    duration_seconds: 245,
    initiatedBy: 'ci-pipeline',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600000 + 245000).toISOString(),
  },
  {
    id: 'd2',
    serviceId: '3',
    version: 'v1.8.0',
    environment: 'staging',
    status: 'in_progress',
    strategy: 'rolling',
    artifacts: { image: 'registry/notification-gateway:v1.8.0', commit_sha: 'e7b2d94' },
    initiatedBy: 'j.chen@company.dev',
    createdAt: new Date(Date.now() - 300000).toISOString(),
    updatedAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'd3',
    serviceId: '2',
    version: 'v4.2.1',
    environment: 'production',
    status: 'failed',
    strategy: 'canary',
    artifacts: { image: 'registry/user-auth:v4.2.1', commit_sha: '91c4f08' },
    duration_seconds: 180,
    initiatedBy: 'ci-pipeline',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600000 + 180000).toISOString(),
  },
  {
    id: 'd4',
    serviceId: '11',
    version: 'v5.0.2',
    environment: 'production',
    status: 'succeeded',
    strategy: 'rolling',
    artifacts: { image: 'registry/api-gateway:v5.0.2', commit_sha: 'b4d7e23' },
    duration_seconds: 120,
    initiatedBy: 'ci-pipeline',
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000 + 120000).toISOString(),
  },
  {
    id: 'd5',
    serviceId: '10',
    version: 'v3.1.0',
    environment: 'staging',
    status: 'succeeded',
    strategy: 'rolling',
    artifacts: { image: 'registry/billing-service:v3.1.0', commit_sha: 'f2a9c67' },
    duration_seconds: 90,
    initiatedBy: 'm.rodriguez@company.dev',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600000 + 90000).toISOString(),
  },
];

const mockEnvironments: Environment[] = [
  {
    id: 'e1',
    name: 'production',
    namespace: 'idp-prod',
    type: 'production',
    status: 'active',
    cluster: 'eks-prod-us-east-1',
    resources: { cpu_cores: 16, memory_gb: 64, storage_gb: 500 },
    endpoints: { api: 'https://api.idp.example.com' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'e2',
    name: 'staging',
    namespace: 'idp-staging',
    type: 'staging',
    status: 'active',
    cluster: 'eks-staging-us-east-1',
    resources: { cpu_cores: 8, memory_gb: 32, storage_gb: 200 },
    endpoints: { api: 'https://staging-api.idp.example.com' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'e3',
    name: 'preview-pr-142',
    namespace: 'preview-pr-142',
    type: 'preview',
    status: 'active',
    cluster: 'eks-dev-us-east-1',
    resources: { cpu_cores: 2, memory_gb: 4, storage_gb: 20 },
    endpoints: { api: 'https://pr-142.preview.idp.example.com' },
    expiresAt: new Date(Date.now() + 172800000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'e4',
    name: 'dev-feature-auth',
    namespace: 'dev-feature-auth',
    type: 'development',
    status: 'provisioning',
    cluster: 'eks-dev-us-east-1',
    resources: { cpu_cores: 2, memory_gb: 4, storage_gb: 10 },
    expiresAt: new Date(Date.now() + 259200000).toISOString(),
    createdAt: new Date(Date.now() - 600000).toISOString(),
    updatedAt: new Date(Date.now() - 60000).toISOString(),
  },
];

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const platformApi = {
  services: {
    async list(params: Record<string, string | number> = {}): Promise<PaginatedResponse<Service>> {
      await delay(300);
      let filtered = [...mockServices];

      if (params.search) {
        const search = String(params.search).toLowerCase();
        filtered = filtered.filter(
          (s) => s.name.includes(search) || s.description?.toLowerCase().includes(search)
        );
      }
      if (params.tier && params.tier !== 'all') {
        filtered = filtered.filter((s) => s.tier === params.tier);
      }
      if (params.lifecycle && params.lifecycle !== 'all') {
        filtered = filtered.filter((s) => s.lifecycle === params.lifecycle);
      }
      if (params.team) {
        filtered = filtered.filter((s) => s.team.includes(String(params.team)));
      }

      const page = Number(params.page) || 1;
      const pageSize = Number(params.pageSize) || 12;
      const start = (page - 1) * pageSize;
      const data = filtered.slice(start, start + pageSize);

      return {
        data,
        pagination: {
          page,
          pageSize,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / pageSize),
        },
      };
    },
    async create(data: Partial<Service>): Promise<Service> {
      await delay(500);
      const newService: Service = {
        id: String(mockServices.length + 1),
        name: data.name || 'new-service',
        description: data.description,
        team: data.team || 'unknown',
        tier: data.tier || 'standard',
        lifecycle: 'experimental',
        repository: data.repository,
        language: data.language,
        framework: data.framework,
        metadata: { healthStatus: 'unknown' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockServices.push(newService);
      return newService;
    },
  },

  deployments: {
    async list(params: Record<string, string | number> = {}): Promise<PaginatedResponse<Deployment>> {
      await delay(300);
      let filtered = [...mockDeployments];

      if (params.status && params.status !== 'all') {
        filtered = filtered.filter((d) => d.status === params.status);
      }
      if (params.environment && params.environment !== 'all') {
        filtered = filtered.filter((d) => d.environment === params.environment);
      }

      return {
        data: filtered,
        pagination: { page: 1, pageSize: 50, total: filtered.length, totalPages: 1 },
      };
    },
  },

  environments: {
    async list(params: Record<string, string | number> = {}): Promise<PaginatedResponse<Environment>> {
      await delay(300);
      return {
        data: [...mockEnvironments],
        pagination: { page: 1, pageSize: 50, total: mockEnvironments.length, totalPages: 1 },
      };
    },
    async create(data: Record<string, unknown>): Promise<Environment> {
      await delay(1000);
      const newEnv: Environment = {
        id: `e${mockEnvironments.length + 1}`,
        name: String(data.name),
        namespace: String(data.name),
        type: data.type as Environment['type'],
        status: 'provisioning',
        cluster: 'eks-dev-us-east-1',
        resources: data.resources as Environment['resources'],
        expiresAt: new Date(Date.now() + 259200000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockEnvironments.push(newEnv);
      return newEnv;
    },
    async delete(id: string): Promise<void> {
      await delay(500);
      const idx = mockEnvironments.findIndex((e) => e.id === id);
      if (idx >= 0) mockEnvironments[idx].status = 'destroying';
    },
  },

  health: {
    async get() {
      await delay(200);
      return {
        status: 'healthy' as const,
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        uptime: '3d 14h 22m',
        checks: [
          { name: 'PostgreSQL', status: 'pass' as const, latency_ms: 3, lastChecked: new Date().toISOString() },
          { name: 'Redis', status: 'pass' as const, latency_ms: 1, lastChecked: new Date().toISOString() },
          { name: 'API Server', status: 'pass' as const, latency_ms: 12, lastChecked: new Date().toISOString() },
          { name: 'LocalStack (S3)', status: 'pass' as const, latency_ms: 45, lastChecked: new Date().toISOString() },
          { name: 'Event Bus', status: 'warn' as const, latency_ms: 850, message: 'High latency detected', lastChecked: new Date().toISOString() },
          { name: 'DNS Resolution', status: 'pass' as const, latency_ms: 5, lastChecked: new Date().toISOString() },
        ],
      };
    },
  },

  costs: {
    async summary(params: { period: string }) {
      await delay(400);
      return {
        totalCost: 4250,
        previousPeriodCost: 3980,
        trend: 6.8,
        forecast: 5100,
        budget: 6000,
        budgetUtilization: 70.8,
        byCategory: {
          compute: 2400,
          storage: 950,
          network: 600,
          other: 300,
        },
        breakdown: [
          { service: 'payment-service', team: 'payments-squad', compute: 800, storage: 200, network: 150, total: 1150, trend: 5.2, budget: 1500, budgetUtilization: 76.7 },
          { service: 'api-gateway', team: 'infrastructure', compute: 600, storage: 100, network: 200, total: 900, trend: -2.1, budget: 1200, budgetUtilization: 75.0 },
          { service: 'user-auth', team: 'platform-team', compute: 500, storage: 150, network: 100, total: 750, trend: 3.5, budget: 1000, budgetUtilization: 75.0 },
          { service: 'notification-gateway', team: 'growth-team', compute: 300, storage: 300, network: 100, total: 700, trend: 12.3, budget: 800, budgetUtilization: 87.5 },
          { service: 'analytics-engine', team: 'growth-team', compute: 200, storage: 200, network: 50, total: 450, trend: -5.0, budget: 600, budgetUtilization: 75.0 },
          { service: 'search-service', team: 'platform-team', compute: 0, storage: 0, network: 0, total: 300, trend: 0, budget: 500, budgetUtilization: 60.0 },
        ],
      };
    },
  },
};
