// ============================================================
// GraphPage Component Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GraphPage from './GraphPage';
import { useAppStore, resetStore } from '../store/appStore';

// Mock GraphView to avoid cytoscape issues in tests
vi.mock('../components/GraphView', () => ({
  GraphView: () => <div data-testid="graph-view">Graph View Mock</div>,
}));

// Mock GraphControls
vi.mock('../components/GraphControls', () => ({
  GraphControls: ({ 
    currentLayout, 
    onChangeLayout, 
    onZoomIn, 
    onZoomOut, 
    onResetView 
  }: {
    currentLayout: string;
    onChangeLayout: (layout: string) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView: () => void;
  }) => (
    <div data-testid="graph-controls">
      <span>Layout: {currentLayout}</span>
      <button onClick={() => onChangeLayout('grid')}>Change Layout</button>
      <button onClick={onZoomIn}>Zoom In</button>
      <button onClick={onZoomOut}>Zoom Out</button>
      <button onClick={onResetView}>Reset</button>
    </div>
  ),
}));

describe('GraphPage', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderGraphPage = () => {
    return render(
      <MemoryRouter>
        <GraphPage />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderGraphPage();
      expect(container).toBeTruthy();
    });

    it('should render the title', () => {
      renderGraphPage();
      expect(screen.getByText('Graph View')).toBeInTheDocument();
    });

    it('should render the subtitle', () => {
      renderGraphPage();
      expect(screen.getByText(/Visualize connections/)).toBeInTheDocument();
    });

    it('should render GraphView component', () => {
      renderGraphPage();
      expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    });

    it('should render GraphControls component', () => {
      renderGraphPage();
      expect(screen.getByTestId('graph-controls')).toBeInTheDocument();
    });

    it('should not cause infinite re-renders', async () => {
      renderGraphPage();
      
      await waitFor(() => {
        expect(screen.getByText('Graph View')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('With data', () => {
    beforeEach(() => {
      const store = useAppStore.getState();
      const areaId = store.createArea('Test Area');
      const content1 = store.createContent(areaId, 'Content 1');
      const content2 = store.createContent(areaId, 'Content 2');
      store.createLink(content1, content2, 'manual');
    });

    it('should render with existing data', () => {
      renderGraphPage();
      expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    });
  });
});
