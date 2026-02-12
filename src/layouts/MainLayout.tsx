// ============================================================
// MainLayout - Excalidraw-style minimal layout
// ============================================================

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { Island } from '../components/Island';
import AuthButton from '../components/AuthButton';
import { useCloudSync, type SyncStatus } from '../hooks/useCloudSync';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const { state, setState } = useAppStore(
    useShallow((s) => ({
      state: s.state,
      setState: s.setState,
    })),
  );

  // Cloud sync
  const { onSyncStatusChange, forceSync, isCloudEnabled } = useCloudSync();

  useEffect(() => {
    return onSyncStatusChange((status) => setSyncStatus(status));
  }, [onSyncStatusChange]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleExport = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bound-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importData);
      setState(parsed);
      setImportData('');
      setImportError(null);
      setShowImportModal(false);
      navigate('/');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Invalid JSON data');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportData(reader.result as string);
      setImportError(null);
    };
    reader.readAsText(file);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div style={styles.layout}>
      {/* Top-left: Hamburger menu */}
      <div style={styles.topLeft} ref={menuRef}>
        <Island padding={4} style={styles.menuIsland}>
          <button
            style={styles.menuButton}
            onClick={() => setMenuOpen(!menuOpen)}
            title="Menu"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span style={styles.appTitle}>Bound</span>
        </Island>

        {/* Dropdown menu */}
        {menuOpen && (
          <Island padding={4} style={styles.dropdown}>
            <div style={styles.dropdownSection}>
              <span style={styles.dropdownLabel}>Navigate</span>
              <Link
                to="/"
                style={{
                  ...styles.dropdownItem,
                  ...(isActive('/') && location.pathname === '/' ? styles.dropdownItemActive : {}),
                }}
                onClick={() => setMenuOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </Link>
              <Link
                to="/graph"
                style={{
                  ...styles.dropdownItem,
                  ...(isActive('/graph') ? styles.dropdownItemActive : {}),
                }}
                onClick={() => setMenuOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="18" cy="6" r="3" />
                  <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
                  <line x1="15.5" y1="7.5" x2="8.5" y2="7.5" />
                </svg>
                Graph
              </Link>
            </div>
            <div style={styles.dropdownDivider} />
            <div style={styles.dropdownSection}>
              <span style={styles.dropdownLabel}>Data</span>
              <button
                style={styles.dropdownItem}
                onClick={() => {
                  setMenuOpen(false);
                  setShowExportModal(true);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
              <button
                style={styles.dropdownItem}
                onClick={() => {
                  setMenuOpen(false);
                  setShowImportModal(true);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import
              </button>
            </div>
            <div style={styles.dropdownDivider} />
            <div style={styles.dropdownSection}>
              <span style={styles.dropdownLabel}>Account</span>
              <AuthButton
                onNavigateLogin={() => {
                  setMenuOpen(false);
                  navigate('/login');
                }}
              />
              {isCloudEnabled && (
                <div style={styles.syncRow}>
                  <span
                    style={{
                      ...styles.syncDot,
                      backgroundColor:
                        syncStatus === 'synced'
                          ? '#22c55e'
                          : syncStatus === 'syncing'
                            ? '#38bdf8'
                            : syncStatus === 'error'
                              ? '#ef4444'
                              : '#64748b',
                    }}
                  />
                  <span style={styles.syncText}>
                    {syncStatus === 'synced' && 'Cloud synced'}
                    {syncStatus === 'syncing' && 'Syncing...'}
                    {syncStatus === 'error' && 'Sync error'}
                    {syncStatus === 'idle' && 'Cloud idle'}
                    {syncStatus === 'offline' && 'Offline'}
                  </span>
                  <button style={styles.syncButton} onClick={forceSync} title="Force sync">
                    ↻
                  </button>
                </div>
              )}
            </div>
          </Island>
        )}
      </div>



      {/* Main content - full viewport */}
      <div style={styles.main}>
        <Outlet />
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <Island padding={24} style={styles.modal}>
            <div onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Export Data</h2>
              <p style={styles.modalText}>
                Export all your areas, contents, properties, and links to a JSON file.
              </p>
              <div style={styles.modalActions}>
                <button style={styles.cancelButton} onClick={() => setShowExportModal(false)}>
                  Cancel
                </button>
                <button style={styles.primaryButton} onClick={handleExport}>
                  Download JSON
                </button>
              </div>
            </div>
          </Island>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <Island padding={24} style={styles.modal}>
            <div onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Import Data</h2>
              <p style={styles.modalWarning}>
                Warning: This will replace all existing data!
              </p>
              <div style={styles.importOptions}>
                <label style={styles.fileLabel}>
                  Choose file...
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    style={styles.fileInput}
                  />
                </label>
                <span style={styles.orText}>or paste JSON:</span>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Paste JSON data here..."
                  style={styles.textarea}
                  rows={8}
                />
              </div>
              {importError && <p style={styles.error}>{importError}</p>}
              <div style={styles.modalActions}>
                <button style={styles.cancelButton} onClick={() => setShowImportModal(false)}>
                  Cancel
                </button>
                <button
                  style={styles.dangerButton}
                  onClick={handleImport}
                  disabled={!importData.trim()}
                >
                  Import & Replace
                </button>
              </div>
            </div>
          </Island>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    position: 'relative',
  },
  topLeft: {
    position: 'fixed',
    top: '12px',
    left: '12px',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  menuButton: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dropdown: {
    minWidth: '200px',
    marginTop: '4px',
  },
  dropdownSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '4px',
  },
  dropdownLabel: {
    fontSize: '10px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '4px 8px',
    fontWeight: 600,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    color: '#cbd5e1',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background-color 0.15s',
    width: '100%',
    textAlign: 'left',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    margin: '4px 8px',
  },
  menuIsland: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  appTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: '0.5px',
    padding: '0 6px 0 2px',
    whiteSpace: 'nowrap',
  },
  main: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '450px',
    maxWidth: '90vw',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#f1f1f1',
    margin: '0 0 12px 0',
  },
  modalText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 20px 0',
  },
  modalWarning: {
    fontSize: '14px',
    color: '#f59e0b',
    margin: '0 0 16px 0',
    padding: '12px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: '8px',
  },
  importOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  fileLabel: {
    display: 'inline-block',
    padding: '12px 20px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'center',
  },
  fileInput: {
    display: 'none',
  },
  orText: {
    fontSize: '13px',
    color: '#64748b',
    textAlign: 'center',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f1f1',
    fontSize: '13px',
    fontFamily: 'monospace',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    marginTop: '8px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dangerButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  syncRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
  },
  syncDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  syncText: {
    fontSize: '12px',
    color: '#94a3b8',
    flex: 1,
  },
  syncButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: '4px',
    lineHeight: 1,
  },
};
