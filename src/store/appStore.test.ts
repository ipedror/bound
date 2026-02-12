// ============================================================
// AppStore Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, resetStore } from './appStore';
import { ContentStatus, ShapeType, PropertyType, LinkType } from '../types/enums';
import { generateId } from '../utils/id';
import type { Shape } from '../types/shape';
import type { Property } from '../types/property';

describe('AppStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('Initial state', () => {
    it('should initialize with default state', () => {
      const { state } = useAppStore.getState();
      expect(state.areas).toEqual([]);
      expect(state.contents).toEqual([]);
      expect(state.links).toEqual([]);
      expect(state.version).toBe(1);
    });

    it('should have no loading or error state', () => {
      const { isLoading, error } = useAppStore.getState();
      expect(isLoading).toBe(false);
      expect(error).toBeNull();
    });
  });

  describe('Area operations', () => {
    it('should create an area', () => {
      const areaId = useAppStore.getState().createArea('Test Area');
      const { state } = useAppStore.getState();
      expect(state.areas).toHaveLength(1);
      expect(state.areas[0].name).toBe('Test Area');
      expect(state.areas[0].id).toBe(areaId);
    });

    it('should update an area', () => {
      const areaId = useAppStore.getState().createArea('Test Area');
      useAppStore.getState().updateArea(areaId, { name: 'Updated Area' });
      const { state } = useAppStore.getState();
      expect(state.areas[0].name).toBe('Updated Area');
    });

    it('should delete an area', () => {
      const areaId = useAppStore.getState().createArea('Test Area');
      const result = useAppStore.getState().deleteArea(areaId);
      expect(result).toBe(true);
      const { state } = useAppStore.getState();
      expect(state.areas).toHaveLength(0);
    });

    it('should cascade delete contents when area is deleted', () => {
      const areaId = useAppStore.getState().createArea('Test Area');
      useAppStore.getState().createContent(areaId, 'Content 1');
      useAppStore.getState().createContent(areaId, 'Content 2');

      const { state: stateBefore } = useAppStore.getState();
      expect(stateBefore.contents).toHaveLength(2);

      useAppStore.getState().deleteArea(areaId);
      const { state } = useAppStore.getState();
      expect(state.contents).toHaveLength(0);
    });
  });

  describe('Content operations', () => {
    let areaId: string;

    beforeEach(() => {
      areaId = useAppStore.getState().createArea('Test Area');
    });

    it('should create a content', () => {
      const contentId = useAppStore.getState().createContent(areaId, 'Test Content');
      const { state } = useAppStore.getState();
      expect(state.contents).toHaveLength(1);
      expect(state.contents[0].title).toBe('Test Content');
      expect(state.contents[0].id).toBe(contentId);
      expect(state.contents[0].status).toBe(ContentStatus.OPEN);
    });

    it('should update a content', () => {
      const contentId = useAppStore.getState().createContent(areaId, 'Test Content');
      useAppStore.getState().updateContent(contentId, { title: 'Updated Content' });
      const { state } = useAppStore.getState();
      expect(state.contents[0].title).toBe('Updated Content');
    });

    it('should delete a content', () => {
      const contentId = useAppStore.getState().createContent(areaId, 'Test Content');
      const result = useAppStore.getState().deleteContent(contentId);
      expect(result).toBe(true);
      const { state } = useAppStore.getState();
      expect(state.contents).toHaveLength(0);
    });

    it('should open a content', () => {
      const contentId = useAppStore.getState().createContent(areaId, 'Test Content');
      useAppStore.getState().closeContent(contentId);
      useAppStore.getState().openContent(contentId);
      const { state } = useAppStore.getState();
      expect(state.contents[0].status).toBe(ContentStatus.OPEN);
    });

    it('should close a content', () => {
      const contentId = useAppStore.getState().createContent(areaId, 'Test Content');
      useAppStore.getState().closeContent(contentId);
      const { state } = useAppStore.getState();
      expect(state.contents[0].status).toBe(ContentStatus.CLOSED);
    });

    it('should add content to area contentIds', () => {
      const contentId = useAppStore.getState().createContent(areaId, 'Test Content');
      const { state } = useAppStore.getState();
      expect(state.areas[0].contentIds).toContain(contentId);
    });
  });

  describe('Shape operations', () => {
    let areaId: string;
    let contentId: string;

    beforeEach(() => {
      areaId = useAppStore.getState().createArea('Test Area');
      contentId = useAppStore.getState().createContent(areaId, 'Test Content');
    });

    it('should add a shape to content', () => {
      const shape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 10, y: 10 },
        dimension: { width: 100, height: 100 },
        style: { fill: '#000' },
        createdAt: Date.now(),
      };

      useAppStore.getState().addShapeToContent(contentId, shape);
      const { state } = useAppStore.getState();
      expect(state.contents[0].body.shapes).toHaveLength(1);
      expect(state.contents[0].body.shapes[0].id).toBe(shape.id);
    });

    it('should remove a shape from content', () => {
      const shape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 10, y: 10 },
        dimension: { width: 100, height: 100 },
        style: { fill: '#000' },
        createdAt: Date.now(),
      };

      useAppStore.getState().addShapeToContent(contentId, shape);
      useAppStore.getState().removeShapeFromContent(contentId, shape.id);
      const { state } = useAppStore.getState();
      expect(state.contents[0].body.shapes).toHaveLength(0);
    });

    it('should update a shape in content', () => {
      const shape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 10, y: 10 },
        dimension: { width: 100, height: 100 },
        style: { fill: '#000' },
        createdAt: Date.now(),
      };

      useAppStore.getState().addShapeToContent(contentId, shape);
      useAppStore.getState().updateShapeInContent(contentId, shape.id, {
        position: { x: 50, y: 50 },
      });
      const { state } = useAppStore.getState();
      expect(state.contents[0].body.shapes[0].position).toEqual({ x: 50, y: 50 });
    });
  });

  describe('Property operations', () => {
    let areaId: string;
    let contentId: string;

    beforeEach(() => {
      areaId = useAppStore.getState().createArea('Test Area');
      contentId = useAppStore.getState().createContent(areaId, 'Test Content');
    });

    it('should add a property to content', () => {
      const property: Property = {
        id: generateId(),
        name: 'Tag',
        type: PropertyType.TAG,
        value: 'test',
        createdAt: Date.now(),
      };

      useAppStore.getState().addPropertyToContent(contentId, property);
      const { state } = useAppStore.getState();
      expect(state.contents[0].properties).toHaveLength(1);
      expect(state.contents[0].properties[0].name).toBe('Tag');
    });

    it('should remove a property from content', () => {
      const property: Property = {
        id: generateId(),
        name: 'Tag',
        type: PropertyType.TAG,
        value: 'test',
        createdAt: Date.now(),
      };

      useAppStore.getState().addPropertyToContent(contentId, property);
      useAppStore.getState().removePropertyFromContent(contentId, property.id);
      const { state } = useAppStore.getState();
      expect(state.contents[0].properties).toHaveLength(0);
    });

    it('should create auto link when adding link property', () => {
      const contentId2 = useAppStore.getState().createContent(areaId, 'Content 2');
      const property: Property = {
        id: generateId(),
        name: 'Related',
        type: PropertyType.LINK,
        value: contentId2,
        createdAt: Date.now(),
      };

      useAppStore.getState().addPropertyToContent(contentId, property);
      const { state } = useAppStore.getState();
      expect(state.links).toHaveLength(1);
      expect(state.links[0].propertyId).toBe(property.id);
    });

    it('should remove auto link when removing link property', () => {
      const contentId2 = useAppStore.getState().createContent(areaId, 'Content 2');
      const property: Property = {
        id: generateId(),
        name: 'Related',
        type: PropertyType.LINK,
        value: contentId2,
        createdAt: Date.now(),
      };

      useAppStore.getState().addPropertyToContent(contentId, property);
      useAppStore.getState().removePropertyFromContent(contentId, property.id);
      const { state } = useAppStore.getState();
      expect(state.links).toHaveLength(0);
    });
  });

  describe('Link operations', () => {
    let areaId: string;
    let contentId1: string;
    let contentId2: string;

    beforeEach(() => {
      areaId = useAppStore.getState().createArea('Test Area');
      contentId1 = useAppStore.getState().createContent(areaId, 'Content 1');
      contentId2 = useAppStore.getState().createContent(areaId, 'Content 2');
    });

    it('should create a manual link', () => {
      const linkId = useAppStore.getState().createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
      );
      const { state } = useAppStore.getState();
      expect(state.links).toHaveLength(1);
      expect(state.links[0].id).toBe(linkId);
      expect(state.links[0].type).toBe(LinkType.MANUAL);
    });

    it('should delete a link', () => {
      const linkId = useAppStore.getState().createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
      );
      const result = useAppStore.getState().deleteLink(linkId);
      expect(result).toBe(true);
      const { state } = useAppStore.getState();
      expect(state.links).toHaveLength(0);
    });

    it('should delete links when content is deleted', () => {
      useAppStore.getState().createLink(contentId1, contentId2, LinkType.MANUAL);
      const { state: stateBefore } = useAppStore.getState();
      expect(stateBefore.links).toHaveLength(1);

      useAppStore.getState().deleteContent(contentId1);
      const { state } = useAppStore.getState();
      expect(state.links).toHaveLength(0);
    });
  });

  describe('Navigation', () => {
    it('should set current area ID', () => {
      const areaId = useAppStore.getState().createArea('Test Area');
      useAppStore.getState().setCurrentAreaId(areaId);
      const { state } = useAppStore.getState();
      expect(state.currentAreaId).toBe(areaId);
    });

    it('should set current content ID', () => {
      const areaId = useAppStore.getState().createArea('Test Area');
      const contentId = useAppStore.getState().createContent(areaId, 'Test Content');
      useAppStore.getState().setCurrentContentId(contentId);
      const { state } = useAppStore.getState();
      expect(state.currentContentId).toBe(contentId);
    });

    it('should clear current area ID when area is deleted', () => {
      const areaId = useAppStore.getState().createArea('Test Area');
      useAppStore.getState().setCurrentAreaId(areaId);
      useAppStore.getState().deleteArea(areaId);
      const { state } = useAppStore.getState();
      expect(state.currentAreaId).toBeUndefined();
    });

    it('should clear current content ID when content is deleted', () => {
      const areaId = useAppStore.getState().createArea('Test Area');
      const contentId = useAppStore.getState().createContent(areaId, 'Test Content');
      useAppStore.getState().setCurrentContentId(contentId);
      useAppStore.getState().deleteContent(contentId);
      const { state } = useAppStore.getState();
      expect(state.currentContentId).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should set error when creating area with empty name', () => {
      expect(() => useAppStore.getState().createArea('')).toThrow();
      const { error } = useAppStore.getState();
      expect(error).not.toBeNull();
    });

    it('should clear error', () => {
      expect(() => useAppStore.getState().createArea('')).toThrow();
      useAppStore.getState().clearError();
      const { error } = useAppStore.getState();
      expect(error).toBeNull();
    });
  });
});
