// ============================================================
// useAreas - Hook for listing all areas
// ============================================================

import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import type { Area } from '../types/area';

export interface UseAreasReturn {
  areas: Area[];
  areaCount: number;
  createArea: (name: string) => string;
  getAreaByName: (name: string) => Area | undefined;
}

export function useAreas(): UseAreasReturn {
  const areas = useAppStore((state) => state.state.areas);
  const { createArea: storeCreateArea } = useAppStore();

  const areaCount = areas.length;

  const createArea = useCallback(
    (name: string) => {
      return storeCreateArea(name);
    },
    [storeCreateArea],
  );

  const getAreaByName = useCallback(
    (name: string) => {
      return areas.find((a) => a.name.toLowerCase() === name.toLowerCase());
    },
    [areas],
  );

  return {
    areas,
    areaCount,
    createArea,
    getAreaByName,
  };
}
