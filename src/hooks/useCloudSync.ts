// ============================================================
// useCloudSync - Automatic cloud synchronization hook
// Syncs local state to Firestore every 15s when authenticated
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { FirestoreAdapter } from '../store/firebaseStorage';
import { StorageManager } from '../store/storageManager';
import { useShallow } from 'zustand/shallow';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

const SYNC_INTERVAL_MS = 15_000;

export function useCloudSync() {
  const { user, approvalStatus } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      approvalStatus: s.approvalStatus,
    })),
  );

  // State is accessed directly via useAppStore.getState() inside syncTick
  // to avoid stale closures with interval-based sync

  const syncStatusRef = useRef<SyncStatus>('idle');
  const lastSyncedAtRef = useRef<number>(0);
  const statusListenersRef = useRef<Set<(status: SyncStatus) => void>>(new Set());

  // Notify status change
  const setSyncStatus = useCallback((status: SyncStatus) => {
    syncStatusRef.current = status;
    statusListenersRef.current.forEach((fn) => fn(status));
  }, []);

  // Subscribe to status changes (for UI)
  const onSyncStatusChange = useCallback((fn: (status: SyncStatus) => void) => {
    statusListenersRef.current.add(fn);
    return () => {
      statusListenersRef.current.delete(fn);
    };
  }, []);

  // Cloud sync tick
  const syncTick = useCallback(async () => {
    if (!user || approvalStatus !== 'approved') return;

    const adapter = new FirestoreAdapter(user.uid);

    try {
      setSyncStatus('syncing');

      // Load remote state directly (bypass StorageManager to detect "no doc")
      const remoteRaw = await adapter.get('');
      const localState = useAppStore.getState().state;
      const localTime = localState.updatedAt ?? 0;

      if (remoteRaw === null) {
        // No remote data exists yet → push local state to cloud
        if (localTime > 0) {
          const manager = new StorageManager(adapter);
          await manager.save(localState);
        }
      } else {
        const remoteTime = remoteRaw.updatedAt ?? 0;

        if (remoteTime > localTime) {
          // Remote is newer → pull
          useAppStore.setState({ state: remoteRaw, lastSyncTime: Date.now() });
        } else if (localTime > lastSyncedAtRef.current) {
          // Local is newer since last sync → push
          const manager = new StorageManager(adapter);
          await manager.save(localState);
        }
        // else: no changes, skip
      }

      lastSyncedAtRef.current = Date.now();
      setSyncStatus('synced');
    } catch (err) {
      console.error('[useCloudSync] sync failed:', err);
      setSyncStatus('error');
    }
  }, [user, approvalStatus, setSyncStatus]);

  // Set up interval
  useEffect(() => {
    if (!user || approvalStatus !== 'approved') {
      setSyncStatus('offline');
      return;
    }

    // Initial sync on mount / auth change
    syncTick();

    const intervalId = setInterval(syncTick, SYNC_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [user, approvalStatus, syncTick, setSyncStatus]);

  // Force sync (callable from UI)
  const forceSync = useCallback(async () => {
    await syncTick();
  }, [syncTick]);

  return {
    syncStatus: syncStatusRef,
    onSyncStatusChange,
    forceSync,
    isCloudEnabled: !!user && approvalStatus === 'approved',
  };
}
