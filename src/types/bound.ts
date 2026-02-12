// ============================================================
// BoundFile - .bound file format types
// ============================================================

import type { AppState } from './app';

export interface BoundFile {
  readonly version: number;
  readonly schemaVersion: number;
  readonly createdAt: number;
  readonly checksum: string;
  readonly payload: AppState | string; // string if compressed (base64-encoded gzip)
}

export interface BoundExportOptions {
  compress?: boolean;
}

export interface BoundImportOptions {
  mergePolicy?: 'replace' | 'merge';
}
