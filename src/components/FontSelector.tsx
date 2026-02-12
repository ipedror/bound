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
    gap: '12px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#aaa',
  },
  select: {
    backgroundColor: '#2a2a3e',
    color: '#f1f1f1',
    border: '1px solid #444',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  numberInput: {
    width: '50px',
    backgroundColor: '#2a2a3e',
    color: '#f1f1f1',
    border: '1px solid #444',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
  },
};
