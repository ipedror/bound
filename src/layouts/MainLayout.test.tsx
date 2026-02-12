// ============================================================
// MainLayout Component Tests
// ============================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './MainLayout';
import { resetStore } from '../store/appStore';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('MainLayout', () => {
  beforeEach(() => {
    resetStore();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const renderMainLayout = (initialPath: string = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/*" element={<MainLayout />}>
            <Route index element={<div>Home Content</div>} />
            <Route path="graph" element={<div>Graph Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  /** Opens the hamburger menu */
  const openMenu = () => {
    fireEvent.click(screen.getByLabelText('Open menu'));
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderMainLayout();
      expect(container).toBeTruthy();
    });

    it('should render the logo', () => {
      renderMainLayout();
      expect(screen.getByText('Bound')).toBeInTheDocument();
    });

    it('should render navigation links in hamburger menu', () => {
      renderMainLayout();
      openMenu();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Graph')).toBeInTheDocument();
    });

    it('should render export button in hamburger menu', () => {
      renderMainLayout();
      openMenu();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should render import button in hamburger menu', () => {
      renderMainLayout();
      openMenu();
      expect(screen.getByText('Import')).toBeInTheDocument();
    });

    it('should render outlet content', () => {
      renderMainLayout();
      expect(screen.getByText('Home Content')).toBeInTheDocument();
    });

    it('should not cause infinite re-renders', async () => {
      renderMainLayout();
      
      await waitFor(() => {
        expect(screen.getByText('Bound')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Navigation', () => {
    it('should highlight Home link when on home page', () => {
      renderMainLayout('/');
      openMenu();
      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveStyle({ backgroundColor: 'rgba(56, 189, 248, 0.15)' });
    });

    it('should highlight Graph link when on graph page', () => {
      renderMainLayout('/graph');
      openMenu();
      const graphLink = screen.getByText('Graph').closest('a');
      expect(graphLink).toHaveStyle({ backgroundColor: 'rgba(56, 189, 248, 0.15)' });
    });
  });

  describe('Export Modal', () => {
    it('should open export modal when clicking export button', () => {
      renderMainLayout();
      openMenu();
      fireEvent.click(screen.getByText('Export'));
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });

    it('should close export modal when clicking cancel', () => {
      renderMainLayout();
      openMenu();
      fireEvent.click(screen.getByText('Export'));
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Export Data')).not.toBeInTheDocument();
    });

    it('should close export modal when clicking overlay', () => {
      renderMainLayout();
      openMenu();
      fireEvent.click(screen.getByText('Export'));
      
      // Click on the overlay (modal background)
      const overlay = screen.getByText('Export Data').closest('div[style*="position: fixed"]');
      if (overlay) {
        fireEvent.click(overlay);
      }
      
      expect(screen.queryByText('Export Data')).not.toBeInTheDocument();
    });

    it('should trigger download when clicking Download JSON', () => {
      renderMainLayout();
      openMenu();
      fireEvent.click(screen.getByText('Export'));
      
      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      const originalCreateObjectURL = globalThis.URL.createObjectURL;
      const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;
      globalThis.URL.createObjectURL = mockCreateObjectURL;
      globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock document.createElement and related methods
      const mockClick = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      };
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return mockAnchor as unknown as HTMLAnchorElement;
        return originalCreateElement(tag);
      });
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as unknown as HTMLAnchorElement);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as unknown as HTMLAnchorElement);

      fireEvent.click(screen.getByText('Download JSON'));

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      // Restore mocks
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      globalThis.URL.createObjectURL = originalCreateObjectURL;
      globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
    });
  });

  describe('Import Modal', () => {
    it('should open import modal when clicking import button', () => {
      renderMainLayout();
      openMenu();
      fireEvent.click(screen.getByText('Import'));
      expect(screen.getByText('Import Data')).toBeInTheDocument();
    });

    it('should show warning message', () => {
      renderMainLayout();
      openMenu();
      fireEvent.click(screen.getByText('Import'));
      expect(screen.getByText(/Warning: This will replace all existing data/)).toBeInTheDocument();
    });

    it('should close import modal when clicking cancel', () => {
      renderMainLayout();
      openMenu();
      fireEvent.click(screen.getByText('Import'));
      // Get the cancel button in the import modal
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);
      expect(screen.queryByText('Import Data')).not.toBeInTheDocument();
    });

    it('should show error for invalid JSON', () => {
      renderMainLayout();
      openMenu();
      fireEvent.click(screen.getByText('Import'));
      
      const textarea = screen.getByPlaceholderText('Paste JSON data here...');
      fireEvent.change(textarea, { target: { value: 'invalid json' } });
      fireEvent.click(screen.getByText('Import & Replace'));
      
      expect(screen.getByText(/Unexpected token/)).toBeInTheDocument();
    });

    it('should import valid JSON and navigate to home', async () => {
      const validState = {
        version: 1,
        areas: [{ id: 'imported-area', name: 'Imported Area', contentIds: [], createdAt: Date.now(), updatedAt: Date.now() }],
        contents: [],
        links: [],
        currentAreaId: undefined,
        currentContentId: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      renderMainLayout();
      openMenu();
      fireEvent.click(screen.getByText('Import'));
      
      const textarea = screen.getByPlaceholderText('Paste JSON data here...');
      fireEvent.change(textarea, { target: { value: JSON.stringify(validState) } });
      fireEvent.click(screen.getByText('Import & Replace'));
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should disable import button when textarea is empty', () => {
      renderMainLayout();
      openMenu();
      fireEvent.click(screen.getByText('Import'));
      
      const importButton = screen.getByText('Import & Replace');
      expect(importButton).toBeDisabled();
    });
  });
});
