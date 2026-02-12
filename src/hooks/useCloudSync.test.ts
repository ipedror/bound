// ============================================================
// useCloudSync Hook Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---- Mocks ----

const mockAdapterGet = vi.fn();
const mockSave = vi.fn();

vi.mock('../store/firebaseStorage', () => ({
  FirestoreAdapter: vi.fn().mockImplementation(function () {
    return {
      get: mockAdapterGet,
    };
  }),
}));

vi.mock('../store/storageManager', () => ({
  StorageManager: vi.fn().mockImplementation(function () {
    return {
      save: mockSave,
    };
  }),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn(() => vi.fn()),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
}));

import { useAuthStore } from '../store/authStore';
import { useAppStore, resetStore } from '../store/appStore';
import { getDefaultState } from '../constants/schema';
import { useCloudSync } from './useCloudSync';

function resetAuthStore() {
  useAuthStore.setState({
    user: null,
    isAuthLoading: false,
    isAuthReady: true,
    approvalStatus: 'unchecked',
    error: null,
  });
}

describe('useCloudSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
    resetAuthStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ===================================
  // When not authenticated
  // ===================================

  describe('Not authenticated', () => {
    it('should return isCloudEnabled false when no user', () => {
      const { result } = renderHook(() => useCloudSync());
      expect(result.current.isCloudEnabled).toBe(false);
    });

    it('should set status to offline when no user', () => {
      const { result } = renderHook(() => useCloudSync());
      // syncStatusRef reflects the current status set by effect
      expect(result.current.syncStatus.current).toBe('offline');
    });

    it('should not call adapter when not authenticated', () => {
      renderHook(() => useCloudSync());
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(mockAdapterGet).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  // ===================================
  // When authenticated but not approved
  // ===================================

  describe('Authenticated but not approved', () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: { uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: null, provider: 'email' },
        approvalStatus: 'pending',
      });
    });

    it('should return isCloudEnabled false', () => {
      const { result } = renderHook(() => useCloudSync());
      expect(result.current.isCloudEnabled).toBe(false);
    });

    it('should set status to offline', () => {
      const { result } = renderHook(() => useCloudSync());
      expect(result.current.syncStatus.current).toBe('offline');
    });
  });

  // ===================================
  // When authenticated and approved
  // ===================================

  describe('Authenticated and approved', () => {
    const localState = {
      ...getDefaultState(),
      updatedAt: 2000,
    };

    beforeEach(() => {
      useAuthStore.setState({
        user: { uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: null, provider: 'google' },
        approvalStatus: 'approved',
      });
      useAppStore.setState({ state: localState });
    });

    it('should return isCloudEnabled true', () => {
      mockAdapterGet.mockResolvedValue(null);
      const { result } = renderHook(() => useCloudSync());
      expect(result.current.isCloudEnabled).toBe(true);
    });

    it('should trigger initial sync on mount', async () => {
      mockAdapterGet.mockResolvedValue({ ...getDefaultState(), updatedAt: 1000 });
      mockSave.mockResolvedValue(undefined);

      renderHook(() => useCloudSync());

      // Flush promises
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(mockAdapterGet).toHaveBeenCalledTimes(1);
    });

    it('should push local when local is newer', async () => {
      // Remote is older
      mockAdapterGet.mockResolvedValue({ ...getDefaultState(), updatedAt: 1000 });
      mockSave.mockResolvedValue(undefined);

      renderHook(() => useCloudSync());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should push local when remote does not exist', async () => {
      // No remote doc
      mockAdapterGet.mockResolvedValue(null);
      mockSave.mockResolvedValue(undefined);

      renderHook(() => useCloudSync());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Should push local state to cloud
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should pull remote when remote is newer', async () => {
      const remoteState = { ...getDefaultState(), updatedAt: 9000, areas: [] };
      mockAdapterGet.mockResolvedValue(remoteState);

      renderHook(() => useCloudSync());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Local state should be replaced with remote
      expect(useAppStore.getState().state.updatedAt).toBe(9000);
    });

    it('should set synced status after successful sync', async () => {
      mockAdapterGet.mockResolvedValue({ ...getDefaultState(), updatedAt: 1000 });
      mockSave.mockResolvedValue(undefined);

      let statusHistory: string[] = [];
      const { result } = renderHook(() => useCloudSync());

      // Register listener synchronously before flushing promises
      act(() => {
        result.current.onSyncStatusChange((s) => statusHistory.push(s));
      });

      // Force a new sync tick to capture transitions through the listener
      await act(async () => {
        await result.current.forceSync();
      });

      expect(statusHistory).toContain('syncing');
      expect(statusHistory).toContain('synced');
    });

    it('should set error status on sync failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAdapterGet.mockRejectedValue(new Error('Network error'));

      let lastStatus = '';
      const { result } = renderHook(() => useCloudSync());

      act(() => {
        result.current.onSyncStatusChange((s) => (lastStatus = s));
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(lastStatus).toBe('error');
    });

    it('should sync periodically every 15s', async () => {
      mockAdapterGet.mockResolvedValue({ ...getDefaultState(), updatedAt: 1000 });
      mockSave.mockResolvedValue(undefined);

      renderHook(() => useCloudSync());

      // Initial sync
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(mockAdapterGet).toHaveBeenCalledTimes(1);

      // After 15s → second sync
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(mockAdapterGet).toHaveBeenCalledTimes(2);

      // After another 15s → third sync
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(mockAdapterGet).toHaveBeenCalledTimes(3);
    });

    it('forceSync should trigger an immediate sync', async () => {
      mockAdapterGet.mockResolvedValue({ ...getDefaultState(), updatedAt: 1000 });
      mockSave.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      const callsBefore = mockAdapterGet.mock.calls.length;

      await act(async () => {
        await result.current.forceSync();
      });

      expect(mockAdapterGet).toHaveBeenCalledTimes(callsBefore + 1);
    });

    it('should clean up interval on unmount', async () => {
      mockAdapterGet.mockResolvedValue({ ...getDefaultState(), updatedAt: 1000 });
      mockSave.mockResolvedValue(undefined);

      const { unmount } = renderHook(() => useCloudSync());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      const callsAfterMount = mockAdapterGet.mock.calls.length;

      unmount();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      // No more calls after unmount
      expect(mockAdapterGet).toHaveBeenCalledTimes(callsAfterMount);
    });
  });

  // ===================================
  // onSyncStatusChange subscription
  // ===================================

  describe('onSyncStatusChange', () => {
    it('should allow subscribing and unsubscribing to status changes', () => {
      const { result } = renderHook(() => useCloudSync());
      const spy = vi.fn();

      let unsub: () => void;
      act(() => {
        unsub = result.current.onSyncStatusChange(spy);
      });

      act(() => {
        unsub!();
      });

      // Status changes after unsubscribe should not call spy
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
