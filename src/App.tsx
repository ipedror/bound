// ============================================================
// App - Main application entry point with Router + AuthGate
// ============================================================

import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';

function AuthGate({ children }: { children: React.ReactNode }) {
  const initAuth = useAuthStore((s) => s.initAuth);
  const isAuthReady = useAuthStore((s) => s.isAuthReady);
  const loadFromStorage = useAppStore((s) => s.loadFromStorage);
  const [isStorageReady, setIsStorageReady] = useState(false);

  useEffect(() => {
    // Hydrate state from localStorage before rendering the app
    loadFromStorage().then(() => setIsStorageReady(true));
    const unsubscribe = initAuth();
    return unsubscribe;
  }, [initAuth, loadFromStorage]);

  if (!isAuthReady || !isStorageReady) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#38bdf8',
            fontSize: '18px',
            fontWeight: 600,
          }}
        >
          Loading...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthGate>
      <RouterProvider router={router} />
    </AuthGate>
  );
}
