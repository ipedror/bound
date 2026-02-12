// ============================================================
// LineShape - Line shape component
// ============================================================

import React, { useRef, useCallback } from 'react';
import { Line, Transformer, Group } from 'react-konva';
import type Konva from 'konva';
import type { Shape } from '../../types/shape';
import type { Position } from '../../types/base';
import { SELECTION_COLOR } from '../../constants/canvas';

interface LineShapeProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Shape>) => void;
  onDragEnd: (position: Position) => void;
}

export const LineShape: React.FC<LineShapeProps> = React.memo(
  ({ shape, isSelected, onSelect, onUpdate, onDragEnd }) => {
    const shapeRef = useRef<Konva.Line>(null);
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
        const points = shape.points ?? [0, 0, 0, 0];
        
        // Update points relative to new position
        onUpdate({
          points: points.map((p, i) => 
            i % 2 === 0 ? p + node.x() : p + node.y()
          ),
        });
        
        // Reset position
        node.position({ x: 0, y: 0 });
        
        onDragEnd({ x: 0, y: 0 });
      },
      [onDragEnd, onUpdate, shape.points],
    );

    const handleTransformEnd = useCallback(() => {
      const node = shapeRef.current;
      if (!node) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      node.scaleX(1);
      node.scaleY(1);

      const points = shape.points ?? [0, 0, 0, 0];
      const scaledPoints = points.map((p, i) => 
        i % 2 === 0 ? p * scaleX : p * scaleY
      );

      onUpdate({ points: scaledPoints });
    }, [onUpdate, shape.points]);

    return (
      <Group>
        <Line
          ref={shapeRef}
          id={shape.id}
          points={[...(shape.points ?? [0, 0, 0, 0])]}
          stroke={isSelected ? SELECTION_COLOR : shape.style.stroke}
          strokeWidth={shape.style.strokeWidth ?? 2}
          opacity={shape.style.opacity ?? 1}
          lineCap="round"
          lineJoin="round"
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={handleDragEnd}
          onTransformEnd={handleTransformEnd}
          hitStrokeWidth={20} // Easier to click
        />
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

LineShape.displayName = 'LineShape';
