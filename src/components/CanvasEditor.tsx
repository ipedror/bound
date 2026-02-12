// ============================================================
// CanvasEditor - Main canvas editor component
// ============================================================

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Arrow, Ellipse, Text } from 'react-konva';
import type Konva from 'konva';
import { useCanvasEditor } from '../hooks/useCanvasEditor';
import { CanvasToolbar } from './CanvasToolbar';
import { ShapeComponent } from './shapes/ShapeComponent';
import { ShapeFactory } from '../utils/canvas/shapeFactory';
import { ToolType } from '../types/canvas';
import { ShapeType } from '../types/enums';
import type { Position } from '../types/base';
import {
  CANVAS_BACKGROUND_COLOR,
  CANVAS_DEFAULT_WIDTH,
  CANVAS_DEFAULT_HEIGHT,
} from '../constants/canvas';

interface CanvasEditorProps {
  contentId: string;
  width?: number;
  height?: number;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  contentId,
  width = CANVAS_DEFAULT_WIDTH,
  height = CANVAS_DEFAULT_HEIGHT,
}) => {
  const {
    canvasState,
    shapes,
    selectedShapeId,
    setTool,
    setFillColor,
    setStrokeColor,
    setStrokeWidth,
    setOpacity,
    setFontFamily,
    setFontSize,
    setSelectedShapeId,
    addShape,
    removeShape,
    updateShape,
    updateShapePosition,
    clearAllShapes,
    undo,
    redo,
    canUndo,
    canRedo,
    commitToStore,
  } = useCanvasEditor(contentId);

  const stageRef = useRef<Konva.Stage>(null);
  const [drawStartPos, setDrawStartPos] = useState<Position | null>(null);
  const [currentDrawPos, setCurrentDrawPos] = useState<Position | null>(null);
  const [textInputVisible, setTextInputVisible] = useState(false);
  const [textInputPos, setTextInputPos] = useState<Position>({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);
  const textInputJustOpenedRef = useRef(false);

  // Focus text input when it becomes visible
  useEffect(() => {
    if (textInputVisible && textInputRef.current) {
      // Mark that input just opened to prevent immediate blur
      textInputJustOpenedRef.current = true;
      
      // Delay to ensure the input is rendered and mouseUp has finished
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
        // After focus is stable, allow blur to work
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
      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // Delete selected shape
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedShapeId && document.activeElement === document.body) {
          e.preventDefault();
          removeShape(selectedShapeId);
        }
      }
      // Escape: deselect
      if (e.key === 'Escape') {
        setSelectedShapeId(undefined);
        setDrawStartPos(null);
        setCurrentDrawPos(null);
        setTextInputVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedShapeId, removeShape, setSelectedShapeId]);

  // Get mouse position relative to stage
  const getPointerPosition = useCallback((): Position | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x, y: pos.y };
  }, []);

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // If text input is visible, ignore stage clicks (let blur handle it)
      if (textInputVisible) return;

      const pos = getPointerPosition();
      if (!pos) return;

      // Click on empty space - deselect
      if (e.target === e.target.getStage()) {
        setSelectedShapeId(undefined);
      }

      // Start drawing if not select or eraser
      if (canvasState.tool !== ToolType.SELECT && canvasState.tool !== ToolType.ERASER) {
        if (canvasState.tool === ToolType.TEXT) {
          // For text, show input at click position
          setTextInputPos(pos);
          setTextInputValue('');
          setTextInputVisible(true);
        } else {
          setDrawStartPos(pos);
          setCurrentDrawPos(pos);
        }
      }

      // Eraser: delete clicked shape
      if (canvasState.tool === ToolType.ERASER) {
        const clickedShape = shapes.find((s) => {
          // Simple bounding box check
          const inX = pos.x >= s.position.x && pos.x <= s.position.x + s.dimension.width;
          const inY = pos.y >= s.position.y && pos.y <= s.position.y + s.dimension.height;
          return inX && inY;
        });
        if (clickedShape) {
          removeShape(clickedShape.id);
        }
      }
    },
    [canvasState.tool, getPointerPosition, setSelectedShapeId, shapes, removeShape, textInputVisible],
  );

  // Handle mouse move
  const handleMouseMove = useCallback(() => {
    if (!drawStartPos) return;
    const pos = getPointerPosition();
    if (!pos) return;
    setCurrentDrawPos(pos);
  }, [drawStartPos, getPointerPosition]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    // Don't process mouse up if text input is active
    if (textInputVisible) return;
    if (!drawStartPos || !currentDrawPos) return;
    
    // Calculate dimension
    const minWidth = Math.abs(currentDrawPos.x - drawStartPos.x);
    const minHeight = Math.abs(currentDrawPos.y - drawStartPos.y);
    
    // Only create shape if it has reasonable size
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
  }, [drawStartPos, currentDrawPos, canvasState, addShape, textInputVisible]);

  // Handle text input submit
  const handleTextInputSubmit = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
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

  // Handle text input blur - close and create text when clicking outside
  const handleTextInputBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Ignore blur if input just opened (prevents mouseUp from closing it)
    if (textInputJustOpenedRef.current) {
      // Re-focus input
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 0);
      return;
    }
    
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    // If clicking on a button in the toolbar, refocus the input briefly then close
    // This allows toolbar buttons to work while input is open
    if (relatedTarget && relatedTarget.closest('.canvas-toolbar')) {
      // Let the toolbar button click process, then close input
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
    
    // For any other blur (clicking canvas, outside, etc.), close and create text
    const text = textInputValue.trim();
    if (text) {
      const shape = ShapeFactory.createText(text, textInputPos, canvasState);
      addShape(shape);
    }
    setTextInputVisible(false);
    setTextInputValue('');
  }, [textInputPos, textInputValue, canvasState, addShape]);

  // Handle shape selection
  const handleShapeSelect = useCallback(
    (shapeId: string) => {
      if (canvasState.tool === ToolType.SELECT) {
        setSelectedShapeId(shapeId);
      }
    },
    [canvasState.tool, setSelectedShapeId],
  );

  // Handle shape update
  const handleShapeUpdate = useCallback(
    (shapeId: string, updates: Partial<typeof shapes[0]>) => {
      updateShape(shapeId, updates);
    },
    [updateShape],
  );

  // Handle shape drag end
  const handleShapeDragEnd = useCallback(
    (shapeId: string, position: Position) => {
      updateShapePosition(shapeId, position);
      // Push to history after drag completes
      commitToStore();
    },
    [updateShapePosition, commitToStore],
  );

  // Render preview shape while drawing
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
        return (
          <Rect
            x={x}
            y={y}
            width={w}
            height={h}
            {...previewStyle}
          />
        );
      case ToolType.ELLIPSE:
        return (
          <Ellipse
            x={x + w / 2}
            y={y + h / 2}
            radiusX={w / 2}
            radiusY={h / 2}
            {...previewStyle}
          />
        );
      case ToolType.LINE:
        return (
          <Line
            points={[drawStartPos.x, drawStartPos.y, currentDrawPos.x, currentDrawPos.y]}
            stroke={canvasState.strokeColor}
            strokeWidth={canvasState.strokeWidth}
            opacity={canvasState.opacity * 0.5}
            dash={[5, 5]}
          />
        );
      case ToolType.ARROW:
        return (
          <Arrow
            points={[drawStartPos.x, drawStartPos.y, currentDrawPos.x, currentDrawPos.y]}
            fill={canvasState.strokeColor}
            stroke={canvasState.strokeColor}
            strokeWidth={canvasState.strokeWidth}
            opacity={canvasState.opacity * 0.5}
            pointerLength={10}
            pointerWidth={10}
            dash={[5, 5]}
          />
        );
      case ToolType.TEXT:
        return (
          <Text
            x={drawStartPos.x}
            y={drawStartPos.y}
            text="Text"
            fontSize={canvasState.fontSize}
            fill={canvasState.fontColor}
            opacity={0.5}
          />
        );
      default:
        return null;
    }
  };

  // Determine cursor based on tool
  const getCursor = () => {
    switch (canvasState.tool) {
      case ToolType.SELECT:
        return 'default';
      case ToolType.ERASER:
        return 'crosshair';
      case ToolType.TEXT:
        return 'text';
      default:
        return 'crosshair';
    }
  };

  return (
    <div className="canvas-editor" style={styles.container}>
      <div
        style={{
          ...styles.stageContainer,
          cursor: getCursor(),
        }}
      >
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ backgroundColor: CANVAS_BACKGROUND_COLOR }}
        >
          <Layer>
            {/* Background rect for click detection */}
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill={CANVAS_BACKGROUND_COLOR}
              listening={true}
            />

            {/* Render shapes */}
            {shapes.map((shape) => (
              <ShapeComponent
                key={shape.id}
                shape={shape}
                isSelected={shape.id === selectedShapeId}
                onSelect={() => handleShapeSelect(shape.id)}
                onUpdate={(updates) => handleShapeUpdate(shape.id, updates)}
                onDragEnd={(pos) => handleShapeDragEnd(shape.id, pos)}
              />
            ))}

            {/* Drawing preview */}
            {renderPreview()}
          </Layer>
        </Stage>

        {/* Text input overlay */}
        {textInputVisible && (
          <input
            ref={textInputRef}
            type="text"
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
              top: textInputPos.y,
              left: textInputPos.x,
              fontFamily: canvasState.fontFamily,
              fontSize: `${canvasState.fontSize}px`,
              color: canvasState.fontColor,
            }}
            autoFocus
          />
        )}
      </div>

      <CanvasToolbar
        canvasState={canvasState}
        onSetTool={setTool}
        onSetFillColor={setFillColor}
        onSetStrokeColor={setStrokeColor}
        onSetStrokeWidth={setStrokeWidth}
        onSetOpacity={setOpacity}
        onSetFontFamily={setFontFamily}
        onSetFontSize={setFontSize}
        canUndo={canUndo}
        onUndo={undo}
        canRedo={canRedo}
        onRedo={redo}
        onClearAll={clearAllShapes}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  stageContainer: {
    position: 'relative',
  },
  textInput: {
    position: 'absolute',
    background: 'rgba(30, 41, 59, 0.95)',
    border: '2px solid #00d4ff',
    borderRadius: '4px',
    padding: '4px 8px',
    outline: 'none',
    minWidth: '150px',
    zIndex: 1000,
  },
};

export default CanvasEditor;
