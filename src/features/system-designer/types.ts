import type { Edge, Node } from "reactflow";
import type { SloTargets } from "../../types/system";

export interface UserConfig {
  daus?: number;
  messageSizeBytes?: number;
  latencyMs?: number;
  errorRate?: number;
}

export interface LoadBalancerConfig {
  algorithm?: string;
  healthCheckInterval?: number;
  maxConnections?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

export interface ServiceConfig {
  maxConnections?: number;
  messageSizeBytes?: number;
  instances?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

export interface QueueConfig {
  throughputRate?: number;
  messageSizeBytes?: number;
  maxQueueDepth?: number;
  retentionHours?: number;
  processingRate?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

export interface CacheConfig {
  storageGB?: number;
  maxConnections?: number;
  hitRate?: number;
  ttl?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
  costPerGbMonthUsd?: number;
}

export interface DatabaseConfig {
  storageGB?: number;
  maxConnections?: number;
  readWriteSplit?: boolean;
  replicationFactor?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
  costPerGbMonthUsd?: number;
}

export interface CDNConfig {
  cacheHitRate?: number;
  edgeLocations?: number;
  bandwidthGBps?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerGbTransferUsd?: number;
}

export interface MessageBrokerConfig {
  throughputRate?: number;
  messageSizeBytes?: number;
  maxConnections?: number;
  retentionHours?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

export interface SearchIndexConfig {
  storageGB?: number;
  maxConnections?: number;
  indexSize?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerQueryUsd?: number;
}

export interface ObjectStorageConfig {
  storageGB?: number;
  maxConnections?: number;
  durability?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerGbMonthUsd?: number;
}

export interface APIGatewayConfig {
  maxConnections?: number;
  rateLimit?: number;
  timeout?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

export interface MetricsCollectorConfig {
  throughputRate?: number;
  storageGB?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

export interface LogAggregatorConfig {
  ingestionRate?: number;
  retentionDays?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerGbMonthUsd?: number;
}

export interface TracingServiceConfig {
  spanRate?: number;
  storageGB?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

export interface ServiceMeshConfig {
  maxConnections?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

export interface AnalyticsWarehouseConfig {
  querySlots?: number;
  storageGB?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerQueryUsd?: number;
}

export interface StreamProcessorConfig {
  throughputRate?: number;
  stateStoreGB?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

export interface NotificationServiceConfig {
  throughputRate?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerRequestUsd?: number;
}

export interface RealtimeGatewayConfig {
  maxConnections?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerConnectionUsd?: number;
}

export interface EdgeComputeConfig {
  regions?: number;
  latencyMs?: number;
  errorRate?: number;
  costPerInvocationUsd?: number;
}

export interface CircuitBreakerConfig {
  errorThreshold?: number;
  latencyThresholdMs?: number;
  resetTimeoutSeconds?: number;
  latencyMs?: number;
  errorRate?: number;
}

export type NodeConfig =
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

export interface MessageFlowStep {
  label: string;
  description?: string;
}

export interface MessageFlow {
  id: string;
  name: string;
  description: string;
  type: "read" | "write" | "stream";
  messageSizeBytes: number;
  steps: MessageFlowStep[];
}

export interface SystemTemplate {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  sloTargets?: SloTargets;
}

export interface SystemPattern {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

export type TemplateDisplayLabels = Record<string, Record<string, string>>;
