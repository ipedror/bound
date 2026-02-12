// ============================================================
// GraphControls - Excalidraw-style compact controls
// ============================================================

import { memo } from 'react';
import { Island } from './Island';
import type { LayoutName } from '../types/graph';
import { AVAILABLE_LAYOUTS, MAX_HIERARCHY_DEPTH } from '../constants/graph';

export type GraphLayerMode = 'contents' | 'areas' | 'children';

export interface GraphControlsProps {
  currentLayout: LayoutName;
  onChangeLayout: (layoutName: LayoutName) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFit?: () => void;
  disabled?: boolean;
  /** Current layer mode */
  layerMode?: GraphLayerMode;
  onChangeLayerMode?: (mode: GraphLayerMode) => void;
  /** Whether we are drilled into an area */
  drillAreaName?: string;
  onBackToAreas?: () => void;
  /** Show parent-child edges toggle */
  showParentChildEdges?: boolean;
  onToggleParentChildEdges?: (enabled: boolean) => void;
  /** Children layer: selected parent content */
  childrenParentId?: string;
  onChangeChildrenParent?: (contentId: string | undefined) => void;
  /** List of contents available to select as parent in children layer */
  parentContents?: { id: string; title: string; emoji?: string }[];
  /** Max hierarchy levels to display (1–8) */
  maxHierarchyLevels?: number;
  onChangeMaxHierarchyLevels?: (levels: number) => void;
  /** Open level configuration panel */
  onOpenLevelConfig?: () => void;
}

/**
 * GraphControls - Compact Island panel for graph settings
 */
export const GraphControls = memo(function GraphControls({
  currentLayout,
  onChangeLayout,
  onResetView,
  disabled = false,
  layerMode,
  onChangeLayerMode,
  drillAreaName,
  onBackToAreas,
  showParentChildEdges,
  onToggleParentChildEdges,
  childrenParentId,
  onChangeChildrenParent,
  parentContents,
  maxHierarchyLevels,
  onChangeMaxHierarchyLevels,
  onOpenLevelConfig,
}: GraphControlsProps) {
  const layerLabels: Record<GraphLayerMode, string> = {
    contents: 'Contents',
    areas: 'Areas',
    children: 'Children',
  };
  const layerCycle: GraphLayerMode[] = ['contents', 'areas', 'children'];

  const handleCycleLayer = () => {
    if (!onChangeLayerMode || !layerMode) return;
    const idx = layerCycle.indexOf(layerMode);
    const next = layerCycle[(idx + 1) % layerCycle.length];
    onChangeLayerMode(next);
  };

  return (
    <Island padding={8} style={styles.container}>
      {/* Layout selector */}
      <div style={styles.section}>
        <label style={styles.label} htmlFor="layout-select">Layout</label>
        <select
          id="layout-select"
          value={currentLayout}
          onChange={(e) => onChangeLayout(e.target.value as LayoutName)}
          disabled={disabled}
          style={styles.select}
        >
          {AVAILABLE_LAYOUTS.map((layout) => (
            <option key={layout.name} value={layout.name}>
              {layout.label}
            </option>
          ))}
        </select>
      </div>

      {/* Layer mode cycle: Contents → Areas → Children */}
      {onChangeLayerMode !== undefined && layerMode && (
        <>
          <div style={styles.divider} />
          <div style={styles.section}>
            <label style={styles.label}>Layer</label>
            <button
              style={{
                ...styles.toggleButton,
                ...(layerMode !== 'contents' ? styles.toggleButtonActive : {}),
              }}
              onClick={handleCycleLayer}
              title={`Current: ${layerLabels[layerMode]}. Click to cycle.`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              {layerLabels[layerMode]}
            </button>
          </div>
        </>
      )}

      {/* Children layer: parent selector */}
      {layerMode === 'children' && onChangeChildrenParent && parentContents && (
        <>
          <div style={styles.section}>
            <label style={styles.label}>Parent</label>
            <select
              value={childrenParentId ?? ''}
              onChange={(e) => onChangeChildrenParent(e.target.value || undefined)}
              style={styles.select}
            >
              <option value="">Select parent…</option>
              {parentContents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji ? `${c.emoji} ` : ''}{c.title}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Parent-child edges toggle */}
      {onToggleParentChildEdges !== undefined && layerMode === 'contents' && (
        <>
          <div style={styles.divider} />
          <div style={styles.section}>
            <label style={styles.label}>Hierarchy</label>
            <button
              style={{
                ...styles.toggleButton,
                ...(showParentChildEdges ? styles.toggleButtonActive : {}),
              }}
              onClick={() => onToggleParentChildEdges(!showParentChildEdges)}
              title={showParentChildEdges ? 'Hide parent-child lines' : 'Show parent-child lines'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="3" />
                <line x1="12" y1="8" x2="12" y2="14" />
                <circle cx="7" cy="19" r="3" />
                <circle cx="17" cy="19" r="3" />
                <line x1="12" y1="14" x2="7" y2="16" />
                <line x1="12" y1="14" x2="17" y2="16" />
              </svg>
              {showParentChildEdges ? 'Parent-Child' : 'Parent-Child'}
            </button>
          </div>
        </>
      )}

      {/* Max hierarchy levels selector — shown when hierarchy is active */}
      {onChangeMaxHierarchyLevels && maxHierarchyLevels !== undefined &&
       ((layerMode === 'contents' && showParentChildEdges) || layerMode === 'children') && (
        <div style={styles.section}>
          <label style={styles.label}>Max Levels</label>
          <div style={styles.levelRow}>
            {Array.from({ length: MAX_HIERARCHY_DEPTH }, (_, i) => i + 1).map((lvl) => (
              <button
                key={lvl}
                style={{
                  ...styles.levelBtn,
                  ...(maxHierarchyLevels >= lvl ? styles.levelBtnActive : {}),
                }}
                onClick={() => onChangeMaxHierarchyLevels(lvl)}
                title={`Show ${lvl} level${lvl > 1 ? 's' : ''}`}
              >
                {lvl}
              </button>
            ))}
          </div>
          {/* Configure levels button */}
          {onOpenLevelConfig && (
            <button
              style={styles.configBtn}
              onClick={onOpenLevelConfig}
              title="Configure level names, colors and area scope"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Configure
            </button>
          )}
        </div>
      )}

      {/* Back to areas button (when drilled into an area) */}
      {drillAreaName && onBackToAreas && (
        <>
          <div style={styles.divider} />
          <button
            onClick={onBackToAreas}
            style={styles.backButton}
            title="Back to area view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            ← {drillAreaName}
          </button>
        </>
      )}

      <div style={styles.divider} />

      {/* Reset */}
      <button
        onClick={onResetView}
        disabled={disabled}
        style={styles.resetButton}
        title="Reset View"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        Reset
      </button>
    </Island>
  );
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '160px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '10px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  select: {
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontSize: '12px',
    cursor: 'pointer',
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 8px',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    color: '#a78bfa',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  resetButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  levelRow: {
    display: 'flex',
    gap: '2px',
  },
  levelBtn: {
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: '#64748b',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.12s ease',
  },
  levelBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    color: '#38bdf8',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  configBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    whiteSpace: 'nowrap' as const,
  },
};
