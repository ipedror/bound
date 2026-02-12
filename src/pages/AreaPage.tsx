// ============================================================
// AreaPage - Shows contents within a specific area
// ============================================================

import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';

export default function AreaPage() {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContentName, setNewContentName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get raw state - don't filter inside selector to avoid new reference on each render
  const { areas, allContents, links, createContent, deleteContent, updateArea } = useAppStore(
    useShallow((s) => ({
      areas: s.state.areas,
      allContents: s.state.contents,
      links: s.state.links,
      createContent: s.createContent,
      deleteContent: s.deleteContent,
      updateArea: s.updateArea,
    })),
  );

  // Derive filtered data with useMemo
  const area = useMemo(() => areas.find((a) => a.id === areaId), [areas, areaId]);
  const contents = useMemo(() => allContents.filter((c) => c.areaId === areaId), [allContents, areaId]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(area?.name || '');

  // Get link counts for each content
  const linkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    links.forEach((link) => {
      counts[link.fromContentId] = (counts[link.fromContentId] || 0) + 1;
      counts[link.toContentId] = (counts[link.toContentId] || 0) + 1;
    });
    return counts;
  }, [links]);

  const sortedContents = useMemo(() => {
    return [...contents].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [contents]);

  if (!area) {
    return (
      <div style={styles.container}>
        <div style={styles.notFound}>
          <h2 style={styles.notFoundTitle}>Area not found</h2>
          <Link to="/" style={styles.backLink}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const handleCreateContent = () => {
    if (!newContentName.trim()) {
      setError('Content name is required');
      return;
    }
    try {
      const contentId = createContent(areaId!, newContentName.trim());
      setNewContentName('');
      setShowCreateModal(false);
      setError(null);
      navigate(`/content/${contentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create content');
    }
  };

  const handleDeleteContent = (contentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this content and all its links?')) {
      deleteContent(contentId);
    }
  };

  const handleSaveName = () => {
    if (editName.trim() && editName !== area.name) {
      updateArea(area.id, { name: editName.trim() });
    }
    setIsEditingName(false);
  };

  return (
    <div style={styles.container}>
      <nav style={styles.breadcrumb}>
        <Link to="/" style={styles.breadcrumbLink}>
          Home
        </Link>
        <span style={styles.breadcrumbSeparator}>/</span>
        <span style={styles.breadcrumbCurrent}>{area.name}</span>
      </nav>

      <header style={styles.header}>
        {isEditingName ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            style={styles.titleInput}
            autoFocus
          />
        ) : (
          <h1
            style={styles.title}
            onClick={() => {
              setEditName(area.name);
              setIsEditingName(true);
            }}
            title="Click to edit"
          >
            {area.name}
          </h1>
        )}
        <button style={styles.createButton} onClick={() => setShowCreateModal(true)}>
          + New Content
        </button>
      </header>

      {area.description && <p style={styles.description}>{area.description}</p>}

      {sortedContents.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No contents yet. Create your first content!</p>
        </div>
      ) : (
        <div style={styles.list}>
          {sortedContents.map((content) => (
            <div
              key={content.id}
              style={styles.card}
              onClick={() => navigate(`/content/${content.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#38bdf8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#334155';
              }}
            >
              <div style={styles.cardContent}>
                <h3 style={styles.cardTitle}>{content.title}</h3>
                <p style={styles.cardDescription}>{content.emoji ? `${content.emoji} ` : ''}Content</p>
                <div style={styles.cardMeta}>
                  <span style={styles.linkCount}>{linkCounts[content.id] || 0} links</span>
                  <span style={styles.date}>
                    Updated {new Date(content.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                style={styles.deleteButton}
                onClick={(e) => handleDeleteContent(content.id, e)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Create New Content</h2>
            <input
              type="text"
              placeholder="Content name"
              value={newContentName}
              onChange={(e) => setNewContentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateContent()}
              style={styles.input}
              autoFocus
            />
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button style={styles.createButton} onClick={handleCreateContent}>
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
  breadcrumb: {
    marginBottom: '20px',
    fontSize: '14px',
  },
  breadcrumbLink: {
    color: '#38bdf8',
    textDecoration: 'none',
  },
  breadcrumbSeparator: {
    color: '#64748b',
    margin: '0 8px',
  },
  breadcrumbCurrent: {
    color: '#94a3b8',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#f1f1f1',
    margin: 0,
    cursor: 'pointer',
  },
  titleInput: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#f1f1f1',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid #38bdf8',
    outline: 'none',
    padding: '0',
  },
  description: {
    color: '#94a3b8',
    marginBottom: '24px',
    fontSize: '15px',
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
  list: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, transform 0.2s ease',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#f1f1f1',
    margin: '0 0 4px 0',
  },
  cardDescription: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '0 0 8px 0',
  },
  cardMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#64748b',
  },
  linkCount: {
    color: '#a78bfa',
  },
  date: {},
  deleteButton: {
    padding: '4px 12px',
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    alignSelf: 'flex-end',
    marginTop: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#94a3b8',
  },
  notFound: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  notFoundTitle: {
    fontSize: '24px',
    color: '#f1f1f1',
    marginBottom: '16px',
  },
  backLink: {
    color: '#38bdf8',
    textDecoration: 'none',
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
