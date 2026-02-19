// ============================================================
// FontSelector - Font family and size selector
// ============================================================

import React, { useCallback } from 'react';
import { WEB_SAFE_FONTS } from '../constants/canvas';

interface FontSelectorProps {
  fontFamily: string;
  fontSize: number;
  onFontFamilyChange: (family: string) => void;
  onFontSizeChange: (size: number) => void;
}

export const FontSelector: React.FC<FontSelectorProps> = React.memo(
  ({ fontFamily, fontSize, onFontFamilyChange, onFontSizeChange }) => {
    const handleFamilyChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFontFamilyChange(e.target.value);
      },
      [onFontFamilyChange],
    );

    const handleSizeChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onFontSizeChange(Number(e.target.value));
      },
      [onFontSizeChange],
    );

    return (
      <div className="font-selector" style={styles.container}>
        <label style={styles.label}>
          Font:
          <select
            value={fontFamily}
            onChange={handleFamilyChange}
            style={styles.select}
          >
            {WEB_SAFE_FONTS.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.label}>
          Size:
          <input
            type="number"
            min={8}
            max={72}
            value={fontSize}
            onChange={handleSizeChange}
            style={styles.numberInput}
          />
        </label>
      </div>
    );
  },
);

FontSelector.displayName = 'FontSelector';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
    color: '#64748b',
    fontWeight: 500,
  },
  select: {
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none',
  },
  numberInput: {
    width: '48px',
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    outline: 'none',
  },
};
