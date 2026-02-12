// ============================================================
// useContent Hook Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore, resetStore } from '../store/appStore';
import { useContent } from './useContent';
import { ShapeType, PropertyType } from '../types/enums';
import type { Shape } from '../types/shape';
import type { Property } from '../types/property';
import { generateId } from '../utils/id';

describe('useContent', () => {
  let areaId: string;
  let contentId: string;

  beforeEach(() => {
    resetStore();
    areaId = useAppStore.getState().createArea('Test Area');
    contentId = useAppStore.getState().createContent(areaId, 'Test Content');
  });

  describe('Initialization', () => {
    it('should return content by id', () => {
      const { result } = renderHook(() => useContent(contentId));

      expect(result.current.content).toBeDefined();
      expect(result.current.content?.id).toBe(contentId);
      expect(result.current.content?.title).toBe('Test Content');
    });

    it('should return undefined for non-existent contentId', () => {
      const { result } = renderHook(() => useContent('invalid-id'));

      expect(result.current.content).toBeUndefined();
    });

    it('should return undefined for undefined contentId', () => {
      const { result } = renderHook(() => useContent(undefined));

      expect(result.current.content).toBeUndefined();
    });

    it('should indicate if content is open', () => {
      const { result } = renderHook(() => useContent(contentId));

      expect(result.current.isOpen).toBe(true);
    });

    it('should return empty shapes array initially', () => {
      const { result } = renderHook(() => useContent(contentId));

      expect(result.current.shapes).toEqual([]);
    });

    it('should return empty properties array initially', () => {
      const { result } = renderHook(() => useContent(contentId));

      expect(result.current.properties).toEqual([]);
    });
  });

  describe('updateContent', () => {
    it('should update content title', () => {
      const { result } = renderHook(() => useContent(contentId));

      act(() => {
        result.current.updateContent({ title: 'Updated Title' });
      });

      expect(result.current.content?.title).toBe('Updated Title');
    });

    it('should do nothing when contentId is undefined', () => {
      const { result } = renderHook(() => useContent(undefined));

      act(() => {
        result.current.updateContent({ title: 'Should not work' });
      });

      expect(result.current.content).toBeUndefined();
    });
  });

  describe('deleteContent', () => {
    it('should delete content', () => {
      const { result } = renderHook(() => useContent(contentId));

      let deleted: boolean;
      act(() => {
        deleted = result.current.deleteContent();
      });

      expect(deleted!).toBe(true);
      expect(result.current.content).toBeUndefined();
    });

    it('should return false when contentId is undefined', () => {
      const { result } = renderHook(() => useContent(undefined));

      let deleted: boolean;
      act(() => {
        deleted = result.current.deleteContent();
      });

      expect(deleted!).toBe(false);
    });
  });

  describe('openContent/closeContent', () => {
    it('should close and open content', () => {
      const { result } = renderHook(() => useContent(contentId));

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeContent();
      });

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.openContent();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should do nothing when contentId is undefined', () => {
      const { result } = renderHook(() => useContent(undefined));

      act(() => {
        result.current.openContent();
      });

      expect(result.current.content).toBeUndefined();

      act(() => {
        result.current.closeContent();
      });

      expect(result.current.content).toBeUndefined();
    });
  });

  describe('Shape operations', () => {
    it('should add shape', () => {
      const { result } = renderHook(() => useContent(contentId));

      const shape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 10, y: 10 },
        dimension: { width: 100, height: 50 },
        style: { fill: '#ffffff', stroke: '#000000' },
        createdAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape);
      });

      expect(result.current.shapes).toHaveLength(1);
      expect(result.current.shapes[0].id).toBe(shape.id);
    });

    it('should remove shape', () => {
      const { result } = renderHook(() => useContent(contentId));

      const shape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 10, y: 10 },
        dimension: { width: 100, height: 50 },
        style: { fill: '#ffffff', stroke: '#000000' },
        createdAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape);
      });

      expect(result.current.shapes).toHaveLength(1);

      act(() => {
        result.current.removeShape(shape.id);
      });

      expect(result.current.shapes).toHaveLength(0);
    });

    it('should update shape', () => {
      const { result } = renderHook(() => useContent(contentId));

      const shape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 10, y: 10 },
        dimension: { width: 100, height: 50 },
        style: { fill: '#ffffff', stroke: '#000000' },
        createdAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape);
      });

      act(() => {
        result.current.updateShape(shape.id, { position: { x: 50, y: 50 } });
      });

      expect(result.current.shapes[0].position).toEqual({ x: 50, y: 50 });
    });

    it('should do nothing when contentId is undefined', () => {
      const { result } = renderHook(() => useContent(undefined));

      const shape: Shape = {
        id: generateId(),
        type: ShapeType.RECT,
        position: { x: 10, y: 10 },
        dimension: { width: 100, height: 50 },
        style: { fill: '#ffffff', stroke: '#000000' },
        createdAt: Date.now(),
      };

      act(() => {
        result.current.addShape(shape);
      });

      expect(result.current.shapes).toEqual([]);

      act(() => {
        result.current.removeShape('some-id');
      });

      expect(result.current.shapes).toEqual([]);

      act(() => {
        result.current.updateShape('some-id', { position: { x: 50, y: 50 } });
      });

      expect(result.current.shapes).toEqual([]);
    });
  });

  describe('Property operations', () => {
    it('should add property', () => {
      const { result } = renderHook(() => useContent(contentId));

      const property: Property = {
        id: generateId(),
        name: 'Test Property',
        value: 'Test Value',
        type: PropertyType.SHORT_TEXT,
        createdAt: Date.now(),
      };

      act(() => {
        result.current.addProperty(property);
      });

      expect(result.current.properties).toHaveLength(1);
      expect(result.current.properties[0].name).toBe('Test Property');
    });

    it('should remove property', () => {
      const { result } = renderHook(() => useContent(contentId));

      const property: Property = {
        id: generateId(),
        name: 'Test Property',
        value: 'Test Value',
        type: PropertyType.SHORT_TEXT,
        createdAt: Date.now(),
      };

      act(() => {
        result.current.addProperty(property);
      });

      expect(result.current.properties).toHaveLength(1);

      act(() => {
        result.current.removeProperty(property.id);
      });

      expect(result.current.properties).toHaveLength(0);
    });

    it('should update property', () => {
      const { result } = renderHook(() => useContent(contentId));

      const property: Property = {
        id: generateId(),
        name: 'Test Property',
        value: 'Test Value',
        type: PropertyType.SHORT_TEXT,
        createdAt: Date.now(),
      };

      act(() => {
        result.current.addProperty(property);
      });

      act(() => {
        result.current.updateProperty(property.id, { value: 'Updated Value' });
      });

      expect(result.current.properties[0].value).toBe('Updated Value');
    });

    it('should do nothing when contentId is undefined', () => {
      const { result } = renderHook(() => useContent(undefined));

      const property: Property = {
        id: generateId(),
        name: 'Test Property',
        value: 'Test Value',
        type: PropertyType.SHORT_TEXT,
        createdAt: Date.now(),
      };

      act(() => {
        result.current.addProperty(property);
      });

      expect(result.current.properties).toEqual([]);

      act(() => {
        result.current.removeProperty('some-id');
      });

      expect(result.current.properties).toEqual([]);

      act(() => {
        result.current.updateProperty('some-id', { value: 'Updated Value' });
      });

      expect(result.current.properties).toEqual([]);
    });
  });
});
