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
  readonly roughness?: number; // 0 = clean, 1+ = hand-drawn
}

export interface Shape {
  readonly id: string;
  readonly type: ShapeType;
  readonly position: Position;
  readonly dimension: Dimension;
  readonly style: ShapeStyle;
  readonly text?: string; // for text shapes
  readonly maxWidth?: number; // for text shapes - max width before wrapping (0 = no limit)
  readonly points?: readonly number[]; // for line/arrow shapes [x1,y1,x2,y2,...]
  readonly imageSrc?: string; // for image shapes - base64 data URL
  readonly groupId?: string; // for grouping shapes together
  readonly createdAt: number;
}
