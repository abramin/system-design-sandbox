import { useCallback, useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import type { ReactElement } from "react";
import UserIcon from "./components/actor";
import CdnIcon from "./components/cdn";
import LoadBalancerIcon from "./components/load-balancer";
import ApiGatewayIcon from "./components/api-gateway";
import ServiceIcon from "./components/service";
import CacheIcon from "./components/cache";
import QueueIcon from "./components/queue";
import MessageBrokerIcon from "./components/message-broker";
import DatabaseIcon from "./components/db";
import SearchIcon from "./components/search";
import MetricsCollectorIcon from "./components/metrics-collector";
import LogAggregatorIcon from "./components/log-aggregator";
import TracingServiceIcon from "./components/tracing-service";
import ServiceMeshIcon from "./components/service-mesh";
import ObjectStorageTierIcon from "./components/object-storage-tier";
import AnalyticsWarehouseIcon from "./components/analytics-warehouse";
import StreamProcessorIcon from "./components/stream-processor";
import NotificationServiceIcon from "./components/notification-service";
import RealtimeGatewayIcon from "./components/realtime-gateway";
import EdgeComputeIcon from "./components/edge-compute";
import CircuitBreakerIcon from "./components/circuit-breaker";
import TrafficProfilePanel from "./components/traffic-profile-panel";
import ScenarioPanel from "./components/scenario-panel";
import MetricsDashboard, { type NodeInsight } from "./components/metrics-dashboard";
import GuideView from "./components/guide-view";
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  Handle,
  Position
} from "reactflow";
import type { Node, Edge, Connection, ReactFlowInstance, NodeProps } from "reactflow";
import "reactflow/dist/style.css";
import "./App.css";
import type {
  TrafficProfile,
  ScenarioEvent,
  ScenarioImpact,
  MonitoringSummary,
  NodeHealthStatus,
  CapacityUsage,
  CapacityUsageType,
} from "./types/system";

type IconComponent = () => ReactElement;

