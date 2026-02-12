// ============================================================
// EdgeFactory - Creates CytoscapeEdge from Link
// ============================================================

import type { Link } from '../../types/link';
import type { CytoscapeEdge } from '../../types/graph';

/**
 * Factory for creating Cytoscape edges from Links
 */
export class EdgeFactory {
  /**
   * Create a CytoscapeEdge from a Link
   */
  static createEdge(link: Link): CytoscapeEdge {
    return {
      data: {
        id: link.id,
        source: link.fromContentId,
        target: link.toContentId,
        linkId: link.id,
        linkType: link.type,
      },
    };
  }

  /**
   * Create multiple edges from links
   */
  static createEdges(links: Link[]): CytoscapeEdge[] {
    return links.map((link) => EdgeFactory.createEdge(link));
  }

  /**
   * Filter edges that have both endpoints in the node set
   */
  static filterValidEdges(
    edges: CytoscapeEdge[],
    nodeIds: Set<string>,
  ): CytoscapeEdge[] {
    return edges.filter(
      (edge) =>
        nodeIds.has(edge.data.source) && nodeIds.has(edge.data.target),
    );
  }

  /**
   * Get edges connected to a specific node
   */
  static getConnectedEdges(edges: CytoscapeEdge[], nodeId: string): CytoscapeEdge[] {
    return edges.filter(
      (edge) => edge.data.source === nodeId || edge.data.target === nodeId,
    );
  }

  /**
   * Get incoming edges to a node
   */
  static getIncomingEdges(edges: CytoscapeEdge[], nodeId: string): CytoscapeEdge[] {
    return edges.filter((edge) => edge.data.target === nodeId);
  }

  /**
   * Get outgoing edges from a node
   */
  static getOutgoingEdges(edges: CytoscapeEdge[], nodeId: string): CytoscapeEdge[] {
    return edges.filter((edge) => edge.data.source === nodeId);
  }
}
