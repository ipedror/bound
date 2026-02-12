// ============================================================
// GraphView - Interactive graph visualization using Cytoscape.js
// ============================================================

import { useRef, useEffect, useCallback, memo } from 'react';
import cytoscape, { type Core, type EventObject, type LayoutOptions } from 'cytoscape';
// @ts-expect-error - cytoscape-cose-bilkent has no type declarations
import coseBilkent from 'cytoscape-cose-bilkent';
import { useGraphView } from '../hooks/useGraphView';
import { GraphControls } from './GraphControls';
import { CYTOSCAPE_STYLE, LAYOUT_OPTIONS, GRAPH_COLORS } from '../constants/graph';
import type { LayoutName } from '../types/graph';

// Register cose-bilkent layout extension
cytoscape.use(coseBilkent);

export interface GraphViewProps {
  areaId?: string;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  width?: number | string;
  height?: number | string;
}

/**
 * GraphView - Interactive graph visualization component
 * Renders closed contents as nodes and links as edges
 */
export const GraphView = memo(function GraphView({
  areaId,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  width = '100%',
  height = 'calc(100vh - 120px)',
}: GraphViewProps) {
  const cyRef = useRef<Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    nodes,
    edges,
    graphViewState,
    selectedNodeId,
    setSelectedNodeId,
    updateNodePosition,
    changeLayout,
    resetView,
  } = useGraphView(areaId);

  // Initialize Cytoscape instance
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: CYTOSCAPE_STYLE as any,
      layout: LAYOUT_OPTIONS[graphViewState.layout] as LayoutOptions,
      wheelSensitivity: 0.1,
      boxSelectionEnabled: false,
      minZoom: 0.25,
      maxZoom: 4,
    });

    cyRef.current = cy;

    // Node click handler
    cy.on('click', 'node', (evt: EventObject) => {
      const nodeId = evt.target.id();
      setSelectedNodeId(nodeId);
      onNodeClick?.(nodeId);
    });

    // Node double-click handler
    cy.on('dblclick', 'node', (evt: EventObject) => {
      const nodeId = evt.target.id();
      onNodeDoubleClick?.(nodeId);
    });

    // Edge click handler
    cy.on('click', 'edge', (evt: EventObject) => {
      const edgeId = evt.target.id();
      onEdgeClick?.(edgeId);
    });

    // Node drag end handler - persist position
    cy.on('free', 'node', (evt: EventObject) => {
      const nodeId = evt.target.id();
      const pos = evt.target.position();
      updateNodePosition(nodeId, pos);
    });

    // Background click - deselect
    cy.on('click', (evt: EventObject) => {
      if (evt.target === cy) {
        setSelectedNodeId(undefined);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // We intentionally only run this effect when nodes/edges change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // Update layout when changed
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const layoutConfig = LAYOUT_OPTIONS[graphViewState.layout];
    const layout = cy.layout(layoutConfig as LayoutOptions);
    layout.run();
  }, [graphViewState.layout]);

  // Update selection visual
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Clear previous selection
    cy.$('node').removeClass('selected');
    
    // Apply selection
    if (selectedNodeId) {
      cy.$(`node[id="${selectedNodeId}"]`).addClass('selected');
    }
  }, [selectedNodeId]);

  // Apply zoom from state
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.zoom(graphViewState.zoomLevel);
  }, [graphViewState.zoomLevel]);

  // Fit graph to container
  const handleFit = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    
    cy.fit(undefined, 50);
  }, []);

  // Handle layout change
  const handleLayoutChange = useCallback(
    (layoutName: LayoutName) => {
      changeLayout(layoutName);
    },
    [changeLayout],
  );

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    
    cy.zoom(cy.zoom() * 1.2);
  }, []);

  const handleZoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    
    cy.zoom(cy.zoom() / 1.2);
  }, []);

  // Handle reset view
  const handleResetView = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    
    cy.fit(undefined, 50);
    resetView();
  }, [resetView]);

  return (
    <div
      className="graph-view"
      style={{
        position: 'relative',
        width,
        height,
        backgroundColor: GRAPH_COLORS.background,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        className="cytoscape-container"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      <GraphControls
        currentLayout={graphViewState.layout}
        onChangeLayout={handleLayoutChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onFit={handleFit}
      />
      
      {/* Node count indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          padding: '0.5rem 0.75rem',
          backgroundColor: 'rgba(13, 13, 26, 0.9)',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.6)',
        }}
      >
        {nodes.length} nodes · {edges.length} edges
      </div>
    </div>
  );
});
