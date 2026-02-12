// ============================================================
// ColorPicker - Simple color picker component
// ============================================================

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { PREDEFINED_COLORS } from '../constants/canvas';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = React.memo(
  ({ color, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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
            backgroundColor: color,
          }}
          title={`Color: ${color}`}
          aria-label={`Select color, current: ${color}`}
        />
        {isOpen && (
          <div style={styles.dropdown}>
            <div style={styles.grid}>
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
                  value={color}
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
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    color: '#aaa',
  },
  swatch: {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    border: '2px solid #444',
    cursor: 'pointer',
    padding: 0,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    backgroundColor: '#2a2a3e',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '8px',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '4px',
    marginBottom: '8px',
  },
  colorOption: {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: 0,
  },
  customRow: {
    borderTop: '1px solid #444',
    paddingTop: '8px',
  },
  customLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#aaa',
  },
  customInput: {
    width: '32px',
    height: '24px',
    padding: 0,
    border: 'none',
    cursor: 'pointer',
  },
};
