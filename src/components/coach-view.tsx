import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";

type CoachMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

type NormalizedNode = {
  id: string;
  label: string;
  position: { x: number; y: number };
  data: {
    label: string;
    displayLabel?: string;
    config?: Record<string, unknown>;
  };
};

type NormalizedEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type TemplatePayload = {
  name?: string;
  nodes: NormalizedNode[];
  edges: NormalizedEdge[];
};

interface CoachViewProps {
  onApplyTemplate?: (template: TemplatePayload) => void | Promise<void>;
}

type SnapshotNodeDraft = {
  key?: string;
  id?: string;
  component?: string;
  label?: string;
  displayLabel?: string;
  notes?: string | string[];
  config?: Record<string, unknown>;
  position?: { x?: number; y?: number };
};

type SnapshotEdgeDraft = {
  id?: string;
  source?: string;
  from?: string;
  target?: string;
  to?: string;
  label?: string;
};

type SnapshotResponse = {
  name?: string;
  nodes?: SnapshotNodeDraft[];
  edges?: SnapshotEdgeDraft[];
};

type CoachSessionSnapshot = {
  baseUrl: string;
  model: string;
  practiceBrief: string;
  pendingInput: string;
  messages: CoachMessage[];
  lastPrompt: string | null;
};

const COACH_SESSION_STORAGE_KEY = "sysdesign-sandbox:coach-session";
const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.2";
const DEFAULT_PRACTICE_BRIEF =
  "Design a URL shortener that serves 3B redirects per day with analytics and custom domains.";

let cachedCoachSession: CoachSessionSnapshot | null | undefined;

const readPersistedSession = (): CoachSessionSnapshot | null => {
  if (cachedCoachSession !== undefined) {
    return cachedCoachSession;
  }
  if (typeof window === "undefined") {
    cachedCoachSession = null;
    return cachedCoachSession;
  }
  try {
    const raw = window.localStorage.getItem(COACH_SESSION_STORAGE_KEY);
    if (!raw) {
      cachedCoachSession = null;
      return cachedCoachSession;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      cachedCoachSession = null;
      return cachedCoachSession;
    }
    const candidate = parsed as Partial<CoachSessionSnapshot>;
    cachedCoachSession = {
      baseUrl: typeof candidate.baseUrl === "string" ? candidate.baseUrl : DEFAULT_BASE_URL,
      model: typeof candidate.model === "string" ? candidate.model : DEFAULT_MODEL,
      practiceBrief:
        typeof candidate.practiceBrief === "string" ? candidate.practiceBrief : DEFAULT_PRACTICE_BRIEF,
      pendingInput: typeof candidate.pendingInput === "string" ? candidate.pendingInput : "",
      messages: Array.isArray(candidate.messages) ? (candidate.messages as CoachMessage[]) : [],
      lastPrompt: typeof candidate.lastPrompt === "string" ? candidate.lastPrompt : null,
    };
  } catch {
    cachedCoachSession = null;
  }
  return cachedCoachSession;
};

const persistSession = (snapshot: CoachSessionSnapshot) => {
  if (typeof window === "undefined") return;
  cachedCoachSession = snapshot;
  window.localStorage.setItem(COACH_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
};

type InlineSegment = { kind: "text" | "strong" | "em" | "code"; value: string };

type ChatNode =
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; language?: string; content: string }
  | { type: "blockquote"; content: string };

const parseInline = (text: string): InlineSegment[] => {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  const tokens: InlineSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith("**")) {
      tokens.push({ kind: "strong", value: token.slice(2, -2) });
    } else if (token.startsWith("`")) {
      tokens.push({ kind: "code", value: token.slice(1, -1) });
    } else {
      tokens.push({ kind: "em", value: token.slice(1, -1) });
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    tokens.push({ kind: "text", value: text.slice(lastIndex) });
  }
  return tokens;
};

const renderInline = (text: string, keyPrefix: string) =>
  parseInline(text).map((segment, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (segment.kind) {
      case "strong":
        return <strong key={key}>{segment.value}</strong>;
      case "em":
        return <em key={key}>{segment.value}</em>;
      case "code":
        return (
          <code key={key} className="inline-code">
            {segment.value}
          </code>
        );
      default:
        return <span key={key}>{segment.value}</span>;
    }
  });

