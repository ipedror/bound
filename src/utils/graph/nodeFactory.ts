// ============================================================\n// NodeFactory - Creates CytoscapeNode from Content\n// ============================================================

import type { Content } from '../../types/content';
import type { Area } from '../../types/area';
import type { Link } from '../../types/link';
import type { CytoscapeNode, HierarchyLevelConfig } from '../../types/graph';
import { GRAPH_COLORS } from '../../constants/graph';

/** Minimum distance between any two node centres when auto-placing */
const SAFE_DISTANCE = 120;

/** Minimum distance from an edge line segment when auto-placing */
const EDGE_SAFE_DISTANCE = 60;

/** A line segment between two points (an edge/arrow) */
interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
}

interface CompactLabel {
  text: string;
  fontSize: number;
}

/**
 * Minimum distance from point (px,py) to a line segment (x1,y1)→(x2,y2)
 */
function distanceToSegment(px: number, py: number, seg: Segment): number {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    // Segment is a point
    const ex = px - seg.x1;
    const ey = py - seg.y1;
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((px - seg.x1) * dx + (py - seg.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = seg.x1 + t * dx;
  const projY = seg.y1 + t * dy;
  const ex = px - projX;
  const ey = py - projY;
  return Math.sqrt(ex * ex + ey * ey);
}

/**
 * Factory for creating Cytoscape nodes from Content
 */
export class NodeFactory {
  static createCompactTitleLabel(title: string): CompactLabel {
    const clean = title.trim();
    if (!clean) return { text: '', fontSize: 12 };

    const len = clean.length;
    const fontSize = len <= 16 ? 12 : len <= 28 ? 11 : len <= 40 ? 10 : 9;
    const maxCharsPerLine = fontSize >= 12 ? 11 : fontSize === 11 ? 10 : 9;
    const maxLines = 4;

    const words = clean.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    const pushCurrent = () => {
      if (current) {
        lines.push(current);
        current = '';
      }
    };

    for (const word of words) {
      // Quebra palavras muito longas para não estourar a largura
      if (word.length > maxCharsPerLine) {
        pushCurrent();
        for (let i = 0; i < word.length; i += maxCharsPerLine) {
          lines.push(word.slice(i, i + maxCharsPerLine));
          if (lines.length >= maxLines) break;
        }
        if (lines.length >= maxLines) break;
        continue;
      }

      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxCharsPerLine) {
        current = next;
      } else {
        pushCurrent();
        current = word;
      }

      if (lines.length >= maxLines) break;
    }

    pushCurrent();

    let resultLines = lines.slice(0, maxLines);
    if (lines.length > maxLines || resultLines.join(' ').length < clean.length) {
      const lastIndex = resultLines.length - 1;
      if (lastIndex >= 0) {
        const last = resultLines[lastIndex];
        const trimmedLast = last.length >= maxCharsPerLine
          ? `${last.slice(0, Math.max(1, maxCharsPerLine - 1))}…`
          : `${last}…`;
        resultLines[lastIndex] = trimmedLast;
      }
    }

    return {
      text: resultLines.join('\n'),
      fontSize,
    };
  }

  /**
   * Resolve inherited emoji/nodeColor by walking the parent chain.
   * Returns the resolved values and whether inheritance was applied.
   */
  static resolveInheritedStyle(
    content: Content,
    contentsMap: Map<string, Content>,
  ): { emoji?: string; nodeColor?: string; isInherited: boolean } {
    if (!content.inheritParentStyle || !content.parentId) {
      return { emoji: content.emoji, nodeColor: content.nodeColor, isInherited: false };
    }

    let resolvedEmoji = content.emoji;
    let resolvedColor = content.nodeColor;
    let isInherited = false;
    const visited = new Set<string>();
    let current: Content | undefined = content;

    while (current?.parentId && !visited.has(current.id)) {
      visited.add(current.id);
      const parent = contentsMap.get(current.parentId);
      if (!parent) break;

      if (!resolvedEmoji && parent.emoji) {
        resolvedEmoji = parent.emoji;
        isInherited = true;
      }
      if (!resolvedColor && parent.nodeColor) {
        resolvedColor = parent.nodeColor;
        isInherited = true;
      }

      // Stop if both resolved or parent doesn't inherit further
      if (resolvedEmoji && resolvedColor) break;
      if (!parent.inheritParentStyle) break;
      current = parent;
    }

    return { emoji: resolvedEmoji, nodeColor: resolvedColor, isInherited };
  }

  /**
   * Create a CytoscapeNode from a Content
   * @param content - The Content (should be closed)
   * @param color - Optional custom color for the node
   * @param occupiedPositions - Positions already taken (for safe spacing)
   * @param edgeSegments - Edge line segments to avoid
   * @param hierarchyDepth - The depth of this content in the hierarchy (0 = root)
   * @param levelName - Optional name of the hierarchy level
   * @param contentsMap - Map of all contents (for style inheritance resolution)
   */
  static createNode(content: Content, color?: string, occupiedPositions?: { x: number; y: number }[], edgeSegments?: Segment[], hierarchyDepth?: number, levelName?: string, contentsMap?: Map<string, Content>): CytoscapeNode {
    // Resolve inherited styles if a contentsMap is provided
    const resolved = contentsMap
      ? NodeFactory.resolveInheritedStyle(content, contentsMap)
      : { emoji: content.emoji, nodeColor: content.nodeColor, isInherited: false };

    const emoji = resolved.emoji;
    const nodeColor = resolved.nodeColor;

    const compact = NodeFactory.createCompactTitleLabel(content.title);
    const label = emoji
      ? `${emoji}\n${compact.text}`
      : compact.text;

    const emojiImage = emoji
      ? `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><text x="25" y="25" font-size="26" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`)}`
      : undefined;

    const position = content.nodePosition ?? NodeFactory.safePosition(occupiedPositions ?? [], edgeSegments);

    return {
      data: {
        id: content.id,
        contentId: content.id,
        areaId: content.areaId,
        label,
        labelFontSize: compact.fontSize,
        emoji,
        emojiImage,
        title: content.title,
        color: nodeColor ?? color ?? GRAPH_COLORS.nodeDefault,
        nodeType: 'content',
        hierarchyDepth: hierarchyDepth ?? 0,
        levelName,
        isInheritedStyle: resolved.isInherited || undefined,
        labelMaxWidth: content.labelMaxWidth,
      },
      position,
    };
  }

  /**
   * Create an area-level CytoscapeNode
   */
  static createAreaNode(area: Area, contentCount: number, occupiedPositions?: { x: number; y: number }[]): CytoscapeNode {
    const label = area.emoji
      ? `${area.emoji} ${area.name}`
      : area.name;

    const emojiImage = area.emoji
      ? `data:image/svg+xml,${encodeURIComponent(`<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"50\" height=\"50\"><text x=\"25\" y=\"25\" font-size=\"26\" text-anchor=\"middle\" dominant-baseline=\"central\">${area.emoji}</text></svg>`)}`
      : undefined;

    const position = area.nodePosition ?? NodeFactory.safePosition(occupiedPositions ?? []);

    return {
      data: {
        id: `area:${area.id}`,
        contentId: area.id,
        areaId: area.id,
        label,
        emoji: area.emoji,
        emojiImage,
        title: area.name,
        color: area.nodeColor ?? GRAPH_COLORS.nodeDefault,
        nodeType: 'area',
        contentCount,
      },
      position,
    };
  }

  /**
   * Generate a position that is far enough from all occupied positions
   * and from edge line segments (arrows between nodes).
   * Tries a spiral pattern outward from the centre of the canvas.
   */
  static safePosition(occupied: { x: number; y: number }[], edgeSegments?: Segment[]): { x: number; y: number } {
    if (occupied.length === 0) {
      return { x: 400, y: 300 };
    }

    // Find bounding centre of existing positions
    let cx = 0, cy = 0;
    for (const p of occupied) { cx += p.x; cy += p.y; }
    cx /= occupied.length;
    cy /= occupied.length;

    const segments = edgeSegments ?? [];

    // Spiral outward
    const angleStep = Math.PI / 6; // 30 degrees
    let radius = SAFE_DISTANCE;
    let angle = Math.random() * Math.PI * 2; // random start angle
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);

      // Check distance from all node centres
      const safeFromNodes = occupied.every((p) => {
        const dx = p.x - x;
        const dy = p.y - y;
        return Math.sqrt(dx * dx + dy * dy) >= SAFE_DISTANCE;
      });

      // Check distance from all edge segments
      const safeFromEdges = safeFromNodes && segments.every(
        (seg) => distanceToSegment(x, y, seg) >= EDGE_SAFE_DISTANCE,
      );

      if (safeFromEdges) return { x, y };
      angle += angleStep;
      if (angle >= Math.PI * 2) {
        angle -= Math.PI * 2;
        radius += SAFE_DISTANCE * 0.6;
      }
    }
    // Fallback: far away
    return { x: cx + radius + SAFE_DISTANCE, y: cy };
  }

  /**
   * Generate a random position for a node (legacy - prefer safePosition)
   */
  static randomPosition(): { x: number; y: number } {
    return {
      x: Math.random() * 800 + 50,
      y: Math.random() * 500 + 50,
    };
  }

  /**
   * Create multiple nodes from contents (with safe spacing, avoiding edges)
   * @param depthMap - Optional map of contentId → hierarchy depth
   * @param levelConfigs - Optional hierarchy level configs for colors and names
   */
  static createNodes(contents: Content[], color?: string, links?: Link[], depthMap?: Map<string, number>, levelConfigs?: HierarchyLevelConfig[]): CytoscapeNode[] {
    const positions: { x: number; y: number }[] = [];
    const positionMap = new Map<string, { x: number; y: number }>();
    // Build contentsMap for style inheritance resolution
    const contentsMap = new Map<string, Content>();
    for (const c of contents) {
      contentsMap.set(c.id, c);
    }
    // First pass: collect known positions
    for (const c of contents) {
      if (c.nodePosition) {
        positions.push(c.nodePosition);
        positionMap.set(c.id, c.nodePosition);
      }
    }
    // Build edge segments from known positions and links
    const buildSegments = (): Segment[] => {
      if (!links || links.length === 0) return [];
      const segs: Segment[] = [];
      for (const link of links) {
        const from = positionMap.get(link.fromContentId);
        const to = positionMap.get(link.toContentId);
        if (from && to) {
          segs.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
        }
      }
      return segs;
    };
    return contents.map((content) => {
      const segments = buildSegments();
      const depth = depthMap?.get(content.id);
      // Resolve level config color and name
      let nodeColor = color;
      let levelName: string | undefined;
      if (depth !== undefined && levelConfigs) {
        const cfg = levelConfigs.find((c) => c.depth === depth);
        if (cfg && (cfg.areaScope === 'all' || cfg.areaIds.includes(content.areaId))) {
          nodeColor = cfg.color;
          levelName = cfg.name;
        }
      }
      const node = NodeFactory.createNode(content, nodeColor, positions, segments, depth, levelName, contentsMap);
      if (node.position) {
        positions.push(node.position);
        positionMap.set(content.id, node.position);
      }
      return node;
    });
  }

  /**
   * Create area nodes (with safe spacing)
   */
  static createAreaNodes(areas: Area[], contentCounts: Map<string, number>): CytoscapeNode[] {
    const positions: { x: number; y: number }[] = [];
    for (const a of areas) {
      if (a.nodePosition) positions.push(a.nodePosition);
    }
    return areas.map((area) => {
      const node = NodeFactory.createAreaNode(area, contentCounts.get(area.id) ?? 0, positions);
      if (node.position) positions.push(node.position);
      return node;
    });
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
