import type { CapacityUsage, CapacityUsageType } from "../../../types/system";
import {
  CAPACITY_NONE,
  capacityTypeLabels,
  defaultLatencies,
} from "../constants/defaults";
import type {
  APIGatewayConfig,
  AnalyticsWarehouseConfig,
  CDNConfig,
  MessageBrokerConfig,
  NodeConfig,
  NotificationServiceConfig,
  ObjectStorageConfig,
  QueueConfig,
  ServiceConfig,
  StreamProcessorConfig,
} from "../types";
import { getNumericConfigValue } from "./metrics";

export interface RuntimeMetrics {
  nodeQPS: number;
  nodeBandwidthMBps: number;
  nodeQueueDepth?: number;
  nodeStorageUsageGB?: number;
  nodeLatencyMs?: number;
}

export const formatCapacityLabel = (usage: CapacityUsage) => {
  if (usage.label) return usage.label;
  if (usage.type === "none") {
    return "Capacity";
  }
  return capacityTypeLabels[usage.type] || "Capacity";
};

export const getInstanceMultiplier = (config: NodeConfig): number => {
  if ("instances" in config && typeof config.instances === "number" && config.instances > 0) {
    return config.instances;
  }
  return 1;
};

export const createUsage = (
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

export function calculateCapacityUsage(
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
    const cdnConfig = config as CDNConfig;
    const bandwidthGb = cdnConfig.bandwidthGBps;
    if (!bandwidthGb) {
      return CAPACITY_NONE;
    }
    const maxBandwidthMBps = bandwidthGb * 1024;
    return createUsage(nodeBandwidthMBps, maxBandwidthMBps, "bandwidth", "Bandwidth", "MB/s");
  }

  if (label === "API Gateway" && "rateLimit" in config && config.rateLimit) {
    const gatewayConfig = config as APIGatewayConfig;
    const rateLimit = gatewayConfig.rateLimit;
    if (!rateLimit) {
      return CAPACITY_NONE;
    }
    return createUsage(safeNodeQPS, rateLimit, "rate", "Rate Limit", "req/s");
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
    const brokerConfig = config as MessageBrokerConfig;
    const throughput = brokerConfig.throughputRate;
    if (!throughput) {
      return CAPACITY_NONE;
    }
    return createUsage(safeNodeQPS, throughput, "throughput", "Throughput", "msg/s");
  }

  if (label === "Stream Processor" && "throughputRate" in config && config.throughputRate) {
    const streamConfig = config as StreamProcessorConfig;
    const throughput = streamConfig.throughputRate;
    if (!throughput) {
      return CAPACITY_NONE;
    }
    return createUsage(safeNodeQPS, throughput, "throughput", "Processing", "msg/s");
  }

  if (label === "Notification Service" && "throughputRate" in config && config.throughputRate) {
    const notificationConfig = config as NotificationServiceConfig;
    const throughput = notificationConfig.throughputRate;
    if (!throughput) {
      return CAPACITY_NONE;
    }
    return createUsage(safeNodeQPS, throughput, "throughput", "Delivery", "msg/s");
  }

  if (label === "Analytics Warehouse" && "querySlots" in config && config.querySlots) {
    const warehouseConfig = config as AnalyticsWarehouseConfig;
    const slots = warehouseConfig.querySlots;
    if (!slots) {
      return CAPACITY_NONE;
    }
    const currentSlots = estimatedConcurrency(getNumericConfigValue(config, "latencyMs"));
    return createUsage(currentSlots, slots, "connections", "Query Slots", "slots");
  }

  if ("maxConnections" in config && config.maxConnections) {
    const serviceConfig = config as ServiceConfig;
    const multiplier = getInstanceMultiplier(serviceConfig);
    const maxConnections = serviceConfig.maxConnections ?? 0;
    if (!maxConnections) {
      return CAPACITY_NONE;
    }
    const effectiveMax = maxConnections * multiplier;
    const currentConnections = estimatedConcurrency(getNumericConfigValue(serviceConfig, "latencyMs"));
    return createUsage(currentConnections, effectiveMax, "connections", "Connections", "conn");
  }

  if ("storageGB" in config && config.storageGB) {
    const storageConfig = config as ObjectStorageConfig;
    const storageGb = storageConfig.storageGB ?? 0;
    if (!storageGb) {
      return CAPACITY_NONE;
    }
    if (nodeStorageUsageGB !== undefined) {
      return createUsage(nodeStorageUsageGB, storageGb, "storage", "Storage", "GB");
    }
    return {
      percentage: 0,
      type: "storage",
      current: 0,
      limit: storageGb,
      unit: "GB",
      label: "Storage",
    };
  }

  return CAPACITY_NONE;
}

export const getMitigationSuggestion = (label: string): string => {
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
