// ============================================================
// useGraph - Hook for graph data in an area
// ============================================================

import { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { Content } from '../types/content';
import type { Link } from '../types/link';

export interface GraphNode {
  id: string;
  content: Content;
  incomingLinks: Link[];
  outgoingLinks: Link[];
  linkedContentIds: string[];
}

export interface UseGraphReturn {
  nodes: GraphNode[];
  links: Link[];
  nodeCount: number;
  linkCount: number;
  getNode: (contentId: string) => GraphNode | undefined;
  getLinkedNodes: (contentId: string) => GraphNode[];
}

export function useGraph(areaId: string | undefined): UseGraphReturn {
  const contents = useAppStore((state) =>
    areaId ? state.state.contents.filter((c) => c.areaId === areaId) : [],
  );

  const allLinks = useAppStore((state) => state.state.links);

  const contentIds = useMemo(
    () => new Set(contents.map((c) => c.id)),
    [contents],
  );

  // Filter links relevant to contents in this area
  const links = useMemo(
    () =>
      allLinks.filter(
        (l) => contentIds.has(l.fromContentId) && contentIds.has(l.toContentId),
      ),
    [allLinks, contentIds],
  );

  // Build graph nodes
  const nodes = useMemo<GraphNode[]>(() => {
    return contents.map((content) => {
      const incomingLinks = links.filter((l) => l.toContentId === content.id);
      const outgoingLinks = links.filter((l) => l.fromContentId === content.id);

      const linkedContentIds = [
        ...new Set([
          ...incomingLinks.map((l) => l.fromContentId),
          ...outgoingLinks.map((l) => l.toContentId),
        ]),
      ];

      return {
        id: content.id,
        content,
        incomingLinks,
        outgoingLinks,
        linkedContentIds,
      };
    });
  }, [contents, links]);

  const nodeCount = nodes.length;
  const linkCount = links.length;

  const getNode = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return (contentId: string) => nodeMap.get(contentId);
  }, [nodes]);

  const getLinkedNodes = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return (contentId: string) => {
      const node = nodeMap.get(contentId);
      if (!node) return [];
      return node.linkedContentIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is GraphNode => n !== undefined);
    };
  }, [nodes]);

  return {
    nodes,
    links,
    nodeCount,
    linkCount,
    getNode,
    getLinkedNodes,
  };
}
