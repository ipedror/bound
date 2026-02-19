// ============================================================
// Graph Constants - Cytoscape styles, layouts, defaults
// ============================================================

import type { GraphViewState, LayoutName, HierarchyLevelConfig } from '../types/graph';

/**
 * Default graph view state
 */
export const DEFAULT_GRAPH_STATE: GraphViewState = {
  layout: 'free',
  selectedNodeId: undefined,
  hoveredNodeId: undefined,
  zoomLevel: 1,
  panX: 0,
  panY: 0,
  connectingFrom: undefined,
};

/**
 * Graph colors - dark mode palette
 */
export const GRAPH_COLORS = {
  background: '#0d0d1a',
  nodeDefault: '#38bdf8',
  nodeSelected: '#3a86ff',
  nodeBorder: '#00d4ff',
  nodeBorderSelected: '#ffbe0b',
  edgeManual: '#8338ec',
  edgeAuto: '#06ffa5',
  edgeParent: '#f59e0b',
  edgeSelected: '#ffbe0b',
  text: '#f1f1f1',
} as const;

/**
 * Cytoscape stylesheet
 */
export const CYTOSCAPE_STYLE = [
  // Node base style
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'border-width': 0,
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 8,
      label: 'data(label)',
      color: GRAPH_COLORS.text,
      'font-size': 12,
      'font-family': 'Arial, sans-serif',
      width: 50,
      height: 50,
      shape: 'ellipse',
      'text-wrap': 'wrap',
      'text-max-width': '100px',
      'z-index': 10,
    },
  },
  {
    selector: 'node[nodeType = "content"]',
    style: {
      'font-size': 'data(labelFontSize)',
      'text-wrap': 'wrap',
      'text-max-width': '92px',
    },
  },
  // Node with emoji - show emoji inside via background-image SVG
  {
    selector: 'node[emojiImage]',
    style: {
      'background-image': 'data(emojiImage)',
      'background-fit': 'contain',
      'background-clip': 'node',
      'background-image-opacity': 1,
    },
  },
  // Node hover state
  {
    selector: 'node:active',
    style: {
      'overlay-opacity': 0.2,
      'overlay-color': GRAPH_COLORS.nodeBorder,
    },
  },
  // Node selected state
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': GRAPH_COLORS.nodeBorderSelected,
      'background-color': GRAPH_COLORS.nodeSelected,
    },
  },
  // Edge base style (manual links)
  {
    selector: 'edge',
    style: {
      'line-color': GRAPH_COLORS.edgeManual,
      'target-arrow-color': GRAPH_COLORS.edgeManual,
      'target-arrow-shape': 'triangle',
      'source-arrow-shape': 'none',
      width: 2,
      opacity: 0.8,
      'curve-style': 'bezier',
    },
  },
  // Per-edge line style: dashed
  {
    selector: 'edge[lineStyle = "dashed"]',
    style: {
      'line-style': 'dashed',
    },
  },
  // Per-edge arrow mode: both ends
  {
    selector: 'edge[arrowMode = "both"]',
    style: {
      'source-arrow-shape': 'triangle',
    },
  },
  // Edge auto links (dashed green)
  {
    selector: 'edge[linkType = "auto"]',
    style: {
      'line-color': GRAPH_COLORS.edgeAuto,
      'target-arrow-color': GRAPH_COLORS.edgeAuto,
      'line-style': 'dashed',
    },
  },
  // Edge parent links (dashed amber arrow to parent)
  {
    selector: 'edge[linkType = "parent"]',
    style: {
      'line-color': GRAPH_COLORS.edgeParent,
      'target-arrow-color': GRAPH_COLORS.edgeParent,
      'target-arrow-shape': 'triangle',
      'line-style': 'dashed',
      width: 2,
      opacity: 0.7,
    },
  },
  // Per-edge custom color (after linkType rules so custom color wins)
  {
    selector: 'edge[color]',
    style: {
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      'source-arrow-color': 'data(color)',
    },
  },
  // Edge selected state
  {
    selector: 'edge:selected',
    style: {
      'line-color': GRAPH_COLORS.edgeSelected,
      'target-arrow-color': GRAPH_COLORS.edgeSelected,
      width: 3,
    },
  },
  // Custom color overrides selected state too (entire arrow stays custom color)
  {
    selector: 'edge[color]:selected',
    style: {
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      'source-arrow-color': 'data(color)',
      width: 3,
    },
  },
  // Node connecting source state (arrow tool)
  {
    selector: 'node.connecting-source',
    style: {
      'border-width': 4,
      'border-color': '#ffbe0b',
      'background-color': '#3a86ff',
      'overlay-opacity': 0.15,
      'overlay-color': '#ffbe0b',
    },
  },
  // Area node style (larger, with content count label)
  {
    selector: 'node[nodeType = \"area\"]',
    style: {
      width: 70,
      height: 70,
      'font-size': 14,
      'font-weight': 'bold',
      'border-width': 0,
      shape: 'round-rectangle',
      'text-max-width': '120px',
    },
  },
  // Frame node style (background region — below content nodes)
  {
    selector: 'node[nodeType = "frame"]',
    style: {
      shape: 'round-rectangle',
      'background-opacity': 0.12,
      'border-width': 2,
      'border-style': 'dashed',
      'border-opacity': 0.6,
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': -20,
      'font-size': 13,
      'font-weight': 'bold',
      'text-wrap': 'none',
      'z-index': 0,
      'z-index-compare': 'manual',
    },
  },
  // Hierarchy depth 0 = root (largest)
  { selector: 'node[hierarchyDepth = 0]', style: { width: 60, height: 60, 'font-size': 13 } },
  // Hierarchy depth 1
  { selector: 'node[hierarchyDepth = 1]', style: { width: 50, height: 50, 'font-size': 12 } },
  // Hierarchy depth 2
  { selector: 'node[hierarchyDepth = 2]', style: { width: 42, height: 42, 'font-size': 11 } },
  // Hierarchy depth 3
  { selector: 'node[hierarchyDepth = 3]', style: { width: 36, height: 36, 'font-size': 10 } },
  // Hierarchy depth 4
  { selector: 'node[hierarchyDepth = 4]', style: { width: 30, height: 30, 'font-size': 9 } },
  // Hierarchy depth 5
  { selector: 'node[hierarchyDepth = 5]', style: { width: 26, height: 26, 'font-size': 9 } },
  // Hierarchy depth 6
  { selector: 'node[hierarchyDepth = 6]', style: { width: 22, height: 22, 'font-size': 8 } },
  // Hierarchy depth 7
  { selector: 'node[hierarchyDepth = 7]', style: { width: 20, height: 20, 'font-size': 8 } },
  // Inherited style indicator (dotted amber border)
  {
    selector: 'node[isInheritedStyle]',
    style: {
      'border-width': 2,
      'border-color': '#fbbf24',
      'border-style': 'dotted',
      'border-opacity': 0.8,
    },
  },
];

