// ============================================================
// PropertyManager - Operations for Property
// ============================================================

import type { Property } from '../types/property';
import { PropertyType } from '../types/enums';
import { generateId } from '../utils/id';

// Validators for each property type
const validators: Record<PropertyType, (value: unknown) => boolean> = {
  [PropertyType.TAG]: (v) =>
    typeof v === 'string' || (Array.isArray(v) && v.every((item) => typeof item === 'string')),
  [PropertyType.DATE]: (v) => typeof v === 'number' && v > 0,
  [PropertyType.SHORT_TEXT]: (v) => typeof v === 'string' && v.length <= 100,
  [PropertyType.LONG_TEXT]: (v) => typeof v === 'string',
  [PropertyType.NUMBER]: (v) => typeof v === 'number' && !isNaN(v),
  [PropertyType.LINK]: (v) => typeof v === 'string' && v.length > 0,
};

export class PropertyManager {
  /**
   * Create a new Property.
   */
  static createProperty(name: string, type: PropertyType, value: unknown): Property {
    if (!name || name.trim() === '') {
      throw new Error('Property name is required');
    }

    const validation = this.validatePropertyValue(type, value);
    if (!validation.valid) {
      throw new Error(`Invalid property value: ${validation.error}`);
    }

    const property: Property = {
      id: generateId(),
      name: name.trim(),
      type,
      value,
      createdAt: Date.now(),
    };

    return property;
  }

  /**
   * Validate if a value is compatible with a property type.
   */
  static validatePropertyValue(
    type: PropertyType,
    value: unknown,
  ): { valid: boolean; error?: string } {
    const validator = validators[type];
    if (!validator) {
      return { valid: false, error: `Unknown property type: ${type}` };
    }

    if (value === undefined || value === null) {
      return { valid: false, error: 'Value cannot be null or undefined' };
    }

    const isValid = validator(value);
    if (!isValid) {
      return { valid: false, error: `Value is not compatible with type "${type}"` };
    }

    return { valid: true };
  }

  /**
   * Coerce a value to the correct type.
   */
  static coercePropertyValue(type: PropertyType, value: unknown): unknown {
    if (value === undefined || value === null) {
      return undefined;
    }

    switch (type) {
      case PropertyType.TAG:
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) return value.map(String);
        return undefined;

      case PropertyType.DATE:
        if (typeof value === 'number') return value;
        if (value instanceof Date) return value.getTime();
        if (typeof value === 'string') {
          const timestamp = Date.parse(value);
          return isNaN(timestamp) ? undefined : timestamp;
        }
        return undefined;

      case PropertyType.SHORT_TEXT:
        if (typeof value === 'string') return value.slice(0, 100);
        return String(value).slice(0, 100);

      case PropertyType.LONG_TEXT:
        return typeof value === 'string' ? value : String(value);

      case PropertyType.NUMBER:
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const num = parseFloat(value);
          return isNaN(num) ? undefined : num;
        }
        return undefined;

      case PropertyType.LINK:
        return typeof value === 'string' ? value : undefined;

      default:
        return undefined;
    }
  }

  /**
   * Update a Property (immutable).
   */
  static updateProperty(property: Property, updates: Partial<Property>): Property {
    // If type or value is being updated, validate
    const newType = updates.type ?? property.type;
    const newValue = updates.value ?? property.value;

    if (updates.type !== undefined || updates.value !== undefined) {
      const validation = this.validatePropertyValue(newType, newValue);
      if (!validation.valid) {
        throw new Error(`Invalid property update: ${validation.error}`);
      }
    }

    return {
      ...property,
      ...updates,
      id: property.id, // Protect immutable fields
      createdAt: property.createdAt,
    };
  }

  /**
   * Format a property value for display.
   */
  static formatPropertyValue(type: PropertyType, value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }

    switch (type) {
      case PropertyType.TAG:
        if (Array.isArray(value)) return value.join(', ');
        return String(value);

      case PropertyType.DATE:
        if (typeof value === 'number') {
          const date = new Date(value);
          return date.toLocaleDateString();
        }
        return String(value);

      case PropertyType.SHORT_TEXT:
      case PropertyType.LONG_TEXT:
        return String(value);

      case PropertyType.NUMBER:
        return typeof value === 'number' ? value.toString() : String(value);

      case PropertyType.LINK:
        return `Link: ${value}`;

      default:
        return String(value);
    }
  }

  /**
   * Check if a property type creates automatic links.
   */
  static isLinkType(type: PropertyType): boolean {
    return type === PropertyType.LINK;
  }
}
