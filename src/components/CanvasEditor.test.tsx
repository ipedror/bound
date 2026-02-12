// ============================================================
// CanvasEditor Component Tests
// ============================================================

import React, { act } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CanvasEditor } from './CanvasEditor';
import { useAppStore, resetStore } from '../store/appStore';
import { ShapeType } from '../types/enums';

// Mock Konva - it doesn't work well in jsdom
vi.mock('react-konva', () => {
  const MockStage = React.forwardRef<unknown, {
    children: React.ReactNode;
    onMouseDown?: (e: unknown) => void;
    onMouseMove?: (e: unknown) => void;
    onMouseUp?: (e: unknown) => void;
  }>(({ children, onMouseDown, onMouseMove, onMouseUp }, ref) => {
    // Create a mock stage object
    const mockStageObject: { getPointerPosition: () => { x: number; y: number }; getStage?: () => unknown } = {
      getPointerPosition: () => ({ x: 100, y: 100 }),
    };
    // Add self-reference for getStage()
    mockStageObject.getStage = () => mockStageObject;

    // Provide ref with getPointerPosition method
    React.useImperativeHandle(ref, () => mockStageObject);

    return (
      <div 
        data-testid="konva-stage" 
        onMouseDown={() => {
          // Simulate Konva event - target is the stage (e.target === e.target.getStage() means clicked on empty space)
          const mockEvent = {
            target: mockStageObject,
          };
          onMouseDown?.(mockEvent);
        }}
        onMouseMove={onMouseMove as React.MouseEventHandler}
        onMouseUp={onMouseUp as React.MouseEventHandler}
      >
        {children}
      </div>
    );
  });
  MockStage.displayName = 'MockStage';

  return {
    Stage: MockStage,
    Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-layer">{children}</div>,
    Rect: () => <div data-testid="konva-rect" />,
    Line: () => <div data-testid="konva-line" />,
    Arrow: () => <div data-testid="konva-arrow" />,
    Ellipse: () => <div data-testid="konva-ellipse" />,
    Text: () => <div data-testid="konva-text" />,
    Transformer: () => <div data-testid="konva-transformer" />,
    Group: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-group">{children}</div>,
  };
});

