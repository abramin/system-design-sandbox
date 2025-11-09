import { useMemo } from "react";

interface LabStep {
  id: string;
  title: string;
  description: string;
  hint?: string;
}

export interface GuidedLab {
  id: string;
  title: string;
  goal: string;
  difficulty: "easy" | "medium" | "advanced";
  steps: LabStep[];
}

interface GuidedLabsPanelProps {
  labs: GuidedLab[];
  progress: Record<string, boolean>;
  onToggleStep: (stepId: string) => void;
  onMarkLabComplete: (labId: string) => void;
}

export default function GuidedLabsPanel({
  labs,
  progress,
  onToggleStep,
  onMarkLabComplete,
}: GuidedLabsPanelProps) {
  const completionByLab = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    labs.forEach((lab) => {
      const done = lab.steps.filter((step) => progress[step.id]).length;
      map.set(lab.id, { done, total: lab.steps.length });
    });
    return map;
  }, [labs, progress]);

  return (
    <div className="labs-panel">
      <header className="labs-header">
        <div>
          <p className="labs-eyebrow">Guided labs</p>
          <h3>Practice scaling techniques</h3>
        </div>
        <p className="labs-hint">Work through each checklist as you modify the canvas.</p>
      </header>
      <div className="labs-list">
        {labs.map((lab) => {
          const completion = completionByLab.get(lab.id);
          const isComplete = completion ? completion.done === completion.total : false;
          return (
            <article key={lab.id} className="lab-card" data-complete={isComplete}>
              <div className="lab-card-header">
                <div>
                  <span className={`lab-difficulty lab-difficulty-${lab.difficulty}`}>{lab.difficulty}</span>
                  <h4>{lab.title}</h4>
                  <p>{lab.goal}</p>
                </div>
                <div className="lab-progress">
                  {completion?.done ?? 0}/{completion?.total ?? lab.steps.length}
                </div>
              </div>
              <ul className="lab-step-list">
                {lab.steps.map((step) => (
                  <li key={step.id} className="lab-step">
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(progress[step.id])}
                        onChange={() => onToggleStep(step.id)}
                      />
                      <div className="lab-step-content">
                        <span className="lab-step-title">{step.title}</span>
                        <p>{step.description}</p>
                        {step.hint && <span className="lab-step-hint">{step.hint}</span>}
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
              {!isComplete && (
                <button
                  type="button"
                  className="lab-mark-complete"
                  onClick={() => onMarkLabComplete(lab.id)}
                >
                  Mark Lab Complete
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
