// ============================================================
// Integration Tests - Full workflow tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, resetStore } from '../../store/appStore';
import { ContentStatus, ShapeType, PropertyType, LinkType } from '../../types/enums';
import { generateId } from '../../utils/id';
import type { Shape } from '../../types/shape';
import type { Property } from '../../types/property';

describe('Integration: Full Workflow', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('Workflow: Create Area → Create Content → Add Shapes → Add Property → Close → Link', () => {
    it('should complete full content creation workflow', () => {
      const store = useAppStore.getState();

      // Step 1: Create an area
      const areaId = store.createArea('My Notes');
      expect(useAppStore.getState().state.areas).toHaveLength(1);
      expect(useAppStore.getState().state.areas[0].name).toBe('My Notes');

      // Step 2: Create a content in the area
      const contentId = store.createContent(areaId, 'First Note');
      expect(useAppStore.getState().state.contents).toHaveLength(1);
      expect(useAppStore.getState().state.contents[0].title).toBe('First Note');
      expect(useAppStore.getState().state.contents[0].status).toBe(ContentStatus.OPEN);

      // Step 3: Add shapes to content
      const shape1: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 10, y: 10 },
        dimension: { width: 100, height: 50 },
        style: { fill: '#ffffff', stroke: '#000000' },
        createdAt: Date.now(),
      };

      const shape2: Shape = {
        id: generateId(),
        type: ShapeType.TEXT,
        position: { x: 20, y: 20 },
        dimension: { width: 80, height: 30 },
        style: { fill: '#000000' },
        text: 'Hello World',
        createdAt: Date.now(),
      };

      store.addShapeToContent(contentId, shape1);
      store.addShapeToContent(contentId, shape2);
      expect(useAppStore.getState().state.contents[0].body.shapes).toHaveLength(2);

      // Step 4: Add a property
      const property: Property = {
        id: generateId(),
        name: 'Tags',
        type: PropertyType.TAG,
        value: 'important',
        createdAt: Date.now(),
      };
      store.addPropertyToContent(contentId, property);
      expect(useAppStore.getState().state.contents[0].properties).toHaveLength(1);

      // Step 5: Close the content
      store.closeContent(contentId);
      expect(useAppStore.getState().state.contents[0].status).toBe(ContentStatus.CLOSED);

      // Verify area still has the content reference
      expect(useAppStore.getState().state.areas[0].contentIds).toContain(contentId);
    });

    it('should create and manage links between contents', () => {
      const store = useAppStore.getState();

      // Create area and two contents
      const areaId = store.createArea('Project');
      const content1Id = store.createContent(areaId, 'Task 1');
      const content2Id = store.createContent(areaId, 'Task 2');

      // Create manual link
      const linkId = store.createLink(content1Id, content2Id, LinkType.MANUAL);
      const { state } = useAppStore.getState();

      expect(state.links).toHaveLength(1);
      expect(state.links[0].fromContentId).toBe(content1Id);
      expect(state.links[0].toContentId).toBe(content2Id);
      expect(state.links[0].type).toBe(LinkType.MANUAL);

      // Delete link
      store.deleteLink(linkId);
      expect(useAppStore.getState().state.links).toHaveLength(0);
    });

    it('should auto-create link when adding link property', () => {
      const store = useAppStore.getState();

      // Create area and two contents
      const areaId = store.createArea('Knowledge Base');
      const concept1Id = store.createContent(areaId, 'Concept A');
      const concept2Id = store.createContent(areaId, 'Concept B');

      // Add link property referencing another content
      const linkProp: Property = {
        id: generateId(),
        name: 'Related To',
        type: PropertyType.LINK,
        value: concept2Id,
        createdAt: Date.now(),
      };

      store.addPropertyToContent(concept1Id, linkProp);
      const { state } = useAppStore.getState();

      // Should have auto-created link
      expect(state.links.length).toBeGreaterThanOrEqual(1);
      const autoLink = state.links.find(
        (l) => l.propertyId === linkProp.id,
      );
      expect(autoLink).toBeDefined();
    });
  });

  describe('Workflow: Area and Content Deletion with Cascade', () => {
    it('should cascade delete contents when area is deleted', () => {
      const store = useAppStore.getState();

      // Setup: Create area with multiple contents
      const areaId = store.createArea('Temporary Area');
      store.createContent(areaId, 'Content 1');
      store.createContent(areaId, 'Content 2');
      store.createContent(areaId, 'Content 3');

      // Verify setup
      expect(useAppStore.getState().state.areas).toHaveLength(1);
      expect(useAppStore.getState().state.contents).toHaveLength(3);

      // Delete area
      const success = store.deleteArea(areaId);

      expect(success).toBe(true);
      expect(useAppStore.getState().state.areas).toHaveLength(0);
      expect(useAppStore.getState().state.contents).toHaveLength(0);
    });

    it('should cascade delete links when content is deleted', () => {
      const store = useAppStore.getState();

      // Setup: Create area, contents, and links
      const areaId = store.createArea('Graph Area');
      const centerContentId = store.createContent(areaId, 'Center Node');
      const linkedContentIds = [
        store.createContent(areaId, 'Node 1'),
        store.createContent(areaId, 'Node 2'),
      ];

      // Create links from center to other nodes
      linkedContentIds.forEach((id) => {
        store.createLink(centerContentId, id, LinkType.MANUAL);
      });

      expect(useAppStore.getState().state.links).toHaveLength(2);

      // Delete center content
      store.deleteContent(centerContentId);

      // All links should be deleted
      expect(useAppStore.getState().state.links).toHaveLength(0);
    });

    it('should clear navigation state when current area is deleted', () => {
      const store = useAppStore.getState();

      const areaId = store.createArea('Nav Area');
      const contentId = store.createContent(areaId, 'Nav Content');

      store.setCurrentAreaId(areaId);
      store.setCurrentContentId(contentId);

      expect(useAppStore.getState().state.currentAreaId).toBe(areaId);
      expect(useAppStore.getState().state.currentContentId).toBe(contentId);

      // Delete area
      store.deleteArea(areaId);

      expect(useAppStore.getState().state.currentAreaId).toBeUndefined();
      expect(useAppStore.getState().state.currentContentId).toBeUndefined();
    });
  });

  describe('Workflow: Shape and Property Management', () => {
    it('should manage shapes in content body', () => {
      const store = useAppStore.getState();

      const areaId = store.createArea('Canvas Area');
      const contentId = store.createContent(areaId, 'Canvas');

      // Add initial shape
      const rectShape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 0, y: 0 },
        dimension: { width: 100, height: 100 },
        style: { fill: '#ff0000' },
        createdAt: Date.now(),
      };
      store.addShapeToContent(contentId, rectShape);

      // Update shape position
      store.updateShapeInContent(contentId, rectShape.id, {
        position: { x: 50, y: 50 },
      });

      const updatedShape = useAppStore
        .getState()
        .state.contents[0].body.shapes.find((s) => s.id === rectShape.id);
      expect(updatedShape?.position).toEqual({ x: 50, y: 50 });

      // Add more shapes
      const circleShape: Shape = {
        id: generateId(),
        type: ShapeType.ELLIPSE,
        position: { x: 200, y: 200 },
        dimension: { width: 50, height: 50 },
        style: { fill: '#00ff00' },
        createdAt: Date.now(),
      };
      store.addShapeToContent(contentId, circleShape);

      expect(useAppStore.getState().state.contents[0].body.shapes).toHaveLength(2);

      // Remove shape
      store.removeShapeFromContent(contentId, rectShape.id);
      expect(useAppStore.getState().state.contents[0].body.shapes).toHaveLength(1);
      expect(useAppStore.getState().state.contents[0].body.shapes[0].id).toBe(
        circleShape.id,
      );
    });

    it('should manage properties with different types', () => {
      const store = useAppStore.getState();

      const areaId = store.createArea('Props Area');
      const contentId = store.createContent(areaId, 'Props Content');

      // Add text property
      const textProp: Property = {
        id: generateId(),
        name: 'Description',
        type: PropertyType.SHORT_TEXT,
        value: 'Initial description',
        createdAt: Date.now(),
      };
      store.addPropertyToContent(contentId, textProp);

      // Add number property
      const numberProp: Property = {
        id: generateId(),
        name: 'Priority',
        type: PropertyType.NUMBER,
        value: 5,
        createdAt: Date.now(),
      };
      store.addPropertyToContent(contentId, numberProp);

      // Add date property
      const dateProp: Property = {
        id: generateId(),
        name: 'Due Date',
        type: PropertyType.DATE,
        value: Date.now(),
        createdAt: Date.now(),
      };
      store.addPropertyToContent(contentId, dateProp);

      // Add tag property (instead of checkbox which doesn't exist)
      const tagProp: Property = {
        id: generateId(),
        name: 'Status',
        type: PropertyType.TAG,
        value: 'done',
        createdAt: Date.now(),
      };
      store.addPropertyToContent(contentId, tagProp);

      expect(useAppStore.getState().state.contents[0].properties).toHaveLength(4);

      // Update property
      store.updatePropertyInContent(contentId, textProp.id, {
        value: 'Updated description',
      });
      const updated = useAppStore
        .getState()
        .state.contents[0].properties.find((p) => p.id === textProp.id);
      expect(updated?.value).toBe('Updated description');

      // Remove property
      store.removePropertyFromContent(contentId, textProp.id);
      expect(useAppStore.getState().state.contents[0].properties).toHaveLength(3);
    });
  });

  describe('Workflow: Multi-Area Organization', () => {
    it('should organize contents across multiple areas', () => {
      const store = useAppStore.getState();

      // Create multiple areas
      const workAreaId = store.createArea('Work');
      const personalAreaId = store.createArea('Personal');
      const archiveAreaId = store.createArea('Archive');

      // Create contents in different areas
      store.createContent(workAreaId, 'Project A');
      store.createContent(workAreaId, 'Project B');
      store.createContent(personalAreaId, 'Shopping List');
      store.createContent(archiveAreaId, 'Old Notes');

      const { state } = useAppStore.getState();

      expect(state.areas).toHaveLength(3);
      expect(state.contents).toHaveLength(4);

      // Verify contents are in correct areas
      const workContents = state.contents.filter((c) => c.areaId === workAreaId);
      const personalContents = state.contents.filter(
        (c) => c.areaId === personalAreaId,
      );
      const archiveContents = state.contents.filter(
        (c) => c.areaId === archiveAreaId,
      );

      expect(workContents).toHaveLength(2);
      expect(personalContents).toHaveLength(1);
      expect(archiveContents).toHaveLength(1);
    });

    it('should maintain area isolation when deleting', () => {
      const store = useAppStore.getState();

      const area1Id = store.createArea('Area 1');
      const area2Id = store.createArea('Area 2');

      store.createContent(area1Id, 'Content A1');
      store.createContent(area1Id, 'Content A2');
      store.createContent(area2Id, 'Content B1');

      // Delete Area 1
      store.deleteArea(area1Id);

      const { state } = useAppStore.getState();
      expect(state.areas).toHaveLength(1);
      expect(state.contents).toHaveLength(1);
      expect(state.contents[0].areaId).toBe(area2Id);
    });
  });

  describe('Workflow: Navigation State', () => {
    it('should manage navigation state correctly', () => {
      const store = useAppStore.getState();

      // Create areas and contents
      const area1Id = store.createArea('Area 1');
      const area2Id = store.createArea('Area 2');
      const contentId = store.createContent(area1Id, 'Content 1');

      // Navigate to area
      store.setCurrentAreaId(area1Id);
      expect(useAppStore.getState().state.currentAreaId).toBe(area1Id);

      // Navigate to content
      store.setCurrentContentId(contentId);
      expect(useAppStore.getState().state.currentContentId).toBe(contentId);

      // Switch area
      store.setCurrentAreaId(area2Id);
      expect(useAppStore.getState().state.currentAreaId).toBe(area2Id);
      // Content selection remains (UI might clear it)
      expect(useAppStore.getState().state.currentContentId).toBe(contentId);

      // Clear navigation
      store.setCurrentAreaId(undefined);
      store.setCurrentContentId(undefined);
      expect(useAppStore.getState().state.currentAreaId).toBeUndefined();
      expect(useAppStore.getState().state.currentContentId).toBeUndefined();
    });
  });

  describe('Workflow: Error Handling', () => {
    it('should handle errors and allow clearing', () => {
      const store = useAppStore.getState();

      // Trigger an error (invalid operation)
      try {
        store.createArea('');
      } catch {
        // Expected to throw
      }

      expect(useAppStore.getState().error).not.toBeNull();

      // Clear error
      store.clearError();
      expect(useAppStore.getState().error).toBeNull();
    });

    it('should handle deleting non-existent entity gracefully', () => {
      const store = useAppStore.getState();

      // Try to delete non-existent area
      const result = store.deleteArea('non-existent-id');
      expect(result).toBe(false);

      // Try to delete non-existent content
      const contentResult = store.deleteContent('non-existent-id');
      expect(contentResult).toBe(false);

      // Try to delete non-existent link
      const linkResult = store.deleteLink('non-existent-id');
      expect(linkResult).toBe(false);
    });
  });

  describe('State immutability', () => {
    it('should create new state objects on updates', () => {
      const store = useAppStore.getState();

      const stateBefore = useAppStore.getState().state;
      const areasBefore = stateBefore.areas;

      store.createArea('New Area');

      const stateAfter = useAppStore.getState().state;
      const areasAfter = stateAfter.areas;

      // State object should be different
      expect(stateAfter).not.toBe(stateBefore);
      // Arrays should be different
      expect(areasAfter).not.toBe(areasBefore);
    });

    it('should not modify original content when updating', () => {
      const store = useAppStore.getState();

      const areaId = store.createArea('Area');
      const contentId = store.createContent(areaId, 'Original Title');

      const contentBefore = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);

      store.updateContent(contentId, { title: 'New Title' });

      const contentAfter = useAppStore
        .getState()
        .state.contents.find((c) => c.id === contentId);

      // Content objects should be different
      expect(contentAfter).not.toBe(contentBefore);
      // Original title remains if we kept reference (but we don't normally)
      expect(contentAfter?.title).toBe('New Title');
    });
  });
});
