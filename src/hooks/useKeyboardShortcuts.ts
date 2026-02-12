// ============================================================
// useKeyboardShortcuts - Global keyboard shortcuts hook
// ============================================================

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

/**
 * Hook for handling global keyboard shortcuts
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;

      // Navigation shortcuts
      if (key === 'h' && alt) {
        e.preventDefault();
        navigate('/');
        return;
      }

      if (key === 'g' && alt) {
        e.preventDefault();
        navigate('/graph');
        return;
      }

      // Create new area: Ctrl+N
      if (key === 'n' && ctrl && !e.shiftKey) {
        // Only on home page - emit custom event
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('bound:create-area'));
        return;
      }

      // Help/shortcuts modal: ?
      if (key === '?' || (key === '/' && e.shiftKey)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('bound:show-shortcuts'));
        return;
      }

      // Search: Ctrl+K
      if (key === 'k' && ctrl) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('bound:search'));
        return;
      }
    },
    [enabled, navigate],
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: [
      { key: 'Alt+H', description: 'Go to Home' },
      { key: 'Alt+G', description: 'Go to Graph' },
      { key: 'Ctrl+N', description: 'Create new area (on Home)' },
      { key: 'Ctrl+K', description: 'Quick search' },
      { key: '?', description: 'Show keyboard shortcuts' },
    ] as const,
  };
}
