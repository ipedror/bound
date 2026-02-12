// ============================================================
// AuthButton - Dropdown auth button for MainLayout menu
// ============================================================

import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/shallow';

interface AuthButtonProps {
  onNavigateLogin: () => void;
}

export default function AuthButton({ onNavigateLogin }: AuthButtonProps) {
  const { user, approvalStatus, isAuthLoading, signOut } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      approvalStatus: s.approvalStatus,
      isAuthLoading: s.isAuthLoading,
      signOut: s.signOut,
    })),
  );

  if (isAuthLoading) {
    return (
      <div style={styles.container}>
        <span style={styles.loadingText}>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <button style={styles.dropdownItem} onClick={onNavigateLogin}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        Sign In
      </button>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.userInfo}>
        {user.photoURL ? (
          <img src={user.photoURL} alt="" style={styles.avatar} />
        ) : (
          <div style={styles.avatarPlaceholder}>
            {(user.displayName || user.email || '?')[0].toUpperCase()}
          </div>
        )}
        <div style={styles.userDetails}>
          <span style={styles.userName}>
            {user.displayName || user.email || 'User'}
          </span>
          <span style={styles.approvalBadge} data-status={approvalStatus}>
            {approvalStatus === 'approved' && '✓ Approved'}
            {approvalStatus === 'pending' && '⏳ Pending'}
            {approvalStatus === 'rejected' && '✗ Rejected'}
            {approvalStatus === 'unchecked' && '? Unknown'}
          </span>
        </div>
      </div>
      <button style={styles.signOutButton} onClick={signOut}>
        Sign Out
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '8px',
  },
  loadingText: {
    fontSize: '13px',
    color: '#64748b',
    padding: '4px 8px',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    color: '#cbd5e1',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background-color 0.15s',
    width: '100%',
    textAlign: 'left' as const,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '4px 8px',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover' as const,
  },
  avatarPlaceholder: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    flexShrink: 0,
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    minWidth: 0,
  },
  userName: {
    fontSize: '13px',
    color: '#f1f1f1',
    fontWeight: '500',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  approvalBadge: {
    fontSize: '11px',
    color: '#64748b',
  },
  signOutButton: {
    padding: '6px 10px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    margin: '0 8px',
  },
};
