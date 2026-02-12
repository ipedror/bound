// ============================================================
// FirestoreAdapter Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AppState } from '../types/app';
import { getDefaultState } from '../constants/schema';

// ---- Firestore mocks ----

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn(() => 'mock-doc-ref');

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: (...args: unknown[]) => mockDoc(...(args as [])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
}));

// Import after mocks
import { FirestoreAdapter } from './firebaseStorage';

describe('FirestoreAdapter', () => {
  let adapter: FirestoreAdapter;
  let sampleState: AppState;

  beforeEach(() => {
    adapter = new FirestoreAdapter('user-abc');
    sampleState = {
      ...getDefaultState(),
      areas: [{ id: 'a1', name: 'Area 1', contentIds: [], createdAt: 1000, updatedAt: 1000 } as any],
      updatedAt: Date.now(),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===================================
  // Constructor & docRef
  // ===================================

  describe('Constructor', () => {
    it('should create an adapter with the given uid', () => {
      expect(adapter).toBeDefined();
    });

    it('should construct the document reference with correct path', () => {
      // Trigger docRef access via any method
      mockGetDoc.mockResolvedValue({ exists: () => false });
      adapter.get('any-key');
      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'user-abc',
        'data',
        'state',
      );
    });
  });

  // ===================================
  // get
  // ===================================

  describe('get', () => {
    it('should return data when document exists', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => sampleState,
      });

      const result = await adapter.get('ignored-key');
      expect(result).toEqual(sampleState);
    });

    it('should return null when document does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await adapter.get('ignored-key');
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetDoc.mockRejectedValue(new Error('Permission denied'));

      const result = await adapter.get('key');
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[FirestoreAdapter] get failed:',
        expect.any(Error),
      );
    });

    it('should ignore the key parameter', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });
      await adapter.get('any-key');
      await adapter.get('other-key');
      // Both should call the same doc ref
      expect(mockDoc).toHaveBeenCalledTimes(2);
    });
  });

  // ===================================
  // set
  // ===================================

  describe('set', () => {
    it('should call setDoc with cleaned data', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await adapter.set('key', sampleState);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({ version: sampleState.version }),
      );
    });

    it('should strip undefined values (Firestore compatibility)', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      const stateWithUndefined = {
        ...sampleState,
        currentAreaId: undefined,
        currentContentId: undefined,
      };
      await adapter.set('key', stateWithUndefined);

      const setArg = mockSetDoc.mock.calls[0][1];
      expect(setArg).not.toHaveProperty('currentAreaId');
      expect(setArg).not.toHaveProperty('currentContentId');
    });

    it('should throw on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSetDoc.mockRejectedValue(new Error('Quota exceeded'));

      await expect(adapter.set('key', sampleState)).rejects.toThrow('Quota exceeded');
    });
  });

  // ===================================
  // remove
  // ===================================

  describe('remove', () => {
    it('should call deleteDoc', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);
      await adapter.remove('key');
      expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
    });

    it('should throw on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDeleteDoc.mockRejectedValue(new Error('Not found'));
      await expect(adapter.remove('key')).rejects.toThrow('Not found');
    });
  });

  // ===================================
  // clear
  // ===================================

  describe('clear', () => {
    it('should call remove internally', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);
      await adapter.clear();
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================
  // getSize
  // ===================================

  describe('getSize', () => {
    it('should return size when document exists', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => sampleState,
      });

      const size = await adapter.getSize();
      expect(size).toBeGreaterThan(0);
      // Size should be roughly the JSON string length
      const expected = new Blob([JSON.stringify(sampleState)]).size;
      expect(size).toBe(expected);
    });

    it('should return 0 when document does not exist', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });
      const size = await adapter.getSize();
      expect(size).toBe(0);
    });

    it('should return 0 on error', async () => {
      mockGetDoc.mockRejectedValue(new Error('fail'));
      const size = await adapter.getSize();
      expect(size).toBe(0);
    });
  });
});
