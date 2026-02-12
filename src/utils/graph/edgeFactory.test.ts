// ============================================================
// EdgeFactory Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { EdgeFactory } from './edgeFactory';
import type { Link } from '../../types/link';
import { LinkType, EdgeLineStyle, EdgeArrowMode } from '../../types/enums';

const createMockLink = (overrides: Partial<Link> = {}): Link => ({
  id: 'link-1',
  fromContentId: 'content-1',
  toContentId: 'content-2',
  type: LinkType.MANUAL,
  createdAt: Date.now(),
  ...overrides,
});

describe('EdgeFactory', () => {
  describe('createEdge', () => {
    it('should create an edge from a manual link', () => {
      const link = createMockLink();
      const edge = EdgeFactory.createEdge(link);

      expect(edge.data.id).toBe(link.id);
      expect(edge.data.source).toBe(link.fromContentId);
      expect(edge.data.target).toBe(link.toContentId);
      expect(edge.data.linkId).toBe(link.id);
      expect(edge.data.linkType).toBe(LinkType.MANUAL);
    });

    it('should create an edge from an auto link', () => {
      const link = createMockLink({
        type: LinkType.AUTO,
        propertyId: 'prop-1',
      });
      const edge = EdgeFactory.createEdge(link);

      expect(edge.data.linkType).toBe(LinkType.AUTO);
    });

    it('should pass color to edge data when set', () => {
      const link = createMockLink({ color: '#ff0000' });
      const edge = EdgeFactory.createEdge(link);
      expect(edge.data.color).toBe('#ff0000');
    });

    it('should pass lineStyle to edge data when set', () => {
      const link = createMockLink({ lineStyle: EdgeLineStyle.DASHED });
      const edge = EdgeFactory.createEdge(link);
      expect(edge.data.lineStyle).toBe('dashed');
    });

    it('should pass arrowMode to edge data when set', () => {
      const link = createMockLink({ arrowMode: EdgeArrowMode.BOTH });
      const edge = EdgeFactory.createEdge(link);
      expect(edge.data.arrowMode).toBe('both');
    });

    it('should leave style fields undefined when not set on link', () => {
      const link = createMockLink();
      const edge = EdgeFactory.createEdge(link);
      expect(edge.data.color).toBeUndefined();
      expect(edge.data.lineStyle).toBeUndefined();
      expect(edge.data.arrowMode).toBeUndefined();
    });

    it('should pass all style fields together', () => {
      const link = createMockLink({
        color: '#00ff00',
        lineStyle: EdgeLineStyle.SOLID,
        arrowMode: EdgeArrowMode.FORWARD,
      });
      const edge = EdgeFactory.createEdge(link);
      expect(edge.data.color).toBe('#00ff00');
      expect(edge.data.lineStyle).toBe('solid');
      expect(edge.data.arrowMode).toBe('forward');
    });
  });

  describe('createEdges', () => {
    it('should create multiple edges from links', () => {
      const links = [
        createMockLink({ id: 'l1', fromContentId: 'c1', toContentId: 'c2' }),
        createMockLink({ id: 'l2', fromContentId: 'c2', toContentId: 'c3' }),
        createMockLink({ id: 'l3', fromContentId: 'c3', toContentId: 'c1' }),
      ];

      const edges = EdgeFactory.createEdges(links);

      expect(edges).toHaveLength(3);
      expect(edges[0].data.id).toBe('l1');
      expect(edges[1].data.id).toBe('l2');
      expect(edges[2].data.id).toBe('l3');
    });

    it('should return empty array for empty input', () => {
      const edges = EdgeFactory.createEdges([]);
      expect(edges).toEqual([]);
    });
  });

  describe('filterValidEdges', () => {
    it('should filter edges to only include those with valid endpoints', () => {
      const links = [
        createMockLink({ id: 'l1', fromContentId: 'c1', toContentId: 'c2' }),
        createMockLink({ id: 'l2', fromContentId: 'c2', toContentId: 'c3' }),
        createMockLink({ id: 'l3', fromContentId: 'c3', toContentId: 'c4' }),
      ];
      const edges = EdgeFactory.createEdges(links);
      const validNodeIds = new Set(['c1', 'c2', 'c3']);

      const filtered = EdgeFactory.filterValidEdges(edges, validNodeIds);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].data.id).toBe('l1');
      expect(filtered[1].data.id).toBe('l2');
    });

    it('should return empty array if no edges are valid', () => {
      const links = [
        createMockLink({ id: 'l1', fromContentId: 'c1', toContentId: 'c2' }),
      ];
      const edges = EdgeFactory.createEdges(links);
      const validNodeIds = new Set(['c3', 'c4']);

      const filtered = EdgeFactory.filterValidEdges(edges, validNodeIds);

      expect(filtered).toHaveLength(0);
    });

    it('should require both source and target to be valid', () => {
      const links = [
        createMockLink({ id: 'l1', fromContentId: 'c1', toContentId: 'c2' }),
      ];
      const edges = EdgeFactory.createEdges(links);

      // Only source valid
      const filtered1 = EdgeFactory.filterValidEdges(edges, new Set(['c1']));
      expect(filtered1).toHaveLength(0);

      // Only target valid
      const filtered2 = EdgeFactory.filterValidEdges(edges, new Set(['c2']));
      expect(filtered2).toHaveLength(0);

      // Both valid
      const filtered3 = EdgeFactory.filterValidEdges(
        edges,
        new Set(['c1', 'c2']),
      );
      expect(filtered3).toHaveLength(1);
    });
  });

  describe('getConnectedEdges', () => {
    it('should return edges connected to a node (as source or target)', () => {
      const links = [
        createMockLink({ id: 'l1', fromContentId: 'c1', toContentId: 'c2' }),
        createMockLink({ id: 'l2', fromContentId: 'c2', toContentId: 'c3' }),
        createMockLink({ id: 'l3', fromContentId: 'c4', toContentId: 'c1' }),
      ];
      const edges = EdgeFactory.createEdges(links);

      const connected = EdgeFactory.getConnectedEdges(edges, 'c1');

      expect(connected).toHaveLength(2);
      expect(connected.map((e) => e.data.id)).toContain('l1');
      expect(connected.map((e) => e.data.id)).toContain('l3');
    });

    it('should return empty array if node has no connections', () => {
      const links = [
        createMockLink({ id: 'l1', fromContentId: 'c1', toContentId: 'c2' }),
      ];
      const edges = EdgeFactory.createEdges(links);

      const connected = EdgeFactory.getConnectedEdges(edges, 'c3');

      expect(connected).toHaveLength(0);
    });
  });

  describe('getIncomingEdges', () => {
    it('should return only edges where node is target', () => {
      const links = [
        createMockLink({ id: 'l1', fromContentId: 'c1', toContentId: 'c2' }),
        createMockLink({ id: 'l2', fromContentId: 'c2', toContentId: 'c3' }),
        createMockLink({ id: 'l3', fromContentId: 'c1', toContentId: 'c3' }),
      ];
      const edges = EdgeFactory.createEdges(links);

      const incoming = EdgeFactory.getIncomingEdges(edges, 'c3');

      expect(incoming).toHaveLength(2);
      expect(incoming.map((e) => e.data.id)).toContain('l2');
      expect(incoming.map((e) => e.data.id)).toContain('l3');
    });

    it('should return empty array if node has no incoming edges', () => {
      const links = [
        createMockLink({ id: 'l1', fromContentId: 'c1', toContentId: 'c2' }),
      ];
      const edges = EdgeFactory.createEdges(links);

      const incoming = EdgeFactory.getIncomingEdges(edges, 'c1');

      expect(incoming).toHaveLength(0);
    });
  });

  describe('getOutgoingEdges', () => {
    it('should return only edges where node is source', () => {
      const links = [
        createMockLink({ id: 'l1', fromContentId: 'c1', toContentId: 'c2' }),
        createMockLink({ id: 'l2', fromContentId: 'c1', toContentId: 'c3' }),
        createMockLink({ id: 'l3', fromContentId: 'c2', toContentId: 'c3' }),
      ];
      const edges = EdgeFactory.createEdges(links);

      const outgoing = EdgeFactory.getOutgoingEdges(edges, 'c1');

      expect(outgoing).toHaveLength(2);
      expect(outgoing.map((e) => e.data.id)).toContain('l1');
      expect(outgoing.map((e) => e.data.id)).toContain('l2');
    });

    it('should return empty array if node has no outgoing edges', () => {
      const links = [
        createMockLink({ id: 'l1', fromContentId: 'c1', toContentId: 'c2' }),
      ];
      const edges = EdgeFactory.createEdges(links);

      const outgoing = EdgeFactory.getOutgoingEdges(edges, 'c2');

      expect(outgoing).toHaveLength(0);
    });
  });
});
