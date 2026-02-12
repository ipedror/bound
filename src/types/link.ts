// ============================================================
// Link - connection between two content nodes
// ============================================================

import type { LinkType } from './enums';

export interface Link {
  readonly id: string;
  readonly fromContentId: string;
  readonly toContentId: string;
  readonly type: LinkType;
  readonly propertyId?: string;
  readonly createdAt: number;
}
