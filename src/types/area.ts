// ============================================================
// Area - grouping of contents
// ============================================================

export interface Area {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly contentIds: string[];
  readonly backgroundColor?: string;
  readonly nodePosition?: { readonly x: number; readonly y: number };
  readonly emoji?: string;
  readonly nodeColor?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}
