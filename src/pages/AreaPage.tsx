// ============================================================
// AreaPage - Shows contents within a specific area
// ============================================================

import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { getTagColor } from '../utils/tagColors';
import { useTagDictionary } from '../hooks/useTagDictionary';

export default function AreaPage() {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContentName, setNewContentName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [addingTagToContent, setAddingTagToContent] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [showInlineTagSuggestions, setShowInlineTagSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagFilterRef = useRef<HTMLDivElement>(null);

  // Get raw state - don't filter inside selector to avoid new reference on each render
  const { areas, allContents, links, createContent, deleteContent, updateArea, updateContent } = useAppStore(
    useShallow((s) => ({
      areas: s.state.areas,
      allContents: s.state.contents,
      links: s.state.links,
      createContent: s.createContent,
      deleteContent: s.deleteContent,
      updateArea: s.updateArea,
      updateContent: s.updateContent,
    })),
  );

  // Derive filtered data with useMemo
  const area = useMemo(() => areas.find((a) => a.id === areaId), [areas, areaId]);
  const contents = useMemo(() => allContents.filter((c) => c.areaId === areaId), [allContents, areaId]);

  // Global tag dictionary
  const allGlobalTags = useTagDictionary();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(area?.name || '');

  // Collect all unique tags from contents in this area
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    contents.forEach((c) => {
      (c.tags ?? []).forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [contents]);

  // Get link counts for each content
  const linkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    links.forEach((link) => {
      counts[link.fromContentId] = (counts[link.fromContentId] || 0) + 1;
      counts[link.toContentId] = (counts[link.toContentId] || 0) + 1;
    });
    return counts;
  }, [links]);

  // Filter and sort contents
  const filteredContents = useMemo(() => {
    let result = [...contents];

    // Filter by name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((c) => c.title.toLowerCase().includes(query));
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      result = result.filter((c) => {
        const contentTags = c.tags ?? [];
        return selectedTags.every((tag) => contentTags.includes(tag));
      });
    }

    // Sort by updated date
    result.sort((a, b) => b.updatedAt - a.updatedAt);
    return result;
  }, [contents, searchQuery, selectedTags]);

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleAddTag = (contentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddingTagToContent(contentId);
    setNewTagInput('');
    setShowInlineTagSuggestions(true);
    setTimeout(() => tagInputRef.current?.focus(), 50);
  };

  const handleTagSubmit = (contentId: string) => {
    const tag = newTagInput.trim();
    if (!tag) {
      setAddingTagToContent(null);
      setShowInlineTagSuggestions(false);
      return;
    }
    const content = contents.find((c) => c.id === contentId);
    if (!content) return;
    const currentTags = content.tags ?? [];
    if (!currentTags.includes(tag)) {
      updateContent(contentId, { tags: [...currentTags, tag] });
    }
    setNewTagInput('');
    setAddingTagToContent(null);
    setShowInlineTagSuggestions(false);
  };

  const handleSelectInlineSuggestion = (contentId: string, tag: string) => {
    const content = contents.find((c) => c.id === contentId);
    if (!content) return;
    const currentTags = content.tags ?? [];
    if (!currentTags.includes(tag)) {
      updateContent(contentId, { tags: [...currentTags, tag] });
    }
    setNewTagInput('');
    setAddingTagToContent(null);
    setShowInlineTagSuggestions(false);
  };

  // Compute suggestions for inline tag input
  const inlineTagSuggestions = useMemo(() => {
    if (!addingTagToContent) return [];
    const content = contents.find((c) => c.id === addingTagToContent);
    if (!content) return [];
    const currentTags = content.tags ?? [];
    const query = newTagInput.trim().toLowerCase();
    return allGlobalTags.filter((t) => !currentTags.includes(t) && (!query || t.toLowerCase().includes(query)));
  }, [addingTagToContent, contents, newTagInput, allGlobalTags]);

  const handleRemoveTag = (contentId: string, tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const content = contents.find((c) => c.id === contentId);
    if (!content) return;
    const currentTags = content.tags ?? [];
    updateContent(contentId, { tags: currentTags.filter((t) => t !== tag) });
  };

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

  const hasActiveFilters = searchQuery.trim() !== '' || selectedTags.length > 0;

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

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        {/* Search input */}
        <div style={styles.searchWrapper}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              style={styles.clearSearchBtn}
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        {/* Tag filter toggle */}
        <div style={{ position: 'relative' }} ref={tagFilterRef}>
          <button
            style={{
              ...styles.tagFilterBtn,
              ...(selectedTags.length > 0 ? styles.tagFilterBtnActive : {}),
            }}
            onClick={() => setShowTagFilter(!showTagFilter)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Tags
            {selectedTags.length > 0 && (
              <span style={styles.tagFilterBadge}>{selectedTags.length}</span>
            )}
          </button>

          {/* Tag filter dropdown */}
          {showTagFilter && (
            <div style={styles.tagFilterDropdown}>
              {allTags.length === 0 ? (
                <p style={styles.noTagsText}>No tags yet. Add tags to your contents to filter.</p>
              ) : (
                <>
                  <div style={styles.tagFilterHeader}>
                    <span style={styles.tagFilterLabel}>Filter by tags</span>
                    {selectedTags.length > 0 && (
                      <button
                        style={styles.clearTagsBtn}
                        onClick={() => setSelectedTags([])}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div style={styles.tagFilterList}>
                    {allTags.map((tag) => {
                      const color = getTagColor(tag);
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          style={{
                            ...styles.tagFilterItem,
                            backgroundColor: isSelected ? color.bg : 'transparent',
                            borderColor: isSelected ? color.border : '#334155',
                            color: isSelected ? color.text : '#94a3b8',
                          }}
                          onClick={() => toggleTagFilter(tag)}
                        >
                          {tag}
                          {isSelected && <span style={{ marginLeft: '4px' }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Active filter indicators */}
        {hasActiveFilters && (
          <button
            style={styles.clearAllFiltersBtn}
            onClick={() => {
              setSearchQuery('');
              setSelectedTags([]);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div style={styles.activeTagsRow}>
          {selectedTags.map((tag) => {
            const color = getTagColor(tag);
            return (
              <span
                key={tag}
                style={{
                  ...styles.activeTag,
                  backgroundColor: color.bg,
                  color: color.text,
                  borderColor: color.border,
                }}
              >
                {tag}
                <button
                  style={{ ...styles.activeTagRemove, color: color.text }}
                  onClick={() => toggleTagFilter(tag)}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Results count when filtering */}
      {hasActiveFilters && (
        <p style={styles.resultCount}>
          {filteredContents.length} of {contents.length} contents
        </p>
      )}

      {filteredContents.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>
            {hasActiveFilters
              ? 'No contents match your filters.'
              : 'No contents yet. Create your first content!'}
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {filteredContents.map((content) => {
            const contentTags = content.tags ?? [];
            return (
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

                  {/* Tags row */}
                  <div style={styles.tagsRow}>
                    {contentTags.map((tag) => {
                      const color = getTagColor(tag);
                      return (
                        <span
                          key={tag}
                          style={{
                            ...styles.tag,
                            backgroundColor: color.bg,
                            color: color.text,
                            borderColor: color.border,
                          }}
                        >
                          {tag}
                          <button
                            style={{ ...styles.tagRemoveBtn, color: color.text }}
                            onClick={(e) => handleRemoveTag(content.id, tag, e)}
                            title={`Remove tag "${tag}"`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}

                    {/* Add tag inline */}
                    {addingTagToContent === content.id ? (
                      <div style={{ position: 'relative' }}>
                        <input
                          ref={tagInputRef}
                          type="text"
                          value={newTagInput}
                          onChange={(e) => { setNewTagInput(e.target.value); setShowInlineTagSuggestions(true); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation();
                              handleTagSubmit(content.id);
                            }
                            if (e.key === 'Escape') {
                              setAddingTagToContent(null);
                              setNewTagInput('');
                              setShowInlineTagSuggestions(false);
                            }
                          }}
                          onBlur={() => {
                            // Small delay to allow suggestion click to fire
                            setTimeout(() => {
                              if (addingTagToContent === content.id) {
                                handleTagSubmit(content.id);
                              }
                            }, 150);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={styles.tagInput}
                          placeholder="tag..."
                        />
                        {showInlineTagSuggestions && inlineTagSuggestions.length > 0 && (
                          <div style={styles.inlineTagSuggestions}>
                            {inlineTagSuggestions.slice(0, 6).map((tag) => {
                              const clr = getTagColor(tag);
                              return (
                                <button
                                  key={tag}
                                  style={styles.inlineTagSuggestionItem}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelectInlineSuggestion(content.id, tag);
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.08)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <span style={{ ...styles.inlineTagSuggestionChip, backgroundColor: clr.bg, color: clr.text, borderColor: clr.border }}>
                                    {tag}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        style={styles.addTagBtn}
                        onClick={(e) => handleAddTag(content.id, e)}
                        title="Add tag"
                      >
                        +
                      </button>
                    )}
                  </div>

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
            );
          })}
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
  // Filter bar
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    marginTop: '16px',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    maxWidth: '400px',
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f1f1f1',
    fontSize: '14px',
  },
  clearSearchBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748b',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
  },
  tagFilterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  tagFilterBtnActive: {
    borderColor: '#38bdf8',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  tagFilterBadge: {
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
  tagFilterDropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    minWidth: '260px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '12px',
    zIndex: 100,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  tagFilterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  tagFilterLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  clearTagsBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#38bdf8',
    fontSize: '11px',
    cursor: 'pointer',
    padding: 0,
  },
  tagFilterList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tagFilterItem: {
    padding: '4px 10px',
    border: '1px solid #334155',
    borderRadius: '14px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  noTagsText: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
  },
  clearAllFiltersBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748b',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '8px',
    textDecoration: 'underline',
    whiteSpace: 'nowrap',
  },
  activeTagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px',
  },
  activeTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '14px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid',
  },
  activeTagRemove: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    opacity: 0.7,
  },
  resultCount: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '12px',
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
  // Tags
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
    marginBottom: '10px',
    alignItems: 'center',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    border: '1px solid',
    lineHeight: '18px',
  },
  tagRemoveBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '12px',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    opacity: 0.6,
  },
  addTagBtn: {
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px dashed #475569',
    borderRadius: '12px',
    color: '#64748b',
    fontSize: '13px',
    cursor: 'pointer',
    lineHeight: 1,
  },
  tagInput: {
    width: '80px',
    padding: '2px 8px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid #475569',
    borderRadius: '12px',
    color: '#f1f1f1',
    fontSize: '11px',
    outline: 'none',
    lineHeight: '18px',
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
  inlineTagSuggestions: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: '160px',
    maxWidth: '240px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '4px',
    zIndex: 200,
    maxHeight: '160px',
    overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  inlineTagSuggestionItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '5px 6px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.12s ease',
    textAlign: 'left' as const,
  },
  inlineTagSuggestionChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
    border: '1px solid',
  },
};