interface SystemTemplate {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

interface MessageFlowStep {
  label: string;
  description?: string;
}

interface MessageFlow {
  id: string;
  name: string;
  description: string;
  type: "read" | "write" | "stream";
  messageSizeBytes: number;
  steps: MessageFlowStep[];
}

const componentIcons: Record<string, IconComponent> = {
  User: UserIcon,
  CDN: CdnIcon,
  "Load Balancer": LoadBalancerIcon,
  "API Gateway": ApiGatewayIcon,
  Service: ServiceIcon,
  Cache: CacheIcon,
  Queue: QueueIcon,
  "Message Broker": MessageBrokerIcon,
  Database: DatabaseIcon,
  DB: DatabaseIcon,
  "Search Index": SearchIcon,
  "Metrics Collector": MetricsCollectorIcon,
  "Log Aggregator": LogAggregatorIcon,
  "Tracing Service": TracingServiceIcon,
  "Service Mesh": ServiceMeshIcon,
  "Object Storage Tier": ObjectStorageTierIcon,
  "Analytics Warehouse": AnalyticsWarehouseIcon,
  "Stream Processor": StreamProcessorIcon,
  "Notification Service": NotificationServiceIcon,
  "Realtime Gateway": RealtimeGatewayIcon,
  "Edge Compute": EdgeComputeIcon,
  "Circuit Breaker": CircuitBreakerIcon,
};

const defaultTrafficProfile: TrafficProfile = {
  baseDAUs: 1000000,
  peakPercent: 10,
  writeRatio: 0.2,
  messageSizeBytes: 1024,
  bursts: [
    { label: "Morning Rush", multiplier: 1.5, durationSeconds: 1800 },
    { label: "Evening Peak", multiplier: 2.0, durationSeconds: 2400 },
  ],
  description: "Default steady profile with two peaks",
};

const defaultLatencies: Record<string, number> = {
  User: 5,
  CDN: 8,
  "API Gateway": 20,
  "Load Balancer": 10,
  Service: 30,
  Cache: 12,
  Queue: 5,
  "Message Broker": 8,
  Database: 50,
  DB: 50,
  "Search Index": 45,
  "Object Storage": 80,
  "Object Storage Tier": 80,
  "Metrics Collector": 25,
  "Log Aggregator": 35,
  "Tracing Service": 40,
  "Service Mesh": 15,
  "Analytics Warehouse": 120,
  "Stream Processor": 40,
  "Notification Service": 60,
  "Realtime Gateway": 25,
  "Edge Compute": 15,
};

const DEFAULT_REQUESTS_PER_USER_PER_DAY = 20;

let scenarioEventIdCounter = 1;

// Context for node configuration handler
const NodeConfigureContext = createContext<((nodeId: string) => void) | null>(null);
const NodeRenameContext = createContext<((nodeId: string, displayLabel: string) => void) | null>(
  null
);

// Configuration types
interface UserConfig {
  daus?: number; // Daily Active Users
  messageSizeBytes?: number; // Message size in bytes (for QPS/RPS calculation)
  latencyMs?: number;
  errorRate?: number;
}

interface LoadBalancerConfig {
  algorithm?: string; // "round-robin" | "least-connections" | "weighted"
  healthCheckInterval?: number; // seconds
  maxConnections?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

interface ServiceConfig {
  maxConnections?: number;
  messageSizeBytes?: number; // Optional: for calculating bandwidth
  instances?: number; // Number of service instances
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

interface QueueConfig {
  throughputRate?: number; // messages per second
  messageSizeBytes?: number; // Average message size in bytes
  maxQueueDepth?: number; // Maximum number of messages in queue
  retentionHours?: number; // How long messages are retained
  processingRate?: number; // Messages processed per second
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

interface CacheConfig {
  storageGB?: number;
  maxConnections?: number;
  hitRate?: number; // Cache hit rate percentage (0-100)
  ttl?: number; // Time to live in seconds
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
  costPerGbMonthUsd?: number;
}

interface DatabaseConfig {
  storageGB?: number;
  maxConnections?: number;
  readWriteSplit?: boolean; // Whether read/write splitting is enabled
  replicationFactor?: number; // Number of replicas
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
  costPerGbMonthUsd?: number;
}

interface CDNConfig {
  cacheHitRate?: number; // CDN cache hit rate percentage (0-100)
  edgeLocations?: number; // Number of edge locations
  bandwidthGBps?: number; // Bandwidth capacity in GB/s
  latencyMs?: number;
  errorRate?: number;
  costPerGbTransferUsd?: number;
}

interface MessageBrokerConfig {
  throughputRate?: number; // messages per second
  messageSizeBytes?: number;
  maxConnections?: number;
  retentionHours?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

interface SearchIndexConfig {
  storageGB?: number;
  maxConnections?: number;
  indexSize?: number; // Number of documents indexed
  latencyMs?: number;
  errorRate?: number;
  costPerQueryUsd?: number;
}

interface ObjectStorageConfig {
  storageGB?: number;
  maxConnections?: number;
  durability?: number; // Durability percentage (99.9, 99.99, etc.)
  latencyMs?: number;
  errorRate?: number;
  costPerGbMonthUsd?: number;
}

interface APIGatewayConfig {
  maxConnections?: number;
  rateLimit?: number; // Requests per second
  timeout?: number; // Request timeout in seconds
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

interface MetricsCollectorConfig {
  throughputRate?: number;
  storageGB?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

interface LogAggregatorConfig {
  ingestionRate?: number;
  retentionDays?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerGbMonthUsd?: number;
}

interface TracingServiceConfig {
  spanRate?: number;
  storageGB?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

interface ServiceMeshConfig {
  maxConnections?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

interface AnalyticsWarehouseConfig {
  querySlots?: number;
  storageGB?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerQueryUsd?: number;
}

interface StreamProcessorConfig {
  throughputRate?: number;
  stateStoreGB?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

interface NotificationServiceConfig {
  throughputRate?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

interface RealtimeGatewayConfig {
  maxConnections?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerConnectionUsd?: number;
}

interface EdgeComputeConfig {
  regions?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerInvocationUsd?: number;
}

interface CircuitBreakerConfig {
  errorThreshold?: number;
  latencyThresholdMs?: number;
  resetTimeoutSeconds?: number;
}

type NodeConfig = 
  | UserConfig 
  | LoadBalancerConfig 
  | ServiceConfig 
  | QueueConfig 
  | CacheConfig 
  | DatabaseConfig
  | CDNConfig
  | MessageBrokerConfig
  | SearchIndexConfig
  | ObjectStorageConfig
  | APIGatewayConfig
  | MetricsCollectorConfig
  | LogAggregatorConfig
  | TracingServiceConfig
  | ServiceMeshConfig
  | AnalyticsWarehouseConfig
  | StreamProcessorConfig
  | NotificationServiceConfig
  | RealtimeGatewayConfig
  | EdgeComputeConfig
  | CircuitBreakerConfig;

const capacityTypeLabels: Record<Exclude<CapacityUsageType, "none">, string> = {
  connections: "Connections",
  rate: "Rate Limit",
  bandwidth: "Bandwidth",
  throughput: "Throughput",
  storage: "Storage",
  queueDepth: "Queue Depth",
};

let edgeIdCounter = 1;

// Function to get C4 symbol for component type
function getC4Symbol(label: string): string {
  switch (label) {
    case "User":
      return "👤";
    case "CDN":
      return "☁️";
    case "Load Balancer":
      return "⚖️";
    case "API Gateway":
      return "🚪";
    case "Service":
      return "⚙️";
    case "Cache":
      return "💾";
    case "Queue":
      return "📬";
    case "Message Broker":
      return "📨";
    case "Database":
    case "DB":
      return "🗄️";
    case "Search Index":
      return "🔍";
    case "Object Storage":
      return "📦";
    default:
      return "▢";
  }
}

const CAPACITY_NONE: CapacityUsage = { percentage: 0, type: "none" };

const formatCapacityLabel = (usage: CapacityUsage) => {
  if (usage.label) return usage.label;
  if (usage.type === "none") {
    return "Capacity";
  }
  return capacityTypeLabels[usage.type] || "Capacity";
};

const getInstanceMultiplier = (config: NodeConfig): number => {
  if ("instances" in config && typeof config.instances === "number" && config.instances > 0) {
    return config.instances;
  }
  return 1;
};

const createUsage = (
  current: number,
  limit: number,
  type: CapacityUsageType,
  label?: string,
  unit?: string
): CapacityUsage => {
  if (!limit || !Number.isFinite(limit) || limit <= 0) {
    return CAPACITY_NONE;
  }
  const percentage = Math.min((current / limit) * 100, 100);
  return {
    percentage: Number.isFinite(percentage) ? Math.max(0, percentage) : 0,
    type,
    current,
    limit,
    unit,
    label,
  };
};

const baselineImpact: ScenarioImpact = {
  status: "healthy",
  throughputMultiplier: 1,
  latencyMultiplier: 1,
  errorRateDelta: 0,
};

const deriveScenarioImpacts = (events: ScenarioEvent[], clock: number): Record<string, ScenarioImpact> => {
  const map: Record<string, ScenarioImpact> = {};
  events.forEach((event) => {
    if (!event.triggered) {
      return;
    }
    const windowEnd = event.startTime + event.durationSeconds;
    if (clock < event.startTime || clock >= windowEnd) {
      return;
    }
    const existing = map[event.targetId] ? { ...map[event.targetId] } : { ...baselineImpact };
    const severityRatio = Math.min(Math.max(event.severity, 0), 100) / 100;
    if (event.type === "outage") {
      existing.status = "down";
      existing.throughputMultiplier = 0;
      existing.latencyMultiplier = Math.max(existing.latencyMultiplier, 3);
      existing.errorRateDelta = Math.max(existing.errorRateDelta, 0.5);
    } else if (event.type === "throttle") {
      existing.status = existing.status === "down" ? "down" : "degraded";
      const throttleMultiplier = Math.max(0, 1 - severityRatio * 0.85);
      existing.throughputMultiplier = Math.min(existing.throughputMultiplier, throttleMultiplier);
    } else if (event.type === "latency_spike") {
      existing.status = existing.status === "down" ? "down" : "degraded";
      existing.latencyMultiplier = Math.max(existing.latencyMultiplier, 1 + severityRatio * 3);
    } else if (event.type === "error_spike") {
      existing.status = existing.status === "down" ? "down" : "degraded";
      existing.errorRateDelta = Math.min(1, existing.errorRateDelta + severityRatio * 0.03);
    }
    map[event.targetId] = existing;
  });
  return map;
};

const getNumericConfigValue = (config: NodeConfig | undefined, key: string): number | undefined => {
  if (!config) return undefined;
  const value = (config as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
};

const BYTES_PER_GB = 1024 * 1024 * 1024;
const DEFAULT_STORAGE_RETENTION_SECONDS = 24 * 3600;

const estimateStorageUsageGB = (
  label: string,
  config: NodeConfig,
  nodeQPS: number,
  messageSizeBytes: number
): number | undefined => {
  if (!("storageGB" in config) || !config.storageGB) {
    return undefined;
  }

  let retentionSeconds = DEFAULT_STORAGE_RETENTION_SECONDS;
  let writeRatio = 0.5;

  if (label === "Cache") {
    const cacheConfig = config as CacheConfig;
    retentionSeconds = cacheConfig.ttl ?? 3600;
    const hitRate = cacheConfig.hitRate ?? 80;
    writeRatio = Math.max(0, (100 - hitRate) / 100);
  } else if (label === "Database" || label === "DB") {
    writeRatio = 0.2;
  } else if (label === "Object Storage") {
    retentionSeconds = 7 * 24 * 3600;
    writeRatio = 0.7;
  } else if (label === "Search Index") {
    retentionSeconds = 3 * 24 * 3600;
    writeRatio = 0.5;
  }

  const writesPerSecond = Math.max(0, nodeQPS * writeRatio);
  if (writesPerSecond === 0) {
    return 0;
  }

  const bytesStored = writesPerSecond * messageSizeBytes * retentionSeconds;
  const usageGB = bytesStored / BYTES_PER_GB;
  return Math.min(config.storageGB, usageGB);
};

const estimateQueueDepth = (config: QueueConfig, incomingQPS: number): number | undefined => {
  if (!config.processingRate && !config.maxQueueDepth && !config.throughputRate) {
    return undefined;
  }

  const processingRate = config.processingRate ?? config.throughputRate ?? incomingQPS;
  const backlogRate = Math.max(0, incomingQPS - processingRate);

  if (backlogRate === 0) {
    return 0;
  }

  const estimatedDepth = Math.round(backlogRate * 60); // assume 1-minute accumulation window
  if (!config.maxQueueDepth) {
    return estimatedDepth;
  }

  return Math.min(config.maxQueueDepth, estimatedDepth);
};

interface RuntimeMetrics {
  nodeQPS: number;
  nodeBandwidthMBps: number;
  nodeQueueDepth?: number;
  nodeStorageUsageGB?: number;
  nodeLatencyMs?: number;
}

// Function to calculate capacity usage percentage
function calculateCapacityUsage(
  label: string,
  config: NodeConfig | undefined,
  metrics: RuntimeMetrics
): CapacityUsage {
  if (!config) return CAPACITY_NONE;

  const { nodeQPS, nodeBandwidthMBps, nodeQueueDepth, nodeStorageUsageGB, nodeLatencyMs } = metrics;
  const safeNodeQPS = Math.max(nodeQPS, 0);
  const estimatedConcurrency = (latencyOverrideMs?: number) => {
    const fallbackLatency =
      latencyOverrideMs ?? nodeLatencyMs ?? defaultLatencies[label] ?? 50;
    const latencySeconds = Math.max(fallbackLatency / 1000, 0.001);
    return safeNodeQPS * latencySeconds;
  };

  if (label === "CDN" && "bandwidthGBps" in config && config.bandwidthGBps) {
    const maxBandwidthMBps = config.bandwidthGBps * 1024;
    return createUsage(nodeBandwidthMBps, maxBandwidthMBps, "bandwidth", "Bandwidth", "MB/s");
  }

  if (label === "API Gateway" && "rateLimit" in config && config.rateLimit) {
    return createUsage(safeNodeQPS, config.rateLimit, "rate", "Rate Limit", "req/s");
  }

  if (label === "Queue") {
    const queueConfig = config as QueueConfig;
    if (queueConfig.maxQueueDepth && nodeQueueDepth !== undefined) {
      return createUsage(nodeQueueDepth, queueConfig.maxQueueDepth, "queueDepth", "Queue Depth", "msg");
    }
    if (queueConfig.throughputRate) {
      const limit = queueConfig.processingRate
        ? Math.min(queueConfig.throughputRate, queueConfig.processingRate)
        : queueConfig.throughputRate;
      return createUsage(safeNodeQPS, limit, "throughput", "Throughput", "msg/s");
    }
    if (queueConfig.processingRate) {
      return createUsage(safeNodeQPS, queueConfig.processingRate, "throughput", "Processing", "msg/s");
    }
  }

  if (label === "Message Broker" && "throughputRate" in config && config.throughputRate) {
    return createUsage(safeNodeQPS, config.throughputRate, "throughput", "Throughput", "msg/s");
  }

  if (label === "Stream Processor" && "throughputRate" in config && config.throughputRate) {
    return createUsage(safeNodeQPS, config.throughputRate, "throughput", "Processing", "msg/s");
  }

  if (label === "Notification Service" && "throughputRate" in config && config.throughputRate) {
    return createUsage(safeNodeQPS, config.throughputRate, "throughput", "Delivery", "msg/s");
  }

  if (label === "Analytics Warehouse" && "querySlots" in config && config.querySlots) {
    const currentSlots = estimatedConcurrency(getNumericConfigValue(config, "latencyMs"));
    return createUsage(currentSlots, config.querySlots, "connections", "Query Slots", "slots");
  }

  if ("maxConnections" in config && config.maxConnections) {
    const multiplier = getInstanceMultiplier(config);
    const effectiveMax = config.maxConnections * multiplier;
    const currentConnections = estimatedConcurrency(getNumericConfigValue(config, "latencyMs"));
    return createUsage(currentConnections, effectiveMax, "connections", "Connections", "conn");
  }

  if ("storageGB" in config && config.storageGB) {
    if (nodeStorageUsageGB !== undefined) {
      return createUsage(nodeStorageUsageGB, config.storageGB, "storage", "Storage", "GB");
    }
    // Without a live usage metric, fall back to showing provisioned storage.
    return {
      percentage: 0,
      type: "storage",
      current: 0,
      limit: config.storageGB,
      unit: "GB",
      label: "Storage",
    };
  }

  return CAPACITY_NONE;
}

const getMitigationSuggestion = (label: string): string => {
  switch (label) {
    case "Cache":
      return "Scale cache nodes or adjust TTL to improve hit rates.";
    case "Queue":
      return "Add more workers or increase queue processing throughput.";
    case "Service":
      return "Scale service instances or shard responsibilities.";
    case "Database":
    case "DB":
      return "Add read replicas or enable connection pooling.";
    case "Message Broker":
      return "Partition the broker topic or add broker nodes.";
    case "Stream Processor":
      return "Increase partition parallelism or optimize state stores.";
    case "Analytics Warehouse":
      return "Add query slots or pre-aggregate data before ingestion.";
    case "Notification Service":
      return "Scale delivery workers or batch notification sends.";
    default:
      return "Scale this component or introduce a buffering tier.";
  }
};

// Custom Node Component
function CustomNode({ data, selected, id }: NodeProps) {
  const config = data.config as NodeConfig | undefined;
  const label = data.label as string;
  const displayLabel = (data.displayLabel as string) || label;
  const IconComponent = componentIcons[label];
  const onConfigure = useContext(NodeConfigureContext);
  const onRename = useContext(NodeRenameContext);
  const nodeQPS = (data.nodeQPS as number) || 0;
  const nodeBandwidthMBps = (data.nodeBandwidthMBps as number) || 0;
  const nodeQueueDepth = data.nodeQueueDepth as number | undefined;
  const nodeStorageUsageGB = data.nodeStorageUsageGB as number | undefined;
  const nodeLatencyMs = data.nodeLatencyMs as number | undefined;
  const nodeErrorRate = data.nodeErrorRate as number | undefined;
  const nodeCostUsd = data.nodeCostUsd as number | undefined;
  const nodeStatus = (data.nodeStatus as NodeHealthStatus) || "healthy";
  const flowState = (data.flowState as "active" | "trail" | undefined) || null;
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [pendingLabel, setPendingLabel] = useState(displayLabel);

  useEffect(() => {
    setPendingLabel(displayLabel);
  }, [displayLabel]);
  
  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return "N/A";
    if (Number.isNaN(num)) return "N/A";
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const formatStorage = (gb?: number) => {
    if (gb === undefined || gb === null) return "N/A";
    if (Number.isNaN(gb)) return "N/A";
    if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
    if (gb >= 10) return `${Math.round(gb)} GB`;
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${gb.toFixed(2)} GB`;
  };

  const formatCapacityValue = (value?: number, unit?: string) => {
    if (value === undefined) return "N/A";
    const formatted = Number.isFinite(value) ? formatNumber(value) : "∞";
    return unit ? `${formatted} ${unit}` : formatted;
  };

  const handleConfigureClick = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onConfigure && id) {
      onConfigure(id);
    }
  };

  const commitLabelChange = () => {
    if (!id || !onRename) {
      setIsEditingLabel(false);
      return;
    }
    onRename(id, pendingLabel);
    setIsEditingLabel(false);
  };

  const cancelLabelEdit = () => {
    setPendingLabel(displayLabel);
    setIsEditingLabel(false);
  };

  const handleLabelKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitLabelChange();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelLabelEdit();
    }
  };

  const handleStartEditing = (event: React.MouseEvent | React.PointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setIsEditingLabel(true);
  };

  const capacityUsage = calculateCapacityUsage(label, config, {
    nodeQPS,
    nodeBandwidthMBps,
    nodeQueueDepth,
    nodeStorageUsageGB,
    nodeLatencyMs,
  });
  const capacityLabelText = formatCapacityLabel(capacityUsage);
  
  // Calculate color gradient from green (0%) to red (100%)
  const getCapacityColor = (percentage: number) => {
    if (percentage === 0) return "#e0e0e0";
    const r = Math.min(255, Math.round(percentage * 2.55));
    const g = Math.max(0, Math.round(255 - percentage * 2.55));
    return `rgb(${r}, ${g}, 0)`;
  };

  const capacityColor = getCapacityColor(capacityUsage.percentage);

  return (
    <div
      className={`custom-node ${selected ? "selected" : ""} node-state-${nodeStatus} ${flowState ? `flow-${flowState}` : ""}`}
      data-type={label}
      data-status={nodeStatus}
      data-flow-state={flowState || "none"}
    >
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span className={`node-status node-status-${nodeStatus}`} />
        <div className="node-icon">
          {IconComponent ? <IconComponent /> : getC4Symbol(label)}
        </div>
        <div className={`node-label ${isEditingLabel ? "node-label-editing" : ""}`}>
          {isEditingLabel ? (
            <input
              className="node-label-input"
              type="text"
              value={pendingLabel}
              onChange={(e) => setPendingLabel(e.target.value)}
              onBlur={commitLabelChange}
              onKeyDown={handleLabelKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <div className="node-label-wrapper">
              <span className="node-label-text">{displayLabel}</span>
              {onRename && (
                <button
                  type="button"
                  className="node-label-edit-button"
                  onClick={handleStartEditing}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Rename component"
                >
                  ✎
                </button>
              )}
            </div>
          )}
        </div>
        <button 
          className="node-configure-button"
          onClick={handleConfigureClick}
          onPointerDown={handleConfigureClick}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          title="Configure node"
          type="button"
        >
          ⚙️
        </button>
      </div>
      {capacityUsage.type !== "none" && (
        <div className="node-capacity">
          <div className="capacity-label">
            {capacityLabelText}: {capacityUsage.percentage.toFixed(1)}%
          </div>
          <div className="capacity-bar-container">
            <div 
              className="capacity-bar"
              style={{
                width: `${Math.min(capacityUsage.percentage, 100)}%`,
                backgroundColor: capacityColor,
              }}
            />
          </div>
          {capacityUsage.limit !== undefined && capacityUsage.current !== undefined && (
            <div className="capacity-detail">
              {formatCapacityValue(capacityUsage.current, capacityUsage.unit)} /{" "}
              {formatCapacityValue(capacityUsage.limit, capacityUsage.unit)}
            </div>
          )}
        </div>
      )}
      {config && Object.keys(config).length > 0 && (
        <div className="node-info">
          {/* User node display */}
          {"daus" in config && config.daus && (
            <div className="info-item">
              <span className="info-label">DAUs:</span>
              <span className="info-value">{formatNumber(config.daus)}</span>
            </div>
          )}
          {"messageSizeBytes" in config && config.messageSizeBytes && (
            <div className="info-item">
              <span className="info-label">Msg Size:</span>
              <span className="info-value">{formatNumber(config.messageSizeBytes)}B</span>
            </div>
          )}
          {/* Service, Cache, Database - Max Connections */}
          {"maxConnections" in config && config.maxConnections && (
            <div className="info-item">
              <span className="info-label">Max Conn:</span>
              <span className="info-value">{formatNumber(config.maxConnections)}</span>
            </div>
          )}
          {/* Queue - Throughput */}
          {"throughputRate" in config && config.throughputRate && (
            <div className="info-item">
              <span className="info-label">Throughput:</span>
              <span className="info-value">{formatNumber(config.throughputRate)}/s</span>
            </div>
          )}
          {/* Queue - Max Depth */}
          {"maxQueueDepth" in config && config.maxQueueDepth && (
            <div className="info-item">
              <span className="info-label">Max Depth:</span>
              <span className="info-value">{formatNumber(config.maxQueueDepth)}</span>
            </div>
          )}
          {"maxQueueDepth" in config && config.maxQueueDepth && nodeQueueDepth !== undefined && (
            <div className="info-item">
              <span className="info-label">Depth:</span>
              <span className="info-value">{formatNumber(nodeQueueDepth)}</span>
            </div>
          )}
          {/* Queue - Processing Rate */}
          {"processingRate" in config && config.processingRate && (
            <div className="info-item">
              <span className="info-label">Process:</span>
              <span className="info-value">{formatNumber(config.processingRate)}/s</span>
            </div>
          )}
          {/* Queue - Retention */}
          {"retentionHours" in config && config.retentionHours && (
            <div className="info-item">
              <span className="info-label">Retention:</span>
              <span className="info-value">{config.retentionHours}h</span>
            </div>
          )}
          {/* Service - Instances */}
          {"instances" in config && config.instances && (
            <div className="info-item">
              <span className="info-label">Instances:</span>
              <span className="info-value">{config.instances}</span>
            </div>
          )}
          {/* Cache - Hit Rate */}
          {"hitRate" in config && config.hitRate && (
            <div className="info-item">
              <span className="info-label">Hit Rate:</span>
              <span className="info-value">{config.hitRate}%</span>
            </div>
          )}
          {/* Cache - TTL */}
          {"ttl" in config && config.ttl && (
            <div className="info-item">
              <span className="info-label">TTL:</span>
              <span className="info-value">{config.ttl}s</span>
            </div>
          )}
          {/* Database - Replication */}
          {"replicationFactor" in config && config.replicationFactor && (
            <div className="info-item">
              <span className="info-label">Replicas:</span>
              <span className="info-value">{config.replicationFactor}</span>
            </div>
          )}
          {/* Database - Read/Write Split */}
          {"readWriteSplit" in config && config.readWriteSplit && (
            <div className="info-item">
              <span className="info-label">R/W Split:</span>
              <span className="info-value">Yes</span>
            </div>
          )}
          {/* Load Balancer - Algorithm */}
          {"algorithm" in config && config.algorithm && (
            <div className="info-item">
              <span className="info-label">Algorithm:</span>
              <span className="info-value">{config.algorithm}</span>
            </div>
          )}
          {/* API Gateway - Rate Limit */}
          {"rateLimit" in config && config.rateLimit && (
            <div className="info-item">
              <span className="info-label">Rate Limit:</span>
              <span className="info-value">{formatNumber(config.rateLimit)}/s</span>
            </div>
          )}
          {/* CDN - Hit Rate */}
          {"cacheHitRate" in config && config.cacheHitRate && (
            <div className="info-item">
              <span className="info-label">CDN Hit:</span>
              <span className="info-value">{config.cacheHitRate}%</span>
            </div>
          )}
          {/* CDN - Edge Locations */}
          {"edgeLocations" in config && config.edgeLocations && (
            <div className="info-item">
              <span className="info-label">Edges:</span>
              <span className="info-value">{config.edgeLocations}</span>
            </div>
          )}
          {/* Search Index - Index Size */}
          {"indexSize" in config && config.indexSize && (
            <div className="info-item">
              <span className="info-label">Docs:</span>
              <span className="info-value">{formatNumber(config.indexSize)}</span>
            </div>
          )}
          {/* Object Storage - Durability */}
          {"durability" in config && config.durability && (
            <div className="info-item">
              <span className="info-label">Durability:</span>
              <span className="info-value">{config.durability}%</span>
            </div>
          )}
          {/* Cache, Database, Search Index, Object Storage - Storage */}
          {"storageGB" in config && config.storageGB && (
            <div className="info-item">
              <span className="info-label">Storage:</span>
              <span className="info-value">
                {nodeStorageUsageGB !== undefined
                  ? `${formatStorage(nodeStorageUsageGB)} / ${formatStorage(config.storageGB)}`
                  : formatStorage(config.storageGB)}
              </span>
            </div>
          )}
          {nodeLatencyMs !== undefined && (
            <div className="info-item">
              <span className="info-label">Latency:</span>
              <span className="info-value">{nodeLatencyMs.toFixed(1)} ms</span>
            </div>
          )}
          {nodeErrorRate !== undefined && (
            <div className="info-item">
              <span className="info-label">Errors:</span>
              <span className="info-value">{(nodeErrorRate * 100).toFixed(2)}%</span>
            </div>
          )}
          {nodeCostUsd !== undefined && nodeCostUsd > 0 && (
            <div className="info-item">
              <span className="info-label">Monthly Cost:</span>
              <span className="info-value">${nodeCostUsd.toFixed(0)}</span>
            </div>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// Function to get default config for a component type
function getDefaultConfig(label: string): NodeConfig {
  switch (label) {
    case "User":
      return {
        daus: 1000000, // 1M DAUs
        messageSizeBytes: 1024, // 1KB
        latencyMs: 5,
        errorRate: 0.0001,
      } as UserConfig;
    case "CDN":
      return {
        cacheHitRate: 95,
        edgeLocations: 200,
        bandwidthGBps: 100,
        latencyMs: 8,
        errorRate: 0.0005,
        costPerGbTransferUsd: 0.02,
      } as CDNConfig;
    case "Load Balancer":
      return {
        algorithm: "round-robin",
        healthCheckInterval: 30,
        maxConnections: 100000,
        latencyMs: 10,
        errorRate: 0.0002,
        costPerRequestUsd: 0.00005,
      } as LoadBalancerConfig;
    case "API Gateway":
      return {
        maxConnections: 100000,
        rateLimit: 10000,
        timeout: 30,
        latencyMs: 20,
        errorRate: 0.0005,
        costPerRequestUsd: 0.0005,
      } as APIGatewayConfig;
    case "Service":
      return {
        maxConnections: 10000,
        instances: 5,
        messageSizeBytes: 1024,
        latencyMs: 35,
        errorRate: 0.001,
        costPerRequestUsd: 0.0003,
      } as ServiceConfig;
    case "Cache":
      return {
        storageGB: 100,
        maxConnections: 10000,
        hitRate: 80,
        ttl: 3600,
        latencyMs: 12,
        errorRate: 0.0003,
        costPerRequestUsd: 0.0001,
        costPerGbMonthUsd: 0.15,
      } as CacheConfig;
    case "Queue":
      return {
        throughputRate: 10000,
        messageSizeBytes: 1024,
        maxQueueDepth: 1000000,
        retentionHours: 24,
        processingRate: 5000,
        latencyMs: 5,
        errorRate: 0.0001,
        costPerRequestUsd: 0.00005,
      } as QueueConfig;
    case "Message Broker":
      return {
        throughputRate: 50000,
        messageSizeBytes: 1024,
        maxConnections: 10000,
        retentionHours: 168,
        latencyMs: 8,
        errorRate: 0.0002,
        costPerRequestUsd: 0.00008,
      } as MessageBrokerConfig;
    case "Database":
    case "DB":
      return {
        storageGB: 1000,
        maxConnections: 5000,
        replicationFactor: 3,
        readWriteSplit: false,
        latencyMs: 45,
        errorRate: 0.001,
        costPerRequestUsd: 0.0007,
        costPerGbMonthUsd: 0.25,
      } as DatabaseConfig;
    case "Search Index":
      return {
        storageGB: 500,
        maxConnections: 5000,
        indexSize: 1000000000,
        latencyMs: 60,
        errorRate: 0.001,
        costPerQueryUsd: 0.0009,
      } as SearchIndexConfig;
    case "Object Storage":
      return {
        storageGB: 10000,
        maxConnections: 10000,
        durability: 99.99,
        latencyMs: 80,
        errorRate: 0.0002,
        costPerGbMonthUsd: 0.02,
      } as ObjectStorageConfig;
    case "Metrics Collector":
      return {
        throughputRate: 500000,
        storageGB: 5000,
        latencyMs: 25,
        errorRate: 0.0005,
        costPerRequestUsd: 0.00002,
      } as MetricsCollectorConfig;
    case "Log Aggregator":
      return {
        ingestionRate: 200000,
        retentionDays: 14,
        latencyMs: 35,
        errorRate: 0.001,
        costPerGbMonthUsd: 0.05,
      } as LogAggregatorConfig;
    case "Tracing Service":
      return {
        spanRate: 100000,
        storageGB: 2000,
        latencyMs: 40,
        errorRate: 0.001,
        costPerRequestUsd: 0.00004,
      } as TracingServiceConfig;
    case "Service Mesh":
      return {
        maxConnections: 50000,
        latencyMs: 15,
        errorRate: 0.0003,
        costPerRequestUsd: 0.0001,
      } as ServiceMeshConfig;
    case "Object Storage Tier":
      return {
        storageGB: 20000,
        maxConnections: 5000,
        durability: 99.999,
        latencyMs: 90,
        errorRate: 0.0002,
        costPerGbMonthUsd: 0.01,
      } as ObjectStorageConfig;
    case "Analytics Warehouse":
      return {
        querySlots: 20,
        storageGB: 3000,
        latencyMs: 120,
        errorRate: 0.002,
        costPerQueryUsd: 0.005,
      } as AnalyticsWarehouseConfig;
    case "Stream Processor":
      return {
        throughputRate: 200000,
        stateStoreGB: 200,
        latencyMs: 40,
        errorRate: 0.0008,
        costPerRequestUsd: 0.0002,
      } as StreamProcessorConfig;
    case "Notification Service":
      return {
        throughputRate: 50000,
        latencyMs: 60,
        errorRate: 0.005,
        costPerRequestUsd: 0.0004,
      } as NotificationServiceConfig;
    case "Realtime Gateway":
      return {
        maxConnections: 200000,
        latencyMs: 25,
        errorRate: 0.001,
        costPerConnectionUsd: 0.0002,
      } as RealtimeGatewayConfig;
    case "Edge Compute":
      return {
        regions: 20,
        latencyMs: 15,
        errorRate: 0.0005,
        costPerInvocationUsd: 0.0008,
      } as EdgeComputeConfig;
    case "Circuit Breaker":
      return {
        errorThreshold: 0.2,
        latencyThresholdMs: 200,
        resetTimeoutSeconds: 30,
        latencyMs: 5,
        errorRate: 0.0001,
      } as CircuitBreakerConfig;
    default:
      return {};
  }
}

const createTemplateNode = (
  id: string,
  label: string,
  position: { x: number; y: number },
  configOverrides?: Partial<NodeConfig>,
  displayLabel?: string
): Node => {
  const baseConfig = getDefaultConfig(label);
  const mergedConfig = configOverrides ? { ...baseConfig, ...configOverrides } : baseConfig;
  return {
    id,
    type: "custom",
    position,
    data: {
      label,
      displayLabel,
      config: mergedConfig,
    },
  };
};

const createTemplateEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#007bff" },
});

const layoutNodesWithFlow = (
  nodes: Node[],
  edges: Edge[],
  availableWidth: number = 1200,
  availableHeight: number = 700
): Node[] => {
  if (nodes.length === 0) return nodes;

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 180;
  const HORIZONTAL_PADDING = 160;
  const VERTICAL_PADDING = 200;
  const MIN_HORIZONTAL_SPACING = NODE_WIDTH + HORIZONTAL_PADDING;
  const MIN_VERTICAL_SPACING = NODE_HEIGHT + VERTICAL_PADDING;

  const levelMap = new Map<string, number>();
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  nodes.forEach((node) => {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
    if (!indegree.has(edge.target)) {
      indegree.set(edge.target, 0);
    }
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  });

  const queue: string[] = [];
  indegree.forEach((deg, nodeId) => {
    if (deg === 0) {
      queue.push(nodeId);
      levelMap.set(nodeId, 0);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levelMap.get(current) ?? 0;
    const neighbors = adjacency.get(current) || [];
    neighbors.forEach((target) => {
      const nextLevel = Math.max(currentLevel + 1, levelMap.get(target) ?? 0);
      levelMap.set(target, nextLevel);
      indegree.set(target, (indegree.get(target) || 0) - 1);
      if ((indegree.get(target) || 0) <= 0) {
        queue.push(target);
      }
    });
  }

  // Assign levels to nodes that didn't appear in edges
  nodes.forEach((node) => {
    if (!levelMap.has(node.id)) {
      levelMap.set(node.id, levelMap.size);
    }
  });

  const levelGroups = new Map<number, Node[]>();
  nodes.forEach((node) => {
    const level = levelMap.get(node.id) ?? 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(node);
  });

  const levels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  const baseX = 80;
  const baseY = 60;
  const maxWidth = Math.max(availableWidth - 160, 600);
  const maxHeight = Math.max(availableHeight - 120, 400);
  const nodesPerColumn = Math.max(2, Math.floor(maxHeight / MIN_VERTICAL_SPACING));
  const levelColumns = new Map<number, { startColumn: number; columns: Node[][] }>();
  let runningColumnIndex = 0;

  levels.forEach((level) => {
    const groupNodes = levelGroups.get(level) || [];
    const sortedGroup = groupNodes.slice().sort((a, b) => {
      const catA = getNodeCategory(a.data.label as string | undefined) || "";
      const catB = getNodeCategory(b.data.label as string | undefined) || "";
      return catA.localeCompare(catB);
    });

    const chunkSize = Math.max(1, nodesPerColumn);
    const columns: Node[][] = [];
    if (sortedGroup.length === 0) {
      columns.push([]);
    } else {
      for (let i = 0; i < sortedGroup.length; i += chunkSize) {
        columns.push(sortedGroup.slice(i, i + chunkSize));
      }
    }

    levelColumns.set(level, {
      startColumn: runningColumnIndex,
      columns,
    });
    runningColumnIndex += Math.max(columns.length, 1);
  });

  const totalColumns = Math.max(runningColumnIndex, 1);
  const horizontalSpacing =
    totalColumns > 1
      ? Math.max(MIN_HORIZONTAL_SPACING, maxWidth / (totalColumns - 1))
      : MIN_HORIZONTAL_SPACING;
  const verticalSpacing = MIN_VERTICAL_SPACING;

  return nodes.map((node) => {
    const origLevel = levelMap.get(node.id) ?? levels[0] ?? 0;
    const columnMeta = levelColumns.get(origLevel);

    let absoluteColumnIndex = 0;
    let rowIndex = 0;

    if (columnMeta) {
      let found = false;
      for (let localColumn = 0; localColumn < columnMeta.columns.length; localColumn += 1) {
        const columnNodes = columnMeta.columns[localColumn];
        const idx = columnNodes.findIndex((n) => n.id === node.id);
        if (idx !== -1) {
          absoluteColumnIndex = columnMeta.startColumn + localColumn;
          rowIndex = idx;
          found = true;
          break;
        }
      }
      if (!found) {
        absoluteColumnIndex = columnMeta.startColumn;
        rowIndex = columnMeta.columns[0]?.length ?? 0;
      }
    }

    const x = baseX + absoluteColumnIndex * horizontalSpacing;
    const y = baseY + rowIndex * verticalSpacing;
    return {
      ...node,
      position: { x, y },
    };
  });
};

const messageFlows: MessageFlow[] = [
  {
    id: "whatsapp-send",
    name: "WhatsApp - Send Message",
    description: "Device sends encrypted message through gateways and brokers to storage.",
    type: "write",
    messageSizeBytes: 2048,
    steps: [
      { label: "API Gateway", description: "Accepts encrypted payload" },
      { label: "Service", description: "Business logic & auth" },
      { label: "Service Mesh", description: "Policy enforcement" },
      { label: "Message Broker", description: "Fan-out to recipients" },
      { label: "Queue", description: "Buffer for delivery services" },
      { label: "Service", description: "Delivery worker" },
      { label: "Database", description: "Store message history" },
    ],
  },
  {
    id: "url-create",
    name: "URL Shortener - Create Link",
    description: "Generate short code, persist, and update analytics stream.",
    type: "write",
    messageSizeBytes: 1024,
    steps: [
      { label: "API Gateway", description: "Receives create request" },
      { label: "Circuit Breaker" },
      { label: "Service", description: "Generates key, validates" },
      { label: "Cache", description: "Prime cache for hot reads" },
      { label: "Database", description: "Durable KV store" },
      { label: "Stream Processor", description: "Publish analytics event" },
      { label: "Analytics Warehouse", description: "Store aggregated metrics" },
    ],
  },
  {
    id: "youtube-upload",
    name: "YouTube - Video Upload",
    description: "Upload video, store, transcode, and index metadata.",
    type: "write",
    messageSizeBytes: 50 * 1024 * 1024,
    steps: [
      { label: "CDN" },
      { label: "Edge Compute", description: "Initial validation" },
      { label: "API Gateway" },
      { label: "Service Mesh" },
      { label: "Service", description: "Metadata creation" },
      { label: "Object Storage", description: "Store raw video" },
      { label: "Stream Processor", description: "Trigger transcoding" },
      { label: "Queue", description: "Transcode backlog" },
      { label: "Service", description: "Transcode worker" },
      { label: "Analytics Warehouse", description: "Usage metrics" },
      { label: "Search Index", description: "Index metadata for search" },
    ],
  },
  {
    id: "social-read",
    name: "Social Feed - Read Timeline",
    description: "Compose personalized feed leveraging caches and search.",
    type: "read",
    messageSizeBytes: 4096,
    steps: [
      { label: "API Gateway" },
      { label: "Load Balancer" },
      { label: "Service", description: "Feed assembly" },
      { label: "Cache", description: "Fan-out cache" },
      { label: "Search Index", description: "Fallback queries" },
      { label: "Service", description: "Post-processing" },
    ],
  },
  {
    id: "ecommerce-order",
    name: "E-commerce - Place Order",
    description: "Submit order, reserve inventory, update analytics.",
    type: "write",
    messageSizeBytes: 8192,
    steps: [
      { label: "API Gateway" },
      { label: "Circuit Breaker" },
      { label: "Service", description: "Checkout service" },
      { label: "Queue", description: "Order events" },
      { label: "Service", description: "Inventory worker" },
      { label: "Database", description: "Orders DB" },
      { label: "Analytics Warehouse" },
    ],
  },
];

const systemTemplates: SystemTemplate[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Messaging",
    description: "User → Edge → Messaging services with queue and storage.",
    nodes: [
      createTemplateNode("1", "User", { x: 50, y: 150 }),
      createTemplateNode("2", "CDN", { x: 220, y: 130 }),
      createTemplateNode("3", "API Gateway", { x: 390, y: 130 }),
      createTemplateNode("4", "Service", { x: 560, y: 90 }, { instances: 10 }),
      createTemplateNode("5", "Service Mesh", { x: 560, y: 190 }),
      createTemplateNode("6", "Message Broker", { x: 720, y: 140 }),
      createTemplateNode("7", "Queue", { x: 890, y: 120 }, { throughputRate: 200000 }),
      createTemplateNode("8", "Service", { x: 1060, y: 120 }, { instances: 20 }),
      createTemplateNode("9", "Database", { x: 1230, y: 80 }, { replicationFactor: 5 }),
      createTemplateNode("10", "Object Storage", { x: 1230, y: 180 }),
      createTemplateNode("11", "Metrics Collector", { x: 900, y: 260 }),
      createTemplateNode("12", "Circuit Breaker", { x: 740, y: 260 }),
    ],
    edges: [
      createTemplateEdge("e1-2", "1", "2"),
      createTemplateEdge("e2-3", "2", "3"),
      createTemplateEdge("e3-4", "3", "4"),
      createTemplateEdge("e3-5", "3", "5"),
      createTemplateEdge("e4-6", "4", "6"),
      createTemplateEdge("e5-6", "5", "6"),
      createTemplateEdge("e6-7", "6", "7"),
      createTemplateEdge("e7-8", "7", "8"),
      createTemplateEdge("e8-9", "8", "9"),
      createTemplateEdge("e8-10", "8", "10"),
      createTemplateEdge("e8-11", "8", "11"),
      createTemplateEdge("e11-12", "11", "12"),
      createTemplateEdge("e12-9", "12", "9"),
    ],
  },
  {
    id: "social-feed",
    name: "Social Feed",
    description: "API → Services → Cache/Search → Warehouse analytics.",
    nodes: [
      createTemplateNode("1", "User", { x: 50, y: 80 }),
      createTemplateNode("2", "CDN", { x: 200, y: 60 }),
      createTemplateNode("3", "API Gateway", { x: 350, y: 60 }),
      createTemplateNode("4", "Load Balancer", { x: 500, y: 60 }),
      createTemplateNode("5", "Service", { x: 650, y: 20 }, { instances: 15 }),
      createTemplateNode("6", "Service", { x: 650, y: 100 }, { instances: 12 }),
      createTemplateNode("7", "Cache", { x: 820, y: 20 }, { hitRate: 90 }),
      createTemplateNode("8", "Search Index", { x: 990, y: 10 }),
      createTemplateNode("9", "Database", { x: 990, y: 110 }, { readWriteSplit: true, replicationFactor: 4 }),
      createTemplateNode("10", "Stream Processor", { x: 820, y: 160 }),
      createTemplateNode("11", "Analytics Warehouse", { x: 990, y: 210 }),
      createTemplateNode("12", "Metrics Collector", { x: 820, y: 260 }),
    ],
    edges: [
      createTemplateEdge("e1-2", "1", "2"),
      createTemplateEdge("e2-3", "2", "3"),
      createTemplateEdge("e3-4", "3", "4"),
      createTemplateEdge("e4-5", "4", "5"),
      createTemplateEdge("e4-6", "4", "6"),
      createTemplateEdge("e5-7", "5", "7"),
      createTemplateEdge("e7-8", "7", "8"),
      createTemplateEdge("e6-9", "6", "9"),
      createTemplateEdge("e6-10", "6", "10"),
      createTemplateEdge("e10-11", "10", "11"),
      createTemplateEdge("e5-12", "5", "12"),
      createTemplateEdge("e6-12", "6", "12"),
    ],
  },
  {
    id: "ride-sharing",
    name: "Ride Sharing",
    description: "Match riders/drivers with real-time updates and geo services.",
    nodes: [
      createTemplateNode("1", "User", { x: 40, y: 80 }),
      createTemplateNode("2", "Realtime Gateway", { x: 200, y: 80 }),
      createTemplateNode("3", "API Gateway", { x: 360, y: 60 }),
      createTemplateNode("4", "Service Mesh", { x: 520, y: 60 }),
      createTemplateNode("5", "Service", { x: 700, y: 20 }, { instances: 18 }),
      createTemplateNode("6", "Service", { x: 700, y: 120 }, { instances: 18 }),
      createTemplateNode("7", "Message Broker", { x: 870, y: 70 }, { throughputRate: 300000 }),
      createTemplateNode("8", "Queue", { x: 1040, y: 40 }),
      createTemplateNode("9", "Database", { x: 1200, y: 20 }, { replicationFactor: 5, readWriteSplit: true }),
      createTemplateNode("10", "Search Index", { x: 1200, y: 120 }),
      createTemplateNode("11", "Stream Processor", { x: 1040, y: 150 }),
      createTemplateNode("12", "Analytics Warehouse", { x: 1200, y: 210 }),
      createTemplateNode("13", "Metrics Collector", { x: 860, y: 200 }),
    ],
    edges: [
      createTemplateEdge("e1-2", "1", "2"),
      createTemplateEdge("e2-3", "2", "3"),
      createTemplateEdge("e3-4", "3", "4"),
      createTemplateEdge("e4-5", "4", "5"),
      createTemplateEdge("e4-6", "4", "6"),
      createTemplateEdge("e5-7", "5", "7"),
      createTemplateEdge("e6-7", "6", "7"),
      createTemplateEdge("e7-8", "7", "8"),
      createTemplateEdge("e8-9", "8", "9"),
      createTemplateEdge("e7-10", "7", "10"),
      createTemplateEdge("e7-11", "7", "11"),
      createTemplateEdge("e11-12", "11", "12"),
      createTemplateEdge("e7-13", "7", "13"),
    ],
  },
  {
    id: "video-stream",
    name: "Video Streaming",
    description: "CDN-heavy pipeline with storage, transcoding, and analytics.",
    nodes: [
      createTemplateNode("1", "User", { x: 40, y: 140 }),
      createTemplateNode("2", "CDN", { x: 200, y: 120 }),
      createTemplateNode("3", "Edge Compute", { x: 350, y: 100 }),
      createTemplateNode("4", "API Gateway", { x: 500, y: 80 }),
      createTemplateNode("5", "Service", { x: 650, y: 50 }, { instances: 25 }),
      createTemplateNode("6", "Cache", { x: 820, y: 50 }, { storageGB: 500 }),
      createTemplateNode("7", "Object Storage Tier", { x: 980, y: 50 }),
      createTemplateNode("8", "Stream Processor", { x: 650, y: 180 }),
      createTemplateNode("9", "Queue", { x: 820, y: 200 }),
      createTemplateNode("10", "Service", { x: 980, y: 200 }, { instances: 15 }),
      createTemplateNode("11", "Analytics Warehouse", { x: 1140, y: 180 }),
      createTemplateNode("12", "Metrics Collector", { x: 820, y: 280 }),
    ],
    edges: [
      createTemplateEdge("e1-2", "1", "2"),
      createTemplateEdge("e2-3", "2", "3"),
      createTemplateEdge("e3-4", "3", "4"),
      createTemplateEdge("e4-5", "4", "5"),
      createTemplateEdge("e5-6", "5", "6"),
      createTemplateEdge("e6-7", "6", "7"),
      createTemplateEdge("e5-8", "5", "8"),
      createTemplateEdge("e8-9", "8", "9"),
      createTemplateEdge("e9-10", "9", "10"),
      createTemplateEdge("e10-11", "10", "11"),
      createTemplateEdge("e5-12", "5", "12"),
    ],
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Browsing, ordering, inventory, and analytics flow.",
    nodes: [
      createTemplateNode("1", "User", { x: 40, y: 120 }),
      createTemplateNode("2", "CDN", { x: 200, y: 100 }),
      createTemplateNode("3", "API Gateway", { x: 360, y: 80 }),
      createTemplateNode("4", "Circuit Breaker", { x: 520, y: 80 }),
      createTemplateNode("5", "Service", { x: 680, y: 40 }, { instances: 20 }),
      createTemplateNode("6", "Service", { x: 680, y: 120 }, { instances: 12 }),
      createTemplateNode("7", "Cache", { x: 840, y: 20 }, { storageGB: 200, hitRate: 92 }),
      createTemplateNode("8", "Search Index", { x: 1000, y: 20 }),
      createTemplateNode("9", "Database", { x: 1000, y: 110 }, { replicationFactor: 4 }),
      createTemplateNode("10", "Queue", { x: 840, y: 170 }, { throughputRate: 150000 }),
      createTemplateNode("11", "Service", { x: 1000, y: 200 }, { instances: 10 }),
      createTemplateNode("12", "Object Storage", { x: 1160, y: 80 }),
      createTemplateNode("13", "Analytics Warehouse", { x: 1160, y: 180 }),
      createTemplateNode("14", "Metrics Collector", { x: 840, y: 260 }),
    ],
    edges: [
      createTemplateEdge("e1-2", "1", "2"),
      createTemplateEdge("e2-3", "2", "3"),
      createTemplateEdge("e3-4", "3", "4"),
      createTemplateEdge("e4-5", "4", "5"),
      createTemplateEdge("e4-6", "4", "6"),
      createTemplateEdge("e5-7", "5", "7"),
      createTemplateEdge("e7-8", "7", "8"),
      createTemplateEdge("e6-9", "6", "9"),
      createTemplateEdge("e6-10", "6", "10"),
      createTemplateEdge("e10-11", "10", "11"),
      createTemplateEdge("e5-12", "5", "12"),
      createTemplateEdge("e11-13", "11", "13"),
      createTemplateEdge("e5-14", "5", "14"),
      createTemplateEdge("e6-14", "6", "14"),
    ],
  },
  {
    id: "twitter",
    name: "Twitter Timeline",
    description: "Fan-out write architecture with search and cache.",
    nodes: [
      createTemplateNode("1", "User", { x: 40, y: 90 }),
      createTemplateNode("2", "API Gateway", { x: 220, y: 80 }),
      createTemplateNode("3", "Service Mesh", { x: 390, y: 60 }),
      createTemplateNode("4", "Service", { x: 560, y: 30 }, { instances: 25 }),
      createTemplateNode("5", "Queue", { x: 720, y: 20 }),
      createTemplateNode("6", "Stream Processor", { x: 880, y: 20 }),
      createTemplateNode("7", "Cache", { x: 1040, y: 30 }, { hitRate: 93 }),
      createTemplateNode("8", "Database", { x: 1210, y: 20 }, { replicationFactor: 6 }),
      createTemplateNode("9", "Search Index", { x: 1210, y: 120 }),
      createTemplateNode("10", "Service", { x: 560, y: 140 }, { instances: 18 }),
      createTemplateNode("11", "Message Broker", { x: 720, y: 140 }),
      createTemplateNode("12", "Analytics Warehouse", { x: 1210, y: 220 }),
    ],
    edges: [
      createTemplateEdge("e1-2", "1", "2"),
      createTemplateEdge("e2-3", "2", "3"),
      createTemplateEdge("e3-4", "3", "4"),
      createTemplateEdge("e4-5", "4", "5"),
      createTemplateEdge("e5-6", "5", "6"),
      createTemplateEdge("e6-7", "6", "7"),
      createTemplateEdge("e7-8", "7", "8"),
      createTemplateEdge("e6-9", "6", "9"),
      createTemplateEdge("e3-10", "3", "10"),
      createTemplateEdge("e10-11", "10", "11"),
      createTemplateEdge("e11-8", "11", "8"),
      createTemplateEdge("e11-12", "11", "12"),
    ],
  },
  {
    id: "url-shortener",
    name: "URL Shortener",
    description: "Write-heavy service with sharded KV store and analytics.",
    nodes: [
      createTemplateNode("1", "User", { x: 40, y: 100 }),
      createTemplateNode("2", "API Gateway", { x: 220, y: 100 }),
      createTemplateNode("3", "Circuit Breaker", { x: 380, y: 100 }),
      createTemplateNode("4", "Service", { x: 540, y: 60 }, { instances: 12 }),
      createTemplateNode("5", "Service", { x: 540, y: 140 }, { instances: 12 }),
      createTemplateNode("6", "Cache", { x: 700, y: 60 }, { storageGB: 150 }),
      createTemplateNode("7", "Database", { x: 860, y: 60 }, { replicationFactor: 4 }),
      createTemplateNode("8", "Analytics Warehouse", { x: 860, y: 180 }),
      createTemplateNode("9", "Stream Processor", { x: 700, y: 200 }),
    ],
    edges: [
      createTemplateEdge("e1-2", "1", "2"),
      createTemplateEdge("e2-3", "2", "3"),
      createTemplateEdge("e3-4", "3", "4"),
      createTemplateEdge("e3-5", "3", "5"),
      createTemplateEdge("e4-6", "4", "6"),
      createTemplateEdge("e6-7", "6", "7"),
      createTemplateEdge("e5-7", "5", "7"),
      createTemplateEdge("e5-9", "5", "9"),
      createTemplateEdge("e9-8", "9", "8"),
    ],
  },
  {
    id: "youtube",
    name: "YouTube Streaming",
    description: "Ingest, transcode, storage, and CDN for video platform.",
    nodes: [
      createTemplateNode("1", "User", { x: 40, y: 60 }),
      createTemplateNode("2", "CDN", { x: 220, y: 60 }),
      createTemplateNode("3", "Edge Compute", { x: 380, y: 50 }),
      createTemplateNode("4", "API Gateway", { x: 540, y: 50 }),
      createTemplateNode("5", "Service Mesh", { x: 700, y: 40 }),
      createTemplateNode("6", "Service", { x: 860, y: 20 }, { instances: 30 }),
      createTemplateNode("7", "Object Storage", { x: 1020, y: 20 }, { storageGB: 5000 }),
      createTemplateNode("8", "Stream Processor", { x: 860, y: 140 }),
      createTemplateNode("9", "Queue", { x: 1020, y: 140 }),
      createTemplateNode("10", "Service", { x: 1180, y: 140 }, { instances: 20 }),
      createTemplateNode("11", "Analytics Warehouse", { x: 1340, y: 140 }),
      createTemplateNode("12", "Metrics Collector", { x: 1180, y: 40 }),
      createTemplateNode("13", "Search Index", { x: 1020, y: 220 }),
    ],
    edges: [
      createTemplateEdge("e1-2", "1", "2"),
      createTemplateEdge("e2-3", "2", "3"),
      createTemplateEdge("e3-4", "3", "4"),
      createTemplateEdge("e4-5", "4", "5"),
      createTemplateEdge("e5-6", "5", "6"),
      createTemplateEdge("e6-7", "6", "7"),
      createTemplateEdge("e6-8", "6", "8"),
      createTemplateEdge("e8-9", "8", "9"),
      createTemplateEdge("e9-10", "9", "10"),
      createTemplateEdge("e10-11", "10", "11"),
      createTemplateEdge("e6-12", "6", "12"),
      createTemplateEdge("e10-13", "10", "13"),
    ],
  },
];

const templateDisplayLabels: Record<string, Record<string, string>> = {
  whatsapp: {
    "1": "Mobile Client",
    "2": "Edge CDN POP",
    "3": "Public API Gateway",
    "4": "Chat API Tier",
    "5": "Policy Mesh",
    "6": "Message Bus",
    "7": "Delivery Queue",
    "8": "Delivery Workers",
    "9": "Primary Message Store",
    "10": "Media Object Storage",
    "11": "Telemetry Collector",
    "12": "Failover Circuit",
  },
  "social-feed": {
    "1": "Reader App",
    "2": "Static CDN",
    "3": "REST Gateway",
    "4": "External Load Balancer",
    "5": "Feed Builder Service",
    "6": "Engagement Service",
    "7": "Fan-out Cache",
    "8": "Search Cluster",
    "9": "Social Graph DB",
    "10": "Event Stream Processor",
    "11": "BI Warehouse",
    "12": "Observability Agent",
  },
  "ride-sharing": {
    "1": "Rider/Driver App",
    "2": "Realtime Gateway",
    "3": "Public API Edge",
    "4": "Service Mesh",
    "5": "Trip Service",
    "6": "Driver Service",
    "7": "Event Bus",
    "8": "Dispatch Queue",
    "9": "Trips DB",
    "10": "Geo Index",
    "11": "Telemetry Stream",
    "12": "Fleet Analytics",
    "13": "Ops Metrics",
  },
  "video-stream": {
    "1": "Viewer",
    "2": "Global CDN",
    "3": "Edge Encoder",
    "4": "Control Gateway",
    "5": "Playback Service",
    "6": "Segment Cache",
    "7": "Cold Storage Tier",
    "8": "Transcode Stream",
    "9": "Transcode Queue",
    "10": "Transcode Workers",
    "11": "Analytics Warehouse",
    "12": "Observability Hub",
  },
  ecommerce: {
    "1": "Shopper App",
    "2": "CDN Layer",
    "3": "API Edge",
    "4": "Circuit Breaker",
    "5": "Checkout Service",
    "6": "Inventory Service",
    "7": "Product Cache",
    "8": "Catalog Search",
    "9": "Orders DB",
    "10": "Order Queue",
    "11": "Fulfillment Service",
    "12": "Asset Storage",
    "13": "Commerce Analytics",
    "14": "Monitoring Agent",
  },
  twitter: {
    "1": "User App",
    "2": "Public API Gateway",
    "3": "Service Mesh",
    "4": "Tweet Write Service",
    "5": "Fan-out Queue",
    "6": "Timeline Stream",
    "7": "Timeline Cache",
    "8": "Tweet DB",
    "9": "Search Index",
    "10": "Timeline Reader",
    "11": "Dispatch Broker",
    "12": "Analytics Warehouse",
  },
  "url-shortener": {
    "1": "Web Frontend",
    "2": "API Edge",
    "3": "Circuit Breaker",
    "4": "Link API Service",
    "5": "Redirect Service",
    "6": "Hot URL Cache",
    "7": "Key-Value Store",
    "8": "Analytics Warehouse",
    "9": "Event Stream",
  },
  youtube: {
    "1": "Uploader Client",
    "2": "Upload CDN",
    "3": "Edge Validation",
    "4": "API Gateway",
    "5": "Service Mesh",
    "6": "Metadata Service",
    "7": "Raw Video Storage",
    "8": "Processing Stream",
    "9": "Transcode Queue",
    "10": "Transcode Workers",
    "11": "Insights Warehouse",
    "12": "Observability",
    "13": "Catalog Search",
  },
};

interface SystemPattern {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

const systemPatterns: SystemPattern[] = [
  {
    id: "read-through-cache",
    name: "Read-Through Cache",
    description: "Service reads via cache before falling back to database.",
    nodes: [
      createTemplateNode("p1", "Service", { x: 0, y: 0 }),
      createTemplateNode("p2", "Cache", { x: 0, y: 0 }),
      createTemplateNode("p3", "Database", { x: 0, y: 0 }),
    ],
    edges: [
      createTemplateEdge("p1-2", "p1", "p2"),
      createTemplateEdge("p2-3", "p2", "p3"),
    ],
  },
  {
    id: "async-worker",
    name: "Async Worker Queue",
    description: "Queue decouples request work from background processors.",
    nodes: [
      createTemplateNode("p4", "Service", { x: 0, y: 0 }),
      createTemplateNode("p5", "Queue", { x: 0, y: 0 }),
      createTemplateNode("p6", "Service", { x: 0, y: 0 }, { instances: 10 }),
      createTemplateNode("p7", "Database", { x: 0, y: 0 }),
    ],
    edges: [
      createTemplateEdge("p4-5", "p4", "p5"),
      createTemplateEdge("p5-6", "p5", "p6"),
      createTemplateEdge("p6-7", "p6", "p7"),
    ],
  },
  {
    id: "event-stream",
    name: "Event Streaming",
    description: "Publish events through broker to stream processor & warehouse.",
    nodes: [
      createTemplateNode("p8", "Service", { x: 0, y: 0 }),
      createTemplateNode("p9", "Message Broker", { x: 0, y: 0 }),
      createTemplateNode("p10", "Stream Processor", { x: 0, y: 0 }),
      createTemplateNode("p11", "Analytics Warehouse", { x: 0, y: 0 }),
    ],
    edges: [
      createTemplateEdge("p8-9", "p8", "p9"),
      createTemplateEdge("p9-10", "p9", "p10"),
      createTemplateEdge("p10-11", "p10", "p11"),
    ],
  },
];

const computeAvailableDimensions = (
  showLeftPanel: boolean,
  sidebarOpen: boolean
): { width: number; height: number } => {
  if (typeof window === "undefined") {
    return { width: 1200, height: 700 };
  }
  const reservedHorizontal = (showLeftPanel ? 260 : 0) + (sidebarOpen ? 360 : 0) + 60;
  const reservedVertical = 220;
  const width = Math.max(window.innerWidth - reservedHorizontal, 600);
  const height = Math.max(window.innerHeight - reservedVertical, 400);
  return { width, height };
};

const initialNodes: Node[] = [
  { 
    id: "1", 
    position: { x: 100, y: 50 }, 
    data: { label: "User", config: getDefaultConfig("User") }, 
    type: "custom" 
  },
  { 
    id: "2", 
    position: { x: 100, y: 200 }, 
    data: { label: "API Gateway", config: getDefaultConfig("API Gateway") }, 
    type: "custom" 
  },
  { 
    id: "3", 
    position: { x: 400, y: 200 }, 
    data: { label: "Database", config: getDefaultConfig("Database") }, 
    type: "custom" 
  },
];

const initialEdges: Edge[] = [
  { 
    id: "e1-2", 
    source: "1", 
    target: "2", 
    label: "requests", 
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#007bff",
    },
  },
  { 
    id: "e2-3", 
    source: "2", 
    target: "3", 
    label: "requests", 
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#007bff",
    },
  },
];

let nodeIdCounter = 4;

// Configuration Panel Component
function ConfigPanel({
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

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [trafficProfile, setTrafficProfile] = useState<TrafficProfile>(defaultTrafficProfile);
  const peakBurstFactor = trafficProfile.peakPercent / 100;
  const [scenarioEvents, setScenarioEvents] = useState<ScenarioEvent[]>([]);
  const [scenarioClock, setScenarioClock] = useState(0);
  const [scenarioPlaying, setScenarioPlaying] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [flowPlaybackIndex, setFlowPlaybackIndex] = useState(0);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [templatePreviewId, setTemplatePreviewId] = useState<string | null>(null);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [flowMenuOpen, setFlowMenuOpen] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement | null>(null);
  const flowMenuRef = useRef<HTMLDivElement | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    componentCategories.forEach((category) => {
      defaults[category.id] = true;
    });
    return defaults;
  });
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showScenarioPanel, setShowScenarioPanel] = useState(true);
  const [showPatternPanel, setShowPatternPanel] = useState(true);
  const [showTrafficPanel, setShowTrafficPanel] = useState(true);
  const [activeView, setActiveView] = useState<"builder" | "metrics" | "guide">("builder");
  const loadTemplate = useCallback(
    (templateId: string, sidebarOpen: boolean) => {
      const template = systemTemplates.find((t) => t.id === templateId);
      if (!template) return;
      const clonedNodes = template.nodes.map((node) => ({
        ...node,
        position: { ...node.position },
        data: { ...node.data },
      }));
      const labelOverrides = templateDisplayLabels[template.id];
      if (labelOverrides) {
        clonedNodes.forEach((node) => {
          const override = labelOverrides[node.id];
          if (override) {
            node.data.displayLabel = override;
          }
        });
      }
      const { width, height } = computeAvailableDimensions(showLeftPanel, sidebarOpen);
      const spacedNodes = layoutNodesWithFlow(clonedNodes, template.edges, width, height);
      const clonedEdges = template.edges.map((edge) => ({ ...edge }));
      setNodes(spacedNodes);
      setEdges(clonedEdges);
      const maxNodeId = clonedNodes.reduce((max, node) => {
        const numeric = Number(node.id);
        return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
      }, 0);
      const maxEdgeId = clonedEdges.reduce((max, edge) => {
        const numeric = Number((edge.id || "").replace(/\D/g, ""));
        return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
      }, 0);
      nodeIdCounter = Math.max(maxNodeId + 1, clonedNodes.length + 1);
      edgeIdCounter = Math.max(maxEdgeId + 1, clonedEdges.length + 1);
      setScenarioEvents([]);
      setScenarioClock(0);
      setScenarioPlaying(false);
      setSelectedFlowId(null);
      setFlowPlaybackIndex(0);
      setCurrentTemplateId(templateId);
    },
    [setNodes, setEdges, showLeftPanel]
  );

  const applyPattern = useCallback(
    (patternId: string) => {
      const pattern = systemPatterns.find((p) => p.id === patternId);
      if (!pattern) return;
      const idMap = new Map<string, string>();
      const clonedNodes = pattern.nodes.map((node) => {
        const newId = `${nodeIdCounter++}`;
        idMap.set(node.id, newId);
        return {
          ...node,
          id: newId,
          position: { ...node.position },
          data: node.data ? { ...node.data } : {},
        };
      });
      const clonedEdges = pattern.edges.map((edge) => ({
        ...edge,
        id: `pe${edgeIdCounter++}`,
        source: idMap.get(edge.source) ?? edge.source,
        target: idMap.get(edge.target) ?? edge.target,
      }));
      const anticipatedEdges = edges.concat(clonedEdges);
      const sidebarOpen = showScenarioPanel || Boolean(selectedFlowId);
      const { width, height } = computeAvailableDimensions(showLeftPanel, sidebarOpen);
      setNodes((prevNodes) => {
        const combined = prevNodes.concat(
          clonedNodes.map((node) => ({
            ...node,
            data: node.data ? { ...node.data } : {},
          }))
        );
        return layoutNodesWithFlow(combined, anticipatedEdges, width, height);
      });
      setEdges((prevEdges) => prevEdges.concat(clonedEdges));
    },
    [edges, selectedFlowId, showLeftPanel, showScenarioPanel]
  );

  const loadImportedTemplate = useCallback(
    (templateData: { nodes: any[]; edges: any[] }) => {
      if (!Array.isArray(templateData.nodes) || !Array.isArray(templateData.edges)) {
        throw new Error("Template must include nodes and edges arrays.");
      }
      if (templateData.nodes.length === 0) {
        throw new Error("Template contains no nodes.");
      }
      const idMap = new Map<string, string>();
      const preparedNodes: Node[] = templateData.nodes.map((rawNode, index) => {
        const baseId = typeof rawNode?.id === "string" ? rawNode.id : `import-node-${index}`;
        const newId = `${nodeIdCounter++}`;
        idMap.set(baseId, newId);
        const rawData = rawNode?.data ?? {};
        const label = typeof rawData.label === "string" ? rawData.label : rawNode?.label ?? `Node ${index + 1}`;
        const config =
          rawData.config && typeof rawData.config === "object" && Object.keys(rawData.config).length > 0
            ? rawData.config
            : getDefaultConfig(label);
        return {
          id: newId,
          type: "custom",
          position: {
            x: Number(rawNode?.position?.x) || 0,
            y: Number(rawNode?.position?.y) || index * 60,
          },
          data: {
            label,
            displayLabel: typeof rawData.displayLabel === "string" ? rawData.displayLabel : undefined,
            config,
          },
        };
      });
      const preparedEdges: Edge[] = [];
      templateData.edges.forEach((rawEdge) => {
        const source = idMap.get(rawEdge?.source) ?? rawEdge?.source;
        const target = idMap.get(rawEdge?.target) ?? rawEdge?.target;
        if (!source || !target) {
          return;
        }
        preparedEdges.push({
          id: `ie${edgeIdCounter++}`,
          source,
          target,
          label: rawEdge?.label,
          animated: rawEdge?.animated ?? true,
          markerEnd:
            rawEdge?.markerEnd && typeof rawEdge.markerEnd === "object"
              ? rawEdge.markerEnd
              : { type: MarkerType.ArrowClosed, color: "#007bff" },
        });
      });
      const sidebarOpen = showScenarioPanel || Boolean(selectedFlowId);
      const { width, height } = computeAvailableDimensions(showLeftPanel, sidebarOpen);
      const laidOutNodes = layoutNodesWithFlow(preparedNodes, preparedEdges, width, height);
      setNodes(laidOutNodes);
      setEdges(preparedEdges);
      setScenarioEvents([]);
      setScenarioClock(0);
      setScenarioPlaying(false);
      setSelectedFlowId(null);
      setFlowPlaybackIndex(0);
      setCurrentTemplateId(null);
    },
    [selectedFlowId, showLeftPanel, showScenarioPanel, setEdges, setNodes]
  );

  const handleExportTemplate = useCallback(() => {
    if (nodes.length === 0) {
      window.alert("There are no nodes on the canvas to export.");
      return;
    }
    const serializedNodes = nodes.map((node) => {
      const data = node.data || {};
      return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          label: data.label,
          displayLabel: data.displayLabel,
          config: data.config,
        },
      };
    });
    const serializedEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: edge.animated,
      markerEnd: edge.markerEnd,
    }));
    const payload = {
      name: currentTemplateId ?? "custom-template",
      exportedAt: new Date().toISOString(),
      nodes: serializedNodes,
      edges: serializedEdges,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const filename = `${payload.name}.json`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [nodes, edges, currentTemplateId]);

  const handleImportTemplateClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportTemplateFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          loadImportedTemplate(parsed);
        } catch (error) {
          console.error(error);
          window.alert("Failed to load template. Please ensure the JSON file is valid.");
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    [loadImportedTemplate]
  );

  const resetCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    nodeIdCounter = 1;
    edgeIdCounter = 1;
    setSelectedNode(null);
    setSelectedEdgeId(null);
    setSelectedFlowId(null);
    setFlowPlaybackIndex(0);
    setCurrentTemplateId(null);
  }, []);

  const clearEdgeSelection = useCallback(() => {
    setSelectedEdgeId(null);
    setEdges((eds) => {
      let changed = false;
      const next = eds.map((edge) => {
        if (!edge.selected) {
          return edge;
        }
        changed = true;
        return { ...edge, selected: false };
      });
      return changed ? next : eds;
    });
  }, [setEdges]);

  const selectEdge = useCallback(
    (edgeId: string) => {
      setSelectedEdgeId(edgeId);
      setEdges((eds) => {
        let changed = false;
        const next = eds.map((edge) => {
          if (edge.id === edgeId && !edge.selected) {
            changed = true;
            return { ...edge, selected: true };
          }
          if (edge.id !== edgeId && edge.selected) {
            changed = true;
            return { ...edge, selected: false };
          }
          return edge;
        });
        return changed ? next : eds;
      });
    },
    [setEdges]
  );

  const handleTrafficProfileChange = useCallback((profile: TrafficProfile) => {
    setTrafficProfile(profile);
  }, []);

  const handleApplyTrafficProfile = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const label = node.data.label as string;
        if (label !== "User") return node;
        const existingConfig = (node.data.config as UserConfig) || {};
        const updatedConfig: UserConfig = {
          ...existingConfig,
          daus: trafficProfile.baseDAUs,
          messageSizeBytes: trafficProfile.messageSizeBytes,
          latencyMs: existingConfig.latencyMs ?? 5,
        };
        return {
          ...node,
          data: { ...node.data, config: updatedConfig },
        };
      })
    );
  }, [trafficProfile, setNodes]);

  const handleCreateScenarioEvent = useCallback(
    (eventInput: Omit<ScenarioEvent, "id" | "targetLabel" | "triggered">) => {
      setScenarioEvents((prev) => {
        const targetNode = nodes.find((n) => n.id === eventInput.targetId);
        const targetLabel = targetNode ? ((targetNode.data.label as string) || eventInput.targetId) : eventInput.targetId;
        return prev.concat({
          ...eventInput,
          id: `scenario-${scenarioEventIdCounter++}`,
          targetLabel,
          triggered: false,
        });
      });
    },
    [nodes]
  );

  const handleRemoveScenarioEvent = useCallback((eventId: string) => {
    setScenarioEvents((prev) => prev.filter((event) => event.id !== eventId));
  }, []);

  const handleToggleScenarioPlay = useCallback(() => {
    setScenarioPlaying((prev) => !prev);
  }, []);

  const handleResetScenario = useCallback(() => {
    setScenarioPlaying(false);
    setScenarioClock(0);
    setScenarioEvents((prev) => prev.map((event) => ({ ...event, triggered: false })));
  }, []);

  const handleTriggerScenarioEvent = useCallback(
    (eventId: string) => {
      setScenarioEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? {
                ...event,
                startTime: scenarioClock,
                triggered: true,
              }
            : event
        )
      );
      setScenarioPlaying(true);
    },
    [scenarioClock]
  );

  const scenarioEndTime = useMemo(() => {
    if (scenarioEvents.length === 0) return 0;
    return scenarioEvents.reduce((max, event) => Math.max(max, event.startTime + event.durationSeconds), 0);
  }, [scenarioEvents]);

  const templateNodeLabelMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    systemTemplates.forEach((template) => {
      map.set(template.id, new Set(template.nodes.map((node) => node.data.label as string)));
    });
    return map;
  }, []);

  const templatePreview = useMemo(() => {
    if (!templatePreviewId) return null;
    return systemTemplates.find((template) => template.id === templatePreviewId) ?? null;
  }, [templatePreviewId]);

  useEffect(() => {
    if (templateMenuOpen) {
      if (!templatePreviewId && systemTemplates.length > 0) {
        setTemplatePreviewId(systemTemplates[0].id);
      }
    } else {
      setTemplatePreviewId(null);
    }
  }, [templateMenuOpen, templatePreviewId, systemTemplates]);

  useEffect(() => {
    if (!templateMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(event.target as HTMLElement)) {
        setTemplateMenuOpen(false);
        setTemplatePreviewId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [templateMenuOpen]);

  useEffect(() => {
    if (!flowMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (flowMenuRef.current && !flowMenuRef.current.contains(event.target as HTMLElement)) {
        setFlowMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [flowMenuOpen]);

  useEffect(() => {
    if (scenarioClock <= 0) {
      return;
    }
    setScenarioEvents((prev) => {
      let changed = false;
      const next = prev.map((event) => {
        if (!event.triggered && scenarioClock >= event.startTime) {
          changed = true;
          return { ...event, triggered: true };
        }
        return event;
      });
      return changed ? next : prev;
    });
  }, [scenarioClock]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedEdgeId) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
          return;
        }
      }
      event.preventDefault();
      setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdgeId, setEdges]);

  useEffect(() => {
    if (!scenarioPlaying) return;
    const intervalId = window.setInterval(() => {
      setScenarioClock((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [scenarioPlaying]);

  useEffect(() => {
    if (!scenarioPlaying) {
      return;
    }
    if (scenarioEvents.length === 0) {
      setScenarioPlaying(false);
      if (scenarioClock !== 0) {
        setScenarioClock(0);
      }
      return;
    }
    if (scenarioClock >= scenarioEndTime) {
      setScenarioPlaying(false);
      if (scenarioClock !== scenarioEndTime) {
        setScenarioClock(scenarioEndTime);
      }
    }
  }, [scenarioClock, scenarioEndTime, scenarioEvents.length, scenarioPlaying]);

  const activeImpacts = useMemo(() => deriveScenarioImpacts(scenarioEvents, scenarioClock), [scenarioEvents, scenarioClock]);

  const availableFlowIds = useMemo(() => {
    if (!currentTemplateId) return new Set(messageFlows.map((flow) => flow.id));
    const allowedLabels = templateNodeLabelMap.get(currentTemplateId);
    if (!allowedLabels) return new Set<string>();
    const allowedFlowIds = new Set<string>();
    messageFlows.forEach((flow) => {
      const matches = flow.steps.every((step) => allowedLabels.has(step.label));
      if (matches) {
        allowedFlowIds.add(flow.id);
      }
    });
    return allowedFlowIds;
  }, [currentTemplateId, templateNodeLabelMap]);

  const currentFlow = useMemo(() => {
    if (!selectedFlowId || !availableFlowIds.has(selectedFlowId)) return null;
    return messageFlows.find((flow) => flow.id === selectedFlowId) ?? null;
  }, [selectedFlowId, availableFlowIds]);
  const flowStepCount = currentFlow?.steps.length ?? 0;

  useEffect(() => {
    if (!connectionError) return;
    const timer = window.setTimeout(() => setConnectionError(null), 4000);
    return () => window.clearTimeout(timer);
  }, [connectionError]);

  useEffect(() => {
    if (!selectedFlowId) {
      setFlowPlaybackIndex(0);
    }
  }, [selectedFlowId]);

  useEffect(() => {
    if (!currentFlow || flowStepCount === 0) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setFlowPlaybackIndex((prev) => (prev + 1) % flowStepCount);
    }, 1500);
    return () => window.clearInterval(intervalId);
  }, [currentFlow, flowStepCount]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) {
        return;
      }
      const sourceNode = nodes.find((node) => node.id === params.source);
      const targetNode = nodes.find((node) => node.id === params.target);
      const sourceLabel = sourceNode?.data.label as string | undefined;
      const targetLabel = targetNode?.data.label as string | undefined;
      if (!canConnectLabels(sourceLabel, targetLabel)) {
        setConnectionError(`Cannot connect ${sourceLabel ?? "Unknown"} → ${targetLabel ?? "Unknown"}`);
        return;
      }
      const newEdge: Edge = {
        id: `e${edgeIdCounter++}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle ?? null,
        targetHandle: params.targetHandle ?? null,
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#007bff",
        },
      };
      setEdges((eds) => [...eds, newEdge]);
    },
    [nodes, setEdges]
  );

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      // Reverse the edge direction
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edge.id
            ? {
                ...e,
                source: edge.target,
                target: edge.source,
              }
            : e
        )
      );
    },
    [setEdges]
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      // Also delete edges connected to deleted nodes
      const deletedNodeIds = new Set(deleted.map((node) => node.id));
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            !deletedNodeIds.has(edge.source) && !deletedNodeIds.has(edge.target)
        )
      );
    },
    [setEdges]
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");

