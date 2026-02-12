// ============================================================
// NodeFactory Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { NodeFactory } from './nodeFactory';
import type { Content } from '../../types/content';
import { ContentStatus } from '../../types/enums';
import { GRAPH_COLORS } from '../../constants/graph';

const createMockContent = (overrides: Partial<Content> = {}): Content => ({
  id: 'content-1',
  areaId: 'area-1',
  title: 'Test Content',
  status: ContentStatus.CLOSED,
  body: { shapes: [] },
  properties: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('NodeFactory', () => {
  describe('createNode', () => {
    it('should create a node from content', () => {
      const content = createMockContent();
      const node = NodeFactory.createNode(content);

      expect(node.data.id).toBe(content.id);
      expect(node.data.contentId).toBe(content.id);
      expect(node.data.areaId).toBe(content.areaId);
      expect(node.data.title).toBe(content.title);
      expect(node.data.label).toBe(content.title);
      expect(node.data.color).toBe(GRAPH_COLORS.nodeDefault);
    });

    it('should include emoji in label if present', () => {
      const content = createMockContent({ emoji: '📝' });
      const node = NodeFactory.createNode(content);

      expect(node.data.label).toBe('📝 Test Content');
      expect(node.data.emoji).toBe('📝');
    });

    it('should use custom color if provided', () => {
      const content = createMockContent();
      const customColor = '#ff0000';
      const node = NodeFactory.createNode(content, customColor);

      expect(node.data.color).toBe(customColor);
    });

    it('should use nodePosition from content if available', () => {
      const content = createMockContent({
        nodePosition: { x: 100, y: 200 },
      });
      const node = NodeFactory.createNode(content);

      expect(node.position).toEqual({ x: 100, y: 200 });
    });

    it('should generate random position if nodePosition not set', () => {
      const content = createMockContent();
      const node = NodeFactory.createNode(content);

      expect(node.position).toBeDefined();
      expect(typeof node.position?.x).toBe('number');
      expect(typeof node.position?.y).toBe('number');
    });
  });

  describe('createNodes', () => {
    it('should create multiple nodes from contents', () => {
      const contents = [
        createMockContent({ id: 'c1', title: 'Content 1' }),
        createMockContent({ id: 'c2', title: 'Content 2' }),
        createMockContent({ id: 'c3', title: 'Content 3' }),
      ];

      const nodes = NodeFactory.createNodes(contents);

      expect(nodes).toHaveLength(3);
      expect(nodes[0].data.id).toBe('c1');
      expect(nodes[1].data.id).toBe('c2');
      expect(nodes[2].data.id).toBe('c3');
    });

    it('should apply custom color to all nodes', () => {
      const contents = [
        createMockContent({ id: 'c1' }),
        createMockContent({ id: 'c2' }),
      ];
      const customColor = '#00ff00';

      const nodes = NodeFactory.createNodes(contents, customColor);

      expect(nodes[0].data.color).toBe(customColor);
      expect(nodes[1].data.color).toBe(customColor);
    });

    it('should return empty array for empty input', () => {
      const nodes = NodeFactory.createNodes([]);
      expect(nodes).toEqual([]);
    });
  });

  describe('randomPosition', () => {
    it('should generate position within expected bounds', () => {
      const pos = NodeFactory.randomPosition();

      expect(pos.x).toBeGreaterThanOrEqual(50);
      expect(pos.x).toBeLessThanOrEqual(850);
      expect(pos.y).toBeGreaterThanOrEqual(50);
      expect(pos.y).toBeLessThanOrEqual(550);
    });

    it('should generate different positions on multiple calls', () => {
      const positions = Array.from({ length: 10 }, () =>
        NodeFactory.randomPosition(),
      );

      // At least some positions should be different
      const uniqueX = new Set(positions.map((p) => Math.round(p.x)));
      const uniqueY = new Set(positions.map((p) => Math.round(p.y)));

      expect(uniqueX.size).toBeGreaterThan(1);
      expect(uniqueY.size).toBeGreaterThan(1);
    });
  });

  describe('updateNodePosition', () => {
    it('should update node position', () => {
      const content = createMockContent();
      const originalNode = NodeFactory.createNode(content);
      const newPosition = { x: 500, y: 600 };

      const updatedNode = NodeFactory.updateNodePosition(
        originalNode,
        newPosition,
      );

      expect(updatedNode.position).toEqual(newPosition);
      expect(updatedNode.data).toEqual(originalNode.data);
    });

    it('should not mutate original node', () => {
      const content = createMockContent({
        nodePosition: { x: 100, y: 100 },
      });
      const originalNode = NodeFactory.createNode(content);
      const originalPosition = { ...originalNode.position };

      NodeFactory.updateNodePosition(originalNode, { x: 999, y: 999 });

      expect(originalNode.position).toEqual(originalPosition);
    });
  });

  describe('updateNodeLabel', () => {
    it('should update node label with title only', () => {
      const content = createMockContent();
      const node = NodeFactory.createNode(content);

      const updatedNode = NodeFactory.updateNodeLabel(node, 'New Title');

      expect(updatedNode.data.label).toBe('New Title');
      expect(updatedNode.data.title).toBe('New Title');
      expect(updatedNode.data.emoji).toBeUndefined();
    });

    it('should update node label with emoji and title', () => {
      const content = createMockContent();
      const node = NodeFactory.createNode(content);

      const updatedNode = NodeFactory.updateNodeLabel(node, 'New Title', '🚀');

      expect(updatedNode.data.label).toBe('🚀 New Title');
      expect(updatedNode.data.title).toBe('New Title');
      expect(updatedNode.data.emoji).toBe('🚀');
    });

    it('should not mutate original node', () => {
      const content = createMockContent({ emoji: '📝' });
      const originalNode = NodeFactory.createNode(content);
      const originalLabel = originalNode.data.label;

      NodeFactory.updateNodeLabel(originalNode, 'Changed');

      expect(originalNode.data.label).toBe(originalLabel);
    });
  });
});