const parseChatMarkdown = (markdown: string): ChatNode[] => {
  const lines = markdown.split(/\r?\n/);
  const nodes: ChatNode[] = [];
  let i = 0;
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      nodes.push({ type: "paragraph", content: paragraphBuffer.join(" ") });
      paragraphBuffer = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      flushParagraph();
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      flushParagraph();
      const language = line.slice(3).trim() || undefined;
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      nodes.push({ type: "code", language, content: codeLines.join("\n") });
      if (i < lines.length) {
        i += 1;
      }
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      nodes.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, "").trim());
        i += 1;
      }
      nodes.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s+/, "").trim());
        i += 1;
      }
      nodes.push({ type: "list", ordered: true, items });
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, "").trim());
        i += 1;
      }
      nodes.push({ type: "blockquote", content: quoteLines.join(" ") });
      continue;
    }

    paragraphBuffer.push(line.trim());
    i += 1;
  }

  flushParagraph();
  return nodes;
};

const renderChatContent = (content: string, keyPrefix: string) => {
  const nodes = parseChatMarkdown(content);
  if (!nodes.length) {
    return <p>{content}</p>;
  }
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-node-${index}`;
    if (node.type === "heading") {
      const Tag = `h${Math.min(node.level, 4)}` as keyof JSX.IntrinsicElements;
      return <Tag key={key}>{renderInline(node.content, `${key}-h`)}</Tag>;
    }
    if (node.type === "paragraph") {
      return (
        <p key={key} className="coach-paragraph">
          {renderInline(node.content, `${key}-p`)}
        </p>
      );
    }
    if (node.type === "list") {
      const listItems = node.items.map((item, itemIndex) => (
        <li key={`${key}-item-${itemIndex}`}>{renderInline(item, `${key}-li-${itemIndex}`)}</li>
      ));
      return node.ordered ? <ol key={key}>{listItems}</ol> : <ul key={key}>{listItems}</ul>;
    }
    if (node.type === "code") {
      return (
        <pre key={key} className="coach-code-block">
          <code className={node.language ? `language-${node.language}` : undefined}>{node.content}</code>
        </pre>
      );
    }
    return (
      <blockquote key={key} className="coach-quote">
        {renderInline(node.content, `${key}-quote`)}
      </blockquote>
    );
  });
};

const COMPONENT_LIBRARY = [
  "User",
  "CDN",
  "Load Balancer",
  "API Gateway",
  "Service",
  "Service Mesh",
  "Circuit Breaker",
  "Realtime Gateway",
  "Edge Compute",
  "Cache",
  "Queue",
  "Message Broker",
  "Stream Processor",
  "Notification Service",
  "Database",
  "DB",
  "Search Index",
  "Object Storage",
  "Object Storage Tier",
  "Analytics Warehouse",
  "Metrics Collector",
  "Log Aggregator",
  "Tracing Service",
];

const SYSTEM_PROMPT = `
You are an experienced Staff+ engineer who acts as a system design practice coach.
You are embedded inside the "System Design Sandbox" app where a user iterates on
large scale designs. Behave like an interviewer who wants the candidate to think
out loud and reason deeply.

Conversation rules:
- Always open a new session with a concise scenario summary, three to five clarifying
  questions (cover both functional and non-functional angles), and a suggestion for a
  first step.
- During the dialogue, acknowledge the user's answers, highlight trade-offs, and guide
  them toward enumerating requirements, back-of-the-envelope capacity, API design, data
  models, scaling strategies, failure domains, and operational concerns.
- When the user explicitly asks to dive into an area (APIs, data schema, traffic profile,
  etc.), produce structured bullet lists with short code or table snippets if helpful.
- Close each response with a forward-looking question that keeps the design interview moving.
- When asked for a summary, provide: 1) Goals, 2) Requirements, 3) Draft architecture,
  4) Gaps/open questions.
