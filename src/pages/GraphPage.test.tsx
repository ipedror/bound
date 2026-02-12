// ============================================================
// GraphPage Component Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GraphPage from './GraphPage';
import { useAppStore, resetStore } from '../store/appStore';

// Mock GraphView to avoid cytoscape issues in tests
vi.mock('../components/GraphView', () => ({
  GraphView: ({ height }: { height?: string }) => (
    <div data-testid="graph-view" style={{ height }}>Graph View Mock</div>
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

    it('should render GraphView component', () => {
      renderGraphPage();
      expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    });

    it('should render full-screen container', () => {
      const { container } = renderGraphPage();
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.height).toBe('100vh');
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
