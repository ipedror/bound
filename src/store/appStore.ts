// ============================================================
// AppStore - Zustand global store
// ============================================================

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AppState } from '../types/app';
import type { Area } from '../types/area';
import type { Content } from '../types/content';
import type { Shape } from '../types/shape';
import type { Property } from '../types/property';
import type { LinkType } from '../types/enums';
import { getDefaultState, SCHEMA_VERSION } from '../constants/schema';
import { ContentManager } from '../managers/ContentManager';
import { AreaManager } from '../managers/AreaManager';
import { LinkManager } from '../managers/LinkManager';
import { GraphManager } from '../managers/GraphManager';
import { LocalStorageAdapter } from './storage';
import { StorageManager } from './storageManager';
import { PropertyManager } from '../managers/PropertyManager';

export interface AppStoreState {
  state: AppState;
  isLoading: boolean;
  error: string | null;
  lastSyncTime: number | null;
}

export interface AppStoreActions {
  // State management
  setState: (newState: AppState) => void;
  clearError: () => void;

  // Area operations
  createArea: (name: string) => string;
  updateArea: (areaId: string, updates: Partial<Area>) => void;
  deleteArea: (areaId: string) => boolean;

  // Content operations
  createContent: (areaId: string, title: string) => string;
  updateContent: (contentId: string, updates: Partial<Content>) => void;
  deleteContent: (contentId: string) => boolean;
  openContent: (contentId: string) => void;
  closeContent: (contentId: string) => void;
  updateNodePosition: (contentId: string, x: number, y: number) => void;

  // Shape operations
  addShapeToContent: (contentId: string, shape: Shape) => void;
  removeShapeFromContent: (contentId: string, shapeId: string) => void;
  updateShapeInContent: (
    contentId: string,
    shapeId: string,
    updates: Partial<Shape>,
  ) => void;

  // Property operations
  addPropertyToContent: (contentId: string, property: Property) => void;
  removePropertyFromContent: (contentId: string, propertyId: string) => void;
  updatePropertyInContent: (
    contentId: string,
    propertyId: string,
    updates: Partial<Property>,
  ) => void;

  // Link operations
  createLink: (
    fromContentId: string,
    toContentId: string,
    type: LinkType,
    propertyId?: string,
  ) => string;
  deleteLink: (linkId: string) => boolean;

  // Navigation
  setCurrentAreaId: (areaId: string | undefined) => void;
  setCurrentContentId: (contentId: string | undefined) => void;

  // Storage operations
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  clearAll: () => Promise<void>;
}

// Debounce save timer
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 2000;

const debouncedSave = (saveFunc: () => Promise<void>) => {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveFunc();
    saveTimer = null;
  }, DEBOUNCE_MS);
};