describe('CanvasEditor', () => {
  let contentId: string;

  beforeEach(() => {
    resetStore();
    const store = useAppStore.getState();
    const areaId = store.createArea('Test Area');
    contentId = store.createContent(areaId, 'Test Content');
  });

  describe('Text Tool', () => {
    it('should show text input when clicking with text tool selected', async () => {
      render(<CanvasEditor contentId={contentId} />);

      // Find and click the text tool button
      const textToolButton = screen.getByTitle('Text');
      fireEvent.click(textToolButton);

      // Click on the canvas stage
      const stage = screen.getByTestId('konva-stage');
      fireEvent.mouseDown(stage);

      // Text input should appear
      await waitFor(() => {
        const textInput = screen.getByPlaceholderText('Enter text...');
        expect(textInput).toBeInTheDocument();
      });
    });

    it('should create text shape when typing and pressing Enter', async () => {
      render(<CanvasEditor contentId={contentId} />);

      // Select text tool
      const textToolButton = screen.getByTitle('Text');
      fireEvent.click(textToolButton);

      // Click on canvas
      const stage = screen.getByTestId('konva-stage');
      fireEvent.mouseDown(stage);

      // Wait for text input to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
      });

      // Type text and press Enter
      const textInput = screen.getByPlaceholderText('Enter text...');
      fireEvent.change(textInput, { target: { value: 'Hello World' } });
      
      // Wait for the input value to be updated in state
      await waitFor(() => {
        expect((textInput as HTMLInputElement).value).toBe('Hello World');
      });
      
      fireEvent.keyDown(textInput, { key: 'Enter', code: 'Enter' });

      // Wait for text input to disappear (and shape to be created)
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Enter text...')).not.toBeInTheDocument();
      });

      // Wait for shape to be added to store
      await waitFor(() => {
        const content = useAppStore.getState().state.contents.find(c => c.id === contentId);
        expect(content?.body.shapes.length).toBeGreaterThanOrEqual(1);
      });
      
      const content = useAppStore.getState().state.contents.find(c => c.id === contentId);
      const textShape = content?.body.shapes.find(s => s.type === ShapeType.TEXT);
      expect(textShape).toBeDefined();
      expect(textShape?.text).toBe('Hello World');
    });

    it('should close text input without creating shape when pressing Escape', async () => {
      render(<CanvasEditor contentId={contentId} />);

      // Select text tool
      const textToolButton = screen.getByTitle('Text');
      fireEvent.click(textToolButton);

      // Click on canvas
      const stage = screen.getByTestId('konva-stage');
      fireEvent.mouseDown(stage);

      // Wait for text input
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
      });

      // Type some text
      const textInput = screen.getByPlaceholderText('Enter text...');
      fireEvent.change(textInput, { target: { value: 'Test' } });

      // Press Escape
      fireEvent.keyDown(textInput, { key: 'Escape', code: 'Escape' });

      // Text input should disappear
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Enter text...')).not.toBeInTheDocument();
      });

      // No shape should be added
      const content = useAppStore.getState().state.contents.find(c => c.id === contentId);
      const textShapes = content?.body.shapes.filter(s => s.type === ShapeType.TEXT) ?? [];
      expect(textShapes.length).toBe(0);
    });

    it('should not create shape with empty text', async () => {
      render(<CanvasEditor contentId={contentId} />);

      // Select text tool
      const textToolButton = screen.getByTitle('Text');
      fireEvent.click(textToolButton);

      // Click on canvas
      const stage = screen.getByTestId('konva-stage');
      fireEvent.mouseDown(stage);

      // Wait for text input
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
      });

      // Press Enter without typing
      const textInput = screen.getByPlaceholderText('Enter text...');
      fireEvent.keyDown(textInput, { key: 'Enter', code: 'Enter' });

      // Text input should disappear
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Enter text...')).not.toBeInTheDocument();
      });

      // No shape should be added
      const content = useAppStore.getState().state.contents.find(c => c.id === contentId);
      const textShapes = content?.body.shapes.filter(s => s.type === ShapeType.TEXT) ?? [];
      expect(textShapes.length).toBe(0);
    });

    it('should allow typing special characters in text', async () => {
      render(<CanvasEditor contentId={contentId} />);

      // Select text tool
      const textToolButton = screen.getByTitle('Text');
      fireEvent.click(textToolButton);

      // Click on canvas
      const stage = screen.getByTestId('konva-stage');
      fireEvent.mouseDown(stage);

      // Wait for text input
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
      });

      // Type text with special characters and press Enter
      const textInput = screen.getByPlaceholderText('Enter text...');
      fireEvent.change(textInput, { target: { value: 'Hello @#$% World!' } });

      // Wait for the input value to be updated in state
      await waitFor(() => {
        expect((textInput as HTMLInputElement).value).toBe('Hello @#$% World!');
      });

      fireEvent.keyDown(textInput, { key: 'Enter', code: 'Enter' });

      // Wait for shape to be created
      await waitFor(() => {
        const content = useAppStore.getState().state.contents.find(c => c.id === contentId);
        const textShape = content?.body.shapes.find(s => s.type === ShapeType.TEXT);
        expect(textShape?.text).toBe('Hello @#$% World!');
      });
    });
  });

  describe('Tool Selection', () => {
    it('should render all tool buttons', () => {
      render(<CanvasEditor contentId={contentId} />);

      expect(screen.getByTitle('Select')).toBeInTheDocument();
      expect(screen.getByTitle('Rectangle')).toBeInTheDocument();
      expect(screen.getByTitle('Ellipse')).toBeInTheDocument();
      expect(screen.getByTitle('Line')).toBeInTheDocument();
      expect(screen.getByTitle('Arrow')).toBeInTheDocument();
      expect(screen.getByTitle('Text')).toBeInTheDocument();
      expect(screen.getByTitle('Eraser')).toBeInTheDocument();
    });

    it('should highlight active tool', () => {
      render(<CanvasEditor contentId={contentId} />);

      const textToolButton = screen.getByTitle('Text');
      fireEvent.click(textToolButton);

      // The button should have aria-pressed="true"
      expect(textToolButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
