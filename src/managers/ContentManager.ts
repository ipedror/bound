// ============================================================
// ContentManager - CRUD operations for Content
// ============================================================

import type { AppState } from '../types/app';
import type { Content } from '../types/content';
import type { Shape } from '../types/shape';
import type { Property } from '../types/property';
import { ContentStatus } from '../types/enums';
import { generateId } from '../utils/id';

export class ContentManager {
  /**
   * Create a new Content in the specified Area.
   */
  static createContent(areaId: string, title: string, state: AppState): Content {
    const area = state.areas.find((a) => a.id === areaId);
    if (!area) {
      throw new Error(`Area ${areaId} not found`);
    }

    const now = Date.now();
    const content: Content = {
      id: generateId(),
      areaId,
      title,
      status: ContentStatus.OPEN,
      body: { shapes: [] },
      properties: [],
      createdAt: now,
      updatedAt: now,
    };

    return content;
  }

  /**
   * Update a Content's fields (immutable).
   */
  static updateContent(
    contentId: string,
    updates: Partial<Content>,
    state: AppState,
  ): Content {
    const content = this.getContentById(contentId, state);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    return {
      ...content,
      ...updates,
      id: content.id, // Protect immutable fields
      areaId: content.areaId,
      createdAt: content.createdAt,
      updatedAt: Date.now(),
    };
  }

  /**
   * Delete a Content (validation only, returns success/failure).
   */
  static deleteContent(
    contentId: string,
    state: AppState,
  ): { success: boolean; reason?: string } {
    const content = this.getContentById(contentId, state);
    if (!content) {
      return { success: false, reason: 'Content not found' };
    }
    return { success: true };
  }

  /**
   * Open a closed Content for editing.
   */
  static openContent(contentId: string, state: AppState): Content {
    const content = this.getContentById(contentId, state);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    return {
      ...content,
      status: ContentStatus.OPEN,
      nodePosition: undefined, // Clear node position when reopening
      updatedAt: Date.now(),
    };
  }

  /**
   * Close a Content (makes it a graph node).
   */
  static closeContent(contentId: string, state: AppState): Content {
    const content = this.getContentById(contentId, state);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    if (content.status === ContentStatus.CLOSED) {
      throw new Error(`Content ${contentId} is already closed`);
    }

    return {
      ...content,
      status: ContentStatus.CLOSED,
      updatedAt: Date.now(),
    };
  }

  /**
   * Add a Shape to a Content's body.
   */
  static addShapeToContent(contentId: string, shape: Shape, state: AppState): Content {
    const content = this.getContentById(contentId, state);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const existingShape = content.body.shapes.find((s) => s.id === shape.id);
    if (existingShape) {
      throw new Error(`Shape ${shape.id} already exists in Content ${contentId}`);
    }

    return {
      ...content,
      body: {
        ...content.body,
        shapes: [...content.body.shapes, shape],
      },
      updatedAt: Date.now(),
    };
  }

  /**
   * Remove a Shape from a Content's body.
   */
  static removeShapeFromContent(
    contentId: string,
    shapeId: string,
    state: AppState,
  ): Content {
    const content = this.getContentById(contentId, state);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const shapeExists = content.body.shapes.some((s) => s.id === shapeId);
    if (!shapeExists) {
      throw new Error(`Shape ${shapeId} not found in Content ${contentId}`);
    }

    return {
      ...content,
      body: {
        ...content.body,
        shapes: content.body.shapes.filter((s) => s.id !== shapeId),
      },
      updatedAt: Date.now(),
    };
  }

  /**
   * Update a Shape within a Content.
   */
  static updateShapeInContent(
    contentId: string,
    shapeId: string,
    updates: Partial<Shape>,
    state: AppState,
  ): Content {
    const content = this.getContentById(contentId, state);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const shapeIndex = content.body.shapes.findIndex((s) => s.id === shapeId);
    if (shapeIndex === -1) {
      throw new Error(`Shape ${shapeId} not found in Content ${contentId}`);
    }

    const updatedShapes = content.body.shapes.map((s) =>
      s.id === shapeId ? { ...s, ...updates, id: s.id, createdAt: s.createdAt } : s,
    );

    return {
      ...content,
      body: {
        ...content.body,
        shapes: updatedShapes,
      },
      updatedAt: Date.now(),
    };
  }

