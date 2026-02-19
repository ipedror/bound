// ============================================================
// useCanvasEditor - Hook for canvas editor logic
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useContent } from './useContent';
import { CanvasUndoRedoManager } from '../managers/CanvasUndoRedoManager';
import { ShapeFactory } from '../utils/canvas/shapeFactory';
import { DEFAULT_CANVAS_STATE } from '../constants/canvas';
import { ToolType } from '../types/canvas';
import type { CanvasState, CanvasHistory } from '../types/canvas';
import type { Shape, ShapeStyle } from '../types/shape';
import type { Position } from '../types/base';
import type { ShapeType } from '../types/enums';
import { generateId } from '../utils/id';

export interface UseCanvasEditorReturn {
  // State
  canvasState: CanvasState;
  shapes: Shape[];
  selectedShapeIds: string[];
  isDrawing: boolean;

  // State setters
  setCanvasState: (state: CanvasState) => void;
  setTool: (tool: ToolType) => void;
  setFillColor: (color: string) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  setRoughness: (roughness: number) => void;
  setFontFamily: (family: string) => void;
  setFontSize: (size: number) => void;
  setTextMaxWidth: (maxWidth: number) => void;
  setSelectedShapeIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleShapeSelection: (id: string) => void;

  // Shape operations
  addShape: (shape: Shape) => void;
  removeShape: (shapeId: string) => void;
  updateShape: (shapeId: string, updates: Partial<Shape>) => void;
  updateShapePosition: (shapeId: string, position: Position) => void;
  updateShapeStyle: (shapeId: string, style: Partial<ShapeStyle>) => void;
  clearAllShapes: () => void;

  // Drawing operations
  startDrawing: (position: Position) => void;
  continueDrawing: (position: Position) => void;
  finishDrawing: (position: Position, text?: string) => void;
  cancelDrawing: () => void;

  // History operations
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Grouping operations
  groupSelectedShapes: () => void;
  ungroupSelectedShapes: () => void;
  selectGroup: (groupId: string) => void;

  // Commit changes to store
  commitToStore: () => void;
}

