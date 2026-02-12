// ============================================================
// LoginPage Component Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import LoginPage from './LoginPage';
import { useAuthStore } from '../store/authStore';

function resetAuthStore(state?: Partial<ReturnType<typeof useAuthStore.getState>>) {
  useAuthStore.setState({
    user: null,
    isAuthLoading: false,
    isAuthReady: true,
    approvalStatus: 'unchecked',
    error: null,
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    clearError: vi.fn(),
    ...state,
  });
}

const renderLoginPage = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

describe('LoginPage', () => {
  beforeEach(() => {
    resetAuthStore();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===================================
  // Rendering
  // ===================================

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderLoginPage();
      expect(container).toBeTruthy();
    });

    it('should show the Bound logo', () => {
      renderLoginPage();
      expect(screen.getByText('Bound')).toBeInTheDocument();
    });

    it('should show sign in subtitle by default', () => {
      renderLoginPage();
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    });

    it('should show Google sign in button', () => {
      renderLoginPage();
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    it('should show email and password inputs', () => {
      renderLoginPage();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    });

    it('should show Sign In submit button', () => {
      renderLoginPage();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should show continue without account link', () => {
      renderLoginPage();
      expect(screen.getByText('← Continue without account')).toBeInTheDocument();
    });
  });

  // ===================================
  // Sign Up toggle
  // ===================================

  describe('Sign Up toggle', () => {
    it('should toggle to sign up mode', () => {
      renderLoginPage();
      fireEvent.click(screen.getByText('Sign Up'));
      expect(screen.getByText('Create an account')).toBeInTheDocument();
      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });

    it('should toggle back to sign in mode', () => {
      renderLoginPage();
      fireEvent.click(screen.getByText('Sign Up'));
      fireEvent.click(screen.getByText('Sign In'));
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    });

    it('should clear error when toggling', () => {
      const mockClearError = vi.fn();
      resetAuthStore({ clearError: mockClearError });
      renderLoginPage();
      fireEvent.click(screen.getByText('Sign Up'));
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  // ===================================
  // Google Sign In
  // ===================================

  describe('Google Sign In', () => {
    it('should call signInWithGoogle when google button clicked', async () => {
      const mockGoogleSignIn = vi.fn().mockResolvedValue(undefined);
      resetAuthStore({ signInWithGoogle: mockGoogleSignIn });
      renderLoginPage();

      fireEvent.click(screen.getByText('Continue with Google'));
      await waitFor(() => {
        expect(mockGoogleSignIn).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear error before google sign in', async () => {
      const mockClearError = vi.fn();
      const mockGoogleSignIn = vi.fn().mockResolvedValue(undefined);
      resetAuthStore({ clearError: mockClearError, signInWithGoogle: mockGoogleSignIn });
      renderLoginPage();

      fireEvent.click(screen.getByText('Continue with Google'));
      expect(mockClearError).toHaveBeenCalled();
    });
  });

  // ===================================
  // Email Sign In
  // ===================================

  describe('Email Sign In', () => {
    it('should call signInWithEmail on form submit', async () => {
      const mockEmailSignIn = vi.fn().mockResolvedValue(undefined);
      resetAuthStore({ signInWithEmail: mockEmailSignIn });
      renderLoginPage();

      fireEvent.change(screen.getByPlaceholderText('Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Password'), {
        target: { value: 'secret123' },
      });
      fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);

      await waitFor(() => {
        expect(mockEmailSignIn).toHaveBeenCalledWith('test@example.com', 'secret123');
      });
    });
  });

  // ===================================
  // Email Sign Up
  // ===================================

  describe('Email Sign Up', () => {
    it('should call signUpWithEmail in sign up mode', async () => {
      const mockSignUp = vi.fn().mockResolvedValue(undefined);
      resetAuthStore({ signUpWithEmail: mockSignUp });
      renderLoginPage();

      // Toggle to sign up
      fireEvent.click(screen.getByText('Sign Up'));

      fireEvent.change(screen.getByPlaceholderText('Email'), {
        target: { value: 'new@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Password'), {
        target: { value: 'newpass123' },
      });
      fireEvent.submit(screen.getByPlaceholderText('Email').closest('form')!);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'newpass123');
      });
    });
  });

  // ===================================
  // Error display
  // ===================================

  describe('Error display', () => {
    it('should show error message when error exists', () => {
      resetAuthStore({ error: 'Something went wrong' });
      renderLoginPage();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should not show error when no error', () => {
      resetAuthStore({ error: null });
      renderLoginPage();
      // No error paragraph in DOM
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  // ===================================
  // Loading state
  // ===================================

  describe('Loading state', () => {
    it('should show Loading... on submit button while loading', () => {
      resetAuthStore({ isAuthLoading: true });
      renderLoginPage();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should disable google button while loading', () => {
      resetAuthStore({ isAuthLoading: true });
      renderLoginPage();
      expect(screen.getByText('Continue with Google')).toBeDisabled();
    });
  });

  // ===================================
  // Redirect when authenticated
  // ===================================

  describe('Redirect when authenticated', () => {
    it('should navigate to / when user is already signed in', () => {
      resetAuthStore({
        user: {
          uid: 'u1',
          email: 'a@b.com',
          displayName: 'A',
          photoURL: null,
          provider: 'email',
        },
      });
      renderLoginPage();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // ===================================
  // Continue without account
  // ===================================

  describe('Continue without account', () => {
    it('should navigate to / when back button clicked', () => {
      renderLoginPage();
      fireEvent.click(screen.getByText('← Continue without account'));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
