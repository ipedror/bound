// ============================================================
// NodeFactory - Creates CytoscapeNode from Content
// ============================================================

import type { Content } from '../../types/content';
import type { CytoscapeNode } from '../../types/graph';
import { GRAPH_COLORS } from '../../constants/graph';

/**
 * Factory for creating Cytoscape nodes from Content
 */
export class NodeFactory {
  /**
   * Create a CytoscapeNode from a Content
   * @param content - The Content (should be closed)
   * @param color - Optional custom color for the node
   */
  static createNode(content: Content, color?: string): CytoscapeNode {
    const label = content.emoji
      ? `${content.emoji} ${content.title}`
      : content.title;

    return {
      data: {
        id: content.id,
        contentId: content.id,
        areaId: content.areaId,
        label,
        emoji: content.emoji,
        title: content.title,
        color: color ?? GRAPH_COLORS.nodeDefault,
      },
      position: content.nodePosition ?? NodeFactory.randomPosition(),
    };
  }

  /**
   * Generate a random position for a node
   */
  static randomPosition(): { x: number; y: number } {
    return {
      x: Math.random() * 800 + 50,
      y: Math.random() * 500 + 50,
    };
  }

  /**
   * Create multiple nodes from contents
   */
  static createNodes(contents: Content[], color?: string): CytoscapeNode[] {
    return contents.map((content) => NodeFactory.createNode(content, color));
  }

  /**
   * Update node position
   */
  static updateNodePosition(
    node: CytoscapeNode,
    position: { x: number; y: number },
  ): CytoscapeNode {
    return {
      ...node,
      position,
    };
  }

  /**
   * Update node label
   */
  static updateNodeLabel(node: CytoscapeNode, title: string, emoji?: string): CytoscapeNode {
    const label = emoji ? `${emoji} ${title}` : title;
    return {
      ...node,
      data: {
        ...node.data,
        label,
        title,
        emoji,
      },
    };
  }
}
