// ============================================================
// AuthButton Component Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

import AuthButton from './AuthButton';
import { useAuthStore } from '../store/authStore';

function resetAuthStore(state?: Partial<ReturnType<typeof useAuthStore.getState>>) {
  useAuthStore.setState({
    user: null,
    isAuthLoading: false,
    isAuthReady: true,
    approvalStatus: 'unchecked',
    error: null,
    ...state,
  });
}

describe('AuthButton', () => {
  const mockNavigateLogin = vi.fn();

  beforeEach(() => {
    resetAuthStore();
    mockNavigateLogin.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===================================
  // Loading state
  // ===================================

  describe('Loading state', () => {
    it('should show loading text when isAuthLoading', () => {
      resetAuthStore({ isAuthLoading: true });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not show Sign In or Sign Out when loading', () => {
      resetAuthStore({ isAuthLoading: true });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    });
  });

  // ===================================
  // Not authenticated
  // ===================================

  describe('Not authenticated', () => {
    it('should show Sign In button', () => {
      resetAuthStore({ isAuthLoading: false, user: null });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should call onNavigateLogin when Sign In clicked', () => {
      resetAuthStore({ isAuthLoading: false, user: null });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      fireEvent.click(screen.getByText('Sign In'));
      expect(mockNavigateLogin).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================
  // Authenticated
  // ===================================

  describe('Authenticated', () => {
    const testUser = {
      uid: 'u1',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null,
      provider: 'google' as const,
    };

    it('should show user display name', () => {
      resetAuthStore({ user: testUser, isAuthLoading: false });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should show email when no displayName', () => {
      resetAuthStore({
        user: { ...testUser, displayName: null },
        isAuthLoading: false,
      });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should show "User" fallback when no name or email', () => {
      resetAuthStore({
        user: { ...testUser, displayName: null, email: null },
        isAuthLoading: false,
      });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should show avatar placeholder with first letter', () => {
      resetAuthStore({ user: testUser, isAuthLoading: false });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should show avatar image when photoURL is present', () => {
      resetAuthStore({
        user: { ...testUser, photoURL: 'https://photo.url/x.png' },
        isAuthLoading: false,
      });
      const { container } = render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      const img = container.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe('https://photo.url/x.png');
    });

    it('should show Sign Out button', () => {
      resetAuthStore({ user: testUser, isAuthLoading: false });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should call signOut when Sign Out clicked', () => {
      const mockSignOut = vi.fn();
      resetAuthStore({ user: testUser, isAuthLoading: false });
      useAuthStore.setState({ signOut: mockSignOut });

      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      fireEvent.click(screen.getByText('Sign Out'));
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    // Approval badges
    it('should show approved badge', () => {
      resetAuthStore({ user: testUser, approvalStatus: 'approved', isAuthLoading: false });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.getByText('✓ Approved')).toBeInTheDocument();
    });

    it('should show pending badge', () => {
      resetAuthStore({ user: testUser, approvalStatus: 'pending', isAuthLoading: false });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.getByText('⏳ Pending')).toBeInTheDocument();
    });

    it('should show rejected badge', () => {
      resetAuthStore({ user: testUser, approvalStatus: 'rejected', isAuthLoading: false });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.getByText('✗ Rejected')).toBeInTheDocument();
    });

    it('should show unknown badge', () => {
      resetAuthStore({ user: testUser, approvalStatus: 'unchecked', isAuthLoading: false });
      render(<AuthButton onNavigateLogin={mockNavigateLogin} />);
      expect(screen.getByText('? Unknown')).toBeInTheDocument();
    });
  });
});
