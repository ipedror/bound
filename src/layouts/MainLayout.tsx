// ============================================================
// MainLayout - Layout wrapper with Navbar
// ============================================================

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const { state, setState } = useAppStore(
    useShallow((s) => ({
      state: s.state,
      setState: s.setState,
    })),
  );

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
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <Link to="/" style={styles.logo}>
            Bound
          </Link>
          <div style={styles.navLinks}>
            <Link
              to="/"
              style={{
                ...styles.navLink,
                ...(isActive('/') && location.pathname === '/' ? styles.navLinkActive : {}),
              }}
            >
              Home
            </Link>
            <Link
              to="/graph"
              style={{
                ...styles.navLink,
                ...(isActive('/graph') ? styles.navLinkActive : {}),
              }}
            >
              Graph
            </Link>
          </div>
        </div>

        <div style={styles.navRight}>
          <button
            style={styles.navButton}
            onClick={() => setShowExportModal(true)}
            title="Export data"
          >
            Export
          </button>
          <button
            style={styles.navButton}
            onClick={() => setShowImportModal(true)}
            title="Import data"
          >
            Import
          </button>
        </div>
      </nav>

      <main style={styles.main}>
        <Outlet />
      </main>

      {/* Export Modal */}
      {showExportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    height: '60px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#38bdf8',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
  },
  navLink: {
    padding: '8px 16px',
    color: '#94a3b8',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  navLinkActive: {
    backgroundColor: '#334155',
    color: '#f1f1f1',
  },
  navRight: {
    display: 'flex',
    gap: '8px',
  },
  navButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  main: {
    minHeight: 'calc(100vh - 60px)',
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
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
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
};