/**
 * Layout options for each layout type
 * Using 'as const' for specific layouts with extended options
 */
export const LAYOUT_OPTIONS: Record<LayoutName, object> = {
  free: {
    name: 'preset',
    animate: false,
    padding: 30,
  },
  cose: {
    name: 'cose',
    animate: true,
    animationDuration: 500,
    nodeRepulsion: () => 8000,
    idealEdgeLength: () => 100,
    gravity: 0.25,
    numIter: 1000,
    padding: 30,
  },
  'cose-bilkent': {
    name: 'cose-bilkent',
    animate: 'end',
    animationDuration: 500,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
    gravity: 0.25,
    numIter: 2500,
    padding: 30,
  },
  circle: {
    name: 'circle',
    animate: true,
    animationDuration: 500,
    padding: 30,
  },
  grid: {
    name: 'grid',
    animate: true,
    animationDuration: 500,
    padding: 30,
    rows: undefined,
    cols: undefined,
  },
  breadthfirst: {
    name: 'breadthfirst',
    animate: true,
    animationDuration: 500,
    directed: true,
    padding: 30,
    spacingFactor: 1.5,
  },
};

/**
 * Maximum hierarchy depth (8 levels: 0..7)
 */
export const MAX_HIERARCHY_DEPTH = 8;

/**
 * Node sizes per hierarchy level (index = depth, value = diameter)
 * Level 0 (root) is largest, each subsequent level is smaller.
 */
export const HIERARCHY_NODE_SIZES = [60, 50, 42, 36, 30, 26, 22, 20];

/**
 * Default colors for each hierarchy level (0–7)
 */
export const DEFAULT_LEVEL_COLORS = [
  '#38bdf8', // sky-400 (root)
  '#818cf8', // indigo-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#fb923c', // orange-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#f87171', // red-400
];

/**
 * Default hierarchy level configurations
 */
export const DEFAULT_HIERARCHY_LEVEL_CONFIGS: HierarchyLevelConfig[] =
  Array.from({ length: MAX_HIERARCHY_DEPTH }, (_, i) => ({
    depth: i,
    name: `Level ${i + 1}`,
    color: DEFAULT_LEVEL_COLORS[i],
    areaScope: 'all' as const,
    areaIds: [],
  }));

/**
 * Graph dimensions
 */
export const GRAPH_DEFAULT_WIDTH = 960;
export const GRAPH_DEFAULT_HEIGHT = 540;

/**
 * Available layouts for UI selector
 */
export const AVAILABLE_LAYOUTS: { name: LayoutName; label: string }[] = [
  { name: 'free', label: 'Free (Manual)' },
  { name: 'cose', label: 'Force-Directed (COSE)' },
  { name: 'cose-bilkent', label: 'Force-Directed (CoSE-Bilkent)' },
  { name: 'circle', label: 'Circular' },
  { name: 'grid', label: 'Grid' },
  { name: 'breadthfirst', label: 'Hierarchical' },
];
