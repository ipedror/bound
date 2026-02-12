// ============================================================
// AreaManager - CRUD operations for Area
// ============================================================

import type { AppState } from '../types/app';
import type { Area } from '../types/area';
import { generateId } from '../utils/id';

export class AreaManager {
  /**
   * Create a new Area.
   */
  static createArea(name: string, state: AppState): Area {
    if (!name || name.trim() === '') {
      throw new Error('Area name is required');
    }

    if (!this.isAreaNameUnique(name, state)) {
      throw new Error(`Area name "${name}" already exists`);
    }

    const now = Date.now();
    const area: Area = {
      id: generateId(),
      name: name.trim(),
      contentIds: [],
      createdAt: now,
      updatedAt: now,
    };

    return area;
  }

  /**
   * Update an Area's fields (immutable).
   */
  static updateArea(areaId: string, updates: Partial<Area>, state: AppState): Area {
    const area = this.getAreaById(areaId, state);
    if (!area) {
      throw new Error(`Area ${areaId} not found`);
    }

    // If changing name, validate uniqueness
    if (updates.name && updates.name !== area.name) {
      if (!this.isAreaNameUnique(updates.name, state, areaId)) {
        throw new Error(`Area name "${updates.name}" already exists`);
      }
    }

    return {
      ...area,
      ...updates,
      id: area.id, // Protect immutable fields
      createdAt: area.createdAt,
      updatedAt: Date.now(),
    };
  }

  /**
   * Delete an Area (validation only, returns success/failure).
   */
  static deleteArea(
    areaId: string,
    state: AppState,
  ): { success: boolean; reason?: string } {
    const area = this.getAreaById(areaId, state);
    if (!area) {
      return { success: false, reason: 'Area not found' };
    }
    return { success: true };
  }

  /**
   * Rename an Area.
   */
  static renameArea(areaId: string, newName: string, state: AppState): Area {
    return this.updateArea(areaId, { name: newName }, state);
  }

  /**
   * Add a Content ID to an Area.
   */
  static addContentToArea(areaId: string, contentId: string, state: AppState): Area {
    const area = this.getAreaById(areaId, state);
    if (!area) {
      throw new Error(`Area ${areaId} not found`);
    }

    const content = state.contents.find((c) => c.id === contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    if (area.contentIds.includes(contentId)) {
      throw new Error(`Content ${contentId} is already in Area ${areaId}`);
    }

    return {
      ...area,
      contentIds: [...area.contentIds, contentId],
      updatedAt: Date.now(),
    };
  }

  /**
   * Remove a Content ID from an Area.
   */
  static removeContentFromArea(areaId: string, contentId: string, state: AppState): Area {
    const area = this.getAreaById(areaId, state);
    if (!area) {
      throw new Error(`Area ${areaId} not found`);
    }

    if (!area.contentIds.includes(contentId)) {
      throw new Error(`Content ${contentId} is not in Area ${areaId}`);
    }

    return {
      ...area,
      contentIds: area.contentIds.filter((id) => id !== contentId),
      updatedAt: Date.now(),
    };
  }

  /**
   * Get an Area by ID.
   */
  static getAreaById(areaId: string, state: AppState): Area | undefined {
    return state.areas.find((a) => a.id === areaId);
  }

  /**
   * Get an Area by name.
   */
  static getAreaByName(name: string, state: AppState): Area | undefined {
    return state.areas.find((a) => a.name === name);
  }

  /**
   * Check if an Area name is unique.
   */
  static isAreaNameUnique(
    name: string,
    state: AppState,
    excludeId?: string,
  ): boolean {
    const trimmedName = name.trim().toLowerCase();
    return !state.areas.some(
      (a) => a.name.toLowerCase() === trimmedName && a.id !== excludeId,
    );
  }

  /**
   * Validate an Area and return any errors.
   */
  static validateArea(area: Area): string[] {
    const errors: string[] = [];

    if (!area.id || area.id.trim() === '') {
      errors.push('Area ID is required');
    }

    if (!area.name || area.name.trim() === '') {
      errors.push('Area name is required');
    }

    if (!Array.isArray(area.contentIds)) {
      errors.push('Area contentIds must be an array');
    }

    return errors;
  }

  /**
   * Get all Content IDs that would be deleted when deleting an Area (cascade).
   */
  static getContentIdsForCascadeDelete(areaId: string, state: AppState): string[] {
    return state.contents.filter((c) => c.areaId === areaId).map((c) => c.id);
  }
}
