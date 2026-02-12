// ============================================================
// CanvasUndoRedoManager - History management for canvas shapes
// ============================================================

import type { Shape } from '../types/shape';
import type { CanvasHistory } from '../types/canvas';
import { HISTORY_MAX_SIZE } from '../constants/canvas';

/**
 * Stateless manager for undo/redo history of canvas shapes
 */
export class CanvasUndoRedoManager {
  /**
   * Create a new empty history
   */
  static createHistory(initialShapes: ReadonlyArray<Shape> = []): CanvasHistory {
    return {
      past: [],
      present: [...initialShapes],
      future: [],
    };
  }

  /**
   * Push new state to history
   * - Current state moves to past
   * - New shapes become present
   * - Future is cleared (new branch)
   * - Past is limited to maxSize
   */
  static push(
    shapes: ReadonlyArray<Shape>,
    history: CanvasHistory,
    maxSize: number = HISTORY_MAX_SIZE,
  ): CanvasHistory {
    // Don't push if shapes are the same as present
    if (CanvasUndoRedoManager.areShapesEqual(shapes, history.present)) {
      return history;
    }

    const newPast = [...history.past, [...history.present]];
    
    // Limit history size
    while (newPast.length > maxSize) {
      newPast.shift();
    }

    return {
      past: newPast,
      present: [...shapes],
      future: [], // Clear future on new action
    };
  }

  /**
   * Undo: move present to future, restore from past
   */
  static undo(history: CanvasHistory): CanvasHistory {
    if (history.past.length === 0) {
      return history;
    }

    const newPast = history.past.slice(0, -1);
    const newPresent = history.past[history.past.length - 1];
    const newFuture = [history.present, ...history.future];

    return {
      past: newPast,
      present: [...newPresent],
      future: newFuture.map((shapes) => [...shapes]),
    };
  }

  /**
   * Redo: move present to past, restore from future
   */
  static redo(history: CanvasHistory): CanvasHistory {
    if (history.future.length === 0) {
      return history;
    }

    const newFuture = history.future.slice(1);
    const newPresent = history.future[0];
    const newPast = [...history.past, history.present];

    return {
      past: newPast.map((shapes) => [...shapes]),
      present: [...newPresent],
      future: newFuture,
    };
  }

  /**
   * Check if undo is possible
   */
  static canUndo(history: CanvasHistory): boolean {
    return history.past.length > 0;
  }

  /**
   * Check if redo is possible
   */
  static canRedo(history: CanvasHistory): boolean {
    return history.future.length > 0;
  }

  /**
   * Get the number of undo steps available
   */
  static undoSteps(history: CanvasHistory): number {
    return history.past.length;
  }

  /**
   * Get the number of redo steps available
   */
  static redoSteps(history: CanvasHistory): number {
    return history.future.length;
  }

  /**
   * Reset history to initial state with current shapes
   */
  static reset(shapes: ReadonlyArray<Shape> = []): CanvasHistory {
    return CanvasUndoRedoManager.createHistory(shapes);
  }

  /**
   * Clear all history but keep current shapes
   */
  static clearHistory(history: CanvasHistory): CanvasHistory {
    return {
      past: [],
      present: [...history.present],
      future: [],
    };
  }

  /**
   * Compare two shape arrays for equality (by ID and basic properties)
   */
  private static areShapesEqual(
    a: ReadonlyArray<Shape>,
    b: ReadonlyArray<Shape>,
  ): boolean {
    if (a.length !== b.length) return false;
    
    // Quick check - compare JSON strings
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
