// ============================================================
// ContentPage Component Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ContentPage from './ContentPage';
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

// Mock CanvasEditor to avoid canvas rendering issues in tests
vi.mock('../components/CanvasEditor', () => ({
  CanvasEditor: ({ contentId }: { contentId: string }) => (
    <div data-testid="canvas-editor">Canvas Editor for {contentId}</div>
  ),
}));

describe('ContentPage', () => {
  let areaId: string;
  let contentId: string;

  beforeEach(() => {
    resetStore();
    mockNavigate.mockClear();
    areaId = useAppStore.getState().createArea('Test Area');
    contentId = useAppStore.getState().createContent(areaId, 'Test Content');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderContentPage = (id: string = contentId) => {
    return render(
      <MemoryRouter initialEntries={[`/content/${id}`]}>
        <Routes>
          <Route path="/content/:contentId" element={<ContentPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  /** Click the floating Properties toggle button to open its dropdown */
  const openPropsPanel = () => {
    fireEvent.click(screen.getByTitle('Properties'));
  };

  /** Click the floating Links toggle button to open its dropdown */
  const openLinksPanel = () => {
    fireEvent.click(screen.getByTitle('Links'));
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderContentPage();
      expect(container).toBeTruthy();
    });

    it('should render the content title', () => {
      renderContentPage();
      expect(screen.getByRole('heading', { name: 'Test Content' })).toBeInTheDocument();
    });

    it('should render breadcrumb navigation', () => {
      renderContentPage();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Test Area')).toBeInTheDocument();
    });

    it('should render canvas editor', () => {
      renderContentPage();
      expect(screen.getByTestId('canvas-editor')).toBeInTheDocument();
    });

    it('should render properties toggle button', () => {
      renderContentPage();
      expect(screen.getByTitle('Properties')).toBeInTheDocument();
    });

    it('should render links toggle button', () => {
      renderContentPage();
      expect(screen.getByTitle('Links')).toBeInTheDocument();
    });

    it('should show not found for invalid content id', () => {
      renderContentPage('invalid-id');
      expect(screen.getByText('Content not found')).toBeInTheDocument();
    });

    it('should not cause infinite re-renders', async () => {
      renderContentPage();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Test Content' })).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Edit Content Title', () => {
    it('should allow editing title when clicking on it', () => {
      renderContentPage();
      const title = screen.getByRole('heading', { name: 'Test Content' });
      fireEvent.click(title);
      
      const input = screen.getByDisplayValue('Test Content');
      expect(input).toBeInTheDocument();
    });

    it('should save new title when pressing Enter', () => {
      renderContentPage();
      const title = screen.getByRole('heading', { name: 'Test Content' });
      fireEvent.click(title);
      
      const input = screen.getByDisplayValue('Test Content');
      fireEvent.change(input, { target: { value: 'Renamed Content' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      const content = useAppStore.getState().state.contents.find(c => c.id === contentId);
      expect(content?.title).toBe('Renamed Content');
    });
  });

  describe('Properties', () => {
    it('should show "No properties" when opening properties panel', () => {
      renderContentPage();
      openPropsPanel();
      expect(screen.getByText('No properties')).toBeInTheDocument();
    });

    it('should open property modal when clicking add button', () => {
      renderContentPage();
      openPropsPanel();
      const addBtn = screen.getByText('+');
      fireEvent.click(addBtn);
      expect(screen.getByText('Add Property')).toBeInTheDocument();
    });

    it('should close property modal when clicking cancel', () => {
      renderContentPage();
      openPropsPanel();
      fireEvent.click(screen.getByText('+'));
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Add Property')).not.toBeInTheDocument();
    });

    it('should add property when submitting valid name', async () => {
      renderContentPage();
      openPropsPanel();
      fireEvent.click(screen.getByText('+'));
      
      const input = screen.getByPlaceholderText('Property name');
      fireEvent.change(input, { target: { value: 'Test Property' } });
      fireEvent.click(screen.getByText('Add'));

      await waitFor(() => {
        expect(screen.getByText('Test Property')).toBeInTheDocument();
      });
    });
  });

  describe('Links', () => {
    it('should show "No links" when opening links panel', () => {
      renderContentPage();
      openLinksPanel();
      expect(screen.getByText('No links')).toBeInTheDocument();
    });

    it('should open link modal when clicking add button', () => {
      // Create another content to link to
      useAppStore.getState().createContent(areaId, 'Other Content');
      
      renderContentPage();
      openLinksPanel();
      const addBtn = screen.getByText('+');
      fireEvent.click(addBtn);
      expect(screen.getByText('Link to Content')).toBeInTheDocument();
    });

    it('should show available contents to link', () => {
      useAppStore.getState().createContent(areaId, 'Linkable Content');
      
      renderContentPage();
      openLinksPanel();
      fireEvent.click(screen.getByText('+'));
      
      expect(screen.getByText('Linkable Content')).toBeInTheDocument();
    });

    it('should create link when selecting a content', async () => {
      useAppStore.getState().createContent(areaId, 'Linkable Content');
      
      renderContentPage();
      openLinksPanel();
      fireEvent.click(screen.getByText('+'));
      
      const linkOption = screen.getByText('Linkable Content');
      fireEvent.click(linkOption);

      await waitFor(() => {
        const store = useAppStore.getState();
        const links = store.state.links.filter(
          l => l.fromContentId === contentId || l.toContentId === contentId
        );
        expect(links.length).toBe(1);
      });
    });
  });

  describe('With existing links', () => {
    let otherContentId: string;

    beforeEach(() => {
      otherContentId = useAppStore.getState().createContent(areaId, 'Linked Content');
      useAppStore.getState().createLink(contentId, otherContentId, 'manual');
    });

    it('should display linked content when opening links panel', () => {
      renderContentPage();
      openLinksPanel();
      expect(screen.getByText('Linked Content')).toBeInTheDocument();
    });

    it('should navigate to linked content when clicking on it', () => {
      renderContentPage();
      openLinksPanel();
      const linkedContent = screen.getByText('Linked Content');
      fireEvent.click(linkedContent);
      
      expect(mockNavigate).toHaveBeenCalledWith(`/content/${otherContentId}`);
    });

    it('should delete link when clicking remove button', () => {
      renderContentPage();
      openLinksPanel();
      // Get the remove button in the links section
      const removeButtons = screen.getAllByText('×');
      const linkRemoveButton = removeButtons[removeButtons.length - 1];
      fireEvent.click(linkRemoveButton);
      
      const store = useAppStore.getState();
      const links = store.state.links.filter(
        l => l.fromContentId === contentId || l.toContentId === contentId
      );
      expect(links.length).toBe(0);
    });
  });
});
