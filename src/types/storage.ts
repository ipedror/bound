// ============================================================
// Storage Types - Adapter interface
// ============================================================

import type { AppState } from './app';

export interface StorageAdapter {
  get(key: string): Promise<AppState | null>;
  set(key: string, value: AppState): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getSize(): Promise<number>;
}