export function useCanvasEditor(
  contentId: string | undefined,
): UseCanvasEditorReturn {
  const { content, addShape: addShapeToContent, removeShape: removeShapeFromContent, updateShape: updateShapeInContent } =
    useContent(contentId);

  // Local canvas state
  const [canvasState, setCanvasState] = useState<CanvasState>(DEFAULT_CANVAS_STATE);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartPos, setDrawStartPos] = useState<Position | null>(null);

  // Local shapes (for immediate updates, synced with content)
  const [localShapes, setLocalShapes] = useState<Shape[]>([]);

  // History for undo/redo
  const [history, setHistory] = useState<CanvasHistory>(() =>
    CanvasUndoRedoManager.createHistory(),
  );

  // Track if we need to sync with store
  const pendingCommit = useRef(false);

  // Sync local shapes with content when content changes
  useEffect(() => {
    if (content) {
      setLocalShapes(content.body.shapes);
      setHistory(CanvasUndoRedoManager.createHistory(content.body.shapes));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.id]); // Only sync on content ID change, not every update

  // Derived state
  const shapes = localShapes;
  const canUndo = CanvasUndoRedoManager.canUndo(history);
  const canRedo = CanvasUndoRedoManager.canRedo(history);

  // State setters
  const setTool = useCallback((tool: ToolType) => {
    setCanvasState((prev) => ({ ...prev, tool }));
    setSelectedShapeIds([]); // Clear selection when changing tools
  }, []);

  const setFillColor = useCallback((fillColor: string) => {
    setCanvasState((prev) => ({ ...prev, fillColor }));
  }, []);

  const setStrokeColor = useCallback((strokeColor: string) => {
    setCanvasState((prev) => ({ ...prev, strokeColor }));
  }, []);

  const setStrokeWidth = useCallback((strokeWidth: number) => {
    setCanvasState((prev) => ({ ...prev, strokeWidth }));
  }, []);

  const setOpacity = useCallback((opacity: number) => {
    setCanvasState((prev) => ({ ...prev, opacity }));
  }, []);

  const setRoughness = useCallback((roughness: number) => {
    setCanvasState((prev) => ({ ...prev, roughness }));
  }, []);

  const setFontFamily = useCallback((fontFamily: string) => {
    setCanvasState((prev) => ({ ...prev, fontFamily }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setCanvasState((prev) => ({ ...prev, fontSize }));
  }, []);

  const setTextMaxWidth = useCallback((textMaxWidth: number) => {
    setCanvasState((prev) => ({ ...prev, textMaxWidth }));
  }, []);

  // Toggle shape in/out of selection (for Shift+click multi-select)
  const toggleShapeSelection = useCallback((id: string) => {
    setSelectedShapeIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  }, []);

  // Shape operations
  const addShape = useCallback(
    (shape: Shape) => {
      const newShapes = [...localShapes, shape];
      setLocalShapes(newShapes);
      setHistory((h) => CanvasUndoRedoManager.push(newShapes, h));
      pendingCommit.current = true;
    },
    [localShapes],
  );

  const removeShape = useCallback(
    (shapeId: string) => {
      const newShapes = localShapes.filter((s) => s.id !== shapeId);
      setLocalShapes(newShapes);
      setHistory((h) => CanvasUndoRedoManager.push(newShapes, h));
      setSelectedShapeIds((prev) => prev.filter((id) => id !== shapeId));
      pendingCommit.current = true;
    },
    [localShapes],
  );

  const updateShape = useCallback(
    (shapeId: string, updates: Partial<Shape>) => {
      const newShapes = localShapes.map((s) =>
        s.id === shapeId ? { ...s, ...updates } : s,
      );
      setLocalShapes(newShapes);
      setHistory((h) => CanvasUndoRedoManager.push(newShapes, h));
      pendingCommit.current = true;
    },
    [localShapes],
  );

  const updateShapePosition = useCallback(
    (shapeId: string, position: Position) => {
      setLocalShapes((prev) =>
        prev.map((s) =>
          s.id === shapeId ? ShapeFactory.updatePosition(s, position) : s,
        ),
      );
      // Don't push to history on drag (will push on drag end)
    },
    [],
  );

  const updateShapeStyle = useCallback(
    (shapeId: string, style: Partial<ShapeStyle>) => {
      const newShapes = localShapes.map((s) =>
        s.id === shapeId ? ShapeFactory.updateStyle(s, style) : s,
      );
      setLocalShapes(newShapes);
      setHistory((h) => CanvasUndoRedoManager.push(newShapes, h));
      pendingCommit.current = true;
    },
    [localShapes],
  );

  const clearAllShapes = useCallback(() => {
    setLocalShapes([]);
    setHistory((h) => CanvasUndoRedoManager.push([], h));
    setSelectedShapeIds([]);
    pendingCommit.current = true;
  }, []);

  // Drawing operations
  const startDrawing = useCallback((position: Position) => {
    if (canvasState.tool === ToolType.SELECT || canvasState.tool === ToolType.MOUSE) return;
    setIsDrawing(true);
    setDrawStartPos(position);
  }, [canvasState.tool]);

  const continueDrawing = useCallback((position: Position) => {
    void position; // Used for preview (handled in component)
    if (!isDrawing || !drawStartPos) return;
    // Preview is handled in the component
  }, [isDrawing, drawStartPos]);

  const finishDrawing = useCallback(
    (endPosition: Position, text?: string) => {
      if (!isDrawing || !drawStartPos) return;

      const tool = canvasState.tool;
      if (tool === ToolType.SELECT || tool === ToolType.MOUSE || tool === ToolType.ERASER) {
        setIsDrawing(false);
        setDrawStartPos(null);
        return;
      }

      // Map ToolType to ShapeType
      const shapeType = tool as unknown as ShapeType;

      const shape = ShapeFactory.createFromDrag(
        shapeType,
        drawStartPos,
        endPosition,
        canvasState,
        text,
      );

      addShape(shape);
      setIsDrawing(false);
      setDrawStartPos(null);
    },
    [isDrawing, drawStartPos, canvasState, addShape],
  );

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setDrawStartPos(null);
  }, []);

  // History operations
  const undo = useCallback(() => {
    const newHistory = CanvasUndoRedoManager.undo(history);
    setHistory(newHistory);
    setLocalShapes([...newHistory.present]);
    pendingCommit.current = true;
  }, [history]);

  const redo = useCallback(() => {
    const newHistory = CanvasUndoRedoManager.redo(history);
    setHistory(newHistory);
    setLocalShapes([...newHistory.present]);
    pendingCommit.current = true;
  }, [history]);

  // Grouping operations
  const groupSelectedShapes = useCallback(() => {
    if (selectedShapeIds.length < 2) return;
    const gid = generateId();
    const newShapes = localShapes.map((s) =>
      selectedShapeIds.includes(s.id) ? { ...s, groupId: gid } : s,
    );
    setLocalShapes(newShapes);
    setHistory((h) => CanvasUndoRedoManager.push(newShapes, h));
    pendingCommit.current = true;
  }, [selectedShapeIds, localShapes]);

  const ungroupSelectedShapes = useCallback(() => {
    if (selectedShapeIds.length === 0) return;
    // Collect all groupIds of selected shapes
    const groupIds = new Set(
      localShapes
        .filter((s) => selectedShapeIds.includes(s.id) && s.groupId)
        .map((s) => s.groupId!),
    );
    if (groupIds.size === 0) return;
    // Remove groupId from all shapes in those groups
    const newShapes = localShapes.map((s) =>
      s.groupId && groupIds.has(s.groupId)
        ? { ...s, groupId: undefined }
        : s,
    );
    setLocalShapes(newShapes);
    setHistory((h) => CanvasUndoRedoManager.push(newShapes, h));
    pendingCommit.current = true;
  }, [selectedShapeIds, localShapes]);

  const selectGroup = useCallback(
    (groupId: string) => {
      const ids = localShapes.filter((s) => s.groupId === groupId).map((s) => s.id);
      setSelectedShapeIds(ids);
    },
    [localShapes, setSelectedShapeIds],
  );

  // Commit changes to store (debounced externally or called manually)
  const commitToStore = useCallback(() => {
    if (!contentId || !pendingCommit.current) return;

    // Sync with store by updating each shape
    const currentStoreShapes = content?.body.shapes ?? [];
    const currentIds = new Set(currentStoreShapes.map((s) => s.id));
    const newIds = new Set(localShapes.map((s) => s.id));

    // Remove shapes no longer in local
    for (const shape of currentStoreShapes) {
      if (!newIds.has(shape.id)) {
        removeShapeFromContent(shape.id);
      }
    }

    // Add or update shapes
    for (const shape of localShapes) {
      if (!currentIds.has(shape.id)) {
        addShapeToContent(shape);
      } else {
        const existing = currentStoreShapes.find((s) => s.id === shape.id);
        if (JSON.stringify(existing) !== JSON.stringify(shape)) {
          updateShapeInContent(shape.id, shape);
        }
      }
    }

    pendingCommit.current = false;
  }, [contentId, content, localShapes, addShapeToContent, removeShapeFromContent, updateShapeInContent]);

  // Auto-commit on shape changes (debounced)
  useEffect(() => {
    if (!pendingCommit.current) return;

    const timer = setTimeout(() => {
      commitToStore();
    }, 500);

    return () => clearTimeout(timer);
  }, [localShapes, commitToStore]);

  return {
    canvasState,
    shapes,
    selectedShapeIds,
    isDrawing,
    setCanvasState,
    setTool,
    setFillColor,
    setStrokeColor,
    setStrokeWidth,
    setOpacity,
    setRoughness,
    setFontFamily,
    setFontSize,
    setTextMaxWidth,
    setSelectedShapeIds,
    toggleShapeSelection,
    addShape,
    removeShape,
    updateShape,
    updateShapePosition,
    updateShapeStyle,
    clearAllShapes,
    startDrawing,
    continueDrawing,
    finishDrawing,
    cancelDrawing,
    undo,
    redo,
    canUndo,
    canRedo,
    groupSelectedShapes,
    ungroupSelectedShapes,
    selectGroup,
    commitToStore,
  };
}
