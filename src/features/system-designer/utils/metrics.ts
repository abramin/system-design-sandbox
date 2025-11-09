import type { ScenarioEvent, ScenarioImpact } from "../../../types/system";
import { baselineImpact } from "../constants/defaults";
import type {
  CacheConfig,
  NodeConfig,
  QueueConfig,
} from "../types";

export const BYTES_PER_GB = 1024 * 1024 * 1024;
export const DEFAULT_STORAGE_RETENTION_SECONDS = 24 * 3600;

export const deriveScenarioImpacts = (
  events: ScenarioEvent[],
  clock: number
): Record<string, ScenarioImpact> => {
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

export const getNumericConfigValue = (
  config: NodeConfig | undefined,
  key: string
): number | undefined => {
  if (!config) return undefined;
  const value = (config as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
};

export const estimateStorageUsageGB = (
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

export const estimateQueueDepth = (
  config: QueueConfig,
  incomingQPS: number
): number | undefined => {
  if (!config.processingRate && !config.maxQueueDepth && !config.throughputRate) {
    return undefined;
  }

  const processingRate = config.processingRate ?? config.throughputRate ?? incomingQPS;
  const backlogRate = Math.max(0, incomingQPS - processingRate);

  if (backlogRate === 0) {
    return 0;
  }

  const estimatedDepth = Math.round(backlogRate * 60);
  if (!config.maxQueueDepth) {
    return estimatedDepth;
  }

  return Math.min(config.maxQueueDepth, estimatedDepth);
};
