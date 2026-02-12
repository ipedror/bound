// ============================================================
// Schema Constants - Version management & defaults
// ============================================================

import type { AppState } from '../types/app';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'bound:app-state';

export function getDefaultState(): AppState {
  return {
    version: SCHEMA_VERSION,
    areas: [],
    contents: [],
    links: [],
    graphFrames: [],
    graph: null,
    currentAreaId: undefined,
    currentContentId: undefined,
    createdAt: Date.now(),
    updatedAt: 0,
  };
}
