// ============================================================
// ShapeFactory & ShapeSerializer Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  ShapeFactory,
  ShapeSerializer,
  isShape,
  addPositions,
  subtractPositions,
  clampDimension,
  isPointInBounds,
  distance,
  getShapeCenter,
} from './index';
import { DEFAULT_CANVAS_STATE } from '../../constants/canvas';
import { ShapeType } from '../../types/enums';
import type { Shape } from '../../types/shape';

describe('ShapeFactory', () => {
  describe('createRect', () => {
    it('should create a rectangle shape', () => {
      const shape = ShapeFactory.createRect(
        { x: 10, y: 20 },
        { width: 100, height: 50 },
        DEFAULT_CANVAS_STATE,
      );

      expect(shape.type).toBe(ShapeType.RECT);
      expect(shape.position).toEqual({ x: 10, y: 20 });
      expect(shape.dimension).toEqual({ width: 100, height: 50 });
      expect(shape.style.fill).toBe(DEFAULT_CANVAS_STATE.fillColor);
      expect(shape.style.stroke).toBe(DEFAULT_CANVAS_STATE.strokeColor);
      expect(shape.id).toBeDefined();
      expect(shape.createdAt).toBeDefined();
    });
  });

  describe('createEllipse', () => {
    it('should create an ellipse shape', () => {
      const shape = ShapeFactory.createEllipse(
        { x: 50, y: 50 },
        { width: 80, height: 80 },
        DEFAULT_CANVAS_STATE,
      );

      expect(shape.type).toBe(ShapeType.ELLIPSE);
      expect(shape.position).toEqual({ x: 50, y: 50 });
      expect(shape.dimension).toEqual({ width: 80, height: 80 });
    });
  });

  describe('createLine', () => {
    it('should create a line shape with points', () => {
      const shape = ShapeFactory.createLine(
        { x: 0, y: 0 },
        [10, 10, 100, 100],
        DEFAULT_CANVAS_STATE,
      );

      expect(shape.type).toBe(ShapeType.LINE);
      expect(shape.points).toEqual([10, 10, 100, 100]);
    });
  });

  describe('createArrow', () => {
    it('should create an arrow shape with points', () => {
      const shape = ShapeFactory.createArrow(
        { x: 0, y: 0 },
        [0, 0, 50, 50],
        DEFAULT_CANVAS_STATE,
      );

      expect(shape.type).toBe(ShapeType.ARROW);
      expect(shape.points).toEqual([0, 0, 50, 50]);
    });
  });

  describe('createText', () => {
    it('should create a text shape with content', () => {
      const shape = ShapeFactory.createText(
        'Hello World',
        { x: 100, y: 100 },
        DEFAULT_CANVAS_STATE,
      );

      expect(shape.type).toBe(ShapeType.TEXT);
      expect(shape.text).toBe('Hello World');
      expect(shape.style.fontStyle).toBeDefined();
      expect(shape.style.fontStyle?.fontFamily).toBe(DEFAULT_CANVAS_STATE.fontFamily);
    });
  });

  describe('createFromDrag', () => {
    it('should create rect from drag coordinates', () => {
      const shape = ShapeFactory.createFromDrag(
        ShapeType.RECT,
        { x: 10, y: 10 },
        { x: 110, y: 60 },
        DEFAULT_CANVAS_STATE,
      );

      expect(shape.type).toBe(ShapeType.RECT);
      expect(shape.position).toEqual({ x: 10, y: 10 });
      expect(shape.dimension).toEqual({ width: 100, height: 50 });
    });

    it('should handle reversed drag (end before start)', () => {
      const shape = ShapeFactory.createFromDrag(
        ShapeType.RECT,
        { x: 110, y: 60 },
        { x: 10, y: 10 },
        DEFAULT_CANVAS_STATE,
      );

      expect(shape.position).toEqual({ x: 10, y: 10 });
      expect(shape.dimension).toEqual({ width: 100, height: 50 });
    });

    it('should create line from drag', () => {
      const shape = ShapeFactory.createFromDrag(
        ShapeType.LINE,
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        DEFAULT_CANVAS_STATE,
      );

      expect(shape.type).toBe(ShapeType.LINE);
      expect(shape.points).toEqual([0, 0, 100, 100]);
    });

    it('should create text shape', () => {
      const shape = ShapeFactory.createFromDrag(
        ShapeType.TEXT,
        { x: 50, y: 50 },
        { x: 100, y: 100 },
        DEFAULT_CANVAS_STATE,
        'Custom Text',
      );

      expect(shape.type).toBe(ShapeType.TEXT);
      expect(shape.text).toBe('Custom Text');
    });
  });

  describe('clone', () => {
    it('should clone shape with new ID', () => {
      const original = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 100 },
        DEFAULT_CANVAS_STATE,
      );

      const cloned = ShapeFactory.clone(original);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.position).toEqual(original.position);
      expect(cloned.dimension).toEqual(original.dimension);
    });
  });

  describe('updatePosition', () => {
    it('should update shape position immutably', () => {
      const original = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 100 },
        DEFAULT_CANVAS_STATE,
      );

      const updated = ShapeFactory.updatePosition(original, { x: 50, y: 50 });

      expect(updated.position).toEqual({ x: 50, y: 50 });
      expect(original.position).toEqual({ x: 10, y: 10 }); // unchanged
    });
  });

  describe('updateDimension', () => {
    it('should update shape dimension immutably', () => {
      const original = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 100 },
        DEFAULT_CANVAS_STATE,
      );

      const updated = ShapeFactory.updateDimension(original, { width: 200, height: 150 });

      expect(updated.dimension).toEqual({ width: 200, height: 150 });
      expect(original.dimension).toEqual({ width: 100, height: 100 }); // unchanged
    });
  });

  describe('updateStyle', () => {
    it('should update shape style immutably', () => {
      const original = ShapeFactory.createRect(
        { x: 10, y: 10 },
        { width: 100, height: 100 },
        DEFAULT_CANVAS_STATE,
      );

      const updated = ShapeFactory.updateStyle(original, { fill: '#ff0000' });

      expect(updated.style.fill).toBe('#ff0000');
      expect(updated.style.stroke).toBe(original.style.stroke); // preserved
    });
  });

  describe('updateText', () => {
    it('should update text in text shape', () => {
      const original = ShapeFactory.createText('Hello', { x: 0, y: 0 }, DEFAULT_CANVAS_STATE);
      const updated = ShapeFactory.updateText(original, 'World');

      expect(updated.text).toBe('World');
    });

    it('should not modify non-text shapes', () => {
      const original = ShapeFactory.createRect(
        { x: 0, y: 0 },
        { width: 100, height: 100 },
        DEFAULT_CANVAS_STATE,
      );
      const updated = ShapeFactory.updateText(original, 'Hello');

      expect(updated).toBe(original);
    });
  });
});

