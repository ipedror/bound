// ============================================================
// Property - custom property attached to a Content
// ============================================================

import type { PropertyType } from './enums';

export interface Property {
  readonly id: string;
  readonly name: string;
  readonly type: PropertyType;
  readonly value: unknown;
  readonly createdAt: number;
}
