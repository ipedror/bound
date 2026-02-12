// ============================================================
// ShapeSerializer - Encode/decode shapes for persistence
// ============================================================

import type { Shape, ShapeStyle } from '../../types/shape';
import type { Position, Dimension } from '../../types/base';
import { ShapeType } from '../../types/enums';

/**
 * Type guard for Position
 */
function isPosition(obj: unknown): obj is Position {
  if (typeof obj !== 'object' || obj === null) return false;
  const pos = obj as Record<string, unknown>;
  return typeof pos.x === 'number' && typeof pos.y === 'number';
}

/**
 * Type guard for Dimension
 */
function isDimension(obj: unknown): obj is Dimension {
  if (typeof obj !== 'object' || obj === null) return false;
  const dim = obj as Record<string, unknown>;
  return typeof dim.width === 'number' && typeof dim.height === 'number';
}

/**
 * Type guard for ShapeStyle
 */
function isShapeStyle(obj: unknown): obj is ShapeStyle {
  if (typeof obj !== 'object' || obj === null) return false;
  const style = obj as Record<string, unknown>;
  // All properties are optional, but if present they must be correct types
  if (style.fill !== undefined && typeof style.fill !== 'string') return false;
  if (style.stroke !== undefined && typeof style.stroke !== 'string') return false;
  if (style.strokeWidth !== undefined && typeof style.strokeWidth !== 'number') return false;
  if (style.opacity !== undefined && typeof style.opacity !== 'number') return false;
  return true;
}

/**
 * Valid shape types
 */
const VALID_SHAPE_TYPES = new Set(Object.values(ShapeType));

/**
 * Type guard for Shape
 */
export function isShape(obj: unknown): obj is Shape {
  if (typeof obj !== 'object' || obj === null) return false;

  const shape = obj as Record<string, unknown>;

  // Required fields
  if (typeof shape.id !== 'string' || shape.id.length === 0) return false;
  if (typeof shape.type !== 'string' || !VALID_SHAPE_TYPES.has(shape.type as ShapeType)) return false;
  if (!isPosition(shape.position)) return false;
  if (!isDimension(shape.dimension)) return false;
  if (!isShapeStyle(shape.style)) return false;
  if (typeof shape.createdAt !== 'number') return false;

  // Optional fields
  if (shape.text !== undefined && typeof shape.text !== 'string') return false;
  if (shape.points !== undefined) {
    if (!Array.isArray(shape.points)) return false;
    if (!shape.points.every((p) => typeof p === 'number')) return false;
  }

  return true;
}

/**
 * Serializer for shapes - encode/decode for persistence
 */
export class ShapeSerializer {
  /**
   * Encode array of shapes to JSON string
   */
  static encode(shapes: ReadonlyArray<Shape>): string {
    return JSON.stringify(shapes);
  }

  /**
   * Decode JSON string to array of shapes
   * Invalid shapes are filtered out
   */
  static decode(json: string): Shape[] {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isShape);
    } catch {
      return [];
    }
  }

  /**
   * Validate a single shape
   */
  static validate(obj: unknown): obj is Shape {
    return isShape(obj);
  }

  /**
   * Validate an array of shapes, returning validation results
   */
  static validateMany(
    shapes: unknown[],
  ): { valid: Shape[]; invalid: unknown[] } {
    const valid: Shape[] = [];
    const invalid: unknown[] = [];

    for (const shape of shapes) {
      if (isShape(shape)) {
        valid.push(shape);
      } else {
        invalid.push(shape);
      }
    }

    return { valid, invalid };
  }

  /**
   * Deep clone shapes (useful for undo/redo)
   */
  static cloneShapes(shapes: ReadonlyArray<Shape>): Shape[] {
    return JSON.parse(JSON.stringify(shapes));
  }

  /**
   * Sanitize a shape, filling in missing optional fields
   */
  static sanitize(shape: Shape): Shape {
    return {
      id: shape.id,
      type: shape.type,
      position: { x: shape.position.x, y: shape.position.y },
      dimension: { width: shape.dimension.width, height: shape.dimension.height },
      style: {
        fill: shape.style.fill ?? '#1a1a2e',
        stroke: shape.style.stroke ?? '#00d4ff',
        strokeWidth: shape.style.strokeWidth ?? 2,
        opacity: shape.style.opacity ?? 1,
        fontStyle: shape.style.fontStyle,
      },
      text: shape.text,
      points: shape.points ? [...shape.points] : undefined,
      createdAt: shape.createdAt,
    };
  }

  /**
   * Get shapes that have been modified between two arrays
   */
  static getModifiedShapes(
    before: ReadonlyArray<Shape>,
    after: ReadonlyArray<Shape>,
  ): { added: Shape[]; removed: Shape[]; modified: Shape[] } {
    const beforeIds = new Set(before.map((s) => s.id));
    const afterIds = new Set(after.map((s) => s.id));
    const beforeMap = new Map(before.map((s) => [s.id, s]));

    const added = after.filter((s) => !beforeIds.has(s.id));
    const removed = before.filter((s) => !afterIds.has(s.id));
    const modified: Shape[] = [];

    for (const shape of after) {
      if (beforeIds.has(shape.id)) {
        const original = beforeMap.get(shape.id)!;
        if (JSON.stringify(original) !== JSON.stringify(shape)) {
          modified.push(shape);
        }
      }
    }

    return { added, removed, modified };
  }
}
