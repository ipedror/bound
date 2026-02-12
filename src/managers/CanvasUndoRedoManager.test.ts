// ============================================================
// CanvasUndoRedoManager Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { CanvasUndoRedoManager } from './CanvasUndoRedoManager';
import { ShapeType } from '../types/enums';
import type { Shape } from '../types/shape';

const createShape = (id: string): Shape => ({
  id,
  type: ShapeType.RECT,
  position: { x: 0, y: 0 },
  dimension: { width: 100, height: 100 },
  style: { fill: '#000' },
  createdAt: Date.now(),
});

describe('CanvasUndoRedoManager', () => {
  describe('createHistory', () => {
    it('should create empty history', () => {
      const history = CanvasUndoRedoManager.createHistory();
      
      expect(history.past).toHaveLength(0);
      expect(history.present).toHaveLength(0);
      expect(history.future).toHaveLength(0);
    });

    it('should create history with initial shapes', () => {
      const shapes = [createShape('1'), createShape('2')];
      const history = CanvasUndoRedoManager.createHistory(shapes);
      
      expect(history.present).toHaveLength(2);
      expect(history.past).toHaveLength(0);
    });
  });

  describe('push', () => {
    it('should push shapes to history', () => {
      let history = CanvasUndoRedoManager.createHistory();
      const shapes1 = [createShape('1')];
      
      history = CanvasUndoRedoManager.push(shapes1, history);
      
      expect(history.present).toEqual(shapes1);
      expect(history.past).toHaveLength(1);
    });

    it('should clear future on push', () => {
      let history = CanvasUndoRedoManager.createHistory([createShape('1')]);
      history = CanvasUndoRedoManager.push([createShape('2')], history);
      history = CanvasUndoRedoManager.undo(history);
      
      expect(history.future).toHaveLength(1);
      
      // Push new action - should clear future
      history = CanvasUndoRedoManager.push([createShape('3')], history);
      
      expect(history.future).toHaveLength(0);
    });

    it('should limit history size', () => {
      let history = CanvasUndoRedoManager.createHistory();
      
      for (let i = 0; i < 60; i++) {
        history = CanvasUndoRedoManager.push([createShape(`shape-${i}`)], history, 50);
      }
      
      expect(history.past.length).toBeLessThanOrEqual(50);
    });

    it('should not push duplicate state', () => {
      const shapes = [createShape('1')];
      let history = CanvasUndoRedoManager.createHistory(shapes);
      
      // Push same shapes
      history = CanvasUndoRedoManager.push(shapes, history);
      
      expect(history.past).toHaveLength(0);
    });
  });

  describe('undo', () => {
    it('should undo to previous state', () => {
      const shape1 = createShape('1');
      const shape2 = createShape('2');
      
      let history = CanvasUndoRedoManager.createHistory([shape1]);
      history = CanvasUndoRedoManager.push([shape2], history);
      
      expect(history.present[0].id).toBe('2');
      
      history = CanvasUndoRedoManager.undo(history);
      
      expect(history.present[0].id).toBe('1');
      expect(history.future).toHaveLength(1);
    });

    it('should do nothing when no past', () => {
      const history = CanvasUndoRedoManager.createHistory();
      const result = CanvasUndoRedoManager.undo(history);
      
      expect(result).toBe(history);
    });

    it('should support multiple undos', () => {
      let history = CanvasUndoRedoManager.createHistory();
      history = CanvasUndoRedoManager.push([createShape('1')], history);
      history = CanvasUndoRedoManager.push([createShape('2')], history);
      history = CanvasUndoRedoManager.push([createShape('3')], history);
      
      history = CanvasUndoRedoManager.undo(history);
      expect(history.present[0].id).toBe('2');
      
      history = CanvasUndoRedoManager.undo(history);
      expect(history.present[0].id).toBe('1');
      
      history = CanvasUndoRedoManager.undo(history);
      expect(history.present).toHaveLength(0);
    });
  });

  describe('redo', () => {
    it('should redo to next state', () => {
      let history = CanvasUndoRedoManager.createHistory([createShape('1')]);
      history = CanvasUndoRedoManager.push([createShape('2')], history);
      history = CanvasUndoRedoManager.undo(history);
      
      expect(history.present[0].id).toBe('1');
      
      history = CanvasUndoRedoManager.redo(history);
      
      expect(history.present[0].id).toBe('2');
    });

    it('should do nothing when no future', () => {
      const history = CanvasUndoRedoManager.createHistory();
      const result = CanvasUndoRedoManager.redo(history);
      
      expect(result).toBe(history);
    });

    it('should support multiple redos', () => {
      let history = CanvasUndoRedoManager.createHistory();
      history = CanvasUndoRedoManager.push([createShape('1')], history);
      history = CanvasUndoRedoManager.push([createShape('2')], history);
      history = CanvasUndoRedoManager.push([createShape('3')], history);
      
      history = CanvasUndoRedoManager.undo(history);
      history = CanvasUndoRedoManager.undo(history);
      history = CanvasUndoRedoManager.undo(history);
      
      history = CanvasUndoRedoManager.redo(history);
      expect(history.present[0].id).toBe('1');
      
      history = CanvasUndoRedoManager.redo(history);
      expect(history.present[0].id).toBe('2');
      
      history = CanvasUndoRedoManager.redo(history);
      expect(history.present[0].id).toBe('3');
    });
  });

  describe('canUndo/canRedo', () => {
    it('should return false for empty history', () => {
      const history = CanvasUndoRedoManager.createHistory();
      
      expect(CanvasUndoRedoManager.canUndo(history)).toBe(false);
      expect(CanvasUndoRedoManager.canRedo(history)).toBe(false);
    });

    it('should return true when undo is available', () => {
      let history = CanvasUndoRedoManager.createHistory();
      history = CanvasUndoRedoManager.push([createShape('1')], history);
      
      expect(CanvasUndoRedoManager.canUndo(history)).toBe(true);
    });

    it('should return true when redo is available', () => {
      let history = CanvasUndoRedoManager.createHistory();
      history = CanvasUndoRedoManager.push([createShape('1')], history);
      history = CanvasUndoRedoManager.undo(history);
      
      expect(CanvasUndoRedoManager.canRedo(history)).toBe(true);
    });
  });

  describe('undoSteps/redoSteps', () => {
    it('should return correct step counts', () => {
      let history = CanvasUndoRedoManager.createHistory();
      history = CanvasUndoRedoManager.push([createShape('1')], history);
      history = CanvasUndoRedoManager.push([createShape('2')], history);
      history = CanvasUndoRedoManager.push([createShape('3')], history);
      
      expect(CanvasUndoRedoManager.undoSteps(history)).toBe(3);
      expect(CanvasUndoRedoManager.redoSteps(history)).toBe(0);
      
      history = CanvasUndoRedoManager.undo(history);
      
      expect(CanvasUndoRedoManager.undoSteps(history)).toBe(2);
      expect(CanvasUndoRedoManager.redoSteps(history)).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset to fresh history', () => {
      const reset = CanvasUndoRedoManager.reset([createShape('new')]);
      
      expect(reset.past).toHaveLength(0);
      expect(reset.future).toHaveLength(0);
      expect(reset.present[0].id).toBe('new');
    });
  });

  describe('clearHistory', () => {
    it('should clear past and future but keep present', () => {
      let history = CanvasUndoRedoManager.createHistory();
      history = CanvasUndoRedoManager.push([createShape('1')], history);
      history = CanvasUndoRedoManager.push([createShape('2')], history);
      history = CanvasUndoRedoManager.undo(history);
      
      expect(history.past).toHaveLength(1);
      expect(history.future).toHaveLength(1);
      
      const cleared = CanvasUndoRedoManager.clearHistory(history);
      
      expect(cleared.past).toHaveLength(0);
      expect(cleared.future).toHaveLength(0);
      expect(cleared.present[0].id).toBe('1');
    });
  });

  describe('immutability', () => {
    it('should not mutate original history on push', () => {
      const original = CanvasUndoRedoManager.createHistory([createShape('1')]);
      const originalPastLength = original.past.length;
      
      CanvasUndoRedoManager.push([createShape('2')], original);
      
      expect(original.past.length).toBe(originalPastLength);
    });

    it('should not mutate original history on undo', () => {
      let history = CanvasUndoRedoManager.createHistory();
      history = CanvasUndoRedoManager.push([createShape('1')], history);
      history = CanvasUndoRedoManager.push([createShape('2')], history);
      
      const beforeUndo = history.present[0].id;
      CanvasUndoRedoManager.undo(history);
      
      expect(history.present[0].id).toBe(beforeUndo);
    });

    it('should not mutate original history on redo', () => {
      let history = CanvasUndoRedoManager.createHistory();
      history = CanvasUndoRedoManager.push([createShape('1')], history);
      history = CanvasUndoRedoManager.undo(history);
      
      const beforeRedo = history.present.length;
      CanvasUndoRedoManager.redo(history);
      
      expect(history.present.length).toBe(beforeRedo);
    });
  });
});