`.trim();

const SNAPSHOT_PROMPT = `
Convert the entire conversation into a JSON system template with this shape:
{
  "name": "concise title",
  "nodes": [
    {
      "key": "api-gateway",
      "component": "API Gateway",
      "label": "External HTTP ingress",
      "config": { ...optional numeric values }
    }
  ],
  "edges": [
    { "source": "user", "target": "api-gateway", "label": "HTTPS" }
  ]
}
Rules:
- component must be one of: ${COMPONENT_LIBRARY.join(", ")}.
- Provide 4-12 nodes that reflect the flow we discussed.
- key must be a unique lowercase slug; edges must reference these keys.
- Return ONLY JSON. Do not add backticks, markdown, or commentary.
`.trim();

const SCENARIO_IDEAS = [
  "Design a globally distributed URL shortener with real-time analytics and custom domains.",
  "Design a feature flag platform that safely rolls out experiments to 50M DAUs.",
  "Design a collaborative whiteboard that supports 1M concurrent users per region.",
  "Design an AI-powered code search that indexes multi-tenant repositories in seconds.",
  "Design a ride hailing dispatch system with sub-second driver matching at city scale.",
  "Design an IoT ingestion pipeline for billions of daily telemetry updates.",
];

const QUICK_PROMPTS = [
  {
    label: "Functional requirements",
    prompt: "Let's lock down the functional requirements and must-have user journeys.",
  },
  {
    label: "Non-functional guardrails",
    prompt:
      "Help me enumerate non-functional requirements, SLOs, latency, and capacity targets.",
  },
  {
    label: "API sketch",
    prompt:
      "Let's design the external APIs with request/response examples and error handling strategy.",
  },
  {
    label: "Data model",
    prompt: "Walk me through the data model, storage choices, and partitioning scheme.",
  },
  {
    label: "Trade-offs summary",
    prompt: "Summarize the major trade-offs we've discussed and list open questions.",
  },
];

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stripJsonBlock = (text: string) => {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z0-9]*\s*/i, "").replace(/```$/, "").trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Model reply did not contain JSON.");
  }
  return trimmed.slice(firstBrace, lastBrace + 1);
};

const resolveComponentName = (primary?: string, fallback?: string) => {
  const candidates = [primary, fallback];
  for (const candidate of candidates) {
    const label = typeof candidate === "string" ? candidate.trim() : "";
    if (label && COMPONENT_LIBRARY.includes(label)) {
      return label;
    }
  }
  return "Service";
};

const normalizeSnapshotResponse = (raw: SnapshotResponse): TemplatePayload => {
  if (!raw || !Array.isArray(raw.nodes) || raw.nodes.length === 0) {
    throw new Error("Snapshot must include at least one node.");
  }

  const nodeIds = new Set<string>();
  const lookup = new Map<string, string>();
  const registerKey = (key?: string, canonical?: string) => {
    if (!key || !canonical) return;
    const trimmed = key.trim();
    if (!trimmed) return;
    lookup.set(trimmed, canonical);
    lookup.set(trimmed.toLowerCase(), canonical);
    lookup.set(trimmed.replace(/\s+/g, "-").toLowerCase(), canonical);
  };
  const resolveKey = (key?: string) => {
    if (!key) return undefined;
    const trimmed = key.trim();
    return (
      lookup.get(trimmed) ??
      lookup.get(trimmed.toLowerCase()) ??
      lookup.get(trimmed.replace(/\s+/g, "-").toLowerCase())
    );
  };

  const normalizedNodes: NormalizedNode[] = raw.nodes.map((node, index) => {
    const baseKey =
      (typeof node.key === "string" && node.key.trim()) ||
      (typeof node.id === "string" && node.id.trim()) ||
      `node-${index + 1}`;
    let canonical = baseKey;
    let suffix = 2;
    while (nodeIds.has(canonical)) {
      canonical = `${baseKey}-${suffix++}`;
    }
    nodeIds.add(canonical);
    const component = resolveComponentName(node.component, node.label);
    const displayLabel =
      typeof node.label === "string" && node.label.trim() && node.label.trim() !== component
        ? node.label.trim()
        : undefined;
    const config = isPlainObject(node.config) ? node.config : undefined;
    registerKey(baseKey, canonical);
    registerKey(node.key, canonical);
    registerKey(node.id, canonical);
    registerKey(node.component, canonical);
    registerKey(node.label, canonical);
    return {
      id: canonical,
      label: component,
      position: {
        x: Number(node.position?.x) || 0,
        y: Number(node.position?.y) || index * 100,
      },
      data: {
        label: component,
        displayLabel,
        config,
      },
    };
  });

  if (!normalizedNodes.length) {
    throw new Error("No usable nodes were produced.");
  }

  const edgeCandidates: Array<NormalizedEdge | null> = (raw.edges ?? []).map((edge, index) => {
    const source = resolveKey(edge.source ?? edge.from);
    const target = resolveKey(edge.target ?? edge.to);
    if (!source || !target) {
      return null;
    }
    return {
      id: edge.id ?? `edge-${index + 1}`,
      source,
      target,
      label: typeof edge.label === "string" ? edge.label : undefined,
    };
  });
  const normalizedEdges = edgeCandidates.filter(
    (edge): edge is NormalizedEdge => Boolean(edge)
  );

  return {
    name: typeof raw.name === "string" ? raw.name : undefined,
    nodes: normalizedNodes,
    edges: normalizedEdges,
  };
};

