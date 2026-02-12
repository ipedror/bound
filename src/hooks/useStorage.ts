// ============================================================
// useStorage - Hook for storage operations
// ============================================================

import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';

export interface UseStorageReturn {
  isLoading: boolean;
  error: string | null;
  lastSyncTime: number | null;
  load: () => Promise<void>;
  save: () => Promise<void>;
  clear: () => Promise<void>;
  clearError: () => void;
}

export function useStorage(): UseStorageReturn {
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const lastSyncTime = useAppStore((state) => state.lastSyncTime);

  const { loadFromStorage, saveToStorage, clearAll, clearError } = useAppStore();

  const load = useCallback(async () => {
    await loadFromStorage();
  }, [loadFromStorage]);

  const save = useCallback(async () => {
    await saveToStorage();
  }, [saveToStorage]);

  const clear = useCallback(async () => {
    await clearAll();
  }, [clearAll]);

  return {
    isLoading,
    error,
    lastSyncTime,
    load,
    save,
    clear,
    clearError,
  };
}
