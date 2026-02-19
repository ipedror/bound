// ============================================================
// Canvas Editor Integration Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAppStore, resetStore } from '../../store/appStore';
import { ShapeFactory } from '../../utils/canvas/shapeFactory';
import { CanvasUndoRedoManager } from '../../managers/CanvasUndoRedoManager';
import { DEFAULT_CANVAS_STATE } from '../../constants/canvas';
import { ShapeType } from '../../types/enums';
import type { Shape } from '../../types/shape';

describe('Canvas Editor Integration', () => {
  let areaId: string;
  let contentId: string;

  beforeEach(() => {
    // Reset store to clean state
    resetStore();

    // Create test area and content using store methods
    areaId = useAppStore.getState().createArea('Test Area');
    contentId = useAppStore.getState().createContent(areaId, 'Test Content');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Shape Persistence', () => {
    it('should persist shapes to content body', () => {
      const { addShapeToContent } = useAppStore.getState();

      // Create shapes
      const rectShape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      const ellipseShape = ShapeFactory.createEllipse(
        { x: 150, y: 100 },
        { width: 80, height: 60 },
        DEFAULT_CANVAS_STATE,
      );
      const textShape = ShapeFactory.createText(
        'Hello World',
        { x: 200, y: 200 },
        DEFAULT_CANVAS_STATE,
      );

      // Add shapes to content
      addShapeToContent(contentId, rectShape);
      addShapeToContent(contentId, ellipseShape);
      addShapeToContent(contentId, textShape);

      // Verify content has 3 shapes
      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toHaveLength(3);
      expect(content?.body.shapes.map((s) => s.type)).toEqual([
        ShapeType.RECT,
        ShapeType.ELLIPSE,
        ShapeType.TEXT,
      ]);
    });

    it('should persist shape updates', () => {
      const { addShapeToContent, updateShapeInContent } = useAppStore.getState();

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      addShapeToContent(contentId, shape);

      // Update position
      updateShapeInContent(contentId, shape.id, {
        position: { x: 50, y: 50 },
      });

      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes[0].position).toEqual({ x: 50, y: 50 });
    });

    it('should persist shape deletion', () => {
      const { addShapeToContent, removeShapeFromContent } = useAppStore.getState();

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

      addShapeToContent(contentId, shape1);
      addShapeToContent(contentId, shape2);

      // Verify 2 shapes
      let content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toHaveLength(2);

      // Delete one
      removeShapeFromContent(contentId, shape1.id);

      // Verify 1 shape remains
      content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toHaveLength(1);
      expect(content?.body.shapes[0].id).toBe(shape2.id);
    });

    it('should handle batch operations', () => {
      const { addShapeToContent, removeShapeFromContent } = useAppStore.getState();

      // Add 5 shapes
      const shapes: Shape[] = [];
      for (let i = 0; i < 5; i++) {
        const shape = ShapeFactory.createRect(
          { x: i * 50, y: i * 50 },
          { width: 40, height: 40 },
          DEFAULT_CANVAS_STATE,
        );
        shapes.push(shape);
        addShapeToContent(contentId, shape);
      }

      let content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toHaveLength(5);

      // Remove 3 shapes
      removeShapeFromContent(contentId, shapes[0].id);
      removeShapeFromContent(contentId, shapes[2].id);
      removeShapeFromContent(contentId, shapes[4].id);

      content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toHaveLength(2);
      expect(content?.body.shapes.map((s) => s.id)).toEqual([shapes[1].id, shapes[3].id]);
    });
  });

  describe('Undo/Redo with Persistence', () => {
    it('should undo shape additions', () => {
      // Create history
      let history = CanvasUndoRedoManager.createHistory();

      // Add shapes
      const shape1 = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      history = CanvasUndoRedoManager.push([shape1], history);

      const shape2 = ShapeFactory.createRect(
        { x: 150, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      history = CanvasUndoRedoManager.push([shape1, shape2], history);

      // Verify state
      expect(history.present).toHaveLength(2);

      // Undo
      history = CanvasUndoRedoManager.undo(history);
      expect(history.present).toHaveLength(1);

      // Undo again
      history = CanvasUndoRedoManager.undo(history);
      expect(history.present).toHaveLength(0);
    });

    it('should redo shape additions', () => {
      let history = CanvasUndoRedoManager.createHistory();

      const shape1 = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      history = CanvasUndoRedoManager.push([shape1], history);

      const shape2 = ShapeFactory.createRect(
        { x: 150, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      history = CanvasUndoRedoManager.push([shape1, shape2], history);

      // Undo twice
      history = CanvasUndoRedoManager.undo(history);
      history = CanvasUndoRedoManager.undo(history);
      expect(history.present).toHaveLength(0);

      // Redo
      history = CanvasUndoRedoManager.redo(history);
      expect(history.present).toHaveLength(1);

      // Redo again
      history = CanvasUndoRedoManager.redo(history);
      expect(history.present).toHaveLength(2);
    });

    it('should clear redo stack on new action', () => {
      let history = CanvasUndoRedoManager.createHistory();

      const shape1 = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      history = CanvasUndoRedoManager.push([shape1], history);

      const shape2 = ShapeFactory.createRect(
        { x: 150, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      history = CanvasUndoRedoManager.push([shape1, shape2], history);

      // Undo
      history = CanvasUndoRedoManager.undo(history);
      expect(CanvasUndoRedoManager.canRedo(history)).toBe(true);

      // New action should clear redo
      const shape3 = ShapeFactory.createEllipse(
        { x: 200, y: 200 },
        { width: 80, height: 60 },
        DEFAULT_CANVAS_STATE,
      );
      history = CanvasUndoRedoManager.push([shape1, shape3], history);
      expect(CanvasUndoRedoManager.canRedo(history)).toBe(false);
    });

    it('should handle undo/redo with deletion', () => {
      let history = CanvasUndoRedoManager.createHistory();

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

      // Add shapes
      history = CanvasUndoRedoManager.push([shape1], history);
      history = CanvasUndoRedoManager.push([shape1, shape2], history);
      expect(history.present).toHaveLength(2);

      // Delete shape1 (state is now [shape2])
      history = CanvasUndoRedoManager.push([shape2], history);
      expect(history.present).toHaveLength(1);

      // Undo delete
      history = CanvasUndoRedoManager.undo(history);
      expect(history.present).toHaveLength(2);

      // Redo delete
      history = CanvasUndoRedoManager.redo(history);
      expect(history.present).toHaveLength(1);
    });
  });

  describe('Content and Shape Synchronization', () => {
    it('should preserve shapes when content is updated', () => {
      const { addShapeToContent, updateContent } = useAppStore.getState();

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      addShapeToContent(contentId, shape);

      // Update content title
      updateContent(contentId, { title: 'Updated Title' });

      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.title).toBe('Updated Title');
      expect(content?.body.shapes).toHaveLength(1);
    });

    it('should handle shapes across multiple contents', () => {
      const { createContent, addShapeToContent } = useAppStore.getState();

      // Create second content
      const content2Id = createContent(areaId, 'Content 2');

      // Add shapes to both contents
      const shape1 = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      const shape2 = ShapeFactory.createEllipse(
        { x: 150, y: 100 },
        { width: 80, height: 60 },
        DEFAULT_CANVAS_STATE,
      );

      addShapeToContent(contentId, shape1);
      addShapeToContent(content2Id, shape2);

      // Verify isolation
      const contents = useAppStore.getState().state.contents;
      const c1 = contents.find((c) => c.id === contentId);
      const c2 = contents.find((c) => c.id === content2Id);

      expect(c1?.body.shapes).toHaveLength(1);
      expect(c1?.body.shapes[0].type).toBe(ShapeType.RECT);
      expect(c2?.body.shapes).toHaveLength(1);
      expect(c2?.body.shapes[0].type).toBe(ShapeType.ELLIPSE);
    });

    it('should handle content deletion with shapes', () => {
      const { addShapeToContent, deleteContent } = useAppStore.getState();

      // Add shapes
      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      addShapeToContent(contentId, shape);

      // Delete content
      deleteContent(contentId);

      // Verify content is gone
      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content).toBeUndefined();
    });
  });

  describe('Shape Types and Styles', () => {
    it('should persist all shape types correctly', () => {
      const { addShapeToContent } = useAppStore.getState();

      const rect = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );
      const ellipse = ShapeFactory.createEllipse(
        { x: 150, y: 100 },
        { width: 80, height: 60 },
        DEFAULT_CANVAS_STATE,
      );
      const line = ShapeFactory.createLine(
        { x: 0, y: 0 },
        [0, 0, 100, 100], // points format: [x1, y1, x2, y2]
        DEFAULT_CANVAS_STATE,
      );
      const arrow = ShapeFactory.createArrow(
        { x: 0, y: 0 },
        [200, 200, 300, 250], // points format: [x1, y1, x2, y2]
        DEFAULT_CANVAS_STATE,
      );
      const text = ShapeFactory.createText(
        'Test Text',
        { x: 50, y: 300 },
        DEFAULT_CANVAS_STATE,
      );

      addShapeToContent(contentId, rect);
      addShapeToContent(contentId, ellipse);
      addShapeToContent(contentId, line);
      addShapeToContent(contentId, arrow);
      addShapeToContent(contentId, text);

      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toHaveLength(5);

      const types = content?.body.shapes.map((s) => s.type);
      expect(types).toContain(ShapeType.RECT);
      expect(types).toContain(ShapeType.ELLIPSE);
      expect(types).toContain(ShapeType.LINE);
      expect(types).toContain(ShapeType.ARROW);
      expect(types).toContain(ShapeType.TEXT);
    });

    it('should persist shape styles', () => {
      const { addShapeToContent, updateShapeInContent } = useAppStore.getState();

      const customState = {
        ...DEFAULT_CANVAS_STATE,
        fillColor: '#ff5555',
        strokeColor: '#00ff00',
        strokeWidth: 5,
        opacity: 0.7,
      };

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        customState,
      );
      addShapeToContent(contentId, shape);

      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      const savedShape = content?.body.shapes[0];

      expect(savedShape?.style.fill).toBe('#ff5555');
      expect(savedShape?.style.stroke).toBe('#00ff00');
      expect(savedShape?.style.strokeWidth).toBe(5);
      expect(savedShape?.style.opacity).toBe(0.7);
      expect(savedShape?.style.roughness).toBe(0);

      // Update style
      updateShapeInContent(contentId, shape.id, {
        style: { ...savedShape!.style, fill: '#0000ff' },
      });

      const updated = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(updated?.body.shapes[0].style.fill).toBe('#0000ff');
    });

    it('should persist text shape content', () => {
      const { addShapeToContent, updateShapeInContent } = useAppStore.getState();

      const textShape = ShapeFactory.createText(
        'Original Text',
        { x: 50, y: 50 },
        DEFAULT_CANVAS_STATE,
      );
      addShapeToContent(contentId, textShape);

      let content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes[0].text).toBe('Original Text');

      // Update text
      updateShapeInContent(contentId, textShape.id, {
        text: 'Updated Text',
      });

      content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes[0].text).toBe('Updated Text');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty shapes array', () => {
      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toEqual([]);
    });

    it('should throw when removing non-existent shape', () => {
      const { removeShapeFromContent } = useAppStore.getState();

      // Should throw error for non-existent shape
      expect(() => {
        removeShapeFromContent(contentId, 'non-existent-id');
      }).toThrow(/Shape.*not found/);

      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toEqual([]);
    });

    it('should throw when updating non-existent shape', () => {
      const { updateShapeInContent } = useAppStore.getState();

      // Should throw error for non-existent shape
      expect(() => {
        updateShapeInContent(contentId, 'non-existent-id', {
          position: { x: 100, y: 100 },
        });
      }).toThrow(/Shape.*not found/);

      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toEqual([]);
    });

    it('should throw when adding shape to non-existent content', () => {
      const { addShapeToContent } = useAppStore.getState();

      const shape = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      // Should throw error for non-existent content
      expect(() => {
        addShapeToContent('non-existent-content-id', shape);
      }).toThrow(/Content.*not found/);

      // Original content unchanged
      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toEqual([]);
    });

    it('should handle large number of shapes', () => {
      const { addShapeToContent } = useAppStore.getState();

      // Add 100 shapes
      for (let i = 0; i < 100; i++) {
        const shape = ShapeFactory.createRect(
          { x: (i % 10) * 50, y: Math.floor(i / 10) * 50 },
          { width: 40, height: 40 },
          DEFAULT_CANVAS_STATE,
        );
        addShapeToContent(contentId, shape);
      }

      const content = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);
      expect(content?.body.shapes).toHaveLength(100);
    });
  });
});