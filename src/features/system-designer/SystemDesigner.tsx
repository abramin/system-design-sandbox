import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  useEdgesState,
  useNodesState,
} from "reactflow";
import type { Connection, Edge, Node, ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";

import TrafficProfilePanel from "../../components/traffic-profile-panel";
import ScenarioPanel from "../../components/scenario-panel";
import MetricsDashboard, { type NodeInsight } from "../../components/metrics-dashboard";
import CoachView from "../../components/coach-view";
import GuidePage from "../../components/guide-page";
import type {
  TrafficProfile,
  ScenarioEvent,
  MonitoringSummary,
  NodeHealthStatus,
  SloTargets,
} from "../../types/system";
import ConfigPanel from "./components/ConfigPanel";
import CustomNode from "./components/CustomNode";
import GuidedLabsPanel, { type GuidedLab } from "./components/GuidedLabsPanel";
import { BuilderToolbar } from "./components/BuilderToolbar";
import { defaultTrafficProfile, defaultLatencies, DEFAULT_REQUESTS_PER_USER_PER_DAY, CAPACITY_NONE } from "./constants/defaults";
import { NodeConfigureContext, NodeRenameContext } from "./context/node-config";
import {
  initialNodes,
  initialEdges,
  systemTemplates,
  templateDisplayLabels,
  systemPatterns,
} from "./data/templates";
import {
  deriveScenarioImpacts,
  estimateQueueDepth,
  estimateStorageUsageGB,
  getNumericConfigValue,
} from "./utils/metrics";
import { calculateCapacityUsage, getMitigationSuggestion } from "./utils/capacity";
import { computeAvailableDimensions, layoutNodesWithFlow } from "./utils/layout";
import { getDefaultConfig } from "./utils/nodes";
import type { CDNConfig, CacheConfig, DatabaseConfig, NodeConfig, QueueConfig, UserConfig } from "./types";
import { useSloTargets } from "./hooks/useSloTargets";

let scenarioEventIdCounter = 1;
let edgeIdCounter = 1;
let nodeIdCounter = 4;

const detectTouchDevice = () => {
  if (typeof window === "undefined") return false;
  const navigatorInfo = window.navigator as Navigator & { msMaxTouchPoints?: number };
  return (
    "ontouchstart" in window ||
    navigatorInfo.maxTouchPoints > 0 ||
    !!navigatorInfo.msMaxTouchPoints
  );
};

interface WhatIfInsight {
  id: string;
  scenarioTitle: string;
  scenarioDescription: string;
  primaryLabel: string;
  metricDeltaLabel: string;
  saturatedDownstream: {
    name: string;
    usage: number;
    suggestion: string;
  }[];
  suggestions: string[];
}

export function SystemDesigner() {
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
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [templatePreviewId, setTemplatePreviewId] = useState<string | null>(null);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement | null>(null);
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
  const [showLabsPanel, setShowLabsPanel] = useState(false);
  const [showDependencyInsights, setShowDependencyInsights] = useState(true);
  const [showWhatIfPanelVisible, setShowWhatIfPanelVisible] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(() => detectTouchDevice());
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 900;
  });
  const { sloTargets, setSloTargets, handleUpdateSloTargets } = useSloTargets();
  const [labProgress, setLabProgress] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(LAB_PROGRESS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? (parsed as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAB_PROGRESS_STORAGE_KEY, JSON.stringify(labProgress));
  }, [labProgress]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsTouchDevice(detectTouchDevice());
    };
    window.addEventListener("orientationchange", handleResize);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleViewportChange = () => {
      setIsMobileViewport(window.innerWidth <= 900);
    };
    handleViewportChange();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, []);

  const handleToggleLabStep = useCallback((stepId: string) => {
    setLabProgress((prev) => {
      const next = { ...prev };
      next[stepId] = !next[stepId];
      return next;
    });
  }, []);

  const handleMarkLabComplete = useCallback((labId: string) => {
    const lab = guidedLabs.find((entry) => entry.id === labId);
    if (!lab) return;
    setLabProgress((prev) => {
      const next = { ...prev };
      lab.steps.forEach((step) => {
        next[step.id] = true;
      });
      return next;
    });
  }, []);
  const [activeView, setActiveView] = useState<"builder" | "metrics" | "coach" | "guide">("builder");
  const loadTemplate = useCallback(
    (templateId: string) => {
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
      const { width, height } = computeAvailableDimensions(showLeftPanel, showScenarioPanel);
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
      setCurrentTemplateId(templateId);
    },
    [setNodes, setEdges, showLeftPanel, showScenarioPanel]
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
      const { width, height } = computeAvailableDimensions(showLeftPanel, showScenarioPanel);
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
    [edges, showLeftPanel, showScenarioPanel]
  );

  const loadImportedTemplate = useCallback(
    (templateData: { nodes: any[]; edges: any[]; sloTargets?: Partial<SloTargets> }) => {
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
      const { width, height } = computeAvailableDimensions(showLeftPanel, showScenarioPanel);
      const laidOutNodes = layoutNodesWithFlow(preparedNodes, preparedEdges, width, height);
      setNodes(laidOutNodes);
      setEdges(preparedEdges);
      setScenarioEvents([]);
      setScenarioClock(0);
      setScenarioPlaying(false);
      setCurrentTemplateId(null);
      if (templateData.sloTargets && typeof templateData.sloTargets === "object") {
        const latency = Number(templateData.sloTargets.latencyMs);
        const errorRate = Number(templateData.sloTargets.errorRate);
        setSloTargets((prev) => ({
          latencyMs: Number.isFinite(latency) ? Math.max(0, latency) : prev.latencyMs,
          errorRate: Number.isFinite(errorRate) ? Math.max(0, errorRate) : prev.errorRate,
        }));
      }
    },
    [showLeftPanel, showScenarioPanel, setEdges, setNodes, setSloTargets]
  );

  const handleApplyGuideTemplate = useCallback(
    (templateData: { name?: string; nodes: any[]; edges: any[]; sloTargets?: Partial<SloTargets> }) => {
      try {
        loadImportedTemplate(templateData);
        setCurrentTemplateId(templateData.name ?? "guide-snapshot");
      } catch (error) {
        console.error(error);
        window.alert("Failed to apply the generated template. Please try again.");
      }
    },
    [loadImportedTemplate]
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
      sloTargets,
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
  }, [nodes, edges, currentTemplateId, sloTargets]);

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
    if (nodes.length > 0) {
      const confirmed = window.confirm(
        "Clear canvas? All nodes, edges, and unsaved changes will be lost."
      );
      if (!confirmed) {
        return;
      }
    }
    setNodes([]);
    setEdges([]);
    nodeIdCounter = 1;
    edgeIdCounter = 1;
    setSelectedNode(null);
    setSelectedEdgeId(null);
    setCurrentTemplateId(null);
  }, [nodes]);

  const handleAutoArrange = useCallback(() => {
    setNodes((prevNodes) => {
      if (prevNodes.length === 0) {
        return prevNodes;
      }
      const { width, height } = computeAvailableDimensions(showLeftPanel, showScenarioPanel);
      return layoutNodesWithFlow(prevNodes, edges, width, height);
    });
  }, [edges, showLeftPanel, showScenarioPanel]);

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

  useEffect(() => {
    if (!connectionError) return;
    const timer = window.setTimeout(() => setConnectionError(null), 4000);
    return () => window.clearTimeout(timer);
  }, [connectionError]);

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

  const handleQuickAddComponent = useCallback(
    (label: string) => {
      const newNode: Node = {
        id: `${nodeIdCounter++}`,
        type: "custom",
        position: { x: 0, y: 0 },
        data: { label, config: getDefaultConfig(label) },
      };
      setNodes((prevNodes) => {
        const nextNodes = prevNodes.concat(newNode);
        const { width, height } = computeAvailableDimensions(showLeftPanel, showScenarioPanel);
        return layoutNodesWithFlow(nextNodes, edges, width, height);
      });
    },
    [edges, showLeftPanel, showScenarioPanel, setNodes]
  );

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
        const { width, height } = computeAvailableDimensions(showLeftPanel, showScenarioPanel);
        return layoutNodesWithFlow(nextNodes, edges, width, height);
      });
    },
    [reactFlowInstance, setNodes, showLeftPanel, showScenarioPanel, edges]
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
  const nodesById = useMemo(() => {
    const map = new Map<string, Node>();
    nodesWithMetrics.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodesWithMetrics]);
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

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    nodesWithMetrics.forEach((node) => {
      map.set(node.id, (node.data.displayLabel as string) || (node.data.label as string));
    });
    return map;
  }, [nodesWithMetrics]);

  const overCapacityNodeIds = useMemo(() => {
    const ids = new Set<string>();
    nodeInsights.forEach((insight) => {
      if (insight.capacity.percentage >= 100) {
        ids.add(insight.id);
      }
    });
    return ids;
  }, [nodeInsights]);

  const nodesForCanvas = useMemo(
    () =>
      nodesWithMetrics.map((node) => ({
        ...node,
        data: {
          ...node.data,
          capacityOver: overCapacityNodeIds.has(node.id),
        },
      })),
    [nodesWithMetrics, overCapacityNodeIds]
  );

  const edgesForCanvas = edges;
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

  const whatIfInsights = useMemo<WhatIfInsight[]>(() => {
    if (!nodesWithMetrics.length) return [];

    const evaluateDownstream = (sourceId: string, multiplier: number, latencyOverride?: number) => {
      const downstreamIds = adjacencyById.get(sourceId) || [];
      const saturated: { name: string; usage: number; suggestion: string }[] = [];
      downstreamIds.forEach((targetId) => {
        const targetNode = nodesById.get(targetId);
        if (!targetNode) return;
        const label = targetNode.data.label as string;
        const config = targetNode.data.config as NodeConfig | undefined;
        if (!config) return;
        const baseQPS = (targetNode.data.nodeQPS as number) || 0;
        const usage = calculateCapacityUsage(label, config, {
          nodeQPS: baseQPS * multiplier,
          nodeBandwidthMBps: (targetNode.data.nodeBandwidthMBps as number) || 0,
          nodeQueueDepth: targetNode.data.nodeQueueDepth as number | undefined,
          nodeStorageUsageGB: targetNode.data.nodeStorageUsageGB as number | undefined,
          nodeLatencyMs:
            latencyOverride ??
            (targetNode.data.nodeLatencyMs as number) ??
            defaultLatencies[label] ??
            20,
        });
        if (usage.percentage >= 95) {
          saturated.push({
            name: (targetNode.data.displayLabel as string) || label,
            usage: usage.percentage,
            suggestion: getMitigationSuggestion(label),
          });
        }
      });
      return saturated;
    };

    const insights: WhatIfInsight[] = [];

    const serviceNodes = nodesWithMetrics.filter((node) => (node.data.label as string) === "Service");
    serviceNodes.slice(0, 3).forEach((serviceNode) => {
      const serviceLabel = (serviceNode.data.displayLabel as string) || (serviceNode.data.label as string);
      const originalLatency = (serviceNode.data.nodeLatencyMs as number) || defaultLatencies.Service || 30;
      const increasedLatency = originalLatency * 1.5;
      const latencyDelta = increasedLatency - originalLatency;
      const nodeQPS = (serviceNode.data.nodeQPS as number) || 0;
      const serviceConfig = serviceNode.data.config as NodeConfig | undefined;
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
      const saturatedDownstream = evaluateDownstream(serviceNode.id, 1.2, increasedLatency);
      const suggestions: string[] = [];
      if (serviceCapacity.percentage >= 90) {
        suggestions.push("Scale service instances or reduce latency via caching.");
      }
      saturatedDownstream.forEach((downstream) => suggestions.push(downstream.suggestion));
      if (!suggestions.length) {
        suggestions.push("No immediate risk. Monitor latency and cache hit rates.");
      }
      insights.push({
        id: `service-${serviceNode.id}`,
        scenarioTitle: "Service latency spike",
        scenarioDescription: "Assume the service slows down by ~50% during peak traffic.",
        primaryLabel: serviceLabel,
        metricDeltaLabel: `+${latencyDelta.toFixed(0)} ms latency`,
        saturatedDownstream,
        suggestions,
      });
    });

    const cacheNodes = nodesWithMetrics.filter((node) => (node.data.label as string) === "Cache");
    cacheNodes.slice(0, 2).forEach((cacheNode) => {
      const cacheLabel = (cacheNode.data.displayLabel as string) || (cacheNode.data.label as string);
      const cacheConfig = cacheNode.data.config as CacheConfig | undefined;
      const hitRate = cacheConfig?.hitRate ?? 85;
      const degradedHitRate = Math.max(10, hitRate - 25);
      const delta = hitRate - degradedHitRate;
      const multiplier = 1 + delta / 100;
      const saturatedDownstream = evaluateDownstream(cacheNode.id, multiplier);
      const suggestions = [
        "Add cache shards or replicas to absorb demand.",
        "Prime hot keys or increase memory to raise hit rate.",
      ];
      saturatedDownstream.forEach((downstream) => suggestions.push(downstream.suggestion));
      insights.push({
        id: `cache-${cacheNode.id}`,
        scenarioTitle: "Cache miss surge",
        scenarioDescription: "Hit rate drops sharply due to eviction or invalidation storm.",
        primaryLabel: cacheLabel,
        metricDeltaLabel: `Hit rate ${hitRate}% → ${degradedHitRate}%`,
        saturatedDownstream,
        suggestions,
      });
    });

    const queueNodes = nodesWithMetrics.filter((node) => (node.data.label as string) === "Queue");
    queueNodes.slice(0, 2).forEach((queueNode) => {
      const queueLabel = (queueNode.data.displayLabel as string) || (queueNode.data.label as string);
      const queueConfig = queueNode.data.config as QueueConfig | undefined;
      const incomingQPS = (queueNode.data.nodeQPS as number) || 0;
      const processingRate = queueConfig?.processingRate ?? queueConfig?.throughputRate ?? incomingQPS;
      const spikedIncoming = incomingQPS * 1.4;
      const backlogRate = Math.max(0, spikedIncoming - (queueConfig?.processingRate ?? processingRate));
      const saturatedDownstream = evaluateDownstream(queueNode.id, 1.15);
      const suggestions: string[] = [];
      if (backlogRate > 0) {
        suggestions.push("Add more workers or raise queue processing throughput.");
      } else {
        suggestions.push("Capacity covers the spike; continue monitoring.");
      }
      saturatedDownstream.forEach((downstream) => suggestions.push(downstream.suggestion));
      insights.push({
        id: `queue-${queueNode.id}`,
        scenarioTitle: "Queue backlog",
        scenarioDescription: "Burst drives +40% more messages into the queue than normal.",
        primaryLabel: queueLabel,
        metricDeltaLabel:
          backlogRate > 0 ? `${backlogRate.toFixed(0)} msg/s backlog` : "Processing keeps pace",
        saturatedDownstream,
        suggestions,
      });
    });

    return insights;
  }, [adjacencyById, nodesById, nodesWithMetrics]);

  const dependencyInsights = useMemo(() => {
    const downstreamCounts = new Map<string, number>();
    nodesWithMetrics.forEach((node) => {
      const visited = new Set<string>();
      const queue = [...(adjacencyById.get(node.id) ?? [])];
      while (queue.length > 0) {
        const target = queue.shift()!;
        if (visited.has(target)) continue;
        visited.add(target);
        const next = adjacencyById.get(target);
        if (next && next.length) {
          queue.push(...next);
        }
      }
      downstreamCounts.set(node.id, visited.size);
    });
    const list = nodesWithMetrics.map((node) => ({
      id: node.id,
      label: node.data.label as string,
      displayLabel: (node.data.displayLabel as string) || (node.data.label as string),
      status: (node.data.nodeStatus as NodeHealthStatus) || "healthy",
      downstreamCount: downstreamCounts.get(node.id) ?? 0,
    }));
    list.sort((a, b) => b.downstreamCount - a.downstreamCount);
    const maxCount = list.length ? Math.max(...list.map((item) => item.downstreamCount)) : 1;
    return { list, maxCount: Math.max(maxCount, 1) };
  }, [adjacencyById, nodesWithMetrics]);

  const rippleImpacts = useMemo(() => {
    const results: Array<{
      rootId: string;
      rootLabel: string;
      impactedIds: string[];
    }> = [];
    Object.entries(activeImpacts).forEach(([nodeId, impact]) => {
      if (impact.status !== "down") return;
      const visited = new Set<string>();
      const queue = [...(adjacencyById.get(nodeId) ?? [])];
      while (queue.length > 0) {
        const target = queue.shift()!;
        if (visited.has(target)) continue;
        visited.add(target);
        const next = adjacencyById.get(target);
        if (next && next.length) {
          queue.push(...next);
        }
      }
      results.push({
        rootId: nodeId,
        rootLabel: labelById.get(nodeId) ?? nodeId,
        impactedIds: Array.from(visited),
      });
    });
    return results;
  }, [activeImpacts, adjacencyById, labelById]);
  const shouldShowInsightsSidebar =
    (showDependencyInsights && (dependencyInsights.list.length > 0 || rippleImpacts.length > 0)) ||
    (showWhatIfPanelVisible && whatIfInsights.length > 0);


  const nodeTypes = {
    custom: CustomNode,
  };

  const handlePaletteItemClick = useCallback(
    (label: string) => {
      if (isTouchDevice) {
        handleQuickAddComponent(label);
      }
    },
    [handleQuickAddComponent, isTouchDevice]
  );

  const handlePaletteKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, label: string) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleQuickAddComponent(label);
      }
    },
    [handleQuickAddComponent]
  );

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
                className={activeView === "coach" ? "active" : ""}
                onClick={() => setActiveView("coach")}
              >
                Coach
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
      <div className="small-screen-banner">
        <div>
          <strong>Best on large screens</strong>
          <p>Compact mode is enabled so you can still explore on phones and tablets.</p>
        </div>
      </div>
      {activeView === "builder" && (
        <>
          <BuilderToolbar
        templateMenuOpen={templateMenuOpen}
        templateMenuRef={templateMenuRef}
        templatePreview={templatePreview}
        templatePreviewId={templatePreviewId}
        templates={systemTemplates}
        onToggleTemplateMenu={() => setTemplateMenuOpen((prev) => !prev)}
        onTemplatePreviewChange={setTemplatePreviewId}
        onSelectTemplate={(templateId) => {
          loadTemplate(templateId);
          setTemplateMenuOpen(false);
        }}
        onExportTemplate={handleExportTemplate}
        onImportTemplateClick={handleImportTemplateClick}
        showLeftPanel={showLeftPanel}
        onToggleLeftPanel={() => setShowLeftPanel((prev) => !prev)}
        showScenarioPanel={showScenarioPanel}
        onToggleScenarioPanel={() => setShowScenarioPanel((prev) => !prev)}
        showPatternPanel={showPatternPanel}
        onTogglePatternPanel={() => setShowPatternPanel((prev) => !prev)}
        showTrafficPanel={showTrafficPanel}
        onToggleTrafficPanel={() => setShowTrafficPanel((prev) => !prev)}
        showDependencyInsights={showDependencyInsights}
        onToggleDependencyInsights={() => setShowDependencyInsights((prev) => !prev)}
        showWhatIfPanel={showWhatIfPanelVisible}
        onToggleWhatIfPanel={() => setShowWhatIfPanelVisible((prev) => !prev)}
        showLabsPanel={showLabsPanel}
        onToggleLabsPanel={() => setShowLabsPanel((prev) => !prev)}
        onAutoArrange={handleAutoArrange}
        onClearCanvas={resetCanvas}
        sloTargets={sloTargets}
        onUpdateSloTargets={handleUpdateSloTargets}
        isMobile={isMobileViewport}
      />
      {connectionError && <div className="connection-error">{connectionError}</div>}
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
                                role="button"
                                tabIndex={0}
                                draggable={!isTouchDevice}
                                onDragStart={
                                  !isTouchDevice
                                    ? (event) => onDragStart(event, component.label)
                                    : undefined
                                }
                                onClick={() => handlePaletteItemClick(component.label)}
                                onKeyDown={(event) => handlePaletteKeyDown(event, component.label)}
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
        {showLabsPanel && (
          <aside className="labs-panel-wrapper">
            <GuidedLabsPanel
              labs={guidedLabs}
              progress={labProgress}
              onToggleStep={handleToggleLabStep}
              onMarkLabComplete={handleMarkLabComplete}
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
        {shouldShowInsightsSidebar && (
          <div className="right-sidebar">
            {showDependencyInsights && dependencyInsights.list.length > 0 && (
              <div className="dependency-panel">
                <div className="dependency-header">
                  <h3>Dependency Heatmap</h3>
                  <p>Nodes feeding the largest number of downstream components.</p>
                </div>
                <div className="dependency-list">
                  {dependencyInsights.list.slice(0, 8).map((item, index) => (
                    <div key={item.id} className="dependency-row">
                      <div className="dependency-row-header">
                        <span className="dependency-rank">{index + 1}</span>
                        <span className="dependency-name">{item.displayLabel}</span>
                        <span className={`dependency-status status-${item.status}`}>{item.status}</span>
                      </div>
                      <div className="dependency-bar">
                        <div
                          className="dependency-bar-fill"
                          style={{
                            width: `${Math.min(
                              (item.downstreamCount / dependencyInsights.maxCount) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="dependency-count">{item.downstreamCount} downstream</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showDependencyInsights && rippleImpacts.length > 0 && (
              <div className="dependency-panel ripple-panel">
                <div className="dependency-header">
                  <h3>Ripple Effects</h3>
                  <p>Current outages and the nodes they threaten.</p>
                </div>
                <div className="ripple-list">
                  {rippleImpacts.map((ripple) => (
                    <div key={ripple.rootId} className="ripple-card">
                      <div className="ripple-root">
                        <strong>{ripple.rootLabel}</strong>
                        <span>{ripple.impactedIds.length} downstream</span>
                      </div>
                      {ripple.impactedIds.length > 0 ? (
                        <div className="ripple-tags">
                          {ripple.impactedIds.slice(0, 4).map((id) => (
                            <span key={id} className="ripple-tag">
                              {labelById.get(id) ?? id}
                            </span>
                          ))}
                          {ripple.impactedIds.length > 4 && (
                            <span className="ripple-tag more">
                              +{ripple.impactedIds.length - 4} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="what-if-muted">No downstream dependencies.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showWhatIfPanelVisible && whatIfInsights.length > 0 && (
              <div className="what-if-panel">
                <div className="what-if-header">
                  <h3>What-if Insights</h3>
                  <p>Stress-test components against spikes and degradations.</p>
                </div>
                <div className="what-if-list">
                  {whatIfInsights.map((insight, index) => (
                    <div key={`${insight.id}-${index}`} className="what-if-card">
                      <div className="what-if-scenario">
                        <span className="what-if-tag">{insight.scenarioTitle}</span>
                        <strong>{insight.primaryLabel}</strong>
                      </div>
                      <p className="what-if-description">{insight.scenarioDescription}</p>
                      <div className="what-if-metric">{insight.metricDeltaLabel}</div>
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
          </div>
        )}
        {showScenarioPanel && (
          <aside className="scenario-panel-wrapper">
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
          </aside>
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
              sloTargets={sloTargets}
              onUpdateSloTargets={handleUpdateSloTargets}
            />
          )}
          {activeView === "coach" && <CoachView onApplyTemplate={handleApplyGuideTemplate} />}
          {activeView === "guide" && <GuidePage />}
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

const guidedLabs: GuidedLab[] = [
  {
    id: "lab-write-buffer",
    title: "Add a write buffer",
    goal: "Protect a primary database from bursty writes by inserting a queue and workers.",
    difficulty: "easy",
    steps: [
      {
        id: "lab-write-buffer-step1",
        title: "Insert a queue",
        description: "Place a Queue node between the public Service/API layer and your Database.",
        hint: "Drag a Queue next to the database and connect Service → Queue → Database.",
      },
      {
        id: "lab-write-buffer-step2",
        title: "Configure queue throughput",
        description:
          "Open the Queue config and set throughput/processing to at least 20% higher than current write QPS.",
      },
      {
        id: "lab-write-buffer-step3",
        title: "Add workers",
        description: "Create a new Service node (Workers) after the queue to fan-in batched writes to the DB.",
        hint: "Name it \"Write Workers\" and connect Queue → Workers → Database.",
      },
    ],
  },
  {
    id: "lab-read-write-split",
    title: "Split reads and writes",
    goal: "Scale read-heavy workloads by separating write traffic from replicated readers.",
    difficulty: "medium",
    steps: [
      {
        id: "lab-rw-step1",
        title: "Add read replicas",
        description: "Duplicate the Database node or configure the DB to have at least 2 replicas.",
      },
      {
        id: "lab-rw-step2",
        title: "Introduce a read router",
        description:
          "Add either a Service Mesh node or a custom router that directs reads to replicas and writes to primary.",
      },
      {
        id: "lab-rw-step3",
        title: "Update configs",
        description:
          "For the database, enable readWriteSplit or document how the router handles read/write targets.",
      },
    ],
  },
  {
    id: "lab-cache-hot-path",
    title: "Cache the hot path",
    goal: "Reduce p95 latency by caching the most expensive read path.",
    difficulty: "medium",
    steps: [
      {
        id: "lab-cache-step1",
        title: "Place a cache near the service",
        description: "Add a Cache node between the Service and your data store (DB/Search).",
      },
      {
        id: "lab-cache-step2",
        title: "Tune TTL and hit rate",
        description: "Configure the cache with a TTL and hit rate assumptions; aim for ≥85% hit rate.",
      },
      {
        id: "lab-cache-step3",
        title: "Add an invalidation path",
        description: "Connect write flows (e.g., Service or Queue) to refresh/invalidate the cache on mutations.",
      },
    ],
  },
];
const LAB_PROGRESS_STORAGE_KEY = "sysdesign-sandbox:labs-progress";

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
