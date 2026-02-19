// ============================================================
// ColorPicker - Simple color picker component
// ============================================================

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { PREDEFINED_COLORS } from '../constants/canvas';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  allowTransparent?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = React.memo(
  ({ color, onChange, label, allowTransparent }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const isTransparent = color === 'transparent';

    const handleColorClick = useCallback(
      (newColor: string) => {
        onChange(newColor);
        setIsOpen(false);
      },
      [onChange],
    );

    const handleCustomChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
      },
      [onChange],
    );

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    return (
      <div className="color-picker" ref={containerRef} style={styles.container}>
        {label && <span style={styles.label}>{label}</span>}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            ...styles.swatch,
            ...(isTransparent
              ? { background: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 10px 10px' }
              : { backgroundColor: color }),
          }}
          title={isTransparent ? 'Transparent' : `Color: ${color}`}
          aria-label={`Select color, current: ${isTransparent ? 'transparent' : color}`}
        />
        {isOpen && (
          <div style={styles.dropdown}>
            <div style={styles.grid}>
              {allowTransparent && (
                <button
                  type="button"
                  onClick={() => handleColorClick('transparent')}
                  style={{
                    ...styles.colorOption,
                    background: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 10px 10px',
                    border: color === 'transparent' ? '2px solid #00d4ff' : '2px solid transparent',
                  }}
                  title="No fill (transparent)"
                  aria-label="Select transparent"
                />
              )}
              {PREDEFINED_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleColorClick(c)}
                  style={{
                    ...styles.colorOption,
                    backgroundColor: c,
                    border: c === color ? '2px solid #00d4ff' : '2px solid transparent',
                  }}
                  title={c}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
            <div style={styles.customRow}>
              <label style={styles.customLabel}>
                Custom:
                <input
                  type="color"
                  value={isTransparent ? '#000000' : color}
                  onChange={handleCustomChange}
                  style={styles.customInput}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    );
  },
);

ColorPicker.displayName = 'ColorPicker';

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  label: {
    fontSize: '10px',
    color: '#64748b',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  swatch: {
    width: '26px',
    height: '26px',
    borderRadius: '6px',
    border: '2px solid #334155',
    cursor: 'pointer',
    padding: 0,
    transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '6px',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '10px',
    zIndex: 1000,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '5px',
    marginBottom: '10px',
  },
  colorOption: {
    width: '26px',
    height: '26px',
    borderRadius: '6px',
    cursor: 'pointer',
    padding: 0,
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  },
  customRow: {
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: '8px',
  },
  customLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '10px',
    color: '#64748b',
    fontWeight: 500,
  },
  customInput: {
    width: '32px',
    height: '24px',
    padding: 0,
    border: 'none',
    cursor: 'pointer',
    borderRadius: '4px',
  },
};
