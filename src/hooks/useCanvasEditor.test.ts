// ============================================================
// useCanvasEditor Hook Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore, resetStore } from '../store/appStore';
import { useCanvasEditor } from './useCanvasEditor';
import { ShapeFactory } from '../utils/canvas/shapeFactory';
import { DEFAULT_CANVAS_STATE } from '../constants/canvas';
import { ToolType } from '../types/canvas';
import { ShapeType } from '../types/enums';

describe('useCanvasEditor', () => {
  let areaId: string;
  let contentId: string;

  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
    areaId = useAppStore.getState().createArea('Test Area');
    contentId = useAppStore.getState().createContent(areaId, 'Test Content');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default canvas state', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      expect(result.current.canvasState.tool).toBe(DEFAULT_CANVAS_STATE.tool);
      expect(result.current.canvasState.fillColor).toBe(DEFAULT_CANVAS_STATE.fillColor);
      expect(result.current.canvasState.strokeColor).toBe(DEFAULT_CANVAS_STATE.strokeColor);
    });

    it('should initialize with empty shapes array', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      expect(result.current.shapes).toEqual([]);
    });

    it('should handle undefined contentId', () => {
      const { result } = renderHook(() => useCanvasEditor(undefined));

      expect(result.current.shapes).toEqual([]);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('Tool Management', () => {
    it('should set tool', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      act(() => {
        result.current.setTool(ToolType.RECT);
      });

      expect(result.current.canvasState.tool).toBe(ToolType.RECT);
    });

    it('should clear selection when changing tools', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      // Add a shape and select it
      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
        result.current.setSelectedShapeId(shape.id);
      });

      expect(result.current.selectedShapeId).toBe(shape.id);

      // Change tool - should clear selection
      act(() => {
        result.current.setTool(ToolType.ELLIPSE);
      });

      expect(result.current.selectedShapeId).toBeUndefined();
    });
  });

  describe('Style Management', () => {
    it('should set fill color', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      act(() => {
        result.current.setFillColor('#ff0000');
      });

      expect(result.current.canvasState.fillColor).toBe('#ff0000');
    });

    it('should set stroke color', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      act(() => {
        result.current.setStrokeColor('#00ff00');
      });

      expect(result.current.canvasState.strokeColor).toBe('#00ff00');
    });

    it('should set stroke width', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      act(() => {
        result.current.setStrokeWidth(5);
      });

      expect(result.current.canvasState.strokeWidth).toBe(5);
    });

    it('should set opacity', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      act(() => {
        result.current.setOpacity(0.5);
      });

      expect(result.current.canvasState.opacity).toBe(0.5);
    });

    it('should set font family', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      act(() => {
        result.current.setFontFamily('Georgia');
      });

      expect(result.current.canvasState.fontFamily).toBe('Georgia');
    });

    it('should set font size', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      act(() => {
        result.current.setFontSize(24);
      });

      expect(result.current.canvasState.fontSize).toBe(24);
    });
  });

  describe('Shape Operations', () => {
    it('should add shape', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
      });

      expect(result.current.shapes).toHaveLength(1);
      expect(result.current.shapes[0].id).toBe(shape.id);
    });

    it('should remove shape', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
      });

      expect(result.current.shapes).toHaveLength(1);

      act(() => {
        result.current.removeShape(shape.id);
      });

      expect(result.current.shapes).toHaveLength(0);
    });

    it('should clear selection when removing selected shape', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
        result.current.setSelectedShapeId(shape.id);
      });

      expect(result.current.selectedShapeId).toBe(shape.id);

      act(() => {
        result.current.removeShape(shape.id);
      });

      expect(result.current.selectedShapeId).toBeUndefined();
    });

    it('should update shape', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
      });

      act(() => {
        result.current.updateShape(shape.id, { position: { x: 50, y: 50 } });
      });

      expect(result.current.shapes[0].position).toEqual({ x: 50, y: 50 });
    });

    it('should update shape position', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
      });

      act(() => {
        result.current.updateShapePosition(shape.id, { x: 100, y: 100 });
      });

      expect(result.current.shapes[0].position).toEqual({ x: 100, y: 100 });
    });

    it('should update shape style', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
      });

      act(() => {
        result.current.updateShapeStyle(shape.id, { fill: '#ff0000' });
      });

      expect(result.current.shapes[0].style.fill).toBe('#ff0000');
    });

    it('should clear all shapes', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape1 = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      const shape2 = ShapeFactory.createRect(
        { x: 150, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape1);
      });

      act(() => {
        result.current.addShape(shape2);
      });

      expect(result.current.shapes).toHaveLength(2);

      act(() => {
        result.current.clearAllShapes();
      });

      expect(result.current.shapes).toHaveLength(0);
    });
  });

  describe('Undo/Redo', () => {
    it('should enable undo after adding shape', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      expect(result.current.canUndo).toBe(false);

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
      });

      expect(result.current.canUndo).toBe(true);
    });

    it('should undo shape addition', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
      });

      expect(result.current.shapes).toHaveLength(1);

      act(() => {
        result.current.undo();
      });

      expect(result.current.shapes).toHaveLength(0);
    });

    it('should enable redo after undo', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
      });

      expect(result.current.canRedo).toBe(false);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);
    });

    it('should redo shape addition', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.shapes).toHaveLength(0);

      act(() => {
        result.current.redo();
      });

      expect(result.current.shapes).toHaveLength(1);
    });

    it('should clear redo stack on new action', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape1 = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      const shape2 = ShapeFactory.createRect(
        { x: 150, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape1);
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      act(() => {
        result.current.addShape(shape2);
      });

      expect(result.current.canRedo).toBe(false);
    });

    it('should handle multiple undo/redo operations', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape1 = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      const shape2 = ShapeFactory.createRect(
        { x: 150, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      const shape3 = ShapeFactory.createRect(
        { x: 300, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape1);
      });

      act(() => {
        result.current.addShape(shape2);
      });

      act(() => {
        result.current.addShape(shape3);
      });

      expect(result.current.shapes).toHaveLength(3);

      // Undo 3 times
      act(() => {
        result.current.undo();
      });
      expect(result.current.shapes).toHaveLength(2);

      act(() => {
        result.current.undo();
      });
      expect(result.current.shapes).toHaveLength(1);

      act(() => {
        result.current.undo();
      });
      expect(result.current.shapes).toHaveLength(0);

      // Redo 2 times
      act(() => {
        result.current.redo();
      });
      expect(result.current.shapes).toHaveLength(1);

      act(() => {
        result.current.redo();
      });
      expect(result.current.shapes).toHaveLength(2);
    });
  });

  describe('Drawing Operations', () => {
    it('should start drawing with non-select tool', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      act(() => {
        result.current.setTool(ToolType.RECT);
      });

      act(() => {
        result.current.startDrawing({ x: 10, y: 10 });
      });

      expect(result.current.isDrawing).toBe(true);
    });

    it('should not start drawing with select tool', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      act(() => {
        result.current.setTool(ToolType.SELECT);
      });

      act(() => {
        result.current.startDrawing({ x: 10, y: 10 });
      });

      expect(result.current.isDrawing).toBe(false);
    });

    it('should cancel drawing', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      act(() => {
        result.current.setTool(ToolType.RECT);
      });

      act(() => {
        result.current.startDrawing({ x: 10, y: 10 });
      });

      expect(result.current.isDrawing).toBe(true);

      act(() => {
        result.current.cancelDrawing();
      });

      expect(result.current.isDrawing).toBe(false);
    });
  });

  describe('Auto-save with Debounce', () => {
    it('should debounce save to store', async () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      act(() => {
        result.current.addShape(shape);
      });

      // Should have local shape immediately
      expect(result.current.shapes).toHaveLength(1);

      // Store should not have shape yet (debounce)
      let content = useAppStore.getState().state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toHaveLength(0);

      // Advance timers to trigger debounce
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // Now store should have the shape
      content = useAppStore.getState().state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toHaveLength(1);
    });
  });

  describe('Shape Type Creation', () => {
    it('should handle all shape types', () => {
      const { result } = renderHook(() => useCanvasEditor(contentId));

      // Add different shape types
      const rect = ShapeFactory.createRect({ x: 10, y: 10 }, { width: 100, height: 50 }, DEFAULT_CANVAS_STATE);
      const ellipse = ShapeFactory.createEllipse({ x: 150, y: 10 }, { width: 80, height: 60 }, DEFAULT_CANVAS_STATE);
      const line = ShapeFactory.createLine({ x: 0, y: 0 }, [0, 0, 100, 100], DEFAULT_CANVAS_STATE);
      const arrow = ShapeFactory.createArrow({ x: 0, y: 0 }, [0, 0, 100, 50], DEFAULT_CANVAS_STATE);
      const text = ShapeFactory.createText('Test', { x: 300, y: 10 }, DEFAULT_CANVAS_STATE);

      act(() => {
        result.current.addShape(rect);
      });

      act(() => {
        result.current.addShape(ellipse);
      });

      act(() => {
        result.current.addShape(line);
      });

      act(() => {
        result.current.addShape(arrow);
      });

      act(() => {
        result.current.addShape(text);
      });

      expect(result.current.shapes).toHaveLength(5);

      const types = result.current.shapes.map((s) => s.type);
      expect(types).toContain(ShapeType.RECT);
      expect(types).toContain(ShapeType.ELLIPSE);
      expect(types).toContain(ShapeType.LINE);
      expect(types).toContain(ShapeType.ARROW);
      expect(types).toContain(ShapeType.TEXT);
    });
  });
});
