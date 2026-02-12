// ============================================================
// Type Guards - Runtime validation for all domain types
// ============================================================

import type { Property } from '../types/property';
import type { Shape } from '../types/shape';
import type { Content } from '../types/content';
import type { Link } from '../types/link';
import type { Area } from '../types/area';
import type { AppState } from '../types/app';
import { PropertyType, LinkType, ShapeType, ContentStatus } from '../types/enums';

// Helper: check if value is one of enum values
function isEnumValue<T extends Record<string, string>>(enumObj: T, value: unknown): boolean {
  return Object.values(enumObj).includes(value as string);
}

export function isProperty(obj: unknown): obj is Property {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    isEnumValue(PropertyType, p.type) &&
    typeof p.createdAt === 'number'
  );
}

export function isShape(obj: unknown): obj is Shape {
  if (typeof obj !== 'object' || obj === null) return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    isEnumValue(ShapeType, s.type) &&
    typeof s.position === 'object' &&
    s.position !== null &&
    typeof (s.position as Record<string, unknown>).x === 'number' &&
    typeof (s.position as Record<string, unknown>).y === 'number' &&
    typeof s.dimension === 'object' &&
    s.dimension !== null &&
    typeof (s.dimension as Record<string, unknown>).width === 'number' &&
    typeof (s.dimension as Record<string, unknown>).height === 'number' &&
    typeof s.style === 'object' &&
    s.style !== null &&
    typeof s.createdAt === 'number'
  );
}

export function isContent(obj: unknown): obj is Content {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.areaId === 'string' &&
    typeof c.title === 'string' &&
    isEnumValue(ContentStatus, c.status) &&
    typeof c.body === 'object' &&
    c.body !== null &&
    Array.isArray((c.body as Record<string, unknown>).shapes) &&
    Array.isArray(c.properties) &&
    typeof c.createdAt === 'number' &&
    typeof c.updatedAt === 'number'
  );
}

export function isLink(obj: unknown): obj is Link {
  if (typeof obj !== 'object' || obj === null) return false;
  const l = obj as Record<string, unknown>;
  return (
    typeof l.id === 'string' &&
    typeof l.fromContentId === 'string' &&
    typeof l.toContentId === 'string' &&
    isEnumValue(LinkType, l.type) &&
    typeof l.createdAt === 'number'
  );
}

export function isArea(obj: unknown): obj is Area {
  if (typeof obj !== 'object' || obj === null) return false;
  const a = obj as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.name === 'string' &&
    Array.isArray(a.contentIds) &&
    typeof a.createdAt === 'number' &&
    typeof a.updatedAt === 'number'
  );
}

export function isAppState(obj: unknown): obj is AppState {
  if (typeof obj !== 'object' || obj === null) return false;
  const s = obj as Record<string, unknown>;
  return (
    Array.isArray(s.areas) &&
    Array.isArray(s.contents) &&
    Array.isArray(s.links) &&
    typeof s.version === 'number' &&
    typeof s.createdAt === 'number' &&
    typeof s.updatedAt === 'number'
  );
}