      if (typeof type === "undefined" || !type) {
        return;
      }

      if (!reactFlowInstance || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${nodeIdCounter++}`,
        type: "custom",
        position,
        data: { label: type, config: getDefaultConfig(type) },
      };

      setNodes((nds) => {
        const nextNodes = nds.concat(newNode);
        const sidebarOpen = showScenarioPanel || Boolean(selectedFlowId);
        const { width, height } = computeAvailableDimensions(showLeftPanel, sidebarOpen);
        return layoutNodesWithFlow(nextNodes, edges, width, height);
      });
    },
    [reactFlowInstance, setNodes, showLeftPanel, showScenarioPanel, selectedFlowId, edges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
      if (selectedEdgeId) {
        clearEdgeSelection();
      }
    },
    [clearEdgeSelection, selectedEdgeId]
  );

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    if (selectedEdgeId) {
      clearEdgeSelection();
    }
  }, [clearEdgeSelection, selectedEdgeId]);

  const handleNodeConfigure = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
      }
    },
    [nodes]
  );

  const handleNodeRename = useCallback(
    (nodeId: string, newDisplayLabel: string) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  displayLabel: newDisplayLabel.trim() ? newDisplayLabel.trim() : undefined,
                },
              }
            : node
        )
      );
    },
    [setNodes]
  );

  const handleConfigSave = useCallback(
    (nodeId: string, config: NodeConfig, displayLabel?: string) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  config,
                  displayLabel,
                },
              }
            : node
        )
      );
    },
    [setNodes]
  );

  // Calculate flow metrics and enrich nodes with QPS/bandwidth data
  const calculateNodeMetrics = useCallback(() => {
    const userNode = nodes.find((node) => {
      const label = node.data.label as string;
      return label === "User";
    });
    const userConfig = userNode?.data.config as UserConfig | undefined;

    const effectiveDAUs = userConfig?.daus ?? trafficProfile.baseDAUs;
    const effectiveMessageSize = userConfig?.messageSizeBytes ?? trafficProfile.messageSizeBytes;

    if (!effectiveDAUs || !effectiveMessageSize) {
      return nodes;
    }

    const requestsPerUserPerDay = DEFAULT_REQUESTS_PER_USER_PER_DAY;
    const baselineQPS = (effectiveDAUs * requestsPerUserPerDay) / 86400;
    const peakQPS = Math.max(1, Math.round(baselineQPS * (1 + peakBurstFactor)));
    const messageSize = effectiveMessageSize;

    // Build adjacency map
    const adjacencyMap = new Map<string, string[]>();
    edges.forEach((edge) => {
      if (!adjacencyMap.has(edge.source)) {
        adjacencyMap.set(edge.source, []);
      }
      adjacencyMap.get(edge.source)!.push(edge.target);
    });

    const nodeMap = new Map<string, Node>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    const nodeLoad = new Map<string, number>();
    const nodeBandwidth = new Map<string, number>();
    const nodeQueueDepth = new Map<string, number>();
    const nodeStorageUsage = new Map<string, number>();
    const nodeLatency = new Map<string, number>();
    const nodeErrorRate = new Map<string, number>();
    const nodeCost = new Map<string, number>();
    const nodeStatusMap = new Map<string, NodeHealthStatus>();

    // Track processed paths to avoid infinite loops while allowing multiple sources
    const processedPaths = new Set<string>();
    
    const processNode = (nodeId: string, incomingQPS: number, pathKey?: string) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      const label = node.data.label as string;
      const config = node.data.config as NodeConfig | undefined;

      const impact = activeImpacts[nodeId];
      const status: NodeHealthStatus = impact?.status ?? "healthy";
      nodeStatusMap.set(nodeId, status);

      let effectiveIncomingQPS = incomingQPS;
      if (impact) {
        if (impact.status === "down") {
          effectiveIncomingQPS = 0;
        } else {
          effectiveIncomingQPS *= impact.throughputMultiplier;
        }
      }

      // Accumulate load (node can receive from multiple sources)
      const currentLoad = nodeLoad.get(nodeId) || 0;
      nodeLoad.set(nodeId, currentLoad + effectiveIncomingQPS);
      
      const bandwidthMBps = (effectiveIncomingQPS * messageSize) / 1024 / 1024;
      const currentBandwidth = nodeBandwidth.get(nodeId) || 0;
      nodeBandwidth.set(nodeId, currentBandwidth + bandwidthMBps);

      const baseLatency = getNumericConfigValue(config, "latencyMs") ?? defaultLatencies[label] ?? 20;
      const latencyMultiplier = impact?.latencyMultiplier ?? 1;
      nodeLatency.set(nodeId, baseLatency * latencyMultiplier);

      const baseErrorRate = getNumericConfigValue(config, "errorRate") ?? 0.001;
      const errorRate = Math.min(1, baseErrorRate + (impact?.errorRateDelta ?? 0));
      nodeErrorRate.set(nodeId, errorRate);

      let monthlyCost = 0;
      const costPerRequest = getNumericConfigValue(config, "costPerRequestUsd") ?? 0;
      if (costPerRequest > 0) {
        monthlyCost += costPerRequest * effectiveIncomingQPS * 60 * 60 * 24 * 30;
      }
      const costPerConnection = getNumericConfigValue(config, "costPerConnectionUsd") ?? 0;
      const maxConnections = getNumericConfigValue(config, "maxConnections") ?? 0;
      if (costPerConnection > 0 && maxConnections > 0) {
        monthlyCost += costPerConnection * maxConnections;
      }
      const costPerInvocation = getNumericConfigValue(config, "costPerInvocationUsd") ?? 0;
      if (costPerInvocation > 0) {
        monthlyCost += costPerInvocation * effectiveIncomingQPS * 60 * 60 * 24 * 30;
      }
      const costPerGb = getNumericConfigValue(config, "costPerGbMonthUsd") ?? 0;
      if (costPerGb > 0 && config && "storageGB" in config && typeof config.storageGB === "number") {
        monthlyCost += costPerGb * (config.storageGB as number);
      }
      nodeCost.set(nodeId, monthlyCost);

      const targets = adjacencyMap.get(nodeId) || [];
      if (targets.length === 0 || status === "down") return;

      // Calculate outgoing QPS based on this specific incoming path
      let outgoingQPS = effectiveIncomingQPS;

      if (label === "CDN") {
        const cdnConfig = config as CDNConfig | undefined;
        const hitRate = cdnConfig?.cacheHitRate || 95;
        outgoingQPS = effectiveIncomingQPS * (1 - hitRate / 100);
      } else if (label === "Cache") {
        const cacheConfig = config as CacheConfig | undefined;
        const hitRate = cacheConfig?.hitRate || 80;
        outgoingQPS = effectiveIncomingQPS * (1 - hitRate / 100);
      } else if (label === "Load Balancer") {
        // Load balancer distributes evenly
        const perTargetQPS = outgoingQPS / targets.length;
        targets.forEach((targetId) => {
          const newPathKey = pathKey ? `${pathKey}-${nodeId}-${targetId}` : `${nodeId}-${targetId}`;
          if (!processedPaths.has(newPathKey)) {
            processedPaths.add(newPathKey);
            processNode(targetId, perTargetQPS, newPathKey);
          }
        });
        return;
      } else if (label === "Service") {
        // Service passes through
        outgoingQPS = effectiveIncomingQPS;
      } else if (label === "Circuit Breaker") {
        const healthyTargets = targets.filter((targetId) => {
          const targetImpact = activeImpacts[targetId];
          const targetStatus = targetImpact?.status ?? nodeStatusMap.get(targetId) ?? "healthy";
          return targetStatus !== "down";
        });
        const targetList = healthyTargets.length > 0 ? healthyTargets : [];
        if (healthyTargets.length === 0) {
          nodeStatusMap.set(nodeId, "degraded");
        } else if ((impact?.status ?? "healthy") === "healthy" && healthyTargets.length < targets.length) {
          nodeStatusMap.set(nodeId, "degraded");
        }
        if (targetList.length === 0) {
          return;
        }
        const perTargetQPS = outgoingQPS / targetList.length;
        targetList.forEach((targetId) => {
          const newPathKey = pathKey ? `${pathKey}-${nodeId}-${targetId}` : `${nodeId}-${targetId}`;
          if (!processedPaths.has(newPathKey)) {
            processedPaths.add(newPathKey);
            processNode(targetId, perTargetQPS, newPathKey);
          }
        });
        return;
      } else if (label === "Database" || label === "DB") {
        const dbConfig = config as DatabaseConfig | undefined;
        const replicationFactor = dbConfig?.replicationFactor || 1;
        const writeRatio = trafficProfile.writeRatio;
        const readRatio = Math.max(0, 1 - writeRatio);
        if (dbConfig?.readWriteSplit) {
          const readQPS = outgoingQPS * readRatio;
          const writeQPS = outgoingQPS * writeRatio;
          targets.forEach((targetId) => {
            const targetNode = nodeMap.get(targetId);
            if (!targetNode) return;
            const targetLabel = targetNode.data.label as string;
            const newPathKey = pathKey ? `${pathKey}-${nodeId}-${targetId}` : `${nodeId}-${targetId}`;
            if (!processedPaths.has(newPathKey)) {
              processedPaths.add(newPathKey);
              if (targetLabel === "Database" || targetLabel === "DB") {
                processNode(targetId, readQPS / Math.max(1, replicationFactor), newPathKey);
                processNode(targetId, writeQPS, `${newPathKey}-write`);
              } else {
                processNode(targetId, outgoingQPS / targets.length, newPathKey);
              }
            }
          });
          return;
        } else {
          // Load distributed across replicas
          outgoingQPS = outgoingQPS / Math.max(1, replicationFactor);
        }
      }

      // Distribute to all targets
      targets.forEach((targetId) => {
        const newPathKey = pathKey ? `${pathKey}-${nodeId}-${targetId}` : `${nodeId}-${targetId}`;
        if (!processedPaths.has(newPathKey)) {
          processedPaths.add(newPathKey);
          processNode(targetId, outgoingQPS / targets.length, newPathKey);
        }
      });
    };

    if (userNode) {
      processNode(userNode.id, peakQPS);
    }

    nodes.forEach((node) => {
      const config = node.data.config as NodeConfig | undefined;
      if (!config) {
        if (!nodeStatusMap.has(node.id)) {
          nodeStatusMap.set(node.id, "healthy");
        }
        return;
      }
      const label = node.data.label as string;
      const nodeQPS = nodeLoad.get(node.id) || 0;

      if (label === "Queue") {
        const depth = estimateQueueDepth(config as QueueConfig, nodeQPS);
        if (depth !== undefined) {
          nodeQueueDepth.set(node.id, depth);
        }
      }

      if ("storageGB" in config && config.storageGB) {
        const usage = estimateStorageUsageGB(label, config, nodeQPS, messageSize);
        if (usage !== undefined) {
          nodeStorageUsage.set(node.id, usage);
        }
      }

      if (!nodeStatusMap.has(node.id)) {
        nodeStatusMap.set(node.id, "healthy");
      }
      if (!nodeLatency.has(node.id)) {
        nodeLatency.set(node.id, getNumericConfigValue(config, "latencyMs") ?? defaultLatencies[label] ?? 20);
      }
      if (!nodeErrorRate.has(node.id)) {
        nodeErrorRate.set(node.id, getNumericConfigValue(config, "errorRate") ?? 0.001);
      }
      if (!nodeCost.has(node.id)) {
        const costPerRequest = getNumericConfigValue(config, "costPerRequestUsd") ?? 0;
        nodeCost.set(node.id, costPerRequest * nodeQPS * 60 * 60 * 24 * 30);
      }
    });

    // Enrich nodes with metrics
    return nodes.map((node) => {
      const label = node.data.label as string;
      return {
        ...node,
        data: {
          ...node.data,
          nodeQPS: nodeLoad.get(node.id) || 0,
          nodeBandwidthMBps: nodeBandwidth.get(node.id) || 0,
          nodeQueueDepth: nodeQueueDepth.get(node.id),
          nodeStorageUsageGB: nodeStorageUsage.get(node.id),
          nodeLatencyMs: nodeLatency.get(node.id) || defaultLatencies[label] || 0,
          nodeErrorRate: nodeErrorRate.get(node.id) || 0,
          nodeCostUsd: nodeCost.get(node.id) || 0,
          nodeStatus: nodeStatusMap.get(node.id) || "healthy",
        },
      };
    });
  }, [nodes, edges, peakBurstFactor, activeImpacts, trafficProfile]);

  const adjacencyById = useMemo(() => {
    const map = new Map<string, string[]>();
    edges.forEach((edge) => {
      if (!map.has(edge.source)) {
        map.set(edge.source, []);
      }
      map.get(edge.source)!.push(edge.target);
    });
    return map;
  }, [edges]);

  const nodesWithMetrics = calculateNodeMetrics();
  const flowHighlight = useMemo(() => {
    if (!currentFlow || flowStepCount === 0) {
      return {
        activeLabel: null as string | null,
        trailLabels: new Set<string>(),
        activeEdgeKey: null as string | null,
        trailEdgeKeys: new Set<string>(),
      };
    }
    const steps = currentFlow.steps;
    const stepIndex = flowPlaybackIndex % flowStepCount;
    const trailLabels = new Set<string>();
    for (let i = 0; i < stepIndex; i += 1) {
      trailLabels.add(steps[i].label);
    }
    const activeLabel = steps[stepIndex]?.label ?? null;
    const trailEdgeKeys = new Set<string>();
    for (let i = 1; i < stepIndex; i += 1) {
      const prev = steps[i - 1];
      const curr = steps[i];
      if (prev && curr) {
        trailEdgeKeys.add(`${prev.label}->${curr.label}`);
      }
    }
    let activeEdgeKey: string | null = null;
    if (stepIndex > 0) {
      const prev = steps[stepIndex - 1];
      const curr = steps[stepIndex];
      if (prev && curr) {
        activeEdgeKey = `${prev.label}->${curr.label}`;
      }
    }
    return { activeLabel, trailLabels, activeEdgeKey, trailEdgeKeys };
  }, [currentFlow, flowStepCount, flowPlaybackIndex]);
  const nodeLabelById = useMemo(() => {
    const map = new Map<string, string>();
    nodesWithMetrics.forEach((node) => {
      map.set(node.id, node.data.label as string);
    });
    return map;
  }, [nodesWithMetrics]);

  const nodesForCanvas = useMemo(() => {
    if (!flowHighlight.activeLabel && flowHighlight.trailLabels.size === 0) {
      return nodesWithMetrics;
    }
    return nodesWithMetrics.map((node) => {
      const label = node.data.label as string;
      let flowState: "active" | "trail" | undefined;
      if (flowHighlight.activeLabel && label === flowHighlight.activeLabel) {
        flowState = "active";
      } else if (flowHighlight.trailLabels.has(label)) {
        flowState = "trail";
      }
      if (!flowState && !(node.data as Record<string, unknown>).flowState) {
        return node;
      }
      const nextData = { ...node.data } as Record<string, unknown>;
      if (flowState) {
        nextData.flowState = flowState;
      } else {
        delete nextData.flowState;
      }
      return { ...node, data: nextData };
    });
  }, [nodesWithMetrics, flowHighlight]);

  const edgesForCanvas = useMemo(() => {
    if (!selectedFlowId) {
      return edges;
    }
    const hasHighlight = Boolean(flowHighlight.activeEdgeKey) || flowHighlight.trailEdgeKeys.size > 0;
    if (!hasHighlight) {
      return edges;
    }
    return edges.map((edge) => {
      const sourceLabel = nodeLabelById.get(edge.source);
      const targetLabel = nodeLabelById.get(edge.target);
      if (!sourceLabel || !targetLabel) {
        return edge;
      }
      const key = `${sourceLabel}->${targetLabel}`;
      let flowClass: string | null = null;
      if (flowHighlight.activeEdgeKey && key === flowHighlight.activeEdgeKey) {
        flowClass = "flow-active";
      } else if (flowHighlight.trailEdgeKeys.has(key)) {
        flowClass = "flow-trail";
      }
      if (!flowClass) {
        if (!edge.className) {
          return edge;
        }
        const baseClass = edge.className
          .split(" ")
          .filter((cls) => cls && !cls.startsWith("flow-"))
          .join(" ");
        if (baseClass === edge.className) {
          return edge;
        }
        return { ...edge, className: baseClass || undefined };
      }
      const baseClass = edge.className
        ? edge.className
            .split(" ")
            .filter((cls) => cls && !cls.startsWith("flow-"))
            .join(" ")
        : "";
      const nextClass = [baseClass, flowClass].filter(Boolean).join(" ");
      if (nextClass === edge.className) {
        return edge;
      }
      return { ...edge, className: nextClass };
    });
  }, [edges, nodeLabelById, flowHighlight, selectedFlowId]);

  const nodeInsights = useMemo<NodeInsight[]>(() => {
    return nodesWithMetrics.map((node) => {
      const label = node.data.label as string;
      const displayLabel = (node.data.displayLabel as string) || label;
      const config = node.data.config as NodeConfig | undefined;
      const nodeQPS = (node.data.nodeQPS as number) || 0;
      const nodeBandwidthMBps = (node.data.nodeBandwidthMBps as number) || 0;
      const nodeQueueDepth = node.data.nodeQueueDepth as number | undefined;
      const nodeStorageUsageGB = node.data.nodeStorageUsageGB as number | undefined;
      const nodeLatencyMs = (node.data.nodeLatencyMs as number) || 0;
      const capacity = config
        ? calculateCapacityUsage(label, config, {
            nodeQPS,
            nodeBandwidthMBps,
            nodeQueueDepth,
            nodeStorageUsageGB,
            nodeLatencyMs,
          })
        : CAPACITY_NONE;
      return {
        id: node.id,
        label,
        displayLabel,
        status: (node.data.nodeStatus as NodeHealthStatus) || "healthy",
        qps: nodeQPS,
        latencyMs: nodeLatencyMs,
        errorRate: (node.data.nodeErrorRate as number) || 0,
        costUsd: (node.data.nodeCostUsd as number) || 0,
        capacity,
      };
    });
  }, [nodesWithMetrics]);
  const monitoringSummary = useMemo<MonitoringSummary | null>(() => {
    if (!nodesWithMetrics || nodesWithMetrics.length === 0) return null;
    let totalQPS = 0;
    let totalBandwidth = 0;
    let weightedLatency = 0;
    let weightedLatencyP95 = 0;
    let weightedError = 0;
    let totalCost = 0;
    let saturatedNodes = 0;

    nodesWithMetrics.forEach((node) => {
      const qps = (node.data.nodeQPS as number) || 0;
      const bandwidth = (node.data.nodeBandwidthMBps as number) || 0;
      const latency = (node.data.nodeLatencyMs as number) || 0;
      const errorRate = (node.data.nodeErrorRate as number) || 0;
      const cost = (node.data.nodeCostUsd as number) || 0;
      totalQPS += qps;
      totalBandwidth += bandwidth;
      weightedLatency += latency * qps;
      weightedLatencyP95 += latency * 1.5 * qps;
      weightedError += errorRate * qps;
      totalCost += cost;

      const config = node.data.config as NodeConfig | undefined;
      if (config) {
        const usage = calculateCapacityUsage(node.data.label as string, config, {
          nodeQPS: qps,
          nodeBandwidthMBps: bandwidth,
          nodeQueueDepth: node.data.nodeQueueDepth as number | undefined,
          nodeStorageUsageGB: node.data.nodeStorageUsageGB as number | undefined,
          nodeLatencyMs: latency,
        });
        if (usage.percentage >= 80) {
          saturatedNodes += 1;
        }
      }
    });

    if (totalQPS === 0) {
      return {
        totalQPS: 0,
        totalBandwidthMBps: totalBandwidth,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        errorRate: 0,
        monthlyCostUsd: totalCost,
        saturatedNodes,
        activeIncidents: Object.keys(activeImpacts).length,
      };
    }

    return {
      totalQPS,
      totalBandwidthMBps: totalBandwidth,
      avgLatencyMs: weightedLatency / totalQPS,
      p95LatencyMs: weightedLatencyP95 / totalQPS,
      errorRate: weightedError / totalQPS,
      monthlyCostUsd: totalCost,
      saturatedNodes,
      activeIncidents: Object.keys(activeImpacts).length,
    };
  }, [nodesWithMetrics, activeImpacts]);

  const whatIfInsights = useMemo(() => {
    if (!nodesWithMetrics.length) return [];
    const serviceNodes = nodesWithMetrics.filter((node) => (node.data.label as string) === "Service");
    const insights = serviceNodes.slice(0, 3).map((serviceNode) => {
      const serviceLabel = (serviceNode.data.displayLabel as string) || (serviceNode.data.label as string);
      const originalLatency = (serviceNode.data.nodeLatencyMs as number) || defaultLatencies.Service || 30;
      const increasedLatency = originalLatency * 1.5;
      const latencyDelta = increasedLatency - originalLatency;
      const nodeQPS = (serviceNode.data.nodeQPS as number) || 0;
      const serviceConfig = serviceNode.data.config as NodeConfig | undefined;
      const downstreamIds = adjacencyById.get(serviceNode.id) || [];
      const saturatedDownstream: { name: string; usage: number; suggestion: string }[] = [];

      const serviceCapacity =
        serviceConfig && nodeQPS > 0
          ? calculateCapacityUsage("Service", serviceConfig, {
              nodeQPS,
              nodeBandwidthMBps: (serviceNode.data.nodeBandwidthMBps as number) || 0,
              nodeQueueDepth: serviceNode.data.nodeQueueDepth as number | undefined,
              nodeStorageUsageGB: serviceNode.data.nodeStorageUsageGB as number | undefined,
              nodeLatencyMs: increasedLatency,
            })
          : CAPACITY_NONE;

      downstreamIds.forEach((targetId) => {
        const targetNode = nodesWithMetrics.find((n) => n.id === targetId);
        if (!targetNode) return;
        const label = targetNode.data.label as string;
        const config = targetNode.data.config as NodeConfig | undefined;
        if (!config) return;
        const targetQPS = ((targetNode.data.nodeQPS as number) || 0) * 1.2;
        const usage = calculateCapacityUsage(label, config, {
          nodeQPS: targetQPS,
          nodeBandwidthMBps: (targetNode.data.nodeBandwidthMBps as number) || 0,
          nodeQueueDepth: targetNode.data.nodeQueueDepth as number | undefined,
          nodeStorageUsageGB: targetNode.data.nodeStorageUsageGB as number | undefined,
          nodeLatencyMs: (targetNode.data.nodeLatencyMs as number) || defaultLatencies[label] || 20,
        });
        if (usage.percentage >= 95) {
          saturatedDownstream.push({
            name: (targetNode.data.displayLabel as string) || label,
            usage: usage.percentage,
            suggestion: getMitigationSuggestion(label),
          });
        }
      });

      const suggestions: string[] = [];
      if (serviceCapacity.percentage >= 90) {
        suggestions.push("Scale service instances or reduce latency via caching.");
      }
      saturatedDownstream.forEach((downstream) => suggestions.push(downstream.suggestion));
      if (!suggestions.length) {
        suggestions.push("No immediate risk. Monitor latency and cache hit rates.");
      }
      return {
        serviceName: serviceLabel,
        latencyDelta,
        saturatedDownstream,
        suggestions,
      };
    });
    return insights;
  }, [adjacencyById, nodesWithMetrics]);


  const flowInsight = useMemo(() => {
    if (!currentFlow) return null;
    const detailedSteps = currentFlow.steps.map((step) => {
      const node = nodesWithMetrics.find((n) => (n.data.label as string) === step.label);
      const latency = (node?.data.nodeLatencyMs as number) ?? defaultLatencies[step.label] ?? 0;
      const qps = node?.data.nodeQPS as number | undefined;
      const status = (node?.data.nodeStatus as NodeHealthStatus) || "healthy";
      return {
        ...step,
        latency,
        qps,
        status,
      };
    });
    const totalLatency = detailedSteps.reduce((sum, step) => sum + (step.latency || 0), 0);
    return {
      flow: currentFlow,
      steps: detailedSteps,
      totalLatency,
    };
  }, [currentFlow, nodesWithMetrics]);

  const nodeTypes = {
    custom: CustomNode,
  };

  return (
    <NodeConfigureContext.Provider value={handleNodeConfigure}>
      <NodeRenameContext.Provider value={handleNodeRename}>
      <div className="app-shell">
        <input
          type="file"
          accept="application/json"
          ref={importInputRef}
          style={{ display: "none" }}
          onChange={handleImportTemplateFile}
        />
        <header className="app-header">
            <div className="app-branding">
              <h1>System Design Sandbox</h1>
              <p>Model distributed systems, stress them, and observe live metrics.</p>
            </div>
            <div className="view-toggle">
              <button
                type="button"
                className={activeView === "builder" ? "active" : ""}
                onClick={() => setActiveView("builder")}
              >
                Design Canvas
              </button>
              <button
                type="button"
                className={activeView === "metrics" ? "active" : ""}
                onClick={() => setActiveView("metrics")}
              >
                Metrics Board
              </button>
              <button
                type="button"
                className={activeView === "guide" ? "active" : ""}
                onClick={() => setActiveView("guide")}
              >
                Guide
              </button>
            </div>
          </header>
          {activeView === "builder" && (
            <>
      <div className="layout-controls">
        <div className="template-menu" ref={templateMenuRef}>
          <button
            type="button"
            className={`template-trigger ${templateMenuOpen ? "open" : ""}`}
            onClick={() => setTemplateMenuOpen((prev) => !prev)}
          >
            {templateMenuOpen ? "Close Templates" : "Load Template"}
          </button>
          {templateMenuOpen && (
            <div className="template-dropdown" role="listbox" aria-label="System templates">
              {systemTemplates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  className={`template-option ${templatePreviewId === template.id ? "active" : ""}`}
                  onMouseEnter={() => setTemplatePreviewId(template.id)}
                  onFocus={() => setTemplatePreviewId(template.id)}
                  onClick={() => {
                    const sidebarOpen = showScenarioPanel || Boolean(selectedFlowId);
                    loadTemplate(template.id, sidebarOpen);
                    setTemplateMenuOpen(false);
                  }}
                >
                  <span className="template-option-name">{template.name}</span>
                  <span className="template-option-meta">{template.nodes.length} nodes</span>
                </button>
              ))}
            </div>
          )}
          {templateMenuOpen && templatePreview && (
            <div className="template-tooltip">
              <strong>{templatePreview.name}</strong>
              <p>{templatePreview.description}</p>
            </div>
          )}
          <div className="template-actions">
            <button type="button" onClick={handleExportTemplate}>
              Export Template
            </button>
            <button type="button" onClick={handleImportTemplateClick}>
              Import Template
            </button>
          </div>
        </div>
        <div className="flow-menu">
          <div
            className={`flow-trigger ${flowMenuOpen ? "open" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => setFlowMenuOpen((prev) => !prev)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setFlowMenuOpen((prev) => !prev);
              }
            }}
          >
            <div>
              <span className="flow-trigger-label">Message Flow Simulator</span>
              <p className="flow-trigger-hint">
                {currentFlow
                  ? `Animating “${currentFlow.name}”.`
                  : "Pick a scenario to watch a request travel through the system."}
              </p>
            </div>
            <span className="flow-trigger-indicator">{flowMenuOpen ? "✕" : "▶"}</span>
          </div>
          {flowMenuOpen && (
            <div className="flow-dropdown">
              {messageFlows.map((flow) => (
                <button
                  type="button"
                  key={flow.id}
                  className={`flow-option ${
                    selectedFlowId === flow.id ? "active" : ""
                  } ${availableFlowIds.has(flow.id) ? "" : "disabled"}`}
                  onClick={() => {
                    if (!availableFlowIds.has(flow.id)) return;
                    setSelectedFlowId(flow.id);
                    setFlowMenuOpen(false);
                  }}
                >
                  <div className="flow-option-main">
                    <span className="flow-option-name">{flow.name}</span>
                    <span className="flow-option-type">{flow.type}</span>
                  </div>
                  <p className="flow-option-description">
                    {availableFlowIds.has(flow.id)
                      ? flow.description
                      : "Unavailable in this layout"}
                  </p>
                </button>
              ))}
              {selectedFlowId && (
                <button
                  type="button"
                  className="flow-option clear"
                  onClick={() => {
                    setSelectedFlowId(null);
                    setFlowMenuOpen(false);
                  }}
                >
                  Clear Animation
                </button>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="control-pill"
          data-active={showLeftPanel}
          onClick={() => setShowLeftPanel((prev) => !prev)}
        >
          {showLeftPanel ? "Hide Components" : "Show Components"}
        </button>
        <button
          type="button"
          className="control-pill"
          data-active={showScenarioPanel}
          onClick={() => setShowScenarioPanel((prev) => !prev)}
        >
          {showScenarioPanel ? "Hide Scenarios" : "Show Scenarios"}
        </button>
        <button
          type="button"
          className="control-pill"
          data-active={showPatternPanel}
          onClick={() => setShowPatternPanel((prev) => !prev)}
        >
          {showPatternPanel ? "Hide Patterns" : "Show Patterns"}
        </button>
        <button
          type="button"
          className="control-pill"
          data-active={showTrafficPanel}
          onClick={() => setShowTrafficPanel((prev) => !prev)}
        >
          {showTrafficPanel ? "Hide Traffic" : "Show Traffic"}
        </button>
        <button type="button" className="control-pill" data-active="false" onClick={resetCanvas}>
          Clear Canvas
        </button>
        {connectionError && <div className="connection-error">{connectionError}</div>}
      </div>
      <div className="app-layout">
        {showLeftPanel && (
          <aside className="component-panel">
            <h2>Components</h2>
            <div className="component-category-list">
              {componentCategories.map((category) => {
                const isOpen = openCategories[category.id];
                return (
                  <div key={category.id} className="component-category">
                    <button
                      type="button"
                      className="accordion-header"
                      onClick={() =>
                        setOpenCategories((prev) => ({
                          ...prev,
                          [category.id]: !prev[category.id],
                        }))
                      }
                    >
                      <span>{category.name}</span>
                      <span>{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <>
                        {category.description && <p className="accordion-description">{category.description}</p>}
                        <div className="component-list">
                          {category.items.map((component) => (
                            <div
                              key={component.type}
                              className="component-item"
                              draggable
                              onDragStart={(event) => onDragStart(event, component.label)}
                              title={`${component.label} (${category.name})`}
                            >
                              {component.label}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="panel-hint">
              <p>⚙️ Click ⚙️ button or double-click a node to configure</p>
              <p>💡 Double-click an edge to reverse its direction</p>
              <p>🗑️ Select a node and press Delete to remove it</p>
              <p>🔌 Click a connection, then press Delete to remove it</p>
              <p>🛡️ Add Circuit Breakers to reroute around outages</p>
            </div>
          </aside>
        )}
        {showPatternPanel && (
          <aside className="pattern-panel-wrapper">
            <div className="pattern-library">
              <div className="pattern-library-header">
                <h3>Pattern Library</h3>
                <p>Drop-in system motifs to accelerate exploration.</p>
              </div>
              <div className="pattern-list">
                {systemPatterns.map((pattern) => (
                  <div key={pattern.id} className="pattern-card">
                    <div>
                      <strong>{pattern.name}</strong>
                      <p>{pattern.description}</p>
                    </div>
                    <button type="button" onClick={() => applyPattern(pattern.id)}>
                      Add Pattern
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
        {showTrafficPanel && (
          <aside className="traffic-panel-wrapper">
            <TrafficProfilePanel
              profile={trafficProfile}
              onProfileChange={handleTrafficProfileChange}
              onApplyProfile={handleApplyTrafficProfile}
            />
          </aside>
        )}
        <div className="canvas-container">
          <div ref={reactFlowWrapper} className="reactflow-wrapper">
            <ReactFlow
              nodes={nodesForCanvas}
              edges={edgesForCanvas}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onEdgeClick={onEdgeClick}
              onNodesDelete={onNodesDelete}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onPaneClick={onPaneClick}
              onConnect={onConnect}
              onEdgeDoubleClick={onEdgeDoubleClick}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onInit={setReactFlowInstance}
              deleteKeyCode={["Delete", "Backspace"]}
              fitView
            >
              <Controls />
              <Background />
            </ReactFlow>
          </div>
        </div>
        {(showScenarioPanel || flowInsight) && (
        <div className="right-sidebar">
            {flowInsight && (
              <div className="flow-panel">
                <div className="flow-panel-header">
                  <h3>{flowInsight.flow.name}</h3>
                  <p>{flowInsight.flow.description}</p>
                  <div className="flow-meta">
                    <span>Type: {flowInsight.flow.type}</span>
                    <span>Size: {(flowInsight.flow.messageSizeBytes / 1024).toFixed(1)} KB</span>
                    <span>Total Latency: {flowInsight.totalLatency.toFixed(1)} ms</span>
                  </div>
                </div>
                <div className="flow-steps">
                  {flowInsight.steps.map((step, index) => (
                    <div key={`${step.label}-${index}`} className={`flow-step status-${step.status}`}>
                      <div className="flow-step-index">{index + 1}</div>
                      <div className="flow-step-content">
                        <div className="flow-step-label">{step.label}</div>
                        {step.description && <div className="flow-step-desc">{step.description}</div>}
                        <div className="flow-step-metrics">
                          <span>Latency: {step.latency.toFixed(1)} ms</span>
                          {step.qps !== undefined && <span>QPS: {step.qps.toFixed(0)}</span>}
                          <span>Status: {step.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {whatIfInsights.length > 0 && (
              <div className="what-if-panel">
                <div className="what-if-header">
                  <h3>What-if Insights</h3>
                  <p>Simulated +50% service latency spike.</p>
                </div>
                <div className="what-if-list">
                  {whatIfInsights.map((insight, index) => (
                    <div key={`${insight.serviceName}-${index}`} className="what-if-card">
                      <div className="what-if-card-header">
                        <strong>{insight.serviceName}</strong>
                        <span>+{insight.latencyDelta.toFixed(0)} ms latency</span>
                      </div>
                      {insight.saturatedDownstream.length > 0 ? (
                        <ul className="what-if-impact-list">
                          {insight.saturatedDownstream.map((downstream) => (
                            <li key={downstream.name}>
                              <span>{downstream.name}</span>
                              <span>{downstream.usage.toFixed(0)}%</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="what-if-muted">No downstream saturation predicted.</p>
                      )}
                      <ul className="what-if-suggestions">
                        {insight.suggestions.map((suggestion, suggestionIndex) => (
                          <li key={`${suggestion}-${suggestionIndex}`}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showScenarioPanel && (
              <ScenarioPanel
                nodes={nodesWithMetrics}
                events={scenarioEvents}
                clock={scenarioClock}
                playing={scenarioPlaying}
                onCreateEvent={handleCreateScenarioEvent}
                onRemoveEvent={handleRemoveScenarioEvent}
                onTogglePlay={handleToggleScenarioPlay}
                onResetClock={handleResetScenario}
                onTriggerEvent={handleTriggerScenarioEvent}
              />
            )}
          </div>
        )}
      </div>
      {selectedNode && (
        <ConfigPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSave={handleConfigSave}
        />
      )}
            </>
          )}
          {activeView === "metrics" && (
            <MetricsDashboard
              summary={monitoringSummary}
              nodeInsights={nodeInsights}
              trafficProfile={trafficProfile}
              scenarioEvents={scenarioEvents}
            />
          )}
          {activeView === "guide" && <GuideView />}
        </div>
      </NodeRenameContext.Provider>
    </NodeConfigureContext.Provider>
  );
}
const componentCategories = [
  {
    id: "clients",
    name: "Clients & Entry",
    description: "Traffic sources and user entry points.",
    items: [{ type: "User", label: "User" }],
  },
  {
    id: "edge",
    name: "Edge & Delivery",
    description: "Edge compute, CDN, and real-time gateways.",
    items: [
      { type: "CDN", label: "CDN" },
      { type: "Realtime Gateway", label: "Realtime Gateway" },
      { type: "Edge Compute", label: "Edge Compute" },
    ],
  },
  {
    id: "network",
    name: "Networking & Control",
    description: "Routing, gateways, and protective layers.",
    items: [
      { type: "Load Balancer", label: "Load Balancer" },
      { type: "API Gateway", label: "API Gateway" },
      { type: "Service Mesh", label: "Service Mesh" },
      { type: "Circuit Breaker", label: "Circuit Breaker" },
    ],
  },
  {
    id: "application",
    name: "Application Services",
    description: "Core business logic and processing layers.",
    items: [
      { type: "Service", label: "Service" },
      { type: "Stream Processor", label: "Stream Processor" },
      { type: "Notification Service", label: "Notification Service" },
    ],
  },
  {
    id: "messaging",
    name: "Caching & Messaging",
    description: "Performance and asynchronous pipelines.",
    items: [
      { type: "Cache", label: "Cache" },
      { type: "Queue", label: "Queue" },
      { type: "Message Broker", label: "Message Broker" },
    ],
  },
  {
    id: "data",
    name: "Data & Storage",
    description: "Primary data stores and analytical systems.",
    items: [
      { type: "DB", label: "Database" },
      { type: "Search Index", label: "Search Index" },
      { type: "Object Storage", label: "Object Storage" },
      { type: "Object Storage Tier", label: "Object Storage Tier" },
      { type: "Analytics Warehouse", label: "Analytics Warehouse" },
    ],
  },
  {
    id: "observability",
    name: "Observability",
    description: "Monitoring, logging, and tracing.",
    items: [
      { type: "Metrics Collector", label: "Metrics Collector" },
      { type: "Log Aggregator", label: "Log Aggregator" },
      { type: "Tracing Service", label: "Tracing Service" },
    ],
  },
];

const nodeCategoryMap: Record<string, string> = {
  User: "Clients & Entry",
  CDN: "Edge & Delivery",
  "Realtime Gateway": "Edge & Delivery",
  "Edge Compute": "Edge & Delivery",
  "Load Balancer": "Networking & Control",
  "API Gateway": "Networking & Control",
  "Service Mesh": "Networking & Control",
  "Circuit Breaker": "Networking & Control",
  Service: "Application Services",
  "Stream Processor": "Application Services",
  "Notification Service": "Application Services",
  Cache: "Caching & Messaging",
  Queue: "Caching & Messaging",
  "Message Broker": "Caching & Messaging",
  Database: "Data & Storage",
  DB: "Data & Storage",
  "Search Index": "Data & Storage",
  "Object Storage": "Data & Storage",
  "Object Storage Tier": "Data & Storage",
  "Analytics Warehouse": "Data & Storage",
  "Metrics Collector": "Observability",
  "Log Aggregator": "Observability",
  "Tracing Service": "Observability",
};

const allowedCategoryLinks: Record<string, string[]> = {
  "Clients & Entry": ["Edge & Delivery", "Networking & Control", "Application Services"],
  "Edge & Delivery": ["Networking & Control", "Application Services", "Caching & Messaging"],
  "Networking & Control": [
    "Networking & Control",
    "Application Services",
    "Caching & Messaging",
    "Data & Storage",
    "Observability",
  ],
  "Application Services": [
    "Application Services",
    "Caching & Messaging",
    "Data & Storage",
    "Observability",
  ],
  "Caching & Messaging": ["Application Services", "Data & Storage", "Observability"],
  "Data & Storage": ["Application Services", "Observability"],
  Observability: [],
};

const getNodeCategory = (label?: string): string | undefined => {
  if (!label) return undefined;
  return nodeCategoryMap[label] || nodeCategoryMap[label.replace(/^\s+|\s+$/g, "")];
};

const canConnectLabels = (sourceLabel?: string, targetLabel?: string): boolean => {
  if (!sourceLabel || !targetLabel) return true;
  const sourceCategory = getNodeCategory(sourceLabel);
  const targetCategory = getNodeCategory(targetLabel);
  if (!sourceCategory || !targetCategory) return true;
  const allowedTargets = allowedCategoryLinks[sourceCategory];
  if (!allowedTargets) return true;
  return allowedTargets.includes(targetCategory);
};
