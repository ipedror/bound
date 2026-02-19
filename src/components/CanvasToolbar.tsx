// ============================================================
// CanvasToolbar - Excalidraw-style horizontal top toolbar
// ============================================================

import React, { useCallback, useState, useRef, useEffect } from 'react';
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
  onSetRoughness: (roughness: number) => void;
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

// SVG icon components for each tool
const ToolIcons: Record<string, React.FC<{ size?: number }>> = {
  [ToolType.MOUSE]: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    </svg>
  ),
  [ToolType.SELECT]: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="1" strokeDasharray="4 2" />
      <line x1="4" y1="4" x2="7" y2="4" strokeDasharray="0" />
      <line x1="4" y1="4" x2="4" y2="7" strokeDasharray="0" />
      <line x1="20" y1="4" x2="17" y2="4" strokeDasharray="0" />
      <line x1="20" y1="4" x2="20" y2="7" strokeDasharray="0" />
      <line x1="4" y1="20" x2="7" y2="20" strokeDasharray="0" />
      <line x1="4" y1="20" x2="4" y2="17" strokeDasharray="0" />
      <line x1="20" y1="20" x2="17" y2="20" strokeDasharray="0" />
      <line x1="20" y1="20" x2="20" y2="17" strokeDasharray="0" />
    </svg>
  ),
  [ToolType.RECT]: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  [ToolType.ELLIPSE]: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="12" rx="10" ry="8" />
    </svg>
  ),
  [ToolType.LINE]: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="19" y2="5" />
    </svg>
  ),
  [ToolType.ARROW]: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="19" y2="5" />
      <polyline points="10 5 19 5 19 14" />
    </svg>
  ),
  [ToolType.TEXT]: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9.5" y1="20" x2="14.5" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  [ToolType.ERASER]: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H7L3 16c-.6-.6-.6-1.5 0-2.1l10-10c.6-.6 1.5-.6 2.1 0l7 7c.6.6.6 1.5 0 2.1L16 19" />
      <line x1="18" y1="13" x2="11" y2="6" />
    </svg>
  ),
};

interface ToolButtonDef {
  tool: ToolType;
  label: string;
  shortcut: string;
}

const TOOL_BUTTONS: ToolButtonDef[] = [
  { tool: ToolType.MOUSE, label: 'Hand (Pan)', shortcut: 'H' },
  { tool: ToolType.SELECT, label: 'Select', shortcut: 'V' },
  { tool: ToolType.RECT, label: 'Rectangle', shortcut: 'R' },
  { tool: ToolType.ELLIPSE, label: 'Ellipse', shortcut: 'O' },
  { tool: ToolType.LINE, label: 'Line', shortcut: 'L' },
  { tool: ToolType.ARROW, label: 'Arrow', shortcut: 'A' },
  { tool: ToolType.TEXT, label: 'Text', shortcut: 'T' },
  { tool: ToolType.ERASER, label: 'Eraser', shortcut: 'E' },
];

