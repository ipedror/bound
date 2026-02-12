// ============================================================
// Type Guards Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { isContent, isArea, isProperty, isShape, isLink, isAppState } from '../utils/validation';
import { PropertyType, LinkType, ShapeType, ContentStatus } from './enums';
import type { Content } from './content';
import type { Area } from './area';
import type { Property } from './property';
import type { Shape } from './shape';
import type { Link } from './link';
import type { AppState } from './app';

describe('Type Guards', () => {
  // ---- Property ----
  describe('isProperty', () => {
    it('should validate correct Property', () => {
      const valid: Property = {
        id: 'p1',
        name: 'Tag',
        type: PropertyType.TAG,
        value: 'test',
        createdAt: Date.now(),
      };
      expect(isProperty(valid)).toBe(true);
    });

    it('should reject invalid object', () => {
      expect(isProperty({ foo: 'bar' })).toBe(false);
      expect(isProperty(null)).toBe(false);
      expect(isProperty(undefined)).toBe(false);
      expect(isProperty(42)).toBe(false);
    });

    it('should reject property with invalid type', () => {
      expect(
        isProperty({
          id: 'p1',
          name: 'Tag',
          type: 'invalid',
          value: 'test',
          createdAt: Date.now(),
        }),
      ).toBe(false);
    });
  });

  // ---- Shape ----
  describe('isShape', () => {
    it('should validate correct Shape', () => {
      const valid: Shape = {
        id: 's1',
        type: ShapeType.RECT,
        position: { x: 0, y: 0 },
        dimension: { width: 100, height: 50 },
        style: { fill: '#fff' },
        createdAt: Date.now(),
      };
      expect(isShape(valid)).toBe(true);
    });

    it('should reject shape without position', () => {
      expect(
        isShape({
          id: 's1',
          type: 'rect',
          dimension: { width: 100, height: 50 },
          style: {},
          createdAt: Date.now(),
        }),
      ).toBe(false);
    });

    it('should reject null and primitives', () => {
      expect(isShape(null)).toBe(false);
      expect(isShape('string')).toBe(false);
    });

    it('should validate IMAGE shape type', () => {
      const imageShape: Shape = {
        id: 's2',
        type: ShapeType.IMAGE,
        position: { x: 10, y: 20 },
        dimension: { width: 200, height: 150 },
        style: { opacity: 1 },
        imageSrc: 'data:image/png;base64,abc123',
        createdAt: Date.now(),
      };
      expect(isShape(imageShape)).toBe(true);
    });

    it('should validate shape with groupId', () => {
      const groupedShape: Shape = {
        id: 's3',
        type: ShapeType.RECT,
        position: { x: 0, y: 0 },
        dimension: { width: 100, height: 50 },
        style: { fill: '#fff' },
        groupId: 'group-123',
        createdAt: Date.now(),
      };
      expect(isShape(groupedShape)).toBe(true);
    });
  });

  // ---- Content ----
  describe('isContent', () => {
    it('should validate correct Content', () => {
      const valid: Content = {
        id: 'c1',
        areaId: 'a1',
        title: 'Test Content',
        status: ContentStatus.OPEN,
        body: { shapes: [] },
        properties: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(isContent(valid)).toBe(true);
    });

    it('should validate Content with closed status', () => {
      const valid: Content = {
        id: 'c2',
        areaId: 'a1',
        title: 'Closed Content',
        status: ContentStatus.CLOSED,
        body: { shapes: [] },
        properties: [],
        nodePosition: { x: 10, y: 20 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(isContent(valid)).toBe(true);
    });

    it('should reject invalid Content', () => {
      expect(isContent({ foo: 'bar' })).toBe(false);
      expect(isContent(null)).toBe(false);
    });

    it('should reject Content with invalid status', () => {
      expect(
        isContent({
          id: 'c1',
          areaId: 'a1',
          title: 'Test',
          status: 'draft',
          body: { shapes: [] },
          properties: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      ).toBe(false);
    });
  });

  // ---- Link ----
  describe('isLink', () => {
    it('should validate correct Link', () => {
      const valid: Link = {
        id: 'l1',
        fromContentId: 'c1',
        toContentId: 'c2',
        type: LinkType.MANUAL,
        createdAt: Date.now(),
      };
      expect(isLink(valid)).toBe(true);
    });

    it('should validate auto link with propertyId', () => {
      const valid: Link = {
        id: 'l2',
        fromContentId: 'c1',
        toContentId: 'c2',
        type: LinkType.AUTO,
        propertyId: 'p1',
        createdAt: Date.now(),
      };
      expect(isLink(valid)).toBe(true);
    });

    it('should reject invalid Link', () => {
      expect(isLink({ foo: 'bar' })).toBe(false);
      expect(isLink(null)).toBe(false);
    });
  });

  // ---- Area ----
  describe('isArea', () => {
    it('should validate correct Area', () => {
      const valid: Area = {
        id: 'a1',
        name: 'Test Area',
        contentIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(isArea(valid)).toBe(true);
    });

    it('should validate Area with optional fields', () => {
      const valid: Area = {
        id: 'a1',
        name: 'Test Area',
        description: 'A test area',
        contentIds: ['c1', 'c2'],
        backgroundColor: '#1a1a1a',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(isArea(valid)).toBe(true);
    });

    it('should reject invalid Area', () => {
      expect(isArea({ foo: 'bar' })).toBe(false);
      expect(isArea(null)).toBe(false);
    });
  });

  // ---- AppState ----
  describe('isAppState', () => {
    it('should validate correct AppState', () => {
      const valid: AppState = {
        areas: [],
        contents: [],
        links: [],
        graphFrames: [],
        graph: null,
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(isAppState(valid)).toBe(true);
    });

    it('should validate AppState with data', () => {
      const valid: AppState = {
        areas: [
          {
            id: 'a1',
            name: 'Test',
            contentIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        contents: [],
        links: [],
        graphFrames: [],
        graph: null,
        currentAreaId: 'a1',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(isAppState(valid)).toBe(true);
    });

    it('should reject invalid AppState', () => {
      expect(isAppState({ foo: 'bar' })).toBe(false);
      expect(isAppState(null)).toBe(false);
      expect(isAppState(undefined)).toBe(false);
      expect(isAppState(42)).toBe(false);
    });

    it('should reject AppState missing version', () => {
      expect(
        isAppState({
          areas: [],
          contents: [],
          links: [],
          graph: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      ).toBe(false);
    });
  });
});
