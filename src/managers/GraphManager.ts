// ============================================================
// GraphManager - Sync Content/Links with Cytoscape nodes/edges
// ============================================================

import type { AppState } from '../types/app';
import type { Content } from '../types/content';
import type { CytoscapeNode, CytoscapeEdge, HierarchyLevelConfig } from '../types/graph';
import { ContentStatus, LinkType } from '../types/enums';
import { MAX_HIERARCHY_DEPTH } from '../constants/graph';
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
   * Compute a map of contentId → hierarchy depth.
   * Root contents (no parentId, or parent not in set) have depth 0.
   * Children have depth = parent depth + 1, capped at MAX_HIERARCHY_DEPTH - 1.
   */
  static computeDepthMap(contents: Content[]): Map<string, number> {
    const contentMap = new Map<string, Content>();
    for (const c of contents) contentMap.set(c.id, c);

    const depthCache = new Map<string, number>();
    const visited = new Set<string>(); // cycle guard

    const getDepth = (id: string): number => {
      if (depthCache.has(id)) return depthCache.get(id)!;
      if (visited.has(id)) return 0; // cycle – treat as root
      visited.add(id);

      const content = contentMap.get(id);
      if (!content?.parentId || !contentMap.has(content.parentId)) {
        depthCache.set(id, 0);
        return 0;
      }
      const parentDepth = getDepth(content.parentId);
      const depth = Math.min(parentDepth + 1, MAX_HIERARCHY_DEPTH - 1);
      depthCache.set(id, depth);
      return depth;
    };

    for (const c of contents) getDepth(c.id);
    return depthCache;
  }

  /**
   * Build a graph from contents and links, including hierarchy depth info.
   */
  static buildGraph(state: AppState, areaId?: string, levelConfigs?: HierarchyLevelConfig[]): GraphData {
    const contents = GraphManager.getContents(state, areaId);
    const depthMap = GraphManager.computeDepthMap(contents);
    const contentIds = new Set(contents.map((c) => c.id));
    const relevantLinks = state.links.filter(
      (link) =>
        contentIds.has(link.fromContentId) && contentIds.has(link.toContentId),
    );
    const nodes = NodeFactory.createNodes(contents, undefined, relevantLinks, depthMap, levelConfigs);
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
   * Build a graph showing descendants of a specific parent content,
   * up to `maxLevels` deep (default: all levels up to MAX_HIERARCHY_DEPTH).
   * The parent itself is included as the root node (depth 0 relative).
   */
  static buildChildrenGraph(
    state: AppState,
    parentContentId: string,
    maxLevels: number = MAX_HIERARCHY_DEPTH,
    levelConfigs?: HierarchyLevelConfig[],
  ): GraphData {
    const parent = state.contents.find((c) => c.id === parentContentId);
    if (!parent) return { nodes: [], edges: [] };

    // Collect descendants BFS, up to maxLevels
    const collected: Content[] = [parent];
    const collectedIds = new Set<string>([parent.id]);
    let frontier = [parent.id];
    for (let level = 0; level < maxLevels && frontier.length > 0; level++) {
      const nextFrontier: string[] = [];
      for (const pid of frontier) {
        for (const c of state.contents) {
          if (c.parentId === pid && !collectedIds.has(c.id)) {
            collected.push(c);
            collectedIds.add(c.id);
            nextFrontier.push(c.id);
          }
        }
      }
      frontier = nextFrontier;
    }

    const depthMap = GraphManager.computeDepthMap(collected);
    // Rebase depths: the selected parent becomes depth 0
    const parentDepth = depthMap.get(parentContentId) ?? 0;
    const rebasedMap = new Map<string, number>();
    for (const [id, d] of depthMap) {
      rebasedMap.set(id, Math.max(0, d - parentDepth));
    }

    const relevantLinks = state.links.filter(
      (link) =>
        collectedIds.has(link.fromContentId) && collectedIds.has(link.toContentId),
    );
    const nodes = NodeFactory.createNodes(collected, undefined, relevantLinks, rebasedMap, levelConfigs);

    // Also include parent-child edges among collected contents
    const parentChildEdges = GraphManager.buildParentChildEdges(collected);
    const linkEdges = EdgeFactory.createEdges(relevantLinks);

    return { nodes, edges: [...linkEdges, ...parentChildEdges] };
  }

  /**
   * Build parent-child edges for the current graph.
   * Each child content produces a dashed edge pointing to its parent.
   * Only includes edges where both parent and child are in the given content set.
   */
  static buildParentChildEdges(contents: Content[]): CytoscapeEdge[] {
    const contentIds = new Set(contents.map((c) => c.id));
    const edges: CytoscapeEdge[] = [];
    for (const content of contents) {
      if (content.parentId && contentIds.has(content.parentId)) {
        edges.push({
          data: {
            id: `parent:${content.id}:${content.parentId}`,
            source: content.id,
            target: content.parentId,
            linkId: `parent:${content.id}:${content.parentId}`,
            linkType: LinkType.PARENT,
          },
        });
      }
    }
    return edges;
  }

  /**
   * Build a full graph with hierarchy info, optionally filtered to maxLevels of depth.
   * When maxLevels < MAX_HIERARCHY_DEPTH, nodes deeper than maxLevels are excluded.
   */
  static buildHierarchyGraph(
    state: AppState,
    areaId?: string,
    maxLevels: number = MAX_HIERARCHY_DEPTH,
    levelConfigs?: HierarchyLevelConfig[],
  ): GraphData {
    let contents = GraphManager.getContents(state, areaId);
    const depthMap = GraphManager.computeDepthMap(contents);

    // Filter by max depth
    if (maxLevels < MAX_HIERARCHY_DEPTH) {
      contents = contents.filter((c) => (depthMap.get(c.id) ?? 0) < maxLevels);
    }

    const contentIds = new Set(contents.map((c) => c.id));
    const relevantLinks = state.links.filter(
      (link) =>
        contentIds.has(link.fromContentId) && contentIds.has(link.toContentId),
    );
    const nodes = NodeFactory.createNodes(contents, undefined, relevantLinks, depthMap, levelConfigs);
    const linkEdges = EdgeFactory.createEdges(relevantLinks);
    const parentChildEdges = GraphManager.buildParentChildEdges(contents);
    return { nodes, edges: [...linkEdges, ...parentChildEdges] };
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
