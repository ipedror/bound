// ============================================================
// ArrowShape - Arrow shape component
// ============================================================

import React, { useRef, useCallback, useMemo } from 'react';
import { Arrow, Shape as KonvaShape, Transformer, Group } from 'react-konva';
import type Konva from 'konva';
import type { Shape } from '../../types/shape';
import type { Position } from '../../types/base';
import { SELECTION_COLOR } from '../../constants/canvas';
import { drawRoughArrow, isHandDrawn, seedFromString } from '../../utils/canvas/roughDraw';

interface ArrowShapeProps {
  shape: Shape;
  isSelected: boolean;
  isDraggable: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Shape>) => void;
  onDragStart?: () => void;
  onDragEnd: (position: Position) => void;
}

export const ArrowShape: React.FC<ArrowShapeProps> = React.memo(
  ({ shape, isSelected, isDraggable, onSelect, onUpdate, onDragStart, onDragEnd }) => {
    const shapeRef = useRef<Konva.Arrow | Konva.Shape>(null);
    const transformerRef = useRef<Konva.Transformer>(null);

    const handDrawn = isHandDrawn(shape.style.roughness);

    // Attach transformer when selected
    React.useEffect(() => {
      if (isSelected && shapeRef.current && transformerRef.current) {
        transformerRef.current.nodes([shapeRef.current]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }, [isSelected]);

    const handleDragEnd = useCallback(
      (e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        const points = shape.points ?? [0, 0, 0, 0];

        if (handDrawn) {
          const xs = points.filter((_, i) => i % 2 === 0);
          const ys = points.filter((_, i) => i % 2 === 1);
          const originX = Math.min(...xs);
          const originY = Math.min(...ys);
          const dx = node.x() - originX;
          const dy = node.y() - originY;

          onUpdate({
            points: points.map((p, i) => (i % 2 === 0 ? p + dx : p + dy)),
          });

          node.position({ x: originX, y: originY });
          onDragEnd({ x: 0, y: 0 });
          return;
        }

        // Normal Arrow uses x/y as drag delta (starts at 0,0)
        onUpdate({
          points: points.map((p, i) => (i % 2 === 0 ? p + node.x() : p + node.y())),
        });

        node.position({ x: 0, y: 0 });
        onDragEnd({ x: 0, y: 0 });
      },
      [onDragEnd, onUpdate, shape.points, handDrawn],
    );

    const handleTransformEnd = useCallback(() => {
      const node = shapeRef.current;
      if (!node) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      node.scaleX(1);
      node.scaleY(1);

      const points = shape.points ?? [0, 0, 0, 0];
      const xs = points.filter((_, i) => i % 2 === 0);
      const ys = points.filter((_, i) => i % 2 === 1);
      const originX = handDrawn ? Math.min(...xs) : 0;
      const originY = handDrawn ? Math.min(...ys) : 0;

      const scaledPoints = points.map((p, i) => {
        if (i % 2 === 0) {
          return originX + (p - originX) * scaleX;
        }
        return originY + (p - originY) * scaleY;
      });

      onUpdate({ points: scaledPoints });
    }, [onUpdate, shape.points, handDrawn]);

    // Compute bounding box of points for hand-drawn mode
    const pts = shape.points ?? [0, 0, 0, 0];
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);

    // Scene function for hand-drawn rendering
    const sceneFunc = useMemo(() => {
      if (!handDrawn) return undefined;
      return (context: Konva.Context) => {
        const ctx = context._context as CanvasRenderingContext2D;
        ctx.save();
        const localPts = pts.map((p, i) => (i % 2 === 0 ? p - minX : p - minY));
        drawRoughArrow(
          ctx,
          localPts,
          isSelected ? SELECTION_COLOR : shape.style.stroke,
          shape.style.strokeWidth ?? 2,
          shape.style.roughness ?? 1,
          10,
          10,
          seedFromString(shape.id),
        );
        ctx.restore();
      };
    }, [handDrawn, pts, minX, minY, shape.style.stroke, shape.style.strokeWidth, shape.style.roughness, isSelected]);

    const hitFunc = useMemo(() => {
      if (!handDrawn) return undefined;
      return (context: Konva.Context, konvaShape: Konva.Shape) => {
        const localPts = pts.map((p, i) => (i % 2 === 0 ? p - minX : p - minY));
        if (localPts.length < 4) return;

        context.beginPath();
        context.moveTo(localPts[0], localPts[1]);
        for (let i = 2; i < localPts.length; i += 2) {
          context.lineTo(localPts[i], localPts[i + 1]);
        }
        context.strokeShape(konvaShape);
      };
    }, [handDrawn, pts, minX, minY]);

    const hitStrokeWidth = Math.max(20, (shape.style.strokeWidth ?? 2) * 4);

    return (
      <Group>
        {handDrawn ? (
          <KonvaShape
            ref={shapeRef as React.RefObject<Konva.Shape>}
            id={shape.id}
            x={minX}
            y={minY}
            width={Math.max(...xs) - minX || 1}
            height={Math.max(...ys) - minY || 1}
            opacity={shape.style.opacity ?? 1}
            draggable={isDraggable}
            onClick={onSelect}
            onTap={onSelect}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
            onTransformEnd={handleTransformEnd}
            sceneFunc={sceneFunc}
            hitFunc={hitFunc}
            stroke="#000"
            strokeWidth={hitStrokeWidth}
            hitStrokeWidth={hitStrokeWidth}
          />
        ) : (
          <Arrow
            ref={shapeRef as React.RefObject<Konva.Arrow>}
            id={shape.id}
            points={[...(shape.points ?? [0, 0, 0, 0])]}
            fill={shape.style.stroke}
            stroke={isSelected ? SELECTION_COLOR : shape.style.stroke}
            strokeWidth={shape.style.strokeWidth ?? 2}
            opacity={shape.style.opacity ?? 1}
            pointerLength={10}
            pointerWidth={10}
            lineCap="round"
            lineJoin="round"
            draggable={isDraggable}
            onClick={onSelect}
            onTap={onSelect}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
            onTransformEnd={handleTransformEnd}
            hitStrokeWidth={20}
          />
        )}
        {isSelected && (
          <Transformer
            ref={transformerRef}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            rotateEnabled={false}
          />
        )}
      </Group>
    );
  },
);

ArrowShape.displayName = 'ArrowShape';
