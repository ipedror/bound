// ============================================================
// CanvasToolbar - Excalidraw-style floating toolbar
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

    return (
      <>
        {/* Top-center: Tool selector */}
        <div style={overlayStyles.topCenter}>
          <Island padding={6} style={{ display: 'flex', gap: '2px' }}>
            {TOOL_BUTTONS.map(({ tool, label, icon, shortcut }) => (
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

            {/* Divider */}
            <div style={styles.divider} />

            {/* Undo/Redo */}
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

            {/* Divider */}
            <div style={styles.divider} />

            {/* Clear All */}
            <button
              type="button"
              onClick={onClearAll}
              style={styles.clearButton}
              title="Clear All"
              aria-label="Clear All Shapes"
            >
              🗑
            </button>
          </Island>
        </div>

        {/* Left side panel: Colors + Style */}
        <div style={overlayStyles.leftPanel}>
          <Island padding={12} style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '160px' }}>
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

            {/* Stroke & Opacity */}
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
            )}
          </Island>
        </div>
      </>
    );
  },
);

CanvasToolbar.displayName = 'CanvasToolbar';

const overlayStyles: Record<string, React.CSSProperties> = {
  topCenter: {
    position: 'absolute',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
  },
  leftPanel: {
    position: 'absolute',
    top: '50%',
    left: '12px',
    transform: 'translateY(-50%)',
    zIndex: 50,
  },
};

const styles: Record<string, React.CSSProperties> = {
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
  toolButton: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.15s ease',
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
  divider: {
    width: '1px',
    height: '28px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
    margin: '0 2px',
  },
  colorsRow: {
    display: 'flex',
    gap: '8px',
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
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.15s ease',
  },
};
