// ============================================================
// useTagDictionary - Global tag dictionary derived from all contents
// ============================================================

import { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';

/**
 * Returns all unique tags used across all contents in the application.
 * Sorted alphabetically. Use this to provide autocomplete suggestions
 * when adding tags.
 */
export function useTagDictionary(): string[] {
  const contents = useAppStore(useShallow((s) => s.state.contents));

  return useMemo(() => {
    const tagSet = new Set<string>();
    contents.forEach((c) => {
      (c.tags ?? []).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [contents]);
}
