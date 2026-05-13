/**
 * GitOps and Manifest interfaces and types.
 *
 * Defines the manifest generation model, Kubernetes manifest structure,
 * sync status tracking, and health status reporting.
 */

/**
 * ArgoCD synchronization status.
 */
export type SyncStatus = 'Syncing' | 'Synced' | 'OutOfSync' | 'Failed';

/**
 * Service health status as reported by the Health Monitor.
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unknown';

/**
 * A Kubernetes manifest with standard metadata.
 */
export interface KubernetesManifest {
  /** Kubernetes API version (e.g., "apps/v1", "v1"). */
  apiVersion: string;
  /** Resource kind (e.g., "Deployment", "Service", "ConfigMap"). */
  kind: string;
  /** Resource metadata. */
  metadata: {
    /** Resource name. */
    name: string;
    /** Kubernetes namespace. */
    namespace: string;
    /** Labels applied to the resource. */
    labels?: Record<string, string>;
    /** Annotations applied to the resource. */
    annotations?: Record<string, string>;
  };
  /** Resource specification (varies by kind). */
  spec?: Record<string, unknown>;
  /** Resource data (used by ConfigMap, Secret). */
  data?: Record<string, string>;
}

/**
 * A set of Kubernetes manifests generated for a deployment.
 */
export interface ManifestSet {
  /** The Deployment manifest. */
  deployment: KubernetesManifest;
  /** The Service manifest. */
  service: KubernetesManifest;
  /** The ConfigMap manifest. */
  configMap: KubernetesManifest;
  /** Path in the GitOps repository (e.g., "environments/staging/my-service/"). */
  path: string;
}
