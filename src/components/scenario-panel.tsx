import { useEffect, useMemo, useState } from "react";
import type { Node } from "reactflow";
import type { ScenarioEvent, ScenarioEventType } from "../types/system";
import "./scenario-panel.css";

interface ScenarioPanelProps {
  nodes: Node[];
  events: ScenarioEvent[];
  clock: number;
  playing: boolean;
  onCreateEvent: (event: Omit<ScenarioEvent, "id" | "targetLabel" | "triggered">) => void;
  onRemoveEvent: (eventId: string) => void;
  onTogglePlay: () => void;
  onResetClock: () => void;
  onTriggerEvent: (eventId: string) => void;
}

const eventOptions: {
  label: string;
  value: ScenarioEventType;
  description: string;
  defaultSeverity: number;
  defaultDuration: number;
}[] = [
  { label: "Outage", value: "outage", description: "Take target fully offline", defaultSeverity: 100, defaultDuration: 180 },
  {
    label: "Latency Spike",
    value: "latency_spike",
    description: "Increase latency for target",
    defaultSeverity: 60,
    defaultDuration: 120,
  },
  {
    label: "Error Spike",
    value: "error_spike",
    description: "Increase failure rate",
    defaultSeverity: 50,
    defaultDuration: 150,
  },
  {
    label: "Throttle",
    value: "throttle",
    description: "Reduce throughput capacity",
    defaultSeverity: 70,
    defaultDuration: 240,
  },
];

type EventStatus = "pending" | "active" | "completed";

interface ScenarioEventWithState extends ScenarioEvent {
  status: EventStatus;
  timeUntilStart: number;
  timeRemaining: number;
  progress: number;
}

