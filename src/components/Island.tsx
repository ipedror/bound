// ============================================================
// Island - Floating container component (Excalidraw-style)
// ============================================================

import React from 'react';

interface IslandProps {
  children: React.ReactNode;
  padding?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Island - A floating panel with rounded corners and shadow.
 * Core visual pattern from Excalidraw's UI.
 */
export const Island: React.FC<IslandProps> = ({
  children,
  padding = 8,
  className,
  style,
}) => {
  return (
    <div
      className={`island ${className || ''}`}
      style={{
        ...islandStyles.base,
        padding: `${padding}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const islandStyles: Record<string, React.CSSProperties> = {
  base: {
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '10px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.06)',
    pointerEvents: 'auto',
  },
};

export default Island;
