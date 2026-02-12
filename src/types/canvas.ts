// ============================================================
// Canvas Types - CanvasState, CanvasHistory, ToolType
// ============================================================

import type { Shape } from './shape';

export const ToolType = {
  SELECT: 'select',
  RECT: 'rect',
  ELLIPSE: 'ellipse',
  LINE: 'line',
  ARROW: 'arrow',
  TEXT: 'text',
  ERASER: 'eraser',
} as const;
export type ToolType = (typeof ToolType)[keyof typeof ToolType];

export interface CanvasState {
  readonly tool: ToolType;
  readonly selectedShapeId?: string;
  readonly fillColor: string;
  readonly strokeColor: string;
  readonly strokeWidth: number;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontColor: string;
  readonly opacity: number;
}

export interface CanvasHistory {
  readonly past: ReadonlyArray<ReadonlyArray<Shape>>;
  readonly present: ReadonlyArray<Shape>;
  readonly future: ReadonlyArray<ReadonlyArray<Shape>>;
}
