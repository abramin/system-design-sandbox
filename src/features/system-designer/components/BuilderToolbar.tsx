import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { SloTargets } from "../../../types/system";
import type { SystemTemplate } from "../types";

interface BuilderToolbarProps {
  templateMenuOpen: boolean;
  templateMenuRef: MutableRefObject<HTMLDivElement | null>;
  templatePreview: SystemTemplate | null;
  templatePreviewId: string | null;
  templates: SystemTemplate[];
  onToggleTemplateMenu: () => void;
  onTemplatePreviewChange: (templateId: string | null) => void;
  onSelectTemplate: (templateId: string) => void;
  onExportTemplate: () => void;
  onImportTemplateClick: () => void;
  showLeftPanel: boolean;
  onToggleLeftPanel: () => void;
  showScenarioPanel: boolean;
  onToggleScenarioPanel: () => void;
  showPatternPanel: boolean;
  onTogglePatternPanel: () => void;
  showTrafficPanel: boolean;
  onToggleTrafficPanel: () => void;
  showDependencyInsights: boolean;
  onToggleDependencyInsights: () => void;
  showWhatIfPanel: boolean;
  onToggleWhatIfPanel: () => void;
  showLabsPanel: boolean;
  onToggleLabsPanel: () => void;
  onAutoArrange: () => void;
  onClearCanvas: () => void;
  sloTargets: SloTargets;
  onUpdateSloTargets: (next: SloTargets) => void;
  isMobile: boolean;
}

