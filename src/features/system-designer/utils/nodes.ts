import type {
  APIGatewayConfig,
  AnalyticsWarehouseConfig,
  CDNConfig,
  CacheConfig,
  CircuitBreakerConfig,
  DatabaseConfig,
  EdgeComputeConfig,
  LoadBalancerConfig,
  MessageBrokerConfig,
  MetricsCollectorConfig,
  LogAggregatorConfig,
  NodeConfig,
  NotificationServiceConfig,
  ObjectStorageConfig,
  QueueConfig,
  RealtimeGatewayConfig,
  SearchIndexConfig,
  ServiceConfig,
  ServiceMeshConfig,
  StreamProcessorConfig,
  TracingServiceConfig,
  UserConfig,
} from "../types";

export const getC4Symbol = (label: string): string => {
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
};

export const getDefaultConfig = (label: string): NodeConfig => {
  switch (label) {
    case "User":
      return {
        daus: 1000000,
        messageSizeBytes: 1024,
        latencyMs: 5,
        errorRate: 0.0001,
      } as UserConfig;
    case "CDN":
      return {
        cacheHitRate: 95,
        edgeLocations: 200,
        bandwidthGBps: 1.5,
        latencyMs: 8,
        errorRate: 0.0005,
        costPerGbTransferUsd: 0.02,
      } as CDNConfig;
    case "Load Balancer":
      return {
        algorithm: "round-robin",
        healthCheckInterval: 10,
        maxConnections: 100000,
        latencyMs: 10,
        errorRate: 0.0002,
        costPerRequestUsd: 0.00005,
      } as LoadBalancerConfig;
    case "API Gateway":
      return {
        maxConnections: 50000,
        rateLimit: 100000,
        timeout: 30,
        latencyMs: 20,
        errorRate: 0.0005,
        costPerRequestUsd: 0.0001,
      } as APIGatewayConfig;
    case "Service":
      return {
        maxConnections: 20000,
        messageSizeBytes: 1024,
        instances: 8,
        latencyMs: 30,
        errorRate: 0.001,
        costPerRequestUsd: 0.0002,
      } as ServiceConfig;
    case "Queue":
      return {
        throughputRate: 100000,
        messageSizeBytes: 1024,
        maxQueueDepth: 1000000,
        retentionHours: 24,
        processingRate: 80000,
        latencyMs: 5,
        errorRate: 0.0005,
        costPerRequestUsd: 0.00005,
      } as QueueConfig;
    case "Cache":
      return {
        storageGB: 200,
        maxConnections: 50000,
        hitRate: 85,
        ttl: 3600,
        latencyMs: 12,
        errorRate: 0.0005,
        costPerRequestUsd: 0.00003,
        costPerGbMonthUsd: 0.10,
      } as CacheConfig;
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
};
