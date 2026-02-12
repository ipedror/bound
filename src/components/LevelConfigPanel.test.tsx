// ============================================================
// LevelConfigPanel Component Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LevelConfigPanel } from './LevelConfigPanel';
import type { HierarchyLevelConfig } from '../types/graph';
import type { Area } from '../types/area';

describe('LevelConfigPanel', () => {
  const mockOnUpdateConfig = vi.fn();
  const mockOnClose = vi.fn();

  const defaultConfigs: HierarchyLevelConfig[] = [
    { depth: 0, name: 'Chapter', color: '#ff0000', areaScope: 'all', areaIds: [] },
    { depth: 1, name: 'Section', color: '#00ff00', areaScope: 'all', areaIds: [] },
    { depth: 2, name: 'Paragraph', color: '#0000ff', areaScope: 'all', areaIds: [] },
  ];

  const mockAreas: Area[] = [
    {
      id: 'area-1',
      name: 'Area One',
      contentIds: [],
      emoji: '📚',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'area-2',
      name: 'Area Two',
      contentIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    mockOnUpdateConfig.mockClear();
    mockOnClose.mockClear();
  });

  const renderPanel = (overrides?: Partial<{
    configs: HierarchyLevelConfig[];
    maxLevels: number;
    areas: Area[];
  }>) => {
    return render(
      <LevelConfigPanel
        configs={overrides?.configs ?? defaultConfigs}
        maxLevels={overrides?.maxLevels ?? 3}
        areas={overrides?.areas ?? mockAreas}
        onUpdateConfig={mockOnUpdateConfig}
        onClose={mockOnClose}
      />,
    );
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = renderPanel();
      expect(container).toBeTruthy();
    });

    it('should render the title', () => {
      renderPanel();
      expect(screen.getByText('Level Configuration')).toBeInTheDocument();
    });

    it('should render name inputs for active levels', () => {
      renderPanel({ maxLevels: 2 });
      const inputs = screen.getAllByPlaceholderText(/^Level \d+$/);
      expect(inputs).toHaveLength(2);
    });

    it('should display current level names', () => {
      renderPanel();
      expect(screen.getByDisplayValue('Chapter')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Section')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Paragraph')).toBeInTheDocument();
    });

    it('should show only maxLevels configs', () => {
      renderPanel({ maxLevels: 1 });
      expect(screen.getByDisplayValue('Chapter')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Section')).not.toBeInTheDocument();
    });

    it('should render close button', () => {
      renderPanel();
      const closeBtn = screen.getByTitle('Close');
      expect(closeBtn).toBeInTheDocument();
    });

    it('should render area scope buttons for each level', () => {
      renderPanel({ maxLevels: 2 });
      const allBtns = screen.getAllByText('All');
      expect(allBtns.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByTitle('Close'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onUpdateConfig when name is changed', () => {
      renderPanel();
      const input = screen.getByDisplayValue('Chapter');
      fireEvent.change(input, { target: { value: 'Book' } });
      expect(mockOnUpdateConfig).toHaveBeenCalledWith(0, { name: 'Book' });
    });

    it('should call onUpdateConfig when color is changed', () => {
      renderPanel();
      const colorInputs = screen.getAllByTitle(/Color for level/);
      fireEvent.change(colorInputs[0], { target: { value: '#abcdef' } });
      expect(mockOnUpdateConfig).toHaveBeenCalledWith(0, { color: '#abcdef' });
    });

    it('should toggle area scope from all to specific', () => {
      renderPanel({ maxLevels: 1 });
      const allBtn = screen.getByText('All');
      fireEvent.click(allBtn);
      expect(mockOnUpdateConfig).toHaveBeenCalledWith(0, {
        areaScope: 'specific',
        areaIds: [],
      });
    });

    it('should toggle area scope from specific to all', () => {
      const configs: HierarchyLevelConfig[] = [
        { depth: 0, name: 'Level 1', color: '#ff0000', areaScope: 'specific', areaIds: ['area-1'] },
      ];
      renderPanel({ configs, maxLevels: 1 });
      const btn = screen.getByText('1 areas');
      fireEvent.click(btn);
      expect(mockOnUpdateConfig).toHaveBeenCalledWith(0, {
        areaScope: 'all',
        areaIds: [],
      });
    });

    it('should show area checkboxes when scope is specific and expanded', () => {
      const configs: HierarchyLevelConfig[] = [
        { depth: 0, name: 'Level 1', color: '#ff0000', areaScope: 'specific', areaIds: [] },
      ];
      renderPanel({ configs, maxLevels: 1 });
      // Click expand button
      const expandBtn = screen.getByTitle('Select areas');
      fireEvent.click(expandBtn);
      // Should show area names
      expect(screen.getByText('📚 Area One')).toBeInTheDocument();
      expect(screen.getByText('Area Two')).toBeInTheDocument();
    });

    it('should toggle area selection in specific scope', () => {
      const configs: HierarchyLevelConfig[] = [
        { depth: 0, name: 'Level 1', color: '#ff0000', areaScope: 'specific', areaIds: [] },
      ];
      renderPanel({ configs, maxLevels: 1 });
      // Expand area picker
      fireEvent.click(screen.getByTitle('Select areas'));
      // Click on area checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(mockOnUpdateConfig).toHaveBeenCalledWith(0, {
        areaIds: ['area-1'],
      });
    });

    it('should deselect area when already selected', () => {
      const configs: HierarchyLevelConfig[] = [
        { depth: 0, name: 'Level 1', color: '#ff0000', areaScope: 'specific', areaIds: ['area-1'] },
      ];
      renderPanel({ configs, maxLevels: 1 });
      fireEvent.click(screen.getByTitle('Select areas'));
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Deselect area-1
      expect(mockOnUpdateConfig).toHaveBeenCalledWith(0, {
        areaIds: [],
      });
    });

    it('should show "No areas available" when no areas', () => {
      const configs: HierarchyLevelConfig[] = [
        { depth: 0, name: 'Level 1', color: '#ff0000', areaScope: 'specific', areaIds: [] },
      ];
      renderPanel({ configs, maxLevels: 1, areas: [] });
      fireEvent.click(screen.getByTitle('Select areas'));
      expect(screen.getByText('No areas available')).toBeInTheDocument();
    });
  });
});
