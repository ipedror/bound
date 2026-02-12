// ============================================================
// Graph Constants - Cytoscape styles, layouts, defaults
// ============================================================

import type { GraphViewState, LayoutName } from '../types/graph';

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
      'border-color': GRAPH_COLORS.nodeBorder,
      'border-width': 2,
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 8,
      label: 'data(title)',
      color: GRAPH_COLORS.text,
      'font-size': 12,
      'font-family': 'Arial, sans-serif',
      width: 50,
      height: 50,
      shape: 'ellipse',
      'text-wrap': 'ellipsis',
      'text-max-width': '100px',
      'z-index': 10,
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
      'border-width': 4,
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
  // Per-edge custom color
  {
    selector: 'edge[color]',
    style: {
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      'source-arrow-color': 'data(color)',
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
  // Edge selected state
  {
    selector: 'edge:selected',
    style: {
      'line-color': GRAPH_COLORS.edgeSelected,
      'target-arrow-color': GRAPH_COLORS.edgeSelected,
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
      'border-width': 3,
      'border-style': 'double',
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
