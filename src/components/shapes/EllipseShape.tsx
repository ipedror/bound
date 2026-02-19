// ============================================================
// EllipseShape - Ellipse/Circle shape component
// ============================================================

import React, { useRef, useCallback, useMemo } from 'react';
import { Ellipse, Shape as KonvaShape, Transformer, Group } from 'react-konva';
import type Konva from 'konva';
import type { Shape } from '../../types/shape';
import type { Position, Dimension } from '../../types/base';
import { SELECTION_COLOR, MIN_SHAPE_SIZE } from '../../constants/canvas';
import { drawRoughEllipse, isHandDrawn, seedFromString } from '../../utils/canvas/roughDraw';

interface EllipseShapeProps {
  shape: Shape;
  isSelected: boolean;
  isDraggable: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Shape>) => void;
  onDragStart?: () => void;
  onDragEnd: (position: Position) => void;
}

export const EllipseShape: React.FC<EllipseShapeProps> = React.memo(
  ({ shape, isSelected, isDraggable, onSelect, onUpdate, onDragStart, onDragEnd }) => {
    const shapeRef = useRef<Konva.Ellipse | Konva.Shape>(null);
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
        if (handDrawn) {
          // KonvaShape uses top-left position directly
          onDragEnd({
            x: node.x(),
            y: node.y(),
          });
        } else {
          // Ellipse position is center, convert to top-left for our model
          const radiusX = shape.dimension.width / 2;
          const radiusY = shape.dimension.height / 2;
          onDragEnd({
            x: node.x() - radiusX,
            y: node.y() - radiusY,
          });
        }
      },
      [onDragEnd, shape.dimension, handDrawn],
    );

    const handleTransformEnd = useCallback(() => {
      const node = shapeRef.current;
      if (!node) return;

      if (handDrawn) {
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

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
        return;
      }

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Reset scale and apply to dimension
      node.scaleX(1);
      node.scaleY(1);

      const ellipseNode = node as unknown as Konva.Ellipse;
      const radiusX = ellipseNode.radiusX() * scaleX;
      const radiusY = ellipseNode.radiusY() * scaleY;

      const newDimension: Dimension = {
        width: Math.max(MIN_SHAPE_SIZE, radiusX * 2),
        height: Math.max(MIN_SHAPE_SIZE, radiusY * 2),
      };

      // Update position to maintain center
      const newPos: Position = {
        x: node.x() - radiusX,
        y: node.y() - radiusY,
      };

      onUpdate({
        position: newPos,
        dimension: newDimension,
      });
    }, [onUpdate, handDrawn]);

    // Ellipse uses center position and radius
    const centerX = shape.position.x + shape.dimension.width / 2;
    const centerY = shape.position.y + shape.dimension.height / 2;
    const radiusX = shape.dimension.width / 2;
    const radiusY = shape.dimension.height / 2;

    // Scene function for hand-drawn rendering
    const sceneFunc = useMemo(() => {
      if (!handDrawn) return undefined;
      return (context: Konva.Context, konvaShape: Konva.Shape) => {
        const ctx = context._context as CanvasRenderingContext2D;
        ctx.save();
        drawRoughEllipse(
          ctx,
          konvaShape.width() / 2,
          konvaShape.height() / 2,
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
        const w = konvaShape.width();
        const h = konvaShape.height();
        context.beginPath();
        context.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        context.closePath();
        context.fillStrokeShape(konvaShape);
      };
    }, [handDrawn]);

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
          <Ellipse
            ref={shapeRef as React.RefObject<Konva.Ellipse>}
            id={shape.id}
            x={centerX}
            y={centerY}
            radiusX={radiusX}
            radiusY={radiusY}
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

EllipseShape.displayName = 'EllipseShape';
