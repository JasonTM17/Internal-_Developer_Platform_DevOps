/**
 * Server-Sent Events (SSE) for Real-Time Deployment Status
 *
 * Production-ready SSE implementation with:
 * - Connection management (track active clients)
 * - Heartbeat to keep connections alive
 * - Event filtering by deployment ID
 * - Graceful cleanup on disconnect
 * - Backpressure handling
 */
import { Request, Response } from 'express';

export interface SSEClient {
  id: string;
  response: Response;
  filters: SSEFilters;
  connectedAt: Date;
}

export interface SSEFilters {
  deploymentId?: string;
  environment?: string;
  serviceId?: string;
}

export interface SSEEvent {
  id?: string;
  event: string;
  data: unknown;
  retry?: number;
}

export class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly heartbeatMs: number;

  constructor(heartbeatMs = 30000) {
    this.heartbeatMs = heartbeatMs;
    this.startHeartbeat();
  }

  /**
   * Register a new SSE client connection.
   */
  connect(req: Request, res: Response, filters: SSEFilters = {}): string {
    const clientId = this.generateClientId();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial connection event
    this.sendToClient(res, {
      event: 'connected',
      data: { clientId, timestamp: new Date().toISOString() },
    });

    const client: SSEClient = {
      id: clientId,
      response: res,
      filters,
      connectedAt: new Date(),
    };

    this.clients.set(clientId, client);

    // Cleanup on disconnect
    req.on('close', () => {
      this.disconnect(clientId);
    });

    req.on('error', () => {
      this.disconnect(clientId);
    });

    return clientId;
  }

  /**
   * Disconnect a client and clean up resources.
   */
  disconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.response.end();
      } catch {
        // Client may already be disconnected
      }
      this.clients.delete(clientId);
    }
  }

  /**
   * Broadcast an event to all connected clients matching filters.
   */
  broadcast(event: SSEEvent, targetFilters?: SSEFilters): void {
    for (const client of this.clients.values()) {
      if (this.matchesFilters(client.filters, targetFilters)) {
        this.sendToClient(client.response, event);
      }
    }
  }

  /**
   * Send a deployment status update to relevant clients.
   */
  sendDeploymentUpdate(deploymentId: string, status: string, metadata?: Record<string, unknown>): void {
    this.broadcast(
      {
        event: 'deployment:status',
        data: {
          deploymentId,
          status,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      },
      { deploymentId },
    );
  }

  /**
   * Send a log line for a specific deployment.
   */
  sendDeploymentLog(deploymentId: string, line: string, stream: 'stdout' | 'stderr' = 'stdout'): void {
    this.broadcast(
      {
        event: 'deployment:log',
        data: { deploymentId, line, stream, timestamp: new Date().toISOString() },
      },
      { deploymentId },
    );
  }

  /**
   * Get the number of active connections.
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Get connection stats for monitoring.
   */
  getStats() {
    return {
      activeConnections: this.clients.size,
      clients: Array.from(this.clients.values()).map(c => ({
        id: c.id,
        filters: c.filters,
        connectedAt: c.connectedAt.toISOString(),
      })),
    };
  }

  /**
   * Gracefully shutdown all connections.
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const clientId of this.clients.keys()) {
      this.disconnect(clientId);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, client] of this.clients.entries()) {
        try {
          client.response.write(':heartbeat\n\n');
        } catch {
          this.disconnect(clientId);
        }
      }
    }, this.heartbeatMs);
  }

  private sendToClient(res: Response, event: SSEEvent): void {
    try {
      if (event.id) res.write(`id: ${event.id}\n`);
      if (event.retry) res.write(`retry: ${event.retry}\n`);
      res.write(`event: ${event.event}\n`);
      res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    } catch {
      // Client disconnected, will be cleaned up by heartbeat
    }
  }

  private matchesFilters(clientFilters: SSEFilters, targetFilters?: SSEFilters): boolean {
    if (!targetFilters) return true;
    if (targetFilters.deploymentId && clientFilters.deploymentId && clientFilters.deploymentId !== targetFilters.deploymentId) {
      return false;
    }
    if (targetFilters.environment && clientFilters.environment && clientFilters.environment !== targetFilters.environment) {
      return false;
    }
    if (targetFilters.serviceId && clientFilters.serviceId && clientFilters.serviceId !== targetFilters.serviceId) {
      return false;
    }
    return true;
  }

  private generateClientId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
}