export default function ScenarioPanel({
  nodes,
  events,
  clock,
  playing,
  onCreateEvent,
  onRemoveEvent,
  onTogglePlay,
  onResetClock,
  onTriggerEvent,
}: ScenarioPanelProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [eventType, setEventType] = useState<ScenarioEventType>("outage");
  const [severity, setSeverity] = useState(80);
  const [durationInput, setDurationInput] = useState("60");
  const [note, setNote] = useState("");
  const [startOffsetInput, setStartOffsetInput] = useState("0");

  const sortedNodes = useMemo(
    () =>
      nodes
        .map((node) => ({
          id: node.id,
          label: node.data?.label as string,
        }))
        .filter((n) => !!n.label)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [nodes]
  );

  useEffect(() => {
    const option = eventOptions.find((option) => option.value === eventType);
    if (option) {
      setSeverity(option.defaultSeverity);
      setDurationInput(String(option.defaultDuration));
    }
  }, [eventType]);

  const startOffsetSeconds = useMemo(() => {
    if (startOffsetInput.trim() === "") return 0;
    const parsed = Number(startOffsetInput);
    if (!Number.isFinite(parsed)) return 0;
    if (parsed < 0) return 0;
    if (parsed > 3600) return 3600;
    return parsed;
  }, [startOffsetInput]);

  const durationSeconds = useMemo(() => {
    if (durationInput.trim() === "") return 10;
    const parsed = Number(durationInput);
    if (!Number.isFinite(parsed)) return 10;
    if (parsed < 10) return 10;
    if (parsed > 3600) return 3600;
    return parsed;
  }, [durationInput]);

  const handleAddEvent = () => {
    if (!selectedTargetId) return;
    onCreateEvent({
      targetId: selectedTargetId,
      type: eventType,
      severity,
      durationSeconds,
      startTime: clock + startOffsetSeconds,
      note,
    });
    setNote("");
    setStartOffsetInput("0");
  };

  const formatRelative = (seconds: number) => {
    if (seconds <= 0) return "now";
    if (seconds < 60) return `${seconds}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(1)}m`;
    return `${(minutes / 60).toFixed(1)}h`;
  };

  const enrichedEvents: ScenarioEventWithState[] = useMemo(() => {
    return events.map((event) => {
      const start = event.startTime;
      const end = event.startTime + event.durationSeconds;
      let status: EventStatus = "pending";
      if (event.triggered) {
        if (clock >= end) {
          status = "completed";
        } else if (clock >= start) {
          status = "active";
        }
      }
      const timeUntilStart = Math.max(0, start - clock);
      const timeRemaining = Math.max(0, end - clock);
      const progress =
        status === "active"
          ? Math.min(1, (clock - start) / Math.max(1, event.durationSeconds))
          : status === "completed"
            ? 1
            : 0;
      return {
        ...event,
        status,
        timeUntilStart,
        timeRemaining,
        progress,
      };
    });
  }, [events, clock]);

  const currentEventOption = eventOptions.find((option) => option.value === eventType);

  return (
    <div className="scenario-panel">
      <div className="scenario-header">
        <h3>Scenarios</h3>
        <div className="scenario-controls">
          <button
            type="button"
            className={`scenario-action ${playing ? "is-active" : ""}`}
            onClick={onTogglePlay}
            aria-label={playing ? "Pause scenario clock" : "Play scenario timeline"}
          >
            <span className="scenario-action-icon" aria-hidden>
              {playing ? "⏸" : "▶"}
            </span>
            <span className="scenario-action-label">{playing ? "Pause" : "Play"}</span>
          </button>
          <button
            type="button"
            className="scenario-action"
            onClick={onResetClock}
            aria-label="Reset scenario timeline"
          >
            <span className="scenario-action-icon" aria-hidden>
              ↺
            </span>
            <span className="scenario-action-label">Reset</span>
          </button>
          <span className="scenario-clock">t={clock}s</span>
        </div>
      </div>
      <div className="scenario-form">
        <p className="scenario-form-hint">Describe an incident, schedule when it fires, then press Play or trigger it directly.</p>
        <label>
          Target Component
          <select value={selectedTargetId} onChange={(e) => setSelectedTargetId(e.target.value)}>
            <option value="">Select node</option>
            {sortedNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Event Type
          <select value={eventType} onChange={(e) => setEventType(e.target.value as ScenarioEventType)}>
            {eventOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {currentEventOption && <span className="scenario-field-hint">{currentEventOption.description}</span>}
        </label>
        <label>
          Severity ({severity}%)
          <input
            type="range"
            min={10}
            max={100}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
          />
          <span className="scenario-field-hint">Higher values drive harsher incidents.</span>
        </label>
        <div className="scenario-fieldset">
          <span className="scenario-fieldset-label">Timing Controls</span>
          <div className="scenario-field-row">
            <label className="scenario-field">
              Impact Duration (seconds)
              <input
                type="number"
                min={10}
                max={3600}
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
              />
              <span className="scenario-field-hint">How long the incident should last once triggered.</span>
            </label>
            <label className="scenario-field">
              Start Offset (seconds)
              <input
                type="number"
                min={0}
                max={3600}
                value={startOffsetInput}
                onChange={(e) => setStartOffsetInput(e.target.value)}
              />
              <span className="scenario-field-hint">Delay before the incident begins.</span>
            </label>
          </div>
        </div>
        <label>
          Notes
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </label>
        <button type="button" className="scenario-add-btn" onClick={handleAddEvent} disabled={!selectedTargetId}>
          Add Event
        </button>
      </div>
      <div className="scenario-events">
        <div className="scenario-events-header">
          <span>Scheduled Events</span>
          <span>Total: {events.length}</span>
        </div>
        {events.length === 0 && <p className="scenario-empty">No events scheduled.</p>}
        {enrichedEvents.map((event) => (
          <div key={event.id} className={`scenario-event-row status-${event.status}`}>
            <div className="scenario-event-main">
              <div>
                <strong>{event.targetLabel || event.targetId}</strong>
                <span className="scenario-event-type">{event.type}</span>
              </div>
              <span className={`scenario-event-status status-${event.status}`}>
                {event.status === "pending" && "Scheduled"}
                {event.status === "active" && "In Progress"}
                {event.status === "completed" && "Complete"}
              </span>
            </div>
            <div className="scenario-event-meta">
              <span>Start t={event.startTime}s</span>
              <span>Duration {event.durationSeconds}s</span>
              <span>Severity {event.severity}%</span>
              {event.status === "pending" && <span>Begins in {formatRelative(event.timeUntilStart)}</span>}
              {event.status === "active" && <span>Ends in {formatRelative(event.timeRemaining)}</span>}
              {event.status === "completed" && <span>Ran for {formatRelative(event.durationSeconds)}</span>}
            </div>
            <div className="scenario-event-progress">
              <div className="scenario-event-progress-bar" style={{ width: `${event.progress * 100}%` }} />
            </div>
            {event.note && <p className="scenario-event-note">{event.note}</p>}
            <div className="scenario-event-actions">
              {!event.triggered && (
                <button type="button" onClick={() => onTriggerEvent(event.id)}>
                  Trigger Now
                </button>
              )}
              <button type="button" onClick={() => onRemoveEvent(event.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
