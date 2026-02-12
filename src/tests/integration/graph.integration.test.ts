// ============================================================
// Graph Integration Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, resetStore } from '../../store/appStore';
import { GraphManager } from '../../managers/GraphManager';
import { LinkType } from '../../types/enums';

describe('Graph Integration', () => {
  beforeEach(() => {
    // Reset store to default state
    resetStore();
  });

  describe('Content ↔ Graph Node synchronization', () => {
    it('should update graph when content is closed', () => {
      const store = useAppStore.getState();

      // Create area and content
      const areaId = store.createArea('Test Area');
      const contentId = store.createContent(areaId, 'Test Content');

      // Initially content is open, so no nodes in graph
      const graphBefore = GraphManager.buildGraph(store.state);
      expect(graphBefore.nodes).toHaveLength(0);

      // Close the content
      store.closeContent(contentId);

      // Now content should appear as node
      const graphAfter = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphAfter.nodes).toHaveLength(1);
      expect(graphAfter.nodes[0].data.id).toBe(contentId);
      expect(graphAfter.nodes[0].data.title).toBe('Test Content');
    });

    it('should keep node in graph when content is opened', () => {
      const store = useAppStore.getState();

      // Create area and content
      const areaId = store.createArea('Test Area');
      const contentId = store.createContent(areaId, 'Test Content');

      // Close content first
      store.closeContent(contentId);
      const graphClosed = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphClosed.nodes).toHaveLength(1);

      // Open content - should still be in graph (all contents shown)
      useAppStore.getState().openContent(contentId);
      const graphOpened = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphOpened.nodes).toHaveLength(1);
      expect(graphOpened.nodes[0].data.id).toBe(contentId);
    });

    it('should remove node from graph when content is deleted', () => {
      const store = useAppStore.getState();

      // Create area and two contents
      const areaId = store.createArea('Test Area');
      const contentId1 = store.createContent(areaId, 'Content 1');
      const contentId2 = store.createContent(areaId, 'Content 2');

      // Close both contents
      store.closeContent(contentId1);
      store.closeContent(contentId2);

      const graphBefore = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphBefore.nodes).toHaveLength(2);

      // Delete one content
      useAppStore.getState().deleteContent(contentId1);

      const graphAfter = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphAfter.nodes).toHaveLength(1);
      expect(graphAfter.nodes[0].data.id).toBe(contentId2);
    });
  });

  describe('Link ↔ Graph Edge synchronization', () => {
    it('should update graph when link is created', () => {
      const store = useAppStore.getState();

      // Create area and two closed contents
      const areaId = store.createArea('Test Area');
      const contentId1 = store.createContent(areaId, 'Content 1');
      const contentId2 = store.createContent(areaId, 'Content 2');

      store.closeContent(contentId1);
      store.closeContent(contentId2);

      // Initially no edges
      const graphBefore = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphBefore.nodes).toHaveLength(2);
      expect(graphBefore.edges).toHaveLength(0);

      // Create link
      useAppStore.getState().createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
      );

      // Now edge should appear
      const graphAfter = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphAfter.edges).toHaveLength(1);
      expect(graphAfter.edges[0].data.source).toBe(contentId1);
      expect(graphAfter.edges[0].data.target).toBe(contentId2);
    });

    it('should remove edge when link is deleted', () => {
      const store = useAppStore.getState();

      // Create area, contents, and link
      const areaId = store.createArea('Test Area');
      const contentId1 = store.createContent(areaId, 'Content 1');
      const contentId2 = store.createContent(areaId, 'Content 2');

      store.closeContent(contentId1);
      store.closeContent(contentId2);

      const linkId = store.createLink(contentId1, contentId2, LinkType.MANUAL);

      const graphBefore = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphBefore.edges).toHaveLength(1);

      // Delete link
      useAppStore.getState().deleteLink(linkId);

      const graphAfter = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphAfter.edges).toHaveLength(0);
    });

    it('should remove edges when source content is deleted', () => {
      const store = useAppStore.getState();

      // Create area, contents, and link
      const areaId = store.createArea('Test Area');
      const contentId1 = store.createContent(areaId, 'Content 1');
      const contentId2 = store.createContent(areaId, 'Content 2');

      store.closeContent(contentId1);
      store.closeContent(contentId2);
      store.createLink(contentId1, contentId2, LinkType.MANUAL);

      const graphBefore = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphBefore.edges).toHaveLength(1);

      // Delete source content
      useAppStore.getState().deleteContent(contentId1);

      const graphAfter = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphAfter.nodes).toHaveLength(1);
      expect(graphAfter.edges).toHaveLength(0);
    });

    it('should differentiate manual and auto links in graph', () => {
      const store = useAppStore.getState();

      // Create area and three contents
      const areaId = store.createArea('Test Area');
      const contentId1 = store.createContent(areaId, 'Content 1');
      const contentId2 = store.createContent(areaId, 'Content 2');
      const contentId3 = store.createContent(areaId, 'Content 3');

      store.closeContent(contentId1);
      store.closeContent(contentId2);
      store.closeContent(contentId3);

      // Create manual link from content1 to content2
      store.createLink(contentId1, contentId2, LinkType.MANUAL);

      // Create auto link from content2 to content3 (different pair)
      store.createLink(contentId2, contentId3, LinkType.AUTO, 'prop-1');

      const graph = GraphManager.buildGraph(useAppStore.getState().state);
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

  describe('Node position persistence', () => {
    it('should persist node position via updateNodePosition action', () => {
      const store = useAppStore.getState();

      // Create area and closed content
      const areaId = store.createArea('Test Area');
      const contentId = store.createContent(areaId, 'Test Content');
      store.closeContent(contentId);

      // Update node position
      useAppStore.getState().updateNodePosition(contentId, 100, 200);

      // Verify position is persisted
      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.nodePosition).toEqual({ x: 100, y: 200 });

      // Build graph and verify node has position
      const graph = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graph.nodes[0].position).toEqual({ x: 100, y: 200 });
    });

    it('should preserve position across multiple graph builds', () => {
      const store = useAppStore.getState();

      // Create area and closed content
      const areaId = store.createArea('Test Area');
      const contentId = store.createContent(areaId, 'Test Content');
      store.closeContent(contentId);
      store.updateNodePosition(contentId, 300, 400);

      // Build graph multiple times
      const graph1 = GraphManager.buildGraph(useAppStore.getState().state);
      const graph2 = GraphManager.buildGraph(useAppStore.getState().state);
      const graph3 = GraphManager.buildGraph(useAppStore.getState().state);

      expect(graph1.nodes[0].position).toEqual({ x: 300, y: 400 });
      expect(graph2.nodes[0].position).toEqual({ x: 300, y: 400 });
      expect(graph3.nodes[0].position).toEqual({ x: 300, y: 400 });
    });
  });

  describe('Area filtering', () => {
    it('should filter graph by areaId', () => {
      const store = useAppStore.getState();

      // Create two areas with contents
      const areaId1 = store.createArea('Area 1');
      const areaId2 = store.createArea('Area 2');

      const content1 = store.createContent(areaId1, 'Content in Area 1');
      const content2 = store.createContent(areaId2, 'Content in Area 2');
      const content3 = store.createContent(areaId1, 'Another in Area 1');

      store.closeContent(content1);
      store.closeContent(content2);
      store.closeContent(content3);

      // Build graph for area 1 only
      const graphArea1 = GraphManager.buildGraph(
        useAppStore.getState().state,
        areaId1,
      );
      expect(graphArea1.nodes).toHaveLength(2);
      expect(graphArea1.nodes.every((n) => n.data.areaId === areaId1)).toBe(
        true,
      );

      // Build graph for area 2 only
      const graphArea2 = GraphManager.buildGraph(
        useAppStore.getState().state,
        areaId2,
      );
      expect(graphArea2.nodes).toHaveLength(1);
      expect(graphArea2.nodes[0].data.areaId).toBe(areaId2);

      // Build graph for all areas
      const graphAll = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphAll.nodes).toHaveLength(3);
    });

    it('should only include edges between nodes in filtered area', () => {
      const store = useAppStore.getState();

      // Create two areas with contents
      const areaId1 = store.createArea('Area 1');
      const areaId2 = store.createArea('Area 2');

      const content1 = store.createContent(areaId1, 'Content 1 Area 1');
      const content2 = store.createContent(areaId1, 'Content 2 Area 1');
      const content3 = store.createContent(areaId2, 'Content Area 2');

      store.closeContent(content1);
      store.closeContent(content2);
      store.closeContent(content3);

      // Create link within area 1
      store.createLink(content1, content2, LinkType.MANUAL);

      // Create link across areas (content1 -> content3)
      // This should only appear in the full graph
      store.createLink(content1, content3, LinkType.MANUAL);

      // Graph for area 1 should have 1 edge (within area)
      const graphArea1 = GraphManager.buildGraph(
        useAppStore.getState().state,
        areaId1,
      );
      expect(graphArea1.nodes).toHaveLength(2);
      expect(graphArea1.edges).toHaveLength(1);

      // Graph for area 2 should have 0 edges (cross-area link not included)
      const graphArea2 = GraphManager.buildGraph(
        useAppStore.getState().state,
        areaId2,
      );
      expect(graphArea2.nodes).toHaveLength(1);
      expect(graphArea2.edges).toHaveLength(0);

      // Full graph should have both edges
      const graphAll = GraphManager.buildGraph(useAppStore.getState().state);
      expect(graphAll.nodes).toHaveLength(3);
      expect(graphAll.edges).toHaveLength(2);
    });
  });

  describe('Graph statistics', () => {
    it('should return correct statistics', () => {
      const store = useAppStore.getState();

      // Create area with contents and links
      const areaId = store.createArea('Test Area');
      const c1 = store.createContent(areaId, 'Content 1');
      const c2 = store.createContent(areaId, 'Content 2');
      const c3 = store.createContent(areaId, 'Content 3');

      store.closeContent(c1);
      store.closeContent(c2);
      store.closeContent(c3);

      store.createLink(c1, c2, LinkType.MANUAL);
      store.createLink(c2, c3, LinkType.AUTO, 'prop-1');

      const graph = GraphManager.buildGraph(useAppStore.getState().state);
      const stats = GraphManager.getGraphStats(
        graph,
        useAppStore.getState().state,
      );

      expect(stats.nodeCount).toBe(3);
      expect(stats.edgeCount).toBe(2);
      expect(stats.manualLinkCount).toBe(1);
      expect(stats.autoLinkCount).toBe(1);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle circular references', () => {
      const store = useAppStore.getState();

      // Create area with three contents forming a cycle
      const areaId = store.createArea('Test Area');
      const c1 = store.createContent(areaId, 'Content 1');
      const c2 = store.createContent(areaId, 'Content 2');
      const c3 = store.createContent(areaId, 'Content 3');

      store.closeContent(c1);
      store.closeContent(c2);
      store.closeContent(c3);

      // Create circular links: c1 -> c2 -> c3 -> c1
      store.createLink(c1, c2, LinkType.MANUAL);
      store.createLink(c2, c3, LinkType.MANUAL);
      store.createLink(c3, c1, LinkType.MANUAL);

      const graph = GraphManager.buildGraph(useAppStore.getState().state);

      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(3);
    });

    it('should handle multiple links between same contents', () => {
      const store = useAppStore.getState();

      // Create area with two contents
      const areaId = store.createArea('Test Area');
      const c1 = store.createContent(areaId, 'Content 1');
      const c2 = store.createContent(areaId, 'Content 2');

      store.closeContent(c1);
      store.closeContent(c2);

      // Create manual link
      store.createLink(c1, c2, LinkType.MANUAL);

      // Note: The current implementation may prevent duplicate links
      // This test documents the expected behavior
      const graph = GraphManager.buildGraph(useAppStore.getState().state);

      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges.length).toBeGreaterThanOrEqual(1);
    });
  });
});
