import { useMemo, useId } from "react";
import type {
  MonitoringSummary,
  TrafficProfile,
  ScenarioEvent,
  NodeHealthStatus,
  CapacityUsage,
  SloTargets,
} from "../types/system";

export interface NodeInsight {
  id: string;
  label: string;
  displayLabel: string;
  status: NodeHealthStatus;
  qps: number;
  latencyMs: number;
  errorRate: number;
  costUsd: number;
  capacity: CapacityUsage;
}

interface MetricsDashboardProps {
  summary: MonitoringSummary | null;
  nodeInsights: NodeInsight[];
  trafficProfile: TrafficProfile;
  scenarioEvents: ScenarioEvent[];
  sloTargets: SloTargets;
  onUpdateSloTargets: (next: SloTargets) => void;
}

const statusOrder: NodeHealthStatus[] = ["healthy", "degraded", "down"];

const formatNumber = (value: number, decimals = 0): string => {
  if (!Number.isFinite(value)) return "–";
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(decimals)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(decimals)}K`;
  return value.toFixed(decimals);
};

const formatMs = (value: number): string => `${value.toFixed(1)} ms`;

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;

const formatCurrency = (value: number): string =>
  value >= 1000 ? `$${formatNumber(value, 1)}` : `$${value.toFixed(2)}`;

const severityColor = (status: NodeHealthStatus): string => {
  switch (status) {
    case "healthy":
      return "#22c55e";
    case "degraded":
      return "#f97316";
    case "down":
      return "#dc2626";
    default:
      return "#94a3b8";
  }
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
};

const buildTrendSeries = (baseValue: number, modifier = 0, length = 12, jitter = 0.25): number[] => {
  const safeBase = Math.max(baseValue || 1, 1);
  return Array.from({ length }, (_, index) => {
    const waveA = Math.sin(index * 0.8 + modifier) * jitter;
    const waveB = Math.cos(index * 0.4 + modifier * 0.5) * jitter * 0.6;
    const impulse = modifier > 0 ? Math.sin((index + modifier) * 0.2) * jitter * 0.4 : 0;
    const factor = 1 + waveA + waveB + impulse;
    return Number(Math.max(0, safeBase * factor).toFixed(2));
  });
};

interface SparklineChartProps {
  data: number[];
  color: string;
  title: string;
  subtitle: string;
  unit?: string;
  gradient?: { from: string; to: string };
}

function SparklineChart({ data, color, title, subtitle, unit, gradient }: SparklineChartProps) {
  const gradientId = useId();
  const width = 120;
  const height = 50;
  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const range = Math.max(maxValue - minValue, 1);
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * width;
    const normalized = (value - minValue) / range;
    const y = height - normalized * (height - 6) - 3;
    return { x, y, value };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  const peak = points.length ? points.reduce((acc, point) => Math.max(acc, point.value), 0) : 0;
  const trough = points.length
    ? points.reduce((acc, point) => Math.min(acc, point.value), Number.POSITIVE_INFINITY)
    : 0;

  return (
    <div className="chart-card">
      <header>
        <div>
          <h3>{title}</h3>
          <span>{subtitle}</span>
        </div>
        <strong>{`${formatNumber(peak, 1)}${unit ?? ""}`}</strong>
      </header>
      <svg
        className="sparkline"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${title} sparkline`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={gradient?.from || color}
              stopOpacity="0.5"
            />
            <stop
              offset="100%"
              stopColor={gradient?.to || color}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} opacity={0.6} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <circle
            key={`${title}-${index}`}
            cx={point.x}
            cy={point.y}
            r={1.8}
            fill={color}
            opacity={index === points.length - 1 ? 1 : 0.6}
          />
        ))}
      </svg>
      <div className="chart-footer">
        <span>{`Min ${formatNumber(trough, 1)}${unit ?? ""}`}</span>
        <span>{`Max ${formatNumber(peak, 1)}${unit ?? ""}`}</span>
      </div>
    </div>
  );
}

