// ============================================================
// AreaPage Component Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AreaPage from './AreaPage';
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

describe('AreaPage', () => {
  let areaId: string;

  beforeEach(() => {
    resetStore();
    mockNavigate.mockClear();
    areaId = useAppStore.getState().createArea('Test Area');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderAreaPage = (id: string = areaId) => {
    return render(
      <MemoryRouter initialEntries={[`/area/${id}`]}>
        <Routes>
          <Route path="/area/:areaId" element={<AreaPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderAreaPage();
      expect(container).toBeTruthy();
    });

    it('should render the area name', () => {
      renderAreaPage();
      // Use getByRole to get the h1 heading specifically
      expect(screen.getByRole('heading', { name: 'Test Area' })).toBeInTheDocument();
    });

    it('should render breadcrumb navigation', () => {
      renderAreaPage();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('should render create content button', () => {
      renderAreaPage();
      expect(screen.getByText('+ New Content')).toBeInTheDocument();
    });

    it('should show empty state when no contents exist', () => {
      renderAreaPage();
      expect(screen.getByText(/No contents yet/)).toBeInTheDocument();
    });

    it('should show not found for invalid area id', () => {
      renderAreaPage('invalid-id');
      expect(screen.getByText('Area not found')).toBeInTheDocument();
    });

    it('should not cause infinite re-renders', async () => {
      renderAreaPage();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Test Area' })).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('With existing contents', () => {
    beforeEach(() => {
      const store = useAppStore.getState();
      store.createContent(areaId, 'Content 1');
      store.createContent(areaId, 'Content 2');
    });

    it('should render existing contents', () => {
      renderAreaPage();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should show link count for each content', () => {
      renderAreaPage();
      // Both should show 0 links initially
      expect(screen.getAllByText('0 links').length).toBeGreaterThanOrEqual(2);
    });

    it('should navigate to content when clicking on content card', () => {
      renderAreaPage();
      const contentCard = screen.getByText('Content 1').closest('div[style]');
      fireEvent.click(contentCard!);
      
      const contents = useAppStore.getState().state.contents;
      const content1 = contents.find(c => c.title === 'Content 1');
      expect(mockNavigate).toHaveBeenCalledWith(`/content/${content1?.id}`);
    });
  });

  describe('Edit Area Name', () => {
    it('should allow editing area name when clicking on title', () => {
      renderAreaPage();
      const title = screen.getByRole('heading', { name: 'Test Area' });
      fireEvent.click(title);
      
      const input = screen.getByDisplayValue('Test Area');
      expect(input).toBeInTheDocument();
    });

    it('should save new name when pressing Enter', () => {
      renderAreaPage();
      const title = screen.getByRole('heading', { name: 'Test Area' });
      fireEvent.click(title);
      
      const input = screen.getByDisplayValue('Test Area');
      fireEvent.change(input, { target: { value: 'Renamed Area' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      const area = useAppStore.getState().state.areas.find(a => a.id === areaId);
      expect(area?.name).toBe('Renamed Area');
    });

    it('should save new name on blur', () => {
      renderAreaPage();
      const title = screen.getByRole('heading', { name: 'Test Area' });
      fireEvent.click(title);
      
      const input = screen.getByDisplayValue('Test Area');
      fireEvent.change(input, { target: { value: 'Blurred Area' } });
      fireEvent.blur(input);
      
      const area = useAppStore.getState().state.areas.find(a => a.id === areaId);
      expect(area?.name).toBe('Blurred Area');
    });
  });

  describe('Create Content Modal', () => {
    it('should open modal when clicking create button', () => {
      renderAreaPage();
      fireEvent.click(screen.getByText('+ New Content'));
      expect(screen.getByText('Create New Content')).toBeInTheDocument();
    });

    it('should close modal when clicking cancel', () => {
      renderAreaPage();
      fireEvent.click(screen.getByText('+ New Content'));
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Create New Content')).not.toBeInTheDocument();
    });

    it('should show error when trying to create content without name', () => {
      renderAreaPage();
      fireEvent.click(screen.getByText('+ New Content'));
      fireEvent.click(screen.getByText('Create'));
      expect(screen.getByText('Content name is required')).toBeInTheDocument();
    });

    it('should create content and navigate when submitting valid name', async () => {
      renderAreaPage();
      fireEvent.click(screen.getByText('+ New Content'));
      
      const input = screen.getByPlaceholderText('Content name');
      fireEvent.change(input, { target: { value: 'New Test Content' } });
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
      
      const store = useAppStore.getState();
      const newContent = store.state.contents.find(c => c.title === 'New Test Content');
      expect(newContent).toBeTruthy();
    });
  });

  describe('Delete Content', () => {
    beforeEach(() => {
      const store = useAppStore.getState();
      store.createContent(areaId, 'Content to Delete');
    });

    it('should delete content when clicking delete button and confirming', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderAreaPage();
      const deleteButton = screen.getByText('×');
      fireEvent.click(deleteButton);
      
      expect(screen.queryByText('Content to Delete')).not.toBeInTheDocument();
    });

    it('should not delete content when canceling confirmation', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      renderAreaPage();
      const deleteButton = screen.getByText('×');
      fireEvent.click(deleteButton);
      
      expect(screen.getByText('Content to Delete')).toBeInTheDocument();
    });
  });
});
