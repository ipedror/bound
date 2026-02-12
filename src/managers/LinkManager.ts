// ============================================================
// LinkManager - CRUD operations for Link
// ============================================================

import type { AppState } from '../types/app';
import type { Link } from '../types/link';
import { LinkType } from '../types/enums';
import { generateId } from '../utils/id';

export class LinkManager {
  /**
   * Create a new Link between two Contents.
   */
  static createLink(
    fromContentId: string,
    toContentId: string,
    type: LinkType,
    state: AppState,
    propertyId?: string,
  ): Link {
    // Validate from content exists
    const fromContent = state.contents.find((c) => c.id === fromContentId);
    if (!fromContent) {
      throw new Error(`From content ${fromContentId} not found`);
    }

    // Validate to content exists
    const toContent = state.contents.find((c) => c.id === toContentId);
    if (!toContent) {
      throw new Error(`To content ${toContentId} not found`);
    }

    // Cannot link to self
    if (fromContentId === toContentId) {
      throw new Error('Cannot create link to self');
    }

    // Check if link already exists
    const existingLink = state.links.find(
      (l) =>
        (l.fromContentId === fromContentId && l.toContentId === toContentId) ||
        (l.fromContentId === toContentId && l.toContentId === fromContentId),
    );
    if (existingLink) {
      throw new Error(
        `Link between ${fromContentId} and ${toContentId} already exists`,
      );
    }

    // Auto links require propertyId
    if (type === LinkType.AUTO && !propertyId) {
      throw new Error('Auto links require a propertyId');
    }

    const link: Link = {
      id: generateId(),
      fromContentId,
      toContentId,
      type,
      propertyId,
      createdAt: Date.now(),
    };

    return link;
  }

  /**
   * Delete a Link (validation only, returns success/failure).
   */
  static deleteLink(
    linkId: string,
    state: AppState,
  ): { success: boolean; reason?: string } {
    const link = state.links.find((l) => l.id === linkId);
    if (!link) {
      return { success: false, reason: 'Link not found' };
    }
    return { success: true };
  }

  /**
   * Get all Links for a Content (both directions).
   */
  static getLinksByContentId(contentId: string, state: AppState): Link[] {
    return state.links.filter(
      (l) => l.fromContentId === contentId || l.toContentId === contentId,
    );
  }

  /**
   * Get all Links created by a specific Property.
   */
  static getLinksByPropertyId(propertyId: string, state: AppState): Link[] {
    return state.links.filter((l) => l.propertyId === propertyId);
  }

  /**
   * Create bidirectional Links (for link properties).
   * Note: Now creates single link (graph is treated as undirected for display).
   */
  static createBidirectionalLinks(
    contentIdA: string,
    contentIdB: string,
    propertyId: string,
    state: AppState,
  ): Link[] {
    const link = this.createLink(
      contentIdA,
      contentIdB,
      LinkType.AUTO,
      state,
      propertyId,
    );
    return [link];
  }

  /**
   * Delete all Links associated with a Property.
   */
  static deleteLinksByPropertyId(propertyId: string, state: AppState): number {
    const links = this.getLinksByPropertyId(propertyId, state);
    return links.length;
  }

  /**
   * Get all Link IDs that would be deleted when deleting a Content.
   */
  static getLinkIdsForContentDelete(contentId: string, state: AppState): string[] {
    return this.getLinksByContentId(contentId, state).map((l) => l.id);
  }

  /**
   * Validate a Link and return any errors.
   */
  static validateLink(link: Link): string[] {
    const errors: string[] = [];

    if (!link.id || link.id.trim() === '') {
      errors.push('Link ID is required');
    }

    if (!link.fromContentId || link.fromContentId.trim() === '') {
      errors.push('Link fromContentId is required');
    }

    if (!link.toContentId || link.toContentId.trim() === '') {
      errors.push('Link toContentId is required');
    }

    if (link.fromContentId === link.toContentId) {
      errors.push('Link cannot connect a content to itself');
    }

    if (link.type !== LinkType.MANUAL && link.type !== LinkType.AUTO) {
      errors.push('Link type must be "manual" or "auto"');
    }

    if (link.type === LinkType.AUTO && !link.propertyId) {
      errors.push('Auto links must have a propertyId');
    }

    return errors;
  }

  /**
   * Detect if adding a link would create a cycle (for future use).
   */
  static wouldCreateCycle(
    fromContentId: string,
    toContentId: string,
    state: AppState,
  ): boolean {
    // Build adjacency list
    const adjacency = new Map<string, Set<string>>();

    for (const link of state.links) {
      if (!adjacency.has(link.fromContentId)) {
        adjacency.set(link.fromContentId, new Set());
      }
      adjacency.get(link.fromContentId)!.add(link.toContentId);
    }

    // Add the proposed link
    if (!adjacency.has(fromContentId)) {
      adjacency.set(fromContentId, new Set());
    }
    adjacency.get(fromContentId)!.add(toContentId);

    // DFS to detect cycle
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = adjacency.get(node) ?? new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    // Check from the source node
    return hasCycle(fromContentId);
  }
}
