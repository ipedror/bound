// ============================================================
// ShapeFactory - Create and transform shapes
// ============================================================

import type { Shape, ShapeStyle } from '../../types/shape';
import type { Position, Dimension } from '../../types/base';
import type { CanvasState } from '../../types/canvas';
import { ShapeType } from '../../types/enums';
import { generateId } from '../id';
import { HAND_DRAWN_FONT } from '../../constants/canvas';

/**
 * Factory for creating shapes with consistent defaults
 */
export class ShapeFactory {
  /**
   * Create a rectangle shape
   */
  static createRect(
    position: Position,
    dimension: Dimension,
    state: CanvasState,
  ): Shape {
    return {
      id: generateId(),
      type: ShapeType.RECT,
      position,
      dimension,
      style: ShapeFactory.styleFromState(state),
      createdAt: Date.now(),
    };
  }

  /**
   * Create an ellipse (circle) shape
   */
  static createEllipse(
    position: Position,
    dimension: Dimension,
    state: CanvasState,
  ): Shape {
    return {
      id: generateId(),
      type: ShapeType.ELLIPSE,
      position,
      dimension,
      style: ShapeFactory.styleFromState(state),
      createdAt: Date.now(),
    };
  }

  /**
   * Create a line shape
   */
  static createLine(
    position: Position,
    points: number[],
    state: CanvasState,
  ): Shape {
    // Calculate bounding box for dimension
    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      id: generateId(),
      type: ShapeType.LINE,
      position,
      dimension: {
        width: Math.max(maxX - minX, 1),
        height: Math.max(maxY - minY, 1),
      },
      style: ShapeFactory.styleFromState(state),
      points,
      createdAt: Date.now(),
    };
  }

  /**
   * Create an arrow shape
   */
  static createArrow(
    position: Position,
    points: number[],
    state: CanvasState,
  ): Shape {
    // Calculate bounding box for dimension
    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      id: generateId(),
      type: ShapeType.ARROW,
      position,
      dimension: {
        width: Math.max(maxX - minX, 1),
        height: Math.max(maxY - minY, 1),
      },
      style: ShapeFactory.styleFromState(state),
      points,
      createdAt: Date.now(),
    };
  }

  /**
   * Create an image shape from a base64 data URL
   */
  static createImage(
    imageSrc: string,
    position: Position,
    dimension: Dimension,
    state: CanvasState,
  ): Shape {
    return {
      id: generateId(),
      type: ShapeType.IMAGE,
      position,
      dimension,
      style: {
        opacity: state.opacity,
      },
      imageSrc,
      createdAt: Date.now(),
    };
  }

  /**
   * Create a text shape
   */
  static createText(
    text: string,
    position: Position,
    state: CanvasState,
  ): Shape {
    const maxWidth = state.textMaxWidth > 0 ? state.textMaxWidth : 0;
    // Approximate dimension based on text length and font size
    const estimatedWidth = maxWidth > 0
      ? maxWidth
      : Math.max(text.length * state.fontSize * 0.6, 50);
    // Estimate line count for wrapped text
    const charsPerLine = maxWidth > 0
      ? Math.max(Math.floor(maxWidth / (state.fontSize * 0.6)), 1)
      : text.length;
    const lineCount = Math.max(Math.ceil(text.length / charsPerLine), 1);
    const estimatedHeight = state.fontSize * 1.5 * lineCount;

    return {
      id: generateId(),
      type: ShapeType.TEXT,
      position,
      dimension: {
        width: estimatedWidth,
        height: estimatedHeight,
      },
      style: {
        fill: state.fontColor,
        stroke: state.strokeColor,
        strokeWidth: state.strokeWidth,
        fontStyle: {
          fontFamily: state.roughness > 0 ? HAND_DRAWN_FONT : state.fontFamily,
          fontSize: state.fontSize,
          color: state.fontColor,
        },
        opacity: state.opacity,
        roughness: state.roughness,
      },
      text,
      ...(maxWidth > 0 ? { maxWidth } : {}),
      createdAt: Date.now(),
    };
  }

  /**
   * Create shape from mouse drag coordinates
   */
  static createFromDrag(
    type: ShapeType,
    startPos: Position,
    endPos: Position,
    state: CanvasState,
    text?: string,
  ): Shape {
    switch (type) {
      case ShapeType.RECT:
        return ShapeFactory.createRect(
          {
            x: Math.min(startPos.x, endPos.x),
            y: Math.min(startPos.y, endPos.y),
          },
          {
            width: Math.abs(endPos.x - startPos.x),
            height: Math.abs(endPos.y - startPos.y),
          },
          state,
        );

      case ShapeType.ELLIPSE:
        return ShapeFactory.createEllipse(
          {
            x: Math.min(startPos.x, endPos.x),
            y: Math.min(startPos.y, endPos.y),
          },
          {
            width: Math.abs(endPos.x - startPos.x),
            height: Math.abs(endPos.y - startPos.y),
          },
          state,
        );

      case ShapeType.LINE:
        return ShapeFactory.createLine(
          { x: 0, y: 0 },
          [startPos.x, startPos.y, endPos.x, endPos.y],
          state,
        );

      case ShapeType.ARROW:
        return ShapeFactory.createArrow(
          { x: 0, y: 0 },
          [startPos.x, startPos.y, endPos.x, endPos.y],
          state,
        );

      case ShapeType.TEXT:
        return ShapeFactory.createText(text ?? 'Text', startPos, state);

      default:
        throw new Error(`Unknown shape type: ${type}`);
    }
  }

  /**
   * Clone a shape with a new ID
   */
  static clone(shape: Shape): Shape {
    return {
      ...shape,
      id: generateId(),
      createdAt: Date.now(),
    };
  }

  /**
   * Update shape position
   */
  static updatePosition(shape: Shape, position: Position): Shape {
    return { ...shape, position };
  }

  /**
   * Update shape dimension
   */
  static updateDimension(shape: Shape, dimension: Dimension): Shape {
    return { ...shape, dimension };
  }

  /**
   * Update shape style
   */
  static updateStyle(shape: Shape, styleUpdate: Partial<ShapeStyle>): Shape {
    return {
      ...shape,
      style: { ...shape.style, ...styleUpdate },
    };
  }

  /**
   * Update shape text (for text shapes)
   */
  static updateText(shape: Shape, text: string): Shape {
    if (shape.type !== ShapeType.TEXT) {
      return shape;
    }
    return { ...shape, text };
  }

  /**
   * Extract style from canvas state
   */
  private static styleFromState(state: CanvasState): ShapeStyle {
    return {
      fill: state.fillColor,
      stroke: state.strokeColor,
      strokeWidth: state.strokeWidth,
      opacity: state.opacity,
      roughness: state.roughness,
    };
  }
}

