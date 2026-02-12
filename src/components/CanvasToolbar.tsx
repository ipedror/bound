// ============================================================
// CanvasToolbar - Vertical sidebar toolbar (scrollable)
// ============================================================

import React, { useCallback } from 'react';
import { Island } from './Island';
import { ColorPicker } from './ColorPicker';
import { FontSelector } from './FontSelector';
import { ToolType } from '../types/canvas';
import type { CanvasState } from '../types/canvas';

interface CanvasToolbarProps {
  canvasState: CanvasState;
  onSetTool: (tool: ToolType) => void;
  onSetFillColor: (color: string) => void;
  onSetStrokeColor: (color: string) => void;
  onSetStrokeWidth: (width: number) => void;
  onSetOpacity: (opacity: number) => void;
  onSetFontFamily: (family: string) => void;
  onSetFontSize: (size: number) => void;
  onSetTextMaxWidth: (maxWidth: number) => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  onClearAll: () => void;
  // Grouping
  hasSelection: boolean;
  hasMultiSelection: boolean;
  onGroup: () => void;
  onUngroup: () => void;
  hasGroupInSelection: boolean;
  // Export
  onExportPng: () => void;
  onExportJpeg: () => void;
  hasShapes: boolean;
}

interface ToolButtonConfig {
  tool: ToolType;
  label: string;
  icon: string;
  shortcut?: string;
}

const TOOL_BUTTONS: ToolButtonConfig[] = [
  { tool: ToolType.SELECT, label: 'Select', icon: '⬚', shortcut: 'V' },
  { tool: ToolType.RECT, label: 'Rectangle', icon: '▭', shortcut: 'R' },
  { tool: ToolType.ELLIPSE, label: 'Ellipse', icon: '○', shortcut: 'O' },
  { tool: ToolType.LINE, label: 'Line', icon: '╱', shortcut: 'L' },
  { tool: ToolType.ARROW, label: 'Arrow', icon: '→', shortcut: 'A' },
  { tool: ToolType.TEXT, label: 'Text', icon: 'T', shortcut: 'T' },
  { tool: ToolType.ERASER, label: 'Eraser', icon: '✕', shortcut: 'E' },
];

