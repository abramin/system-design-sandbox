import { useContext, useEffect, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

import type { NodeHealthStatus } from "../../../types/system";
import type { NodeConfig } from "../types";
import { componentIcons } from "../constants/icons";
import { NodeConfigureContext, NodeRenameContext } from "../context/node-config";
import { calculateCapacityUsage, formatCapacityLabel } from "../utils/capacity";
import { getC4Symbol } from "../utils/nodes";

export function CustomNode({ data, selected, id }: NodeProps) {
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
          {"maxConnections" in config && config.maxConnections && (
            <div className="info-item">
              <span className="info-label">Max Conn:</span>
              <span className="info-value">{formatNumber(config.maxConnections)}</span>
            </div>
          )}
          {"throughputRate" in config && config.throughputRate && (
            <div className="info-item">
              <span className="info-label">Throughput:</span>
              <span className="info-value">{formatNumber(config.throughputRate)}/s</span>
            </div>
          )}
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
          {"processingRate" in config && config.processingRate && (
            <div className="info-item">
              <span className="info-label">Process:</span>
              <span className="info-value">{formatNumber(config.processingRate)}/s</span>
            </div>
          )}
          {"retentionHours" in config && config.retentionHours && (
            <div className="info-item">
              <span className="info-label">Retention:</span>
              <span className="info-value">{config.retentionHours}h</span>
            </div>
          )}
          {"instances" in config && config.instances && (
            <div className="info-item">
              <span className="info-label">Instances:</span>
              <span className="info-value">{config.instances}</span>
            </div>
          )}
          {"hitRate" in config && config.hitRate && (
            <div className="info-item">
              <span className="info-label">Hit Rate:</span>
              <span className="info-value">{config.hitRate}%</span>
            </div>
          )}
          {"ttl" in config && config.ttl && (
            <div className="info-item">
              <span className="info-label">TTL:</span>
              <span className="info-value">{config.ttl}s</span>
            </div>
          )}
          {"replicationFactor" in config && config.replicationFactor && (
            <div className="info-item">
              <span className="info-label">Replicas:</span>
              <span className="info-value">{config.replicationFactor}</span>
            </div>
          )}
          {"readWriteSplit" in config && typeof config.readWriteSplit === "boolean" && (
            <div className="info-item">
              <span className="info-label">RW Split:</span>
              <span className="info-value">{config.readWriteSplit ? "Yes" : "No"}</span>
            </div>
          )}
          {"storageGB" in config && config.storageGB && (
            <div className="info-item">
              <span className="info-label">Storage:</span>
              <span className="info-value">{formatStorage(config.storageGB)} provisioned</span>
            </div>
          )}
          {"storageGB" in config && config.storageGB && nodeStorageUsageGB !== undefined && (
            <div className="info-item">
              <span className="info-label">Usage:</span>
              <span className="info-value">{formatStorage(nodeStorageUsageGB)} used</span>
            </div>
          )}
          {"querySlots" in config && config.querySlots && (
            <div className="info-item">
              <span className="info-label">Slots:</span>
              <span className="info-value">{config.querySlots}</span>
            </div>
          )}
          {"latencyMs" in config && config.latencyMs && (
            <div className="info-item">
              <span className="info-label">Latency:</span>
              <span className="info-value">{config.latencyMs}ms</span>
            </div>
          )}
          {"errorRate" in config && config.errorRate && (
            <div className="info-item">
              <span className="info-label">Error:</span>
              <span className="info-value">{(config.errorRate * 100).toFixed(2)}%</span>
            </div>
          )}
        </div>
      )}
      <div className="node-metrics">
        <div className="metric-item">
          <span className="metric-label">QPS</span>
          <span className="metric-value">{formatNumber(nodeQPS)}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">BW</span>
          <span className="metric-value">{nodeBandwidthMBps.toFixed(1)} MB/s</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Latency</span>
          <span className="metric-value">
            {nodeLatencyMs !== undefined ? `${Math.round(nodeLatencyMs)}ms` : "N/A"}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Error</span>
          <span className="metric-value">
            {nodeErrorRate !== undefined ? `${(nodeErrorRate * 100).toFixed(2)}%` : "N/A"}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">$/mo</span>
          <span className="metric-value">
            {nodeCostUsd !== undefined ? `$${(nodeCostUsd / 1_000_000).toFixed(2)}M` : "N/A"}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default CustomNode;
