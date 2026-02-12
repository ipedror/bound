// ============================================================
// Types - Main Export
// Re-exports all domain types for the BOUND application
// ============================================================

// Base types
export type { Position, Dimension, Color, FontStyle } from './base';
export {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_COLOR,
  DEFAULT_POSITION,
  DEFAULT_DIMENSION,
  DEFAULT_FONT_STYLE,
} from './base';

// Enums
export { PropertyType, LinkType, ShapeType, ContentStatus } from './enums';

// Canvas types
export { ToolType } from './canvas';
export type { CanvasState, CanvasHistory } from './canvas';

// Domain types
export type { Property } from './property';
export type { Shape, ShapeStyle } from './shape';
export type { Content } from './content';
export type { Link } from './link';
export type { Area } from './area';
export type { GraphNode, GraphEdge, Graph, HierarchyLevelConfig } from './graph';
export type { AppState } from './app';

// Storage & file types
export type { StorageAdapter } from './storage';
export type { BoundFile, BoundExportOptions, BoundImportOptions } from './bound';
