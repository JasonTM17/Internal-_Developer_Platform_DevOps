// Service types
export type ServiceTier = 'critical' | 'standard' | 'experimental';
export type ServiceLifecycle = 'production' | 'staging' | 'deprecated' | 'experimental';

export interface Service {
  id: string;
  name: string;
  description?: string;
  team: string;
  tier: ServiceTier;
  lifecycle: ServiceLifecycle;
  repository?: string;
  language?: string;
  framework?: string;
  metadata?: {
    healthStatus?: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    lastDeployedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Deployment types
export type DeploymentStatus = 'pending' | 'in_progress' | 'succeeded' | 'failed' | 'rolled_back';
export type DeploymentStrategy = 'rolling' | 'blue_green' | 'canary';

export interface Deployment {
  id: string;
  serviceId: string;
  version: string;
  environment: string;
  status: DeploymentStatus;
  strategy: DeploymentStrategy;
  artifacts?: {
    image?: string;
    commit_sha?: string;
  };
  duration_seconds?: number;
  initiatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Environment types
export type EnvironmentStatus = 'active' | 'provisioning' | 'updating' | 'destroying' | 'destroyed' | 'failed';
export type EnvironmentType = 'development' | 'preview' | 'staging' | 'production';

export interface Environment {
  id: string;
  name: string;
  namespace?: string;
  type: EnvironmentType;
  status: EnvironmentStatus;
  cluster?: string;
  resources?: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb?: number;
  };
  endpoints?: {
    api?: string;
    portal?: string;
  };
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
