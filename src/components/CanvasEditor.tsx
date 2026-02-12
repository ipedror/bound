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
  }, [undo, redo, selectedShapeIds, removeShape, setSelectedShapeIds]);

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
        } else {
          // Find the shape that was clicked by walking up the Konva tree
          let node: Konva.Node | null = e.target;
          let targetId: string | undefined;
          while (node && node !== e.target.getStage()) {
            const nodeId = node.id?.();
            if (nodeId && shapes.some((s) => s.id === nodeId)) {
              targetId = nodeId;
              break;
            }
            node = node.parent;
          }
          if (targetId) {
            const nativeEvent = e.evt;
            if (nativeEvent?.shiftKey) {
              toggleShapeSelection(targetId);
            } else {
              setSelectedShapeIds([targetId]);
            }
          }
        }
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
    [canvasState.tool, getPointerPosition, setSelectedShapeIds, toggleShapeSelection, shapes, removeShape, textInputVisible],
  );

  const handleMouseMove = useCallback(() => {
    const pos = getPointerPosition();
    if (!pos) return;

    // Update rubber-band selection rectangle
    if (selectionStart) {
      setSelectionCurrent(pos);
      return;
    }

    if (!drawStartPos) return;
    setCurrentDrawPos(pos);
  }, [drawStartPos, selectionStart, getPointerPosition]);

  const handleMouseUp = useCallback((e?: Konva.KonvaEventObject<MouseEvent>) => {
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
  }, [selectionStart, selectionCurrent, drawStartPos, currentDrawPos, canvasState, addShape, textInputVisible, shapes, setSelectedShapeIds]);

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
      if (canvasState.tool === ToolType.SELECT) {
        const nativeEvent = e && 'evt' in e ? e.evt : e;
        if (nativeEvent && (nativeEvent as MouseEvent).shiftKey) {
          toggleShapeSelection(shapeId);
        } else {
          setSelectedShapeIds([shapeId]);
        }
      }
    },
    [canvasState.tool, setSelectedShapeIds, toggleShapeSelection],
  );

  const handleShapeUpdate = useCallback(
    (shapeId: string, updates: Partial<typeof shapes[0]>) => {
      updateShape(shapeId, updates);
    },
    [updateShape],
  );

  const handleShapeDragEnd = useCallback(
    (shapeId: string, position: Position) => {
      updateShapePosition(shapeId, position);
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
    switch (canvasState.tool) {
      case ToolType.SELECT: return 'default';
      case ToolType.ERASER: return 'crosshair';
      case ToolType.TEXT: return 'text';
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
                isDraggable={canvasState.tool === ToolType.SELECT}
                onSelect={(e) => handleShapeSelect(shape.id, e)}
                onUpdate={(updates) => handleShapeUpdate(shape.id, updates)}
                onDragEnd={(pos) => handleShapeDragEnd(shape.id, pos)}
              />
            ))}
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
              fontFamily: canvasState.fontFamily,
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
          onSetFontFamily={setFontFamily}
          onSetFontSize={setFontSize}
          onSetTextMaxWidth={setTextMaxWidth}
          canUndo={canUndo}
          onUndo={undo}
          canRedo={canRedo}
          onRedo={redo}
          onClearAll={clearAllShapes}
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
    background: CANVAS_BACKGROUND_COLOR,
    border: '2px solid #00d4ff',
    borderRadius: '4px',
    padding: '4px 8px',
    outline: 'none',
    minWidth: '150px',
    zIndex: 1000,
    resize: 'none',
    overflow: 'hidden',
    lineHeight: 1.5,
    fontFamily: 'inherit',
  },
  zoomBar: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
  },
  zoomButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    border: '1px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  zoomLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    minWidth: '36px',
    textAlign: 'center',
  },
};

export default CanvasEditor;
