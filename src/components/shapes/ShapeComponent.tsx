// ============================================================
// ShapeComponent - Factory component that renders the correct shape
// ============================================================

import React, { useCallback } from 'react';
import type Konva from 'konva';
import { RectShape } from './RectShape';
import { EllipseShape } from './EllipseShape';
import { LineShape } from './LineShape';
import { ArrowShape } from './ArrowShape';
import { TextShape } from './TextShape';
import { ImageShape } from './ImageShape';
import { ShapeType } from '../../types/enums';
import type { Shape } from '../../types/shape';
import type { Position } from '../../types/base';

interface ShapeComponentProps {
  shape: Shape;
  isSelected: boolean;
  isDraggable: boolean;
  onSelect: (e?: Konva.KonvaEventObject<MouseEvent>) => void;
  onUpdate: (updates: Partial<Shape>) => void;
  onDragStart?: () => void;
  onDragEnd: (position: Position) => void;
  onDoubleClick?: (shapeId: string) => void;
}

export const ShapeComponent: React.FC<ShapeComponentProps> = React.memo(
  ({ shape, isSelected, isDraggable, onSelect, onUpdate, onDragStart, onDragEnd, onDoubleClick }) => {
    const handleUpdate = useCallback(
      (updates: Partial<Shape>) => {
        onUpdate(updates);
      },
      [onUpdate],
    );

    const handleDragEnd = useCallback(
      (position: Position) => {
        onDragEnd(position);
      },
      [onDragEnd],
    );

    switch (shape.type) {
      case ShapeType.RECT:
        return (
          <RectShape
            shape={shape}
            isSelected={isSelected}
            isDraggable={isDraggable}
            onSelect={onSelect}
            onUpdate={handleUpdate}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
          />
        );

      case ShapeType.ELLIPSE:
        return (
          <EllipseShape
            shape={shape}
            isSelected={isSelected}
            isDraggable={isDraggable}
            onSelect={onSelect}
            onUpdate={handleUpdate}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
          />
        );

      case ShapeType.LINE:
        return (
          <LineShape
            shape={shape}
            isSelected={isSelected}
            isDraggable={isDraggable}
            onSelect={onSelect}
            onUpdate={handleUpdate}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
          />
        );

      case ShapeType.ARROW:
        return (
          <ArrowShape
            shape={shape}
            isSelected={isSelected}
            isDraggable={isDraggable}
            onSelect={onSelect}
            onUpdate={handleUpdate}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
          />
        );

      case ShapeType.TEXT:
        return (
          <TextShape
            shape={shape}
            isSelected={isSelected}
            isDraggable={isDraggable}
            onSelect={onSelect}
            onUpdate={handleUpdate}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
            onDoubleClick={onDoubleClick}
          />
        );

      case ShapeType.IMAGE:
        return (
          <ImageShape
            shape={shape}
            isSelected={isSelected}
            isDraggable={isDraggable}
            onSelect={onSelect}
            onUpdate={handleUpdate}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
          />
        );

      default:
        console.warn(`Unknown shape type: ${(shape as Shape).type}`);
        return null;
    }
  },
);

ShapeComponent.displayName = 'ShapeComponent';
