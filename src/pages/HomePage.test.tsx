// ============================================================
// HomePage Component Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import { useAppStore, resetStore } from '../store/appStore';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('HomePage', () => {
  beforeEach(() => {
    resetStore();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderHomePage = () => {
    return render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderHomePage();
      expect(container).toBeTruthy();
    });

    it('should render the title', () => {
      renderHomePage();
      expect(screen.getByText('Your Areas')).toBeInTheDocument();
    });

    it('should render the create button', () => {
      renderHomePage();
      expect(screen.getByText('+ New Area')).toBeInTheDocument();
    });

    it('should show empty state when no areas exist', () => {
      renderHomePage();
      expect(screen.getByText(/No areas yet/)).toBeInTheDocument();
    });

    it('should not cause infinite re-renders', async () => {
      renderHomePage();
      
      // Wait a bit and check that the component is stable
      await waitFor(() => {
        expect(screen.getByText('Your Areas')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('With existing areas', () => {
    beforeEach(() => {
      const store = useAppStore.getState();
      store.createArea('Area 1');
      store.createArea('Area 2');
    });

    it('should render existing areas', () => {
      renderHomePage();
      expect(screen.getByText('Area 1')).toBeInTheDocument();
      expect(screen.getByText('Area 2')).toBeInTheDocument();
    });

    it('should show content count for each area', () => {
      const store = useAppStore.getState();
      const areas = store.state.areas;
      store.createContent(areas[0].id, 'Content 1');
      store.createContent(areas[0].id, 'Content 2');
      
      renderHomePage();
      expect(screen.getByText('2 contents')).toBeInTheDocument();
      expect(screen.getByText('0 contents')).toBeInTheDocument();
    });

    it('should navigate to area when clicking on area card', () => {
      renderHomePage();
      const areaCard = screen.getByText('Area 1').closest('div[style]');
      fireEvent.click(areaCard!);
      
      const areaId = useAppStore.getState().state.areas[0].id;
      expect(mockNavigate).toHaveBeenCalledWith(`/area/${areaId}`);
    });
  });

  describe('Create Area Modal', () => {
    it('should open modal when clicking create button', () => {
      renderHomePage();
      fireEvent.click(screen.getByText('+ New Area'));
      expect(screen.getByText('Create New Area')).toBeInTheDocument();
    });

    it('should close modal when clicking cancel', () => {
      renderHomePage();
      fireEvent.click(screen.getByText('+ New Area'));
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Create New Area')).not.toBeInTheDocument();
    });

    it('should show error when trying to create area without name', () => {
      renderHomePage();
      fireEvent.click(screen.getByText('+ New Area'));
      fireEvent.click(screen.getByText('Create'));
      expect(screen.getByText('Area name is required')).toBeInTheDocument();
    });

    it('should create area and navigate when submitting valid name', async () => {
      renderHomePage();
      fireEvent.click(screen.getByText('+ New Area'));
      
      const input = screen.getByPlaceholderText('Area name');
      fireEvent.change(input, { target: { value: 'New Test Area' } });
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
      
      const store = useAppStore.getState();
      const newArea = store.state.areas.find(a => a.name === 'New Test Area');
      expect(newArea).toBeTruthy();
    });

    it('should create area when pressing Enter', async () => {
      renderHomePage();
      fireEvent.click(screen.getByText('+ New Area'));
      
      const input = screen.getByPlaceholderText('Area name');
      fireEvent.change(input, { target: { value: 'Enter Created Area' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Area', () => {
    beforeEach(() => {
      const store = useAppStore.getState();
      store.createArea('Area to Delete');
    });

    it('should delete area when clicking delete button and confirming', () => {
      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderHomePage();
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      expect(screen.queryByText('Area to Delete')).not.toBeInTheDocument();
    });

    it('should not delete area when canceling confirmation', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      renderHomePage();
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
      
      expect(screen.getByText('Area to Delete')).toBeInTheDocument();
    });
  });
});
