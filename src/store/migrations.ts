// ============================================================
// Migrations - Schema version upgrades
// ============================================================

import type { AppState } from '../types/app';
import { SCHEMA_VERSION } from '../constants/schema';

export type Migration = (state: Record<string, unknown>) => AppState;

export const migrations: Record<number, Migration> = {
  // v1: identity migration for new apps or legacy data without version
  1: (state: Record<string, unknown>): AppState => {
    return {
      version: 1,
      areas: Array.isArray(state.areas) ? state.areas : [],
      contents: Array.isArray(state.contents) ? state.contents : [],
      links: Array.isArray(state.links) ? state.links : [],
      graph: null,
      currentAreaId: undefined,
      currentContentId: undefined,
      createdAt: typeof state.createdAt === 'number' ? state.createdAt : Date.now(),
      updatedAt: Date.now(),
    } as AppState;
  },
};

export function migrateState(state: Record<string, unknown>, fromVersion: number): AppState {
  if (fromVersion >= SCHEMA_VERSION) return state as unknown as AppState;

  let current: Record<string, unknown> = state;
  for (let v = fromVersion + 1; v <= SCHEMA_VERSION; v++) {
    if (migrations[v]) {
      current = migrations[v](current) as unknown as Record<string, unknown>;
    }
  }

  // If fromVersion was 0 or less, apply v1 migration
  if (fromVersion < 1 && migrations[1]) {
    current = migrations[1](current) as unknown as Record<string, unknown>;
  }

  return current as unknown as AppState;
}
