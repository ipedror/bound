// ============================================================
// GraphControls - Excalidraw-style compact controls
// ============================================================

import { memo } from 'react';
import { Island } from './Island';
import type { LayoutName } from '../types/graph';
import { AVAILABLE_LAYOUTS } from '../constants/graph';

export interface GraphControlsProps {
  currentLayout: LayoutName;
  onChangeLayout: (layoutName: LayoutName) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFit?: () => void;
  disabled?: boolean;
  /** Layer mode toggle */
  layerMode?: boolean;
  onToggleLayerMode?: (enabled: boolean) => void;
  /** Whether we are drilled into an area */
  drillAreaName?: string;
  onBackToAreas?: () => void;
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
  onToggleLayerMode,
  drillAreaName,
  onBackToAreas,
}: GraphControlsProps) {
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

      {/* Layer mode toggle */}
      {onToggleLayerMode !== undefined && (
        <>
          <div style={styles.divider} />
          <div style={styles.section}>
            <label style={styles.label}>Layers</label>
            <button
              style={{
                ...styles.toggleButton,
                ...(layerMode ? styles.toggleButtonActive : {}),
              }}
              onClick={() => onToggleLayerMode(!layerMode)}
              title={layerMode ? 'Switch to all contents' : 'Switch to area layers'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              {layerMode ? 'Areas' : 'Contents'}
            </button>
          </div>
        </>
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
};