export default function CoachView({ onApplyTemplate }: CoachViewProps) {
  const [baseUrl, setBaseUrl] = useState(() => readPersistedSession()?.baseUrl ?? DEFAULT_BASE_URL);
  const [model, setModel] = useState(() => readPersistedSession()?.model ?? DEFAULT_MODEL);
  const [practiceBrief, setPracticeBrief] = useState(
    () => readPersistedSession()?.practiceBrief ?? DEFAULT_PRACTICE_BRIEF
  );
  const [messages, setMessages] = useState<CoachMessage[]>(() => readPersistedSession()?.messages ?? []);
  const [pendingInput, setPendingInput] = useState(() => readPersistedSession()?.pendingInput ?? "");
  const [status, setStatus] = useState<"idle" | "starting" | "responding">("idle");
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(() => readPersistedSession()?.lastPrompt ?? null);
  const [snapshotStatus, setSnapshotStatus] = useState<"idle" | "generating">("idle");
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [snapshotSuccess, setSnapshotSuccess] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "checking" | "online" | "offline">("unknown");
  const [connectionErrorMessage, setConnectionErrorMessage] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const normalizedBaseUrl = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);
  const sessionActive = messages.length > 0;

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    persistSession({ baseUrl, model, practiceBrief, pendingInput, messages, lastPrompt });
  }, [baseUrl, model, practiceBrief, pendingInput, messages, lastPrompt]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;

    const checkConnection = async (abortSignal: AbortSignal) => {
      setConnectionStatus((prev) => (prev === "online" ? prev : "checking"));
      setConnectionErrorMessage(null);
      try {
        const response = await fetch(`${normalizedBaseUrl}/api/show`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model }),
          signal: abortSignal,
        });
        if (!response.ok) {
          throw new Error(`Model responded with ${response.status}`);
        }
        await response.json();
        if (!cancelled) {
          setConnectionStatus("online");
          setConnectionErrorMessage(null);
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        const reason = err instanceof Error ? err.message : "Unable to reach Model.";
        setConnectionStatus("offline");
        setConnectionErrorMessage(reason);
      }
    };

    const controller = new AbortController();
    checkConnection(controller.signal);
    intervalId = window.setInterval(() => {
      const loopController = new AbortController();
      checkConnection(loopController.signal);
    }, 15000);

    return () => {
      cancelled = true;
      controller.abort();
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [normalizedBaseUrl, model]);

  const sendToModel = useCallback(
    async (content: string, options?: { reset?: boolean }) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const resetSession = Boolean(options?.reset);
      const history = resetSession ? [] : messages;
      const userMessage: CoachMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      setLastPrompt(trimmed);
      setChatError(null);
      setSnapshotSuccess(null);
      setStatus(history.length === 0 ? "starting" : "responding");
      setMessages((prev) => {
        const base = resetSession ? [] : prev;
        return [...base, userMessage];
      });

      try {
        const response = await fetch(`${normalizedBaseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...history.map((msg) => ({ role: msg.role, content: msg.content })),
              { role: "user", content: trimmed },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Model responded with ${response.status}`);
        }
        const data = await response.json();
        const assistantContent =
          typeof data.message?.content === "string" && data.message.content.trim()
            ? data.message.content
            : typeof data.response === "string" && data.response.trim()
              ? data.response
              : "";

        if (!assistantContent) {
          throw new Error("Received an empty response from Model.");
        }

        const assistantMessage: CoachMessage = {
          id: generateId(),
          role: "assistant",
          content: assistantContent.trim(),
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Unable to reach Model.";
        setChatError(reason);
        setConnectionStatus("offline");
        setConnectionErrorMessage(reason);
      } finally {
        setStatus("idle");
      }
    },
    [messages, model, normalizedBaseUrl]
  );

  const handleStartSession = async () => {
    await sendToModel(
      `I'd like to practice this system design: ${practiceBrief}.
Start by presenting the problem statement, business context, key metrics, and 3-5 probing questions.`,
      { reset: true }
    );
  };

  const handleSend = async () => {
    if (!pendingInput.trim() || status !== "idle") return;
    const currentInput = pendingInput;
    setPendingInput("");
    await sendToModel(currentInput);
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSend();
    }
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (!sessionActive || status !== "idle") return;
    await sendToModel(prompt);
  };

  const handleDealScenario = () => {
    const nextIdea = SCENARIO_IDEAS[Math.floor(Math.random() * SCENARIO_IDEAS.length)];
    setPracticeBrief(nextIdea);
  };

  const handleGenerateSnapshot = async () => {
    if (!onApplyTemplate) {
      setSnapshotError("Canvas integration is unavailable in this environment.");
      return;
    }
    if (!sessionActive) {
      setSnapshotError("Hold a conversation with the coach before generating a snapshot.");
      return;
    }
    setSnapshotStatus("generating");
    setSnapshotError(null);
    setSnapshotSuccess(null);
    try {
      const response = await fetch(`${normalizedBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
            { role: "user", content: SNAPSHOT_PROMPT },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error(`Snapshot request failed with status ${response.status}.`);
      }
      const data = await response.json();
      const rawContent =
        typeof data.message?.content === "string" && data.message.content.trim()
          ? data.message.content
          : typeof data.response === "string" && data.response.trim()
            ? data.response
            : "";
      if (!rawContent) {
        throw new Error("Model returned an empty snapshot.");
      }
      const cleaned = stripJsonBlock(rawContent);
      const parsed = JSON.parse(cleaned) as SnapshotResponse;
      const templatePayload = normalizeSnapshotResponse(parsed);
      await Promise.resolve(
        onApplyTemplate({
          name: templatePayload.name ?? "coach-snapshot",
          nodes: templatePayload.nodes,
          edges: templatePayload.edges,
        })
      );
      setSnapshotSuccess("Draft applied to the Design Canvas. Switch views to inspect it.");
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Unable to convert this chat into a template.";
      setSnapshotError(reason);
      if (!/template/i.test(reason)) {
        setConnectionStatus("offline");
        setConnectionErrorMessage(reason);
      }
    } finally {
      setSnapshotStatus("idle");
    }
  };

  const connectionLabel = useMemo(() => {
    if (connectionStatus === "checking" || connectionStatus === "unknown") {
      return "Checking Model…";
    }
    if (connectionStatus === "offline") {
      return connectionErrorMessage ?? "Model unavailable";
    }
    if (status === "starting") return "Requesting a fresh scenario…";
    if (status === "responding") return "Waiting for Model…";
    if (chatError) return "Check your Model server";
    return `Connected to ${model}`;
  }, [chatError, connectionErrorMessage, connectionStatus, model, status]);

  const statusClassNames = useMemo(() => {
    const parts = ["coach-status"];
    parts.push(connectionStatus);
    if (chatError) {
      parts.push("error");
    } else {
      parts.push(status);
    }
    return parts.filter(Boolean).join(" ");
  }, [chatError, connectionStatus, status]);

  return (
    <div className="coach-view">
      <div className="coach-grid">
        <section className="coach-card coach-controls">
          <header className="coach-controls-header">
            <div>
              <p className="coach-eyebrow">Practice setup</p>
              <h2>Design prompt</h2>
              <p>Ask your local model to interview you through a system design flow.</p>
            </div>
            <button type="button" className="coach-link" onClick={handleDealScenario}>
              Randomize a new idea
            </button>
          </header>
          <label className="coach-field">
            <span>Practice focus</span>
            <textarea
              value={practiceBrief}
              onChange={(event) => setPracticeBrief(event.target.value)}
              rows={4}
              spellCheck
            />
          </label>
          <div className="coach-actions">
            <button
              type="button"
              className="primary"
              onClick={handleStartSession}
              disabled={!practiceBrief.trim() || status === "starting"}
            >
              {sessionActive ? "Restart with this scenario" : "Start practice session"}
            </button>
          </div>
          <div className="coach-field">
            <span>Model base URL</span>
            <input
              type="text"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="http://localhost:11434"
            />
          </div>
          <div className="coach-field">
            <span>Model</span>
            <input
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="llama3.2"
            />
          </div>
          <div className="coach-quick-section">
            <p className="coach-eyebrow">Shortcuts</p>
            <div className="coach-chip-grid">
              {QUICK_PROMPTS.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  className="coach-chip"
                  disabled={!sessionActive || status !== "idle"}
                  onClick={() => handleQuickPrompt(item.prompt)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="coach-snapshot">
            <p className="coach-eyebrow">Conversation snapshot</p>
            <p className="coach-snapshot-text">
              Generate a canvas-ready template from the chat and load it into the Design Canvas.
            </p>
            <button
              type="button"
              className="coach-snapshot-button"
              onClick={handleGenerateSnapshot}
              disabled={!sessionActive || snapshotStatus === "generating"}
            >
              {snapshotStatus === "generating" ? "Drafting…" : "Push to Design Canvas"}
            </button>
            {snapshotError && (
              <p className="coach-inline-message error" role="status">
                {snapshotError}
              </p>
            )}
            {snapshotSuccess && (
              <p className="coach-inline-message success" role="status">
                {snapshotSuccess}
              </p>
            )}
          </div>
          <div className="coach-tip">
            Model must be running locally with the selected model pulled. The chat sends a
            plain <code>POST /api/chat</code> request so it works with any recent build of Model.
          </div>
        </section>
        <section className="coach-card coach-chat">
          <header className="coach-chat-header">
            <div>
              <p className="coach-eyebrow">Design dialog</p>
              <h2>System Design Coach</h2>
            </div>
            <div className={statusClassNames}>
              <span className="status-dot" />
              <span>{connectionLabel}</span>
            </div>
          </header>
          <div className="coach-chat-window">
            <div className="coach-messages">
              {!messages.length && (
                <div className="coach-empty-state">
                  <h3>Start a practice round</h3>
                  <p>
                    Kick things off with a scenario and let the coach ask you clarifying questions,
                    scope requirements, and co-design APIs or data models.
                  </p>
                  <ul>
                    <li>1. Describe (or deal) a scenario.</li>
                    <li>2. The coach proposes requirements and questions.</li>
                    <li>3. Keep chatting through APIs, storage, scaling, and trade-offs.</li>
                  </ul>
                </div>
              )}
              {messages.map((message) => (
                <article key={message.id} className={`coach-message ${message.role}`}>
                  <header>
                    <span>{message.role === "assistant" ? "Coach" : "You"}</span>
                    <span className="timestamp">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </header>
                  <div className="coach-message-body">
                    {renderChatContent(message.content, `${message.id}`)}
                  </div>
                </article>
              ))}
              <div ref={scrollAnchorRef} />
            </div>
            <div className="coach-input">
              {chatError && (
                <div className="coach-error">
                  {chatError}
                  {lastPrompt && (
                    <button
                      type="button"
                      onClick={() => sendToModel(lastPrompt)}
                      disabled={status !== "idle"}
                    >
                      Check that your model is running
                    </button>
                  )}
                </div>
              )}
              <textarea
                placeholder={
                  sessionActive
                    ? "Ask a clarifying question, propose an architecture, or request a summary..."
                    : "Start the session first, then iterate with the coach…"
                }
                value={pendingInput}
                onChange={(event) => setPendingInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!sessionActive}
                rows={sessionActive ? 3 : 2}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!pendingInput.trim() || status !== "idle"}
              >
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
