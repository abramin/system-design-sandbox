import type {
  CapacityUsage,
  CapacityUsageType,
  ScenarioImpact,
  TrafficProfile,
} from "../../../types/system";

export const defaultTrafficProfile: TrafficProfile = {
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

export const defaultLatencies: Record<string, number> = {
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

export const DEFAULT_REQUESTS_PER_USER_PER_DAY = 20;

export const CAPACITY_NONE: CapacityUsage = { percentage: 0, type: "none" };

export const capacityTypeLabels: Record<Exclude<CapacityUsageType, "none">, string> = {
  connections: "Connections",
  rate: "Rate Limit",
  bandwidth: "Bandwidth",
  throughput: "Throughput",
  storage: "Storage",
  queueDepth: "Queue Depth",
};

export const baselineImpact: ScenarioImpact = {
  status: "healthy",
  throughputMultiplier: 1,
  latencyMultiplier: 1,
  errorRateDelta: 0,
};
