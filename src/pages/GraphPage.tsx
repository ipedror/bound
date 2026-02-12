// ============================================================
// GraphPage - Full-screen Excalidraw-style graph page
// Auto split-view: click node → graph left, content right
// ============================================================

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraphView } from '../components/GraphView';
import { CanvasEditor } from '../components/CanvasEditor';
import { Island } from '../components/Island';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { LinkType } from '../types/enums';

export default function GraphPage() {
  const [selectedContentId, setSelectedContentId] = useState<string | undefined>();
  const [linksOpen, setLinksOpen] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [splitRatio, setSplitRatio] = useState(0.5);
  const linksRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    allContents,
    allLinks,
    createLink,
    deleteLink,
    updateContent,
  } = useAppStore(
    useShallow((s) => ({
      allContents: s.state.contents,
      allLinks: s.state.links,
      createLink: s.createLink,
      deleteLink: s.deleteLink,
      updateContent: s.updateContent,
    })),
  );

  const content = useMemo(
    () => allContents.find((c) => c.id === selectedContentId),
    [allContents, selectedContentId],
  );

  const links = useMemo(
    () => allLinks.filter((l) => l.fromContentId === selectedContentId || l.toContentId === selectedContentId),
    [allLinks, selectedContentId],
  );

  const linkedContentIds = useMemo(() => {
    const ids = new Set<string>();
    links.forEach((link) => {
      ids.add(link.fromContentId === selectedContentId ? link.toContentId : link.fromContentId);
    });
    return ids;
  }, [links, selectedContentId]);

  const availableContents = useMemo(
    () => allContents.filter((c) => c.id !== selectedContentId && !linkedContentIds.has(c.id)),
    [allContents, selectedContentId, linkedContentIds],
  );

  const getLinkedContent = useCallback(
    (link: typeof links[0]) => {
      const otherId = link.fromContentId === selectedContentId ? link.toContentId : link.fromContentId;
      return allContents.find((c) => c.id === otherId);
    },
    [allContents, selectedContentId],
  );

  // Parent-child hierarchy
  const parentContent = useMemo(
    () => content?.parentId ? allContents.find((c) => c.id === content.parentId) : undefined,
    [allContents, content],
  );
  const childContents = useMemo(
    () => allContents.filter((c) => c.parentId === selectedContentId),
    [allContents, selectedContentId],
  );
  const availableParents = useMemo(
    () => allContents.filter((c) => {
      if (c.id === selectedContentId) return false;
      if (!content) return false;
      if (c.areaId !== content.areaId) return false;
      if (c.parentId === selectedContentId) return false;
      return true;
    }),
    [allContents, selectedContentId, content],
  );

  // Close panels on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (linksOpen && linksRef.current && !linksRef.current.contains(e.target as Node)) {
        setLinksOpen(false);
      }
      if (parentOpen && parentRef.current && !parentRef.current.contains(e.target as Node)) {
        setParentOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [linksOpen, parentOpen]);

  const handleSaveName = useCallback(() => {
    if (editName.trim() && content && editName.trim() !== content.title) {
      updateContent(content.id, { title: editName.trim() });
    }
    setIsEditingName(false);
  }, [editName, content, updateContent]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedContentId(nodeId);
    setLinksOpen(false);
    setShowLinkModal(false);
    setParentOpen(false);
    setIsEditingName(false);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedContentId(undefined);
    setLinksOpen(false);
    setShowLinkModal(false);
    setParentOpen(false);
  }, []);

  const handleCreateLink = useCallback(
    (targetId: string) => {
      if (!selectedContentId) return;
      createLink(selectedContentId, targetId, LinkType.MANUAL);
      setShowLinkModal(false);
    },
    [selectedContentId, createLink],
  );

  const isSplit = !!selectedContentId;

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

  return (
    <div style={styles.container}>
      <div style={styles.splitContainer} ref={splitContainerRef}>
        {/* Left: Graph */}
        <div style={{ ...styles.splitPanel, flex: isSplit ? `0 0 ${splitRatio * 100}%` : 1 }}>
          <GraphView
            height="100%"
            width="100%"
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            enableLayers
          />
        </div>

        {/* Right: Content canvas (only when a node is selected) */}
        {isSplit && (
          <>
            <div
              style={styles.splitDivider}
              onMouseDown={handleDividerMouseDown}
            >
              <div style={styles.splitDividerHandle} />
            </div>
            <div style={{ ...styles.splitPanel, flex: `0 0 ${(1 - splitRatio) * 100}%` }}>
              <CanvasEditor contentId={selectedContentId} />

              {/* Content title bar */}
              {content && (
                <div style={styles.topBar}>
                  <Island padding={8} style={styles.topBarIsland}>
                    {content.emoji && <span style={styles.contentEmoji}>{content.emoji}</span>}
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
                      <span
                        style={styles.contentTitle}
                        onClick={() => { setEditName(content.title); setIsEditingName(true); }}
                        title="Click to edit"
                      >
                        {content.title}
                      </span>
                    )}
                    <button
                      style={styles.openBtn}
                      onClick={() => navigate(`/content/${content.id}`)}
                      title="Open full content page"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </button>
                  </Island>
                </div>
              )}

              {/* Links toolbar (right side) */}
              <div style={styles.rightPanel}>
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
                        <button
                          style={styles.addBtn}
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
                                  onClick={() => {
                                    setSelectedContentId(linked.id);
                                    setLinksOpen(false);
                                  }}
                                >
                                  {linked.emoji ? `${linked.emoji} ` : ''}{linked.title}
                                </span>
                                <button style={styles.removeBtn} onClick={() => deleteLink(link.id)}>×</button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </Island>
                  )}
                </div>

                {/* Hierarchy toggle */}
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

                  {/* Hierarchy dropdown */}
                  {parentOpen && (
                    <Island padding={12} style={styles.dropdownPanel}>
                      {/* Parent selector */}
                      <div style={styles.panelHeader}>
                        <h3 style={styles.panelTitle}>Parent</h3>
                      </div>
                      {parentContent ? (
                        <div style={styles.linkItem}>
                          <span style={styles.linkName} onClick={() => { setSelectedContentId(parentContent.id); setParentOpen(false); }}>
                            {parentContent.emoji ? `${parentContent.emoji} ` : ''}{parentContent.title}
                          </span>
                          <button style={styles.removeBtn} onClick={() => updateContent(content!.id, { parentId: undefined })}>×</button>
                        </div>
                      ) : (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value && content) {
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
                              <span style={styles.linkName} onClick={() => { setSelectedContentId(child.id); setParentOpen(false); }}>
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

              {/* Link creation modal */}
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
                            {c.emoji ? `${c.emoji} ` : ''}{c.title}
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
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
  },
  splitContainer: {
    display: 'flex',
    width: '100%',
    height: '100%',
  },
  splitPanel: {
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
  // Top bar with content title
  topBar: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 50,
  },
  topBarIsland: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    maxWidth: '280px',
  },
  contentEmoji: {
    fontSize: '14px',
    flexShrink: 0,
  },
  contentTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e2e8f0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    cursor: 'pointer',
    borderRadius: '4px',
    padding: '2px 4px',
  },
  titleInput: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e2e8f0',
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '4px',
    padding: '2px 6px',
    outline: 'none',
    minWidth: '80px',
    maxWidth: '200px',
  },
  openBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: '#38bdf8',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    flexShrink: 0,
  },
  // Right side: Links toolbar
  rightPanel: {
    position: 'absolute',
    top: '60px',
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
  // Link modal
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
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' },
  cancelButton: {
    padding: '10px 20px', backgroundColor: 'transparent',
    color: '#94a3b8', border: '1px solid #334155',
    borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
  },
  contentList: { maxHeight: '300px', overflow: 'auto' },
  contentItem: {
    padding: '12px', backgroundColor: '#1e293b',
    borderRadius: '8px', marginBottom: '8px',
    cursor: 'pointer', color: '#f1f1f1', fontSize: '14px',
    transition: 'background-color 0.2s',
  },
  select: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
  },
};
