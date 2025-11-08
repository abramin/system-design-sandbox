export interface TrafficBurst {
  label: string;
  multiplier: number; // multiplicative factor on DAUs
  durationSeconds: number;
}

export interface TrafficProfile {
  baseDAUs: number;
  peakPercent: number;
  writeRatio: number; // 0-1
  messageSizeBytes: number;
  bursts: TrafficBurst[];
  description?: string;
}

export type ScenarioEventType = "outage" | "latency_spike" | "error_spike" | "throttle";

export interface ScenarioEvent {
  id: string;
  targetId: string;
  targetLabel: string;
  type: ScenarioEventType;
  severity: number; // 0-100
  startTime: number; // seconds
  durationSeconds: number;
  triggered: boolean;
  note?: string;
}

export type NodeHealthStatus = "healthy" | "degraded" | "down";

export interface ScenarioImpact {
  status: NodeHealthStatus;
  throughputMultiplier: number;
  latencyMultiplier: number;
  errorRateDelta: number;
}

export interface MonitoringSummary {
  totalQPS: number;
  totalBandwidthMBps: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
  monthlyCostUsd: number;
  saturatedNodes: number;
  activeIncidents: number;
}

export type CapacityUsageType =
  | "none"
  | "connections"
  | "rate"
  | "bandwidth"
  | "throughput"
  | "storage"
  | "queueDepth";

export interface CapacityUsage {
  percentage: number;
  type: CapacityUsageType;
  current?: number;
  limit?: number;
  unit?: string;
  label?: string;
}
