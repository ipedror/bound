// ============================================================
// Base Types - Position, Dimension, Color, FontStyle
// ============================================================

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Dimension {
  readonly width: number;
  readonly height: number;
}

export interface Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a?: number;
}

export interface FontStyle {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight?: number;
  readonly color: string;
}

// Defaults
export const DEFAULT_FONT_FAMILY = 'Arial';
export const DEFAULT_FONT_SIZE = 14;
export const DEFAULT_FONT_COLOR = '#ffffff';

export const DEFAULT_POSITION: Position = { x: 0, y: 0 };
export const DEFAULT_DIMENSION: Dimension = { width: 100, height: 100 };

export const DEFAULT_FONT_STYLE: FontStyle = {
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: DEFAULT_FONT_SIZE,
  color: DEFAULT_FONT_COLOR,
};
