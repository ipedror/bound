// ============================================================
// CanvasToolbar - Toolbar for canvas editor
// ============================================================

import React, { useCallback } from 'react';
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
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  onClearAll: () => void;
}

interface ToolButtonConfig {
  tool: ToolType;
  label: string;
  icon: string;
}

const TOOL_BUTTONS: ToolButtonConfig[] = [
  { tool: ToolType.SELECT, label: 'Select', icon: '⬚' },
  { tool: ToolType.RECT, label: 'Rectangle', icon: '▭' },
  { tool: ToolType.ELLIPSE, label: 'Ellipse', icon: '○' },
  { tool: ToolType.LINE, label: 'Line', icon: '╱' },
  { tool: ToolType.ARROW, label: 'Arrow', icon: '→' },
  { tool: ToolType.TEXT, label: 'Text', icon: 'T' },
  { tool: ToolType.ERASER, label: 'Eraser', icon: '✕' },
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
    canUndo,
    onUndo,
    canRedo,
    onRedo,
    onClearAll,
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

    return (
      <div className="canvas-toolbar" style={styles.toolbar}>
        {/* Tools Section */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>Tools</span>
          <div style={styles.toolButtons}>
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

        {/* Divider */}
        <div style={styles.divider} />

        {/* Colors Section */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>Colors</span>
          <div style={styles.colorsRow}>
            <ColorPicker
              color={canvasState.fillColor}
              onChange={onSetFillColor}
              label="Fill"
            />
            <ColorPicker
              color={canvasState.strokeColor}
              onChange={onSetStrokeColor}
              label="Stroke"
            />
          </div>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Stroke & Opacity Section */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>Style</span>
          <div style={styles.slidersRow}>
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
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Font Section (visible for text tool) */}
        {canvasState.tool === ToolType.TEXT && (
          <>
            <div style={styles.section}>
              <span style={styles.sectionLabel}>Text</span>
              <FontSelector
                fontFamily={canvasState.fontFamily}
                fontSize={canvasState.fontSize}
                onFontFamilyChange={onSetFontFamily}
                onFontSizeChange={onSetFontSize}
              />
            </div>
            <div style={styles.divider} />
          </>
        )}

        {/* History Section */}
        <div style={styles.section}>
          <span style={styles.sectionLabel}>History</span>
          <div style={styles.historyButtons}>
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              style={{
                ...styles.actionButton,
                ...(canUndo ? {} : styles.actionButtonDisabled),
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
                ...styles.actionButton,
                ...(canRedo ? {} : styles.actionButtonDisabled),
              }}
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
            >
              ↷
            </button>
          </div>
        </div>

        {/* Spacer */}
        <div style={styles.spacer} />

        {/* Clear All */}
        <button
          type="button"
          onClick={onClearAll}
          style={styles.clearButton}
          title="Clear All"
          aria-label="Clear All Shapes"
        >
          🗑 Clear All
        </button>
      </div>
    );
  },
);

CanvasToolbar.displayName = 'CanvasToolbar';

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    backgroundColor: '#1e1e2e',
    borderTop: '1px solid #333',
    flexWrap: 'wrap',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionLabel: {
    fontSize: '10px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  toolButtons: {
    display: 'flex',
    gap: '4px',
  },
  toolButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a3e',
    color: '#f1f1f1',
    border: '1px solid #444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.15s ease',
  },
  toolButtonActive: {
    backgroundColor: '#00d4ff',
    color: '#1a1a2e',
    borderColor: '#00d4ff',
  },
  divider: {
    width: '1px',
    height: '40px',
    backgroundColor: '#444',
  },
  colorsRow: {
    display: 'flex',
    gap: '8px',
  },
  slidersRow: {
    display: 'flex',
    gap: '16px',
  },
  sliderLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '10px',
    color: '#aaa',
    minWidth: '80px',
  },
  slider: {
    width: '100%',
    height: '4px',
    cursor: 'pointer',
    accentColor: '#00d4ff',
  },
  historyButtons: {
    display: 'flex',
    gap: '4px',
  },
  actionButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a3e',
    color: '#f1f1f1',
    border: '1px solid #444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.15s ease',
  },
  actionButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  spacer: {
    flex: 1,
  },
  clearButton: {
    padding: '6px 12px',
    backgroundColor: '#ff006e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'opacity 0.15s ease',
  },
};
