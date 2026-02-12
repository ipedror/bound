// ============================================================
// AppStore Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, resetStore } from './appStore';
import { ContentStatus, ShapeType, PropertyType, LinkType, EdgeLineStyle, EdgeArrowMode } from '../types/enums';
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

    it('should update link color', () => {
      const linkId = useAppStore.getState().createLink(contentId1, contentId2, LinkType.MANUAL);
      useAppStore.getState().updateLink(linkId, { color: '#ff0000' });
      const { state } = useAppStore.getState();
      const link = state.links.find((l) => l.id === linkId)!;
      expect(link.color).toBe('#ff0000');
    });

    it('should update link lineStyle', () => {
      const linkId = useAppStore.getState().createLink(contentId1, contentId2, LinkType.MANUAL);
      useAppStore.getState().updateLink(linkId, { lineStyle: EdgeLineStyle.DASHED });
      const { state } = useAppStore.getState();
      const link = state.links.find((l) => l.id === linkId)!;
      expect(link.lineStyle).toBe('dashed');
    });

    it('should update link arrowMode', () => {
      const linkId = useAppStore.getState().createLink(contentId1, contentId2, LinkType.MANUAL);
      useAppStore.getState().updateLink(linkId, { arrowMode: EdgeArrowMode.BOTH });
      const { state } = useAppStore.getState();
      const link = state.links.find((l) => l.id === linkId)!;
      expect(link.arrowMode).toBe('both');
    });

    it('should update multiple link fields at once', () => {
      const linkId = useAppStore.getState().createLink(contentId1, contentId2, LinkType.MANUAL);
      useAppStore.getState().updateLink(linkId, {
        color: '#00ff00',
        lineStyle: EdgeLineStyle.SOLID,
        arrowMode: EdgeArrowMode.FORWARD,
      });
      const { state } = useAppStore.getState();
      const link = state.links.find((l) => l.id === linkId)!;
      expect(link.color).toBe('#00ff00');
      expect(link.lineStyle).toBe('solid');
      expect(link.arrowMode).toBe('forward');
    });

    it('should preserve existing link fields when updating', () => {
      const linkId = useAppStore.getState().createLink(contentId1, contentId2, LinkType.MANUAL);
      useAppStore.getState().updateLink(linkId, { color: '#ff0000' });
      const { state } = useAppStore.getState();
      const link = state.links.find((l) => l.id === linkId)!;
      expect(link.fromContentId).toBe(contentId1);
      expect(link.toContentId).toBe(contentId2);
      expect(link.type).toBe(LinkType.MANUAL);
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

  describe('Hierarchy level config operations', () => {
    it('should set hierarchy level configs', () => {
      const configs = [
        { depth: 0, name: 'Chapter', color: '#ff0000', areaScope: 'all' as const, areaIds: [] },
        { depth: 1, name: 'Section', color: '#00ff00', areaScope: 'all' as const, areaIds: [] },
      ];
      useAppStore.getState().setHierarchyLevelConfigs(configs);
      const { state } = useAppStore.getState();
      expect(state.hierarchyLevelConfigs).toHaveLength(2);
      expect(state.hierarchyLevelConfigs![0].name).toBe('Chapter');
      expect(state.hierarchyLevelConfigs![1].name).toBe('Section');
    });

    it('should update a single hierarchy level config by depth', () => {
      const configs = [
        { depth: 0, name: 'Level 1', color: '#ff0000', areaScope: 'all' as const, areaIds: [] },
        { depth: 1, name: 'Level 2', color: '#00ff00', areaScope: 'all' as const, areaIds: [] },
      ];
      useAppStore.getState().setHierarchyLevelConfigs(configs);
      useAppStore.getState().updateHierarchyLevelConfig(0, { name: 'Root', color: '#0000ff' });
      const { state } = useAppStore.getState();
      expect(state.hierarchyLevelConfigs![0].name).toBe('Root');
      expect(state.hierarchyLevelConfigs![0].color).toBe('#0000ff');
      // Other config unchanged
      expect(state.hierarchyLevelConfigs![1].name).toBe('Level 2');
    });

    it('should update area scope to specific', () => {
      const areaId = useAppStore.getState().createArea('Test Area');
      const configs = [
        { depth: 0, name: 'Level 1', color: '#ff0000', areaScope: 'all' as const, areaIds: [] },
      ];
      useAppStore.getState().setHierarchyLevelConfigs(configs);
      useAppStore.getState().updateHierarchyLevelConfig(0, {
        areaScope: 'specific',
        areaIds: [areaId],
      });
      const { state } = useAppStore.getState();
      expect(state.hierarchyLevelConfigs![0].areaScope).toBe('specific');
      expect(state.hierarchyLevelConfigs![0].areaIds).toContain(areaId);
    });

    it('should not crash when updating non-existent depth', () => {
      const configs = [
        { depth: 0, name: 'Level 1', color: '#ff0000', areaScope: 'all' as const, areaIds: [] },
      ];
      useAppStore.getState().setHierarchyLevelConfigs(configs);
      useAppStore.getState().updateHierarchyLevelConfig(5, { name: 'Nope' });
      const { state } = useAppStore.getState();
      // Original config unchanged
      expect(state.hierarchyLevelConfigs).toHaveLength(1);
      expect(state.hierarchyLevelConfigs![0].name).toBe('Level 1');
    });

    it('should persist configs through state replacement', () => {
      const configs = [
        { depth: 0, name: 'Root', color: '#111111', areaScope: 'all' as const, areaIds: [] },
      ];
      useAppStore.getState().setHierarchyLevelConfigs(configs);
      // Create an area (triggers setState internally) - configs should survive
      useAppStore.getState().createArea('New Area');
      const { state } = useAppStore.getState();
      expect(state.hierarchyLevelConfigs).toHaveLength(1);
      expect(state.hierarchyLevelConfigs![0].name).toBe('Root');
    });
  });
});