export const useAppStore = create<AppStoreState & AppStoreActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    state: getDefaultState(),
    isLoading: false,
    error: null,
    lastSyncTime: null,

    // State management
    setState: (newState: AppState) => {
      set({ state: { ...newState, version: SCHEMA_VERSION } });
      debouncedSave(() => get().saveToStorage());
    },

    clearError: () => {
      set({ error: null });
    },

    // Area operations
    createArea: (name: string) => {
      const { state } = get();
      try {
        const area = AreaManager.createArea(name, state);
        const newState = {
          ...state,
          areas: [...state.areas, area],
          updatedAt: Date.now(),
        };
        get().setState(newState);
        return area.id;
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    updateArea: (areaId: string, updates: Partial<Area>) => {
      const { state } = get();
      try {
        const updatedArea = AreaManager.updateArea(areaId, updates, state);
        const newState = {
          ...state,
          areas: state.areas.map((a) => (a.id === areaId ? updatedArea : a)),
          updatedAt: Date.now(),
        };
        get().setState(newState);
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    deleteArea: (areaId: string) => {
      const { state } = get();
      const result = AreaManager.deleteArea(areaId, state);
      if (!result.success) {
        set({ error: result.reason ?? 'Failed to delete area' });
        return false;
      }

      // Cascade delete: remove all contents and links in this area
      const contentIds = AreaManager.getContentIdsForCascadeDelete(areaId, state);
      const linkIdsToDelete = contentIds.flatMap((cid) =>
        LinkManager.getLinkIdsForContentDelete(cid, state),
      );

      const newState = {
        ...state,
        areas: state.areas.filter((a) => a.id !== areaId),
        contents: state.contents.filter((c) => c.areaId !== areaId),
        links: state.links.filter((l) => !linkIdsToDelete.includes(l.id)),
        currentAreaId:
          state.currentAreaId === areaId ? undefined : state.currentAreaId,
        currentContentId: contentIds.includes(state.currentContentId ?? '')
          ? undefined
          : state.currentContentId,
        updatedAt: Date.now(),
      };
      get().setState(newState);
      return true;
    },

    // Content operations
    createContent: (areaId: string, title: string) => {
      const { state } = get();
      try {
        const content = ContentManager.createContent(areaId, title, state);

        // Add content to area's contentIds
        const area = state.areas.find((a) => a.id === areaId);
        const updatedArea = area
          ? { ...area, contentIds: [...area.contentIds, content.id] }
          : null;

        const newState = {
          ...state,
          contents: [...state.contents, content],
          areas: updatedArea
            ? state.areas.map((a) => (a.id === areaId ? updatedArea : a))
            : state.areas,
          updatedAt: Date.now(),
        };
        get().setState(newState);
        return content.id;
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    updateContent: (contentId: string, updates: Partial<Content>) => {
      const { state } = get();
      try {
        const updatedContent = ContentManager.updateContent(
          contentId,
          updates,
          state,
        );
        const newState = {
          ...state,
          contents: state.contents.map((c) =>
            c.id === contentId ? updatedContent : c,
          ),
          updatedAt: Date.now(),
        };
        get().setState(newState);
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    deleteContent: (contentId: string) => {
      const { state } = get();
      const result = ContentManager.deleteContent(contentId, state);
      if (!result.success) {
        set({ error: result.reason ?? 'Failed to delete content' });
        return false;
      }

      const content = state.contents.find((c) => c.id === contentId);
      const linkIdsToDelete = LinkManager.getLinkIdsForContentDelete(
        contentId,
        state,
      );

      const newState = {
        ...state,
        contents: state.contents.filter((c) => c.id !== contentId),
        areas: state.areas.map((a) =>
          a.id === content?.areaId
            ? { ...a, contentIds: a.contentIds.filter((id) => id !== contentId) }
            : a,
        ),
        links: state.links.filter((l) => !linkIdsToDelete.includes(l.id)),
        currentContentId:
          state.currentContentId === contentId
            ? undefined
            : state.currentContentId,
        updatedAt: Date.now(),
      };
      get().setState(newState);
      return true;
    },

    openContent: (contentId: string) => {
      const { state } = get();
      try {
        const openedContent = ContentManager.openContent(contentId, state);
        const newState = {
          ...state,
          contents: state.contents.map((c) =>
            c.id === contentId ? openedContent : c,
          ),
          updatedAt: Date.now(),
        };
        get().setState(newState);
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    closeContent: (contentId: string) => {
      const { state } = get();
      try {
        const closedContent = ContentManager.closeContent(contentId, state);
        const newState = {
          ...state,
          contents: state.contents.map((c) =>
            c.id === contentId ? closedContent : c,
          ),
          updatedAt: Date.now(),
        };
        get().setState(newState);
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    updateNodePosition: (contentId: string, x: number, y: number) => {
      const { state } = get();
      try {
        const newState = GraphManager.updateNodePosition(state, contentId, x, y);
        if (newState !== state) {
          get().setState(newState);
        }
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    // Shape operations
    addShapeToContent: (contentId: string, shape: Shape) => {
      const { state } = get();
      try {
        const updatedContent = ContentManager.addShapeToContent(
          contentId,
          shape,
          state,
        );
        const newState = {
          ...state,
          contents: state.contents.map((c) =>
            c.id === contentId ? updatedContent : c,
          ),
          updatedAt: Date.now(),
        };
        get().setState(newState);
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    removeShapeFromContent: (contentId: string, shapeId: string) => {
      const { state } = get();
      try {
        const updatedContent = ContentManager.removeShapeFromContent(
          contentId,
          shapeId,
          state,
        );
        const newState = {
          ...state,
          contents: state.contents.map((c) =>
            c.id === contentId ? updatedContent : c,
          ),
          updatedAt: Date.now(),
        };
        get().setState(newState);
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    updateShapeInContent: (
      contentId: string,
      shapeId: string,
      updates: Partial<Shape>,
    ) => {
      const { state } = get();
      try {
        const updatedContent = ContentManager.updateShapeInContent(
          contentId,
          shapeId,
          updates,
          state,
        );
        const newState = {
          ...state,
          contents: state.contents.map((c) =>
            c.id === contentId ? updatedContent : c,
          ),
          updatedAt: Date.now(),
        };
        get().setState(newState);
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    // Property operations
    addPropertyToContent: (contentId: string, property: Property) => {
      const { state } = get();
      try {
        const updatedContent = ContentManager.addPropertyToContent(
          contentId,
          property,
          state,
        );

        let newLinks = [...state.links];

        // If property is a link type, create auto link
        if (
          PropertyManager.isLinkType(property.type) &&
          typeof property.value === 'string'
        ) {
          const targetContentId = property.value;
          const targetExists = state.contents.some(
            (c) => c.id === targetContentId,
          );
          if (targetExists) {
            try {
              const links = LinkManager.createBidirectionalLinks(
                contentId,
                targetContentId,
                property.id,
                { ...state, contents: state.contents.map((c) => (c.id === contentId ? updatedContent : c)) },
              );
              newLinks = [...newLinks, ...links];
            } catch {
              // Link might already exist, ignore
            }
          }
        }

        const newState = {
          ...state,
          contents: state.contents.map((c) =>
            c.id === contentId ? updatedContent : c,
          ),
          links: newLinks,
          updatedAt: Date.now(),
        };
        get().setState(newState);
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    removePropertyFromContent: (contentId: string, propertyId: string) => {
      const { state } = get();
      try {
        const updatedContent = ContentManager.removePropertyFromContent(
          contentId,
          propertyId,
          state,
        );

        // Remove any auto links created by this property
        const linksToRemove = LinkManager.getLinksByPropertyId(propertyId, state);
        const linkIdsToRemove = linksToRemove.map((l) => l.id);

        const newState = {
          ...state,
          contents: state.contents.map((c) =>
            c.id === contentId ? updatedContent : c,
          ),
          links: state.links.filter((l) => !linkIdsToRemove.includes(l.id)),
          updatedAt: Date.now(),
        };
        get().setState(newState);
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    updatePropertyInContent: (
      contentId: string,
      propertyId: string,
      updates: Partial<Property>,
    ) => {
      const { state } = get();
      try {
        const updatedContent = ContentManager.updatePropertyInContent(
          contentId,
          propertyId,
          updates,
          state,
        );
        const newState = {
          ...state,
          contents: state.contents.map((c) =>
            c.id === contentId ? updatedContent : c,
          ),
          updatedAt: Date.now(),
        };
        get().setState(newState);
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    // Link operations
    createLink: (
      fromContentId: string,
      toContentId: string,
      type: LinkType,
      propertyId?: string,
    ) => {
      const { state } = get();
      try {
        const link = LinkManager.createLink(
          fromContentId,
          toContentId,
          type,
          state,
          propertyId,
        );
        const newState = {
          ...state,
          links: [...state.links, link],
          updatedAt: Date.now(),
        };
        get().setState(newState);
        return link.id;
      } catch (err) {
        set({ error: String(err) });
        throw err;
      }
    },

    deleteLink: (linkId: string) => {
      const { state } = get();
      const result = LinkManager.deleteLink(linkId, state);
      if (!result.success) {
        set({ error: result.reason ?? 'Failed to delete link' });
        return false;
      }

      const newState = {
        ...state,
        links: state.links.filter((l) => l.id !== linkId),
        updatedAt: Date.now(),
      };
      get().setState(newState);
      return true;
    },

    // Navigation
    setCurrentAreaId: (areaId: string | undefined) => {
      const { state } = get();
      const newState = {
        ...state,
        currentAreaId: areaId,
        updatedAt: Date.now(),
      };
      get().setState(newState);
    },

    setCurrentContentId: (contentId: string | undefined) => {
      const { state } = get();
      const newState = {
        ...state,
        currentContentId: contentId,
        updatedAt: Date.now(),
      };
      get().setState(newState);
    },

    // Storage operations
    loadFromStorage: async () => {
      set({ isLoading: true, error: null });
      try {
        const manager = new StorageManager(new LocalStorageAdapter());
        const loadedState = await manager.load();
        set({
          state: loadedState,
          isLoading: false,
          lastSyncTime: Date.now(),
        });
      } catch (err) {
        set({
          error: String(err),
          isLoading: false,
        });
      }
    },

    saveToStorage: async () => {
      const { state } = get();
      try {
        const manager = new StorageManager(new LocalStorageAdapter());
        await manager.save(state);
        set({ lastSyncTime: Date.now(), error: null });
      } catch (err) {
        set({ error: String(err) });
      }
    },

    clearAll: async () => {
      try {
        const manager = new StorageManager(new LocalStorageAdapter());
        await manager.clear();
        set({
          state: getDefaultState(),
          lastSyncTime: null,
          error: null,
        });
      } catch (err) {
        set({ error: String(err) });
      }
    },
  })),
);

// Export for resetting store in tests
export const resetStore = () => {
  useAppStore.setState({
    state: getDefaultState(),
    isLoading: false,
    error: null,
    lastSyncTime: null,
  });
};
