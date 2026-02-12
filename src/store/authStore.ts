// ============================================================
// AuthStore - Firebase authentication state management
// ============================================================

import { create } from 'zustand';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';
import type { AuthUser, AuthProvider, ApprovalStatus, AuthState } from '../types/auth';
import { useAppStore } from './appStore';

// ---- Helpers ----

function mapFirebaseUser(user: User): AuthUser {
  const providerId = user.providerData[0]?.providerId;
  let provider: AuthProvider = 'email';
  if (providerId === 'google.com') provider = 'google';
  else if (user.isAnonymous) provider = 'anonymous';

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    provider,
  };
}

async function checkApprovalClaim(user: User): Promise<ApprovalStatus> {
  try {
    const tokenResult = await user.getIdTokenResult(true);
    if (tokenResult.claims.approved === true) return 'approved';
    return 'pending';
  } catch {
    return 'unchecked';
  }
}

// ---- Store ----

export interface AuthStoreActions {
  initAuth: () => () => void; // returns unsubscribe
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshApproval: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthStoreActions>()((set, _get) => ({
  // Initial state
  user: null,
  isAuthLoading: true,
  isAuthReady: false,
  approvalStatus: 'unchecked',
  error: null,

  // Listen to auth state changes
  initAuth: () => {
    set({ isAuthLoading: true });
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = mapFirebaseUser(firebaseUser);
        const approvalStatus = await checkApprovalClaim(firebaseUser);
        set({
          user,
          approvalStatus,
          isAuthLoading: false,
          isAuthReady: true,
          error: null,
        });
      } else {
        set({
          user: null,
          approvalStatus: 'unchecked',
          isAuthLoading: false,
          isAuthReady: true,
          error: null,
        });
      }
    });
    return unsubscribe;
  },

  // Google Sign-In
  signInWithGoogle: async () => {
    set({ isAuthLoading: true, error: null });
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle state update
    } catch (err) {
      set({
        isAuthLoading: false,
        error: err instanceof Error ? err.message : 'Google sign-in failed',
      });
    }
  },

  // Email Sign-In
  signInWithEmail: async (email: string, password: string) => {
    set({ isAuthLoading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      set({
        isAuthLoading: false,
        error: err instanceof Error ? err.message : 'Email sign-in failed',
      });
    }
  },

  // Email Sign-Up
  signUpWithEmail: async (email: string, password: string) => {
    set({ isAuthLoading: true, error: null });
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      set({
        isAuthLoading: false,
        error: err instanceof Error ? err.message : 'Sign-up failed',
      });
    }
  },

  // Sign Out — clears local data for security
  signOut: async () => {
    set({ isAuthLoading: true, error: null });
    try {
      await firebaseSignOut(auth);
      // Clear all local data to protect user information
      try {
        await useAppStore.getState().clearAll();
      } catch {
        // Best-effort: don't block sign-out if clear fails
      }
      // onAuthStateChanged will handle state update
    } catch (err) {
      set({
        isAuthLoading: false,
        error: err instanceof Error ? err.message : 'Sign-out failed',
      });
    }
  },

  // Refresh approval status (e.g. after admin approves)
  refreshApproval: async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const approvalStatus = await checkApprovalClaim(currentUser);
    set({ approvalStatus });
  },

  clearError: () => set({ error: null }),
}));