export default function MetricsDashboard({
  summary,
  nodeInsights,
  trafficProfile,
  scenarioEvents,
  sloTargets,
  onUpdateSloTargets,
}: MetricsDashboardProps) {
  const statusCounts = useMemo(() => {
    return nodeInsights.reduce(
      (acc, node) => {
        acc[node.status] += 1;
        return acc;
      },
      { healthy: 0, degraded: 0, down: 0 } as Record<NodeHealthStatus, number>
    );
  }, [nodeInsights]);

  const capacityLeaders = useMemo(() => {
    return nodeInsights
      .filter((node) => node.capacity.type !== "none")
      .sort((a, b) => b.capacity.percentage - a.capacity.percentage)
      .slice(0, 6);
  }, [nodeInsights]);

  const costLeaders = useMemo(() => {
    return nodeInsights.slice().sort((a, b) => b.costUsd - a.costUsd).slice(0, 4);
  }, [nodeInsights]);

  const latencyHotspots = useMemo(() => {
    return nodeInsights.slice().sort((a, b) => b.latencyMs - a.latencyMs).slice(0, 4);
  }, [nodeInsights]);

  const incidentFeed = useMemo(() => {
    return scenarioEvents
      .slice()
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 6);
  }, [scenarioEvents]);

  const totalNodes = nodeInsights.length || 1;
  const healthyPercent = (statusCounts.healthy / totalNodes) * 100;
  const latencyBreached = summary ? summary.avgLatencyMs > sloTargets.latencyMs : false;
  const errorBreached = summary ? summary.errorRate > sloTargets.errorRate : false;
  const sloSuggestions: string[] = [];
  if (latencyBreached) {
    sloSuggestions.push("Avg latency exceeds target. Scale services, add caching, or reduce fan-out.");
  }
  if (errorBreached) {
    sloSuggestions.push("Error budget exceeded. Add redundancy, improve retries, or stabilize downstream tiers.");
  }
  const handleSloChange = (field: keyof SloTargets, value: number) => {
    const next = {
      ...sloTargets,
      [field]: Number.isFinite(value) ? Math.max(0, value) : sloTargets[field],
    };
    onUpdateSloTargets(next);
  };
  const qpsTrend = useMemo(
    () =>
      buildTrendSeries(
        Math.max(summary?.totalQPS ?? totalNodes * 500, 50),
        scenarioEvents.length || 1,
        12,
        0.3
      ),
    [summary?.totalQPS, scenarioEvents.length, totalNodes]
  );
  const latencyTrend = useMemo(
    () =>
      buildTrendSeries(
        Math.max(summary?.avgLatencyMs ?? 45, 5),
        summary?.p95LatencyMs ?? 60,
        12,
        0.18
      ),
    [summary?.avgLatencyMs, summary?.p95LatencyMs]
  );
  const errorTrend = useMemo(
    () =>
      buildTrendSeries(
        Math.max((summary?.errorRate ?? 0.001) * 100, 0.01),
        (summary?.activeIncidents ?? 0) + statusCounts.down * 2,
        12,
        0.35
      ),
    [summary?.errorRate, summary?.activeIncidents, statusCounts.down]
  );

  return (
    <div className="metrics-dashboard">
      <section className="metrics-summary-grid">
        <div className="metric-card">
          <span className="metric-label">Total QPS</span>
          <strong className="metric-value">
            {summary ? formatNumber(summary.totalQPS, 1) : "0"}
          </strong>
          <span className="metric-subtitle">Across all components</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Avg Latency</span>
          <strong className="metric-value">
            {summary ? formatMs(summary.avgLatencyMs) : "0 ms"}
          </strong>
          <span className="metric-subtitle">P95 {summary ? formatMs(summary.p95LatencyMs) : "0 ms"}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Error Rate</span>
          <strong className="metric-value">
            {summary ? formatPercent(summary.errorRate || 0) : "0%"}
          </strong>
          <span className="metric-subtitle">
            {summary ? `${summary.saturatedNodes} saturated nodes` : "0 saturated"}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Monthly Cost</span>
          <strong className="metric-value">
            {summary ? formatCurrency(summary.monthlyCostUsd) : "$0.00"}
          </strong>
          <span className="metric-subtitle">
            Bandwidth {summary ? `${formatNumber(summary.totalBandwidthMBps, 1)} MB/s` : "0 MB/s"}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Base DAUs</span>
          <strong className="metric-value">{formatNumber(trafficProfile.baseDAUs, 1)}</strong>
          <span className="metric-subtitle">Peak +{trafficProfile.peakPercent}%</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Active Incidents</span>
          <strong className="metric-value">
            {summary ? summary.activeIncidents : 0}
          </strong>
          <span className="metric-subtitle">{incidentFeed.length} tracked events</span>
        </div>
      </section>
      <section className="metrics-chart-row">
        <SparklineChart
          data={qpsTrend}
          color="#22c55e"
          title="QPS Trend"
          subtitle="Last 12 sampling windows"
          unit=" req/s"
          gradient={{ from: "#22c55e", to: "#bbf7d0" }}
        />
        <SparklineChart
          data={latencyTrend}
          color="#3b82f6"
          title="Latency Pulse"
          subtitle="Avg latency per interval"
          unit=" ms"
          gradient={{ from: "#3b82f6", to: "#bfdbfe" }}
        />
        <SparklineChart
          data={errorTrend}
          color="#f97316"
          title="Error Budget"
          subtitle="Percent of failing requests"
          unit=" %"
          gradient={{ from: "#f97316", to: "#fed7aa" }}
        />
      </section>

      <section className="metrics-slo">
        <div className={`slo-card ${latencyBreached || errorBreached ? "slo-card-alert" : ""}`}>
          <header>
            <div>
              <p className="slo-eyebrow">Service Level Objectives</p>
              <h3>Latency & Error Budgets</h3>
            </div>
            <div className="slo-inputs">
              <label>
                Avg Latency (ms)
                <input
                  type="number"
                  value={sloTargets.latencyMs}
                  min={0}
                  onChange={(e) => handleSloChange("latencyMs", Number(e.target.value))}
                />
              </label>
              <label>
                Error Rate (%)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={(sloTargets.errorRate * 100).toFixed(2)}
                  onChange={(e) => handleSloChange("errorRate", Number(e.target.value) / 100)}
                />
              </label>
            </div>
          </header>
          <div className="slo-status">
            <div className={`slo-indicator ${latencyBreached ? "bad" : "good"}`}>
              <strong>{summary ? formatMs(summary.avgLatencyMs) : "–"}</strong>
              <span>Average latency (target {sloTargets.latencyMs} ms)</span>
            </div>
            <div className={`slo-indicator ${errorBreached ? "bad" : "good"}`}>
              <strong>
                {summary ? formatPercent(summary.errorRate) : "–"}
              </strong>
              <span>Error rate (target {(sloTargets.errorRate * 100).toFixed(2)}%)</span>
            </div>
          </div>
          {sloSuggestions.length > 0 ? (
            <ul className="slo-suggestions">
              {sloSuggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          ) : (
            <p className="slo-success">SLOs are on track. Keep monitoring trends.</p>
          )}
        </div>
      </section>

      <section className="metrics-panels">
        <div className="dashboard-panel status-panel">
          <header>
            <h3>Operational Health</h3>
            <span>{healthyPercent.toFixed(1)}% healthy</span>
          </header>
          <div className="status-gauge">
            <div
              className="status-gauge-fill"
              style={{ width: `${Math.min(100, healthyPercent)}%` }}
            />
          </div>
          <div className="status-breakdown">
            {statusOrder.map((status) => (
              <div key={status} className="status-pill">
                <span
                  className="status-dot"
                  style={{ backgroundColor: severityColor(status) }}
                />
                <span className="status-label">{status}</span>
                <strong>{statusCounts[status]}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel capacity-panel">
          <header>
            <h3>Capacity Hotspots</h3>
            <span>Top constrained nodes</span>
          </header>
          {capacityLeaders.length === 0 ? (
            <p className="panel-empty">No nodes reporting capacity limits.</p>
          ) : (
            <ul className="capacity-list">
              {capacityLeaders.map((node) => (
                <li key={node.id}>
                  <div className="capacity-node">
                    <div>
                      <strong>{node.displayLabel}</strong>
                      <span className="capacity-label">{node.capacity.label || node.capacity.type}</span>
                    </div>
                    <span className="capacity-percentage">{node.capacity.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="capacity-bar">
                    <div
                      className="capacity-bar-fill"
                      style={{
                        width: `${Math.min(100, node.capacity.percentage)}%`,
                        backgroundColor:
                          node.capacity.percentage > 90
                            ? "#dc2626"
                            : node.capacity.percentage > 75
                              ? "#f97316"
                              : "#22c55e",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-panel cost-panel">
          <header>
            <h3>Cost Drivers</h3>
            <span>Estimated monthly spend</span>
          </header>
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Cost</th>
                <th>QPS</th>
              </tr>
            </thead>
            <tbody>
              {costLeaders.map((node) => (
                <tr key={node.id}>
                  <td>{node.displayLabel}</td>
                  <td>{formatCurrency(node.costUsd)}</td>
                  <td>{formatNumber(node.qps, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dashboard-panel latency-panel">
          <header>
            <h3>Latency Hotspots</h3>
            <span>Slowest responders</span>
          </header>
          <table>
            <thead>
              <tr>
                <th>Component</th>
                <th>Latency</th>
                <th>Error Rate</th>
              </tr>
            </thead>
            <tbody>
              {latencyHotspots.map((node) => (
                <tr key={node.id}>
                  <td>{node.displayLabel}</td>
                  <td>{formatMs(node.latencyMs)}</td>
                  <td>{formatPercent(node.errorRate || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dashboard-panel timeline-panel">
          <header>
            <h3>Scenario Timeline</h3>
            <span>Recent synthetic events</span>
          </header>
          {incidentFeed.length === 0 ? (
            <p className="panel-empty">No simulated incidents scheduled.</p>
          ) : (
            <ul className="timeline-list">
              {incidentFeed.map((event) => (
                <li key={event.id}>
                  <div className="timeline-badge">{event.type.replace("_", " ")}</div>
                  <div className="timeline-body">
                    <strong>{event.targetLabel}</strong>
                    <span>
                      Starts at {event.startTime}s • Duration {formatDuration(event.durationSeconds)}
                    </span>
                    <span>Severity {event.severity}%</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-panel traffic-panel">
          <header>
            <h3>Traffic Profile</h3>
            <span>{trafficProfile.description || "Demand assumptions"}</span>
          </header>
          <ul className="traffic-list">
            {trafficProfile.bursts.map((burst) => (
              <li key={burst.label}>
                <div>
                  <strong>{burst.label}</strong>
                  <span>{burst.durationSeconds / 60} min</span>
                </div>
                <div className="traffic-bar">
                  <div
                    className="traffic-bar-fill"
                    style={{
                      width: `${Math.min(100, burst.multiplier * 50)}%`,
                    }}
                  />
                </div>
                <span className="traffic-multiplier">x{burst.multiplier.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
