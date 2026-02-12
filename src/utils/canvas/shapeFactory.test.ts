// ============================================================
// ShapeFactory Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { ShapeFactory } from './shapeFactory';
import { DEFAULT_CANVAS_STATE } from '../../constants/canvas';
import { ShapeType } from '../../types/enums';

describe('ShapeFactory', () => {
  describe('createImage', () => {
    it('should create an image shape with correct properties', () => {
      const shape = ShapeFactory.createImage(
        'data:image/png;base64,iVBOR',
        { x: 50, y: 100 },
        { width: 400, height: 300 },
        DEFAULT_CANVAS_STATE,
      );

      expect(shape.type).toBe(ShapeType.IMAGE);
      expect(shape.imageSrc).toBe('data:image/png;base64,iVBOR');
      expect(shape.position).toEqual({ x: 50, y: 100 });
      expect(shape.dimension).toEqual({ width: 400, height: 300 });
      expect(shape.style.opacity).toBe(DEFAULT_CANVAS_STATE.opacity);
      expect(shape.id).toBeDefined();
      expect(shape.createdAt).toBeGreaterThan(0);
    });

    it('should create unique ids for each image shape', () => {
      const s1 = ShapeFactory.createImage(
        'data:image/png;base64,a',
        { x: 0, y: 0 },
        { width: 100, height: 100 },
        DEFAULT_CANVAS_STATE,
      );
      const s2 = ShapeFactory.createImage(
        'data:image/png;base64,b',
        { x: 0, y: 0 },
        { width: 100, height: 100 },
        DEFAULT_CANVAS_STATE,
      );

      expect(s1.id).not.toBe(s2.id);
    });

    it('should preserve opacity from canvas state', () => {
      const state = { ...DEFAULT_CANVAS_STATE, opacity: 0.5 };
      const shape = ShapeFactory.createImage(
        'data:image/jpeg;base64,abc',
        { x: 0, y: 0 },
        { width: 200, height: 200 },
        state,
      );

      expect(shape.style.opacity).toBe(0.5);
    });
  });

  describe('createFromDrag', () => {
    it('should throw for IMAGE type (images are not created via drag)', () => {
      expect(() =>
        ShapeFactory.createFromDrag(
          ShapeType.IMAGE,
          { x: 0, y: 0 },
          { x: 100, y: 100 },
          DEFAULT_CANVAS_STATE,
        ),
      ).toThrow();
    });

    it('should still create RECT via drag', () => {
      const shape = ShapeFactory.createFromDrag(
        ShapeType.RECT,
        { x: 10, y: 10 },
        { x: 110, y: 60 },
        DEFAULT_CANVAS_STATE,
      );

      expect(shape.type).toBe(ShapeType.RECT);
      expect(shape.dimension.width).toBe(100);
      expect(shape.dimension.height).toBe(50);
    });
  });

  describe('clone', () => {
    it('should clone an image shape with a new id', () => {
      const original = ShapeFactory.createImage(
        'data:image/png;base64,test',
        { x: 10, y: 20 },
        { width: 300, height: 200 },
        DEFAULT_CANVAS_STATE,
      );

      const cloned = ShapeFactory.clone(original);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.type).toBe(ShapeType.IMAGE);
      expect(cloned.imageSrc).toBe(original.imageSrc);
      expect(cloned.position).toEqual(original.position);
      expect(cloned.dimension).toEqual(original.dimension);
    });
  });
});
