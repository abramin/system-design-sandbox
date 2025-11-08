import type { MonitoringSummary } from "../types/system";
import "./monitoring-panel.css";

interface MonitoringPanelProps {
  summary: MonitoringSummary | null;
}

const formatNumber = (num: number) => {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
};

export default function MonitoringPanel({ summary }: MonitoringPanelProps) {
  if (!summary) {
    return (
      <div className="monitoring-panel">
        <h3>Monitoring</h3>
        <p>Configure traffic and nodes to see live metrics.</p>
      </div>
    );
  }

  const cards = [
    { label: "Total QPS", value: `${formatNumber(summary.totalQPS)}/s` },
    { label: "Bandwidth", value: `${summary.totalBandwidthMBps.toFixed(2)} MB/s` },
    { label: "Avg Latency", value: `${summary.avgLatencyMs.toFixed(1)} ms` },
    { label: "p95 Latency", value: `${summary.p95LatencyMs.toFixed(1)} ms` },
    { label: "Error Rate", value: `${(summary.errorRate * 100).toFixed(2)}%` },
    { label: "Monthly Cost", value: `$${summary.monthlyCostUsd.toFixed(2)} USD` },
    { label: "Saturated Nodes", value: `${summary.saturatedNodes}` },
    { label: "Active Incidents", value: `${summary.activeIncidents}` },
  ];

  return (
    <div className="monitoring-panel">
      <h3>Monitoring</h3>
      <div className="monitoring-grid">
        {cards.map((card) => (
          <div key={card.label} className="monitoring-card">
            <span className="monitoring-card-label">{card.label}</span>
            <span className="monitoring-card-value">{card.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
