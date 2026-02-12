// ============================================================
// Auth Types - Firebase authentication types
// ============================================================

export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly provider: AuthProvider;
}

export type AuthProvider = 'google' | 'email' | 'anonymous';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'unchecked';

export interface AuthState {
  user: AuthUser | null;
  isAuthLoading: boolean;
  isAuthReady: boolean;
  approvalStatus: ApprovalStatus;
  error: string | null;
}
