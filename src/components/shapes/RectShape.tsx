// ============================================================
// RectShape - Rectangle shape component
// ============================================================

import React, { useRef, useCallback } from 'react';
import { Rect, Transformer, Group } from 'react-konva';
import type Konva from 'konva';
import type { Shape } from '../../types/shape';
import type { Position, Dimension } from '../../types/base';
import { SELECTION_COLOR, MIN_SHAPE_SIZE } from '../../constants/canvas';

interface RectShapeProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Shape>) => void;
  onDragEnd: (position: Position) => void;
}

export const RectShape: React.FC<RectShapeProps> = React.memo(
  ({ shape, isSelected, onSelect, onUpdate, onDragEnd }) => {
    const shapeRef = useRef<Konva.Rect>(null);
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
        <Rect
          ref={shapeRef}
          id={shape.id}
          x={shape.position.x}
          y={shape.position.y}
          width={shape.dimension.width}
          height={shape.dimension.height}
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
