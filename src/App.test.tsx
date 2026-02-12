// ============================================================
// App (AuthGate) Component Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// ---- Firebase mocks ----

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

// Mock the router to avoid loading all route components
vi.mock('./routes', () => ({
  router: null,
}));

// Mock RouterProvider to render a simple child
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    RouterProvider: () => <div data-testid="router-content">App Content</div>,
  };
});

import App from './App';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';

const mockLoadFromStorage = vi.fn().mockResolvedValue(undefined);

function resetAuthStore(state?: Partial<ReturnType<typeof useAuthStore.getState>>) {
  useAuthStore.setState({
    user: null,
    isAuthLoading: false,
    isAuthReady: false,
    approvalStatus: 'unchecked',
    error: null,
    ...state,
  });
  // Ensure loadFromStorage is always mocked
  useAppStore.setState({ loadFromStorage: mockLoadFromStorage } as any);
}

describe('App (AuthGate)', () => {
  beforeEach(() => {
    resetAuthStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===================================
  // Loading state
  // ===================================

  describe('Loading state', () => {
    it('should show Loading... when isAuthReady is false', () => {
      resetAuthStore({ isAuthReady: false });

      // Mock initAuth to NOT trigger ready
      useAuthStore.setState({
        initAuth: () => vi.fn(),
      });

      render(<App />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not show app content when loading', () => {
      resetAuthStore({ isAuthReady: false });
      useAuthStore.setState({
        initAuth: () => vi.fn(),
      });

      render(<App />);
      expect(screen.queryByTestId('router-content')).not.toBeInTheDocument();
    });
  });

  // ===================================
  // Ready state
  // ===================================

  describe('Ready state', () => {
    it('should show app content when isAuthReady is true', async () => {
      resetAuthStore({ isAuthReady: false });
      useAuthStore.setState({
        initAuth: () => {
          // Simulate auth becoming ready
          useAuthStore.setState({ isAuthReady: true });
          return vi.fn();
        },
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('router-content')).toBeInTheDocument();
      });
    });

    it('should not show loading when auth is ready', async () => {
      resetAuthStore({ isAuthReady: false });
      useAuthStore.setState({
        initAuth: () => {
          useAuthStore.setState({ isAuthReady: true });
          return vi.fn();
        },
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });
  });

  // ===================================
  // initAuth lifecycle
  // ===================================

  describe('initAuth lifecycle', () => {
    it('should call initAuth on mount', () => {
      const mockInitAuth = vi.fn(() => vi.fn());
      resetAuthStore({ isAuthReady: false });
      useAuthStore.setState({ initAuth: mockInitAuth });

      render(<App />);
      expect(mockInitAuth).toHaveBeenCalledTimes(1);
    });

    it('should call loadFromStorage on mount', () => {
      resetAuthStore({ isAuthReady: false });
      useAuthStore.setState({ initAuth: vi.fn(() => vi.fn()) });

      render(<App />);
      expect(mockLoadFromStorage).toHaveBeenCalledTimes(1);
    });

    it('should call unsubscribe on unmount', () => {
      const mockUnsub = vi.fn();
      const mockInitAuth = vi.fn(() => mockUnsub);
      resetAuthStore({ isAuthReady: false });
      useAuthStore.setState({ initAuth: mockInitAuth });

      const { unmount } = render(<App />);
      unmount();
      expect(mockUnsub).toHaveBeenCalledTimes(1);
    });
  });
});
