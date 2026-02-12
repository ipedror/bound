// ============================================================
// AppState - global application state
// ============================================================

import type { Area } from './area';
import type { Content } from './content';
import type { Link } from './link';
import type { Graph, GraphFrame, HierarchyLevelConfig } from './graph';

export interface AppState {
  readonly areas: Area[];
  readonly contents: Content[];
  readonly links: Link[];
  readonly graphFrames: GraphFrame[];
  readonly hierarchyLevelConfigs?: HierarchyLevelConfig[];
  readonly graph: Graph | null;
  readonly currentAreaId?: string;
  readonly currentContentId?: string;
  readonly version: number;
  createdAt: number;
  updatedAt: number;
}
