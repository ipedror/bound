// ============================================================
// Storage Adapters - LocalStorage & IndexedDB
// ============================================================

import type { AppState } from '../types/app';
import type { StorageAdapter } from '../types/storage';

// ---- LocalStorage Adapter ----
export class LocalStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<AppState | null> {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppState;
    } catch (e) {
      console.warn('Failed to parse LocalStorage', e);
      return null;
    }
  }

  async set(key: string, value: AppState): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, falling back to IndexedDB');
        throw e;
      }
      throw e;
    }
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }

  async getSize(): Promise<number> {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        size += key.length + (localStorage.getItem(key)?.length ?? 0);
      }
    }
    return size * 2; // UTF-16 = 2 bytes per char
  }
}

// ---- IndexedDB Adapter (Fallback) ----
export class IndexedDBAdapter implements StorageAdapter {
  private dbName = 'boundDB';
  private storeName = 'appState';

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<AppState | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result as AppState) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async set(key: string, value: AppState): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async remove(key: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSize(): Promise<number> {
    // IndexedDB doesn't have a built-in size method
    // Estimate by serializing the stored value
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => {
        const total = request.result.reduce((acc: number, item: unknown) => {
          return acc + JSON.stringify(item).length * 2;
        }, 0);
        resolve(total);
      };
      request.onerror = () => reject(request.error);
    });
  }
}
