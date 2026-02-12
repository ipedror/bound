// ============================================================
// Content - main entity (open for editing / closed = graph node)
// ============================================================

import type { ContentStatus } from './enums';
import type { Position } from './base';
import type { Property } from './property';
import type { Shape } from './shape';

export interface Content {
  readonly id: string;
  readonly areaId: string;
  readonly title: string;
  readonly status: ContentStatus;
  readonly body: {
    readonly shapes: Shape[];
  };
  readonly properties: Property[];
  readonly emoji?: string;
  readonly nodeColor?: string;
  readonly nodePosition?: Position;
  readonly createdAt: number;
  readonly updatedAt: number;
}
