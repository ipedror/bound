// ============================================================
// Serialization Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { BoundSerializer } from './serialization';
import { getDefaultState } from '../constants/schema';
import { isBoundFile, validateBoundFile } from './validation/boundValidator';

describe('BoundSerializer', () => {
  it('should encode state to .bound format', async () => {
    const state = getDefaultState();
    const encoded = await BoundSerializer.encode(state);
    expect(encoded).toContain('"version":');
    expect(encoded).toContain('"checksum"');

    const parsed = JSON.parse(encoded);
    expect(parsed.version).toBe(1);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.checksum).toHaveLength(64);
  });

  it('should decode .bound file to state', async () => {
    const state = getDefaultState();
    (
      state as {
        areas: {
          id: string;
          name: string;
          contentIds: string[];
          createdAt: number;
          updatedAt: number;
        }[];
      }
    ).areas.push({
      id: '1',
      name: 'Test',
      contentIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const encoded = await BoundSerializer.encode(state);
    const decoded = await BoundSerializer.decode(encoded);
    expect(decoded.areas).toHaveLength(1);
    expect(decoded.areas[0].name).toBe('Test');
  });

  it('should roundtrip without data loss', async () => {
    const state = getDefaultState();
    (
      state as {
        areas: {
          id: string;
          name: string;
          description: string;
          contentIds: string[];
          createdAt: number;
          updatedAt: number;
        }[];
      }
    ).areas.push({
      id: 'a1',
      name: 'Area One',
      description: 'First area',
      contentIds: ['c1'],
      createdAt: 1000,
      updatedAt: 2000,
    });

    const encoded = await BoundSerializer.encode(state);
    const decoded = await BoundSerializer.decode(encoded);

    expect(decoded.areas).toEqual(state.areas);
    expect(decoded.contents).toEqual(state.contents);
    expect(decoded.links).toEqual(state.links);
    expect(decoded.version).toBe(state.version);
  });

  it('should reject corrupted checksum', async () => {
    const state = getDefaultState();
    const encoded = await BoundSerializer.encode(state);
    const file = JSON.parse(encoded);
    file.checksum = 'a'.repeat(64);
    await expect(BoundSerializer.decode(JSON.stringify(file))).rejects.toThrow('Checksum mismatch');
  });

  it('should reject invalid JSON', async () => {
    await expect(BoundSerializer.decode('not-json{{{')).rejects.toThrow('Failed to parse');
  });

  it('should reject invalid .bound structure', async () => {
    await expect(BoundSerializer.decode(JSON.stringify({ foo: 'bar' }))).rejects.toThrow(
      'Invalid .bound file',
    );
  });

  it('should reject .bound file with validation errors', async () => {
    const invalidFile = {
      version: 999, // Invalid version
      schemaVersion: 1,
      createdAt: Date.now(),
      checksum: 'a'.repeat(64),
      payload: {},
    };
    await expect(BoundSerializer.decode(JSON.stringify(invalidFile))).rejects.toThrow(
      'Invalid .bound file',
    );
  });

  it('should reject invalid AppState', async () => {
    await expect(
      BoundSerializer.encode({ foo: 'bar' } as unknown as ReturnType<typeof getDefaultState>),
    ).rejects.toThrow('Invalid AppState');
  });

  it('should handle compression (encode + decode)', async () => {
    const state = getDefaultState();
    const encoded = await BoundSerializer.encode(state, { compress: true });
    const parsed = JSON.parse(encoded);
    // Payload should be a base64 string when compressed
    expect(typeof parsed.payload).toBe('string');

    const decoded = await BoundSerializer.decode(encoded);
    expect(decoded.version).toBe(state.version);
    expect(decoded.areas).toEqual(state.areas);
  });

  it('should calculate consistent checksum', async () => {
    const data = 'test string for checksum';
    const checksum1 = await BoundSerializer.calculateChecksum(data);
    const checksum2 = await BoundSerializer.calculateChecksum(data);
    expect(checksum1).toBe(checksum2);
    expect(checksum1).toHaveLength(64);
  });
});

describe('BoundFile Validator', () => {
  it('should validate correct BoundFile', () => {
    const file = {
      version: 1,
      schemaVersion: 1,
      createdAt: Date.now(),
      checksum: 'a'.repeat(64),
      payload: { areas: [] },
    };
    expect(isBoundFile(file)).toBe(true);
  });

  it('should reject non-object', () => {
    expect(isBoundFile(null)).toBe(false);
    expect(isBoundFile(42)).toBe(false);
    expect(isBoundFile('string')).toBe(false);
  });

  it('should return errors for invalid BoundFile', () => {
    const file = {
      version: 2,
      schemaVersion: 0,
      createdAt: Date.now() + 120000,
      checksum: 'short',
      payload: {},
    };
    const errors = validateBoundFile(file as unknown as import('../types/bound').BoundFile);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('version'))).toBe(true);
    expect(errors.some((e) => e.includes('checksum'))).toBe(true);
  });

  it('should return no errors for valid BoundFile', () => {
    const file = {
      version: 1,
      schemaVersion: 1,
      createdAt: Date.now(),
      checksum: 'a'.repeat(64),
      payload: {},
    };
    const errors = validateBoundFile(file as unknown as import('../types/bound').BoundFile);
    expect(errors).toEqual([]);
  });
});
