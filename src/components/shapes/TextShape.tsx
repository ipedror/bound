// ============================================================
// TextShape - Text shape component
// ============================================================

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Text, Transformer, Group, Rect } from 'react-konva';
import type Konva from 'konva';
import type { Shape } from '../../types/shape';
import type { Position, Dimension } from '../../types/base';
import { SELECTION_COLOR, MIN_SHAPE_SIZE } from '../../constants/canvas';

interface TextShapeProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Shape>) => void;
  onDragEnd: (position: Position) => void;
  onDoubleClick?: (shapeId: string) => void;
}

export const TextShape: React.FC<TextShapeProps> = React.memo(
  ({ shape, isSelected, onSelect, onUpdate, onDragEnd, onDoubleClick }) => {
    const shapeRef = useRef<Konva.Text>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Attach transformer when selected
    useEffect(() => {
      if (isSelected && shapeRef.current && transformerRef.current && !isEditing) {
        transformerRef.current.nodes([shapeRef.current]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }, [isSelected, isEditing]);

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

      // Reset scale
      node.scaleX(1);
      node.scaleY(1);

      const newDimension: Dimension = {
        width: Math.max(MIN_SHAPE_SIZE, node.width() * scaleX),
        height: Math.max(MIN_SHAPE_SIZE, node.height() * scaleY),
      };

      onUpdate({
        position: { x: node.x(), y: node.y() },
        dimension: newDimension,
        style: {
          ...shape.style,
          fontStyle: {
            fontFamily: shape.style.fontStyle?.fontFamily ?? 'Arial',
            fontSize: Math.round((shape.style.fontStyle?.fontSize ?? 16) * scaleY),
            color: shape.style.fontStyle?.color ?? '#f1f1f1',
          },
        },
      });
    }, [onUpdate, shape.style]);

    const handleDoubleClick = useCallback(() => {
      setIsEditing(true);
      onDoubleClick?.(shape.id);
      
      // Create editable textarea overlay
      const textNode = shapeRef.current;
      if (!textNode) return;

      const stage = textNode.getStage();
      if (!stage) return;

      const container = stage.container();
      const textPosition = textNode.absolutePosition();
      
      // Create textarea
      const textarea = document.createElement('textarea');
      container.appendChild(textarea);

      textarea.value = shape.text ?? '';
      textarea.style.position = 'absolute';
      textarea.style.top = `${textPosition.y}px`;
      textarea.style.left = `${textPosition.x}px`;
      textarea.style.width = `${textNode.width()}px`;
      textarea.style.height = `${textNode.height() + 20}px`;
      textarea.style.fontSize = `${shape.style.fontStyle?.fontSize ?? 16}px`;
      textarea.style.fontFamily = shape.style.fontStyle?.fontFamily ?? 'Arial';
      textarea.style.color = shape.style.fill ?? '#fff';
      textarea.style.background = 'transparent';
      textarea.style.border = `2px solid ${SELECTION_COLOR}`;
      textarea.style.borderRadius = '4px';
      textarea.style.padding = '4px';
      textarea.style.outline = 'none';
      textarea.style.resize = 'none';
      textarea.style.overflow = 'hidden';
      textarea.style.zIndex = '1000';

      textarea.focus();
      textarea.select();

      const handleBlur = () => {
        const newText = textarea.value;
        onUpdate({ text: newText });
        container.removeChild(textarea);
        setIsEditing(false);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleBlur();
        }
        if (e.key === 'Escape') {
          container.removeChild(textarea);
          setIsEditing(false);
        }
      };

      textarea.addEventListener('blur', handleBlur);
      textarea.addEventListener('keydown', handleKeyDown);
    }, [shape, onUpdate, onDoubleClick]);

    const fontStyle = shape.style.fontStyle;

    return (
      <Group>
        {/* Background rect for better selection */}
        <Rect
          x={shape.position.x - 2}
          y={shape.position.y - 2}
          width={shape.dimension.width + 4}
          height={shape.dimension.height + 4}
          fill="transparent"
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={handleDoubleClick}
          onDblTap={handleDoubleClick}
        />
        <Text
          ref={shapeRef}
          id={shape.id}
          x={shape.position.x}
          y={shape.position.y}
          width={shape.dimension.width}
          text={shape.text ?? 'Text'}
          fill={shape.style.fill ?? fontStyle?.color ?? '#f1f1f1'}
          fontSize={fontStyle?.fontSize ?? 16}
          fontFamily={fontStyle?.fontFamily ?? 'Arial'}
          opacity={shape.style.opacity ?? 1}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={handleDoubleClick}
          onDblTap={handleDoubleClick}
          onDragEnd={handleDragEnd}
          onTransformEnd={handleTransformEnd}
          visible={!isEditing}
        />
        {isSelected && !isEditing && (
          <Transformer
            ref={transformerRef}
            enabledAnchors={['middle-left', 'middle-right']}
            rotateEnabled={false}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 20) {
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

TextShape.displayName = 'TextShape';
