// ============================================================
// NotFoundPage Component Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';

describe('NotFoundPage', () => {
  const renderNotFoundPage = () => {
    return render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );
  };

  it('should render without crashing', () => {
    const { container } = renderNotFoundPage();
    expect(container).toBeTruthy();
  });

  it('should display 404 code', () => {
    renderNotFoundPage();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('should display "Page Not Found" title', () => {
    renderNotFoundPage();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('should display description message', () => {
    renderNotFoundPage();
    expect(screen.getByText(/The page you're looking for/)).toBeInTheDocument();
  });

  it('should have a link back to home', () => {
    renderNotFoundPage();
    const homeLink = screen.getByText('← Back to Home');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });
});