describe('ShapeSerializer', () => {
  const createTestShape = (): Shape => ({
    id: 'test-id-123',
    type: ShapeType.RECT,
    position: { x: 10, y: 20 },
    dimension: { width: 100, height: 50 },
    style: { fill: '#000', stroke: '#fff', strokeWidth: 2, opacity: 1 },
    createdAt: Date.now(),
  });

  describe('encode/decode', () => {
    it('should encode and decode shapes', () => {
      const shapes = [createTestShape()];
      const encoded = ShapeSerializer.encode(shapes);
      const decoded = ShapeSerializer.decode(encoded);

      expect(decoded).toHaveLength(1);
      expect(decoded[0].type).toBe(ShapeType.RECT);
      expect(decoded[0].position).toEqual({ x: 10, y: 20 });
    });

    it('should handle empty array', () => {
      const encoded = ShapeSerializer.encode([]);
      const decoded = ShapeSerializer.decode(encoded);

      expect(decoded).toHaveLength(0);
    });

    it('should filter out invalid shapes on decode', () => {
      const invalidJson = JSON.stringify([
        createTestShape(),
        { invalid: 'shape' },
        null,
      ]);
      const decoded = ShapeSerializer.decode(invalidJson);

      expect(decoded).toHaveLength(1);
    });

    it('should return empty array for invalid JSON', () => {
      const decoded = ShapeSerializer.decode('not valid json');
      expect(decoded).toHaveLength(0);
    });

    it('should return empty array for non-array JSON', () => {
      const decoded = ShapeSerializer.decode('{"not": "array"}');
      expect(decoded).toHaveLength(0);
    });
  });

  describe('validate', () => {
    it('should validate correct shape', () => {
      expect(ShapeSerializer.validate(createTestShape())).toBe(true);
    });

    it('should reject shape without id', () => {
      const shape = { ...createTestShape(), id: '' };
      expect(ShapeSerializer.validate(shape)).toBe(false);
    });

    it('should reject shape with invalid type', () => {
      const shape = { ...createTestShape(), type: 'invalid' };
      expect(ShapeSerializer.validate(shape)).toBe(false);
    });

    it('should reject shape without position', () => {
      const shape: Record<string, unknown> = { ...createTestShape() };
      delete shape.position;
      expect(ShapeSerializer.validate(shape)).toBe(false);
    });
  });

  describe('validateMany', () => {
    it('should separate valid and invalid shapes', () => {
      const shapes = [
        createTestShape(),
        { invalid: 'shape' },
        createTestShape(),
      ];
      const { valid, invalid } = ShapeSerializer.validateMany(shapes);

      expect(valid).toHaveLength(2);
      expect(invalid).toHaveLength(1);
    });
  });

  describe('cloneShapes', () => {
    it('should deep clone shapes', () => {
      const original = [createTestShape()];
      const cloned = ShapeSerializer.cloneShapes(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[0]).not.toBe(original[0]);
    });
  });

  describe('sanitize', () => {
    it('should fill missing optional style properties', () => {
      const shape: Shape = {
        id: 'test',
        type: ShapeType.RECT,
        position: { x: 0, y: 0 },
        dimension: { width: 10, height: 10 },
        style: {},
        createdAt: Date.now(),
      };

      const sanitized = ShapeSerializer.sanitize(shape);

      expect(sanitized.style.fill).toBe('#1a1a2e');
      expect(sanitized.style.stroke).toBe('#00d4ff');
      expect(sanitized.style.strokeWidth).toBe(2);
      expect(sanitized.style.opacity).toBe(1);
    });
  });

  describe('getModifiedShapes', () => {
    it('should detect added shapes', () => {
      const before: Shape[] = [];
      const after = [createTestShape()];

      const { added, removed, modified } = ShapeSerializer.getModifiedShapes(before, after);

      expect(added).toHaveLength(1);
      expect(removed).toHaveLength(0);
      expect(modified).toHaveLength(0);
    });

    it('should detect removed shapes', () => {
      const before = [createTestShape()];
      const after: Shape[] = [];

      const { added, removed, modified } = ShapeSerializer.getModifiedShapes(before, after);

      expect(added).toHaveLength(0);
      expect(removed).toHaveLength(1);
      expect(modified).toHaveLength(0);
    });

    it('should detect modified shapes', () => {
      const original = createTestShape();
      const modified = { ...original, position: { x: 999, y: 999 } };
      
      const before = [original];
      const after = [modified];

      const result = ShapeSerializer.getModifiedShapes(before, after);

      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.modified).toHaveLength(1);
    });
  });
});