export function BuilderToolbar({
  templateMenuOpen,
  templateMenuRef,
  templatePreview,
  templatePreviewId,
  templates,
  onToggleTemplateMenu,
  onTemplatePreviewChange,
  onSelectTemplate,
  onExportTemplate,
  onImportTemplateClick,
  showLeftPanel,
  onToggleLeftPanel,
  showScenarioPanel,
  onToggleScenarioPanel,
  showPatternPanel,
  onTogglePatternPanel,
  showTrafficPanel,
  onToggleTrafficPanel,
  showDependencyInsights,
  onToggleDependencyInsights,
  showWhatIfPanel,
  onToggleWhatIfPanel,
  showLabsPanel,
  onToggleLabsPanel,
  onAutoArrange,
  onClearCanvas,
  sloTargets,
  onUpdateSloTargets,
  isMobile,
}: BuilderToolbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLatencyChange = (value: number) => {
    onUpdateSloTargets({
      ...sloTargets,
      latencyMs: Number.isFinite(value) ? Math.max(0, value) : sloTargets.latencyMs,
    });
  };

  const handleErrorRateChange = (value: number) => {
    onUpdateSloTargets({
      ...sloTargets,
      errorRate: Number.isFinite(value) ? Math.max(0, value) / 100 : sloTargets.errorRate,
    });
  };

  useEffect(() => {
    if (!isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [isMobile, mobileMenuOpen]);

  const templateSection = (
    <div className="layout-group template-group">
      <div className="template-menu" ref={templateMenuRef}>
        <button
          type="button"
          className={`template-trigger ${templateMenuOpen ? "open" : ""}`}
          onClick={onToggleTemplateMenu}
        >
          {templateMenuOpen ? "Close Examples" : "Load Examples"}
        </button>
        {templateMenuOpen && (
          <div className="template-dropdown" role="listbox" aria-label="System templates">
            {templates.map((template) => (
              <button
                type="button"
                key={template.id}
                className={`template-option ${templatePreviewId === template.id ? "active" : ""}`}
                onMouseEnter={() => onTemplatePreviewChange(template.id)}
                onFocus={() => onTemplatePreviewChange(template.id)}
                onClick={() => onSelectTemplate(template.id)}
              >
                <span className="template-option-name">{template.name}</span>
                <span className="template-option-meta">{template.nodes.length} nodes</span>
              </button>
            ))}
          </div>
        )}
        {templateMenuOpen && templatePreview && (
          <div className="template-tooltip">
            <strong>{templatePreview.name}</strong>
            <p>{templatePreview.description}</p>
          </div>
        )}
        <div className="template-actions">
          <button type="button" onClick={onExportTemplate}>
            Export Template
          </button>
          <button type="button" onClick={onImportTemplateClick}>
            Import Template
          </button>
        </div>
      </div>
    </div>
  );

  const managementSection = (
    <div className="layout-group management-group">
      <button
        type="button"
        className="control-pill"
        data-active={showLeftPanel}
        onClick={onToggleLeftPanel}
      >
        {showLeftPanel ? "Hide Components" : "Show Components"}
      </button>
      <button
        type="button"
        className="control-pill"
        data-active={showScenarioPanel}
        onClick={onToggleScenarioPanel}
      >
        {showScenarioPanel ? "Hide Scenarios" : "Show Scenarios"}
      </button>
      <button
        type="button"
        className="control-pill"
        data-active={showPatternPanel}
        onClick={onTogglePatternPanel}
      >
        {showPatternPanel ? "Hide Patterns" : "Show Patterns"}
      </button>
      <button
        type="button"
        className="control-pill"
        data-active={showTrafficPanel}
        onClick={onToggleTrafficPanel}
      >
        {showTrafficPanel ? "Hide Traffic" : "Show Traffic"}
      </button>
      <button
        type="button"
        className="control-pill"
        data-active={showDependencyInsights}
        onClick={onToggleDependencyInsights}
      >
        {showDependencyInsights ? "Hide Dependency Heatmap" : "Show Dependency Heatmap"}
      </button>
      <button
        type="button"
        className="control-pill"
        data-active={showWhatIfPanel}
        onClick={onToggleWhatIfPanel}
      >
        {showWhatIfPanel ? "Hide What-if Insights" : "Show What-if Insights"}
      </button>
      <button type="button" className="control-pill" onClick={onAutoArrange}>
        Auto Arrange
      </button>
    </div>
  );

  const sloSection = (
    <div className="layout-group slo-controls">
      <span className="slo-controls-title">SLO Targets</span>
      <label className="slo-inline-input">
        <span>Latency (ms)</span>
        <input
          type="number"
          min={0}
          value={Number.isFinite(sloTargets.latencyMs) ? sloTargets.latencyMs : 0}
          onChange={(event) => handleLatencyChange(Number(event.target.value))}
        />
      </label>
      <label className="slo-inline-input">
        <span>Error Rate (%)</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={
            Number.isFinite(sloTargets.errorRate)
              ? Number((sloTargets.errorRate * 100).toFixed(3))
              : 0
          }
          onChange={(event) => handleErrorRateChange(Number(event.target.value))}
        />
      </label>
    </div>
  );

  const labsSection = (
    <div className="layout-group labs-highlight">
      <span className="labs-chip">Labs</span>
      <button
        type="button"
        className={`control-pill ${showLabsPanel ? "active" : ""}`}
        data-active={showLabsPanel}
        onClick={onToggleLabsPanel}
      >
        {showLabsPanel ? "Hide" : "Show"} Guided Labs
      </button>
    </div>
  );

  const clearButton = (
    <button type="button" className="control-pill warning" data-active="false" onClick={onClearCanvas}>
      Clear Canvas
    </button>
  );

  if (isMobile) {
    return (
      <div className="mobile-toolbar">
        <div className="mobile-toolbar-header">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? "Close Controls" : "Open Controls"}
          </button>
          <button type="button" className="mobile-auto-arrange" onClick={onAutoArrange}>
            Auto Arrange
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="mobile-toolbar-panel">
            <div className="mobile-toolbar-section">{templateSection}</div>
            <div className="mobile-toolbar-section">{managementSection}</div>
            <div className="mobile-toolbar-section">{sloSection}</div>
            <div className="mobile-toolbar-section">{labsSection}</div>
            <div className="mobile-toolbar-section">{clearButton}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="layout-controls">
      {templateSection}
      {managementSection}
      {sloSection}
      {labsSection}
      {clearButton}
    </div>
  );
}