// ============================================================
// Position & Dimension Helpers
// ============================================================

/**
 * Add two positions
 */
export function addPositions(a: Position, b: Position): Position {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Subtract positions (a - b)
 */
export function subtractPositions(a: Position, b: Position): Position {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Scale a position by a factor
 */
export function scalePosition(pos: Position, scale: number): Position {
  return { x: pos.x * scale, y: pos.y * scale };
}

/**
 * Clamp dimension to minimum values
 */
export function clampDimension(
  dim: Dimension,
  min: number = 1,
): Dimension {
  return {
    width: Math.max(dim.width, min),
    height: Math.max(dim.height, min),
  };
}

/**
 * Check if a point is inside a shape's bounding box
 */
export function isPointInBounds(
  point: Position,
  shape: Shape,
): boolean {
  return (
    point.x >= shape.position.x &&
    point.x <= shape.position.x + shape.dimension.width &&
    point.y >= shape.position.y &&
    point.y <= shape.position.y + shape.dimension.height
  );
}

/**
 * Calculate distance between two positions
 */
export function distance(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get center point of a shape
 */
export function getShapeCenter(shape: Shape): Position {
  return {
    x: shape.position.x + shape.dimension.width / 2,
    y: shape.position.y + shape.dimension.height / 2,
  };
}