export const CanvasToolbar: React.FC<CanvasToolbarProps> = React.memo(
  ({
    canvasState,
    onSetTool,
    onSetFillColor,
    onSetStrokeColor,
    onSetStrokeWidth,
    onSetOpacity,
    onSetRoughness,
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
    const [showStylePanel, setShowStylePanel] = useState(false);
    const [showExportPanel, setShowExportPanel] = useState(false);
    const stylePanelRef = useRef<HTMLDivElement>(null);
    const exportPanelRef = useRef<HTMLDivElement>(null);

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

    // Close panels on outside click
    useEffect(() => {
      const handle = (e: MouseEvent) => {
        if (showStylePanel && stylePanelRef.current && !stylePanelRef.current.contains(e.target as Node)) {
          setShowStylePanel(false);
        }
        if (showExportPanel && exportPanelRef.current && !exportPanelRef.current.contains(e.target as Node)) {
          setShowExportPanel(false);
        }
      };
      document.addEventListener('mousedown', handle);
      return () => document.removeEventListener('mousedown', handle);
    }, [showStylePanel, showExportPanel]);

    const isTransparentFill = canvasState.fillColor === 'transparent';
    const isTransparentStroke = canvasState.strokeColor === 'transparent';
    const isHandDrawn = canvasState.roughness > 0;

    return (
      <div
        className="canvas-toolbar"
        style={overlayStyles.container}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Main toolbar - horizontal top center */}
        <Island padding={6} style={st.toolbar}>
          {/* Undo/Redo cluster */}
          <div style={st.cluster}>
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              style={{
                ...st.iconBtn,
                ...(canUndo ? {} : st.btnDisabled),
              }}
              title="Undo (Ctrl+Z)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              style={{
                ...st.iconBtn,
                ...(canRedo ? {} : st.btnDisabled),
              }}
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
              </svg>
            </button>
          </div>

          <div style={st.vDivider} />

          {/* Tool buttons */}
          <div style={st.toolRow}>
            {TOOL_BUTTONS.map(({ tool, label, shortcut }) => {
              const IconComponent = ToolIcons[tool];
              const isActive = canvasState.tool === tool;
              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => onSetTool(tool)}
                  style={{
                    ...st.toolBtn,
                    ...(isActive ? st.toolBtnActive : {}),
                  }}
                  title={`${label} (${shortcut})`}
                  aria-label={label}
                  aria-pressed={isActive}
                >
                  {IconComponent && <IconComponent />}
                </button>
              );
            })}
          </div>

          <div style={st.vDivider} />

          {/* Style & Settings cluster */}
          <div style={st.cluster}>
            {/* Style panel toggle */}
            <div ref={stylePanelRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => { setShowStylePanel(!showStylePanel); setShowExportPanel(false); }}
                style={{
                  ...st.iconBtn,
                  ...(showStylePanel ? st.toolBtnActive : {}),
                }}
                title="Style settings"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
              </button>

              {/* Style dropdown panel */}
              {showStylePanel && (
                <Island padding={14} style={st.dropdown}>
                  {/* Colors row - Fill & Stroke side by side */}
                  <div style={st.colorsGrid}>
                    <div style={st.colorCell}>
                      <span style={st.dropLabel}>Fill</span>
                      <div style={st.colorRow}>
                        <ColorPicker
                          color={canvasState.fillColor}
                          onChange={onSetFillColor}
                          allowTransparent
                        />
                        <button
                          type="button"
                          onClick={() => onSetFillColor(isTransparentFill ? '#1a1a2e' : 'transparent')}
                          style={{
                            ...st.toggleBtn,
                            ...(isTransparentFill ? st.toggleActive : {}),
                          }}
                          title={isTransparentFill ? 'Enable fill' : 'No fill'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div style={st.colorCell}>
                      <span style={st.dropLabel}>Stroke</span>
                      <div style={st.colorRow}>
                        <ColorPicker
                          color={canvasState.strokeColor}
                          onChange={onSetStrokeColor}
                          allowTransparent
                        />
                        <button
                          type="button"
                          onClick={() => onSetStrokeColor(isTransparentStroke ? '#00d4ff' : 'transparent')}
                          style={{
                            ...st.toggleBtn,
                            ...(isTransparentStroke ? st.toggleActive : {}),
                          }}
                          title={isTransparentStroke ? 'Enable stroke' : 'No stroke'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={st.dropDivider} />

                  {/* Stroke & Opacity row - side by side */}
                  <div style={st.twoColGrid}>
                    <div style={st.gridCell}>
                      <div style={st.dropLabelRow}>
                        <span style={st.dropLabel}>Stroke width</span>
                        <span style={st.dropValue}>{canvasState.strokeWidth}px</span>
                      </div>
                      <div style={st.strokePresets}>
                        {[1, 2, 4, 6].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => onSetStrokeWidth(w)}
                            style={{
                              ...st.presetBtn,
                              ...(canvasState.strokeWidth === w ? st.presetActive : {}),
                            }}
                            title={`${w}px`}
                          >
                            <div style={{
                              width: '18px',
                              height: `${Math.max(1, w)}px`,
                              backgroundColor: 'currentColor',
                              borderRadius: '1px',
                            }} />
                          </button>
                        ))}
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={canvasState.strokeWidth}
                        onChange={handleStrokeWidthChange}
                        style={st.slider}
                      />
                    </div>
                    <div style={st.gridCell}>
                      <div style={st.dropLabelRow}>
                        <span style={st.dropLabel}>Opacity</span>
                        <span style={st.dropValue}>{Math.round(canvasState.opacity * 100)}%</span>
                      </div>
                      <div style={{ height: '28px', display: 'flex', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: '1px solid #334155',
                            background: `linear-gradient(45deg, #334155 25%, transparent 25%, transparent 75%, #334155 75%), linear-gradient(45deg, #334155 25%, transparent 25%, transparent 75%, #334155 75%)`,
                            backgroundSize: '8px 8px',
                            backgroundPosition: '0 0, 4px 4px',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: canvasState.strokeColor === 'transparent' ? '#38bdf8' : canvasState.strokeColor,
                            opacity: canvasState.opacity,
                          }} />
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={canvasState.opacity}
                        onChange={handleOpacityChange}
                        style={st.slider}
                      />
                    </div>
                  </div>

                  <div style={st.dropDivider} />

                  {/* Edge style */}
                  <div style={st.dropSectionCompact}>
                    <span style={st.dropLabel}>Edge style</span>
                    <div style={st.edgeStyleRow}>
                      <button
                        type="button"
                        onClick={() => onSetRoughness(0)}
                        style={{
                          ...st.edgeBtn,
                          ...(!isHandDrawn ? st.edgeBtnActive : {}),
                        }}
                        title="Sharp edges"
                      >
                        <svg width="24" height="16" viewBox="0 0 24 16">
                          <rect x="2" y="2" width="20" height="12" rx="0" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <span style={st.edgeBtnLabel}>Sharp</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetRoughness(1)}
                        style={{
                          ...st.edgeBtn,
                          ...(canvasState.roughness === 1 ? st.edgeBtnActive : {}),
                        }}
                        title="Artist style"
                      >
                        <svg width="24" height="16" viewBox="0 0 24 16">
                          <path d="M3 3 C5 2, 19 2, 21 3 C22 5, 22 11, 21 13 C19 14, 5 14, 3 13 C2 11, 2 5, 3 3Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <span style={st.edgeBtnLabel}>Artist</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetRoughness(2)}
                        style={{
                          ...st.edgeBtn,
                          ...(canvasState.roughness >= 2 ? st.edgeBtnActive : {}),
                        }}
                        title="Cartoonist style"
                      >
                        <svg width="24" height="16" viewBox="0 0 24 16">
                          <path d="M3 4 C6 1, 18 1, 21 4 C23 7, 22 12, 20 14 C17 16, 7 15, 4 13 C1 10, 1 6, 3 4Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                        <span style={st.edgeBtnLabel}>Sketch</span>
                      </button>
                    </div>
                  </div>

                  {/* Font (shown for text tool) */}
                  {canvasState.tool === ToolType.TEXT && (
                    <>
                      <div style={st.dropDivider} />
                      <div style={st.dropSectionCompact}>
                        <span style={st.dropLabel}>Text</span>
                        <FontSelector
                          fontFamily={canvasState.fontFamily}
                          fontSize={canvasState.fontSize}
                          onFontFamilyChange={onSetFontFamily}
                          onFontSizeChange={onSetFontSize}
                        />
                        <div style={st.dropLabelRow}>
                          <span style={st.dropLabel}>Max width</span>
                          <span style={st.dropValue}>{canvasState.textMaxWidth === 0 ? 'Auto' : `${canvasState.textMaxWidth}px`}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={800}
                          step={10}
                          value={canvasState.textMaxWidth}
                          onChange={handleTextMaxWidthChange}
                          style={st.slider}
                        />
                      </div>
                    </>
                  )}
                </Island>
              )}
            </div>

            {/* Group / Ungroup */}
            <button
              type="button"
              onClick={onGroup}
              disabled={!hasMultiSelection}
              style={{
                ...st.iconBtn,
                ...(hasMultiSelection ? {} : st.btnDisabled),
              }}
              title="Group (Ctrl+G)"
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
                ...st.iconBtn,
                ...(hasGroupInSelection ? {} : st.btnDisabled),
              }}
              title="Ungroup (Ctrl+Shift+G)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="8" height="8" rx="1" />
                <rect x="14" y="14" width="8" height="8" rx="1" />
                <line x1="10" y1="6" x2="14" y2="6" strokeDasharray="2 2" />
                <line x1="6" y1="10" x2="6" y2="14" strokeDasharray="2 2" />
              </svg>
            </button>

            <div style={st.vDivider} />

            {/* Export */}
            <div ref={exportPanelRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => { setShowExportPanel(!showExportPanel); setShowStylePanel(false); }}
                disabled={!hasShapes}
                style={{
                  ...st.iconBtn,
                  ...(hasShapes ? {} : st.btnDisabled),
                  ...(showExportPanel ? st.toolBtnActive : {}),
                }}
                title="Export"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>

              {showExportPanel && (
                <Island padding={8} style={st.exportDropdown}>
                  <button
                    type="button"
                    onClick={() => { onExportPng(); setShowExportPanel(false); }}
                    style={st.exportItem}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Export PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => { onExportJpeg(); setShowExportPanel(false); }}
                    style={st.exportItem}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Export JPG
                  </button>
                </Island>
              )}
            </div>

            {/* Clear all */}
            <button
              type="button"
              onClick={onClearAll}
              disabled={!hasShapes}
              style={{
                ...st.iconBtn,
                ...(hasShapes ? st.dangerBtn : st.btnDisabled),
              }}
              title="Clear All"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </Island>
      </div>
    );
  },
);

