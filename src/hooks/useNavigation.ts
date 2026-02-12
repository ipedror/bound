// ============================================================
// useNavigation - Hook for navigation state
// ============================================================

import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import type { Area } from '../types/area';
import type { Content } from '../types/content';

export interface UseNavigationReturn {
  currentAreaId: string | undefined;
  currentContentId: string | undefined;
  currentArea: Area | undefined;
  currentContent: Content | undefined;
  navigateToArea: (areaId: string | undefined) => void;
  navigateToContent: (contentId: string | undefined) => void;
  goBack: () => void;
}

export function useNavigation(): UseNavigationReturn {
  const currentAreaId = useAppStore((state) => state.state.currentAreaId);
  const currentContentId = useAppStore((state) => state.state.currentContentId);

  const currentArea = useAppStore((state) =>
    state.state.currentAreaId
      ? state.state.areas.find((a) => a.id === state.state.currentAreaId)
      : undefined,
  );

  const currentContent = useAppStore((state) =>
    state.state.currentContentId
      ? state.state.contents.find((c) => c.id === state.state.currentContentId)
      : undefined,
  );

  const { setCurrentAreaId, setCurrentContentId } = useAppStore();

  const navigateToArea = useCallback(
    (areaId: string | undefined) => {
      setCurrentAreaId(areaId);
      // Clear content selection when changing area
      setCurrentContentId(undefined);
    },
    [setCurrentAreaId, setCurrentContentId],
  );

  const navigateToContent = useCallback(
    (contentId: string | undefined) => {
      setCurrentContentId(contentId);
    },
    [setCurrentContentId],
  );

  const goBack = useCallback(() => {
    if (currentContentId) {
      setCurrentContentId(undefined);
    } else if (currentAreaId) {
      setCurrentAreaId(undefined);
    }
  }, [currentAreaId, currentContentId, setCurrentAreaId, setCurrentContentId]);

  return {
    currentAreaId,
    currentContentId,
    currentArea,
    currentContent,
    navigateToArea,
    navigateToContent,
    goBack,
  };
}
