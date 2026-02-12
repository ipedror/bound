// ============================================================
// Area - grouping of contents
// ============================================================

export interface Area {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly contentIds: string[];
  readonly backgroundColor?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}
