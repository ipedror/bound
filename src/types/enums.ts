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
} as const;
export type LinkType = (typeof LinkType)[keyof typeof LinkType];

export const ShapeType = {
  RECT: 'rect',
  ELLIPSE: 'ellipse',
  LINE: 'line',
  ARROW: 'arrow',
  TEXT: 'text',
} as const;
export type ShapeType = (typeof ShapeType)[keyof typeof ShapeType];

export const ContentStatus = {
  OPEN: 'open',
  CLOSED: 'closed',
} as const;
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];
