// ============================================================
// BoundSerializer - Encode/Decode .bound files
// ============================================================

import type { AppState } from '../types/app';
import type { BoundFile, BoundExportOptions } from '../types/bound';
import { SCHEMA_VERSION } from '../constants/schema';
import { isAppState } from './validation';
import { isBoundFile, validateBoundFile } from './validation/boundValidator';
import { migrateState } from '../store/migrations';

export class BoundSerializer {
  /**
   * Encode AppState into a .bound file string.
   */
  static async encode(state: AppState, options?: BoundExportOptions): Promise<string> {
    if (!isAppState(state)) {
      throw new Error('Invalid AppState: cannot encode');
    }

    const payloadJson = JSON.stringify(state);
    const checksum = await this.calculateChecksum(payloadJson);

    const shouldCompress = options?.compress ?? false;
    let payload: AppState | string;

    if (shouldCompress) {
      payload = await this.compress(payloadJson);
    } else {
      payload = state;
    }

    const file: BoundFile = {
      version: 1,
      schemaVersion: SCHEMA_VERSION,
      createdAt: Date.now(),
      checksum,
      payload,
    };

    return JSON.stringify(file, null, 2);
  }

  /**
   * Decode a .bound file string back into AppState.
   */
  static async decode(fileContent: string): Promise<AppState> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      throw new Error('Failed to parse .bound file: invalid JSON');
    }

    if (!isBoundFile(parsed)) {
      throw new Error('Invalid .bound file structure');
    }

    const file = parsed;

    // Validate file metadata
    const errors = validateBoundFile(file);
    if (errors.length > 0) {
      throw new Error(`Invalid .bound file: ${errors.join(', ')}`);
    }

    // Decompress if needed
    let payloadJson: string;
    if (typeof file.payload === 'string') {
      // Compressed payload (base64-encoded gzip)
      payloadJson = await this.decompress(file.payload);
    } else {
      payloadJson = JSON.stringify(file.payload);
    }

    // Verify checksum
    const calculatedChecksum = await this.calculateChecksum(payloadJson);
    if (calculatedChecksum !== file.checksum) {
      throw new Error('Checksum mismatch: file may be corrupted');
    }

    // Parse state
    let state: AppState;
    try {
      state = JSON.parse(payloadJson) as AppState;
    } catch {
      throw new Error('Failed to parse state payload from .bound file');
    }

    // Validate state
    if (!isAppState(state)) {
      throw new Error('Invalid AppState in .bound file');
    }

    // Migrate if needed
    if (state.version < SCHEMA_VERSION) {
      state = migrateState(state as unknown as Record<string, unknown>, state.version);
    }

    return state;
  }

  /**
   * Calculate SHA-256 checksum of a string.
   */
  static async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Compress string using pako gzip → base64.
   */
  static async compress(data: string): Promise<string> {
    const pako = await import('pako');
    const encoder = new TextEncoder();
    const compressed = pako.gzip(encoder.encode(data));
    // Convert Uint8Array to base64
    let binary = '';
    for (let i = 0; i < compressed.length; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    return btoa(binary);
  }

  /**
   * Decompress base64-encoded gzip string.
   */
  static async decompress(data: string): Promise<string> {
    const pako = await import('pako');
    // Convert base64 to Uint8Array
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decompressed = pako.ungzip(bytes);
    const decoder = new TextDecoder();
    return decoder.decode(decompressed);
  }
}
