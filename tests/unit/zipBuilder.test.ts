import { describe, it, expect } from 'vitest';
import { ZipArchive } from '../../lib/export/zipBuilder';

describe('ZipArchive Generator', () => {
  it('generates a valid PKZIP binary buffer with correct magic signature', () => {
    const zip = new ZipArchive();
    zip.addFile('test.txt', 'Hello StaffPulse Enterprise');
    zip.addFile('data.csv', 'id,name\n1,Alice\n2,Bob');

    const buffer = zip.generate();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(50);

    // Standard PKZIP local file header signature: 0x50, 0x4b, 0x03, 0x04 ("PK\x03\x04")
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    expect(buffer[2]).toBe(0x03);
    expect(buffer[3]).toBe(0x04);
  });
});
