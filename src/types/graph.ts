// ============================================================
// Graph - computed from closed Contents and Links
// ============================================================

import type { LinkType } from './enums';
import type { Position } from './base';

export interface GraphNode {
  readonly id: string;
  readonly contentId: string;
  readonly position: Position;
  readonly title: string;
  readonly emoji?: string;
}

export interface GraphEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly linkId: string;
  readonly type: LinkType;
}

export interface Graph {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
}

// ============================================================
// Cytoscape.js specific types
// ============================================================

export interface CytoscapeNodeData {
  readonly id: string;
  readonly contentId: string;
  readonly areaId: string;
  readonly label: string;
  readonly emoji?: string;
  readonly title: string;
  readonly color?: string;
}

export interface CytoscapeNode {
  readonly data: CytoscapeNodeData;
  position?: Position;
  style?: Record<string, string | number>;
}

export interface CytoscapeEdgeData {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly linkId: string;
  readonly linkType: LinkType;
}

export interface CytoscapeEdge {
  readonly data: CytoscapeEdgeData;
  style?: Record<string, string | number>;
}

export type LayoutName = 'cose' | 'circle' | 'grid' | 'breadthfirst' | 'cose-bilkent';

export interface GraphViewState {
  readonly layout: LayoutName;
  readonly selectedNodeId?: string;
  readonly hoveredNodeId?: string;
  readonly zoomLevel: number;
  readonly panX: number;
  readonly panY: number;
}
