// ============================================================
// Link - connection between two content nodes
// ============================================================

import type { LinkType, EdgeLineStyle, EdgeArrowMode } from './enums';

export interface Link {
  readonly id: string;
  readonly fromContentId: string;
  readonly toContentId: string;
  readonly type: LinkType;
  readonly propertyId?: string;
  readonly color?: string;
  readonly lineStyle?: EdgeLineStyle;
  readonly arrowMode?: EdgeArrowMode;
  readonly createdAt: number;
}