describe('isShape', () => {
  it('should return true for valid shape', () => {
    const shape: Shape = {
      id: 'test',
      type: ShapeType.RECT,
      position: { x: 0, y: 0 },
      dimension: { width: 10, height: 10 },
      style: {},
      createdAt: Date.now(),
    };
    expect(isShape(shape)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isShape(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isShape('string')).toBe(false);
    expect(isShape(123)).toBe(false);
  });
});

describe('Position Helpers', () => {
  describe('addPositions', () => {
    it('should add two positions', () => {
      const result = addPositions({ x: 10, y: 20 }, { x: 5, y: 15 });
      expect(result).toEqual({ x: 15, y: 35 });
    });
  });

  describe('subtractPositions', () => {
    it('should subtract positions', () => {
      const result = subtractPositions({ x: 10, y: 20 }, { x: 5, y: 15 });
      expect(result).toEqual({ x: 5, y: 5 });
    });
  });
});

describe('Dimension Helpers', () => {
  describe('clampDimension', () => {
    it('should clamp small dimensions', () => {
      const result = clampDimension({ width: 0, height: -5 });
      expect(result).toEqual({ width: 1, height: 1 });
    });

    it('should use custom minimum', () => {
      const result = clampDimension({ width: 5, height: 5 }, 10);
      expect(result).toEqual({ width: 10, height: 10 });
    });

    it('should not change valid dimensions', () => {
      const result = clampDimension({ width: 100, height: 100 });
      expect(result).toEqual({ width: 100, height: 100 });
    });
  });
});

describe('Geometry Helpers', () => {
  describe('isPointInBounds', () => {
    const shape: Shape = {
      id: 'test',
      type: ShapeType.RECT,
      position: { x: 10, y: 10 },
      dimension: { width: 100, height: 50 },
      style: {},
      createdAt: Date.now(),
    };

    it('should return true for point inside bounds', () => {
      expect(isPointInBounds({ x: 50, y: 30 }, shape)).toBe(true);
    });

    it('should return true for point on edge', () => {
      expect(isPointInBounds({ x: 10, y: 10 }, shape)).toBe(true);
      expect(isPointInBounds({ x: 110, y: 60 }, shape)).toBe(true);
    });

    it('should return false for point outside bounds', () => {
      expect(isPointInBounds({ x: 5, y: 5 }, shape)).toBe(false);
      expect(isPointInBounds({ x: 200, y: 200 }, shape)).toBe(false);
    });
  });

  describe('distance', () => {
    it('should calculate distance between points', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });

    it('should return 0 for same point', () => {
      expect(distance({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0);
    });
  });

  describe('getShapeCenter', () => {
    it('should calculate shape center', () => {
      const shape: Shape = {
        id: 'test',
        type: ShapeType.RECT,
        position: { x: 0, y: 0 },
        dimension: { width: 100, height: 50 },
        style: {},
        createdAt: Date.now(),
      };

      expect(getShapeCenter(shape)).toEqual({ x: 50, y: 25 });
    });
  });
});
