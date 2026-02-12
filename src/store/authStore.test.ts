// ============================================================
// AuthStore Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { User } from 'firebase/auth';

// ---- Firebase mocks (must be before imports) ----

const mockOnAuthStateChanged = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetIdTokenResult = vi.fn();

// Mock currentUser – mutable ref for refreshApproval
let mockCurrentUser: Partial<User> | null = null;

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  GoogleAuthProvider: vi.fn(),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  getAuth: vi.fn(() => ({
    get currentUser() {
      return mockCurrentUser;
    },
  })),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
}));

// ---- Import AFTER mocks ----
import { useAuthStore } from './authStore';

// ---- Helpers ----

function resetAuthStore() {
  useAuthStore.setState({
    user: null,
    isAuthLoading: true,
    isAuthReady: false,
    approvalStatus: 'unchecked',
    error: null,
  });
}

function createMockFirebaseUser(overrides: Partial<User> = {}): Partial<User> {
  return {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://photo.url/avatar.png',
    isAnonymous: false,
    providerData: [{ providerId: 'google.com' } as any],
    getIdTokenResult: mockGetIdTokenResult,
    ...overrides,
  };
}

describe('AuthStore', () => {
  beforeEach(() => {
    resetAuthStore();
    mockCurrentUser = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===================================
  // Initial State
  // ===================================

  describe('Initial State', () => {
    it('should start with null user', () => {
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('should start with isAuthLoading true', () => {
      expect(useAuthStore.getState().isAuthLoading).toBe(true);
    });

    it('should start with isAuthReady false', () => {
      expect(useAuthStore.getState().isAuthReady).toBe(false);
    });

    it('should start with unchecked approval status', () => {
      expect(useAuthStore.getState().approvalStatus).toBe('unchecked');
    });

    it('should start with null error', () => {
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  // ===================================
  // initAuth
  // ===================================

  describe('initAuth', () => {
    it('should call onAuthStateChanged and return unsubscribe', () => {
      const mockUnsub = vi.fn();
      mockOnAuthStateChanged.mockReturnValue(mockUnsub);

      const unsub = useAuthStore.getState().initAuth();
      expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
      expect(typeof unsub).toBe('function');
    });

    it('should set isAuthLoading on init', () => {
      mockOnAuthStateChanged.mockReturnValue(vi.fn());
      useAuthStore.setState({ isAuthLoading: false });

      useAuthStore.getState().initAuth();
      expect(useAuthStore.getState().isAuthLoading).toBe(true);
    });

    it('should set user and isAuthReady when user signs in (google)', async () => {
      const mockUser = createMockFirebaseUser();
      mockGetIdTokenResult.mockResolvedValue({
        claims: { approved: true },
      });
      mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: Function) => {
        callback(mockUser);
        return vi.fn();
      });

      useAuthStore.getState().initAuth();

      // Wait for async checkApprovalClaim
      await vi.waitFor(() => {
        expect(useAuthStore.getState().isAuthReady).toBe(true);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual({
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://photo.url/avatar.png',
        provider: 'google',
      });
      expect(state.approvalStatus).toBe('approved');
      expect(state.isAuthLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should detect email provider correctly', async () => {
      const mockUser = createMockFirebaseUser({
        providerData: [{ providerId: 'password' } as any],
      });
      mockGetIdTokenResult.mockResolvedValue({ claims: {} });
      mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: Function) => {
        cb(mockUser);
        return vi.fn();
      });

      useAuthStore.getState().initAuth();
      await vi.waitFor(() => {
        expect(useAuthStore.getState().isAuthReady).toBe(true);
      });
      expect(useAuthStore.getState().user?.provider).toBe('email');
    });

    it('should detect anonymous provider correctly', async () => {
      const mockUser = createMockFirebaseUser({
        isAnonymous: true,
        providerData: [{ providerId: 'anonymous' } as any],
      });
      mockGetIdTokenResult.mockResolvedValue({ claims: {} });
      mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: Function) => {
        cb(mockUser);
        return vi.fn();
      });

      useAuthStore.getState().initAuth();
      await vi.waitFor(() => {
        expect(useAuthStore.getState().isAuthReady).toBe(true);
      });
      expect(useAuthStore.getState().user?.provider).toBe('anonymous');
    });

    it('should set pending when approved claim is missing', async () => {
      const mockUser = createMockFirebaseUser();
      mockGetIdTokenResult.mockResolvedValue({ claims: {} });
      mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: Function) => {
        cb(mockUser);
        return vi.fn();
      });

      useAuthStore.getState().initAuth();
      await vi.waitFor(() => {
        expect(useAuthStore.getState().isAuthReady).toBe(true);
      });
      expect(useAuthStore.getState().approvalStatus).toBe('pending');
    });

    it('should set unchecked when getIdTokenResult throws', async () => {
      const mockUser = createMockFirebaseUser();
      mockGetIdTokenResult.mockRejectedValue(new Error('Network error'));
      mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: Function) => {
        cb(mockUser);
        return vi.fn();
      });

      useAuthStore.getState().initAuth();
      await vi.waitFor(() => {
        expect(useAuthStore.getState().isAuthReady).toBe(true);
      });
      expect(useAuthStore.getState().approvalStatus).toBe('unchecked');
    });

    it('should clear user on sign out (null firebaseUser)', async () => {
      // First sign in
      useAuthStore.setState({
        user: { uid: 'x', email: 'x', displayName: 'x', photoURL: null, provider: 'email' },
        approvalStatus: 'approved',
      });

      mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: Function) => {
        cb(null); // signed out
        return vi.fn();
      });

      useAuthStore.getState().initAuth();
      await vi.waitFor(() => {
        expect(useAuthStore.getState().isAuthReady).toBe(true);
      });

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().approvalStatus).toBe('unchecked');
      expect(useAuthStore.getState().isAuthLoading).toBe(false);
    });
  });

  // ===================================
  // signInWithGoogle
  // ===================================

  describe('signInWithGoogle', () => {
    it('should call signInWithPopup', async () => {
      mockSignInWithPopup.mockResolvedValue({});
      await useAuthStore.getState().signInWithGoogle();
      expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    });

    it('should set isAuthLoading during sign in', async () => {
      mockSignInWithPopup.mockResolvedValue({});
      const promise = useAuthStore.getState().signInWithGoogle();
      // isAuthLoading was set synchronously before await
      expect(useAuthStore.getState().isAuthLoading).toBe(true);
      await promise;
    });

    it('should set error on failure', async () => {
      mockSignInWithPopup.mockRejectedValue(new Error('Popup blocked'));
      await useAuthStore.getState().signInWithGoogle();
      expect(useAuthStore.getState().error).toBe('Popup blocked');
      expect(useAuthStore.getState().isAuthLoading).toBe(false);
    });

    it('should set generic error for non-Error throws', async () => {
      mockSignInWithPopup.mockRejectedValue('unknown error');
      await useAuthStore.getState().signInWithGoogle();
      expect(useAuthStore.getState().error).toBe('Google sign-in failed');
    });
  });

  // ===================================
  // signInWithEmail
  // ===================================

  describe('signInWithEmail', () => {
    it('should call signInWithEmailAndPassword', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue({});
      await useAuthStore.getState().signInWithEmail('a@b.com', 'pass123');
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'a@b.com',
        'pass123',
      );
    });

    it('should set error on failure', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue(new Error('Wrong password'));
      await useAuthStore.getState().signInWithEmail('a@b.com', 'bad');
      expect(useAuthStore.getState().error).toBe('Wrong password');
      expect(useAuthStore.getState().isAuthLoading).toBe(false);
    });

    it('should set generic error for non-Error throws', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid' });
      await useAuthStore.getState().signInWithEmail('a@b.com', 'bad');
      expect(useAuthStore.getState().error).toBe('Email sign-in failed');
    });
  });

  // ===================================
  // signUpWithEmail
  // ===================================

  describe('signUpWithEmail', () => {
    it('should call createUserWithEmailAndPassword', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue({});
      await useAuthStore.getState().signUpWithEmail('new@b.com', 'pass123');
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'new@b.com',
        'pass123',
      );
    });

    it('should set error on failure', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValue(
        new Error('Email already in use'),
      );
      await useAuthStore.getState().signUpWithEmail('dup@b.com', 'pass');
      expect(useAuthStore.getState().error).toBe('Email already in use');
      expect(useAuthStore.getState().isAuthLoading).toBe(false);
    });

    it('should set generic error for non-Error throws', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValue(42);
      await useAuthStore.getState().signUpWithEmail('x@b.com', 'pass');
      expect(useAuthStore.getState().error).toBe('Sign-up failed');
    });
  });

  // ===================================
  // signOut
  // ===================================

  describe('signOut', () => {
    it('should call firebaseSignOut', async () => {
      mockSignOut.mockResolvedValue(undefined);
      await useAuthStore.getState().signOut();
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('should set isAuthLoading during sign out', async () => {
      mockSignOut.mockResolvedValue(undefined);
      const promise = useAuthStore.getState().signOut();
      expect(useAuthStore.getState().isAuthLoading).toBe(true);
      await promise;
    });

    it('should set error on failure', async () => {
      mockSignOut.mockRejectedValue(new Error('Network error'));
      await useAuthStore.getState().signOut();
      expect(useAuthStore.getState().error).toBe('Network error');
      expect(useAuthStore.getState().isAuthLoading).toBe(false);
    });

    it('should set generic error for non-Error throws', async () => {
      mockSignOut.mockRejectedValue('oops');
      await useAuthStore.getState().signOut();
      expect(useAuthStore.getState().error).toBe('Sign-out failed');
    });
  });

  // ===================================
  // refreshApproval
  // ===================================

  describe('refreshApproval', () => {
    it('should do nothing when no currentUser', async () => {
      mockCurrentUser = null;
      await useAuthStore.getState().refreshApproval();
      // Should not throw, approval unchanged
      expect(useAuthStore.getState().approvalStatus).toBe('unchecked');
    });

    it('should update approval to approved when claim present', async () => {
      mockCurrentUser = createMockFirebaseUser() as User;
      mockGetIdTokenResult.mockResolvedValue({
        claims: { approved: true },
      });

      await useAuthStore.getState().refreshApproval();
      expect(useAuthStore.getState().approvalStatus).toBe('approved');
    });

    it('should update approval to pending when claim missing', async () => {
      mockCurrentUser = createMockFirebaseUser() as User;
      mockGetIdTokenResult.mockResolvedValue({ claims: {} });

      await useAuthStore.getState().refreshApproval();
      expect(useAuthStore.getState().approvalStatus).toBe('pending');
    });

    it('should set unchecked when getIdTokenResult fails', async () => {
      mockCurrentUser = createMockFirebaseUser() as User;
      mockGetIdTokenResult.mockRejectedValue(new Error('fail'));

      await useAuthStore.getState().refreshApproval();
      expect(useAuthStore.getState().approvalStatus).toBe('unchecked');
    });
  });

  // ===================================
  // clearError
  // ===================================

  describe('clearError', () => {
    it('should clear the error', () => {
      useAuthStore.setState({ error: 'Something went wrong' });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should be a no-op when no error exists', () => {
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
