// ============================================================
// FrameAnnotationsOverlay - SVG overlay for frame texts & shapes
// Renders on top of Cytoscape canvas, synced to pan/zoom
// Supports dragging annotations to reposition them
// ============================================================

import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import type { Core } from 'cytoscape';
import type { GraphFrame, GraphFrameText, GraphFrameShape } from '../types/graph';

const ANNOTATION_COLORS = [
  '#94a3b8', // slate
  '#e2e8f0', // light gray
  '#f87171', // red
  '#fb923c', // orange
  '#facc15', // yellow
  '#4ade80', // green
  '#38bdf8', // sky blue
  '#a78bfa', // violet
  '#f472b6', // pink
];

interface FrameAnnotationsOverlayProps {
  cyRef: React.RefObject<Core | null>;
  frames: GraphFrame[];
  onUpdateText: (frameId: string, textId: string, updates: Partial<GraphFrameText>) => void;
  onDeleteText: (frameId: string, textId: string) => void;
  onUpdateShape: (frameId: string, shapeId: string, updates: Partial<GraphFrameShape>) => void;
  onDeleteShape: (frameId: string, shapeId: string) => void;
}

type DragMode = 'move' | 'resize-start' | 'resize-end' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';

interface DragState {
  type: 'text' | 'shape';
  frameId: string;
  id: string;
  /** Model-space start position of the mouse */
  startModelX: number;
  startModelY: number;
  /** Original annotation position(s) at drag start */
  origX: number;
  origY: number;
  /** For shapes: original end position */
  origEndX?: number;
  origEndY?: number;
  /** Drag mode: move whole annotation or resize a specific handle */
  mode: DragMode;
}

