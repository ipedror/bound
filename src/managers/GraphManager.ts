// ============================================================
// GraphManager - Sync Content/Links with Cytoscape nodes/edges
// ============================================================

import type { AppState } from '../types/app';
import type { Content } from '../types/content';
import type { CytoscapeNode, CytoscapeEdge } from '../types/graph';
import { ContentStatus, LinkType } from '../types/enums';
import { NodeFactory } from '../utils/graph/nodeFactory';
import { EdgeFactory } from '../utils/graph/edgeFactory';

export interface GraphData {
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  manualLinkCount: number;
  autoLinkCount: number;
}

/**
 * GraphManager - Manages graph data building and synchronization
 */
export class GraphManager {
  /**
   * Build a graph from contents and links
   */
  static buildGraph(state: AppState, areaId?: string): GraphData {
    const contents = GraphManager.getContents(state, areaId);
    const contentIds = new Set(contents.map((c) => c.id));
    const relevantLinks = state.links.filter(
      (link) =>
        contentIds.has(link.fromContentId) && contentIds.has(link.toContentId),
    );
    const nodes = NodeFactory.createNodes(contents, undefined, relevantLinks);
    const edges = EdgeFactory.createEdges(relevantLinks);
    return { nodes, edges };
  }

  /**
   * Build a graph showing areas as nodes.
   * Edges connect areas that have at least one link between their contents.
   */
  static buildAreaGraph(state: AppState): GraphData {
    const areas = state.areas;
    const contentCounts = new Map<string, number>();
    for (const a of areas) {
      const count = state.contents.filter((c) => c.areaId === a.id).length;
      contentCounts.set(a.id, count);
    }
    const nodes = NodeFactory.createAreaNodes(areas, contentCounts);

    // Build inter-area edges: if any content in area A links to any content in area B
    const contentToArea = new Map<string, string>();
    for (const c of state.contents) {
      contentToArea.set(c.id, c.areaId);
    }

    const edgeSet = new Set<string>();
    const edges: CytoscapeEdge[] = [];
    for (const link of state.links) {
      const areaA = contentToArea.get(link.fromContentId);
      const areaB = contentToArea.get(link.toContentId);
      if (!areaA || !areaB || areaA === areaB) continue;
      const key = [areaA, areaB].sort().join('-');
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({
        data: {
          id: `area-edge:${key}`,
          source: `area:${areaA}`,
          target: `area:${areaB}`,
          linkId: `area-edge:${key}`,
          linkType: LinkType.MANUAL,
        },
      });
    }

    return { nodes, edges };
  }

  /**
   * Update area node position in state
   */
  static updateAreaNodePosition(
    state: AppState,
    areaId: string,
    x: number,
    y: number,
  ): AppState {
    const areaIndex = state.areas.findIndex((a) => a.id === areaId);
    if (areaIndex === -1) return state;
    const area = state.areas[areaIndex];
    const updated = { ...area, nodePosition: { x, y }, updatedAt: Date.now() };
    const newAreas = [...state.areas];
    newAreas[areaIndex] = updated;
    return { ...state, areas: newAreas };
  }

  /**
   * Get contents, optionally filtered by area
   */
  static getContents(state: AppState, areaId?: string): Content[] {
    return state.contents.filter((content) => {
      const isInArea = areaId ? content.areaId === areaId : true;
      return isInArea;
    });
  }

  /**
   * Get closed contents, optionally filtered by area
   * Only returns closed contents
   */
  static getClosedContents(state: AppState, areaId?: string): Content[] {
    return state.contents.filter((content) => {
      const isClosed = content.status === ContentStatus.CLOSED;
      const isInArea = areaId ? content.areaId === areaId : true;
      return isClosed && isInArea;
    });
  }

  /**
   * Get all contents (open and closed) for an area
   */
  static getContentsByAreaId(state: AppState, areaId: string): Content[] {
    return state.contents.filter((content) => content.areaId === areaId);
  }

  /**
   * Get nodes for a specific area
   */
  static getNodesByAreaId(
    state: AppState,
    areaId: string,
  ): CytoscapeNode[] {
    const contents = GraphManager.getContents(state, areaId);
    const contentIds = new Set(contents.map((c) => c.id));
    const relevantLinks = state.links.filter(
      (link) =>
        contentIds.has(link.fromContentId) && contentIds.has(link.toContentId),
    );
    return NodeFactory.createNodes(contents, undefined, relevantLinks);
  }

  /**
   * Get edges for a specific area
   */
  static getEdgesByAreaId(
    state: AppState,
    areaId: string,
  ): CytoscapeEdge[] {
    const contents = GraphManager.getContents(state, areaId);
    const contentIds = new Set(contents.map((c) => c.id));

    const relevantLinks = state.links.filter(
      (link) =>
        contentIds.has(link.fromContentId) && contentIds.has(link.toContentId),
    );

    return EdgeFactory.createEdges(relevantLinks);
  }

  /**
   * Update a node's position in the state
   * Returns a new state with the updated content
   */
  static updateNodePosition(
    state: AppState,
    contentId: string,
    x: number,
    y: number,
  ): AppState {
    const contentIndex = state.contents.findIndex((c) => c.id === contentId);
    if (contentIndex === -1) {
      return state;
    }

    const content = state.contents[contentIndex];
    const updatedContent: Content = {
      ...content,
      nodePosition: { x, y },
      updatedAt: Date.now(),
    };

    const newContents = [...state.contents];
    newContents[contentIndex] = updatedContent;

    return {
      ...state,
      contents: newContents,
    };
  }

  /**
   * Get a content by ID
   */
  static getContentById(state: AppState, contentId: string): Content | undefined {
    return state.contents.find((c) => c.id === contentId);
  }

  /**
   * Get node by content ID from a graph
   */
  static getNodeByContentId(
    graph: GraphData,
    contentId: string,
  ): CytoscapeNode | undefined {
    return graph.nodes.find((n) => n.data.id === contentId);
  }

  /**
   * Check if a content is visible in the graph (closed)
   */
  static isContentVisible(content: Content): boolean {
    return content.status === ContentStatus.CLOSED;
  }

  /**
   * Get connected content IDs for a given content
   */
  static getConnectedContentIds(
    state: AppState,
    contentId: string,
  ): string[] {
    const connectedIds = new Set<string>();

    for (const link of state.links) {
      if (link.fromContentId === contentId) {
        connectedIds.add(link.toContentId);
      }
      if (link.toContentId === contentId) {
        connectedIds.add(link.fromContentId);
      }
    }

    return Array.from(connectedIds);
  }

  /**
   * Get graph statistics
   */
  static getGraphStats(graph: GraphData, state: AppState): GraphStats {
    const manualLinkCount = state.links.filter(
      (l) => l.type === LinkType.MANUAL,
    ).length;
    const autoLinkCount = state.links.filter(
      (l) => l.type === LinkType.AUTO,
    ).length;

    return {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      manualLinkCount,
      autoLinkCount,
    };
  }
}
