// ============================================================
// Storage Manager - Main interface for persistence
// ============================================================

import type { AppState } from '../types/app';
import type { StorageAdapter } from '../types/storage';
import { STORAGE_KEY, getDefaultState } from '../constants/schema';
import { SCHEMA_VERSION } from '../constants/schema';
import { isAppState } from '../utils/validation';
import { migrateState } from './migrations';

export class StorageManager {
  private adapter: StorageAdapter;

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  async load(): Promise<AppState> {
    const raw = await this.adapter.get(STORAGE_KEY);

    if (!raw) {
      return getDefaultState();
    }

    // Migrate if older version
    if (typeof raw.version === 'number' && raw.version < SCHEMA_VERSION) {
      console.log(`Migrating from v${raw.version} to v${SCHEMA_VERSION}`);
      const migrated = migrateState(raw as unknown as Record<string, unknown>, raw.version);
      // Save migrated state
      await this.save(migrated);
      return migrated;
    }

    // Validate integrity
    if (!isAppState(raw)) {
      console.warn('Corrupted AppState detected, resetting to default');
      return getDefaultState();
    }

    return raw;
  }

  async save(state: AppState): Promise<void> {
    if (!isAppState(state)) {
      throw new Error('Invalid AppState: cannot save');
    }
    const toSave = { ...state, updatedAt: Date.now() };
    await this.adapter.set(STORAGE_KEY, toSave);
  }

  async clear(): Promise<void> {
    await this.adapter.clear();
  }

  async getSize(): Promise<number> {
    return this.adapter.getSize();
  }
}
