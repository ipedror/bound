// ============================================================
// AreaManager Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { AreaManager } from './AreaManager';
import { ContentManager } from './ContentManager';
import { getDefaultState } from '../constants/schema';
import type { AppState } from '../types/app';

describe('AreaManager', () => {
  let state: AppState;

  beforeEach(() => {
    state = getDefaultState();
  });

  describe('createArea', () => {
    it('should create a new area', () => {
      const area = AreaManager.createArea('Test Area', state);
      expect(area.id).toBeDefined();
      expect(area.name).toBe('Test Area');
      expect(area.contentIds).toEqual([]);
    });

    it('should throw if name is empty', () => {
      expect(() => {
        AreaManager.createArea('', state);
      }).toThrow('Area name is required');
    });

    it('should throw if name already exists', () => {
      const area = AreaManager.createArea('Test Area', state);
      state = { ...state, areas: [...state.areas, area] };

      expect(() => {
        AreaManager.createArea('Test Area', state);
      }).toThrow('already exists');
    });

    it('should trim whitespace from name', () => {
      const area = AreaManager.createArea('  Test Area  ', state);
      expect(area.name).toBe('Test Area');
    });
  });

  describe('updateArea', () => {
    it('should update area name', () => {
      const area = AreaManager.createArea('Original', state);
      state = { ...state, areas: [...state.areas, area] };

      const updated = AreaManager.updateArea(
        area.id,
        { name: 'Updated' },
        state,
      );
      expect(updated.name).toBe('Updated');
    });

    it('should update background color', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const updated = AreaManager.updateArea(
        area.id,
        { backgroundColor: '#ff0000' },
        state,
      );
      expect(updated.backgroundColor).toBe('#ff0000');
    });

    it('should throw if new name already exists', () => {
      const area1 = AreaManager.createArea('Area 1', state);
      state = { ...state, areas: [...state.areas, area1] };
      const area2 = AreaManager.createArea('Area 2', state);
      state = { ...state, areas: [...state.areas, area2] };

      expect(() => {
        AreaManager.updateArea(area2.id, { name: 'Area 1' }, state);
      }).toThrow('already exists');
    });

    it('should allow keeping the same name', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const updated = AreaManager.updateArea(
        area.id,
        { name: 'Test', description: 'Updated description' },
        state,
      );
      expect(updated.name).toBe('Test');
      expect(updated.description).toBe('Updated description');
    });

    it('should throw if area not found', () => {
      expect(() => {
        AreaManager.updateArea('invalid', { name: 'Test' }, state);
      }).toThrow('Area invalid not found');
    });
  });

  describe('deleteArea', () => {
    it('should return success for existing area', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const result = AreaManager.deleteArea(area.id, state);
      expect(result.success).toBe(true);
    });

    it('should return failure for non-existing area', () => {
      const result = AreaManager.deleteArea('invalid', state);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Area not found');
    });
  });

  describe('renameArea', () => {
    it('should rename area', () => {
      const area = AreaManager.createArea('Original', state);
      state = { ...state, areas: [...state.areas, area] };

      const renamed = AreaManager.renameArea(area.id, 'New Name', state);
      expect(renamed.name).toBe('New Name');
    });
  });

  describe('addContentToArea', () => {
    it('should add content ID to area', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const content = ContentManager.createContent(area.id, 'Content', state);
      state = { ...state, contents: [...state.contents, content] };

      const updated = AreaManager.addContentToArea(area.id, content.id, state);
      expect(updated.contentIds).toContain(content.id);
    });

    it('should throw if content already in area', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const content = ContentManager.createContent(area.id, 'Content', state);
      state = { ...state, contents: [...state.contents, content] };

      const updated = AreaManager.addContentToArea(area.id, content.id, state);
      state = {
        ...state,
        areas: state.areas.map((a) => (a.id === area.id ? updated : a)),
      };

      expect(() => {
        AreaManager.addContentToArea(area.id, content.id, state);
      }).toThrow('already in Area');
    });

    it('should throw if content not found', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      expect(() => {
        AreaManager.addContentToArea(area.id, 'invalid', state);
      }).toThrow('Content invalid not found');
    });
  });

  describe('removeContentFromArea', () => {
    it('should remove content ID from area', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const content = ContentManager.createContent(area.id, 'Content', state);
      state = { ...state, contents: [...state.contents, content] };

      const withContent = AreaManager.addContentToArea(
        area.id,
        content.id,
        state,
      );
      state = {
        ...state,
        areas: state.areas.map((a) => (a.id === area.id ? withContent : a)),
      };

      const removed = AreaManager.removeContentFromArea(
        area.id,
        content.id,
        state,
      );
      expect(removed.contentIds).not.toContain(content.id);
    });

    it('should throw if content not in area', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const content = ContentManager.createContent(area.id, 'Content', state);
      state = { ...state, contents: [...state.contents, content] };

      expect(() => {
        AreaManager.removeContentFromArea(area.id, content.id, state);
      }).toThrow('not in Area');
    });
  });

  describe('getAreaById', () => {
    it('should return area by ID', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const found = AreaManager.getAreaById(area.id, state);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test');
    });

    it('should return undefined for non-existing ID', () => {
      const found = AreaManager.getAreaById('invalid', state);
      expect(found).toBeUndefined();
    });
  });

  describe('getAreaByName', () => {
    it('should return area by name', () => {
      const area = AreaManager.createArea('Test Area', state);
      state = { ...state, areas: [...state.areas, area] };

      const found = AreaManager.getAreaByName('Test Area', state);
      expect(found).toBeDefined();
      expect(found?.id).toBe(area.id);
    });
  });

  describe('isAreaNameUnique', () => {
    it('should return true for unique name', () => {
      const isUnique = AreaManager.isAreaNameUnique('New Name', state);
      expect(isUnique).toBe(true);
    });

    it('should return false for existing name', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const isUnique = AreaManager.isAreaNameUnique('Test', state);
      expect(isUnique).toBe(false);
    });

    it('should exclude specified ID from check', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const isUnique = AreaManager.isAreaNameUnique('Test', state, area.id);
      expect(isUnique).toBe(true);
    });

    it('should be case-insensitive', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const isUnique = AreaManager.isAreaNameUnique('TEST', state);
      expect(isUnique).toBe(false);
    });
  });

  describe('validateArea', () => {
    it('should return no errors for valid area', () => {
      const area = AreaManager.createArea('Test', state);
      const errors = AreaManager.validateArea(area);
      expect(errors).toHaveLength(0);
    });

    it('should return error for empty name', () => {
      const area = AreaManager.createArea('Test', state);
      const invalidArea = { ...area, name: '' };
      const errors = AreaManager.validateArea(invalidArea);
      expect(errors).toContain('Area name is required');
    });
  });

  describe('getContentIdsForCascadeDelete', () => {
    it('should return all content IDs in area', () => {
      const area = AreaManager.createArea('Test', state);
      state = { ...state, areas: [...state.areas, area] };

      const content1 = ContentManager.createContent(area.id, 'Content 1', state);
      const content2 = ContentManager.createContent(area.id, 'Content 2', state);
      state = { ...state, contents: [content1, content2] };

      const contentIds = AreaManager.getContentIdsForCascadeDelete(area.id, state);
      expect(contentIds).toHaveLength(2);
      expect(contentIds).toContain(content1.id);
      expect(contentIds).toContain(content2.id);
    });
  });
});
