// ============================================================
// GraphView - Excalidraw-style graph visualization with Cytoscape.js
// ============================================================

import { useRef, useEffect, useCallback, useState, useMemo, memo } from 'react';
import cytoscape, { type Core, type EventObject, type LayoutOptions, type NodeSingular } from 'cytoscape';
// @ts-expect-error - cytoscape-cose-bilkent has no type declarations
import coseBilkent from 'cytoscape-cose-bilkent';
import { useGraphView } from '../hooks/useGraphView';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { GraphControls } from './GraphControls';
import type { GraphLayerMode } from './GraphControls';
import { Island } from './Island';
import { CYTOSCAPE_STYLE, LAYOUT_OPTIONS, GRAPH_COLORS, DEFAULT_HIERARCHY_LEVEL_CONFIGS } from '../constants/graph';
import { GraphManager } from '../managers/GraphManager';
import { LevelConfigPanel } from './LevelConfigPanel';
import { FrameAnnotationsOverlay } from './FrameAnnotationsOverlay';
import type { LayoutName, GraphFrame, GraphFrameText, GraphFrameShape } from '../types/graph';
import type { CytoscapeNode } from '../types/graph';
import { LinkType, EdgeLineStyle, EdgeArrowMode } from '../types/enums';
import { generateId } from '../utils/id';
import { getTagColor } from '../utils/tagColors';

// Register cose-bilkent layout extension
cytoscape.use(coseBilkent);

export interface GraphViewProps {
  areaId?: string;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onBackgroundClick?: () => void;
  width?: number | string;
  height?: number | string;
  /** Enable the layer toggle (areas ↔ contents) — only in full graph view */
  enableLayers?: boolean;
}

type GraphTool = 'select' | 'arrow' | 'hand' | 'frame';

const NODE_COLOR_PALETTE = [
  '#38bdf8', '#3b82f6', '#8b5cf6', '#a855f7',
  '#ec4899', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#06b6d4', '#6366f1',
];

const EDGE_COLOR_PALETTE = [
  '#8338ec', '#3b82f6', '#38bdf8', '#06ffa5',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#ec4899', '#a855f7', '#14b8a6', '#94a3b8',
];

/**
 * GraphView - Excalidraw-style interactive graph visualization
 */
