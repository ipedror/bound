// ============================================================
// ContentPage - Content editor with canvas and properties
// ============================================================

import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { CanvasEditor } from '../components/CanvasEditor';
import { PropertyType, LinkType } from '../types/enums';
import { generateId } from '../utils/id';
import type { Property } from '../types/property';

export default function ContentPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyType, setNewPropertyType] = useState<PropertyType>(PropertyType.SHORT_TEXT);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  // Get raw state - don't filter/find inside selector to avoid new reference on each render
  const {
    areas,
    allContents,
    allLinks,
    updateContent,
    addPropertyToContent,
    removePropertyFromContent,
    updatePropertyInContent,
    createLink,
    deleteLink,
  } = useAppStore(
    useShallow((s) => ({
      areas: s.state.areas,
      allContents: s.state.contents,
      allLinks: s.state.links,
      updateContent: s.updateContent,
      addPropertyToContent: s.addPropertyToContent,
      removePropertyFromContent: s.removePropertyFromContent,
      updatePropertyInContent: s.updatePropertyInContent,
      createLink: s.createLink,
      deleteLink: s.deleteLink,
    })),
  );

  // Derive filtered data with useMemo
  const content = useMemo(() => allContents.find((c) => c.id === contentId), [allContents, contentId]);
  const area = useMemo(
    () => areas.find((a) => content && content.areaId === a.id),
    [areas, content],
  );
  const links = useMemo(
    () => allLinks.filter((l) => l.fromContentId === contentId || l.toContentId === contentId),
    [allLinks, contentId],
  );

  // Get properties from content
  const properties = content?.properties ?? [];

  const linkedContentIds = useMemo(() => {
    const ids = new Set<string>();
    links.forEach((link) => {
      if (link.fromContentId === contentId) {
        ids.add(link.toContentId);
      } else {
        ids.add(link.fromContentId);
      }
    });
    return ids;
  }, [links, contentId]);

  const availableContents = useMemo(() => {
    return allContents.filter(
      (c) => c.id !== contentId && !linkedContentIds.has(c.id),
    );
  }, [allContents, contentId, linkedContentIds]);

  if (!content) {
    return (
      <div style={styles.container}>
        <div style={styles.notFound}>
          <h2 style={styles.notFoundTitle}>Content not found</h2>
          <Link to="/" style={styles.backLink}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const handleSaveName = () => {
    if (editName.trim() && editName !== content.title) {
      updateContent(content.id, { title: editName.trim() });
    }
    setIsEditingName(false);
  };

  const handleCreateProperty = () => {
    if (!newPropertyName.trim()) return;
    const newProperty: Property = {
      id: generateId(),
      name: newPropertyName.trim(),
      type: newPropertyType,
      value: getDefaultValue(newPropertyType),
      // eslint-disable-next-line react-hooks/purity -- Called on user action, not during render
      createdAt: Date.now(),
    };
    addPropertyToContent(content.id, newProperty);
    setNewPropertyName('');
    setNewPropertyType(PropertyType.SHORT_TEXT);
    setShowPropertyModal(false);
  };

  const getDefaultValue = (type: PropertyType): Property['value'] => {
    switch (type) {
      case PropertyType.NUMBER:
        return 0;
      case PropertyType.DATE:
        return '';
      case PropertyType.TAG:
        return [];
      default:
        return '';
    }
  };

  const handleCreateLink = (targetId: string) => {
    createLink(content.id, targetId, LinkType.MANUAL);
    setShowLinkModal(false);
  };

  const handleDeleteLink = (linkId: string) => {
    deleteLink(linkId);
  };

  const getLinkedContent = (link: typeof links[0]) => {
    const otherId =
      link.fromContentId === contentId ? link.toContentId : link.fromContentId;
    return allContents.find((c) => c.id === otherId);
  };

  return (
    <div style={styles.container}>
      <nav style={styles.breadcrumb}>
        <Link to="/" style={styles.breadcrumbLink}>
          Home
        </Link>
        <span style={styles.breadcrumbSeparator}>/</span>
        {area && (
          <>
            <Link to={`/area/${area.id}`} style={styles.breadcrumbLink}>
              {area.name}
            </Link>
            <span style={styles.breadcrumbSeparator}>/</span>
          </>
        )}
        <span style={styles.breadcrumbCurrent}>{content.title}</span>
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
              setEditName(content.title);
              setIsEditingName(true);
            }}
            title="Click to edit"
          >
            {content.title}
          </h1>
        )}
      </header>

      <div style={styles.layout}>
        {/* Canvas Editor */}
        <div style={styles.canvasSection}>
          <CanvasEditor contentId={content.id} />
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Properties Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Properties</h3>
              <button
                style={styles.addButton}
                onClick={() => setShowPropertyModal(true)}
              >
                +
              </button>
            </div>
            {properties.length === 0 ? (
              <p style={styles.emptyText}>No properties</p>
            ) : (
              <div style={styles.propertyList}>
                {properties.map((prop) => (
                  <div key={prop.id} style={styles.propertyItem}>
                    <div style={styles.propertyHeader}>
                      <span style={styles.propertyName}>{prop.name}</span>
                      <button
                        style={styles.removeButton}
                        onClick={() => removePropertyFromContent(content.id, prop.id)}
                      >
                        ×
                      </button>
                    </div>
                    {(prop.type === PropertyType.SHORT_TEXT || prop.type === PropertyType.LONG_TEXT) && (
                      <input
                        type="text"
                        value={(prop.value as string) || ''}
                        onChange={(e) => updatePropertyInContent(content.id, prop.id, { value: e.target.value })}
                        style={styles.propertyInput}
                        placeholder="Enter value..."
                      />
                    )}
                    {prop.type === PropertyType.NUMBER && (
                      <input
                        type="number"
                        value={(prop.value as number) ?? ''}
                        onChange={(e) =>
                          updatePropertyInContent(content.id, prop.id, { value: parseFloat(e.target.value) || 0 })
                        }
                        style={styles.propertyInput}
                      />
                    )}
                    {prop.type === PropertyType.TAG && (
                      <input
                        type="text"
                        value={Array.isArray(prop.value) ? (prop.value as string[]).join(', ') : ''}
                        onChange={(e) => updatePropertyInContent(content.id, prop.id, { value: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                        style={styles.propertyInput}
                        placeholder="Tag1, Tag2..."
                      />
                    )}
                    {prop.type === PropertyType.DATE && (
                      <input
                        type="date"
                        value={(prop.value as string) || ''}
                        onChange={(e) => updatePropertyInContent(content.id, prop.id, { value: e.target.value })}
                        style={styles.propertyInput}
                      />
                    )}
                    {prop.type === PropertyType.LINK && (
                      <span style={styles.propertyValue}>
                        {(prop.value as string) || 'No link'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Links</h3>
              <button
                style={styles.addButton}
                onClick={() => setShowLinkModal(true)}
                disabled={availableContents.length === 0}
              >
                +
              </button>
            </div>
            {links.length === 0 ? (
              <p style={styles.emptyText}>No links</p>
            ) : (
              <div style={styles.linkList}>
                {links.map((link) => {
                  const linked = getLinkedContent(link);
                  return linked ? (
                    <div key={link.id} style={styles.linkItem}>
                      <span
                        style={styles.linkName}
                        onClick={() => navigate(`/content/${linked.id}`)}
                      >
                        {linked.title}
                      </span>
                      <button
                        style={styles.removeButton}
                        onClick={() => handleDeleteLink(link.id)}
                      >
                        ×
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property Modal */}
      {showPropertyModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPropertyModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Add Property</h2>
            <input
              type="text"
              placeholder="Property name"
              value={newPropertyName}
              onChange={(e) => setNewPropertyName(e.target.value)}
              style={styles.input}
              autoFocus
            />
            <select
              value={newPropertyType}
              onChange={(e) => setNewPropertyType(e.target.value as PropertyType)}
              style={styles.select}
            >
              <option value={PropertyType.SHORT_TEXT}>Short Text</option>
              <option value={PropertyType.LONG_TEXT}>Long Text</option>
              <option value={PropertyType.NUMBER}>Number</option>
              <option value={PropertyType.DATE}>Date</option>
              <option value={PropertyType.TAG}>Tag</option>
            </select>
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={() => setShowPropertyModal(false)}>
                Cancel
              </button>
              <button style={styles.createButton} onClick={handleCreateProperty}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div style={styles.modalOverlay} onClick={() => setShowLinkModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Link to Content</h2>
            {availableContents.length === 0 ? (
              <p style={styles.emptyText}>No available contents to link</p>
            ) : (
              <div style={styles.contentList}>
                {availableContents.map((c) => (
                  <div
                    key={c.id}
                    style={styles.contentItem}
                    onClick={() => handleCreateLink(c.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#334155';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1e293b';
                    }}
                  >
                    {c.title}
                  </div>
                ))}
              </div>
            )}
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={() => setShowLinkModal(false)}>
                Cancel
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
    padding: '24px',
    minHeight: 'calc(100vh - 60px)',
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
    marginBottom: '20px',
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
  layout: {
    display: 'flex',
    gap: '24px',
  },
  canvasSection: {
    flex: 1,
    minWidth: 0,
  },
  sidebar: {
    width: '300px',
    flexShrink: 0,
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '16px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#94a3b8',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  addButton: {
    width: '24px',
    height: '24px',
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  propertyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  propertyItem: {
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    padding: '12px',
  },
  propertyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  propertyName: {
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  propertyInput: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f1f1f1',
    fontSize: '13px',
    boxSizing: 'border-box',
  },
  propertyValue: {
    fontSize: '13px',
    color: '#64748b',
    fontStyle: 'italic',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#f1f1f1',
    fontSize: '13px',
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  linkItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    padding: '10px 12px',
  },
  linkName: {
    color: '#a78bfa',
    fontSize: '13px',
    cursor: 'pointer',
  },
  removeButton: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  emptyText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
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
    maxHeight: '80vh',
    overflow: 'auto',
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
    marginBottom: '12px',
  },
  select: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f1f1',
    fontSize: '14px',
    boxSizing: 'border-box',
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
  contentList: {
    maxHeight: '300px',
    overflow: 'auto',
  },
  contentItem: {
    padding: '12px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    color: '#f1f1f1',
    fontSize: '14px',
    transition: 'background-color 0.2s',
  },
};
