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

/**
 * Configuration for a single hierarchy level.
 * Defines name, node color, and which areas the level applies to.
 */
export interface HierarchyLevelConfig {
  readonly depth: number; // 0–7
  readonly name: string;
  readonly color: string;
  readonly areaScope: 'all' | 'specific';
  readonly areaIds: readonly string[];
}

export interface CytoscapeNodeData {
  readonly id: string;
  readonly contentId: string;
  readonly areaId: string;
  readonly label: string;
  readonly labelFontSize?: number;
  readonly emoji?: string;
  readonly emojiImage?: string;
  readonly title: string;
  readonly color?: string;
  /** 'area' for area-level nodes, 'content' for normal content nodes, 'frame' for frames */
  readonly nodeType?: 'area' | 'content' | 'frame';
  /** Number of contents inside an area node */
  readonly contentCount?: number;
  /** Hierarchy depth: 0 = root (no parent), 1 = child, 2 = grandchild, … up to 7 */
  readonly hierarchyDepth?: number;
  /** Name of the hierarchy level this node belongs to (from HierarchyLevelConfig) */
  readonly levelName?: string;
  /** Whether the node's emoji/color was inherited from a parent */
  readonly isInheritedStyle?: boolean;
  /** Custom max width for the label text box */
  readonly labelMaxWidth?: number;
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
  readonly color?: string;
  readonly lineStyle?: string;
  readonly arrowMode?: string;
}

export interface CytoscapeEdge {
  readonly data: CytoscapeEdgeData;
  style?: Record<string, string | number>;
}

export type LayoutName = 'free' | 'cose' | 'circle' | 'grid' | 'breadthfirst' | 'cose-bilkent';

export interface GraphViewState {
  readonly layout: LayoutName;
  readonly selectedNodeId?: string;
  readonly hoveredNodeId?: string;
  readonly zoomLevel: number;
  readonly panX: number;
  readonly panY: number;
  readonly connectingFrom?: string; // node id when drawing arrow
}

// ============================================================
// Graph Frames - Figma-style grouping regions
// ============================================================

export interface GraphFrame {
  readonly id: string;
  /** Layer mode where this frame was created */
  readonly createdInLayer?: 'contents' | 'areas' | 'children';
  /** 'area' frames group area-level nodes, 'content' frames group content nodes within an area */
  readonly level: 'area' | 'content';
  /** When level='content', the areaId this frame belongs to */
  readonly areaId?: string;
  /** When created in 'children' layer mode, the parentId whose children were displayed */
  readonly childrenParentId?: string;
  readonly title: string;
  readonly position: Position;
  readonly width: number;
  readonly height: number;
  readonly backgroundColor?: string;
  readonly borderColor?: string;
  readonly texts?: GraphFrameText[];
  readonly shapes?: GraphFrameShape[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface GraphFrameText {
  readonly id: string;
  /** Layer mode where this annotation was created */
  readonly createdInLayer?: 'contents' | 'areas' | 'children';
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly color?: string;
  readonly fontSize?: number;
  readonly fontWeight?: 'normal' | 'bold';
}

export interface GraphFrameShape {
  readonly id: string;
  /** Layer mode where this annotation was created */
  readonly createdInLayer?: 'contents' | 'areas' | 'children';
  readonly type: 'line' | 'arrow' | 'rect';
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  readonly color?: string;
  readonly strokeWidth?: number;
}
