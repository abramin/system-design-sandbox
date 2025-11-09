import type { Edge, Node } from "reactflow";

export const computeAvailableDimensions = (
  showLeftPanel: boolean,
  sidebarOpen: boolean
): { width: number; height: number } => {
  if (typeof window === "undefined") {
    return { width: 1200, height: 700 };
  }
  const reservedHorizontal = (showLeftPanel ? 260 : 0) + (sidebarOpen ? 360 : 0) + 60;
  const reservedVertical = 220;
  const width = Math.max(window.innerWidth - reservedHorizontal, 600);
  const height = Math.max(window.innerHeight - reservedVertical, 400);
  return { width, height };
};

export const layoutNodesWithFlow = (
  nodes: Node[],
  edges: Edge[],
  availableWidth = 1200,
  availableHeight = 700
): Node[] => {
  if (nodes.length === 0) return nodes;

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 180;
  const HORIZONTAL_PADDING = 320;
  const MIN_HORIZONTAL_SPACING = NODE_WIDTH + HORIZONTAL_PADDING; // 540
  const MIN_VERTICAL_SPACING = NODE_HEIGHT + 200; // 380
  const BASE_MARGIN_X = 140;
  const BASE_MARGIN_Y = 160;
  const CATEGORY_SEQUENCE = [
    "Clients & Entry",
    "Edge & Delivery",
    "Networking & Control",
    "Application Services",
    "Caching & Messaging",
    "Data & Storage",
    "Observability",
  ];
  const categoryOrder = new Map(CATEGORY_SEQUENCE.map((category, index) => [category, index]));

  const levelMap = new Map<string, number>();
  const indegree = new Map<string, number>();
  const forwardAdjacency = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  const successors = new Map<string, string[]>();

  nodes.forEach((node) => {
    indegree.set(node.id, 0);
    forwardAdjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
    if (!indegree.has(edge.target)) {
      indegree.set(edge.target, 0);
    }
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
    if (!forwardAdjacency.has(edge.source)) {
      forwardAdjacency.set(edge.source, []);
    }
    forwardAdjacency.get(edge.source)!.push(edge.target);
    if (!predecessors.has(edge.target)) {
      predecessors.set(edge.target, []);
    }
    predecessors.get(edge.target)!.push(edge.source);
    if (!successors.has(edge.source)) {
      successors.set(edge.source, []);
    }
    successors.get(edge.source)!.push(edge.target);
  });

  const queue: string[] = [];
  indegree.forEach((deg, nodeId) => {
    if (deg === 0) {
      queue.push(nodeId);
      levelMap.set(nodeId, 0);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levelMap.get(current) ?? 0;
    const neighbors = forwardAdjacency.get(current) || [];
    neighbors.forEach((target) => {
      const nextLevel = Math.max(currentLevel + 1, levelMap.get(target) ?? 0);
      levelMap.set(target, nextLevel);
      indegree.set(target, (indegree.get(target) || 0) - 1);
      if ((indegree.get(target) || 0) <= 0) {
        queue.push(target);
      }
    });
  }

  nodes.forEach((node) => {
    if (!levelMap.has(node.id)) {
      levelMap.set(node.id, levelMap.size);
    }
  });

  const levelGroups = new Map<number, Node[]>();
  nodes.forEach((node) => {
    const level = levelMap.get(node.id) ?? 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(node);
  });

  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  const maxLevel = sortedLevels[sortedLevels.length - 1] || 0;

  const assignedCategories = new Map<string, string>();
  const categorizeNode = (node: Node): string => {
    const label = node.data?.label as string;
    if (!label) return "Application Services";
    if (["User", "Client", "Mobile", "Web"].some((keyword) => label.includes(keyword))) {
      return "Clients & Entry";
    }
    if (
      ["CDN", "Edge", "Gateway", "Load Balancer", "Realtime"].some((keyword) =>
        label.includes(keyword)
      )
    ) {
      return "Edge & Delivery";
    }
    if (["Mesh", "Circuit", "Limiter"].some((keyword) => label.includes(keyword))) {
      return "Networking & Control";
    }
    if (
      ["Service", "Processor", "Worker", "API"].some((keyword) => label.includes(keyword))
    ) {
      return "Application Services";
    }
    if (["Cache", "Queue", "Broker", "Stream"].some((keyword) => label.includes(keyword))) {
      return "Caching & Messaging";
    }
    if (["Database", "Storage", "Search", "Warehouse"].some((keyword) => label.includes(keyword))) {
      return "Data & Storage";
    }
    if (
      ["Metrics", "Log", "Tracing", "Observability", "Monitoring"].some((keyword) =>
        label.includes(keyword)
      )
    ) {
      return "Observability";
    }
    return "Application Services";
  };

  nodes.forEach((node) => assignedCategories.set(node.id, categorizeNode(node)));

  const categoryOffsets = new Map<number, number>();
  levelGroups.forEach((group, level) => {
    const categories = new Set(group.map((node) => assignedCategories.get(node.id)!));
    const sortedCategories = Array.from(categories).sort(
      (a, b) => (categoryOrder.get(a) ?? 0) - (categoryOrder.get(b) ?? 0)
    );
    sortedCategories.forEach((category, index) => {
      categoryOffsets.set(level * 10 + index, categoryOrder.get(category) ?? 0);
    });
  });

  const maxRowsPerLevel = Math.max(
    ...Array.from(levelGroups.values()).map((group) => group.length),
    1
  );

  const totalLevels = maxLevel + 1;
  const requiredWidth =
    totalLevels > 1
      ? MIN_HORIZONTAL_SPACING * (totalLevels - 1) + NODE_WIDTH + BASE_MARGIN_X * 2
      : NODE_WIDTH + BASE_MARGIN_X * 2;
  const requiredHeight =
    maxRowsPerLevel > 1
      ? MIN_VERTICAL_SPACING * (maxRowsPerLevel - 1) + NODE_HEIGHT + BASE_MARGIN_Y * 2
      : NODE_HEIGHT + BASE_MARGIN_Y * 2;

  const canvasWidth = Math.max(availableWidth, requiredWidth);
  const canvasHeight = Math.max(availableHeight, requiredHeight);

  const levelWidth = Math.max(
    canvasWidth / Math.max(totalLevels - 1, 1),
    MIN_HORIZONTAL_SPACING
  );

  const levelLayoutMeta = new Map<
    number,
    {
      spacing: number;
      origin: number;
    }
  >();

  levelGroups.forEach((group, level) => {
    const rowCount = group.length || 1;
    const usableHeight = Math.max(canvasHeight - BASE_MARGIN_Y * 2 - NODE_HEIGHT, NODE_HEIGHT);
    const spacing =
      rowCount > 1
        ? Math.max(MIN_VERTICAL_SPACING, usableHeight / Math.max(rowCount - 1, 1))
        : 0;
    const totalBlock = spacing * Math.max(rowCount - 1, 0);
    const origin = BASE_MARGIN_Y + Math.max(0, (usableHeight - totalBlock) / 2);
    levelLayoutMeta.set(level, { spacing, origin });
  });

  const positionedNodes = nodes.map((node) => {
    const level = levelMap.get(node.id) ?? 0;
    const group = levelGroups.get(level) ?? [];
    const rowIndex = group.findIndex((n) => n.id === node.id);
    const layoutMeta = levelLayoutMeta.get(level) ?? { spacing: MIN_VERTICAL_SPACING, origin: BASE_MARGIN_Y };
    const yOffset = rowIndex * layoutMeta.spacing;
    const x = level * levelWidth + BASE_MARGIN_X;
    const y = yOffset + layoutMeta.origin;
    return {
      ...node,
      position: { x, y },
    };
  });

  return positionedNodes.map((node) => ({
    ...node,
    position: {
      x: Math.min(node.position.x, canvasWidth - NODE_WIDTH),
      y: Math.min(node.position.y, canvasHeight - NODE_HEIGHT),
    },
  }));
};