export const CanvasToolbar: React.FC<CanvasToolbarProps> = React.memo(
  ({
    canvasState,
    onSetTool,
    onSetFillColor,
    onSetStrokeColor,
    onSetStrokeWidth,
    onSetOpacity,
    onSetFontFamily,
    onSetFontSize,
    onSetTextMaxWidth,
    canUndo,
    onUndo,
    canRedo,
    onRedo,
    onClearAll,
    hasSelection: _hasSelection,
    hasMultiSelection,
    onGroup,
    onUngroup,
    hasGroupInSelection,
    onExportPng,
    onExportJpeg,
    hasShapes,
  }) => {
    const handleStrokeWidthChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onSetStrokeWidth(Number(e.target.value));
      },
      [onSetStrokeWidth],
    );

    const handleOpacityChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onSetOpacity(Number(e.target.value));
      },
      [onSetOpacity],
    );

    const handleTextMaxWidthChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onSetTextMaxWidth(Number(e.target.value));
      },
      [onSetTextMaxWidth],
    );

    const isTransparentFill = canvasState.fillColor === 'transparent';

    return (
      <div
        className="canvas-toolbar"
        style={overlayStyles.sidebar}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <Island padding={8} style={styles.sidebarIsland}>
          {/* Tool buttons */}
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Tools</span>
            <div style={styles.toolGrid}>
              {TOOL_BUTTONS.map(({ tool, label, icon }) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => onSetTool(tool)}
                  style={{
                    ...styles.toolButton,
                    ...(canvasState.tool === tool ? styles.toolButtonActive : {}),
                  }}
                  title={label}
                  aria-label={label}
                  aria-pressed={canvasState.tool === tool}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.hDivider} />

          {/* Undo / Redo / Clear */}
          <div style={styles.section}>
            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                style={{
                  ...styles.toolButton,
                  ...(canUndo ? {} : styles.toolButtonDisabled),
                }}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                style={{
                  ...styles.toolButton,
                  ...(canRedo ? {} : styles.toolButtonDisabled),
                }}
                title="Redo (Ctrl+Shift+Z)"
                aria-label="Redo"
              >
                ↷
              </button>
              <button
                type="button"
                onClick={onClearAll}
                style={styles.clearButton}
                title="Clear All"
                aria-label="Clear All Shapes"
              >
                🗑
              </button>
            </div>
          </div>

          <div style={styles.hDivider} />

          {/* Colors */}
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Colors</span>
            <div style={styles.colorRow}>
              <ColorPicker
                color={canvasState.fillColor}
                onChange={onSetFillColor}
                label="Fill"
                allowTransparent
              />
              <button
                type="button"
                onClick={() => onSetFillColor(isTransparentFill ? '#1a1a2e' : 'transparent')}
                style={{
                  ...styles.transparentToggle,
                  ...(isTransparentFill ? styles.transparentToggleActive : {}),
                }}
                title={isTransparentFill ? 'Enable fill' : 'No fill (transparent)'}
                aria-label="Toggle transparent fill"
              >
                ⊘
              </button>
            </div>
            <ColorPicker
              color={canvasState.strokeColor}
              onChange={onSetStrokeColor}
              label="Stroke"
            />
          </div>

          <div style={styles.hDivider} />

          {/* Style */}
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Style</span>
            <label style={styles.sliderLabel}>
              Width: {canvasState.strokeWidth}
              <input
                type="range"
                min={1}
                max={20}
                value={canvasState.strokeWidth}
                onChange={handleStrokeWidthChange}
                style={styles.slider}
              />
            </label>
            <label style={styles.sliderLabel}>
              Opacity: {Math.round(canvasState.opacity * 100)}%
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={canvasState.opacity}
                onChange={handleOpacityChange}
                style={styles.slider}
              />
            </label>
          </div>

          {/* Font Section (visible for text tool) */}
          {canvasState.tool === ToolType.TEXT && (
            <>
              <div style={styles.hDivider} />
              <div style={styles.section}>
                <span style={styles.sectionLabel}>Text</span>
                <FontSelector
                  fontFamily={canvasState.fontFamily}
                  fontSize={canvasState.fontSize}
                  onFontFamilyChange={onSetFontFamily}
                  onFontSizeChange={onSetFontSize}
                />
                <label style={styles.sliderLabel}>
                  Max Width: {canvasState.textMaxWidth === 0 ? 'Auto' : `${canvasState.textMaxWidth}px`}
                  <input
                    type="range"
                    min={0}
                    max={800}
                    step={10}
                    value={canvasState.textMaxWidth}
                    onChange={handleTextMaxWidthChange}
                    style={styles.slider}
                  />
                </label>
              </div>
            </>
          )}

          <div style={styles.hDivider} />

          {/* Group / Ungroup */}
          <div style={styles.section}>
            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={onGroup}
                disabled={!hasMultiSelection}
                style={{
                  ...styles.toolButton,
                  ...(hasMultiSelection ? {} : styles.toolButtonDisabled),
                }}
                title="Group (Ctrl+G)"
                aria-label="Group selected shapes"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="8" height="8" rx="1" />
                  <rect x="14" y="14" width="8" height="8" rx="1" />
                  <path d="M10 6h4M6 10v4M14 18v-4M18 14h-4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onUngroup}
                disabled={!hasGroupInSelection}
                style={{
                  ...styles.toolButton,
                  ...(hasGroupInSelection ? {} : styles.toolButtonDisabled),
                }}
                title="Ungroup (Ctrl+Shift+G)"
                aria-label="Ungroup selected shapes"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="8" height="8" rx="1" />
                  <rect x="14" y="14" width="8" height="8" rx="1" />
                  <line x1="10" y1="6" x2="14" y2="6" strokeDasharray="2 2" />
                  <line x1="6" y1="10" x2="6" y2="14" strokeDasharray="2 2" />
                </svg>
              </button>
            </div>
          </div>

          <div style={styles.hDivider} />

          {/* Export */}
          <div style={styles.section}>
            <span style={styles.sectionLabel}>Export</span>
            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={onExportPng}
                disabled={!hasShapes}
                style={{
                  ...styles.exportButton,
                  ...(hasShapes ? {} : styles.toolButtonDisabled),
                }}
                title="Export as PNG (high quality)"
                aria-label="Export as PNG"
              >
                PNG
              </button>
              <button
                type="button"
                onClick={onExportJpeg}
                disabled={!hasShapes}
                style={{
                  ...styles.exportButton,
                  ...(hasShapes ? {} : styles.toolButtonDisabled),
                }}
                title="Export as JPEG"
                aria-label="Export as JPEG"
              >
                JPG
              </button>
            </div>
          </div>
        </Island>
      </div>
    );
  },
);

CanvasToolbar.displayName = 'CanvasToolbar';

const overlayStyles: Record<string, React.CSSProperties> = {
  sidebar: {
    position: 'absolute',
    top: '50%',
    left: '12px',
    transform: 'translateY(-50%)',
    zIndex: 90,
    maxHeight: 'calc(100% - 68px)',
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.15) transparent',
  },
};

const styles: Record<string, React.CSSProperties> = {
  sidebarIsland: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '148px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionLabel: {
    fontSize: '10px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  toolGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '2px',
  },
  toolButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    border: '1px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.15s ease',
    padding: 0,
  },
  toolButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38bdf8',
    color: '#38bdf8',
  },
  toolButtonDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  hDivider: {
    width: '100%',
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionRow: {
    display: 'flex',
    gap: '2px',
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  transparentToggle: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    padding: 0,
    transition: 'all 0.15s ease',
  },
  transparentToggleActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38bdf8',
    color: '#38bdf8',
  },
  sliderLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '10px',
    color: '#94a3b8',
  },
  slider: {
    width: '100%',
    height: '4px',
    cursor: 'pointer',
    accentColor: '#38bdf8',
  },
  clearButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.15s ease',
    padding: 0,
  },
  exportButton: {
    flex: 1,
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 600,
    transition: 'all 0.15s ease',
    padding: 0,
  },
};
