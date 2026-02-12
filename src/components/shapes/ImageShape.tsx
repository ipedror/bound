// ============================================================
// ImageShape - Image shape component for pasted images
// ============================================================

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Image as KonvaImage, Transformer, Group } from 'react-konva';
import type Konva from 'konva';
import type { Shape } from '../../types/shape';
import type { Position, Dimension } from '../../types/base';
import { SELECTION_COLOR, MIN_SHAPE_SIZE } from '../../constants/canvas';

interface ImageShapeProps {
  shape: Shape;
  isSelected: boolean;
  isDraggable: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Shape>) => void;
  onDragStart?: () => void;
  onDragEnd: (position: Position) => void;
}

export const ImageShape: React.FC<ImageShapeProps> = React.memo(
  ({ shape, isSelected, isDraggable, onSelect, onUpdate, onDragStart, onDragEnd }) => {
    const imageRef = useRef<Konva.Image>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    // Load image from data URL
    useEffect(() => {
      if (!shape.imageSrc) return;
      const img = new window.Image();
      img.onload = () => {
        setImage(img);
      };
      img.src = shape.imageSrc;
    }, [shape.imageSrc]);

    // Attach transformer when selected
    useEffect(() => {
      if (isSelected && imageRef.current && transformerRef.current) {
        transformerRef.current.nodes([imageRef.current]);
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
      const node = imageRef.current;
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

    if (!image) return null;

    return (
      <Group>
        <KonvaImage
          ref={imageRef}
          id={shape.id}
          image={image}
          x={shape.position.x}
          y={shape.position.y}
          width={shape.dimension.width}
          height={shape.dimension.height}
          opacity={shape.style.opacity ?? 1}
          stroke={isSelected ? SELECTION_COLOR : undefined}
          strokeWidth={isSelected ? 2 : 0}
          draggable={isDraggable}
          onClick={onSelect}
          onTap={onSelect}
          onDragStart={onDragStart}
          onDragEnd={handleDragEnd}
          onTransformEnd={handleTransformEnd}
        />
        {isSelected && (
          <Transformer
            ref={transformerRef}
            keepRatio={true}
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

ImageShape.displayName = 'ImageShape';
