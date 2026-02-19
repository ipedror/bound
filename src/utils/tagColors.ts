// ============================================================
// Tag Colors - Shared tag color utilities
// ============================================================

export interface TagColor {
  bg: string;
  text: string;
  border: string;
}

export const TAG_COLORS: TagColor[] = [
  { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' },
  { bg: 'rgba(167, 139, 250, 0.15)', text: '#a78bfa', border: 'rgba(167, 139, 250, 0.3)' },
  { bg: 'rgba(52, 211, 153, 0.15)', text: '#34d399', border: 'rgba(52, 211, 153, 0.3)' },
  { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
  { bg: 'rgba(244, 114, 182, 0.15)', text: '#f472b6', border: 'rgba(244, 114, 182, 0.3)' },
  { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171', border: 'rgba(248, 113, 113, 0.3)' },
  { bg: 'rgba(96, 165, 250, 0.15)', text: '#60a5fa', border: 'rgba(96, 165, 250, 0.3)' },
  { bg: 'rgba(45, 212, 191, 0.15)', text: '#2dd4bf', border: 'rgba(45, 212, 191, 0.3)' },
];

export function getTagColor(tag: string): TagColor {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}
