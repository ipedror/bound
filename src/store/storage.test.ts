// ============================================================
// Storage Tests
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageManager } from './storageManager';
import { getDefaultState, SCHEMA_VERSION, STORAGE_KEY } from '../constants/schema';
import type { AppState } from '../types/app';
import type { StorageAdapter } from '../types/storage';

// In-memory adapter for testing (avoids jsdom localStorage issues)
class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  async get(key: string): Promise<AppState | null> {
    const raw = this.store.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppState;
    } catch {
      return null;
    }
  }

  async set(key: string, value: AppState): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getSize(): Promise<number> {
    let size = 0;
    for (const [key, value] of this.store) {
      size += key.length + value.length;
    }
    return size * 2;
  }

  // Direct raw set for testing invalid/old data
  setRaw(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('InMemoryStorageAdapter', () => {
  let adapter: InMemoryStorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  it('should return null for missing key', async () => {
    const result = await adapter.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should set and get value', async () => {
    const state = getDefaultState();
    await adapter.set('test-key', state);
    const loaded = await adapter.get('test-key');
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(SCHEMA_VERSION);
  });

  it('should remove value', async () => {
    const state = getDefaultState();
    await adapter.set('test-key', state);
    await adapter.remove('test-key');
    const loaded = await adapter.get('test-key');
    expect(loaded).toBeNull();
  });

  it('should clear all values', async () => {
    const state = getDefaultState();
    await adapter.set('key1', state);
    await adapter.set('key2', state);
    await adapter.clear();
    expect(await adapter.get('key1')).toBeNull();
    expect(await adapter.get('key2')).toBeNull();
  });

  it('should return size > 0 after storing data', async () => {
    const state = getDefaultState();
    await adapter.set('test-key', state);
    const size = await adapter.getSize();
    expect(size).toBeGreaterThan(0);
  });
});

describe('StorageManager', () => {
  let adapter: InMemoryStorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  it('should load default state if empty', async () => {
    const manager = new StorageManager(adapter);
    const state = await manager.load();
    expect(state.version).toBe(SCHEMA_VERSION);
    expect(state.areas).toEqual([]);
    expect(state.contents).toEqual([]);
    expect(state.links).toEqual([]);
  });

  it('should save and load state', async () => {
    const manager = new StorageManager(adapter);
    const state = getDefaultState();
    (
      state as {
        areas: {
          id: string;
          name: string;
          contentIds: string[];
          createdAt: number;
          updatedAt: number;
        }[];
      }
    ).areas.push({
      id: '1',
      name: 'Test',
      contentIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await manager.save(state);
    const loaded = await manager.load();
    expect(loaded.areas).toHaveLength(1);
    expect(loaded.areas[0].name).toBe('Test');
  });

  it('should migrate state from older version', async () => {
    const oldState = {
      version: 0,
      areas: [],
      contents: [],
      links: [],
      graph: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await adapter.set(STORAGE_KEY, oldState as unknown as AppState);

    const manager = new StorageManager(adapter);
    const loaded = await manager.load();
    expect(loaded.version).toBe(SCHEMA_VERSION);
  });

  it('should reject invalid state on save', async () => {
    const manager = new StorageManager(adapter);
    const invalidState = { foo: 'bar' } as unknown as AppState;
    await expect(manager.save(invalidState)).rejects.toThrow('Invalid AppState');
  });

  it('should return default state for corrupted data', async () => {
    adapter.setRaw(STORAGE_KEY, 'not-valid-json{{{');
    const manager = new StorageManager(adapter);
    const state = await manager.load();
    expect(state.version).toBe(SCHEMA_VERSION);
    expect(state.areas).toEqual([]);
  });

  it('should return size', async () => {
    const manager = new StorageManager(adapter);
    const state = getDefaultState();
    await manager.save(state);
    const size = await manager.getSize();
    expect(size).toBeGreaterThan(0);
  });

  it('should clear storage', async () => {
    const manager = new StorageManager(adapter);
    const state = getDefaultState();
    await manager.save(state);
    await manager.clear();
    const loaded = await manager.load();
    expect(loaded.areas).toEqual([]);
  });
});

describe('LocalStorageAdapter', () => {
  // Use dynamic import to access LocalStorageAdapter
  let LocalStorageAdapter: typeof import('./storage').LocalStorageAdapter;
  let mockStorage: Map<string, string>;
  let originalLocalStorage: Storage;

  beforeEach(async () => {
    // Dynamically import to trigger coverage
    const module = await import('./storage');
    LocalStorageAdapter = module.LocalStorageAdapter;

    // Mock localStorage
    mockStorage = new Map<string, string>();
    originalLocalStorage = globalThis.localStorage;

    const mockLocalStorage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
      clear: () => mockStorage.clear(),
      get length() {
        return mockStorage.size;
      },
      key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
    } as Storage;

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('should return null for missing key', async () => {
    const adapter = new LocalStorageAdapter();
    const result = await adapter.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should set and get value', async () => {
    const adapter = new LocalStorageAdapter();
    const state = getDefaultState();
    await adapter.set('test-key', state);
    const loaded = await adapter.get('test-key');
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(SCHEMA_VERSION);
  });

  it('should remove value', async () => {
    const adapter = new LocalStorageAdapter();
    const state = getDefaultState();
    await adapter.set('test-key', state);
    await adapter.remove('test-key');
    const loaded = await adapter.get('test-key');
    expect(loaded).toBeNull();
  });

  it('should clear all values', async () => {
    const adapter = new LocalStorageAdapter();
    const state = getDefaultState();
    await adapter.set('key1', state);
    await adapter.set('key2', state);
    await adapter.clear();
    expect(await adapter.get('key1')).toBeNull();
    expect(await adapter.get('key2')).toBeNull();
  });

  it('should return size > 0 after storing data', async () => {
    const adapter = new LocalStorageAdapter();
    const state = getDefaultState();
    await adapter.set('test-key', state);
    const size = await adapter.getSize();
    expect(size).toBeGreaterThan(0);
  });

  it('should return null for invalid JSON', async () => {
    const adapter = new LocalStorageAdapter();
    mockStorage.set('corrupt-key', 'not-valid-json{{{');
    const result = await adapter.get('corrupt-key');
    expect(result).toBeNull();
  });
});