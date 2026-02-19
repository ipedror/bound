// ============================================================
// Canvas Constants - defaults, colors, fonts
// ============================================================

import type { CanvasState } from '../types/canvas';
import { ToolType } from '../types/canvas';

export const DEFAULT_CANVAS_STATE: CanvasState = {
  tool: ToolType.SELECT,
  fillColor: '#1a1a2e',
  strokeColor: '#00d4ff',
  strokeWidth: 2,
  fontFamily: 'Arial',
  fontSize: 16,
  fontColor: '#f1f1f1',
  opacity: 1,
  textMaxWidth: 0,
  roughness: 0,
};

export const WEB_SAFE_FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
] as const;

export const PREDEFINED_COLORS = [
  '#00d4ff', // cyan
  '#ff006e', // pink
  '#ffbe0b', // yellow
  '#8338ec', // purple
  '#3a86ff', // blue
  '#06ffa5', // green
  '#ffffff', // white
  '#1a1a2e', // dark (background)
] as const;

export const DEFAULT_SHAPE_STYLES = {
  fill: '#1a1a2e',
  stroke: '#00d4ff',
  strokeWidth: 2,
  opacity: 1,
  roughness: 0,
} as const;

export const HAND_DRAWN_FONT = 'Segoe Print, Comic Sans MS, cursive';

export const CANVAS_BACKGROUND_COLOR = '#1a1a2e';
export const CANVAS_DEFAULT_WIDTH = 960;
export const CANVAS_DEFAULT_HEIGHT = 540;
export const SELECTION_COLOR = '#00d4ff';
export const SELECTION_STROKE_WIDTH = 2;
export const HANDLE_SIZE = 8;
export const MIN_SHAPE_SIZE = 10;
export const HISTORY_MAX_SIZE = 50;
