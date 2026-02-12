// ============================================================
// EllipseShape - Ellipse/Circle shape component
// ============================================================

import React, { useRef, useCallback } from 'react';
import { Ellipse, Transformer, Group } from 'react-konva';
import type Konva from 'konva';
import type { Shape } from '../../types/shape';
import type { Position, Dimension } from '../../types/base';
import { SELECTION_COLOR, MIN_SHAPE_SIZE } from '../../constants/canvas';

interface EllipseShapeProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Shape>) => void;
  onDragEnd: (position: Position) => void;
}

export const EllipseShape: React.FC<EllipseShapeProps> = React.memo(
  ({ shape, isSelected, onSelect, onUpdate, onDragEnd }) => {
    const shapeRef = useRef<Konva.Ellipse>(null);
    const transformerRef = useRef<Konva.Transformer>(null);

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
        // Ellipse position is center, convert to top-left for our model
        const radiusX = shape.dimension.width / 2;
        const radiusY = shape.dimension.height / 2;
        onDragEnd({
          x: node.x() - radiusX,
          y: node.y() - radiusY,
        });
      },
      [onDragEnd, shape.dimension],
    );

    const handleTransformEnd = useCallback(() => {
      const node = shapeRef.current;
      if (!node) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Reset scale and apply to dimension
      node.scaleX(1);
      node.scaleY(1);

      const radiusX = node.radiusX() * scaleX;
      const radiusY = node.radiusY() * scaleY;

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
    }, [onUpdate]);

    // Ellipse uses center position and radius
    const centerX = shape.position.x + shape.dimension.width / 2;
    const centerY = shape.position.y + shape.dimension.height / 2;
    const radiusX = shape.dimension.width / 2;
    const radiusY = shape.dimension.height / 2;

    return (
      <Group>
        <Ellipse
          ref={shapeRef}
          id={shape.id}
          x={centerX}
          y={centerY}
          radiusX={radiusX}
          radiusY={radiusY}
          fill={shape.style.fill}
          stroke={isSelected ? SELECTION_COLOR : shape.style.stroke}
          strokeWidth={shape.style.strokeWidth ?? 2}
          opacity={shape.style.opacity ?? 1}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={handleDragEnd}
          onTransformEnd={handleTransformEnd}
        />
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
