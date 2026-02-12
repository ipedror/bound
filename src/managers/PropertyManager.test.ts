// ============================================================
// PropertyManager Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { PropertyManager } from './PropertyManager';
import { PropertyType } from '../types/enums';

describe('PropertyManager', () => {
  describe('createProperty', () => {
    it('should create a tag property', () => {
      const property = PropertyManager.createProperty('Tag', PropertyType.TAG, 'test');
      expect(property.id).toBeDefined();
      expect(property.name).toBe('Tag');
      expect(property.type).toBe(PropertyType.TAG);
      expect(property.value).toBe('test');
    });

    it('should create a number property', () => {
      const property = PropertyManager.createProperty('Count', PropertyType.NUMBER, 42);
      expect(property.value).toBe(42);
    });

    it('should create a date property', () => {
      const timestamp = Date.now();
      const property = PropertyManager.createProperty('Date', PropertyType.DATE, timestamp);
      expect(property.value).toBe(timestamp);
    });

    it('should throw if name is empty', () => {
      expect(() => {
        PropertyManager.createProperty('', PropertyType.TAG, 'test');
      }).toThrow('Property name is required');
    });

    it('should throw if value is invalid', () => {
      expect(() => {
        PropertyManager.createProperty('Number', PropertyType.NUMBER, 'not a number');
      }).toThrow('Invalid property value');
    });
  });

  describe('validatePropertyValue', () => {
    it('should validate tag with string', () => {
      const result = PropertyManager.validatePropertyValue(PropertyType.TAG, 'test');
      expect(result.valid).toBe(true);
    });

    it('should validate tag with array of strings', () => {
      const result = PropertyManager.validatePropertyValue(PropertyType.TAG, ['a', 'b']);
      expect(result.valid).toBe(true);
    });

    it('should validate date with timestamp', () => {
      const result = PropertyManager.validatePropertyValue(PropertyType.DATE, Date.now());
      expect(result.valid).toBe(true);
    });

    it('should reject invalid date', () => {
      const result = PropertyManager.validatePropertyValue(PropertyType.DATE, -1);
      expect(result.valid).toBe(false);
    });

    it('should validate short text within limit', () => {
      const result = PropertyManager.validatePropertyValue(
        PropertyType.SHORT_TEXT,
        'short',
      );
      expect(result.valid).toBe(true);
    });

    it('should reject short text exceeding limit', () => {
      const longText = 'a'.repeat(101);
      const result = PropertyManager.validatePropertyValue(
        PropertyType.SHORT_TEXT,
        longText,
      );
      expect(result.valid).toBe(false);
    });

    it('should validate long text', () => {
      const longText = 'a'.repeat(1000);
      const result = PropertyManager.validatePropertyValue(
        PropertyType.LONG_TEXT,
        longText,
      );
      expect(result.valid).toBe(true);
    });

    it('should validate number', () => {
      const result = PropertyManager.validatePropertyValue(PropertyType.NUMBER, 42);
      expect(result.valid).toBe(true);
    });

    it('should reject NaN', () => {
      const result = PropertyManager.validatePropertyValue(PropertyType.NUMBER, NaN);
      expect(result.valid).toBe(false);
    });

    it('should validate link', () => {
      const result = PropertyManager.validatePropertyValue(
        PropertyType.LINK,
        'content-id',
      );
      expect(result.valid).toBe(true);
    });

    it('should reject empty link', () => {
      const result = PropertyManager.validatePropertyValue(PropertyType.LINK, '');
      expect(result.valid).toBe(false);
    });

    it('should reject null values', () => {
      const result = PropertyManager.validatePropertyValue(PropertyType.TAG, null);
      expect(result.valid).toBe(false);
    });

    it('should reject undefined values', () => {
      const result = PropertyManager.validatePropertyValue(PropertyType.TAG, undefined);
      expect(result.valid).toBe(false);
    });
  });

  describe('coercePropertyValue', () => {
    it('should coerce string to tag', () => {
      const result = PropertyManager.coercePropertyValue(PropertyType.TAG, 'test');
      expect(result).toBe('test');
    });

    it('should coerce array to tag', () => {
      const result = PropertyManager.coercePropertyValue(PropertyType.TAG, [1, 2]);
      expect(result).toEqual(['1', '2']);
    });

    it('should coerce Date to timestamp', () => {
      const date = new Date('2026-01-01');
      const result = PropertyManager.coercePropertyValue(PropertyType.DATE, date);
      expect(result).toBe(date.getTime());
    });

    it('should coerce string date to timestamp', () => {
      const result = PropertyManager.coercePropertyValue(
        PropertyType.DATE,
        '2026-01-01',
      );
      expect(typeof result).toBe('number');
    });

    it('should return undefined for invalid date string', () => {
      const result = PropertyManager.coercePropertyValue(
        PropertyType.DATE,
        'not a date',
      );
      expect(result).toBeUndefined();
    });

    it('should truncate short text', () => {
      const longText = 'a'.repeat(150);
      const result = PropertyManager.coercePropertyValue(
        PropertyType.SHORT_TEXT,
        longText,
      );
      expect(typeof result).toBe('string');
      expect((result as string).length).toBe(100);
    });

    it('should coerce string to number', () => {
      const result = PropertyManager.coercePropertyValue(PropertyType.NUMBER, '42.5');
      expect(result).toBe(42.5);
    });

    it('should return undefined for invalid number string', () => {
      const result = PropertyManager.coercePropertyValue(
        PropertyType.NUMBER,
        'not a number',
      );
      expect(result).toBeUndefined();
    });

    it('should return undefined for null', () => {
      const result = PropertyManager.coercePropertyValue(PropertyType.TAG, null);
      expect(result).toBeUndefined();
    });
  });

  describe('updateProperty', () => {
    it('should update property value', () => {
      const property = PropertyManager.createProperty('Tag', PropertyType.TAG, 'old');
      const updated = PropertyManager.updateProperty(property, { value: 'new' });
      expect(updated.value).toBe('new');
    });

    it('should update property name', () => {
      const property = PropertyManager.createProperty('Old Name', PropertyType.TAG, 'test');
      const updated = PropertyManager.updateProperty(property, { name: 'New Name' });
      expect(updated.name).toBe('New Name');
    });

    it('should not change ID', () => {
      const property = PropertyManager.createProperty('Tag', PropertyType.TAG, 'test');
      const updated = PropertyManager.updateProperty(property, {
        id: 'new-id',
      } as Partial<typeof property>);
      expect(updated.id).toBe(property.id);
    });

    it('should not change createdAt', () => {
      const property = PropertyManager.createProperty('Tag', PropertyType.TAG, 'test');
      const updated = PropertyManager.updateProperty(property, {
        createdAt: 0,
      } as Partial<typeof property>);
      expect(updated.createdAt).toBe(property.createdAt);
    });

    it('should validate new value against type', () => {
      const property = PropertyManager.createProperty('Number', PropertyType.NUMBER, 42);
      expect(() => {
        PropertyManager.updateProperty(property, { value: 'not a number' });
      }).toThrow('Invalid property update');
    });
  });

  describe('formatPropertyValue', () => {
    it('should format tag string', () => {
      const result = PropertyManager.formatPropertyValue(PropertyType.TAG, 'test');
      expect(result).toBe('test');
    });

    it('should format tag array', () => {
      const result = PropertyManager.formatPropertyValue(PropertyType.TAG, ['a', 'b']);
      expect(result).toBe('a, b');
    });

    it('should format date', () => {
      const timestamp = new Date('2026-01-15').getTime();
      const result = PropertyManager.formatPropertyValue(PropertyType.DATE, timestamp);
      expect(result).toContain('2026');
    });

    it('should format number', () => {
      const result = PropertyManager.formatPropertyValue(PropertyType.NUMBER, 42);
      expect(result).toBe('42');
    });

    it('should format link', () => {
      const result = PropertyManager.formatPropertyValue(PropertyType.LINK, 'content-id');
      expect(result).toBe('Link: content-id');
    });

    it('should return empty string for null', () => {
      const result = PropertyManager.formatPropertyValue(PropertyType.TAG, null);
      expect(result).toBe('');
    });
  });

  describe('isLinkType', () => {
    it('should return true for link type', () => {
      expect(PropertyManager.isLinkType(PropertyType.LINK)).toBe(true);
    });

    it('should return false for other types', () => {
      expect(PropertyManager.isLinkType(PropertyType.TAG)).toBe(false);
      expect(PropertyManager.isLinkType(PropertyType.DATE)).toBe(false);
      expect(PropertyManager.isLinkType(PropertyType.NUMBER)).toBe(false);
    });
  });
});
