// ============================================================
// ContentManager Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentManager } from './ContentManager';
import { AreaManager } from './AreaManager';
import { getDefaultState } from '../constants/schema';
import { ContentStatus, ShapeType, PropertyType } from '../types/enums';
import type { AppState } from '../types/app';
import type { Shape } from '../types/shape';
import type { Property } from '../types/property';
import { generateId } from '../utils/id';

describe('ContentManager', () => {
  let state: AppState;
  let areaId: string;

  beforeEach(() => {
    state = getDefaultState();
    const area = AreaManager.createArea('Test Area', state);
    areaId = area.id;
    state = {
      ...state,
      areas: [...state.areas, area],
    };
  });

  describe('createContent', () => {
    it('should create content in area', () => {
      const content = ContentManager.createContent(areaId, 'Test Content', state);
      expect(content.id).toBeDefined();
      expect(content.title).toBe('Test Content');
      expect(content.status).toBe(ContentStatus.OPEN);
      expect(content.body.shapes).toEqual([]);
      expect(content.properties).toEqual([]);
      expect(content.areaId).toBe(areaId);
    });

    it('should throw if area does not exist', () => {
      expect(() => {
        ContentManager.createContent('invalid-area', 'Title', state);
      }).toThrow('Area invalid-area not found');
    });
  });

  describe('updateContent', () => {
    it('should update content title', () => {
      const content = ContentManager.createContent(areaId, 'Original', state);
      state = { ...state, contents: [...state.contents, content] };

      const updated = ContentManager.updateContent(
        content.id,
        { title: 'Updated' },
        state,
      );
      expect(updated.title).toBe('Updated');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(content.createdAt);
    });

    it('should not allow changing ID', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      state = { ...state, contents: [...state.contents, content] };

      const updated = ContentManager.updateContent(
        content.id,
        { id: 'new-id' } as Partial<typeof content>,
        state,
      );
      expect(updated.id).toBe(content.id);
    });

    it('should throw if content not found', () => {
      expect(() => {
        ContentManager.updateContent('invalid', { title: 'Test' }, state);
      }).toThrow('Content invalid not found');
    });
  });

  describe('deleteContent', () => {
    it('should return success for existing content', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      state = { ...state, contents: [...state.contents, content] };

      const result = ContentManager.deleteContent(content.id, state);
      expect(result.success).toBe(true);
    });

    it('should return failure for non-existing content', () => {
      const result = ContentManager.deleteContent('invalid', state);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Content not found');
    });
  });

  describe('openContent', () => {
    it('should open a closed content', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      state = { ...state, contents: [...state.contents, content] };

      const closed = ContentManager.closeContent(content.id, state);
      state = {
        ...state,
        contents: state.contents.map((c) => (c.id === content.id ? closed : c)),
      };

      const opened = ContentManager.openContent(content.id, state);
      expect(opened.status).toBe(ContentStatus.OPEN);
      expect(opened.nodePosition).toBeUndefined();
    });
  });

  describe('closeContent', () => {
    it('should close an open content', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      state = { ...state, contents: [...state.contents, content] };

      const closed = ContentManager.closeContent(content.id, state);
      expect(closed.status).toBe(ContentStatus.CLOSED);
    });

    it('should throw if content is already closed', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      state = { ...state, contents: [...state.contents, content] };

      const closed = ContentManager.closeContent(content.id, state);
      state = {
        ...state,
        contents: state.contents.map((c) => (c.id === content.id ? closed : c)),
      };

      expect(() => {
        ContentManager.closeContent(content.id, state);
      }).toThrow('already closed');
    });
  });

  describe('addShapeToContent', () => {
    it('should add shape to content', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      state = { ...state, contents: [...state.contents, content] };

      const shape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 10, y: 10 },
        dimension: { width: 100, height: 100 },
        style: { fill: '#000' },
        createdAt: Date.now(),
      };

      const updated = ContentManager.addShapeToContent(content.id, shape, state);
      expect(updated.body.shapes).toHaveLength(1);
      expect(updated.body.shapes[0].id).toBe(shape.id);
    });

    it('should throw if shape ID already exists', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      const shape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 10, y: 10 },
        dimension: { width: 100, height: 100 },
        style: {},
        createdAt: Date.now(),
      };

      const updated = ContentManager.addShapeToContent(content.id, shape, {
        ...state,
        contents: [...state.contents, content],
      });
      state = {
        ...state,
        contents: [updated],
      };

      expect(() => {
        ContentManager.addShapeToContent(updated.id, shape, state);
      }).toThrow('already exists');
    });
  });

  describe('removeShapeFromContent', () => {
    it('should remove shape from content', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      const shape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 0, y: 0 },
        dimension: { width: 50, height: 50 },
        style: {},
        createdAt: Date.now(),
      };

      const withShape = ContentManager.addShapeToContent(content.id, shape, {
        ...state,
        contents: [...state.contents, content],
      });
      state = { ...state, contents: [withShape] };

      const removed = ContentManager.removeShapeFromContent(
        withShape.id,
        shape.id,
        state,
      );
      expect(removed.body.shapes).toHaveLength(0);
    });
  });

  describe('updateShapeInContent', () => {
    it('should update shape properties', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      const shape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 0, y: 0 },
        dimension: { width: 50, height: 50 },
        style: { fill: '#000' },
        createdAt: Date.now(),
      };

      const withShape = ContentManager.addShapeToContent(content.id, shape, {
        ...state,
        contents: [...state.contents, content],
      });
      state = { ...state, contents: [withShape] };

      const updated = ContentManager.updateShapeInContent(
        withShape.id,
        shape.id,
        { position: { x: 100, y: 100 } },
        state,
      );
      expect(updated.body.shapes[0].position).toEqual({ x: 100, y: 100 });
    });
  });

  describe('addPropertyToContent', () => {
    it('should add property to content', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      state = { ...state, contents: [...state.contents, content] };

      const property: Property = {
        id: generateId(),
        name: 'Tag',
        type: PropertyType.TAG,
        value: 'test',
        createdAt: Date.now(),
      };

      const updated = ContentManager.addPropertyToContent(
        content.id,
        property,
        state,
      );
      expect(updated.properties).toHaveLength(1);
      expect(updated.properties[0].name).toBe('Tag');
    });
  });

  describe('removePropertyFromContent', () => {
    it('should remove property from content', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      const property: Property = {
        id: generateId(),
        name: 'Tag',
        type: PropertyType.TAG,
        value: 'test',
        createdAt: Date.now(),
      };

      const withProp = ContentManager.addPropertyToContent(content.id, property, {
        ...state,
        contents: [...state.contents, content],
      });
      state = { ...state, contents: [withProp] };

      const removed = ContentManager.removePropertyFromContent(
        withProp.id,
        property.id,
        state,
      );
      expect(removed.properties).toHaveLength(0);
    });
  });

  describe('validateContent', () => {
    it('should return no errors for valid content', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      const errors = ContentManager.validateContent(content);
      expect(errors).toHaveLength(0);
    });

    it('should return error for empty title', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      const invalidContent = { ...content, title: '' };
      const errors = ContentManager.validateContent(invalidContent);
      expect(errors).toContain('Content title is required');
    });

    it('should detect duplicate shape IDs', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      const shapeId = generateId();
      const invalidContent = {
        ...content,
        body: {
          shapes: [
            {
              id: shapeId,
              type: ShapeType.RECT,
              position: { x: 0, y: 0 },
              dimension: { width: 10, height: 10 },
              style: {},
              createdAt: Date.now(),
            },
            {
              id: shapeId,
              type: ShapeType.ELLIPSE,
              position: { x: 0, y: 0 },
              dimension: { width: 10, height: 10 },
              style: {},
              createdAt: Date.now(),
            },
          ],
        },
      };
      const errors = ContentManager.validateContent(invalidContent);
      expect(errors.some((e) => e.includes('Duplicate shape IDs'))).toBe(true);
    });
  });

  describe('getContentById', () => {
    it('should return content by ID', () => {
      const content = ContentManager.createContent(areaId, 'Test', state);
      state = { ...state, contents: [...state.contents, content] };

      const found = ContentManager.getContentById(content.id, state);
      expect(found).toBeDefined();
      expect(found?.title).toBe('Test');
    });

    it('should return undefined for non-existing ID', () => {
      const found = ContentManager.getContentById('invalid', state);
      expect(found).toBeUndefined();
    });
  });

  describe('getContentsByAreaId', () => {
    it('should return all contents in area', () => {
      const content1 = ContentManager.createContent(areaId, 'Content 1', state);
      const content2 = ContentManager.createContent(areaId, 'Content 2', state);
      state = { ...state, contents: [content1, content2] };

      const contents = ContentManager.getContentsByAreaId(areaId, state);
      expect(contents).toHaveLength(2);
    });
  });
});