  /**
   * Add a Property to a Content.
   */
  static addPropertyToContent(
    contentId: string,
    property: Property,
    state: AppState,
  ): Content {
    const content = this.getContentById(contentId, state);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const existingProperty = content.properties.find((p) => p.id === property.id);
    if (existingProperty) {
      throw new Error(`Property ${property.id} already exists in Content ${contentId}`);
    }

    return {
      ...content,
      properties: [...content.properties, property],
      updatedAt: Date.now(),
    };
  }

  /**
   * Remove a Property from a Content.
   */
  static removePropertyFromContent(
    contentId: string,
    propertyId: string,
    state: AppState,
  ): Content {
    const content = this.getContentById(contentId, state);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const propertyExists = content.properties.some((p) => p.id === propertyId);
    if (!propertyExists) {
      throw new Error(`Property ${propertyId} not found in Content ${contentId}`);
    }

    return {
      ...content,
      properties: content.properties.filter((p) => p.id !== propertyId),
      updatedAt: Date.now(),
    };
  }

  /**
   * Update a Property within a Content.
   */
  static updatePropertyInContent(
    contentId: string,
    propertyId: string,
    updates: Partial<Property>,
    state: AppState,
  ): Content {
    const content = this.getContentById(contentId, state);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const propertyIndex = content.properties.findIndex((p) => p.id === propertyId);
    if (propertyIndex === -1) {
      throw new Error(`Property ${propertyId} not found in Content ${contentId}`);
    }

    const updatedProperties = content.properties.map((p) =>
      p.id === propertyId ? { ...p, ...updates, id: p.id, createdAt: p.createdAt } : p,
    );

    return {
      ...content,
      properties: updatedProperties,
      updatedAt: Date.now(),
    };
  }

  /**
   * Get a Content by ID.
   */
  static getContentById(contentId: string, state: AppState): Content | undefined {
    return state.contents.find((c) => c.id === contentId);
  }

  /**
   * Get all Contents in an Area.
   */
  static getContentsByAreaId(areaId: string, state: AppState): Content[] {
    return state.contents.filter((c) => c.areaId === areaId);
  }

  /**
   * Get child contents of a given parent content.
   */
  static getChildContents(parentId: string, state: AppState): Content[] {
    return state.contents.filter((c) => c.parentId === parentId);
  }

  /**
   * Get the parent content of a given content, if any.
   */
  static getParentContent(contentId: string, state: AppState): Content | undefined {
    const content = this.getContentById(contentId, state);
    if (!content?.parentId) return undefined;
    return this.getContentById(content.parentId, state);
  }

  /**
   * Get all contents that have no parent (root-level contents).
   */
  static getRootContents(state: AppState, areaId?: string): Content[] {
    return state.contents.filter((c) => {
      const inArea = areaId ? c.areaId === areaId : true;
      return inArea && !c.parentId;
    });
  }

  /**
   * Get all contents that are parents (have at least one child).
   */
  static getParentContents(state: AppState, areaId?: string): Content[] {
    const parentIds = new Set(
      state.contents.filter((c) => c.parentId).map((c) => c.parentId!),
    );
    return state.contents.filter((c) => {
      const inArea = areaId ? c.areaId === areaId : true;
      return inArea && parentIds.has(c.id);
    });
  }

  /**
   * Validate a Content and return any errors.
   */
  static validateContent(content: Content): string[] {
    const errors: string[] = [];

    if (!content.id || content.id.trim() === '') {
      errors.push('Content ID is required');
    }

    if (!content.title || content.title.trim() === '') {
      errors.push('Content title is required');
    }

    if (!content.areaId || content.areaId.trim() === '') {
      errors.push('Content must belong to an Area');
    }

    if (content.status !== ContentStatus.OPEN && content.status !== ContentStatus.CLOSED) {
      errors.push('Content status must be "open" or "closed"');
    }

    // Check for duplicate shape IDs
    const shapeIds = content.body.shapes.map((s) => s.id);
    const duplicateShapeIds = shapeIds.filter(
      (id, index) => shapeIds.indexOf(id) !== index,
    );
    if (duplicateShapeIds.length > 0) {
      errors.push(`Duplicate shape IDs: ${duplicateShapeIds.join(', ')}`);
    }

    // Check for duplicate property IDs
    const propertyIds = content.properties.map((p) => p.id);
    const duplicatePropertyIds = propertyIds.filter(
      (id, index) => propertyIds.indexOf(id) !== index,
    );
    if (duplicatePropertyIds.length > 0) {
      errors.push(`Duplicate property IDs: ${duplicatePropertyIds.join(', ')}`);
    }

    return errors;
  }
}
