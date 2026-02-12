// ============================================================
// useContent - Hook for content operations
// ============================================================

import { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { Content } from '../types/content';
import type { Shape } from '../types/shape';
import type { Property } from '../types/property';

export interface UseContentReturn {
  content: Content | undefined;
  isOpen: boolean;
  shapes: Shape[];
  properties: Property[];
  updateContent: (updates: Partial<Content>) => void;
  deleteContent: () => boolean;
  openContent: () => void;
  closeContent: () => void;
  addShape: (shape: Shape) => void;
  removeShape: (shapeId: string) => void;
  updateShape: (shapeId: string, updates: Partial<Shape>) => void;
  addProperty: (property: Property) => void;
  removeProperty: (propertyId: string) => void;
  updateProperty: (propertyId: string, updates: Partial<Property>) => void;
}

export function useContent(contentId: string | undefined): UseContentReturn {
  const content = useAppStore((state) =>
    contentId ? state.state.contents.find((c) => c.id === contentId) : undefined,
  );

  const {
    updateContent: storeUpdateContent,
    deleteContent: storeDeleteContent,
    openContent: storeOpenContent,
    closeContent: storeCloseContent,
    addShapeToContent,
    removeShapeFromContent,
    updateShapeInContent,
    addPropertyToContent,
    removePropertyFromContent,
    updatePropertyInContent,
  } = useAppStore();

  const isOpen = content?.status === 'open';
  const shapes = useMemo(() => content?.body.shapes ?? [], [content]);
  const properties = useMemo(() => content?.properties ?? [], [content]);

  const updateContent = useCallback(
    (updates: Partial<Content>) => {
      if (contentId) {
        storeUpdateContent(contentId, updates);
      }
    },
    [contentId, storeUpdateContent],
  );

  const deleteContent = useCallback(() => {
    if (contentId) {
      return storeDeleteContent(contentId);
    }
    return false;
  }, [contentId, storeDeleteContent]);

  const openContent = useCallback(() => {
    if (contentId) {
      storeOpenContent(contentId);
    }
  }, [contentId, storeOpenContent]);

  const closeContent = useCallback(() => {
    if (contentId) {
      storeCloseContent(contentId);
    }
  }, [contentId, storeCloseContent]);

  const addShape = useCallback(
    (shape: Shape) => {
      if (contentId) {
        addShapeToContent(contentId, shape);
      }
    },
    [contentId, addShapeToContent],
  );

  const removeShape = useCallback(
    (shapeId: string) => {
      if (contentId) {
        removeShapeFromContent(contentId, shapeId);
      }
    },
    [contentId, removeShapeFromContent],
  );

  const updateShape = useCallback(
    (shapeId: string, updates: Partial<Shape>) => {
      if (contentId) {
        updateShapeInContent(contentId, shapeId, updates);
      }
    },
    [contentId, updateShapeInContent],
  );

  const addProperty = useCallback(
    (property: Property) => {
      if (contentId) {
        addPropertyToContent(contentId, property);
      }
    },
    [contentId, addPropertyToContent],
  );

  const removeProperty = useCallback(
    (propertyId: string) => {
      if (contentId) {
        removePropertyFromContent(contentId, propertyId);
      }
    },
    [contentId, removePropertyFromContent],
  );

  const updateProperty = useCallback(
    (propertyId: string, updates: Partial<Property>) => {
      if (contentId) {
        updatePropertyInContent(contentId, propertyId, updates);
      }
    },
    [contentId, updatePropertyInContent],
  );

  return {
    content,
    isOpen,
    shapes,
    properties,
    updateContent,
    deleteContent,
    openContent,
    closeContent,
    addShape,
    removeShape,
    updateShape,
    addProperty,
    removeProperty,
    updateProperty,
  };
}
