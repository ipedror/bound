// ============================================================
// ContentPopup - Draggable, resizable floating popup for content editing
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CanvasEditor } from './CanvasEditor';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';

interface ContentPopupProps {
  contentId: string;
  onClose: () => void;
  onSplitView: () => void;
  initialX?: number;
  initialY?: number;
}

const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 480;

export function ContentPopup({ contentId, onClose, onSplitView, initialX, initialY }: ContentPopupProps) {
  const navigate = useNavigate();
  const popupRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState({ x: initialX ?? 120, y: initialY ?? 80 });
  const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 });

  const { content, updateContent } = useAppStore(
    useShallow((s) => ({
      content: s.state.contents.find((c) => c.id === contentId),
      updateContent: s.updateContent,
    })),
  );

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  // Bring popup to front
  const bringToFront = useCallback(() => {
    if (popupRef.current) {
      popupRef.current.style.zIndex = '500';
    }
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y };
    bringToFront();
  }, [pos, bringToFront]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPos({
        x: Math.max(0, dragStartRef.current.posX + dx),
        y: Math.max(0, dragStartRef.current.posY + dy),
      });
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, w: size.w, h: size.h };
    bringToFront();
  }, [size, bringToFront]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.mouseX;
      const dy = e.clientY - resizeStartRef.current.mouseY;
      setSize({
        w: Math.max(MIN_WIDTH, resizeStartRef.current.w + dx),
        h: Math.max(MIN_HEIGHT, resizeStartRef.current.h + dy),
      });
    };
    const handleUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleSaveTitle = useCallback(() => {
    if (editTitle.trim() && content && editTitle.trim() !== content.title) {
      updateContent(content.id, { title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  }, [editTitle, content, updateContent]);

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditingTitle) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, isEditingTitle]);

  if (!content) return null;

  return (
    <div
      ref={popupRef}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(56, 189, 248, 0.08)',
      }}
      onMouseDown={bringToFront}
    >
      {/* Title bar (draggable) */}
      <div
        style={popupStyles.titleBar}
        onMouseDown={handleDragStart}
      >
        <div style={popupStyles.titleLeft}>
          {content.emoji && <span style={{ fontSize: '14px' }}>{content.emoji}</span>}
          {isEditingTitle ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              style={popupStyles.titleInput}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              style={popupStyles.titleText}
              onDoubleClick={() => { setEditTitle(content.title); setIsEditingTitle(true); }}
              title="Double-click to rename"
            >
              {content.title}
            </span>
          )}
        </div>
        <div style={popupStyles.titleActions}>
          {/* Split view button */}
          <button
            style={popupStyles.titleBtn}
            onClick={onSplitView}
            title="Split view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
          </button>
          {/* Open full page button */}
          <button
            style={popupStyles.titleBtn}
            onClick={() => navigate(`/content/${content.id}`)}
            title="Open full page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
          {/* Close button */}
          <button
            style={popupStyles.closeBtn}
            onClick={onClose}
            title="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content area */}
      <div style={popupStyles.contentArea}>
        <CanvasEditor contentId={contentId} />
      </div>

      {/* Resize handle (bottom-right) */}
      <div
        style={popupStyles.resizeHandle}
        onMouseDown={handleResizeStart}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <line x1="10" y1="2" x2="2" y2="10" stroke="#475569" strokeWidth="1.5" />
          <line x1="10" y1="6" x2="6" y2="10" stroke="#475569" strokeWidth="1.5" />
          <line x1="10" y1="10" x2="10" y2="10" stroke="#475569" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

const popupStyles: Record<string, React.CSSProperties> = {
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    cursor: 'grab',
    flexShrink: 0,
    userSelect: 'none',
  },
  titleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  titleText: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e2e8f0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    cursor: 'default',
  },
  titleInput: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e2e8f0',
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '4px',
    padding: '2px 6px',
    outline: 'none',
    flex: 1,
    minWidth: 0,
  },
  titleActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '8px',
    flexShrink: 0,
  },
  titleBtn: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  closeBtn: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#ef4444',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  contentArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '20px',
    height: '20px',
    cursor: 'nwse-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
};
