// ============================================================
// useArea - Hook for area operations
// ============================================================

import { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { Area } from '../types/area';
import type { Content } from '../types/content';

export interface UseAreaReturn {
  area: Area | undefined;
  contents: Content[];
  contentCount: number;
  updateArea: (updates: Partial<Area>) => void;
  deleteArea: () => boolean;
  createContent: (title: string) => string | undefined;
}

export function useArea(areaId: string | undefined): UseAreaReturn {
  const area = useAppStore((state) =>
    areaId ? state.state.areas.find((a) => a.id === areaId) : undefined,
  );

  const contents = useAppStore((state) =>
    areaId ? state.state.contents.filter((c) => c.areaId === areaId) : [],
  );

  const {
    updateArea: storeUpdateArea,
    deleteArea: storeDeleteArea,
    createContent: storeCreateContent,
  } = useAppStore();

  const contentCount = useMemo(() => contents.length, [contents]);

  const updateArea = useCallback(
    (updates: Partial<Area>) => {
      if (areaId) {
        storeUpdateArea(areaId, updates);
      }
    },
    [areaId, storeUpdateArea],
  );

  const deleteArea = useCallback(() => {
    if (areaId) {
      return storeDeleteArea(areaId);
    }
    return false;
  }, [areaId, storeDeleteArea]);

  const createContent = useCallback(
    (title: string) => {
      if (areaId) {
        return storeCreateContent(areaId, title);
      }
      return undefined;
    },
    [areaId, storeCreateContent],
  );

  return {
    area,
    contents,
    contentCount,
    updateArea,
    deleteArea,
    createContent,
  };
}
