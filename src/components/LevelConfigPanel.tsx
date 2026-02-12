// ============================================================
// LevelConfigPanel - Configure hierarchy level names, colors, and area scope
// ============================================================

import React, { memo, useCallback, useState } from 'react';
import { Island } from './Island';
import type { HierarchyLevelConfig } from '../types/graph';
import type { Area } from '../types/area';
import { HIERARCHY_NODE_SIZES } from '../constants/graph';

export interface LevelConfigPanelProps {
  /** Currently active level configs (length = maxHierarchyLevels) */
  configs: HierarchyLevelConfig[];
  /** How many levels are active (1–8) */
  maxLevels: number;
  /** All areas for the area scope selector */
  areas: Area[];
  /** Called when a single level config changes */
  onUpdateConfig: (depth: number, updates: Partial<HierarchyLevelConfig>) => void;
  /** Close the panel */
  onClose: () => void;
}

export const LevelConfigPanel = memo(function LevelConfigPanel({
  configs,
  maxLevels,
  areas,
  onUpdateConfig,
  onClose,
}: LevelConfigPanelProps) {
  // Track which level's area picker is expanded
  const [expandedAreaDepth, setExpandedAreaDepth] = useState<number | null>(null);

  const activeConfigs = configs.filter((c) => c.depth < maxLevels);

  const handleNameChange = useCallback(
    (depth: number, name: string) => {
      onUpdateConfig(depth, { name });
    },
    [onUpdateConfig],
  );

  const handleColorChange = useCallback(
    (depth: number, color: string) => {
      onUpdateConfig(depth, { color });
    },
    [onUpdateConfig],
  );

  const handleAreaScopeToggle = useCallback(
    (depth: number, currentScope: 'all' | 'specific') => {
      if (currentScope === 'all') {
        onUpdateConfig(depth, { areaScope: 'specific', areaIds: [] });
      } else {
        onUpdateConfig(depth, { areaScope: 'all', areaIds: [] });
      }
    },
    [onUpdateConfig],
  );

  const handleToggleArea = useCallback(
    (depth: number, areaId: string, currentIds: readonly string[]) => {
      const ids = [...currentIds];
      const idx = ids.indexOf(areaId);
      if (idx >= 0) {
        ids.splice(idx, 1);
      } else {
        ids.push(areaId);
      }
      onUpdateConfig(depth, { areaIds: ids });
    },
    [onUpdateConfig],
  );

  return (
    <Island padding={12} style={panelStyles.container}>
      <div style={panelStyles.header}>
        <span style={panelStyles.title}>Level Configuration</span>
        <button onClick={onClose} style={panelStyles.closeBtn} title="Close">
          ✕
        </button>
      </div>

      <div style={panelStyles.list}>
        {activeConfigs.map((config) => (
          <div key={config.depth} style={panelStyles.levelRow}>
            {/* Level indicator (circle with depth-based size) */}
            <div
              style={{
                ...panelStyles.levelDot,
                width: Math.max(16, HIERARCHY_NODE_SIZES[config.depth] * 0.4),
                height: Math.max(16, HIERARCHY_NODE_SIZES[config.depth] * 0.4),
                backgroundColor: config.color,
              }}
            >
              {config.depth + 1}
            </div>

            {/* Name input */}
            <input
              type="text"
              value={config.name}
              onChange={(e) => handleNameChange(config.depth, e.target.value)}
              style={panelStyles.nameInput}
              placeholder={`Level ${config.depth + 1}`}
              title={`Name for level ${config.depth + 1}`}
            />

            {/* Color picker */}
            <div style={panelStyles.colorSection}>
              <input
                type="color"
                value={config.color}
                onChange={(e) => handleColorChange(config.depth, e.target.value)}
                style={panelStyles.colorInput}
                title={`Color for level ${config.depth + 1}`}
              />
            </div>

            {/* Area scope toggle */}
            <button
              style={{
                ...panelStyles.scopeBtn,
                ...(config.areaScope === 'specific' ? panelStyles.scopeBtnActive : {}),
              }}
              onClick={() => handleAreaScopeToggle(config.depth, config.areaScope)}
              title={
                config.areaScope === 'all'
                  ? 'Applies to all areas. Click to restrict.'
                  : `Restricted to ${config.areaIds.length} area(s). Click for all.`
              }
            >
              {config.areaScope === 'all' ? 'All' : `${config.areaIds.length} areas`}
            </button>

            {/* Expand area picker when scope is specific */}
            {config.areaScope === 'specific' && (
              <button
                style={panelStyles.expandBtn}
                onClick={() =>
                  setExpandedAreaDepth(expandedAreaDepth === config.depth ? null : config.depth)
                }
                title="Select areas"
              >
                {expandedAreaDepth === config.depth ? '▲' : '▼'}
              </button>
            )}

            {/* Area picker dropdown */}
            {config.areaScope === 'specific' && expandedAreaDepth === config.depth && (
              <div style={panelStyles.areaPicker}>
                {areas.length === 0 && (
                  <span style={panelStyles.noAreas}>No areas available</span>
                )}
                {areas.map((area) => {
                  const checked = config.areaIds.includes(area.id);
                  return (
                    <label key={area.id} style={panelStyles.areaLabel}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          handleToggleArea(config.depth, area.id, config.areaIds)
                        }
                        style={panelStyles.areaCheckbox}
                      />
                      <span style={panelStyles.areaName}>
                        {area.emoji ? `${area.emoji} ` : ''}
                        {area.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </Island>
  );
});

const panelStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '280px',
    maxHeight: '480px',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#e2e8f0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  levelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap' as const,
    padding: '4px 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  levelDot: {
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontWeight: 700,
    color: '#0f172a',
    flexShrink: 0,
  },
  nameInput: {
    flex: 1,
    minWidth: '80px',
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontSize: '11px',
    outline: 'none',
  },
  colorSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  colorInput: {
    width: '24px',
    height: '24px',
    padding: 0,
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
  scopeBtn: {
    padding: '3px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    color: '#94a3b8',
    fontSize: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  scopeBtnActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    color: '#fbbf24',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  expandBtn: {
    padding: '2px 4px',
    borderRadius: '3px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    fontSize: '10px',
    cursor: 'pointer',
  },
  areaPicker: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    padding: '4px 8px 4px 28px',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: '4px',
  },
  noAreas: {
    fontSize: '10px',
    color: '#64748b',
    fontStyle: 'italic' as const,
  },
  areaLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    color: '#cbd5e1',
  },
  areaCheckbox: {
    margin: 0,
    cursor: 'pointer',
  },
  areaName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};
