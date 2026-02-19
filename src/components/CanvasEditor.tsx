// ============================================================
// CanvasEditor - Main canvas editor component (full-screen + zoom)
// ============================================================

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Arrow, Ellipse, Text } from 'react-konva';
import type Konva from 'konva';
import { useCanvasEditor } from '../hooks/useCanvasEditor';
import { CanvasToolbar } from './CanvasToolbar';
import { Island } from './Island';
import { ShapeComponent } from './shapes/ShapeComponent';
import { ShapeFactory } from '../utils/canvas/shapeFactory';
import { ToolType } from '../types/canvas';
import { ShapeType } from '../types/enums';
import type { Position } from '../types/base';
import {
  CANVAS_BACKGROUND_COLOR,
  HAND_DRAWN_FONT,
} from '../constants/canvas';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 1.1;
const VIRTUAL_CANVAS_SIZE = 10000;

interface CanvasEditorProps {
  contentId: string;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  contentId,
}) => {
  const {
    canvasState,
    shapes,
    selectedShapeIds,
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
    undo,
    redo,
    canUndo,
    canRedo,
    groupSelectedShapes,
    ungroupSelectedShapes,
    selectGroup,
    commitToStore,
  } = useCanvasEditor(contentId);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 960, height: 540 });
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState<Position>({ x: 0, y: 0 });
  const [drawStartPos, setDrawStartPos] = useState<Position | null>(null);
  const [currentDrawPos, setCurrentDrawPos] = useState<Position | null>(null);
  const [textInputVisible, setTextInputVisible] = useState(false);
  const [textInputPos, setTextInputPos] = useState<Position>({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const textInputJustOpenedRef = useRef(false);
  // Selection rectangle (rubber-band) state
  const [selectionStart, setSelectionStart] = useState<Position | null>(null);
  const [selectionCurrent, setSelectionCurrent] = useState<Position | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{
    startPointer: { x: number; y: number };
    startStagePos: Position;
  } | null>(null);
  // Multi-drag: track dragged shape and all selected shapes' start positions
  const dragInfoRef = useRef<{
    shapeId: string;
    modelPositions: Map<string, Position>;   // model positions (top-left) at drag start
    nodePositions: Map<string, Position>;    // konva node positions at drag start
  } | null>(null);

  const isPanMode = isSpacePressed && !textInputVisible;

  // Resize stage to fill container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setStageSize({ width: Math.round(width), height: Math.round(height) });
      }
    });
    ro.observe(container);
    // Set initial size
    setStageSize({
      width: Math.round(container.clientWidth),
      height: Math.round(container.clientHeight),
    });
    return () => ro.disconnect();
  }, []);

  // Focus text input when it becomes visible
  useEffect(() => {
    if (textInputVisible && textInputRef.current) {
      textInputJustOpenedRef.current = true;
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
        setTimeout(() => {
          textInputJustOpenedRef.current = false;
        }, 100);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [textInputVisible]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // Group: Ctrl+G
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        groupSelectedShapes();
      }
      // Ungroup: Ctrl+Shift+G
      if ((e.ctrlKey || e.metaKey) && e.key === 'G' && e.shiftKey) {
        e.preventDefault();
        ungroupSelectedShapes();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedShapeIds.length > 0 && document.activeElement === document.body) {
          e.preventDefault();
          for (const id of selectedShapeIds) {
            removeShape(id);
          }
        }
      }
      if (e.key === 'Escape') {
        setSelectedShapeIds([]);
        setDrawStartPos(null);
        setCurrentDrawPos(null);
        setSelectionStart(null);
        setSelectionCurrent(null);
        setTextInputVisible(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedShapeIds, removeShape, setSelectedShapeIds, groupSelectedShapes, ungroupSelectedShapes]);

  // Spacebar: temporary pan (hand tool)
  useEffect(() => {
    const shouldIgnoreForTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (shouldIgnoreForTyping(e.target)) return;
      e.preventDefault();
      setIsSpacePressed(true);
    };

    const stopPan = () => {
      panRef.current = null;
      setIsPanning(false);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      setIsSpacePressed(false);
      stopPan();
    };

    const onBlur = () => {
      setIsSpacePressed(false);
      stopPan();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // If mouseup happens outside the stage, stop panning
  useEffect(() => {
    if (!isPanning) return;
    const onMouseUp = () => {
      if (!panRef.current) return;
      panRef.current = null;
      setIsPanning(false);
    };

    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [isPanning]);

  // Handle paste: images from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const img = new window.Image();
            img.onload = () => {
              // Scale image to fit reasonably on canvas (max 600px)
              const maxDim = 600;
              let w = img.width;
              let h = img.height;
              if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
              }
              // Place at center of current view
              const centerX = (-stagePos.x + stageSize.width / 2) / scale - w / 2;
              const centerY = (-stagePos.y + stageSize.height / 2) / scale - h / 2;
              const shape = ShapeFactory.createImage(
                dataUrl,
                { x: centerX, y: centerY },
                { width: w, height: h },
                canvasState,
              );
              addShape(shape);
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
          break; // Only handle first image
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addShape, canvasState, scale, stagePos, stageSize]);

  // Export canvas as image
  const exportCanvas = useCallback(
    (format: 'png' | 'jpeg' = 'png') => {
      const stage = stageRef.current;
      if (!stage) return;

      // If shapes are selected, export only the bounding box of selected shapes
      let exportShapes =
        selectedShapeIds.length > 0
          ? shapes.filter((s) => selectedShapeIds.includes(s.id))
          : shapes;

      // Expand to include all group members when selection contains grouped shapes
      if (selectedShapeIds.length > 0) {
        const groupIds = new Set(
          exportShapes.filter((s) => s.groupId).map((s) => s.groupId!),
        );
        if (groupIds.size > 0) {
          exportShapes = shapes.filter(
            (s) => selectedShapeIds.includes(s.id) || (s.groupId && groupIds.has(s.groupId)),
          );
        }
      }

      if (exportShapes.length === 0) return;

      // Calculate bounding box of shapes to export
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const s of exportShapes) {
        minX = Math.min(minX, s.position.x);
        minY = Math.min(minY, s.position.y);
        maxX = Math.max(maxX, s.position.x + s.dimension.width);
        maxY = Math.max(maxY, s.position.y + s.dimension.height);
      }

      const padding = 20;
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const quality = format === 'jpeg' ? 0.95 : 1;

      const dataUrl = stage.toDataURL({
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
        pixelRatio: 3, // High quality export (3x resolution)
        mimeType,
        quality,
      });

      const link = document.createElement('a');
      link.download = `canvas-export.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [shapes, selectedShapeIds],
  );

  // Ctrl + Scroll zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.deltaY < 0 ? 1 : -1;
      const newScale = direction > 0
        ? Math.min(oldScale * ZOOM_STEP, ZOOM_MAX)
        : Math.max(oldScale / ZOOM_STEP, ZOOM_MIN);

      // Zoom towards pointer
      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldScale,
        y: (pointer.y - stagePos.y) / oldScale,
      };
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      setScale(newScale);
      setStagePos(newPos);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [scale, stagePos]);

  // Get mouse position relative to stage (accounting for zoom/pan)
  const getPointerPosition = useCallback((): Position | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - stagePos.x) / scale,
      y: (pos.y - stagePos.y) / scale,
    };
  }, [scale, stagePos]);

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (textInputVisible) return;

      if (isPanMode) {
        const stage = stageRef.current;
        const pointer = stage?.getPointerPosition();
        if (!pointer) return;
        e.evt?.preventDefault();
        panRef.current = {
          startPointer: { x: pointer.x, y: pointer.y },
          startStagePos: { ...stagePos },
        };
        setIsPanning(true);
        return;
      }

      const pos = getPointerPosition();
      if (!pos) return;

      const clickedOnEmpty = e.target === e.target.getStage() ||
        e.target.attrs?.name === 'canvas-background';

      if (canvasState.tool === ToolType.SELECT) {
        if (clickedOnEmpty) {
          if (!e.evt?.shiftKey) {
            setSelectedShapeIds([]);
          }
          // Start rubber-band area selection
          setSelectionStart(pos);
          setSelectionCurrent(pos);
        }
        // Shape click selection is handled by handleShapeSelect via onClick on shapes
        return;
      }

      if (canvasState.tool === ToolType.MOUSE) {
        if (clickedOnEmpty) {
          setSelectedShapeIds([]);
        }
        // In MOUSE mode, we never start rubber-band selection.
        // Shape click selection is handled by handleShapeSelect via onClick on shapes.
        return;
      }

      if (clickedOnEmpty) {
        setSelectedShapeIds([]);
      }

      if (canvasState.tool !== ToolType.ERASER) {
        if (canvasState.tool === ToolType.TEXT) {
          setTextInputPos(pos);
          setTextInputValue('');
          setTextInputVisible(true);
        } else {
          setDrawStartPos(pos);
          setCurrentDrawPos(pos);
        }
      }

      if (canvasState.tool === ToolType.ERASER) {
        const clickedShape = shapes.find((s) => {
          const inX = pos.x >= s.position.x && pos.x <= s.position.x + s.dimension.width;
          const inY = pos.y >= s.position.y && pos.y <= s.position.y + s.dimension.height;
          return inX && inY;
        });
        if (clickedShape) {
          removeShape(clickedShape.id);
        }
      }
    },
    [canvasState.tool, getPointerPosition, isPanMode, removeShape, setSelectedShapeIds, shapes, stagePos, textInputVisible],
  );

  const handleMouseMove = useCallback(() => {
    if (isPanMode && panRef.current) {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;

      const dx = pointer.x - panRef.current.startPointer.x;
      const dy = pointer.y - panRef.current.startPointer.y;
      setStagePos({
        x: panRef.current.startStagePos.x + dx,
        y: panRef.current.startStagePos.y + dy,
      });
      return;
    }

    const pos = getPointerPosition();
    if (!pos) return;

    // Update rubber-band selection rectangle
    if (selectionStart) {
      setSelectionCurrent(pos);
      return;
    }

    if (!drawStartPos) return;
    setCurrentDrawPos(pos);
  }, [drawStartPos, getPointerPosition, isPanMode, selectionStart]);

  const handleMouseUp = useCallback((e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanMode && panRef.current) {
      panRef.current = null;
      setIsPanning(false);
      return;
    }

    // Finish rubber-band area selection
    if (selectionStart && selectionCurrent) {
      const x1 = Math.min(selectionStart.x, selectionCurrent.x);
      const y1 = Math.min(selectionStart.y, selectionCurrent.y);
      const x2 = Math.max(selectionStart.x, selectionCurrent.x);
      const y2 = Math.max(selectionStart.y, selectionCurrent.y);

      const w = x2 - x1;
      const h = y2 - y1;

      if (w > 3 || h > 3) {
        // Find shapes that intersect the selection rectangle
        const selected = shapes.filter((s) => {
          const sx = s.position.x;
          const sy = s.position.y;
          const sw = s.dimension.width;
          const sh = s.dimension.height;
          return sx + sw > x1 && sx < x2 && sy + sh > y1 && sy < y2;
        });

        const newIds = selected.map((s) => s.id);
        const nativeEvent = e?.evt;
        if (nativeEvent?.shiftKey) {
          // Add to existing selection
          setSelectedShapeIds((prev) => {
            const combined = new Set([...prev, ...newIds]);
            return Array.from(combined);
          });
        } else {
          setSelectedShapeIds(newIds);
        }
      }

      setSelectionStart(null);
      setSelectionCurrent(null);
      return;
    }

    if (textInputVisible) return;
    if (!drawStartPos || !currentDrawPos) return;

    const minWidth = Math.abs(currentDrawPos.x - drawStartPos.x);
    const minHeight = Math.abs(currentDrawPos.y - drawStartPos.y);

    if (minWidth > 5 || minHeight > 5) {
      const toolToShapeType: Record<string, ShapeType> = {
        [ToolType.RECT]: ShapeType.RECT,
        [ToolType.ELLIPSE]: ShapeType.ELLIPSE,
        [ToolType.LINE]: ShapeType.LINE,
        [ToolType.ARROW]: ShapeType.ARROW,
      };

      const shapeType = toolToShapeType[canvasState.tool];
      if (shapeType) {
        const shape = ShapeFactory.createFromDrag(
          shapeType,
          drawStartPos,
          currentDrawPos,
          canvasState,
        );
        addShape(shape);
      }
    }

    setDrawStartPos(null);
    setCurrentDrawPos(null);
  }, [isPanMode, selectionStart, selectionCurrent, drawStartPos, currentDrawPos, canvasState, addShape, textInputVisible, shapes, setSelectedShapeIds]);

  const handleTextInputSubmit = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = textInputValue.trim();
        if (text) {
          const shape = ShapeFactory.createText(text, textInputPos, canvasState);
          addShape(shape);
        }
        setTextInputVisible(false);
        setTextInputValue('');
      }
      if (e.key === 'Escape') {
        setTextInputVisible(false);
        setTextInputValue('');
      }
    },
    [textInputPos, textInputValue, canvasState, addShape],
  );

  const handleTextInputBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (textInputJustOpenedRef.current) {
      setTimeout(() => textInputRef.current?.focus(), 0);
      return;
    }

    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('.canvas-toolbar')) {
      setTimeout(() => {
        const text = textInputValue.trim();
        if (text) {
          const shape = ShapeFactory.createText(text, textInputPos, canvasState);
          addShape(shape);
        }
        setTextInputVisible(false);
        setTextInputValue('');
      }, 50);
      return;
    }

    const text = textInputValue.trim();
    if (text) {
      const shape = ShapeFactory.createText(text, textInputPos, canvasState);
      addShape(shape);
    }
    setTextInputVisible(false);
    setTextInputValue('');
  }, [textInputPos, textInputValue, canvasState, addShape]);

  const handleShapeSelect = useCallback(
    (shapeId: string, e?: React.MouseEvent | Konva.KonvaEventObject<MouseEvent>) => {
      if (canvasState.tool === ToolType.MOUSE) {
        setSelectedShapeIds([shapeId]);
        return;
      }

      if (canvasState.tool === ToolType.SELECT) {
        const nativeEvent = e && 'evt' in e ? e.evt : e;
        const shape = shapes.find((s) => s.id === shapeId);

        if (nativeEvent && (nativeEvent as MouseEvent).shiftKey) {
          // Shift+click: toggle individual shape (or all group members)
          if (shape?.groupId) {
            const groupIds = shapes.filter((s) => s.groupId === shape.groupId).map((s) => s.id);
            setSelectedShapeIds((prev) => {
              const allSelected = groupIds.every((id) => prev.includes(id));
              if (allSelected) {
                return prev.filter((id) => !groupIds.includes(id));
              }
              return Array.from(new Set([...prev, ...groupIds]));
            });
          } else {
            toggleShapeSelection(shapeId);
          }
        } else {
          // Normal click: select shape (or entire group)
          if (shape?.groupId) {
            selectGroup(shape.groupId);
          } else {
            setSelectedShapeIds([shapeId]);
          }
        }
      }
    },
    [canvasState.tool, setSelectedShapeIds, toggleShapeSelection, shapes, selectGroup],
  );

  const handleShapeUpdate = useCallback(
    (shapeId: string, updates: Partial<typeof shapes[0]>) => {
      updateShape(shapeId, updates);
    },
    [updateShape],
  );

  const handleShapeDragStart = useCallback(
    (shapeId: string) => {
      if (canvasState.tool === ToolType.MOUSE) {
        dragInfoRef.current = {
          shapeId,
          modelPositions: new Map([[shapeId, { ...(shapes.find((s) => s.id === shapeId)?.position ?? { x: 0, y: 0 }) }]]),
          nodePositions: new Map(),
        };
        setSelectedShapeIds([shapeId]);
        return;
      }

      let ids = selectedShapeIds.includes(shapeId) ? [...selectedShapeIds] : [shapeId];

      // Include all group members for any grouped shape in the set
      const groupIdsToInclude = new Set<string>();
      for (const id of ids) {
        const s = shapes.find((sh) => sh.id === id);
        if (s?.groupId) groupIdsToInclude.add(s.groupId);
      }
      if (groupIdsToInclude.size > 0) {
        const allGroupMembers = shapes
          .filter((s) => s.groupId && groupIdsToInclude.has(s.groupId))
          .map((s) => s.id);
        ids = Array.from(new Set([...ids, ...allGroupMembers]));
      }

      const modelPositions = new Map<string, Position>();
      const nodePositions = new Map<string, Position>();
      const stage = stageRef.current;

      for (const id of ids) {
        const s = shapes.find((sh) => sh.id === id);
        if (s) modelPositions.set(id, { ...s.position });
        if (stage) {
          const node = stage.findOne(`#${id}`);
          if (node) nodePositions.set(id, { x: node.x(), y: node.y() });
        }
      }

      dragInfoRef.current = { shapeId, modelPositions, nodePositions };

      if (!selectedShapeIds.includes(shapeId)) {
        // Select all dragged shapes (including group members)
        setSelectedShapeIds(ids);
      }
    },
    [canvasState.tool, shapes, selectedShapeIds, setSelectedShapeIds],
  );

  // Real-time companion movement during drag
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof stage.on !== 'function') return;

    const handleDragMove = () => {
      const info = dragInfoRef.current;
      if (!info || info.modelPositions.size <= 1) return;

      const draggedNode = stage.findOne(`#${info.shapeId}`);
      if (!draggedNode) return;

      const startNodePos = info.nodePositions.get(info.shapeId);
      if (!startNodePos) return;

      const dx = draggedNode.x() - startNodePos.x;
      const dy = draggedNode.y() - startNodePos.y;

      for (const [id, startPos] of info.nodePositions) {
        if (id === info.shapeId) continue;
        const node = stage.findOne(`#${id}`);
        if (node) {
          node.x(startPos.x + dx);
          node.y(startPos.y + dy);
        }
      }
    };

    stage.on('dragmove', handleDragMove);
    return () => { stage.off('dragmove', handleDragMove); };
  });

  const handleShapeDragEnd = useCallback(
    (shapeId: string, position: Position) => {
      const info = dragInfoRef.current;
      updateShapePosition(shapeId, position);

      // Move all other selected shapes by the same delta
      if (info && info.shapeId === shapeId && info.modelPositions.size > 1) {
        const startPos = info.modelPositions.get(shapeId);
        if (startPos) {
          const dx = position.x - startPos.x;
          const dy = position.y - startPos.y;
          for (const [id, origPos] of info.modelPositions) {
            if (id === shapeId) continue;
            updateShapePosition(id, {
              x: origPos.x + dx,
              y: origPos.y + dy,
            });
          }
        }
      }

      dragInfoRef.current = null;
      commitToStore();
    },
    [updateShapePosition, commitToStore],
  );

  // Wrap color/style setters to also update selected shapes
  const handleSetFillColor = useCallback(
    (color: string) => {
      setFillColor(color);
      for (const id of selectedShapeIds) {
        updateShapeStyle(id, { fill: color });
      }
    },
    [setFillColor, selectedShapeIds, updateShapeStyle],
  );

  const handleSetStrokeColor = useCallback(
    (color: string) => {
      setStrokeColor(color);
      for (const id of selectedShapeIds) {
        updateShapeStyle(id, { stroke: color });
      }
    },
    [setStrokeColor, selectedShapeIds, updateShapeStyle],
  );

  const handleSetStrokeWidth = useCallback(
    (width: number) => {
      setStrokeWidth(width);
      for (const id of selectedShapeIds) {
        updateShapeStyle(id, { strokeWidth: width });
      }
    },
    [setStrokeWidth, selectedShapeIds, updateShapeStyle],
  );

  const handleSetOpacity = useCallback(
    (opacity: number) => {
      setOpacity(opacity);
      for (const id of selectedShapeIds) {
        updateShapeStyle(id, { opacity });
      }
    },
    [setOpacity, selectedShapeIds, updateShapeStyle],
  );

  const handleSetRoughness = useCallback(
    (roughness: number) => {
      setRoughness(roughness);
      for (const id of selectedShapeIds) {
        updateShapeStyle(id, { roughness });
      }
    },
    [setRoughness, selectedShapeIds, updateShapeStyle],
  );

  const renderPreview = () => {
    if (!drawStartPos || !currentDrawPos) return null;
    const x = Math.min(drawStartPos.x, currentDrawPos.x);
    const y = Math.min(drawStartPos.y, currentDrawPos.y);
    const w = Math.abs(currentDrawPos.x - drawStartPos.x);
    const h = Math.abs(currentDrawPos.y - drawStartPos.y);
    const previewStyle = {
      fill: canvasState.fillColor,
      stroke: canvasState.strokeColor,
      strokeWidth: canvasState.strokeWidth,
      opacity: canvasState.opacity * 0.5,
      dash: [5, 5],
    };
    switch (canvasState.tool) {
      case ToolType.RECT:
        return <Rect x={x} y={y} width={w} height={h} {...previewStyle} />;
      case ToolType.ELLIPSE:
        return <Ellipse x={x + w / 2} y={y + h / 2} radiusX={w / 2} radiusY={h / 2} {...previewStyle} />;
      case ToolType.LINE:
        return <Line points={[drawStartPos.x, drawStartPos.y, currentDrawPos.x, currentDrawPos.y]} stroke={canvasState.strokeColor} strokeWidth={canvasState.strokeWidth} opacity={canvasState.opacity * 0.5} dash={[5, 5]} />;
      case ToolType.ARROW:
        return <Arrow points={[drawStartPos.x, drawStartPos.y, currentDrawPos.x, currentDrawPos.y]} fill={canvasState.strokeColor} stroke={canvasState.strokeColor} strokeWidth={canvasState.strokeWidth} opacity={canvasState.opacity * 0.5} pointerLength={10} pointerWidth={10} dash={[5, 5]} />;
      case ToolType.TEXT:
        return <Text x={drawStartPos.x} y={drawStartPos.y} text="Text" fontSize={canvasState.fontSize} fill={canvasState.fontColor} opacity={0.5} />;
      default:
        return null;
    }
  };

  // Render group bounding boxes (dashed outline for grouped shapes)
  const renderGroupOutlines = () => {
    const groupIds = new Set(
      shapes.filter((s) => s.groupId).map((s) => s.groupId!),
    );
    return Array.from(groupIds).map((gid) => {
      const groupShapes = shapes.filter((s) => s.groupId === gid);
      if (groupShapes.length < 2) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const s of groupShapes) {
        minX = Math.min(minX, s.position.x);
        minY = Math.min(minY, s.position.y);
        maxX = Math.max(maxX, s.position.x + s.dimension.width);
        maxY = Math.max(maxY, s.position.y + s.dimension.height);
      }
      const pad = 6;
      const isGroupSelected = groupShapes.some((s) =>
        selectedShapeIds.includes(s.id),
      );
      return (
        <Rect
          key={`group-${gid}`}
          x={minX - pad}
          y={minY - pad}
          width={maxX - minX + pad * 2}
          height={maxY - minY + pad * 2}
          fill="transparent"
          stroke={isGroupSelected ? '#38bdf8' : 'rgba(148,163,184,0.4)'}
          strokeWidth={1}
          dash={[6, 4]}
          cornerRadius={4}
          listening={false}
        />
      );
    });
  };

  // Render rubber-band selection rectangle
  const renderSelectionRect = () => {
    if (!selectionStart || !selectionCurrent) return null;
    const x = Math.min(selectionStart.x, selectionCurrent.x);
    const y = Math.min(selectionStart.y, selectionCurrent.y);
    const w = Math.abs(selectionCurrent.x - selectionStart.x);
    const h = Math.abs(selectionCurrent.y - selectionStart.y);
    return (
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="rgba(56, 189, 248, 0.1)"
        stroke="#38bdf8"
        strokeWidth={1}
        dash={[4, 4]}
        listening={false}
      />
    );
  };

  const getCursor = () => {
    if (isPanMode) return isPanning ? 'grabbing' : 'grab';
    switch (canvasState.tool) {
      case ToolType.SELECT: return 'default';
      case ToolType.MOUSE: return 'default';
      case ToolType.ERASER: return 'crosshair';
      case ToolType.TEXT: return 'text';
      case ToolType.ARROW: return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='5' y1='19' x2='19' y2='5'/%3E%3Cpolyline points='10 5 19 5 19 14'/%3E%3C/svg%3E") 12 12, crosshair`;
      default: return 'crosshair';
    }
  };

  // Convert canvas coords to screen coords for text input overlay
  const textScreenPos = {
    x: textInputPos.x * scale + stagePos.x,
    y: textInputPos.y * scale + stagePos.y,
  };

  const zoomPercent = Math.round(scale * 100);

  return (
    <div
      className="canvas-editor"
      ref={containerRef}
      style={styles.container}
    >
      <div style={{ ...styles.stageContainer, cursor: getCursor() }}>
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ backgroundColor: CANVAS_BACKGROUND_COLOR }}
        >
          <Layer>
            <Rect
              name="canvas-background"
              x={-VIRTUAL_CANVAS_SIZE / 2}
              y={-VIRTUAL_CANVAS_SIZE / 2}
              width={VIRTUAL_CANVAS_SIZE}
              height={VIRTUAL_CANVAS_SIZE}
              fill={CANVAS_BACKGROUND_COLOR}
              listening={true}
            />
            {shapes.map((shape) => (
              <ShapeComponent
                key={shape.id}
                shape={shape}
                isSelected={selectedShapeIds.includes(shape.id)}
                isDraggable={(canvasState.tool === ToolType.SELECT || canvasState.tool === ToolType.MOUSE) && !isPanMode}
                onSelect={(e) => handleShapeSelect(shape.id, e)}
                onUpdate={(updates) => handleShapeUpdate(shape.id, updates)}
                onDragStart={() => handleShapeDragStart(shape.id)}
                onDragEnd={(pos) => handleShapeDragEnd(shape.id, pos)}
              />
            ))}
            {renderGroupOutlines()}
            {renderPreview()}
            {renderSelectionRect()}
          </Layer>
        </Stage>

        {/* Text input overlay */}
        {textInputVisible && (
          <textarea
            ref={textInputRef}
            placeholder="Enter text..."
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={handleTextInputSubmit}
            onBlur={handleTextInputBlur}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              ...styles.textInput,
              top: textScreenPos.y,
              left: textScreenPos.x,
              fontFamily: canvasState.roughness > 0 ? HAND_DRAWN_FONT : canvasState.fontFamily,
              fontSize: `${canvasState.fontSize * scale}px`,
              color: canvasState.fontColor,
              ...(canvasState.textMaxWidth > 0
                ? { width: `${canvasState.textMaxWidth * scale}px`, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const }
                : { whiteSpace: 'nowrap' as const }),
            }}
            rows={1}
            autoFocus
          />
        )}

        {/* Floating toolbar overlay (Excalidraw-style) */}
        <CanvasToolbar
          canvasState={canvasState}
          onSetTool={setTool}
          onSetFillColor={handleSetFillColor}
          onSetStrokeColor={handleSetStrokeColor}
          onSetStrokeWidth={handleSetStrokeWidth}
          onSetOpacity={handleSetOpacity}
          onSetRoughness={handleSetRoughness}
          onSetFontFamily={setFontFamily}
          onSetFontSize={setFontSize}
          onSetTextMaxWidth={setTextMaxWidth}
          canUndo={canUndo}
          onUndo={undo}
          canRedo={canRedo}
          onRedo={redo}
          onClearAll={clearAllShapes}
          hasSelection={selectedShapeIds.length > 0}
          hasMultiSelection={selectedShapeIds.length >= 2}
          onGroup={groupSelectedShapes}
          onUngroup={ungroupSelectedShapes}
          hasGroupInSelection={shapes.some(
            (s) => selectedShapeIds.includes(s.id) && !!s.groupId,
          )}
          onExportPng={() => exportCanvas('png')}
          onExportJpeg={() => exportCanvas('jpeg')}
          hasShapes={shapes.length > 0}
        />

        {/* Bottom-center: Zoom indicator */}
        <div style={styles.zoomBar}>
          <Island padding={6} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              style={styles.zoomButton}
              onClick={() => setScale((s) => Math.max(s / ZOOM_STEP, ZOOM_MIN))}
              title="Zoom out"
            >
              −
            </button>
            <span style={styles.zoomLabel}>{zoomPercent}%</span>
            <button
              style={styles.zoomButton}
              onClick={() => setScale((s) => Math.min(s * ZOOM_STEP, ZOOM_MAX))}
              title="Zoom in"
            >
              +
            </button>
            <button
              style={styles.zoomButton}
              onClick={() => { setScale(1); setStagePos({ x: 0, y: 0 }); }}
              title="Reset zoom"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
          </Island>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: CANVAS_BACKGROUND_COLOR,
  },
  stageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  textInput: {
    position: 'absolute',
    background: 'rgba(26, 26, 46, 0.9)',
    border: '2px solid rgba(0, 212, 255, 0.5)',
    borderRadius: '6px',
    padding: '6px 10px',
    outline: 'none',
    minWidth: '150px',
    zIndex: 1000,
    resize: 'none',
    overflow: 'hidden',
    lineHeight: 1.5,
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
  },
  zoomBar: {
    position: 'absolute',
    bottom: '14px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
  },
  zoomButton: {
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    transition: 'color 0.12s ease',
  },
  zoomLabel: {
    fontSize: '11px',
    color: '#64748b',
    minWidth: '40px',
    textAlign: 'center',
    fontFamily: 'monospace',
    fontWeight: 500,
  },
};

export default CanvasEditor;
