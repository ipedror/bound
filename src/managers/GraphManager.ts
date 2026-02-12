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
   * @param state - The application state
   * @param areaId - Optional area ID to filter by
   */
  static buildGraph(state: AppState, areaId?: string): GraphData {
    // Get all contents (both open and closed)
    const contents = GraphManager.getContents(state, areaId);
    const contentIds = new Set(contents.map((c) => c.id));

    // Create nodes from contents
    const nodes = NodeFactory.createNodes(contents);

    // Get links between contents
    const relevantLinks = state.links.filter(
      (link) =>
        contentIds.has(link.fromContentId) && contentIds.has(link.toContentId),
    );

    // Create edges from links
    const edges = EdgeFactory.createEdges(relevantLinks);

    return { nodes, edges };
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
    return NodeFactory.createNodes(contents);
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
