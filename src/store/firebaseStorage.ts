// ============================================================
// FirestoreAdapter - Cloud Firestore storage adapter
// Stores user state in users/{uid}/state document
// ============================================================

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { AppState } from '../types/app';
import type { StorageAdapter } from '../types/storage';

/**
 * Firestore-backed StorageAdapter.
 * The `key` parameter is ignored; instead, data is stored at
 * `users/{uid}/data/state` in Firestore.
 */
export class FirestoreAdapter implements StorageAdapter {
  private uid: string;

  constructor(uid: string) {
    this.uid = uid;
  }

  private get docRef() {
    return doc(db, 'users', this.uid, 'data', 'state');
  }

  async get(_key: string): Promise<AppState | null> {
    try {
      const snapshot = await getDoc(this.docRef);
      if (!snapshot.exists()) return null;
      return snapshot.data() as AppState;
    } catch (err) {
      console.error('[FirestoreAdapter] get failed:', err);
      return null;
    }
  }

  async set(_key: string, value: AppState): Promise<void> {
    try {
      // Firestore doesn't support `undefined` values, strip them
      const clean = JSON.parse(JSON.stringify(value));
      await setDoc(this.docRef, clean);
    } catch (err) {
      console.error('[FirestoreAdapter] set failed:', err);
      throw err;
    }
  }

  async remove(_key: string): Promise<void> {
    try {
      await deleteDoc(this.docRef);
    } catch (err) {
      console.error('[FirestoreAdapter] remove failed:', err);
      throw err;
    }
  }

  async clear(): Promise<void> {
    await this.remove('');
  }

  async getSize(): Promise<number> {
    try {
      const snapshot = await getDoc(this.docRef);
      if (!snapshot.exists()) return 0;
      // Estimate size by serializing
      return new Blob([JSON.stringify(snapshot.data())]).size;
    } catch {
      return 0;
    }
  }
}
