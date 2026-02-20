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
  readonly tags?: string[];
  readonly emoji?: string;
  readonly nodeColor?: string;
  readonly nodePosition?: Position;
  /** ID of the parent content (for parent-child hierarchy) */
  readonly parentId?: string;
  /** Whether this content inherits emoji/nodeColor from its parent */
  readonly inheritParentStyle?: boolean;
  /** Max width for the label text box (in pixels). Controls text wrapping and truncation. */
  readonly labelMaxWidth?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}