export const GraphView = memo(function GraphView({
  areaId,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onBackgroundClick,
  width = '100%',
  height = '100vh',
  enableLayers = false,
}: GraphViewProps) {
  const cyRef = useRef<Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<GraphTool>('select');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [nodeEmoji, setNodeEmoji] = useState('');
  const [nodeColor, setNodeColor] = useState(GRAPH_COLORS.nodeDefault);
  const [nodeLabelWidth, setNodeLabelWidth] = useState(92);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [zoomInputValue, setZoomInputValue] = useState('100');
  const [isEditingZoom, setIsEditingZoom] = useState(false);

  // Layer mode state
  const [layerMode, setLayerMode] = useState<GraphLayerMode>('contents');
  const [drillAreaId, setDrillAreaId] = useState<string | undefined>();
  // Children layer: which parent's children to show
  const [childrenParentId, setChildrenParentId] = useState<string | undefined>();
  // Toggle to show parent-child dashed edges in contents view
  const [showParentChildEdges, setShowParentChildEdges] = useState(false);
  // Max hierarchy levels to display (1–8)
  const [maxHierarchyLevels, setMaxHierarchyLevels] = useState(8);
  // Level config panel visibility
  const [showLevelConfig, setShowLevelConfig] = useState(false);

  // Tag filter state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const tagFilterRef = useRef<HTMLDivElement>(null);

  // Frame drawing state
  const [isDrawingFrame, setIsDrawingFrame] = useState(false);
  const frameStartRef = useRef<{ x: number; y: number } | null>(null);
  const [framePreviewStart, setFramePreviewStart] = useState<{ x: number; y: number } | null>(null);
  const [framePreviewCurrent, setFramePreviewCurrent] = useState<{ x: number; y: number } | null>(null);
  const [showFrameEditor, setShowFrameEditor] = useState(false);
  const [editingFrameId, setEditingFrameId] = useState<string | undefined>();
  const [frameTitle, setFrameTitle] = useState('');
  const [frameBgColor, setFrameBgColor] = useState('rgba(56, 189, 248, 0.08)');
  const [frameBorderColor, setFrameBorderColor] = useState('rgba(56, 189, 248, 0.4)');

  // Edge editor state
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>();
  const [showEdgeEditor, setShowEdgeEditor] = useState(false);
  const [edgeColor, setEdgeColor] = useState(GRAPH_COLORS.edgeManual);
  const [edgeLineStyle, setEdgeLineStyle] = useState<string>('solid');
  const [edgeArrowMode, setEdgeArrowMode] = useState<string>('forward');

  // Context menu state (right-click on empty space)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; modelX: number; modelY: number } | null>(null);
  // Create node modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'area' | 'content'>('content');
  const [createName, setCreateName] = useState('');
  const [createAreaId, setCreateAreaId] = useState<string>('');
  const [createModelPos, setCreateModelPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [overlayRefreshTick, setOverlayRefreshTick] = useState(0);

  const {
    updateContent, allContents, createLink, deleteLink, updateLink, state: appState, setState: setAppState,
    areas, addGraphFrame, updateGraphFrame, deleteGraphFrame,
    updateAreaNodePosition, hierarchyLevelConfigs, setHierarchyLevelConfigs, updateHierarchyLevelConfig,
    createArea, createContent, updateNodePosition: storeUpdateNodePosition,
    pauseUndo, resumeUndo,
  } = useAppStore(
    useShallow((s) => ({
      updateContent: s.updateContent,
      allContents: s.state.contents,
      createLink: s.createLink,
      deleteLink: s.deleteLink,
      updateLink: s.updateLink,
      state: s.state,
      setState: s.setState,
      areas: s.state.areas,
      addGraphFrame: s.addGraphFrame,
      updateGraphFrame: s.updateGraphFrame,
      deleteGraphFrame: s.deleteGraphFrame,
      updateAreaNodePosition: s.updateAreaNodePosition,
      hierarchyLevelConfigs: s.state.hierarchyLevelConfigs,
      setHierarchyLevelConfigs: s.setHierarchyLevelConfigs,
      updateHierarchyLevelConfig: s.updateHierarchyLevelConfig,
      createArea: s.createArea,
      createContent: s.createContent,
      updateNodePosition: s.updateNodePosition,
      pauseUndo: s.pauseUndo,
      resumeUndo: s.resumeUndo,
    })),
  );

  const {
    nodes,
    edges,
    graphViewState,
    selectedNodeId,
    setSelectedNodeId,
    updateNodePosition,
    changeLayout,
    resetView,
    isConnecting,
    connectingFrom,
    startConnecting,
    finishConnecting,
    cancelConnecting,
  } = useGraphView(enableLayers && layerMode === 'areas' && drillAreaId ? drillAreaId : areaId);

  // Resolve effective hierarchy level configs (stored or defaults)
  const effectiveLevelConfigs = hierarchyLevelConfigs ?? DEFAULT_HIERARCHY_LEVEL_CONFIGS;

  // Initialize configs in store if not yet present
  const initLevelConfigs = useCallback(() => {
    if (!hierarchyLevelConfigs) {
      setHierarchyLevelConfigs(DEFAULT_HIERARCHY_LEVEL_CONFIGS);
    }
  }, [hierarchyLevelConfigs, setHierarchyLevelConfigs]);

  // Compute the actual nodes/edges to display based on layer mode
  const { displayNodes, displayEdges } = (() => {
    if (!enableLayers || layerMode === 'contents') {
      if (showParentChildEdges) {
        // Use hierarchy-aware graph with depth info and level filtering
        const hGraph = GraphManager.buildHierarchyGraph(appState, areaId, maxHierarchyLevels, effectiveLevelConfigs);
        return { displayNodes: hGraph.nodes, displayEdges: hGraph.edges };
      }
      return { displayNodes: nodes, displayEdges: edges };
    }
    if (layerMode === 'children') {
      // Children layer: show only children of the selected parent
      if (childrenParentId) {
        const childGraph = GraphManager.buildChildrenGraph(appState, childrenParentId, maxHierarchyLevels, effectiveLevelConfigs);
        return { displayNodes: childGraph.nodes, displayEdges: childGraph.edges };
      }
      // No parent selected → empty graph
      return { displayNodes: [], displayEdges: [] };
    }
    // layerMode === 'areas'
    if (drillAreaId) {
      // Drilled into a specific area → show that area's contents
      return { displayNodes: nodes, displayEdges: edges };
    }
    // Layer mode, no drill → show areas as nodes
    const areaGraph = GraphManager.buildAreaGraph(appState);
    return { displayNodes: areaGraph.nodes, displayEdges: areaGraph.edges };
  })();

  // Build frame nodes for Cytoscape
  const frameLevel = (enableLayers && layerMode === 'areas' && !drillAreaId) ? 'area' : 'content';
  const frameAreaId = drillAreaId ?? areaId;
  const currentLayerMode: 'contents' | 'areas' | 'children' = enableLayers ? layerMode : 'contents';
  const resolveFrameCreatedLayer = (frame: GraphFrame): 'contents' | 'areas' | 'children' => {
    if (frame.createdInLayer) return frame.createdInLayer;
    if (frame.childrenParentId) return 'children';
    if (frame.level === 'area') return 'areas';
    return 'contents';
  };
  const graphFrames: GraphFrame[] = (appState.graphFrames ?? []).filter((f) => {
    // Strict layer isolation: a frame only appears in the layer where it was created
    if (resolveFrameCreatedLayer(f) !== currentLayerMode) return false;
    if (f.level !== frameLevel) return false;
    if (frameLevel === 'content' && (f.areaId || frameAreaId) && f.areaId !== frameAreaId) return false;
    // In children layer mode, only show frames created in that specific children context
    if (enableLayers && layerMode === 'children') {
      if (f.childrenParentId !== childrenParentId) return false;
    } else {
      // In non-children modes, hide frames that belong to a children context
      if (f.childrenParentId) return false;
    }
    return true;
  });
  const frameNodes: CytoscapeNode[] = graphFrames.map((f) => ({
    data: {
      id: `frame:${f.id}`,
      contentId: f.id,
      areaId: f.areaId ?? '',
      label: f.title,
      title: f.title,
      color: f.backgroundColor ?? 'rgba(56, 189, 248, 0.08)',
      nodeType: 'frame' as const,
    },
    position: { x: f.position.x + f.width / 2, y: f.position.y + f.height / 2 },
    style: {
      width: f.width,
      height: f.height,
      'background-color': f.backgroundColor ?? 'rgba(56, 189, 248, 0.08)',
      'border-color': f.borderColor ?? 'rgba(56, 189, 248, 0.4)',
    },
  }));

  // Compute all available tags from visible content nodes
  const allVisibleTags = useMemo(() => {
    const tagSet = new Set<string>();
    const displayNodeIds = new Set(displayNodes.map((n) => n.data.contentId));
    allContents
      .filter((c) => displayNodeIds.has(c.id))
      .forEach((c) => {
        (c.tags ?? []).forEach((t) => tagSet.add(t));
      });
    return Array.from(tagSet).sort();
  }, [allContents, displayNodes]);

  // Apply tag filter to nodes and edges
  const tagFilteredNodes = selectedTags.length > 0
    ? displayNodes.filter((node) => {
        if (node.data.nodeType === 'frame') return true;
        const content = allContents.find((c) => c.id === node.data.contentId);
        if (!content) return false;
        const contentTags = content.tags ?? [];
        return selectedTags.every((tag) => contentTags.includes(tag));
      })
    : displayNodes;

  const tagFilteredNodeIds = new Set(tagFilteredNodes.map((n) => n.data.id));
  const tagFilteredEdges = selectedTags.length > 0
    ? displayEdges.filter((e) =>
        tagFilteredNodeIds.has(e.data.source) && tagFilteredNodeIds.has(e.data.target),
      )
    : displayEdges;

  const allDisplayNodes = [...frameNodes, ...tagFilteredNodes];
  const allDisplayEdges = tagFilteredEdges;

  // Refs to avoid stale closures in Cytoscape event handlers
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const connectingFromRef = useRef(connectingFrom);
  connectingFromRef.current = connectingFrom;
  const isConnectingRef = useRef(isConnecting);
  isConnectingRef.current = isConnecting;
  const startConnectingRef = useRef(startConnecting);
  startConnectingRef.current = startConnecting;
  const finishConnectingRef = useRef(finishConnecting);
  finishConnectingRef.current = finishConnecting;
  const cancelConnectingRef = useRef(cancelConnecting);
  cancelConnectingRef.current = cancelConnecting;
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const onNodeDoubleClickRef = useRef(onNodeDoubleClick);
  onNodeDoubleClickRef.current = onNodeDoubleClick;
  const onEdgeClickRef = useRef(onEdgeClick);
  onEdgeClickRef.current = onEdgeClick;
  const onBackgroundClickRef = useRef(onBackgroundClick);
  onBackgroundClickRef.current = onBackgroundClick;
  const isSelectionModeRef = useRef(isSelectionMode);
  isSelectionModeRef.current = isSelectionMode;
  const updateNodePositionRef = useRef(updateNodePosition);
  updateNodePositionRef.current = updateNodePosition;
  const setSelectedNodeIdRef = useRef(setSelectedNodeId);
  setSelectedNodeIdRef.current = setSelectedNodeId;

  // Refs for syncing data to Cytoscape without re-creating the instance
  const nodesRef = useRef(allDisplayNodes);
  nodesRef.current = allDisplayNodes;
  const edgesRef = useRef(allDisplayEdges);
  edgesRef.current = allDisplayEdges;
  const createLinkRef = useRef(createLink);
  createLinkRef.current = createLink;
  const deleteLinkRef = useRef(deleteLink);
  deleteLinkRef.current = deleteLink;
  const updateLinkRef = useRef(updateLink);
  updateLinkRef.current = updateLink;
  const setSelectedEdgeIdRef = useRef(setSelectedEdgeId);
  setSelectedEdgeIdRef.current = setSelectedEdgeId;
  const graphFramesRef = useRef(graphFrames);
  graphFramesRef.current = graphFrames;
  const updateAreaNodePositionRef = useRef(updateAreaNodePosition);
  updateAreaNodePositionRef.current = updateAreaNodePosition;
  const updateGraphFrameRef = useRef(updateGraphFrame);
  updateGraphFrameRef.current = updateGraphFrame;
  const pauseUndoRef = useRef(pauseUndo);
  pauseUndoRef.current = pauseUndo;
  const resumeUndoRef = useRef(resumeUndo);
  resumeUndoRef.current = resumeUndo;
  // Track frame drag: which child nodes move with it
  const frameDragChildrenRef = useRef<{ id: string; offsetX: number; offsetY: number }[]>([]);
  const frameDragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const frameDragPersistAtRef = useRef(0);
  const overlayRefreshRafRef = useRef<number | null>(null);
  const requestOverlayRefresh = useCallback(() => {
    if (overlayRefreshRafRef.current !== null) return;
    overlayRefreshRafRef.current = requestAnimationFrame(() => {
      overlayRefreshRafRef.current = null;
      setOverlayRefreshTick((n) => n + 1);
    });
  }, []);
  const requestOverlayRefreshRef = useRef(requestOverlayRefresh);
  requestOverlayRefreshRef.current = requestOverlayRefresh;
  // Group drag selection state
  const groupDragAnchorIdRef = useRef<string | null>(null);
  const groupDragOffsetsRef = useRef<{ id: string; offsetX: number; offsetY: number }[]>([]);
  const isGroupDraggingRef = useRef(false);
  const layerModeRef = useRef(layerMode);
  layerModeRef.current = layerMode;
  const drillAreaIdRef = useRef(drillAreaId);
  drillAreaIdRef.current = drillAreaId;
  const enableLayersRef = useRef(enableLayers);
  enableLayersRef.current = enableLayers;
  const areaIdRef = useRef(areaId);
  areaIdRef.current = areaId;
  const childrenParentIdRef = useRef(childrenParentId);
  childrenParentIdRef.current = childrenParentId;
  const setDrillAreaIdRef = useRef(setDrillAreaId);
  setDrillAreaIdRef.current = setDrillAreaId;
  // Track drag-to-connect source and its original position
  const dragSourceRef = useRef<string | null>(null);
  const dragSourcePositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (overlayRefreshRafRef.current !== null) {
        cancelAnimationFrame(overlayRefreshRafRef.current);
        overlayRefreshRafRef.current = null;
      }
    };
  }, []);

  // Create Cytoscape instance ONCE (on mount)
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodesRef.current, ...edgesRef.current],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: CYTOSCAPE_STYLE as any,
      layout: { name: 'preset', animate: false, padding: 30 } as LayoutOptions,
      wheelSensitivity: 0.3,
      boxSelectionEnabled: true,
      minZoom: 0.1,
      maxZoom: 5,
      userPanningEnabled: true,
      userZoomingEnabled: true,
      autoungrabify: false,
    });

    cyRef.current = cy;

    // Node click handler
    cy.on('click', 'node', (evt: EventObject) => {
      const nodeId = evt.target.id() as string;
      const nodeType = evt.target.data('nodeType') as string | undefined;
      const originalEvent = (evt.originalEvent ?? evt) as MouseEvent;
      const isShift = !!originalEvent?.shiftKey;
      const isMultiSelect = isShift || (activeToolRef.current === 'select' && isSelectionModeRef.current);

      // Multi-selection in select tool (Shift+click)
      if (activeToolRef.current === 'select' && isMultiSelect) {
        if (evt.target.selected()) {
          evt.target.unselect();
        } else {
          evt.target.select();
        }
        return;
      }

      // Single selection in select tool
      if (activeToolRef.current === 'select') {
        cy.$('node').unselect();
        evt.target.select();
      }

      // Frame nodes: select for editing
      if (nodeType === 'frame') {
        const frameId = nodeId.replace('frame:', '');
        const frame = graphFramesRef.current.find((f) => f.id === frameId);
        if (frame) {
          setEditingFrameId(frame.id);
          setFrameTitle(frame.title);
          setFrameBgColor(frame.backgroundColor ?? 'rgba(56, 189, 248, 0.08)');
          setFrameBorderColor(frame.borderColor ?? 'rgba(56, 189, 248, 0.4)');
          setShowFrameEditor(true);
          setShowNodeEditor(false);
        }
        return;
      }

      // If in arrow mode — connect nodes (not for area nodes)
      if (activeToolRef.current === 'arrow' && nodeType !== 'area') {
        if (connectingFromRef.current) {
          finishConnectingRef.current(nodeId);
        } else {
          startConnectingRef.current(nodeId);
        }
        return;
      }
      
      // Area node → drill down
      if (nodeType === 'area' && enableLayersRef.current && layerModeRef.current === 'areas') {
        const realAreaId = nodeId.replace('area:', '');
        setDrillAreaIdRef.current(realAreaId);
        return;
      }

      setSelectedNodeIdRef.current(nodeId);
      onNodeClickRef.current?.(nodeId);
    });

    // Node double-click handler
    cy.on('dblclick', 'node', (evt: EventObject) => {
      const nodeId = evt.target.id();
      onNodeDoubleClickRef.current?.(nodeId);
    });

    // Edge click handler
    cy.on('click', 'edge', (evt: EventObject) => {
      const edgeId = evt.target.id();
      onEdgeClickRef.current?.(edgeId);
      setSelectedEdgeIdRef.current(edgeId);
    });

    // --- Drag-to-connect: track grab start node and position ---
    cy.on('grab', 'node', (evt: EventObject) => {
      if (activeToolRef.current === 'arrow') {
        dragSourceRef.current = evt.target.id();
        dragSourcePositionRef.current = { ...evt.target.position() };
      }

      // Group drag prep: dragging a selected node drags all selected nodes together
      if (activeToolRef.current === 'select') {
        const anchorId = evt.target.id() as string;
        const selected = cy.nodes(':selected').filter((n) => n.id() !== anchorId).toArray() as NodeSingular[];
        if (evt.target.selected() && selected.length > 0) {
          const anchorPos = evt.target.position();
          groupDragAnchorIdRef.current = anchorId;
          groupDragOffsetsRef.current = selected.map((n) => {
            const p = n.position();
            return {
              id: n.id(),
              offsetX: p.x - anchorPos.x,
              offsetY: p.y - anchorPos.y,
            };
          });
          isGroupDraggingRef.current = true;
        } else {
          groupDragAnchorIdRef.current = null;
          groupDragOffsetsRef.current = [];
          isGroupDraggingRef.current = false;
        }
      }

      // Frame grab: find child nodes inside frame bounds and track offsets
      const nodeType = evt.target.data('nodeType') as string | undefined;
      if (nodeType === 'frame' && activeToolRef.current === 'select' && !isGroupDraggingRef.current) {
        // Pause undo for the whole frame drag session (resumed on free)
        pauseUndoRef.current();
        frameDragPersistAtRef.current = 0;

        const framePos = evt.target.position();
        const fw = evt.target.width();
        const fh = evt.target.height();
        const left = framePos.x - fw / 2;
        const right = framePos.x + fw / 2;
        const top = framePos.y - fh / 2;
        const bottom = framePos.y + fh / 2;
        frameDragStartPosRef.current = { x: framePos.x, y: framePos.y };

        const children: { id: string; offsetX: number; offsetY: number }[] = [];
        cy.nodes().forEach((n) => {
          if (n.id() === evt.target.id()) return;
          if (n.data('nodeType') === 'frame') return;
          const np = n.position();
          if (np.x >= left && np.x <= right && np.y >= top && np.y <= bottom) {
            children.push({
              id: n.id(),
              offsetX: np.x - framePos.x,
              offsetY: np.y - framePos.y,
            });
          }
        });
        frameDragChildrenRef.current = children;
      }
    });

    // Frame drag: move children along (batch to prevent edge redraw interference)
    cy.on('drag', 'node[nodeType = "frame"]', (evt: EventObject) => {
      if (activeToolRef.current !== 'select') return;
      if (frameDragChildrenRef.current.length === 0) return;
      const framePos = evt.target.position();

      // Group drag move: keep selected nodes together
      if (isGroupDraggingRef.current && groupDragAnchorIdRef.current === evt.target.id()) {
        groupDragOffsetsRef.current.forEach(({ id, offsetX, offsetY }) => {
          const member = cy.$id(id);
          if (member.length) {
            member.position({ x: framePos.x + offsetX, y: framePos.y + offsetY });
          }
        });
        const anchorIsFrame = (evt.target.data('nodeType') as string | undefined) === 'frame';
        const membersIncludeFrame = groupDragOffsetsRef.current.some(({ id }) => {
          const n = cy.$id(id);
          return n.length > 0 && (n.data('nodeType') as string | undefined) === 'frame';
        });
        if (anchorIsFrame || membersIncludeFrame) {
          requestOverlayRefreshRef.current();
        }
        return;
      }

      cy.startBatch();
      frameDragChildrenRef.current.forEach(({ id, offsetX, offsetY }) => {
        const child = cy.$id(id);
        if (child.length) {
          child.position({ x: framePos.x + offsetX, y: framePos.y + offsetY });
        }
      });
      cy.endBatch();
      requestOverlayRefreshRef.current();

      // Persist during drag (throttled) to avoid stale state when switching layers immediately
      const now = Date.now();
      if (now - frameDragPersistAtRef.current < 40) return;
      frameDragPersistAtRef.current = now;

      const frameId = (evt.target.id() as string).replace('frame:', '');
      const fw = evt.target.width();
      const fh = evt.target.height();

      updateGraphFrameRef.current(frameId, {
        position: { x: framePos.x - fw / 2, y: framePos.y - fh / 2 },
      });

      frameDragChildrenRef.current.forEach(({ id }) => {
        const child = cy.getElementById(id);
        if (!child.length) return;
        const childPos = child.position();
        const childNodeType = child.data('nodeType') as string | undefined;
        if (childNodeType === 'area') {
          const realAreaId = id.replace('area:', '');
          updateAreaNodePositionRef.current(realAreaId, childPos.x, childPos.y);
        } else {
          updateNodePositionRef.current(id, childPos);
        }
      });
    });

    // Node drag end handler - persist position OR create link via drag
    cy.on('free', 'node', (evt: EventObject) => {
      const nodeId = evt.target.id();
      const pos = evt.target.position();

      // End group drag state
      if (isGroupDraggingRef.current && groupDragAnchorIdRef.current === nodeId) {
        pauseUndoRef.current();
        // Persist anchor
        const anchorType = evt.target.data('nodeType') as string | undefined;
        if (anchorType === 'frame') {
          const fw = evt.target.width();
          const fh = evt.target.height();
          updateGraphFrameRef.current(nodeId.replace('frame:', ''), {
            position: { x: pos.x - fw / 2, y: pos.y - fh / 2 },
          });
        } else if (anchorType === 'area') {
          updateAreaNodePositionRef.current(nodeId.replace('area:', ''), pos.x, pos.y);
        } else {
          updateNodePositionRef.current(nodeId, pos);
        }
        // Persist members
        groupDragOffsetsRef.current.forEach(({ id }) => {
          const member = cy.getElementById(id);
          if (!member.length) return;
          const mp = member.position();
          const memberType = member.data('nodeType') as string | undefined;
          if (memberType === 'frame') {
            const fw = member.width();
            const fh = member.height();
            updateGraphFrameRef.current(id.replace('frame:', ''), {
              position: { x: mp.x - fw / 2, y: mp.y - fh / 2 },
            });
          } else if (memberType === 'area') {
            updateAreaNodePositionRef.current(id.replace('area:', ''), mp.x, mp.y);
          } else {
            updateNodePositionRef.current(id, mp);
          }
        });
        resumeUndoRef.current();
        groupDragAnchorIdRef.current = null;
        groupDragOffsetsRef.current = [];
        isGroupDraggingRef.current = false;
        return;
      }

      // Check if this was a drag-to-connect in arrow mode
      if (activeToolRef.current === 'arrow' && dragSourceRef.current) {
        // Find node under the drop position
        const rendered = evt.target.renderedPosition();
        const targetNode = cy.nodes().filter((n) => {
          if (n.id() === dragSourceRef.current) return false;
          const nPos = n.renderedPosition();
          const nW = n.renderedWidth();
          const nH = n.renderedHeight();
          const dx = rendered.x - nPos.x;
          const dy = rendered.y - nPos.y;
          return Math.abs(dx) <= nW / 2 && Math.abs(dy) <= nH / 2;
        });

        if (targetNode.length > 0) {
          const sourceId = dragSourceRef.current;
          const targetId = targetNode[0].id();
          if (sourceId !== targetId) {
            try {
              createLinkRef.current(sourceId, targetId, LinkType.MANUAL);
            } catch {
              // Link may already exist — ignore
            }
          }
          // Snap source node back to its original position
          if (dragSourcePositionRef.current) {
            evt.target.position(dragSourcePositionRef.current);
          }
        }
        dragSourceRef.current = null;
        dragSourcePositionRef.current = null;
        return;
      }

      dragSourceRef.current = null;
      dragSourcePositionRef.current = null;

      const nodeType = evt.target.data('nodeType') as string | undefined;

      // Frame nodes → persist frame position + persist children positions
      if (nodeType === 'frame') {
        const frameId = nodeId.replace('frame:', '');
        const fw = evt.target.width();
        const fh = evt.target.height();
        updateGraphFrameRef.current(frameId, {
          position: { x: pos.x - fw / 2, y: pos.y - fh / 2 },
        });
        // Persist child node positions that moved with the frame
        frameDragChildrenRef.current.forEach(({ id }) => {
          const child = cy.getElementById(id);
          if (child.length) {
            const childPos = child.position();
            const childNodeType = child.data('nodeType') as string | undefined;
            if (childNodeType === 'area') {
              const realAreaId = id.replace('area:', '');
              updateAreaNodePositionRef.current(realAreaId, childPos.x, childPos.y);
            } else {
              updateNodePositionRef.current(id, childPos);
            }
          }
        });
        resumeUndoRef.current();
        frameDragChildrenRef.current = [];
        frameDragStartPosRef.current = null;
        frameDragPersistAtRef.current = 0;
        return;
      }

      // Area node → save area position
      if (nodeType === 'area') {
        const realAreaId = nodeId.replace('area:', '');
        updateAreaNodePositionRef.current(realAreaId, pos.x, pos.y);
        return;
      }

      updateNodePositionRef.current(nodeId, pos);
    });

    // Background click - deselect / cancel connecting
    cy.on('click', (evt: EventObject) => {
      if (evt.target === cy) {
        setSelectedNodeIdRef.current(undefined);
        cy.$('node').unselect();
        setSelectedEdgeIdRef.current(undefined);
        setShowNodeEditor(false);
        setShowEdgeEditor(false);
        setContextMenu(null);
        onBackgroundClickRef.current?.();
        if (isConnectingRef.current) {
          cancelConnectingRef.current();
        }
      }
    });

    // Right-click on background - show context menu
    cy.on('cxttap', (evt: EventObject) => {
      if (evt.target === cy) {
        const renderedPos = evt.renderedPosition ?? evt.position;
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        // Convert rendered position to model position
        const pan = cy.pan();
        const zoom = cy.zoom();
        const modelX = (renderedPos.x - pan.x) / zoom;
        const modelY = (renderedPos.y - pan.y) / zoom;
        setContextMenu({
          x: renderedPos.x + rect.left,
          y: renderedPos.y + rect.top,
          modelX,
          modelY,
        });
      }
    });

    // Track zoom level changes
    cy.on('zoom', () => {
      const pct = Math.round(cy.zoom() * 100);
      setZoomLevel(pct);
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shift+scroll for faster zoom
  useEffect(() => {
    const container = containerRef.current;
    const cy = cyRef.current;
    if (!container || !cy) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const rect = container.getBoundingClientRect();
      const pos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      // Zoom towards cursor
      const zoom = cy.zoom() * factor;
      const clamped = Math.max(0.1, Math.min(5, zoom));
      cy.zoom({
        level: clamped,
        renderedPosition: pos,
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Sync nodes and edges to Cytoscape incrementally (no destroy/recreate)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.startBatch();

    // --- Sync nodes ---
    const existingNodeIds = new Set<string>();
    cy.nodes().forEach((n) => { existingNodeIds.add(n.id()); });
    const newNodeIds = new Set(allDisplayNodes.map((n) => n.data.id));

    // Remove deleted nodes
    cy.nodes().forEach((n) => {
      if (!newNodeIds.has(n.id())) {
        cy.remove(n);
      }
    });

    // Add new nodes or update existing node data (preserves positions)
    allDisplayNodes.forEach((n) => {
      if (existingNodeIds.has(n.data.id)) {
        const cyNode = cy.$id(n.data.id);
        cyNode.data(n.data);
        // Update frame dimensions if changed
        if (n.data.nodeType === 'frame' && n.style) {
          cyNode.style(n.style);
        }
      } else {
        cy.add(n);
        // Apply explicit styles for frame nodes
        if (n.data.nodeType === 'frame' && n.style) {
          cy.$id(n.data.id).style(n.style);
        }
      }
    });

    // --- Sync edges ---
    const existingEdgeIds = new Set<string>();
    cy.edges().forEach((e) => { existingEdgeIds.add(e.id()); });
    const newEdgeIds = new Set(allDisplayEdges.map((e) => e.data.id));

    // Remove deleted edges
    cy.edges().forEach((e) => {
      if (!newEdgeIds.has(e.id())) {
        cy.remove(e);
      }
    });

    // Add or update edges
    allDisplayEdges.forEach((e) => {
      if (existingEdgeIds.has(e.data.id)) {
        const cyEdge = cy.$id(e.data.id);
        cyEdge.data(e.data);
      } else {
        cy.add(e);
      }
    });

    cy.endBatch();
  }, [allDisplayNodes, allDisplayEdges]);

  // Update tool behavior on cytoscape
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.boxSelectionEnabled(activeTool === 'select');

    if (activeTool === 'hand') {
      cy.autoungrabify(true);
      cy.userPanningEnabled(true);
    } else if (activeTool === 'arrow') {
      cy.autoungrabify(false);
      cy.userPanningEnabled(false);
    } else if (activeTool === 'frame') {
      cy.autoungrabify(true);
      cy.userPanningEnabled(false);
    } else {
      // select
      cy.autoungrabify(false);
      cy.userPanningEnabled(true);
    }
  }, [activeTool]);

  // Frame drawing via mousedown/mouseup on the container
  useEffect(() => {
    const container = containerRef.current;
    const cy = cyRef.current;
    if (!container || !cy) return;

    const onMouseDown = (e: MouseEvent) => {
      if (activeToolRef.current !== 'frame') return;
      const rect = container.getBoundingClientRect();
      const renderedPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const modelPos = (cy as any).renderer().projectIntoViewport(renderedPos.x, renderedPos.y);
      frameStartRef.current = { x: modelPos[0], y: modelPos[1] };
      setFramePreviewStart({ x: renderedPos.x, y: renderedPos.y });
      setFramePreviewCurrent({ x: renderedPos.x, y: renderedPos.y });
      setIsDrawingFrame(true);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (activeToolRef.current !== 'frame' || !frameStartRef.current) return;
      const rect = container.getBoundingClientRect();
      setFramePreviewCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const onMouseUp = (e: MouseEvent) => {
      if (activeToolRef.current !== 'frame' || !frameStartRef.current) return;
      const rect = container.getBoundingClientRect();
      const renderedPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const modelPos = (cy as any).renderer().projectIntoViewport(renderedPos.x, renderedPos.y);
      const endPt = { x: modelPos[0], y: modelPos[1] };

      const x = Math.min(frameStartRef.current.x, endPt.x);
      const y = Math.min(frameStartRef.current.y, endPt.y);
      const w = Math.abs(endPt.x - frameStartRef.current.x);
      const h = Math.abs(endPt.y - frameStartRef.current.y);

      if (w > 30 && h > 30) {
        const createdInLayer: 'contents' | 'areas' | 'children' =
          (enableLayersRef.current ? layerModeRef.current : 'contents');
        const level = (enableLayersRef.current && layerModeRef.current === 'areas' && !drillAreaIdRef.current) ? 'area' : 'content';
        const frame: GraphFrame = {
          id: generateId(),
          createdInLayer,
          level: level as 'area' | 'content',
          areaId: drillAreaIdRef.current ?? areaIdRef.current ?? undefined,
          childrenParentId: (enableLayersRef.current && layerModeRef.current === 'children') ? childrenParentIdRef.current : undefined,
          title: 'Frame',
          position: { x, y },
          width: w,
          height: h,
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          borderColor: 'rgba(56, 189, 248, 0.4)',
          texts: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addGraphFrame(frame);
        // Open editor for the new frame
        setEditingFrameId(frame.id);
        setFrameTitle('Frame');
        setFrameBgColor('rgba(56, 189, 248, 0.08)');
        setFrameBorderColor('rgba(56, 189, 248, 0.4)');
        setShowFrameEditor(true);
      }

      frameStartRef.current = null;
      setIsDrawingFrame(false);
      setFramePreviewStart(null);
      setFramePreviewCurrent(null);
      setActiveTool('select');
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseup', onMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addGraphFrame]);

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

    cy.$('node').removeClass('selected');
    
    if (selectedNodeId) {
      cy.$(`node[id="${selectedNodeId}"]`).addClass('selected');
    }
  }, [selectedNodeId]);

  // Sync node editor state when selectedNodeId changes
  useEffect(() => {
    if (selectedNodeId) {
      const content = allContents.find((c) => c.id === selectedNodeId);
      if (content) {
        setNodeEmoji(content.emoji ?? '');
        setNodeColor((content.nodeColor ?? GRAPH_COLORS.nodeDefault) as typeof GRAPH_COLORS.nodeDefault);
        setNodeLabelWidth(content.labelMaxWidth ?? 92);
        setShowNodeEditor(true);
      }
    } else {
      setShowNodeEditor(false);
    }
  }, [selectedNodeId, allContents]);

  // Sync edge editor state when selectedEdgeId changes
  useEffect(() => {
    if (selectedEdgeId) {
      const link = appState.links.find((l) => l.id === selectedEdgeId);
      if (link) {
        setEdgeColor((link.color ?? GRAPH_COLORS.edgeManual) as typeof GRAPH_COLORS.edgeManual);
        setEdgeLineStyle(link.lineStyle ?? 'solid');
        setEdgeArrowMode(link.arrowMode ?? 'forward');
        setShowEdgeEditor(true);
        // Deselect node when selecting edge
        setSelectedNodeId(undefined);
      }
    } else {
      setShowEdgeEditor(false);
    }
  }, [selectedEdgeId, appState.links, setSelectedNodeId]);

  // Deselect edge when selecting a node
  useEffect(() => {
    if (selectedNodeId) {
      setSelectedEdgeId(undefined);
    }
  }, [selectedNodeId]);

  // Update edge selection visual
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.$('edge').unselect();
    if (selectedEdgeId) {
      cy.$(`edge[id="${selectedEdgeId}"]`).select();
    }
  }, [selectedEdgeId]);

  // Save emoji to content
  const handleEmojiChange = useCallback((emoji: string) => {
    setNodeEmoji(emoji);
    if (selectedNodeId) {
      updateContent(selectedNodeId, { emoji: emoji || undefined });
    }
  }, [selectedNodeId, updateContent]);

  // Save nodeColor to content
  const handleColorChange = useCallback((color: string) => {
    setNodeColor(color as typeof GRAPH_COLORS.nodeDefault);
    if (selectedNodeId) {
      updateContent(selectedNodeId, { nodeColor: color });
    }
  }, [selectedNodeId, updateContent]);

  // Save label max width to content
  const handleLabelWidthChange = useCallback((width: number) => {
    setNodeLabelWidth(width);
    if (selectedNodeId) {
      // Store undefined when using default (92px) to keep data clean
      updateContent(selectedNodeId, { labelMaxWidth: width === 92 ? undefined : width });
      // Apply directly to Cytoscape for immediate visual feedback
      const cy = cyRef.current;
      if (cy) {
        const cyNode = cy.$id(selectedNodeId);
        if (cyNode.length) {
          cyNode.data('labelMaxWidth', width);
        }
      }
    }
  }, [selectedNodeId, updateContent]);

  // Edge style handlers
  const handleEdgeColorChange = useCallback((color: string) => {
    setEdgeColor(color as typeof GRAPH_COLORS.edgeManual);
    if (selectedEdgeId) {
      updateLink(selectedEdgeId, { color });
      // Apply directly to Cytoscape for immediate visual feedback on the entire edge
      const cy = cyRef.current;
      if (cy) {
        const cyEdge = cy.$id(selectedEdgeId);
        if (cyEdge.length) {
          cyEdge.style({
            'line-color': color,
            'target-arrow-color': color,
            'source-arrow-color': color,
          });
        }
      }
    }
  }, [selectedEdgeId, updateLink]);

  const handleEdgeLineStyleChange = useCallback((style: string) => {
    setEdgeLineStyle(style);
    if (selectedEdgeId) {
      updateLink(selectedEdgeId, { lineStyle: style as EdgeLineStyle });
    }
  }, [selectedEdgeId, updateLink]);

  const handleEdgeArrowModeChange = useCallback((mode: string) => {
    setEdgeArrowMode(mode);
    if (selectedEdgeId) {
      updateLink(selectedEdgeId, { arrowMode: mode as EdgeArrowMode });
    }
  }, [selectedEdgeId, updateLink]);

  const handleDeleteEdge = useCallback(() => {
    if (selectedEdgeId) {
      deleteLink(selectedEdgeId);
      setSelectedEdgeId(undefined);
      setShowEdgeEditor(false);
    }
  }, [selectedEdgeId, deleteLink]);

  // Show connecting source visual
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.$('node').removeClass('connecting-source');
    
    if (connectingFrom) {
      cy.$(`node[id="${connectingFrom}"]`).addClass('connecting-source');
    }
  }, [connectingFrom]);

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
    cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);

  const handleZoomOut = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({ level: cy.zoom() / 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);

  // Handle reset view
  const handleResetView = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.fit(undefined, 50);
    resetView();
  }, [resetView]);

  // Persist current visible layout (frames + nodes) before context switches (layer/drill)
  const persistVisibleLayout = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const store = useAppStore.getState();
    const current = store.state;
    const nextAreas = [...current.areas];
    const nextContents = [...current.contents];
    const nextFrames = [...(current.graphFrames ?? [])];

    const areaIndexById = new Map(nextAreas.map((a, i) => [a.id, i]));
    const contentIndexById = new Map(nextContents.map((c, i) => [c.id, i]));
    const frameIndexById = new Map(nextFrames.map((f, i) => [f.id, i]));

    let changed = false;

    // 1) Visible frame geometry from Cytoscape
    for (const frame of graphFrames) {
      const frameNode = cy.getElementById(`frame:${frame.id}`);
      if (!frameNode || frameNode.length === 0) continue;
      const idx = frameIndexById.get(frame.id);
      if (idx === undefined) continue;

      const pos = frameNode.position();
      const width = frameNode.width();
      const height = frameNode.height();
      const nextX = pos.x - width / 2;
      const nextY = pos.y - height / 2;
      const old = nextFrames[idx];

      const moved = Math.abs(nextX - old.position.x) > 0.5 || Math.abs(nextY - old.position.y) > 0.5;
      const resized = Math.abs(width - old.width) > 0.5 || Math.abs(height - old.height) > 0.5;
      if (moved || resized) {
        nextFrames[idx] = {
          ...old,
          position: { x: nextX, y: nextY },
          width,
          height,
          updatedAt: Date.now(),
        };
        changed = true;
      }
    }

    // 2) Visible non-frame node positions
    cy.nodes().forEach((node) => {
      const nodeType = node.data('nodeType') as string | undefined;
      if (nodeType === 'frame') return;

      const pos = node.position();
      if (nodeType === 'area') {
        const realAreaId = node.id().replace('area:', '');
        const idx = areaIndexById.get(realAreaId);
        if (idx === undefined) return;
        const old = nextAreas[idx];
        if (!old.nodePosition || Math.abs(old.nodePosition.x - pos.x) > 0.5 || Math.abs(old.nodePosition.y - pos.y) > 0.5) {
          nextAreas[idx] = { ...old, nodePosition: { x: pos.x, y: pos.y }, updatedAt: Date.now() };
          changed = true;
        }
        return;
      }

      const idx = contentIndexById.get(node.id());
      if (idx === undefined) return;
      const old = nextContents[idx];
      if (!old.nodePosition || Math.abs(old.nodePosition.x - pos.x) > 0.5 || Math.abs(old.nodePosition.y - pos.y) > 0.5) {
        nextContents[idx] = { ...old, nodePosition: { x: pos.x, y: pos.y }, updatedAt: Date.now() };
        changed = true;
      }
    });

    if (!changed) return;
    setAppState({
      ...current,
      areas: nextAreas,
      contents: nextContents,
      graphFrames: nextFrames,
      updatedAt: Date.now(),
    });
  }, [graphFrames, setAppState]);

  // Layer mode change
  const handleChangeLayerMode = useCallback((mode: GraphLayerMode) => {
    persistVisibleLayout();
    setLayerMode(mode);
    setDrillAreaId(undefined);
    setChildrenParentId(undefined);
    setSelectedNodeId(undefined);
    setShowNodeEditor(false);
  }, [setSelectedNodeId, persistVisibleLayout]);

  // Back to area view from drill-down
  const handleBackToAreas = useCallback(() => {
    persistVisibleLayout();
    setDrillAreaId(undefined);
    setSelectedNodeId(undefined);
    setShowNodeEditor(false);
  }, [setSelectedNodeId, persistVisibleLayout]);

  // Frame editor handlers
  const handleSaveFrame = useCallback(() => {
    if (editingFrameId) {
      updateGraphFrame(editingFrameId, {
        title: frameTitle,
        backgroundColor: frameBgColor,
        borderColor: frameBorderColor,
      });
    }
    setShowFrameEditor(false);
    setEditingFrameId(undefined);
  }, [editingFrameId, frameTitle, frameBgColor, frameBorderColor, updateGraphFrame]);

  const handleDeleteFrame = useCallback(() => {
    if (editingFrameId) {
      deleteGraphFrame(editingFrameId);
    }
    setShowFrameEditor(false);
    setEditingFrameId(undefined);
  }, [editingFrameId, deleteGraphFrame]);

  // Frame alignment: get content nodes inside a frame
  const getNodesInFrame = useCallback((frameId: string) => {
    const cy = cyRef.current;
    if (!cy) return [];
    const frameNode = cy.getElementById(`frame:${frameId}`);
    if (!frameNode || frameNode.length === 0) return [];
    const fp = frameNode.position();
    const fw = frameNode.width();
    const fh = frameNode.height();
    const left = fp.x - fw / 2;
    const right = fp.x + fw / 2;
    const top = fp.y - fh / 2;
    const bottom = fp.y + fh / 2;
    const inside: { id: string; contentId: string; x: number; y: number }[] = [];
    cy.nodes().forEach((n) => {
      if (n.data('nodeType') === 'frame') return;
      const p = n.position();
      if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) {
        inside.push({ id: n.id(), contentId: n.data('contentId'), x: p.x, y: p.y });
      }
    });
    return inside;
  }, []);

  const handleAlignCenterH = useCallback(() => {
    if (!editingFrameId) return;
    const cy = cyRef.current;
    if (!cy) return;
    const frameNode = cy.getElementById(`frame:${editingFrameId}`);
    if (!frameNode || frameNode.length === 0) return;
    const centerX = frameNode.position().x;
    const nodes = getNodesInFrame(editingFrameId);
    nodes.forEach((n) => {
      const cyNode = cy.$id(n.id);
      cyNode.position({ x: centerX, y: n.y });
      if (n.contentId) storeUpdateNodePosition(n.contentId, centerX, n.y);
    });
  }, [editingFrameId, getNodesInFrame, storeUpdateNodePosition]);

  const handleAlignCenterV = useCallback(() => {
    if (!editingFrameId) return;
    const cy = cyRef.current;
    if (!cy) return;
    const frameNode = cy.getElementById(`frame:${editingFrameId}`);
    if (!frameNode || frameNode.length === 0) return;
    const centerY = frameNode.position().y;
    const nodes = getNodesInFrame(editingFrameId);
    nodes.forEach((n) => {
      const cyNode = cy.$id(n.id);
      cyNode.position({ x: n.x, y: centerY });
      if (n.contentId) storeUpdateNodePosition(n.contentId, n.x, centerY);
    });
  }, [editingFrameId, getNodesInFrame, storeUpdateNodePosition]);

  const handleDistributeH = useCallback(() => {
    if (!editingFrameId) return;
    const cy = cyRef.current;
    if (!cy) return;
    const frameNode = cy.getElementById(`frame:${editingFrameId}`);
    if (!frameNode || frameNode.length === 0) return;
    const fw = frameNode.width();
    const left = frameNode.position().x - fw / 2;
    const nodes = getNodesInFrame(editingFrameId);
    if (nodes.length < 2) return;
    nodes.sort((a, b) => a.x - b.x);
    const padding = 30;
    const spacing = (fw - padding * 2) / (nodes.length - 1);
    nodes.forEach((n, i) => {
      const newX = left + padding + i * spacing;
      const cyNode = cy.$id(n.id);
      cyNode.position({ x: newX, y: n.y });
      if (n.contentId) storeUpdateNodePosition(n.contentId, newX, n.y);
    });
  }, [editingFrameId, getNodesInFrame, storeUpdateNodePosition]);

  const handleDistributeV = useCallback(() => {
    if (!editingFrameId) return;
    const cy = cyRef.current;
    if (!cy) return;
    const frameNode = cy.getElementById(`frame:${editingFrameId}`);
    if (!frameNode || frameNode.length === 0) return;
    const fh = frameNode.height();
    const top = frameNode.position().y - fh / 2;
    const nodes = getNodesInFrame(editingFrameId);
    if (nodes.length < 2) return;
    nodes.sort((a, b) => a.y - b.y);
    const padding = 30;
    const spacing = (fh - padding * 2) / (nodes.length - 1);
    nodes.forEach((n, i) => {
      const newY = top + padding + i * spacing;
      const cyNode = cy.$id(n.id);
      cyNode.position({ x: n.x, y: newY });
      if (n.contentId) storeUpdateNodePosition(n.contentId, n.x, newY);
    });
  }, [editingFrameId, getNodesInFrame, storeUpdateNodePosition]);

  // Frame annotation handlers
  const handleAddFrameText = useCallback(() => {
    if (!editingFrameId) return;
    const frame = graphFrames.find((f) => f.id === editingFrameId);
    if (!frame) return;
    const createdInLayer = frame.createdInLayer ?? currentLayerMode;
    const newText: GraphFrameText = {
      id: generateId(),
      createdInLayer,
      text: 'Text',
      x: frame.width / 2 - 20,
      y: frame.height / 2,
      color: '#e2e8f0',
      fontSize: 14,
    };
    const existing = frame.texts ?? [];
    updateGraphFrame(editingFrameId, { texts: [...existing, newText] });
  }, [editingFrameId, graphFrames, updateGraphFrame, currentLayerMode]);

  const handleAddFrameShape = useCallback((type: 'line' | 'arrow' | 'rect') => {
    if (!editingFrameId) return;
    const frame = graphFrames.find((f) => f.id === editingFrameId);
    if (!frame) return;
    const cx = frame.width / 2;
    const cy = frame.height / 2;
    const createdInLayer = frame.createdInLayer ?? currentLayerMode;
    const newShape: GraphFrameShape = {
      id: generateId(),
      createdInLayer,
      type,
      startX: cx - 40,
      startY: cy - (type === 'rect' ? 20 : 0),
      endX: cx + 40,
      endY: cy + (type === 'rect' ? 20 : 0),
      color: '#94a3b8',
      strokeWidth: 2,
    };
    const existing = frame.shapes ?? [];
    updateGraphFrame(editingFrameId, { shapes: [...existing, newShape] });
  }, [editingFrameId, graphFrames, updateGraphFrame, currentLayerMode]);

  const handleUpdateFrameText = useCallback((frameId: string, textId: string, updates: Partial<GraphFrameText>) => {
    const frame = graphFrames.find((f) => f.id === frameId);
    if (!frame) return;
    const texts = (frame.texts ?? []).map((t) => t.id === textId ? { ...t, ...updates } : t);
    updateGraphFrame(frameId, { texts });
  }, [graphFrames, updateGraphFrame]);

  const handleDeleteFrameText = useCallback((frameId: string, textId: string) => {
    const frame = graphFrames.find((f) => f.id === frameId);
    if (!frame) return;
    const texts = (frame.texts ?? []).filter((t) => t.id !== textId);
    updateGraphFrame(frameId, { texts });
  }, [graphFrames, updateGraphFrame]);

  const handleUpdateFrameShape = useCallback((frameId: string, shapeId: string, updates: Partial<GraphFrameShape>) => {
    const frame = graphFrames.find((f) => f.id === frameId);
    if (!frame) return;
    const shapes = (frame.shapes ?? []).map((s) => s.id === shapeId ? { ...s, ...updates } : s);
    updateGraphFrame(frameId, { shapes });
  }, [graphFrames, updateGraphFrame]);

  const handleDeleteFrameShape = useCallback((frameId: string, shapeId: string) => {
    const frame = graphFrames.find((f) => f.id === frameId);
    if (!frame) return;
    const shapes = (frame.shapes ?? []).filter((s) => s.id !== shapeId);
    updateGraphFrame(frameId, { shapes });
  }, [graphFrames, updateGraphFrame]);

  const handleAddFrameAnnotationText = useCallback((frameId: string, text: GraphFrameText) => {
    const frame = graphFrames.find((f) => f.id === frameId);
    if (!frame) return;
    const textWithLayer: GraphFrameText = {
      ...text,
      createdInLayer: text.createdInLayer ?? frame.createdInLayer ?? currentLayerMode,
    };
    updateGraphFrame(frameId, { texts: [...(frame.texts ?? []), textWithLayer] });
  }, [graphFrames, updateGraphFrame, currentLayerMode]);

  const handleAddFrameAnnotationShape = useCallback((frameId: string, shape: GraphFrameShape) => {
    const frame = graphFrames.find((f) => f.id === frameId);
    if (!frame) return;
    const shapeWithLayer: GraphFrameShape = {
      ...shape,
      createdInLayer: shape.createdInLayer ?? frame.createdInLayer ?? currentLayerMode,
    };
    updateGraphFrame(frameId, { shapes: [...(frame.shapes ?? []), shapeWithLayer] });
  }, [graphFrames, updateGraphFrame, currentLayerMode]);

  // Escape key to cancel connecting or switch to select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isConnecting) {
          cancelConnecting();
        }
        if (showFrameEditor) {
          setShowFrameEditor(false);
          setEditingFrameId(undefined);
        }
        if (showEdgeEditor) {
          setSelectedEdgeId(undefined);
          setShowEdgeEditor(false);
        }
        setActiveTool('select');
      }
      // Delete key to remove selected edge
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdgeId && !showNodeEditor) {
        handleDeleteEdge();
      }
      // Keyboard shortcuts for tools
      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'a' || e.key === 'A') setActiveTool('arrow');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if (e.key === 'f' || e.key === 'F') setActiveTool('frame');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnecting, cancelConnecting, showFrameEditor, showEdgeEditor, selectedEdgeId, showNodeEditor, handleDeleteEdge]);

  // Context menu: open create modal
  const handleContextMenuCreate = useCallback((mode: 'area' | 'content') => {
    if (!contextMenu) return;
    setCreateMode(mode);
    setCreateName('');
    setCreateAreaId(areaId || '');
    setCreateModelPos({ x: contextMenu.modelX, y: contextMenu.modelY });
    setShowCreateModal(true);
    setContextMenu(null);
  }, [contextMenu, areaId]);

  // Handle creating area or content from modal
  const handleCreateFromModal = useCallback(() => {
    if (!createName.trim()) return;
    if (createMode === 'area') {
      const areaId = createArea(createName.trim());
      // Set area node position to where user right-clicked
      updateAreaNodePosition(areaId, createModelPos.x, createModelPos.y);
    } else {
      const contentId = createContent(createAreaId, createName.trim());
      // Set content node position to where user right-clicked
      storeUpdateNodePosition(contentId, createModelPos.x, createModelPos.y);
    }
    setShowCreateModal(false);
    setCreateName('');
  }, [createName, createMode, createAreaId, createModelPos, createArea, createContent, updateAreaNodePosition, storeUpdateNodePosition]);

  // Close context menu on click anywhere
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Cursor based on tool
  const getCursor = () => {
    if (activeTool === 'hand') return 'grab';
    if (activeTool === 'arrow') return isConnecting ? 'crosshair' : 'cell';
    if (activeTool === 'frame') return 'crosshair';
    return 'default';
  };

  return (
    <div
      className="graph-view"
      style={{
        position: 'relative',
        width,
        height,
        backgroundColor: GRAPH_COLORS.background,
        overflow: 'hidden',
        cursor: getCursor(),
      }}
    >
      {/* Cytoscape canvas */}
      <div
        ref={containerRef}
        className="cytoscape-container"
        style={{
          width: '100%',
          height: '100%',
        }}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Frame annotations overlay (texts & shapes inside frames) */}
      {graphFrames.length > 0 && (
        <FrameAnnotationsOverlay
          cyRef={cyRef}
          frames={graphFrames}
          refreshTick={overlayRefreshTick}
          onUpdateText={handleUpdateFrameText}
          onDeleteText={handleDeleteFrameText}
          onUpdateShape={handleUpdateFrameShape}
          onDeleteShape={handleDeleteFrameShape}
          onAddText={handleAddFrameAnnotationText}
          onAddShape={handleAddFrameAnnotationShape}
          onFrameClick={(frameId) => {
            const frame = graphFrames.find((f) => f.id === frameId);
            if (frame) {
              setEditingFrameId(frame.id);
              setFrameTitle(frame.title);
              setFrameBgColor(frame.backgroundColor ?? 'rgba(56, 189, 248, 0.08)');
              setFrameBorderColor(frame.borderColor ?? 'rgba(56, 189, 248, 0.4)');
              setShowFrameEditor(true);
              setShowNodeEditor(false);
            }
          }}
          onUpdateFrame={(frameId, updates) => {
            updateGraphFrame(frameId, updates);
          }}
        />
      )}

      {/* Frame drawing preview */}
      {isDrawingFrame && framePreviewStart && framePreviewCurrent && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(framePreviewStart.x, framePreviewCurrent.x),
            top: Math.min(framePreviewStart.y, framePreviewCurrent.y),
            width: Math.abs(framePreviewCurrent.x - framePreviewStart.x),
            height: Math.abs(framePreviewCurrent.y - framePreviewStart.y),
            border: '2px dashed rgba(56, 189, 248, 0.6)',
            backgroundColor: 'rgba(56, 189, 248, 0.06)',
            borderRadius: '8px',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}

      {/* Top-center: Tool toolbar (Excalidraw-style) */}
      <div style={overlayStyles.toolbarContainer}>
        <Island padding={4} style={overlayStyles.toolbar}>
          <button
            style={{
              ...overlayStyles.toolButton,
              ...(activeTool === 'select' ? overlayStyles.toolButtonActive : {}),
            }}
            onClick={() => { setActiveTool('select'); cancelConnecting(); }}
            title="Select (V)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 3l14 9-6 1-4 6z" />
            </svg>
          </button>
          <button
            style={{
              ...overlayStyles.toolButton,
              ...(isSelectionMode ? overlayStyles.toolButtonActive : {}),
            }}
            onClick={() => {
              setActiveTool('select');
              cancelConnecting();
              setIsSelectionMode((v) => !v);
            }}
            title="Selection Mode (toggle)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 2" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </button>
          <button
            style={{
              ...overlayStyles.toolButton,
              ...(activeTool === 'hand' ? overlayStyles.toolButtonActive : {}),
            }}
            onClick={() => { setActiveTool('hand'); cancelConnecting(); }}
            title="Hand / Pan (H)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-4 0v1" />
              <path d="M14 10V4a2 2 0 0 0-4 0v2" />
              <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.6-2.2L3 16.3" />
            </svg>
          </button>
          
          <div style={overlayStyles.toolDivider} />

          <button
            style={{
              ...overlayStyles.toolButton,
              ...(activeTool === 'arrow' ? overlayStyles.toolButtonActive : {}),
            }}
            onClick={() => setActiveTool('arrow')}
            title="Connect with Arrow (A)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>

          <div style={overlayStyles.toolDivider} />

          <button
            style={{
              ...overlayStyles.toolButton,
              ...(activeTool === 'frame' ? overlayStyles.toolButtonActive : {}),
            }}
            onClick={() => setActiveTool('frame')}
            title="Frame (F)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
          </button>
        </Island>
      </div>

      {/* Top-right: Controls */}
      <div style={overlayStyles.controlsContainer}>
        <GraphControls
          currentLayout={graphViewState.layout}
          onChangeLayout={handleLayoutChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          onFit={handleFit}
          layerMode={enableLayers ? layerMode : undefined}
          onChangeLayerMode={enableLayers ? handleChangeLayerMode : undefined}
          drillAreaName={drillAreaId ? areas.find(a => a.id === drillAreaId)?.name : undefined}
          onBackToAreas={drillAreaId ? handleBackToAreas : undefined}
          showParentChildEdges={showParentChildEdges}
          onToggleParentChildEdges={enableLayers ? setShowParentChildEdges : undefined}
          childrenParentId={childrenParentId}
          onChangeChildrenParent={setChildrenParentId}
          maxHierarchyLevels={maxHierarchyLevels}
          onChangeMaxHierarchyLevels={setMaxHierarchyLevels}
          onOpenLevelConfig={() => { initLevelConfigs(); setShowLevelConfig(true); }}
          parentContents={
            (areaId
              ? appState.contents.filter((c) => c.areaId === areaId)
              : appState.contents
            ).map((c) => ({
              id: c.id,
              title: c.title,
              emoji: c.emoji,
            }))
          }
        />
      </div>

      {/* Level config panel (below controls) */}
      {showLevelConfig && (
        <div style={overlayStyles.levelConfigContainer}>
          <LevelConfigPanel
            configs={effectiveLevelConfigs}
            maxLevels={maxHierarchyLevels}
            areas={areas}
            onUpdateConfig={updateHierarchyLevelConfig}
            onClose={() => setShowLevelConfig(false)}
          />
        </div>
      )}

      {/* Node editor panel (top-left) */}
      {showNodeEditor && selectedNodeId && (
        <div style={overlayStyles.nodeEditorContainer}>
          <Island padding={12} style={overlayStyles.nodeEditorIsland}>
            <h4 style={overlayStyles.nodeEditorTitle}>Node</h4>
            
            {/* Emoji input */}
            <div style={overlayStyles.nodeEditorRow}>
              <label style={overlayStyles.nodeEditorLabel}>Emoji</label>
              <input
                type="text"
                value={nodeEmoji}
                onChange={(e) => handleEmojiChange(e.target.value)}
                placeholder="🎯"
                style={overlayStyles.emojiInput}
                maxLength={4}
              />
              {nodeEmoji && (
                <button
                  style={overlayStyles.emojiClearBtn}
                  onClick={() => handleEmojiChange('')}
                  title="Clear emoji"
                >×</button>
              )}
            </div>
            <span style={overlayStyles.emojiHint}>paste your emoji</span>

            {/* Color picker */}
            <div style={overlayStyles.nodeEditorRow}>
              <label style={overlayStyles.nodeEditorLabel}>Color</label>
            </div>
            <div style={overlayStyles.colorGrid}>
              {NODE_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  style={{
                    ...overlayStyles.colorSwatch,
                    backgroundColor: c,
                    ...(nodeColor === c ? overlayStyles.colorSwatchActive : {}),
                  }}
                  onClick={() => handleColorChange(c)}
                  title={c}
                />
              ))}
            </div>
            <div style={overlayStyles.nodeEditorRow}>
              <input
                type="color"
                value={nodeColor}
                onChange={(e) => handleColorChange(e.target.value)}
                style={overlayStyles.colorInput}
              />
              <span style={overlayStyles.colorHex}>{nodeColor}</span>
            </div>

            {/* Label width slider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px', paddingTop: '8px' }}>
              <div style={overlayStyles.nodeEditorRow}>
                <label style={overlayStyles.nodeEditorLabel}>Width</label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{nodeLabelWidth}px</span>
              </div>
              <input
                type="range"
                min={50}
                max={200}
                step={2}
                value={nodeLabelWidth}
                onChange={(e) => handleLabelWidthChange(parseInt(e.target.value, 10))}
                style={overlayStyles.widthSlider}
              />
            </div>
          </Island>
        </div>
      )}

      {/* Edge editor panel (top-left) */}
      {showEdgeEditor && selectedEdgeId && (
        <div style={overlayStyles.nodeEditorContainer}>
          <Island padding={12} style={overlayStyles.nodeEditorIsland}>
            <h4 style={overlayStyles.nodeEditorTitle}>Edge</h4>

            {/* Color */}
            <div style={overlayStyles.nodeEditorRow}>
              <label style={overlayStyles.nodeEditorLabel}>Color</label>
            </div>
            <div style={overlayStyles.colorGrid}>
              {EDGE_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  style={{
                    ...overlayStyles.colorSwatch,
                    backgroundColor: c,
                    ...(edgeColor === c ? overlayStyles.colorSwatchActive : {}),
                  }}
                  onClick={() => handleEdgeColorChange(c)}
                  title={c}
                />
              ))}
            </div>
            <div style={overlayStyles.nodeEditorRow}>
              <input
                type="color"
                value={edgeColor}
                onChange={(e) => handleEdgeColorChange(e.target.value)}
                style={overlayStyles.colorInput}
              />
              <span style={overlayStyles.colorHex}>{edgeColor}</span>
            </div>

            {/* Line style */}
            <div style={overlayStyles.nodeEditorRow}>
              <label style={overlayStyles.nodeEditorLabel}>Style</label>
            </div>
            <div style={overlayStyles.edgeOptionRow}>
              <button
                style={{
                  ...overlayStyles.edgeOptionBtn,
                  ...(edgeLineStyle === 'solid' ? overlayStyles.edgeOptionBtnActive : {}),
                }}
                onClick={() => handleEdgeLineStyleChange('solid')}
                title="Solid line"
              >
                <svg width="40" height="12" viewBox="0 0 40 12">
                  <line x1="2" y1="6" x2="38" y2="6" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
              <button
                style={{
                  ...overlayStyles.edgeOptionBtn,
                  ...(edgeLineStyle === 'dashed' ? overlayStyles.edgeOptionBtnActive : {}),
                }}
                onClick={() => handleEdgeLineStyleChange('dashed')}
                title="Dashed line"
              >
                <svg width="40" height="12" viewBox="0 0 40 12">
                  <line x1="2" y1="6" x2="38" y2="6" stroke="currentColor" strokeWidth="2" strokeDasharray="6 3" />
                </svg>
              </button>
            </div>

            {/* Arrow mode */}
            <div style={overlayStyles.nodeEditorRow}>
              <label style={overlayStyles.nodeEditorLabel}>Arrow</label>
            </div>
            <div style={overlayStyles.edgeOptionRow}>
              <button
                style={{
                  ...overlayStyles.edgeOptionBtn,
                  ...(edgeArrowMode === 'forward' ? overlayStyles.edgeOptionBtnActive : {}),
                }}
                onClick={() => handleEdgeArrowModeChange('forward')}
                title="One direction"
              >
                <svg width="40" height="14" viewBox="0 0 40 14">
                  <line x1="4" y1="7" x2="30" y2="7" stroke="currentColor" strokeWidth="2" />
                  <polygon points="30,3 38,7 30,11" fill="currentColor" />
                </svg>
              </button>
              <button
                style={{
                  ...overlayStyles.edgeOptionBtn,
                  ...(edgeArrowMode === 'both' ? overlayStyles.edgeOptionBtnActive : {}),
                }}
                onClick={() => handleEdgeArrowModeChange('both')}
                title="Both directions"
              >
                <svg width="40" height="14" viewBox="0 0 40 14">
                  <polygon points="10,3 2,7 10,11" fill="currentColor" />
                  <line x1="10" y1="7" x2="30" y2="7" stroke="currentColor" strokeWidth="2" />
                  <polygon points="30,3 38,7 30,11" fill="currentColor" />
                </svg>
              </button>
            </div>

            {/* Delete */}
            <button
              style={overlayStyles.frameDeleteBtn}
              onClick={handleDeleteEdge}
            >
              Delete Edge
            </button>
          </Island>
        </div>
      )}

      {/* Frame editor panel (top-left) */}
      {showFrameEditor && editingFrameId && (
        <div style={overlayStyles.nodeEditorContainer}>
          <Island padding={12} style={overlayStyles.nodeEditorIsland}>
            <h4 style={overlayStyles.nodeEditorTitle}>Frame</h4>

            {/* Title input */}
            <div style={overlayStyles.nodeEditorRow}>
              <label style={overlayStyles.nodeEditorLabel}>Title</label>
              <input
                type="text"
                value={frameTitle}
                onChange={(e) => setFrameTitle(e.target.value)}
                onBlur={handleSaveFrame}
                placeholder="Frame title..."
                style={overlayStyles.frameInput}
              />
            </div>

            {/* Background color */}
            <div style={overlayStyles.nodeEditorRow}>
              <label style={overlayStyles.nodeEditorLabel}>Fill</label>
              <input
                type="color"
                value={frameBgColor}
                onChange={(e) => {
                  setFrameBgColor(e.target.value);
                  if (editingFrameId) {
                    updateGraphFrame(editingFrameId, { backgroundColor: e.target.value });
                  }
                }}
                style={overlayStyles.colorInput}
              />
              <span style={overlayStyles.colorHex}>{frameBgColor}</span>
            </div>

            {/* Border color */}
            <div style={overlayStyles.nodeEditorRow}>
              <label style={overlayStyles.nodeEditorLabel}>Border</label>
              <input
                type="color"
                value={frameBorderColor}
                onChange={(e) => {
                  setFrameBorderColor(e.target.value);
                  if (editingFrameId) {
                    updateGraphFrame(editingFrameId, { borderColor: e.target.value });
                  }
                }}
                style={overlayStyles.colorInput}
              />
              <span style={overlayStyles.colorHex}>{frameBorderColor}</span>
            </div>

            {/* Alignment & Distribution */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '8px', paddingTop: '8px' }}>
              <div style={overlayStyles.nodeEditorRow}>
                <label style={overlayStyles.nodeEditorLabel}>Align</label>
              </div>
              <div style={overlayStyles.edgeOptionRow}>
                <button style={overlayStyles.edgeOptionBtn} onClick={handleAlignCenterH} title="Align center horizontally">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="2" x2="12" y2="22" />
                    <rect x="4" y="6" width="16" height="4" rx="1" fill="none" />
                    <rect x="6" y="14" width="12" height="4" rx="1" fill="none" />
                  </svg>
                </button>
                <button style={overlayStyles.edgeOptionBtn} onClick={handleAlignCenterV} title="Align center vertically">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <rect x="6" y="4" width="4" height="16" rx="1" fill="none" />
                    <rect x="14" y="6" width="4" height="12" rx="1" fill="none" />
                  </svg>
                </button>
                <button style={overlayStyles.edgeOptionBtn} onClick={handleDistributeH} title="Distribute equally horizontally">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="2" y1="4" x2="2" y2="20" />
                    <line x1="22" y1="4" x2="22" y2="20" />
                    <circle cx="8" cy="12" r="2" />
                    <circle cx="16" cy="12" r="2" />
                  </svg>
                </button>
                <button style={overlayStyles.edgeOptionBtn} onClick={handleDistributeV} title="Distribute equally vertically">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="2" x2="20" y2="2" />
                    <line x1="4" y1="22" x2="20" y2="22" />
                    <circle cx="12" cy="8" r="2" />
                    <circle cx="12" cy="16" r="2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Annotations section */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '8px', paddingTop: '8px' }}>
              <div style={overlayStyles.nodeEditorRow}>
                <label style={overlayStyles.nodeEditorLabel}>Annotate</label>
              </div>
              <div style={overlayStyles.edgeOptionRow}>
                <button
                  style={overlayStyles.edgeOptionBtn}
                  onClick={handleAddFrameText}
                  title="Add text annotation"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 7 4 4 20 4 20 7" />
                    <line x1="9" y1="20" x2="15" y2="20" />
                    <line x1="12" y1="4" x2="12" y2="20" />
                  </svg>
                </button>
                <button
                  style={overlayStyles.edgeOptionBtn}
                  onClick={() => handleAddFrameShape('line')}
                  title="Add line"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="20" x2="20" y2="4" />
                  </svg>
                </button>
                <button
                  style={overlayStyles.edgeOptionBtn}
                  onClick={() => handleAddFrameShape('arrow')}
                  title="Add arrow"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
                <button
                  style={overlayStyles.edgeOptionBtn}
                  onClick={() => handleAddFrameShape('rect')}
                  title="Add rectangle"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                </button>
              </div>

              {/* List existing annotations */}
              {(() => {
                const frame = graphFrames.find((f) => f.id === editingFrameId);
                if (!frame) return null;
                const texts = frame.texts ?? [];
                const shapes = frame.shapes ?? [];
                if (texts.length === 0 && shapes.length === 0) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                    {texts.map((t) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8', padding: '2px 4px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>T: {t.text}</span>
                        <button style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', padding: '0 2px' }} onClick={() => handleDeleteFrameText(editingFrameId!, t.id)}>×</button>
                      </div>
                    ))}
                    {shapes.map((s) => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8', padding: '2px 4px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                        <span>{s.type === 'line' ? '— Line' : s.type === 'arrow' ? '→ Arrow' : '▭ Rect'}</span>
                        <button style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', padding: '0 2px' }} onClick={() => handleDeleteFrameShape(editingFrameId!, s.id)}>×</button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Delete button */}
            <button
              style={overlayStyles.frameDeleteBtn}
              onClick={handleDeleteFrame}
            >
              Delete Frame
            </button>
          </Island>
        </div>
      )}

      {/* Bottom-left: Status indicator */}
      <div style={overlayStyles.statusContainer}>
        <Island padding={6} style={overlayStyles.statusIsland}>
          <span style={overlayStyles.statusText}>
            {displayNodes.length} nodes · {displayEdges.length} edges
            {layerMode === 'areas' && !drillAreaId && ' (areas)'}
            {layerMode === 'areas' && drillAreaId && ` (${areas.find(a => a.id === drillAreaId)?.name || 'area'})`}
            {layerMode === 'children' && childrenParentId && ` (children)`}
          </span>
          {isConnecting && (
            <span style={overlayStyles.connectingStatus}>
              Connecting from node... Click target node or Esc to cancel
            </span>
          )}
        </Island>
      </div>

      {/* Bottom-center: Zoom controls */}
      <div style={overlayStyles.zoomBarContainer}>
        <Island padding={4} style={overlayStyles.zoomBar}>
          <button style={overlayStyles.zoomButton} onClick={handleZoomOut} title="Zoom Out">
            −
          </button>
          {isEditingZoom ? (
            <input
              autoFocus
              type="text"
              value={zoomInputValue}
              onChange={(e) => setZoomInputValue(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={() => {
                setIsEditingZoom(false);
                const val = parseInt(zoomInputValue, 10);
                if (!isNaN(val) && val >= 10 && val <= 500) {
                  const cy = cyRef.current;
                  if (cy) cy.zoom({ level: val / 100, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === 'Escape') {
                  setIsEditingZoom(false);
                  setZoomInputValue(String(zoomLevel));
                }
              }}
              style={overlayStyles.zoomInput}
            />
          ) : (
            <button
              style={overlayStyles.zoomLevelBtn}
              onClick={() => {
                setZoomInputValue(String(zoomLevel));
                setIsEditingZoom(true);
              }}
              title="Click to set zoom"
            >
              {zoomLevel}%
            </button>
          )}
          <button style={overlayStyles.zoomButton} onClick={handleZoomIn} title="Zoom In">
            +
          </button>
          <div style={overlayStyles.toolDivider} />
          <button style={overlayStyles.zoomButton} onClick={handleFit} title="Fit to screen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </button>
        </Island>
      </div>

      {/* Bottom-right: Tag filter */}
      {allVisibleTags.length > 0 && (
        <div ref={tagFilterRef} style={overlayStyles.tagFilterContainer}>
          <Island padding={4}>
            <button
              style={{
                ...overlayStyles.tagFilterBtn,
                ...(selectedTags.length > 0 || showTagFilter ? overlayStyles.toolButtonActive : {}),
              }}
              onClick={() => setShowTagFilter(!showTagFilter)}
              title="Filter by tags"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>Tags</span>
              {selectedTags.length > 0 && (
                <span style={overlayStyles.tagBadge}>{selectedTags.length}</span>
              )}
            </button>
          </Island>

          {showTagFilter && (
            <Island padding={12} style={overlayStyles.tagFilterDropdown}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={overlayStyles.nodeEditorLabel}>Filter by tag</span>
                {selectedTags.length > 0 && (
                  <button
                    style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '11px', cursor: 'pointer', padding: '2px 4px' }}
                    onClick={() => setSelectedTags([])}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {allVisibleTags.map((tag) => {
                  const color = getTagColor(tag);
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        border: `1px solid ${isSelected ? color.border : '#334155'}`,
                        backgroundColor: isSelected ? color.bg : 'transparent',
                        color: isSelected ? color.text : '#94a3b8',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                        );
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </Island>
          )}
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '4px',
            minWidth: '180px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            style={overlayStyles.contextMenuItem}
            onClick={() => handleContextMenuCreate('content')}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Add Content</span>
          </button>
          <button
            style={overlayStyles.contextMenuItem}
            onClick={() => handleContextMenuCreate('area')}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(167, 139, 250, 0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Add Area</span>
          </button>
        </div>
      )}

      {/* Create Area/Content modal */}
      {showCreateModal && (
        <div
          style={overlayStyles.createModalOverlay}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={overlayStyles.createModal}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f1f1f1', margin: '0 0 20px 0' }}>
              {createMode === 'area' ? 'New Area' : 'New Content'}
            </h2>

            {/* Name input */}
            <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
              {createMode === 'area' ? 'Area name' : 'Content name'}
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFromModal()}
              placeholder={createMode === 'area' ? 'Enter area name...' : 'Enter content name...'}
              style={overlayStyles.createModalInput}
              autoFocus
            />

            {/* Area selector (only for content) */}
            {createMode === 'content' && (
              <>
                <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', marginTop: '14px', display: 'block', fontWeight: 500 }}>
                  Area
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      backgroundColor: createAreaId === '' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.2)',
                      border: createAreaId === '' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                      borderRadius: '8px',
                      color: createAreaId === '' ? '#38bdf8' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: createAreaId === '' ? 600 : 400,
                      fontStyle: 'italic',
                      textAlign: 'left' as const,
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setCreateAreaId('')}
                  >
                    <span>No area</span>
                    {createAreaId === '' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  {areas.map((a) => (
                      <button
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          backgroundColor: createAreaId === a.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.2)',
                          border: createAreaId === a.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                          borderRadius: '8px',
                          color: createAreaId === a.id ? '#38bdf8' : '#e2e8f0',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: createAreaId === a.id ? 600 : 400,
                          textAlign: 'left' as const,
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => setCreateAreaId(a.id)}
                      >
                        {a.emoji && <span>{a.emoji}</span>}
                        <span>{a.name}</span>
                        {createAreaId === a.id && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
              </>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                style={overlayStyles.createModalCancelBtn}
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  ...overlayStyles.createModalCreateBtn,
                  opacity: !createName.trim() ? 0.4 : 1,
                }}
                onClick={handleCreateFromModal}
                disabled={!createName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

const overlayStyles: Record<string, React.CSSProperties> = {
  toolbarContainer: {
    position: 'absolute',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    pointerEvents: 'auto',
  },
  toolButton: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toolButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    color: '#38bdf8',
  },
  toolDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: '0 4px',
  },
  controlsContainer: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 10,
  },
  levelConfigContainer: {
    position: 'absolute',
    top: '12px',
    right: '200px',
    zIndex: 11,
  },
  statusContainer: {
    position: 'absolute',
    bottom: '12px',
    left: '12px',
    zIndex: 10,
  },
  statusIsland: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  statusText: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  connectingStatus: {
    fontSize: '12px',
    color: '#38bdf8',
    fontStyle: 'italic',
  },
  zoomBarContainer: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
  },
  zoomBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    pointerEvents: 'auto',
  },
  zoomButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.15s ease',
  },
  zoomLevel: {
    fontSize: '12px',
    color: '#94a3b8',
    minWidth: '40px',
    textAlign: 'center',
  },
  zoomLevelBtn: {
    fontSize: '12px',
    color: '#94a3b8',
    minWidth: '44px',
    textAlign: 'center' as const,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
  },
  zoomInput: {
    width: '44px',
    fontSize: '12px',
    color: '#f1f1f1',
    backgroundColor: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    borderRadius: '4px',
    textAlign: 'center' as const,
    padding: '2px 4px',
    outline: 'none',
  },
  // Node editor panel
  nodeEditorContainer: {
    position: 'absolute',
    top: '60px',
    left: '12px',
    zIndex: 10,
  },
  nodeEditorIsland: {
    width: '200px',
    maxWidth: '200px',
    boxSizing: 'border-box' as const,
  },
  nodeEditorTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#94a3b8',
    margin: '0 0 10px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  nodeEditorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  nodeEditorLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    minWidth: '40px',
  },
  emojiInput: {
    flex: 1,
    padding: '6px 8px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#f1f1f1',
    fontSize: '16px',
    textAlign: 'center' as const,
    width: '60px',
  },
  emojiClearBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  emojiHint: {
    fontSize: '10px',
    color: '#64748b',
    marginTop: '-4px',
    marginBottom: '6px',
    display: 'block',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '4px',
    marginBottom: '8px',
  },
  colorSwatch: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
  colorSwatchActive: {
    border: '2px solid #fff',
    transform: 'scale(1.15)',
  },
  colorInput: {
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    padding: 0,
  },
  colorHex: {
    fontSize: '11px',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  widthSlider: {
    width: '100%',
    height: '4px',
    cursor: 'pointer',
    accentColor: '#38bdf8',
    marginBottom: '4px',
  },
  frameInput: {
    flex: 1,
    minWidth: 0,
    padding: '6px 8px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#f1f1f1',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  frameDeleteBtn: {
    width: '100%',
    padding: '6px',
    marginTop: '4px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  edgeOptionRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '10px',
  },
  edgeOptionBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 4px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  edgeOptionBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
    color: '#38bdf8',
  },
  tagFilterContainer: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    zIndex: 10,
  },
  tagFilterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s ease',
  },
  tagBadge: {
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    borderRadius: '10px',
    padding: '0 6px',
    fontSize: '10px',
    fontWeight: 700,
    minWidth: '16px',
    textAlign: 'center' as const,
    lineHeight: '16px',
  },
  tagFilterDropdown: {
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    right: 0,
    minWidth: '240px',
    maxWidth: '320px',
  },
  // Context menu
  contextMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background-color 0.12s ease',
  },
  // Create modal
  createModalOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  createModal: {
    backgroundColor: '#1e293b',
    borderRadius: '14px',
    padding: '28px',
    width: '380px',
    maxWidth: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '1px solid #334155',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  createModalInput: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f1f1',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  createModalCancelBtn: {
    padding: '8px 18px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  createModalCreateBtn: {
    padding: '8px 22px',
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
};
