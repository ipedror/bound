// ============================================================
// Enums - PropertyType, LinkType, ShapeType, ContentStatus
// Using const objects + type unions (erasableSyntaxOnly)
// ============================================================

export const PropertyType = {
  TAG: 'tag',
  DATE: 'date',
  SHORT_TEXT: 'shortText',
  LONG_TEXT: 'longText',
  NUMBER: 'number',
  LINK: 'link',
} as const;
export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const LinkType = {
  MANUAL: 'manual',
  AUTO: 'auto',
  PARENT: 'parent',
} as const;
export type LinkType = (typeof LinkType)[keyof typeof LinkType];

export const EdgeLineStyle = {
  SOLID: 'solid',
  DASHED: 'dashed',
} as const;
export type EdgeLineStyle = (typeof EdgeLineStyle)[keyof typeof EdgeLineStyle];

export const EdgeArrowMode = {
  FORWARD: 'forward',
  BOTH: 'both',
} as const;
export type EdgeArrowMode = (typeof EdgeArrowMode)[keyof typeof EdgeArrowMode];

export const ShapeType = {
  RECT: 'rect',
  ELLIPSE: 'ellipse',
  LINE: 'line',
  ARROW: 'arrow',
  TEXT: 'text',
  IMAGE: 'image',
} as const;
export type ShapeType = (typeof ShapeType)[keyof typeof ShapeType];

export const ContentStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
} as const;
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];
