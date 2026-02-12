// ============================================================
// BoundFile Validator
// ============================================================

import type { BoundFile } from '../../types/bound';

export function isBoundFile(obj: unknown): obj is BoundFile {
  if (typeof obj !== 'object' || obj === null) return false;
  const f = obj as Record<string, unknown>;
  return (
    typeof f.version === 'number' &&
    typeof f.schemaVersion === 'number' &&
    typeof f.createdAt === 'number' &&
    typeof f.checksum === 'string' &&
    (typeof f.payload === 'string' || typeof f.payload === 'object')
  );
}

export function validateBoundFile(file: BoundFile): string[] {
  const errors: string[] = [];
  if (file.version !== 1) errors.push(`Unsupported BoundFile version: ${file.version}`);
  if (file.checksum.length !== 64) errors.push('Invalid checksum format (expected SHA-256 hex)');
  if (file.createdAt > Date.now() + 60000) errors.push('File creation time is in the future');
  if (file.schemaVersion < 1) errors.push('Invalid schema version');
  return errors;
}
