// ============================================================
// useGraphView Hook Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore, resetStore } from '../store/appStore';
import { useGraphView } from './useGraphView';

describe('useGraphView', () => {
  let areaId: string;
  let contentId1: string;
  let contentId2: string;

  beforeEach(() => {
    resetStore();
    areaId = useAppStore.getState().createArea('Test Area');
    contentId1 = useAppStore.getState().createContent(areaId, 'Content 1');
    contentId2 = useAppStore.getState().createContent(areaId, 'Content 2');
    // Close contents so they appear in graph
    useAppStore.getState().closeContent(contentId1);
    useAppStore.getState().closeContent(contentId2);
  });

  describe('Initialization', () => {
    it('should return nodes for closed contents', () => {
      const { result } = renderHook(() => useGraphView());

      expect(result.current.nodes).toHaveLength(2);
      const nodeIds = result.current.nodes.map((n) => n.data.id);
      expect(nodeIds).toContain(contentId1);
      expect(nodeIds).toContain(contentId2);
    });

    it('should return empty edges initially', () => {
      const { result } = renderHook(() => useGraphView());

      expect(result.current.edges).toHaveLength(0);
    });

    it('should return default graph view state', () => {
      const { result } = renderHook(() => useGraphView());

      expect(result.current.graphViewState.layout).toBe('free');
      expect(result.current.graphViewState.zoomLevel).toBe(1);
      expect(result.current.selectedNodeId).toBeUndefined();
      expect(result.current.hoveredNodeId).toBeUndefined();
    });

    it('should filter by areaId when provided', () => {
      // Create another area
      const areaId2 = useAppStore.getState().createArea('Area 2');
      const contentId3 = useAppStore.getState().createContent(areaId2, 'Content 3');
      useAppStore.getState().closeContent(contentId3);

      const { result } = renderHook(() => useGraphView(areaId));

      // Should only show contents from first area
      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.nodes.every((n) => n.data.areaId === areaId)).toBe(true);
    });
  });

  describe('Selection', () => {
    it('should set selected node id', () => {
      const { result } = renderHook(() => useGraphView());

      act(() => {
        result.current.setSelectedNodeId(contentId1);
      });

      expect(result.current.selectedNodeId).toBe(contentId1);
    });

    it('should clear selected node id', () => {
      const { result } = renderHook(() => useGraphView());

      act(() => {
        result.current.setSelectedNodeId(contentId1);
      });

      expect(result.current.selectedNodeId).toBe(contentId1);

      act(() => {
        result.current.setSelectedNodeId(undefined);
      });

      expect(result.current.selectedNodeId).toBeUndefined();
    });

    it('should set hovered node id', () => {
      const { result } = renderHook(() => useGraphView());

      act(() => {
        result.current.setHoveredNodeId(contentId1);
      });

      expect(result.current.hoveredNodeId).toBe(contentId1);
    });
  });

  describe('Layout', () => {
    it('should change layout', () => {
      const { result } = renderHook(() => useGraphView());

      expect(result.current.graphViewState.layout).toBe('free');

      act(() => {
        result.current.changeLayout('circle');
      });

      expect(result.current.graphViewState.layout).toBe('circle');
    });

    it('should return current layout config', () => {
      const { result } = renderHook(() => useGraphView());

      expect(result.current.currentLayoutConfig).toBeDefined();
      expect((result.current.currentLayoutConfig as { name: string }).name).toBe('preset');

      act(() => {
        result.current.changeLayout('grid');
      });

      expect((result.current.currentLayoutConfig as { name: string }).name).toBe('grid');
    });

    it('should provide all layout options', () => {
      const { result } = renderHook(() => useGraphView());

      expect(result.current.layoutOptions).toBeDefined();
      expect(result.current.layoutOptions.cose).toBeDefined();
      expect(result.current.layoutOptions.circle).toBeDefined();
      expect(result.current.layoutOptions.grid).toBeDefined();
    });
  });

  describe('Zoom', () => {
    it('should zoom in', () => {
      const { result } = renderHook(() => useGraphView());

      const initialZoom = result.current.graphViewState.zoomLevel;

      act(() => {
        result.current.zoom('in');
      });

      expect(result.current.graphViewState.zoomLevel).toBeGreaterThan(initialZoom);
    });

    it('should zoom out', () => {
      const { result } = renderHook(() => useGraphView());

      const initialZoom = result.current.graphViewState.zoomLevel;

      act(() => {
        result.current.zoom('out');
      });

      expect(result.current.graphViewState.zoomLevel).toBeLessThan(initialZoom);
    });

    it('should cap zoom at max level', () => {
      const { result } = renderHook(() => useGraphView());

      // Zoom in many times
      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.zoom('in');
        }
      });

      expect(result.current.graphViewState.zoomLevel).toBeLessThanOrEqual(4);
    });

    it('should cap zoom at min level', () => {
      const { result } = renderHook(() => useGraphView());

      // Zoom out many times
      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.zoom('out');
        }
      });

      expect(result.current.graphViewState.zoomLevel).toBeGreaterThanOrEqual(0.25);
    });
  });

  describe('Reset and Fit', () => {
    it('should reset view to default state', () => {
      const { result } = renderHook(() => useGraphView());

      // Change some state
      act(() => {
        result.current.changeLayout('grid');
        result.current.zoom('in');
        result.current.setSelectedNodeId(contentId1);
        result.current.setHoveredNodeId(contentId2);
      });

      expect(result.current.graphViewState.layout).toBe('grid');
      expect(result.current.selectedNodeId).toBe(contentId1);

      // Reset
      act(() => {
        result.current.resetView();
      });

      expect(result.current.graphViewState.layout).toBe('free');
      expect(result.current.graphViewState.zoomLevel).toBe(1);
      expect(result.current.selectedNodeId).toBeUndefined();
      expect(result.current.hoveredNodeId).toBeUndefined();
    });

    it('should fit view', () => {
      const { result } = renderHook(() => useGraphView());

      // Change zoom
      act(() => {
        result.current.zoom('in');
        result.current.zoom('in');
      });

      expect(result.current.graphViewState.zoomLevel).not.toBe(1);

      // Fit
      act(() => {
        result.current.fit();
      });

      expect(result.current.graphViewState.zoomLevel).toBe(1);
      expect(result.current.graphViewState.panX).toBe(0);
      expect(result.current.graphViewState.panY).toBe(0);
    });
  });

  describe('Node Position', () => {
    it('should update node position', () => {
      const { result } = renderHook(() => useGraphView());

      act(() => {
        result.current.updateNodePosition(contentId1, { x: 100, y: 200 });
      });

      // Verify position was updated in store
      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId1);
      expect(content?.nodePosition).toEqual({ x: 100, y: 200 });
    });
  });

  describe('Graph data', () => {
    it('should return graphData object', () => {
      const { result } = renderHook(() => useGraphView());

      expect(result.current.graphData).toBeDefined();
      expect(result.current.graphData.nodes).toEqual(result.current.nodes);
      expect(result.current.graphData.edges).toEqual(result.current.edges);
    });

    it('should update when contents change', () => {
      const { result } = renderHook(() => useGraphView());

      expect(result.current.nodes).toHaveLength(2);

      // Delete content1 (removes from graph)
      act(() => {
        useAppStore.getState().deleteContent(contentId1);
      });

      // Re-render to see updated data
      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.nodes[0].data.id).toBe(contentId2);
    });
  });
});
