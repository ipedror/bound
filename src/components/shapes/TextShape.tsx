// ============================================================
// TextShape - Text shape component
// ============================================================

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Text, Transformer, Group, Rect } from 'react-konva';
import type Konva from 'konva';
import type { Shape } from '../../types/shape';
import type { Position } from '../../types/base';
import { SELECTION_COLOR, MIN_SHAPE_SIZE } from '../../constants/canvas';

interface TextShapeProps {
  shape: Shape;
  isSelected: boolean;  isDraggable: boolean;  onSelect: (e?: Konva.KonvaEventObject<MouseEvent>) => void;
  onUpdate: (updates: Partial<Shape>) => void;
  onDragEnd: (position: Position) => void;
  onDoubleClick?: (shapeId: string) => void;
}

export const TextShape: React.FC<TextShapeProps> = React.memo(
  ({ shape, isSelected, isDraggable, onSelect, onUpdate, onDragEnd, onDoubleClick }) => {
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

      // Reset scale
      node.scaleX(1);
      node.scaleY(1);

      // Update maxWidth to new width so text wraps instead of hiding
      const newMaxWidth = Math.max(MIN_SHAPE_SIZE, node.width() * scaleX);

      // Temporarily set width so Konva can recalculate wrapped height
      node.width(newMaxWidth);
      node.wrap('word');
      const newHeight = node.height();

      onUpdate({
        position: { x: node.x(), y: node.y() },
        dimension: {
          width: newMaxWidth,
          height: Math.max(MIN_SHAPE_SIZE, newHeight),
        },
        maxWidth: newMaxWidth,
      });
    }, [onUpdate]);

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
      textarea.style.width = `${shape.maxWidth && shape.maxWidth > 0 ? shape.maxWidth : textNode.width()}px`;
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
      textarea.style.wordBreak = shape.maxWidth && shape.maxWidth > 0 ? 'break-word' : 'normal';
      textarea.style.whiteSpace = shape.maxWidth && shape.maxWidth > 0 ? 'pre-wrap' : 'nowrap';

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
          onTap={onSelect as unknown as (evt: Konva.KonvaEventObject<TouchEvent>) => void}
          onDblClick={handleDoubleClick}
          onDblTap={handleDoubleClick}
        />
        <Text
          ref={shapeRef}
          id={shape.id}
          x={shape.position.x}
          y={shape.position.y}
          width={shape.maxWidth && shape.maxWidth > 0 ? shape.maxWidth : undefined}
          wrap={shape.maxWidth && shape.maxWidth > 0 ? 'word' : 'none'}
          text={shape.text ?? 'Text'}
          fill={shape.style.fill ?? fontStyle?.color ?? '#f1f1f1'}
          fontSize={fontStyle?.fontSize ?? 16}
          fontFamily={fontStyle?.fontFamily ?? 'Arial'}
          opacity={shape.style.opacity ?? 1}
          draggable={isDraggable}
          onClick={onSelect}
          onTap={onSelect as unknown as (evt: Konva.KonvaEventObject<TouchEvent>) => void}
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
