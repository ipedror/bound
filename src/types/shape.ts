// ============================================================
// Shape - drawable element on the content canvas
// ============================================================

import type { ShapeType } from './enums';
import type { Position, Dimension, FontStyle } from './base';

export interface ShapeStyle {
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly fontStyle?: FontStyle;
  readonly opacity?: number;
}

export interface Shape {
  readonly id: string;
  readonly type: ShapeType;
  readonly position: Position;
  readonly dimension: Dimension;
  readonly style: ShapeStyle;
  readonly text?: string; // for text shapes
  readonly points?: readonly number[]; // for line/arrow shapes [x1,y1,x2,y2,...]
  readonly createdAt: number;
}
