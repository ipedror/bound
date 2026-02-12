// ============================================================
// HomePage - Main landing page showing all areas
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/shallow';
import WelcomeBanner from '../components/WelcomeBanner';

export default function HomePage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const authUser = useAuthStore((s) => s.user);

  const { areas, contents, createArea, deleteArea } = useAppStore(
    useShallow((s) => ({
      areas: s.state.areas,
      contents: s.state.contents,
      createArea: s.createArea,
      deleteArea: s.deleteArea,
    })),
  );

  const contentsCount = useMemo(() => 
    contents.reduce(
      (acc, c) => {
        acc[c.areaId] = (acc[c.areaId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  [contents]);

  const handleCreateArea = () => {
    if (!newAreaName.trim()) {
      setError('Area name is required');
      return;
    }
    try {
      const areaId = createArea(newAreaName.trim());
      setNewAreaName('');
      setShowCreateModal(false);
      setError(null);
      navigate(`/area/${areaId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create area');
    }
  };

  const handleDeleteArea = (areaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this area and all its contents?')) {
      deleteArea(areaId);
    }
  };

  return (
    <div style={styles.container}>
      <WelcomeBanner uid={authUser?.uid} />
      <header style={styles.header}>
        <h1 style={styles.title}>Your Areas</h1>
        <button style={styles.createButton} onClick={() => setShowCreateModal(true)}>
          + New Area
        </button>
      </header>

      {areas.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No areas yet. Create your first area to get started!</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {areas.map((area) => (
            <div
              key={area.id}
              style={styles.card}
              onClick={() => navigate(`/area/${area.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h3 style={styles.cardTitle}>{area.name}</h3>
              <p style={styles.cardDescription}>{area.description || 'No description'}</p>
              <div style={styles.cardFooter}>
                <span style={styles.contentCount}>
                  {contentsCount[area.id] || 0} contents
                </span>
                <button
                  style={styles.deleteButton}
                  onClick={(e) => handleDeleteArea(area.id, e)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Create New Area</h2>
            <input
              type="text"
              placeholder="Area name"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateArea()}
              style={styles.input}
              autoFocus
            />
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button style={styles.createButton} onClick={handleCreateArea}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '64px 24px 24px 64px',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#f1f1f1',
    margin: 0,
  },
  createButton: {
    padding: '10px 20px',
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f1f1f1',
    margin: '0 0 8px 0',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 16px 0',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentCount: {
    fontSize: '13px',
    color: '#64748b',
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#94a3b8',
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
    width: '400px',
    maxWidth: '90vw',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#f1f1f1',
    margin: '0 0 20px 0',
  },
  input: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f1f1',
    fontSize: '14px',
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
};