CanvasToolbar.displayName = 'CanvasToolbar';

// Layout: horizontal top center
const overlayStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 90,
  },
};

const st: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
  },
  cluster: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  toolRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  vDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    margin: '0 2px',
    flexShrink: 0,
  },
  // Tool button - main shape tools
  toolBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#cbd5e1',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    padding: 0,
  },
  toolBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    color: '#38bdf8',
    boxShadow: '0 0 8px rgba(56, 189, 248, 0.15)',
  },
  // General icon button (undo, redo, etc)
  iconBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    padding: 0,
  },
  btnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  },
  dangerBtn: {
    color: '#f87171',
  },
  // Style dropdown panel
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    minWidth: '280px',
    zIndex: 200,
  },
  colorsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  colorCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  gridCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  dropSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '8px',
  },
  dropSectionCompact: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '4px',
  },
  dropLabel: {
    fontSize: '10px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  dropLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropValue: {
    fontSize: '10px',
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  dropDivider: {
    width: '100%',
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    margin: '4px 0',
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  toggleBtn: {
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: '1px solid #334155',
    borderRadius: '6px',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.15s ease',
  },
  toggleActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
    color: '#38bdf8',
  },
  strokePresets: {
    display: 'flex',
    gap: '4px',
  },
  presetBtn: {
    width: '32px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '6px',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.12s ease',
  },
  presetActive: {
    borderColor: '#38bdf8',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  slider: {
    width: '100%',
    height: '4px',
    cursor: 'pointer',
    accentColor: '#38bdf8',
  },
  // Edge style (roughness)
  edgeStyleRow: {
    display: 'flex',
    gap: '4px',
  },
  edgeBtn: {
    flex: 1,
    height: '48px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    cursor: 'pointer',
    padding: '4px',
    transition: 'all 0.12s ease',
  },
  edgeBtnActive: {
    borderColor: '#38bdf8',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  edgeBtnLabel: {
    fontSize: '9px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  // Export dropdown
  exportDropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    minWidth: '150px',
    zIndex: 200,
  },
  exportItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 10px',
    backgroundColor: 'transparent',
    color: '#cbd5e1',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
    textAlign: 'left',
  },
};
