// ============================================================
// ContentPage - Full-screen canvas with floating panels
// ============================================================

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { CanvasEditor } from '../components/CanvasEditor';
import { GraphView } from '../components/GraphView';
import { Island } from '../components/Island';
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
  const [propsOpen, setPropsOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const propsRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitContainerRef.current;
    if (!container) return;
    const startX = e.clientX;
    const startRatio = splitRatio;
    const containerWidth = container.getBoundingClientRect().width;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const newRatio = Math.min(0.8, Math.max(0.2, startRatio + dx / containerWidth));
      setSplitRatio(newRatio);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [splitRatio]);

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

  const content = useMemo(() => allContents.find((c) => c.id === contentId), [allContents, contentId]);
  const area = useMemo(() => areas.find((a) => content && content.areaId === a.id), [areas, content]);
  const links = useMemo(
    () => allLinks.filter((l) => l.fromContentId === contentId || l.toContentId === contentId),
    [allLinks, contentId],
  );
  const properties = content?.properties ?? [];

  const linkedContentIds = useMemo(() => {
    const ids = new Set<string>();
    links.forEach((link) => {
      ids.add(link.fromContentId === contentId ? link.toContentId : link.fromContentId);
    });
    return ids;
  }, [links, contentId]);

  const availableContents = useMemo(
    () => allContents.filter((c) => c.id !== contentId && !linkedContentIds.has(c.id)),
    [allContents, contentId, linkedContentIds],
  );

  // Parent-child hierarchy
  const parentContent = useMemo(
    () => content?.parentId ? allContents.find((c) => c.id === content.parentId) : undefined,
    [allContents, content],
  );
  const childContents = useMemo(
    () => allContents.filter((c) => c.parentId === contentId),
    [allContents, contentId],
  );
  // Contents eligible to be parent (same area, not self, not current children, not current parent to avoid cycles)
  const availableParents = useMemo(
    () => allContents.filter((c) => {
      if (c.id === contentId) return false;
      if (!content) return false;
      if (c.areaId !== content.areaId) return false;
      // Prevent setting a child (or deeper descendant) as parent
      if (c.parentId === contentId) return false;
      return true;
    }),
    [allContents, contentId, content],
  );

  // Close panels on click outside
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (propsOpen && propsRef.current && !propsRef.current.contains(e.target as Node)) setPropsOpen(false);
      if (linksOpen && linksRef.current && !linksRef.current.contains(e.target as Node)) setLinksOpen(false);
      if (parentOpen && parentRef.current && !parentRef.current.contains(e.target as Node)) setParentOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [propsOpen, linksOpen, parentOpen]);

  if (!content) {
    return (
      <div style={styles.notFoundContainer}>
        <div style={styles.notFound}>
          <h2 style={styles.notFoundTitle}>Content not found</h2>
          <Link to="/" style={styles.backLink}>← Back to Home</Link>
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
      createdAt: Date.now(),
    };
    addPropertyToContent(content.id, newProperty);
    setNewPropertyName('');
    setNewPropertyType(PropertyType.SHORT_TEXT);
    setShowPropertyModal(false);
  };

  const getDefaultValue = (type: PropertyType): Property['value'] => {
    switch (type) {
      case PropertyType.NUMBER: return 0;
      case PropertyType.DATE: return '';
      case PropertyType.TAG: return [];
      default: return '';
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
    const otherId = link.fromContentId === contentId ? link.toContentId : link.fromContentId;
    return allContents.find((c) => c.id === otherId);
  };

  return (
    <div style={styles.fullScreen}>
      {/* Split-view container */}
      <div style={styles.splitContainer} ref={splitContainerRef}>
        {/* Left: Canvas (full or half) — all floating UI lives inside here */}
        <div style={{ ...styles.splitPanel, flex: showGraph ? `0 0 ${splitRatio * 100}%` : undefined, width: showGraph ? undefined : '100%' }}>
          <CanvasEditor contentId={content.id} />

          {/* Floating split-view toggle (top-left) */}
          <div style={styles.topLeft}>
            <Island padding={4}>
              <button
                style={{
                  ...styles.splitToggle,
                  ...(showGraph ? styles.splitToggleActive : {}),
                }}
                onClick={() => setShowGraph(!showGraph)}
                title={showGraph ? 'Close graph view' : 'Show graph view'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                </svg>
                <span style={styles.panelToggleLabel}>{showGraph ? 'Close' : 'Graph'}</span>
              </button>
            </Island>
          </div>

          {/* Floating breadcrumb + title (top-right of canvas area) */}
          <div style={styles.topRight}>
            <Island padding={10} style={{ maxWidth: '320px' }}>
              <nav style={styles.breadcrumb}>
                <Link to="/" style={styles.breadcrumbLink}>Home</Link>
                <span style={styles.breadcrumbSep}>/</span>
                {area && (
                  <>
                    <Link to={`/area/${area.id}`} style={styles.breadcrumbLink}>{area.name}</Link>
                    <span style={styles.breadcrumbSep}>/</span>
                  </>
                )}
              </nav>
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
                  onClick={() => { setEditName(content.title); setIsEditingName(true); }}
                  title="Click to edit"
                >
                  {content.title}
                </h1>
              )}
            </Island>
          </div>

          {/* Floating Properties + Links toggles (right side of canvas area) */}
          <div style={styles.rightPanel}>
            {/* Properties toggle */}
            <div ref={propsRef} style={{ position: 'relative' }}>
              <Island padding={4}>
                <button
                  style={styles.panelToggle}
                  onClick={() => setPropsOpen(!propsOpen)}
                  title="Properties"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span style={styles.panelToggleLabel}>Props</span>
                  {properties.length > 0 && (
                    <span style={styles.panelBadge}>{properties.length}</span>
                  )}
                </button>
              </Island>

              {/* Properties dropdown */}
              {propsOpen && (
                <Island padding={12} style={styles.dropdownPanel}>
                  <div style={styles.panelHeader}>
                    <h3 style={styles.panelTitle}>Properties</h3>
                    <button style={styles.addBtn} onClick={() => setShowPropertyModal(true)}>+</button>
                  </div>
                  {properties.length === 0 ? (
                    <p style={styles.emptyText}>No properties</p>
                  ) : (
                    <div style={styles.propertyList}>
                      {properties.map((prop) => (
                        <div key={prop.id} style={styles.propertyItem}>
                          <div style={styles.propertyHeader}>
                            <span style={styles.propertyName}>{prop.name}</span>
                            <button style={styles.removeBtn} onClick={() => removePropertyFromContent(content.id, prop.id)}>×</button>
                          </div>
                          {(prop.type === PropertyType.SHORT_TEXT || prop.type === PropertyType.LONG_TEXT) && (
                            <input type="text" value={(prop.value as string) || ''} onChange={(e) => updatePropertyInContent(content.id, prop.id, { value: e.target.value })} style={styles.propInput} placeholder="Enter value..." />
                          )}
                          {prop.type === PropertyType.NUMBER && (
                            <input type="number" value={(prop.value as number) ?? ''} onChange={(e) => updatePropertyInContent(content.id, prop.id, { value: parseFloat(e.target.value) || 0 })} style={styles.propInput} />
                          )}
                          {prop.type === PropertyType.TAG && (
                            <input type="text" value={Array.isArray(prop.value) ? (prop.value as string[]).join(', ') : ''} onChange={(e) => updatePropertyInContent(content.id, prop.id, { value: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} style={styles.propInput} placeholder="Tag1, Tag2..." />
                          )}
                          {prop.type === PropertyType.DATE && (
                            <input type="date" value={(prop.value as string) || ''} onChange={(e) => updatePropertyInContent(content.id, prop.id, { value: e.target.value })} style={styles.propInput} />
                          )}
                          {prop.type === PropertyType.LINK && (
                            <span style={styles.emptyText}>{(prop.value as string) || 'No link'}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Island>
              )}
            </div>

            {/* Links toggle */}
            <div ref={linksRef} style={{ position: 'relative' }}>
              <Island padding={4}>
                <button
                  style={styles.panelToggle}
                  onClick={() => setLinksOpen(!linksOpen)}
                  title="Links"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <span style={styles.panelToggleLabel}>Links</span>
                  {links.length > 0 && (
                    <span style={styles.panelBadge}>{links.length}</span>
                  )}
                </button>
              </Island>

              {/* Links dropdown */}
              {linksOpen && (
                <Island padding={12} style={styles.dropdownPanel}>
                  <div style={styles.panelHeader}>
                    <h3 style={styles.panelTitle}>Links</h3>
                    <button style={styles.addBtn} onClick={() => setShowLinkModal(true)} disabled={availableContents.length === 0}>+</button>
                  </div>
                  {links.length === 0 ? (
                    <p style={styles.emptyText}>No links</p>
                  ) : (
                    <div style={styles.linkList}>
                      {links.map((link) => {
                        const linked = getLinkedContent(link);
                        return linked ? (
                          <div key={link.id} style={styles.linkItem}>
                            <span style={styles.linkName} onClick={() => navigate(`/content/${linked.id}`)}>{linked.title}</span>
                            <button style={styles.removeBtn} onClick={() => handleDeleteLink(link.id)}>×</button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </Island>
              )}
            </div>

            {/* Parent / Children toggle */}
            <div ref={parentRef} style={{ position: 'relative' }}>
              <Island padding={4}>
                <button
                  style={styles.panelToggle}
                  onClick={() => setParentOpen(!parentOpen)}
                  title="Parent & Children"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="5" r="3" />
                    <line x1="12" y1="8" x2="12" y2="14" />
                    <circle cx="7" cy="19" r="3" />
                    <circle cx="17" cy="19" r="3" />
                    <line x1="12" y1="14" x2="7" y2="16" />
                    <line x1="12" y1="14" x2="17" y2="16" />
                  </svg>
                  <span style={styles.panelToggleLabel}>Hierarchy</span>
                  {(parentContent || childContents.length > 0) && (
                    <span style={styles.panelBadge}>{(parentContent ? 1 : 0) + childContents.length}</span>
                  )}
                </button>
              </Island>

              {/* Parent / Children dropdown */}
              {parentOpen && (
                <Island padding={12} style={styles.dropdownPanel}>
                  {/* Parent selector */}
                  <div style={styles.panelHeader}>
                    <h3 style={styles.panelTitle}>Parent</h3>
                  </div>
                  {parentContent ? (
                    <div style={styles.linkItem}>
                      <span style={styles.linkName} onClick={() => navigate(`/content/${parentContent.id}`)}>
                        {parentContent.emoji ? `${parentContent.emoji} ` : ''}{parentContent.title}
                      </span>
                      <button style={styles.removeBtn} onClick={() => updateContent(content.id, { parentId: undefined })}>×</button>
                    </div>
                  ) : (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          updateContent(content.id, { parentId: e.target.value });
                        }
                      }}
                      style={styles.select}
                    >
                      <option value="">Set parent…</option>
                      {availableParents.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.emoji ? `${c.emoji} ` : ''}{c.title}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Children list */}
                  <div style={{ ...styles.panelHeader, marginTop: '12px' }}>
                    <h3 style={styles.panelTitle}>Children</h3>
                  </div>
                  {childContents.length === 0 ? (
                    <p style={styles.emptyText}>No children</p>
                  ) : (
                    <div style={styles.linkList}>
                      {childContents.map((child) => (
                        <div key={child.id} style={styles.linkItem}>
                          <span style={styles.linkName} onClick={() => navigate(`/content/${child.id}`)}>
                            {child.emoji ? `${child.emoji} ` : ''}{child.title}
                          </span>
                          <button style={styles.removeBtn} onClick={() => updateContent(child.id, { parentId: undefined })} title="Remove from parent">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </Island>
              )}
            </div>
          </div>

          {/* Property Modal */}
          {showPropertyModal && (
            <div style={styles.modalOverlay} onClick={() => setShowPropertyModal(false)}>
              <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 style={styles.modalTitle}>Add Property</h2>
                <input type="text" placeholder="Property name" value={newPropertyName} onChange={(e) => setNewPropertyName(e.target.value)} style={styles.input} autoFocus />
                <select value={newPropertyType} onChange={(e) => setNewPropertyType(e.target.value as PropertyType)} style={styles.select}>
                  <option value={PropertyType.SHORT_TEXT}>Short Text</option>
                  <option value={PropertyType.LONG_TEXT}>Long Text</option>
                  <option value={PropertyType.NUMBER}>Number</option>
                  <option value={PropertyType.DATE}>Date</option>
                  <option value={PropertyType.TAG}>Tag</option>
                </select>
                <div style={styles.modalActions}>
                  <button style={styles.cancelButton} onClick={() => setShowPropertyModal(false)}>Cancel</button>
                  <button style={styles.createButton} onClick={handleCreateProperty}>Add</button>
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
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#334155'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
                      >
                        {c.title}
                      </div>
                    ))}
                  </div>
                )}
                <div style={styles.modalActions}>
                  <button style={styles.cancelButton} onClick={() => setShowLinkModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Graph (only when split) */}
        {showGraph && area && (
          <>
            <div
              style={styles.splitDivider}
              onMouseDown={handleDividerMouseDown}
            >
              <div style={styles.splitDividerHandle} />
            </div>
            <div style={{ ...styles.splitPanel, flex: `0 0 ${(1 - splitRatio) * 100}%` }}>
              <GraphView areaId={area.id} height="100%" width="100%" enableLayers onNodeClick={(nodeId) => navigate(`/content/${nodeId}`)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fullScreen: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
  },
  splitContainer: {
    display: 'flex',
    width: '100%',
    height: '100%',
  },
  splitPanel: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  splitDivider: {
    width: '6px',
    backgroundColor: '#1e293b',
    cursor: 'col-resize',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s',
    position: 'relative',
  },
  splitDividerHandle: {
    width: '3px',
    height: '40px',
    borderRadius: '2px',
    backgroundColor: '#475569',
  },
  // Top-left: split-view toggle (below menu button)
  topLeft: {
    position: 'absolute',
    top: '68px',
    left: '12px',
    zIndex: 50,
  },
  splitToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '6px 10px',
    fontSize: '12px',
    borderRadius: '8px',
    whiteSpace: 'nowrap',
  },
  splitToggleActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    color: '#38bdf8',
  },
  // Top-right: breadcrumb + title
  topRight: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 50,
  },
  breadcrumb: {
    fontSize: '11px',
    marginBottom: '4px',
  },
  breadcrumbLink: {
    color: '#38bdf8',
    textDecoration: 'none',
  },
  breadcrumbSep: {
    color: '#64748b',
    margin: '0 4px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#f1f1f1',
    margin: 0,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  titleInput: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#f1f1f1',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid #38bdf8',
    outline: 'none',
    padding: 0,
    width: '100%',
  },
  // Right side: Properties + Links toggles
  rightPanel: {
    position: 'absolute',
    top: '80px',
    right: '12px',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-end',
  },
  panelToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: '#e2e8f0',
    cursor: 'pointer',
    padding: '6px 10px',
    fontSize: '12px',
    borderRadius: '8px',
    whiteSpace: 'nowrap',
  },
  panelToggleLabel: {
    fontSize: '12px',
    fontWeight: 500,
  },
  panelBadge: {
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    borderRadius: '10px',
    padding: '0 6px',
    fontSize: '10px',
    fontWeight: 700,
    minWidth: '16px',
    textAlign: 'center',
    lineHeight: '16px',
  },
  dropdownPanel: {
    position: 'absolute',
    top: 0,
    right: 'calc(100% + 8px)',
    width: '280px',
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  panelTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#94a3b8',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  addBtn: {
    width: '22px',
    height: '22px',
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  propertyItem: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
    padding: '10px',
  },
  propertyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  propertyName: { fontSize: '12px', color: '#94a3b8', fontWeight: 500 },
  propInput: {
    width: '100%',
    padding: '6px 8px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#f1f1f1',
    fontSize: '12px',
    boxSizing: 'border-box',
  },
  linkList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  linkItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
    padding: '8px 10px',
  },
  linkName: { color: '#a78bfa', fontSize: '12px', cursor: 'pointer' },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  emptyText: { fontSize: '12px', color: '#64748b', margin: 0 },
  // Not found
  notFoundContainer: { padding: '64px 24px 24px 64px', minHeight: '100vh', backgroundColor: '#0f172a' },
  notFound: { textAlign: 'center', padding: '60px 20px' },
  notFoundTitle: { fontSize: '24px', color: '#f1f1f1', marginBottom: '16px' },
  backLink: { color: '#38bdf8', textDecoration: 'none' },
  // Modals
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
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
    maxWidth: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  modalTitle: { fontSize: '20px', fontWeight: '600', color: '#f1f1f1', margin: '0 0 20px 0' },
  input: {
    width: '100%', padding: '12px',
    backgroundColor: '#0f172a', border: '1px solid #334155',
    borderRadius: '8px', color: '#f1f1f1', fontSize: '14px',
    boxSizing: 'border-box', marginBottom: '12px',
  },
  select: {
    width: '100%', padding: '12px',
    backgroundColor: '#0f172a', border: '1px solid #334155',
    borderRadius: '8px', color: '#f1f1f1', fontSize: '14px',
    boxSizing: 'border-box',
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' },
  cancelButton: {
    padding: '10px 20px', backgroundColor: 'transparent',
    color: '#94a3b8', border: '1px solid #334155',
    borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
  },
  createButton: {
    padding: '10px 20px', backgroundColor: '#38bdf8',
    color: '#0f172a', border: 'none', borderRadius: '8px',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
  },
  contentList: { maxHeight: '300px', overflow: 'auto' },
  contentItem: {
    padding: '12px', backgroundColor: '#1e293b',
    borderRadius: '8px', marginBottom: '8px',
    cursor: 'pointer', color: '#f1f1f1', fontSize: '14px',
    transition: 'background-color 0.2s',
  },
};
