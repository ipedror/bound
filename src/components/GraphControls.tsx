// ============================================================
// GraphControls - Controls for GraphView (layout, zoom, etc.)
// ============================================================

import { memo } from 'react';
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
}

/**
 * GraphControls - UI controls for the GraphView component
 */
export const GraphControls = memo(function GraphControls({
  currentLayout,
  onChangeLayout,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFit,
  disabled = false,
}: GraphControlsProps) {
  return (
    <div
      className="graph-controls"
      style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.75rem',
        backgroundColor: 'rgba(13, 13, 26, 0.9)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
      }}
    >
      {/* Layout Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label
          htmlFor="layout-select"
          style={{
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.6)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Layout
        </label>
        <select
          id="layout-select"
          value={currentLayout}
          onChange={(e) => onChangeLayout(e.target.value as LayoutName)}
          disabled={disabled}
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            color: '#f1f1f1',
            fontSize: '0.85rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            minWidth: '140px',
          }}
        >
          {AVAILABLE_LAYOUTS.map((layout) => (
            <option key={layout.name} value={layout.name}>
              {layout.label}
            </option>
          ))}
        </select>
      </div>

      {/* Zoom Controls */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={onZoomIn}
          disabled={disabled}
          title="Zoom In"
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            color: '#38bdf8',
            fontSize: '1rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)';
          }}
        >
          +
        </button>
        <button
          onClick={onZoomOut}
          disabled={disabled}
          title="Zoom Out"
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            color: '#38bdf8',
            fontSize: '1rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)';
          }}
        >
          −
        </button>
      </div>

      {/* Fit and Reset Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {onFit && (
          <button
            onClick={onFit}
            disabled={disabled}
            title="Fit to View"
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'rgba(131, 56, 236, 0.2)',
              color: '#8338ec',
              fontSize: '0.8rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = 'rgba(131, 56, 236, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(131, 56, 236, 0.2)';
            }}
          >
            Fit
          </button>
        )}
        <button
          onClick={onResetView}
          disabled={disabled}
          title="Reset View"
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backgroundColor: 'rgba(255, 190, 11, 0.2)',
            color: '#ffbe0b',
            fontSize: '0.8rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 190, 11, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 190, 11, 0.2)';
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
});