export const FrameAnnotationsOverlay = memo(function FrameAnnotationsOverlay({
  cyRef,
  frames,
  onUpdateText,
  onDeleteText,
  onUpdateShape,
  onDeleteShape,
}: FrameAnnotationsOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ pan: { x: 0, y: 0 }, zoom: 1 });
  const [editingText, setEditingText] = useState<{ frameId: string; textId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<{
    type: 'text' | 'shape';
    frameId: string;
    id: string;
  } | null>(null);

  // Drag state via ref to avoid stale closures in mouse handlers
  const dragRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Keep transform in ref for drag calculations
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Keep frames in ref for drag callbacks
  const framesRef = useRef(frames);
  framesRef.current = frames;

  // Keep callbacks in refs
  const onUpdateTextRef = useRef(onUpdateText);
  onUpdateTextRef.current = onUpdateText;
  const onUpdateShapeRef = useRef(onUpdateShape);
  onUpdateShapeRef.current = onUpdateShape;

  const getFrameOrigin = useCallback((frame: GraphFrame) => {
    const cy = cyRef.current;
    if (!cy) return frame.position;

    const frameNode = cy.getElementById(`frame:${frame.id}`);
    if (!frameNode || frameNode.length === 0) return frame.position;

    const pos = frameNode.position();
    const width = frameNode.width();
    const height = frameNode.height();

    return {
      x: pos.x - width / 2,
      y: pos.y - height / 2,
    };
  }, [cyRef]);

  // Sync pan/zoom from Cytoscape
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const sync = () => {
      const pan = cy.pan();
      const zoom = cy.zoom();
      setTransform({ pan: { x: pan.x, y: pan.y }, zoom });
    };

    sync();
    cy.on('pan zoom', sync);
    return () => {
      cy.off('pan zoom', sync);
    };
  }, [cyRef]);

  // Deselect annotation when user clicks on Cytoscape canvas (nodes, edges, background)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const deselect = () => setSelectedAnnotation(null);
    cy.on('tap', deselect);
    return () => {
      cy.off('tap', deselect);
    };
  }, [cyRef]);

  /** Convert screen (client) coordinates to model space */
  const screenToModel = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const t = transformRef.current;
    return {
      x: (clientX - rect.left - t.pan.x) / t.zoom,
      y: (clientY - rect.top - t.pan.y) / t.zoom,
    };
  }, []);

  // --- Drag: mousedown on annotation ---
  const handleAnnotationMouseDown = useCallback(
    (
      e: React.MouseEvent,
      type: 'text' | 'shape',
      frameId: string,
      id: string,
    ) => {
      // Only left button
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      setSelectedAnnotation({ type, frameId, id });

      const frame = framesRef.current.find((f) => f.id === frameId);
      if (!frame) return;

      const model = screenToModel(e.clientX, e.clientY);

      if (type === 'text') {
        const text = (frame.texts ?? []).find((t) => t.id === id);
        if (!text) return;
        dragRef.current = {
          type: 'text',
          frameId,
          id,
          startModelX: model.x,
          startModelY: model.y,
          origX: text.x,
          origY: text.y,
          mode: 'move',
        };
      } else {
        const shape = (frame.shapes ?? []).find((s) => s.id === id);
        if (!shape) return;
        dragRef.current = {
          type: 'shape',
          frameId,
          id,
          startModelX: model.x,
          startModelY: model.y,
          origX: shape.startX,
          origY: shape.startY,
          origEndX: shape.endX,
          origEndY: shape.endY,
          mode: 'move',
        };
      }

      setIsDragging(true);
    },
    [screenToModel],
  );

  // --- Resize handle mousedown ---
  const handleResizeHandleMouseDown = useCallback(
    (
      e: React.MouseEvent,
      frameId: string,
      shapeId: string,
      mode: DragMode,
    ) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const frame = framesRef.current.find((f) => f.id === frameId);
      if (!frame) return;
      const shape = (frame.shapes ?? []).find((s) => s.id === shapeId);
      if (!shape) return;

      const model = screenToModel(e.clientX, e.clientY);

      if (mode === 'resize-start') {
        dragRef.current = {
          type: 'shape',
          frameId,
          id: shapeId,
          startModelX: model.x,
          startModelY: model.y,
          origX: shape.startX,
          origY: shape.startY,
          origEndX: shape.endX,
          origEndY: shape.endY,
          mode,
        };
      } else if (mode === 'resize-end') {
        dragRef.current = {
          type: 'shape',
          frameId,
          id: shapeId,
          startModelX: model.x,
          startModelY: model.y,
          origX: shape.endX,
          origY: shape.endY,
          origEndX: shape.startX,
          origEndY: shape.startY,
          mode,
        };
      } else {
        // Rect corner resize: origX/origY = dragged corner, origEndX/origEndY = opposite fixed corner
        let draggedX: number, draggedY: number, fixedX: number, fixedY: number;
        const sx = shape.startX, sy = shape.startY, ex = shape.endX, ey = shape.endY;
        const minX = Math.min(sx, ex), maxX = Math.max(sx, ex);
        const minY = Math.min(sy, ey), maxY = Math.max(sy, ey);
        switch (mode) {
          case 'resize-tl': draggedX = minX; draggedY = minY; fixedX = maxX; fixedY = maxY; break;
          case 'resize-tr': draggedX = maxX; draggedY = minY; fixedX = minX; fixedY = maxY; break;
          case 'resize-bl': draggedX = minX; draggedY = maxY; fixedX = maxX; fixedY = minY; break;
          case 'resize-br': draggedX = maxX; draggedY = maxY; fixedX = minX; fixedY = minY; break;
          default: return;
        }
        dragRef.current = {
          type: 'shape',
          frameId,
          id: shapeId,
          startModelX: model.x,
          startModelY: model.y,
          origX: draggedX,
          origY: draggedY,
          origEndX: fixedX,
          origEndY: fixedY,
          mode,
        };
      }

      setIsDragging(true);
    },
    [screenToModel],
  );

  // --- Drag: mousemove & mouseup on window ---
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const model = screenToModel(e.clientX, e.clientY);
      const dx = model.x - drag.startModelX;
      const dy = model.y - drag.startModelY;

      if (drag.type === 'text') {
        onUpdateTextRef.current(drag.frameId, drag.id, {
          x: drag.origX + dx,
          y: drag.origY + dy,
        });
      } else if (drag.mode === 'move') {
        onUpdateShapeRef.current(drag.frameId, drag.id, {
          startX: drag.origX + dx,
          startY: drag.origY + dy,
          endX: (drag.origEndX ?? 0) + dx,
          endY: (drag.origEndY ?? 0) + dy,
        });
      } else if (drag.mode === 'resize-start') {
        onUpdateShapeRef.current(drag.frameId, drag.id, {
          startX: drag.origX + dx,
          startY: drag.origY + dy,
        });
      } else if (drag.mode === 'resize-end') {
        onUpdateShapeRef.current(drag.frameId, drag.id, {
          endX: drag.origX + dx,
          endY: drag.origY + dy,
        });
      } else {
        // Rect corner resize: dragged corner moves, opposite stays fixed
        const newDraggedX = drag.origX + dx;
        const newDraggedY = drag.origY + dy;
        const fixedX = drag.origEndX ?? 0;
        const fixedY = drag.origEndY ?? 0;
        onUpdateShapeRef.current(drag.frameId, drag.id, {
          startX: Math.min(newDraggedX, fixedX),
          startY: Math.min(newDraggedY, fixedY),
          endX: Math.max(newDraggedX, fixedX),
          endY: Math.max(newDraggedY, fixedY),
        });
      }
    };

    const onMouseUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [screenToModel]);

  const handleTextDoubleClick = useCallback(
    (frameId: string, text: GraphFrameText) => {
      setEditingText({ frameId, textId: text.id });
      setEditValue(text.text);
    },
    [],
  );

  const handleTextBlur = useCallback(() => {
    if (editingText) {
      if (editValue.trim()) {
        onUpdateText(editingText.frameId, editingText.textId, { text: editValue.trim() });
      } else {
        onDeleteText(editingText.frameId, editingText.textId);
      }
    }
    setEditingText(null);
    setEditValue('');
  }, [editingText, editValue, onUpdateText, onDeleteText]);

  // Deselect only on direct SVG background click (not bubbled from children)
  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedAnnotation(null);
    }
  }, []);

  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.target === e.currentTarget) {
      setSelectedAnnotation(null);
    }
  }, []);

  // Delete selected annotation on Delete/Backspace
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selectedAnnotation) return;
      if (editingText) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotation.type === 'text') {
          onDeleteText(selectedAnnotation.frameId, selectedAnnotation.id);
        } else {
          onDeleteShape(selectedAnnotation.frameId, selectedAnnotation.id);
        }
        setSelectedAnnotation(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedAnnotation, editingText, onDeleteText, onDeleteShape]);

  // Compute cursor based on drag mode
  const dragCursor = isDragging
    ? (dragRef.current?.mode === 'move' ? 'grabbing' : 'crosshair')
    : undefined;

  // Handle radius compensated for zoom
  const handleR = 5 / transform.zoom;
  const handleStrokeW = 1.5 / transform.zoom;

  // Compute toolbar position and data for selected annotation
  const toolbarInfo = useMemo(() => {
    if (!selectedAnnotation || editingText) return null;
    const frame = frames.find((f) => f.id === selectedAnnotation.frameId);
    if (!frame) return null;
    const frameOrigin = getFrameOrigin(frame);

    if (selectedAnnotation.type === 'text') {
      const text = (frame.texts ?? []).find((t) => t.id === selectedAnnotation.id);
      if (!text) return null;
      const absX = frameOrigin.x + text.x;
      const absY = frameOrigin.y + text.y;
      return {
        type: 'text' as const,
        // Screen position: model * zoom + pan
        screenX: absX * transform.zoom + transform.pan.x,
        screenY: absY * transform.zoom + transform.pan.y - 10,
        currentColor: text.color ?? '#e2e8f0',
        fontWeight: text.fontWeight ?? 'normal',
      };
    } else {
      const shape = (frame.shapes ?? []).find((s) => s.id === selectedAnnotation.id);
      if (!shape) return null;
      const absX1 = frameOrigin.x + shape.startX;
      const absY1 = frameOrigin.y + shape.startY;
      const absX2 = frameOrigin.x + shape.endX;
      const absY2 = frameOrigin.y + shape.endY;
      const midX = (absX1 + absX2) / 2;
      const topY = Math.min(absY1, absY2);
      return {
        type: 'shape' as const,
        screenX: midX * transform.zoom + transform.pan.x,
        screenY: topY * transform.zoom + transform.pan.y - 10,
        currentColor: shape.color ?? '#94a3b8',
      };
    }
  }, [selectedAnnotation, editingText, frames, transform, getFrameOrigin]);

  const handleColorChange = useCallback((color: string) => {
    if (!selectedAnnotation) return;
    if (selectedAnnotation.type === 'text') {
      onUpdateText(selectedAnnotation.frameId, selectedAnnotation.id, { color });
    } else {
      onUpdateShape(selectedAnnotation.frameId, selectedAnnotation.id, { color });
    }
  }, [selectedAnnotation, onUpdateText, onUpdateShape]);

  const handleToggleBold = useCallback(() => {
    if (!selectedAnnotation || selectedAnnotation.type !== 'text') return;
    const frame = frames.find((f) => f.id === selectedAnnotation.frameId);
    if (!frame) return;
    const text = (frame.texts ?? []).find((t) => t.id === selectedAnnotation.id);
    if (!text) return;
    const newWeight = (text.fontWeight ?? 'normal') === 'bold' ? 'normal' : 'bold';
    onUpdateText(selectedAnnotation.frameId, selectedAnnotation.id, { fontWeight: newWeight });
  }, [selectedAnnotation, frames, onUpdateText]);

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: (isDragging || !!selectedAnnotation || !!editingText) ? 'auto' : 'none',
        zIndex: 3,
        overflow: 'hidden',
        cursor: dragCursor,
      }}
      onMouseDown={handleSvgMouseDown}
      onClick={handleSvgClick}
    >
      <g
        transform={`translate(${transform.pan.x}, ${transform.pan.y}) scale(${transform.zoom})`}
      >
        {frames.map((frame) => {
          const texts = frame.texts ?? [];
          const shapes = frame.shapes ?? [];
          const frameOrigin = getFrameOrigin(frame);

          return (
            <g key={frame.id}>
              {/* Render shapes */}
              {shapes.map((shape) => {
                const absX1 = frameOrigin.x + shape.startX;
                const absY1 = frameOrigin.y + shape.startY;
                const absX2 = frameOrigin.x + shape.endX;
                const absY2 = frameOrigin.y + shape.endY;
                const color = shape.color ?? '#94a3b8';
                const sw = shape.strokeWidth ?? 2;
                const isSelected =
                  selectedAnnotation?.type === 'shape' &&
                  selectedAnnotation.frameId === frame.id &&
                  selectedAnnotation.id === shape.id;

                // Invisible wider hit area for easier clicking/dragging
                const hitWidth = Math.max(sw + 10, 14);

                if (shape.type === 'line') {
                  return (
                    <g key={shape.id}>
                      {/* Hit area */}
                      <line
                        x1={absX1} y1={absY1} x2={absX2} y2={absY2}
                        stroke="transparent" strokeWidth={hitWidth}
                        style={{ pointerEvents: 'stroke', cursor: 'grab' }}
                        onMouseDown={(e) => handleAnnotationMouseDown(e, 'shape', frame.id, shape.id)}
                      />
                      {/* Visual */}
                      <line
                        x1={absX1} y1={absY1} x2={absX2} y2={absY2}
                        stroke={isSelected ? '#ffbe0b' : color}
                        strokeWidth={sw}
                        style={{ pointerEvents: 'none' }}
                      />
                      {/* Resize handles */}
                      {isSelected && (
                        <>
                          <circle
                            cx={absX1} cy={absY1} r={handleR}
                            fill="#38bdf8" stroke="#fff" strokeWidth={handleStrokeW}
                            style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, frame.id, shape.id, 'resize-start')}
                          />
                          <circle
                            cx={absX2} cy={absY2} r={handleR}
                            fill="#38bdf8" stroke="#fff" strokeWidth={handleStrokeW}
                            style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, frame.id, shape.id, 'resize-end')}
                          />
                        </>
                      )}
                    </g>
                  );
                }

                if (shape.type === 'arrow') {
                  const dx = absX2 - absX1;
                  const dy = absY2 - absY1;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  const arrowSize = Math.min(10, len * 0.3);
                  const ux = len > 0 ? dx / len : 0;
                  const uy = len > 0 ? dy / len : 0;
                  const ax = absX2 - ux * arrowSize;
                  const ay = absY2 - uy * arrowSize;
                  const px = -uy * arrowSize * 0.4;
                  const py = ux * arrowSize * 0.4;

                  return (
                    <g key={shape.id}>
                      {/* Hit area */}
                      <line
                        x1={absX1} y1={absY1} x2={absX2} y2={absY2}
                        stroke="transparent" strokeWidth={hitWidth}
                        style={{ pointerEvents: 'stroke', cursor: 'grab' }}
                        onMouseDown={(e) => handleAnnotationMouseDown(e, 'shape', frame.id, shape.id)}
                      />
                      {/* Visual */}
                      <line
                        x1={absX1} y1={absY1} x2={absX2} y2={absY2}
                        stroke={isSelected ? '#ffbe0b' : color}
                        strokeWidth={sw}
                        style={{ pointerEvents: 'none' }}
                      />
                      <polygon
                        points={`${absX2},${absY2} ${ax + px},${ay + py} ${ax - px},${ay - py}`}
                        fill={isSelected ? '#ffbe0b' : color}
                        style={{ pointerEvents: 'none' }}
                      />
                      {/* Resize handles */}
                      {isSelected && (
                        <>
                          <circle
                            cx={absX1} cy={absY1} r={handleR}
                            fill="#38bdf8" stroke="#fff" strokeWidth={handleStrokeW}
                            style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, frame.id, shape.id, 'resize-start')}
                          />
                          <circle
                            cx={absX2} cy={absY2} r={handleR}
                            fill="#38bdf8" stroke="#fff" strokeWidth={handleStrokeW}
                            style={{ pointerEvents: 'auto', cursor: 'crosshair' }}
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, frame.id, shape.id, 'resize-end')}
                          />
                        </>
                      )}
                    </g>
                  );
                }

                if (shape.type === 'rect') {
                  const rx = Math.min(absX1, absX2);
                  const ry = Math.min(absY1, absY2);
                  const rw = Math.abs(absX2 - absX1);
                  const rh = Math.abs(absY2 - absY1);
                  return (
                    <g key={shape.id}>
                      {/* Hit area (filled for easier grabbing) */}
                      <rect
                        x={rx} y={ry} width={rw} height={rh}
                        fill="transparent"
                        stroke="transparent" strokeWidth={hitWidth}
                        style={{ pointerEvents: 'auto', cursor: 'grab' }}
                        onMouseDown={(e) => handleAnnotationMouseDown(e, 'shape', frame.id, shape.id)}
                      />
                      {/* Visual */}
                      <rect
                        x={rx} y={ry} width={rw} height={rh}
                        fill="none"
                        stroke={isSelected ? '#ffbe0b' : color}
                        strokeWidth={sw}
                        rx={4}
                        style={{ pointerEvents: 'none' }}
                      />
                      {/* Resize handles at 4 corners */}
                      {isSelected && (
                        <>
                          <circle
                            cx={rx} cy={ry} r={handleR}
                            fill="#38bdf8" stroke="#fff" strokeWidth={handleStrokeW}
                            style={{ pointerEvents: 'auto', cursor: 'nwse-resize' }}
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, frame.id, shape.id, 'resize-tl')}
                          />
                          <circle
                            cx={rx + rw} cy={ry} r={handleR}
                            fill="#38bdf8" stroke="#fff" strokeWidth={handleStrokeW}
                            style={{ pointerEvents: 'auto', cursor: 'nesw-resize' }}
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, frame.id, shape.id, 'resize-tr')}
                          />
                          <circle
                            cx={rx} cy={ry + rh} r={handleR}
                            fill="#38bdf8" stroke="#fff" strokeWidth={handleStrokeW}
                            style={{ pointerEvents: 'auto', cursor: 'nesw-resize' }}
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, frame.id, shape.id, 'resize-bl')}
                          />
                          <circle
                            cx={rx + rw} cy={ry + rh} r={handleR}
                            fill="#38bdf8" stroke="#fff" strokeWidth={handleStrokeW}
                            style={{ pointerEvents: 'auto', cursor: 'nwse-resize' }}
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, frame.id, shape.id, 'resize-br')}
                          />
                        </>
                      )}
                    </g>
                  );
                }

                return null;
              })}

              {/* Render texts */}
              {texts.map((text) => {
                const absX = frameOrigin.x + text.x;
                const absY = frameOrigin.y + text.y;
                const isEditing =
                  editingText?.frameId === frame.id && editingText?.textId === text.id;
                const isSelected =
                  selectedAnnotation?.type === 'text' &&
                  selectedAnnotation.frameId === frame.id &&
                  selectedAnnotation.id === text.id;

                if (isEditing) {
                  return (
                    <foreignObject
                      key={text.id}
                      x={absX - 4}
                      y={absY - (text.fontSize ?? 14) * 0.6}
                      width={200}
                      height={(text.fontSize ?? 14) + 16}
                      style={{ pointerEvents: 'auto' }}
                    >
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleTextBlur}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleTextBlur();
                          if (e.key === 'Escape') {
                            setEditingText(null);
                            setEditValue('');
                          }
                        }}
                        autoFocus
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          border: '1px solid rgba(56, 189, 248, 0.5)',
                          borderRadius: '4px',
                          color: text.color ?? '#e2e8f0',
                          fontSize: `${text.fontSize ?? 14}px`,
                          padding: '2px 4px',
                          outline: 'none',
                          fontFamily: 'inherit',
                          fontWeight: text.fontWeight === 'bold' ? 'bold' : 'normal',
                        }}
                      />
                    </foreignObject>
                  );
                }

                return (
                  <text
                    key={text.id}
                    x={absX}
                    y={absY}
                    fill={isSelected ? '#ffbe0b' : text.color ?? '#e2e8f0'}
                    fontSize={text.fontSize ?? 14}
                    fontWeight={text.fontWeight === 'bold' ? 'bold' : 'normal'}
                    fontFamily="Arial, sans-serif"
                    style={{ pointerEvents: 'auto', cursor: 'grab', userSelect: 'none' }}
                    onMouseDown={(e) => handleAnnotationMouseDown(e, 'text', frame.id, text.id)}
                    onDoubleClick={() => handleTextDoubleClick(frame.id, text)}
                  >
                    {text.text}
                  </text>
                );
              })}
            </g>
          );
        })}
      </g>

      {/* Floating toolbar for selected annotation */}
      {toolbarInfo && !isDragging && (
        <foreignObject
          x={toolbarInfo.screenX - 100}
          y={toolbarInfo.screenY - 40}
          width={220}
          height={36}
          style={{ pointerEvents: 'auto', overflow: 'visible' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '8px',
              padding: '4px 6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              width: 'fit-content',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {ANNOTATION_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: c === toolbarInfo.currentColor
                    ? '2px solid #fff'
                    : '1px solid rgba(148,163,184,0.4)',
                  background: c,
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  boxSizing: 'border-box',
                }}
                title={c}
              />
            ))}
            {toolbarInfo.type === 'text' && (
              <>
                <div style={{
                  width: 1,
                  height: 18,
                  background: 'rgba(148,163,184,0.3)',
                  margin: '0 2px',
                  flexShrink: 0,
                }} />
                <button
                  onClick={handleToggleBold}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '4px',
                    border: 'none',
                    background: toolbarInfo.fontWeight === 'bold'
                      ? 'rgba(56, 189, 248, 0.3)'
                      : 'transparent',
                    color: toolbarInfo.fontWeight === 'bold'
                      ? '#38bdf8'
                      : '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    padding: 0,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Bold"
                >
                  B
                </button>
              </>
            )}
          </div>
        </foreignObject>
      )}
    </svg>
  );
});
