import { useCallback, useEffect, useState } from "react";
import type { SloTargets } from "../../../types/system";

export const SLO_STORAGE_KEY = "systemDesignerSloTargets";

export const DEFAULT_SLO_TARGETS: SloTargets = {
  latencyMs: 120,
  errorRate: 0.01,
};

const readInitialTargets = (): SloTargets => {
  if (typeof window === "undefined") {
    return DEFAULT_SLO_TARGETS;
  }
  try {
    const raw = window.localStorage.getItem(SLO_STORAGE_KEY);
    if (!raw) return DEFAULT_SLO_TARGETS;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.latencyMs === "number" &&
      typeof parsed.errorRate === "number"
    ) {
      return {
        latencyMs: Math.max(0, parsed.latencyMs),
        errorRate: Math.max(0, parsed.errorRate),
      };
    }
    return DEFAULT_SLO_TARGETS;
  } catch {
    return DEFAULT_SLO_TARGETS;
  }
};

export function useSloTargets() {
  const [sloTargets, setSloTargets] = useState<SloTargets>(() => readInitialTargets());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SLO_STORAGE_KEY, JSON.stringify(sloTargets));
  }, [sloTargets]);

  const handleUpdateSloTargets = useCallback((next: SloTargets) => {
    setSloTargets(next);
  }, []);

  return {
    sloTargets,
    setSloTargets,
    handleUpdateSloTargets,
  };
}
