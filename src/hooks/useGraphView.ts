// ============================================================
// useGraphView - Hook for managing GraphView component state
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '../store/appStore';
import { GraphManager, type GraphData } from '../managers/GraphManager';
import { DEFAULT_GRAPH_STATE, LAYOUT_OPTIONS } from '../constants/graph';
import { LinkType } from '../types/enums';
import type { GraphViewState, LayoutName, CytoscapeNode, CytoscapeEdge } from '../types/graph';
import type { Position } from '../types/base';

export interface UseGraphViewReturn {
  // Graph data
  nodes: CytoscapeNode[];
  edges: CytoscapeEdge[];
  graphData: GraphData;
  
  // View state
  graphViewState: GraphViewState;
  selectedNodeId: string | undefined;
  hoveredNodeId: string | undefined;
  
  // Actions
  setSelectedNodeId: (nodeId: string | undefined) => void;
  setHoveredNodeId: (nodeId: string | undefined) => void;
  updateNodePosition: (nodeId: string, position: Position) => void;
  changeLayout: (layoutName: LayoutName) => void;
  zoom: (direction: 'in' | 'out') => void;
  resetView: () => void;
  fit: () => void;
  
  // Arrow connection
  isConnecting: boolean;
  connectingFrom: string | undefined;
  startConnecting: (nodeId: string) => void;
  finishConnecting: (targetNodeId: string) => void;
  cancelConnecting: () => void;
  
  // Layout options
  layoutOptions: typeof LAYOUT_OPTIONS;
  currentLayoutConfig: object;
}

/**
 * Hook for managing GraphView component state and interactions
 * @param areaId - Optional area ID to filter the graph by
 */
export function useGraphView(areaId?: string): UseGraphViewReturn {
  const { state, setState, createLink } = useAppStore(
    useShallow((s) => ({
      state: s.state,
      setState: s.setState,
      createLink: s.createLink,
    })),
  );

  // View state
  const [graphViewState, setGraphViewState] = useState<GraphViewState>(DEFAULT_GRAPH_STATE);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | undefined>();

  // Compute graph data from state
  const graphData = useMemo(() => {
    return GraphManager.buildGraph(state, areaId);
  }, [state, areaId]);

  // Update node position in the store
  const updateNodePosition = useCallback(
    (nodeId: string, position: Position) => {
      const newState = GraphManager.updateNodePosition(state, nodeId, position.x, position.y);
      setState(newState);
    },
    [state, setState],
  );

  // Change layout
  const changeLayout = useCallback((layoutName: LayoutName) => {
    setGraphViewState((prev) => ({
      ...prev,
      layout: layoutName,
    }));
  }, []);

  // Zoom in/out
  const zoom = useCallback((direction: 'in' | 'out') => {
    setGraphViewState((prev) => ({
      ...prev,
      zoomLevel: direction === 'in' 
        ? Math.min(prev.zoomLevel * 1.2, 4) 
        : Math.max(prev.zoomLevel / 1.2, 0.25),
    }));
  }, []);

  // Reset view to default
  const resetView = useCallback(() => {
    setGraphViewState(DEFAULT_GRAPH_STATE);
    setSelectedNodeId(undefined);
    setHoveredNodeId(undefined);
  }, []);

  // Fit graph to container (placeholder - actual implementation in component)
  const fit = useCallback(() => {
    setGraphViewState((prev) => ({
      ...prev,
      zoomLevel: 1,
      panX: 0,
      panY: 0,
    }));
  }, []);

  // Arrow connection state
  const isConnecting = !!graphViewState.connectingFrom;
  const connectingFrom = graphViewState.connectingFrom;

  const startConnecting = useCallback((nodeId: string) => {
    setGraphViewState((prev) => ({
      ...prev,
      connectingFrom: nodeId,
    }));
  }, []);

  const finishConnecting = useCallback((targetNodeId: string) => {
    const fromId = graphViewState.connectingFrom;
    if (!fromId || fromId === targetNodeId) {
      setGraphViewState((prev) => ({ ...prev, connectingFrom: undefined }));
      return;
    }
    
    // Create a MANUAL link between the two content nodes
    try {
      createLink(fromId, targetNodeId, LinkType.MANUAL);
    } catch {
      // Link may already exist or be invalid — silently ignore
    }
    
    setGraphViewState((prev) => ({ ...prev, connectingFrom: undefined }));
  }, [graphViewState.connectingFrom, createLink]);

  const cancelConnecting = useCallback(() => {
    setGraphViewState((prev) => ({ ...prev, connectingFrom: undefined }));
  }, []);

  // Get current layout configuration
  const currentLayoutConfig = useMemo(() => {
    return LAYOUT_OPTIONS[graphViewState.layout] || LAYOUT_OPTIONS.free;
  }, [graphViewState.layout]);

  return {
    // Graph data
    nodes: graphData.nodes,
    edges: graphData.edges,
    graphData,
    
    // View state
    graphViewState,
    selectedNodeId,
    hoveredNodeId,
    
    // Actions
    setSelectedNodeId,
    setHoveredNodeId,
    updateNodePosition,
    changeLayout,
    zoom,
    resetView,
    fit,
    
    // Arrow connection
    isConnecting,
    connectingFrom,
    startConnecting,
    finishConnecting,
    cancelConnecting,
    
    // Layout options
    layoutOptions: LAYOUT_OPTIONS,
    currentLayoutConfig,
  };
}
