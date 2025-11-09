import { useState } from "react";
import type { Node } from "reactflow";

import type {
  APIGatewayConfig,
  CDNConfig,
  CacheConfig,
  CircuitBreakerConfig,
  DatabaseConfig,
  LoadBalancerConfig,
  MessageBrokerConfig,
  NodeConfig,
  ObjectStorageConfig,
  QueueConfig,
  SearchIndexConfig,
  ServiceConfig,
  UserConfig,
} from "../types";


export function ConfigPanel({
  node,
  onClose,
  onSave,
}: {
  node: Node | null;
  onClose: () => void;
  onSave: (nodeId: string, config: NodeConfig, displayLabel?: string) => void;
}) {
  if (!node) return null;

  const label = node.data.label as string;
  const currentDisplayLabel = (node.data.displayLabel as string) || label;
  const currentConfig = (node.data.config as NodeConfig) || {};
  const [config, setConfig] = useState<NodeConfig>(currentConfig);
  const [displayLabel, setDisplayLabel] = useState(currentDisplayLabel);

  const handleSave = () => {
    onSave(node.id, config, displayLabel?.trim() ? displayLabel.trim() : undefined);
    onClose();
  };

  const getNodeType = (label: string): string => {
    if (label === "User") return "user";
    if (label === "CDN") return "cdn";
    if (label === "Load Balancer") return "loadbalancer";
    if (label === "API Gateway") return "apigateway";
    if (label === "Service") return "service";
    if (label === "Queue") return "queue";
    if (label === "Cache") return "cache";
    if (label === "Database" || label === "DB") return "database";
    if (label === "Message Broker") return "messagebroker";
    if (label === "Search Index") return "searchindex";
    if (label === "Object Storage") return "objectstorage";
    if (label === "Circuit Breaker") return "circuitbreaker";
    return "default";
  };

  const nodeType = getNodeType(label);

  return (
    <div className="config-overlay" onClick={onClose}>
      <div className="config-panel" onClick={(e) => e.stopPropagation()}>
        <div className="config-header">
          <h3>Configure {label}</h3>
          <button className="config-close" onClick={onClose}>×</button>
        </div>
        <div className="config-content">
          <div className="config-section">
            <label>
              Display Label
              <input
                type="text"
                value={displayLabel}
                onChange={(e) => setDisplayLabel(e.target.value)}
                placeholder={`e.g., ${label}`}
              />
            </label>
          </div>
          {/* User-specific fields */}
          {nodeType === "user" && (
            <div className="config-section">
              <label>
                Daily Active Users (DAUs)
                <input
                  type="number"
                  value={(config as UserConfig).daus || ""}
                  onChange={(e) =>
                    setConfig({ ...config, daus: e.target.value ? Number(e.target.value) : undefined })
                  }
                  placeholder="e.g., 1000000"
                />
              </label>
              <label>
                Message Size (bytes)
                <input
                  type="number"
                  value={(config as UserConfig).messageSizeBytes || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      messageSizeBytes: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 1024"
                />
              </label>
            </div>
          )}

          {/* Service-specific fields */}
          {nodeType === "service" && (
            <div className="config-section">
              <label>
                Max Connections
                <input
                  type="number"
                  value={(config as ServiceConfig).maxConnections || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxConnections: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 10000"
                />
              </label>
              <label>
                Message Size (bytes) - Optional
                <input
                  type="number"
                  value={(config as ServiceConfig).messageSizeBytes || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      messageSizeBytes: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 1024"
                />
              </label>
            </div>
          )}

          {/* Queue-specific fields */}
          {nodeType === "queue" && (
            <div className="config-section">
              <label>
                Throughput Rate (messages/sec)
                <input
                  type="number"
                  value={(config as QueueConfig).throughputRate || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      throughputRate: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 10000"
                />
              </label>
              <label>
                Message Size (bytes)
                <input
                  type="number"
                  value={(config as QueueConfig).messageSizeBytes || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      messageSizeBytes: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 1024"
                />
              </label>
              <label>
                Max Queue Depth (messages)
                <input
                  type="number"
                  value={(config as QueueConfig).maxQueueDepth || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxQueueDepth: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 1000000"
                />
              </label>
              <label>
                Retention Time (hours)
                <input
                  type="number"
                  value={(config as QueueConfig).retentionHours || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      retentionHours: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 24"
                />
              </label>
              <label>
                Processing Rate (messages/sec)
                <input
                  type="number"
                  value={(config as QueueConfig).processingRate || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      processingRate: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 5000"
                />
              </label>
            </div>
          )}

          {/* Cache-specific fields */}
          {nodeType === "cache" && (
            <div className="config-section">
              <label>
                Storage (GB)
                <input
                  type="number"
                  value={(config as CacheConfig).storageGB || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      storageGB: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 100"
                />
              </label>
              <label>
                Max Connections
                <input
                  type="number"
                  value={(config as CacheConfig).maxConnections || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxConnections: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 10000"
                />
              </label>
            </div>
          )}

          {/* Database-specific fields */}
          {nodeType === "database" && (
            <div className="config-section">
              <label>
                Storage (GB)
                <input
                  type="number"
                  value={(config as DatabaseConfig).storageGB || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      storageGB: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 1000"
                />
              </label>
              <label>
                Max Connections
                <input
                  type="number"
                  value={(config as DatabaseConfig).maxConnections || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxConnections: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 5000"
                />
              </label>
              <label>
                Replication Factor
                <input
                  type="number"
                  value={(config as DatabaseConfig).replicationFactor || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      replicationFactor: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 3"
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={(config as DatabaseConfig).readWriteSplit || false}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      readWriteSplit: e.target.checked,
                    })
                  }
                />
                Read/Write Split Enabled
              </label>
            </div>
          )}

          {/* Load Balancer-specific fields */}
          {nodeType === "loadbalancer" && (
            <div className="config-section">
              <label>
                Load Balancing Algorithm
                <select
                  value={(config as LoadBalancerConfig).algorithm || "round-robin"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      algorithm: e.target.value,
                    })
                  }
                >
                  <option value="round-robin">Round Robin</option>
                  <option value="least-connections">Least Connections</option>
                  <option value="weighted">Weighted</option>
                </select>
              </label>
              <label>
                Health Check Interval (seconds)
                <input
                  type="number"
                  value={(config as LoadBalancerConfig).healthCheckInterval || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      healthCheckInterval: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 30"
                />
              </label>
              <label>
                Max Connections
                <input
                  type="number"
                  value={(config as LoadBalancerConfig).maxConnections || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxConnections: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 100000"
                />
              </label>
            </div>
          )}

          {/* API Gateway-specific fields */}
          {nodeType === "apigateway" && (
            <div className="config-section">
              <label>
                Max Connections
                <input
                  type="number"
                  value={(config as APIGatewayConfig).maxConnections || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxConnections: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 100000"
                />
              </label>
              <label>
                Rate Limit (requests/sec)
                <input
                  type="number"
                  value={(config as APIGatewayConfig).rateLimit || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      rateLimit: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 10000"
                />
              </label>
              <label>
                Timeout (seconds)
                <input
                  type="number"
                  value={(config as APIGatewayConfig).timeout || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      timeout: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 30"
                />
              </label>
            </div>
          )}

          {/* Service-specific fields - updated */}
          {nodeType === "service" && (
            <div className="config-section">
              <label>
                Max Connections
                <input
                  type="number"
                  value={(config as ServiceConfig).maxConnections || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxConnections: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 10000"
                />
              </label>
              <label>
                Number of Instances
                <input
                  type="number"
                  value={(config as ServiceConfig).instances || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      instances: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 5"
                />
              </label>
              <label>
                Message Size (bytes) - Optional
                <input
                  type="number"
                  value={(config as ServiceConfig).messageSizeBytes || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      messageSizeBytes: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 1024"
                />
              </label>
            </div>
          )}

          {/* Cache-specific fields - updated */}
          {nodeType === "cache" && (
            <div className="config-section">
              <label>
                Storage (GB)
                <input
                  type="number"
                  value={(config as CacheConfig).storageGB || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      storageGB: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 100"
                />
              </label>
              <label>
                Max Connections
                <input
                  type="number"
                  value={(config as CacheConfig).maxConnections || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxConnections: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 10000"
                />
              </label>
              <label>
                Cache Hit Rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={(config as CacheConfig).hitRate || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      hitRate: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 80"
                />
              </label>
              <label>
                TTL (Time to Live in seconds)
                <input
                  type="number"
                  value={(config as CacheConfig).ttl || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      ttl: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 3600"
                />
              </label>
            </div>
          )}

          {/* CDN-specific fields */}
          {nodeType === "cdn" && (
            <div className="config-section">
              <label>
                Cache Hit Rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={(config as CDNConfig).cacheHitRate || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      cacheHitRate: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 95"
                />
              </label>
              <label>
                Edge Locations
                <input
                  type="number"
                  value={(config as CDNConfig).edgeLocations || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      edgeLocations: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 200"
                />
              </label>
              <label>
                Bandwidth Capacity (GB/s)
                <input
                  type="number"
                  value={(config as CDNConfig).bandwidthGBps || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      bandwidthGBps: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 100"
                />
              </label>
            </div>
          )}

          {/* Message Broker-specific fields */}
          {nodeType === "messagebroker" && (
            <div className="config-section">
              <label>
                Throughput Rate (messages/sec)
                <input
                  type="number"
                  value={(config as MessageBrokerConfig).throughputRate || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      throughputRate: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 50000"
                />
              </label>
              <label>
                Message Size (bytes)
                <input
                  type="number"
                  value={(config as MessageBrokerConfig).messageSizeBytes || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      messageSizeBytes: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 1024"
                />
              </label>
              <label>
                Max Connections
                <input
                  type="number"
                  value={(config as MessageBrokerConfig).maxConnections || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxConnections: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 10000"
                />
              </label>
              <label>
                Retention Time (hours)
                <input
                  type="number"
                  value={(config as MessageBrokerConfig).retentionHours || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      retentionHours: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 168"
                />
              </label>
            </div>
          )}

          {/* Search Index-specific fields */}
          {nodeType === "searchindex" && (
            <div className="config-section">
              <label>
                Storage (GB)
                <input
                  type="number"
                  value={(config as SearchIndexConfig).storageGB || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      storageGB: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 500"
                />
              </label>
              <label>
                Max Connections
                <input
                  type="number"
                  value={(config as SearchIndexConfig).maxConnections || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxConnections: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 5000"
                />
              </label>
              <label>
                Index Size (documents)
                <input
                  type="number"
                  value={(config as SearchIndexConfig).indexSize || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      indexSize: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 1000000000"
                />
              </label>
            </div>
          )}

          {/* Object Storage-specific fields */}
          {nodeType === "objectstorage" && (
            <div className="config-section">
              <label>
                Storage (GB)
                <input
                  type="number"
                  value={(config as ObjectStorageConfig).storageGB || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      storageGB: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 10000"
                />
              </label>
              <label>
                Max Connections
                <input
                  type="number"
                  value={(config as ObjectStorageConfig).maxConnections || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxConnections: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 10000"
                />
              </label>
              <label>
                Durability (%)
                <input
                  type="number"
                  step="0.01"
                  value={(config as ObjectStorageConfig).durability || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      durability: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 99.99"
                />
              </label>
            </div>
          )}

          {nodeType === "circuitbreaker" && (
            <div className="config-section">
              <label>
                Error Threshold (0-1)
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={(config as CircuitBreakerConfig).errorThreshold ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      errorThreshold: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 0.2"
                />
              </label>
              <label>
                Latency Threshold (ms)
                <input
                  type="number"
                  value={(config as CircuitBreakerConfig).latencyThresholdMs ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      latencyThresholdMs: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 200"
                />
              </label>
              <label>
                Reset Timeout (seconds)
                <input
                  type="number"
                  value={(config as CircuitBreakerConfig).resetTimeoutSeconds ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      resetTimeoutSeconds: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g., 30"
                />
              </label>
            </div>
          )}

          {/* Calculated metrics for User nodes */}
          {nodeType === "user" && (config as UserConfig).daus && (config as UserConfig).messageSizeBytes && (
            <div className="config-metrics">
              <h4>Calculated Metrics</h4>
              <div className="metric-item">
                <span>Peak QPS (assuming 10% of DAUs active):</span>
                <strong>{Math.round(((config as UserConfig).daus! * 0.1) / 86400).toLocaleString()}/s</strong>
              </div>
              <div className="metric-item">
                <span>Peak RPS (assuming 10% of DAUs active):</span>
                <strong>{Math.round(((config as UserConfig).daus! * 0.1) / 86400).toLocaleString()}/s</strong>
              </div>
              <div className="metric-item">
                <span>Peak Bandwidth (QPS × msg size):</span>
                <strong>
                  {(((config as UserConfig).daus! * 0.1 * (config as UserConfig).messageSizeBytes!) / 86400 / 1024 / 1024).toFixed(2)} MB/s
                </strong>
              </div>
            </div>
          )}

          {/* Calculated metrics for Queue nodes */}
          {nodeType === "queue" && (config as QueueConfig).throughputRate && (config as QueueConfig).messageSizeBytes && (
            <div className="config-metrics">
              <h4>Calculated Metrics</h4>
              <div className="metric-item">
                <span>Bandwidth (throughput × msg size):</span>
                <strong>
                  {(((config as QueueConfig).throughputRate! * (config as QueueConfig).messageSizeBytes!) / 1024 / 1024).toFixed(2)} MB/s
                </strong>
              </div>
              {(config as QueueConfig).maxQueueDepth && (
                <div className="metric-item">
                  <span>Max Queue Storage:</span>
                  <strong>
                    {(((config as QueueConfig).maxQueueDepth! * (config as QueueConfig).messageSizeBytes!) / 1024 / 1024 / 1024).toFixed(2)} GB
                  </strong>
                </div>
              )}
              {(config as QueueConfig).processingRate && (config as QueueConfig).throughputRate && (
                <div className="metric-item">
                  <span>Processing Backlog Rate:</span>
                  <strong>
                    {((config as QueueConfig).throughputRate! - (config as QueueConfig).processingRate!).toLocaleString()} msg/s
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="config-footer">
          <button className="config-button config-button-primary" onClick={handleSave}>
            Save
          </button>
          <button className="config-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfigPanel;
