// ============================================================
// GraphManager Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphManager } from './GraphManager';
import { AreaManager } from './AreaManager';
import { ContentManager } from './ContentManager';
import { LinkManager } from './LinkManager';
import { getDefaultState } from '../constants/schema';
import { ContentStatus, LinkType } from '../types/enums';
import type { AppState } from '../types/app';

describe('GraphManager', () => {
  let state: AppState;
  let areaId: string;
  let contentId1: string;
  let contentId2: string;
  let contentId3: string;

  beforeEach(() => {
    state = getDefaultState();

    // Create area
    const area = AreaManager.createArea('Test Area', state);
    areaId = area.id;
    state = { ...state, areas: [...state.areas, area] };

    // Create three contents - all closed for graph visibility
    const content1 = ContentManager.createContent(areaId, 'Content 1', state);
    contentId1 = content1.id;
    const closedContent1 = { ...content1, status: ContentStatus.CLOSED };
    state = { ...state, contents: [...state.contents, closedContent1] };

    const content2 = ContentManager.createContent(areaId, 'Content 2', state);
    contentId2 = content2.id;
    const closedContent2 = { ...content2, status: ContentStatus.CLOSED };
    state = { ...state, contents: [...state.contents, closedContent2] };

    const content3 = ContentManager.createContent(areaId, 'Content 3', state);
    contentId3 = content3.id;
    const closedContent3 = { ...content3, status: ContentStatus.CLOSED };
    state = { ...state, contents: [...state.contents, closedContent3] };
  });

  describe('buildGraph', () => {
    it('should build graph with nodes for closed contents', () => {
      const graph = GraphManager.buildGraph(state);

      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(0);

      const nodeIds = graph.nodes.map((n) => n.data.id);
      expect(nodeIds).toContain(contentId1);
      expect(nodeIds).toContain(contentId2);
      expect(nodeIds).toContain(contentId3);
    });

    it('should build graph with edges for links', () => {
      const link = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link] };

      const graph = GraphManager.buildGraph(state);

      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(1);

      const edge = graph.edges[0];
      expect(edge.data.source).toBe(contentId1);
      expect(edge.data.target).toBe(contentId2);
      expect(edge.data.linkType).toBe(LinkType.MANUAL);
    });

    it('should filter by areaId', () => {
      // Create another area with content
      const area2 = AreaManager.createArea('Area 2', state);
      state = { ...state, areas: [...state.areas, area2] };

      const otherContent = ContentManager.createContent(
        area2.id,
        'Other Content',
        state,
      );
      const closedOther = { ...otherContent, status: ContentStatus.CLOSED };
      state = { ...state, contents: [...state.contents, closedOther] };

      // Build graph for first area only
      const graph = GraphManager.buildGraph(state, areaId);

      expect(graph.nodes).toHaveLength(3);
      expect(graph.nodes.every((n) => n.data.areaId === areaId)).toBe(true);
    });

    it('should include both open and closed contents', () => {
      // Make content3 open
      state = {
        ...state,
        contents: state.contents.map((c) =>
          c.id === contentId3
            ? { ...c, status: ContentStatus.OPEN }
            : c,
        ),
      };

      const graph = GraphManager.buildGraph(state);

      // Should include all 3 contents (both open and closed)
      expect(graph.nodes).toHaveLength(3);
      const nodeIds = graph.nodes.map((n) => n.data.id);
      expect(nodeIds).toContain(contentId3);
    });

    it('should include edges between open and closed contents', () => {
      // Create link between content1 and content3
      const link = LinkManager.createLink(
        contentId1,
        contentId3,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link] };

      // Make content3 open
      state = {
        ...state,
        contents: state.contents.map((c) =>
          c.id === contentId3
            ? { ...c, status: ContentStatus.OPEN }
            : c,
        ),
      };

      const graph = GraphManager.buildGraph(state);

      // Edge should be included because both nodes are visible (regardless of status)
      expect(graph.edges).toHaveLength(1);
    });

    it('should preserve nodePosition in graph', () => {
      // Set node position for content1
      state = {
        ...state,
        contents: state.contents.map((c) =>
          c.id === contentId1
            ? { ...c, nodePosition: { x: 100, y: 200 } }
            : c,
        ),
      };

      const graph = GraphManager.buildGraph(state);

      const node1 = graph.nodes.find((n) => n.data.id === contentId1);
      expect(node1?.position).toEqual({ x: 100, y: 200 });
    });
  });

  describe('getClosedContents', () => {
    it('should return only closed contents', () => {
      const closed = GraphManager.getClosedContents(state);

      expect(closed).toHaveLength(3);
      closed.forEach((c) => {
        expect(c.status).toBe(ContentStatus.CLOSED);
      });
    });

    it('should filter closed contents by areaId', () => {
      // Create another area with closed content
      const area2 = AreaManager.createArea('Area 2', state);
      state = { ...state, areas: [...state.areas, area2] };

      const otherContent = ContentManager.createContent(
        area2.id,
        'Other Content',
        state,
      );
      const closedOther = { ...otherContent, status: ContentStatus.CLOSED };
      state = { ...state, contents: [...state.contents, closedOther] };

      const closed = GraphManager.getClosedContents(state, areaId);

      expect(closed).toHaveLength(3);
      closed.forEach((c) => {
        expect(c.areaId).toBe(areaId);
      });
    });
  });

  describe('updateNodePosition', () => {
    it('should update node position in state', () => {
      const newState = GraphManager.updateNodePosition(
        state,
        contentId1,
        150,
        250,
      );

      const content = newState.contents.find((c) => c.id === contentId1);
      expect(content?.nodePosition).toEqual({ x: 150, y: 250 });
    });

    it('should preserve other content properties', () => {
      const originalContent = state.contents.find((c) => c.id === contentId1);

      const newState = GraphManager.updateNodePosition(
        state,
        contentId1,
        150,
        250,
      );

      const updatedContent = newState.contents.find((c) => c.id === contentId1);
      expect(updatedContent?.title).toBe(originalContent?.title);
      expect(updatedContent?.areaId).toBe(originalContent?.areaId);
      expect(updatedContent?.status).toBe(originalContent?.status);
    });

    it('should not modify other contents', () => {
      const newState = GraphManager.updateNodePosition(
        state,
        contentId1,
        150,
        250,
      );

      const content2 = newState.contents.find((c) => c.id === contentId2);
      expect(content2?.nodePosition).toBeUndefined();
    });

    it('should return same state if content not found', () => {
      const newState = GraphManager.updateNodePosition(
        state,
        'invalid-id',
        150,
        250,
      );

      expect(newState).toBe(state);
    });
  });

  describe('getContentById', () => {
    it('should return content by id', () => {
      const content = GraphManager.getContentById(state, contentId1);

      expect(content).toBeDefined();
      expect(content?.id).toBe(contentId1);
    });

    it('should return undefined for invalid id', () => {
      const content = GraphManager.getContentById(state, 'invalid');

      expect(content).toBeUndefined();
    });
  });

  describe('getNodeByContentId', () => {
    it('should return node for content', () => {
      const graph = GraphManager.buildGraph(state);
      const node = GraphManager.getNodeByContentId(graph, contentId1);

      expect(node).toBeDefined();
      expect(node?.data.id).toBe(contentId1);
    });

    it('should return undefined for invalid content', () => {
      const graph = GraphManager.buildGraph(state);
      const node = GraphManager.getNodeByContentId(graph, 'invalid');

      expect(node).toBeUndefined();
    });
  });

  describe('isContentVisible', () => {
    it('should return true for closed visible content', () => {
      const content = state.contents.find((c) => c.id === contentId1)!;

      expect(GraphManager.isContentVisible(content)).toBe(true);
    });

    it('should return false for open content', () => {
      state = {
        ...state,
        contents: state.contents.map((c) =>
          c.id === contentId1
            ? { ...c, status: ContentStatus.OPEN }
            : c,
        ),
      };
      const content = state.contents.find((c) => c.id === contentId1)!;

      expect(GraphManager.isContentVisible(content)).toBe(false);
    });
  });

  describe('getConnectedContentIds', () => {
    it('should return connected content ids', () => {
      // Create links
      const link1 = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      const link2 = LinkManager.createLink(
        contentId3,
        contentId1,
        LinkType.MANUAL,
        { ...state, links: [link1] },
      );
      state = { ...state, links: [link1, link2] };

      const connected = GraphManager.getConnectedContentIds(state, contentId1);

      expect(connected).toContain(contentId2);
      expect(connected).toContain(contentId3);
      expect(connected).toHaveLength(2);
    });

    it('should return empty array for no connections', () => {
      const connected = GraphManager.getConnectedContentIds(state, contentId1);

      expect(connected).toEqual([]);
    });
  });

  describe('getGraphStats', () => {
    it('should return correct graph statistics', () => {
      // Create some links
      const link1 = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      const link2 = LinkManager.createLink(
        contentId2,
        contentId3,
        LinkType.AUTO,
        { ...state, links: [link1] },
        'prop-1',
      );
      state = { ...state, links: [link1, link2] };

      const graph = GraphManager.buildGraph(state);
      const stats = GraphManager.getGraphStats(graph, state);

      expect(stats.nodeCount).toBe(3);
      expect(stats.edgeCount).toBe(2);
      expect(stats.manualLinkCount).toBe(1);
      expect(stats.autoLinkCount).toBe(1);
    });

    it('should return zero counts for empty graph', () => {
      const emptyState = getDefaultState();
      const graph = GraphManager.buildGraph(emptyState);
      const stats = GraphManager.getGraphStats(graph, emptyState);

      expect(stats.nodeCount).toBe(0);
      expect(stats.edgeCount).toBe(0);
      expect(stats.manualLinkCount).toBe(0);
      expect(stats.autoLinkCount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty state', () => {
      const emptyState = getDefaultState();
      const graph = GraphManager.buildGraph(emptyState);

      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
    });

    it('should handle multiple links between different contents', () => {
      // Create multiple links forming a chain
      const link1 = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link1] };

      const link2 = LinkManager.createLink(
        contentId2,
        contentId3,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link2] };

      const graph = GraphManager.buildGraph(state);

      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(2);
    });

    it('should handle circular references', () => {
      // Create circular links: 1 -> 2 -> 3 -> 1
      const link1 = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link1] };

      const link2 = LinkManager.createLink(
        contentId2,
        contentId3,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link2] };

      const link3 = LinkManager.createLink(
        contentId3,
        contentId1,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link3] };

      const graph = GraphManager.buildGraph(state);

      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(3);
    });

    it('should handle mixed link types', () => {
      const link1 = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link1] };

      const link2 = LinkManager.createLink(
        contentId2,
        contentId3,
        LinkType.AUTO,
        state,
        'prop-1',
      );
      state = { ...state, links: [...state.links, link2] };

      const graph = GraphManager.buildGraph(state);

      expect(graph.edges).toHaveLength(2);

      const manualEdge = graph.edges.find(
        (e) => e.data.linkType === LinkType.MANUAL,
      );
      const autoEdge = graph.edges.find(
        (e) => e.data.linkType === LinkType.AUTO,
      );

      expect(manualEdge).toBeDefined();
      expect(autoEdge).toBeDefined();
    });
  });

  describe('getContentsByAreaId', () => {
    it('should return all contents (open and closed) for an area', () => {
      // Make one content open
      state = {
        ...state,
        contents: state.contents.map((c) =>
          c.id === contentId1
            ? { ...c, status: ContentStatus.OPEN }
            : c,
        ),
      };

      const contents = GraphManager.getContentsByAreaId(state, areaId);

      // Should include all 3 contents regardless of status
      expect(contents).toHaveLength(3);
      expect(contents.every((c) => c.areaId === areaId)).toBe(true);
    });

    it('should return empty array for non-existent area', () => {
      const contents = GraphManager.getContentsByAreaId(state, 'non-existent-area');

      expect(contents).toHaveLength(0);
    });
  });

  describe('getNodesByAreaId', () => {
    it('should return nodes for closed contents in area', () => {
      const nodes = GraphManager.getNodesByAreaId(state, areaId);

      expect(nodes).toHaveLength(3);
      nodes.forEach((node) => {
        expect(node.data.areaId).toBe(areaId);
      });
    });

    it('should include both open and closed contents', () => {
      // Make content1 open
      state = {
        ...state,
        contents: state.contents.map((c) =>
          c.id === contentId1
            ? { ...c, status: ContentStatus.OPEN }
            : c,
        ),
      };

      const nodes = GraphManager.getNodesByAreaId(state, areaId);

      // Should include all contents regardless of status
      expect(nodes).toHaveLength(3);
      const nodeIds = nodes.map((n) => n.data.id);
      expect(nodeIds).toContain(contentId1);
    });

    it('should return empty array for non-existent area', () => {
      const nodes = GraphManager.getNodesByAreaId(state, 'non-existent-area');

      expect(nodes).toHaveLength(0);
    });
  });

  describe('getEdgesByAreaId', () => {
    it('should return edges for links between contents in area', () => {
      const link = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link] };

      const edges = GraphManager.getEdgesByAreaId(state, areaId);

      expect(edges).toHaveLength(1);
      expect(edges[0].data.source).toBe(contentId1);
      expect(edges[0].data.target).toBe(contentId2);
    });

    it('should include edges to open contents', () => {
      const link = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link] };

      // Make content2 open
      state = {
        ...state,
        contents: state.contents.map((c) =>
          c.id === contentId2
            ? { ...c, status: ContentStatus.OPEN }
            : c,
        ),
      };

      const edges = GraphManager.getEdgesByAreaId(state, areaId);

      // Should include edge regardless of content status
      expect(edges).toHaveLength(1);
    });

    it('should return empty array for area with no links', () => {
      const edges = GraphManager.getEdgesByAreaId(state, areaId);

      expect(edges).toHaveLength(0);
    });

    it('should exclude cross-area edges', () => {
      // Create second area with content
      const area2 = AreaManager.createArea('Area 2', state);
      state = { ...state, areas: [...state.areas, area2] };

      const otherContent = ContentManager.createContent(
        area2.id,
        'Other Content',
        state,
      );
      const closedOther = { ...otherContent, status: ContentStatus.CLOSED };
      state = { ...state, contents: [...state.contents, closedOther] };

      // Create link from area1 content to area2 content
      const link = LinkManager.createLink(
        contentId1,
        closedOther.id,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link] };

      // Edges for area1 should be empty (link goes to another area)
      const edges = GraphManager.getEdgesByAreaId(state, areaId);

      expect(edges).toHaveLength(0);
    });
  });
});
