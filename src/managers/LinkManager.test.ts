// ============================================================
// LinkManager Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { LinkManager } from './LinkManager';
import { AreaManager } from './AreaManager';
import { ContentManager } from './ContentManager';
import { getDefaultState } from '../constants/schema';
import { LinkType } from '../types/enums';
import type { AppState } from '../types/app';
import { generateId } from '../utils/id';

describe('LinkManager', () => {
  let state: AppState;
  let areaId: string;
  let contentId1: string;
  let contentId2: string;

  beforeEach(() => {
    state = getDefaultState();

    // Create area
    const area = AreaManager.createArea('Test Area', state);
    areaId = area.id;
    state = { ...state, areas: [...state.areas, area] };

    // Create two contents
    const content1 = ContentManager.createContent(areaId, 'Content 1', state);
    contentId1 = content1.id;
    state = { ...state, contents: [...state.contents, content1] };

    const content2 = ContentManager.createContent(areaId, 'Content 2', state);
    contentId2 = content2.id;
    state = { ...state, contents: [...state.contents, content2] };
  });

  describe('createLink', () => {
    it('should create a manual link', () => {
      const link = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      expect(link.id).toBeDefined();
      expect(link.fromContentId).toBe(contentId1);
      expect(link.toContentId).toBe(contentId2);
      expect(link.type).toBe(LinkType.MANUAL);
    });

    it('should create an auto link with propertyId', () => {
      const propertyId = generateId();
      const link = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.AUTO,
        state,
        propertyId,
      );
      expect(link.type).toBe(LinkType.AUTO);
      expect(link.propertyId).toBe(propertyId);
    });

    it('should throw if from content not found', () => {
      expect(() => {
        LinkManager.createLink('invalid', contentId2, LinkType.MANUAL, state);
      }).toThrow('From content invalid not found');
    });

    it('should throw if to content not found', () => {
      expect(() => {
        LinkManager.createLink(contentId1, 'invalid', LinkType.MANUAL, state);
      }).toThrow('To content invalid not found');
    });

    it('should throw if linking to self', () => {
      expect(() => {
        LinkManager.createLink(contentId1, contentId1, LinkType.MANUAL, state);
      }).toThrow('Cannot create link to self');
    });

    it('should throw if link already exists', () => {
      const link = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link] };

      expect(() => {
        LinkManager.createLink(contentId1, contentId2, LinkType.MANUAL, state);
      }).toThrow('already exists');
    });

    it('should throw if auto link without propertyId', () => {
      expect(() => {
        LinkManager.createLink(contentId1, contentId2, LinkType.AUTO, state);
      }).toThrow('Auto links require a propertyId');
    });
  });

  describe('deleteLink', () => {
    it('should return success for existing link', () => {
      const link = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link] };

      const result = LinkManager.deleteLink(link.id, state);
      expect(result.success).toBe(true);
    });

    it('should return failure for non-existing link', () => {
      const result = LinkManager.deleteLink('invalid', state);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Link not found');
    });
  });

  describe('getLinksByContentId', () => {
    it('should return links for content', () => {
      const link1 = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link1] };

      // Create third content and link
      const content3 = ContentManager.createContent(areaId, 'Content 3', state);
      state = { ...state, contents: [...state.contents, content3] };

      const link2 = LinkManager.createLink(
        content3.id,
        contentId1,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link2] };

      const links = LinkManager.getLinksByContentId(contentId1, state);
      expect(links).toHaveLength(2);
    });

    it('should return empty array if no links', () => {
      const links = LinkManager.getLinksByContentId(contentId1, state);
      expect(links).toHaveLength(0);
    });
  });

  describe('getLinksByPropertyId', () => {
    it('should return links for property', () => {
      const propertyId = generateId();
      const link = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.AUTO,
        state,
        propertyId,
      );
      state = { ...state, links: [...state.links, link] };

      const links = LinkManager.getLinksByPropertyId(propertyId, state);
      expect(links).toHaveLength(1);
      expect(links[0].propertyId).toBe(propertyId);
    });
  });

  describe('createBidirectionalLinks', () => {
    it('should create bidirectional link', () => {
      const propertyId = generateId();
      const links = LinkManager.createBidirectionalLinks(
        contentId1,
        contentId2,
        propertyId,
        state,
      );
      expect(links).toHaveLength(1);
      expect(links[0].type).toBe(LinkType.AUTO);
      expect(links[0].propertyId).toBe(propertyId);
    });
  });

  describe('deleteLinksByPropertyId', () => {
    it('should return count of links to delete', () => {
      const propertyId = generateId();
      const link = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.AUTO,
        state,
        propertyId,
      );
      state = { ...state, links: [...state.links, link] };

      const count = LinkManager.deleteLinksByPropertyId(propertyId, state);
      expect(count).toBe(1);
    });
  });

  describe('getLinkIdsForContentDelete', () => {
    it('should return link IDs for content', () => {
      const link = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link] };

      const linkIds = LinkManager.getLinkIdsForContentDelete(contentId1, state);
      expect(linkIds).toHaveLength(1);
      expect(linkIds).toContain(link.id);
    });
  });

  describe('validateLink', () => {
    it('should return no errors for valid link', () => {
      const link = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      const errors = LinkManager.validateLink(link);
      expect(errors).toHaveLength(0);
    });

    it('should return error for self-link', () => {
      const link = {
        id: generateId(),
        fromContentId: contentId1,
        toContentId: contentId1,
        type: LinkType.MANUAL,
        createdAt: Date.now(),
      };
      const errors = LinkManager.validateLink(link);
      expect(errors).toContain('Link cannot connect a content to itself');
    });

    it('should return error for auto link without propertyId', () => {
      const link = {
        id: generateId(),
        fromContentId: contentId1,
        toContentId: contentId2,
        type: LinkType.AUTO,
        createdAt: Date.now(),
      };
      const errors = LinkManager.validateLink(link);
      expect(errors).toContain('Auto links must have a propertyId');
    });
  });

  describe('wouldCreateCycle', () => {
    it('should detect simple cycle', () => {
      // A -> B
      const link1 = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link1] };

      // Check if B -> A would create cycle
      const wouldCycle = LinkManager.wouldCreateCycle(
        contentId2,
        contentId1,
        state,
      );
      expect(wouldCycle).toBe(true);
    });

    it('should return false when no cycle', () => {
      const content3 = ContentManager.createContent(areaId, 'Content 3', state);
      state = { ...state, contents: [...state.contents, content3] };

      // A -> B
      const link1 = LinkManager.createLink(
        contentId1,
        contentId2,
        LinkType.MANUAL,
        state,
      );
      state = { ...state, links: [...state.links, link1] };

      // Check if A -> C would create cycle (it won't)
      const wouldCycle = LinkManager.wouldCreateCycle(
        contentId1,
        content3.id,
        state,
      );
      expect(wouldCycle).toBe(false);
    });
  });
});
