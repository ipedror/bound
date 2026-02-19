// ============================================================
// RectShape - Rectangle shape component
// ============================================================

import React, { useRef, useCallback, useMemo } from 'react';
import { Rect, Shape as KonvaShape, Transformer, Group } from 'react-konva';
import type Konva from 'konva';
import type { Shape } from '../../types/shape';
import type { Position, Dimension } from '../../types/base';
import { SELECTION_COLOR, MIN_SHAPE_SIZE } from '../../constants/canvas';
import { drawRoughRect, isHandDrawn, seedFromString } from '../../utils/canvas/roughDraw';

interface RectShapeProps {
  shape: Shape;
  isSelected: boolean;
  isDraggable: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Shape>) => void;
  onDragStart?: () => void;
  onDragEnd: (position: Position) => void;
}

export const RectShape: React.FC<RectShapeProps> = React.memo(
  ({ shape, isSelected, isDraggable, onSelect, onUpdate, onDragStart, onDragEnd }) => {
    const shapeRef = useRef<Konva.Rect | Konva.Shape>(null);
    const transformerRef = useRef<Konva.Transformer>(null);

    const handDrawn = isHandDrawn(shape.style.roughness);

    // Scene function for hand-drawn rendering
    const sceneFunc = useMemo(() => {
      if (!handDrawn) return undefined;
      return (context: Konva.Context, konvaShape: Konva.Shape) => {
        const ctx = context._context as CanvasRenderingContext2D;
        ctx.save();
        drawRoughRect(
          ctx,
          0,
          0,
          konvaShape.width(),
          konvaShape.height(),
          shape.style.fill,
          isSelected ? SELECTION_COLOR : shape.style.stroke,
          shape.style.strokeWidth ?? 2,
          shape.style.roughness ?? 1,
          seedFromString(shape.id),
        );
        ctx.restore();
      };
    }, [handDrawn, shape.style.fill, shape.style.stroke, shape.style.strokeWidth, shape.style.roughness, isSelected]);

    const hitFunc = useMemo(() => {
      if (!handDrawn) return undefined;
      return (context: Konva.Context, konvaShape: Konva.Shape) => {
        context.beginPath();
        context.rect(0, 0, konvaShape.width(), konvaShape.height());
        context.closePath();
        context.fillStrokeShape(konvaShape);
      };
    }, [handDrawn]);

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
        onDragEnd({
          x: node.x(),
          y: node.y(),
        });
      },
      [onDragEnd],
    );

    const handleTransformEnd = useCallback(() => {
      const node = shapeRef.current;
      if (!node) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Reset scale and apply to dimension
      node.scaleX(1);
      node.scaleY(1);

      const newDimension: Dimension = {
        width: Math.max(MIN_SHAPE_SIZE, node.width() * scaleX),
        height: Math.max(MIN_SHAPE_SIZE, node.height() * scaleY),
      };

      onUpdate({
        position: { x: node.x(), y: node.y() },
        dimension: newDimension,
      });
    }, [onUpdate]);

    return (
      <Group>
        {handDrawn ? (
          <KonvaShape
            ref={shapeRef as React.RefObject<Konva.Shape>}
            id={shape.id}
            x={shape.position.x}
            y={shape.position.y}
            width={shape.dimension.width}
            height={shape.dimension.height}
            opacity={shape.style.opacity ?? 1}
            fill="#000"
            stroke="#000"
            strokeWidth={1}
            draggable={isDraggable}
            onClick={onSelect}
            onTap={onSelect}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
            onTransformEnd={handleTransformEnd}
            sceneFunc={sceneFunc}
            hitFunc={hitFunc}
          />
        ) : (
          <Rect
            ref={shapeRef as React.RefObject<Konva.Rect>}
            id={shape.id}
            x={shape.position.x}
            y={shape.position.y}
            width={shape.dimension.width}
            height={shape.dimension.height}
            fill={shape.style.fill}
            stroke={isSelected ? SELECTION_COLOR : shape.style.stroke}
            strokeWidth={shape.style.strokeWidth ?? 2}
            opacity={shape.style.opacity ?? 1}
            draggable={isDraggable}
            onClick={onSelect}
            onTap={onSelect}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
            onTransformEnd={handleTransformEnd}
          />
        )}
        {isSelected && (
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize
              if (newBox.width < MIN_SHAPE_SIZE || newBox.height < MIN_SHAPE_SIZE) {
                return oldBox;
              }
              return newBox;
            }}
          />
        )}
      </Group>
    );
  },
);

RectShape.displayName = 'RectShape';
