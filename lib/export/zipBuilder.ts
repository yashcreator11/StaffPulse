import zlib from 'zlib';

interface ZipFileEntry {
  filename: string;
  data: Buffer;
}

/**
 * Pure TypeScript ZIP archive generator using Node.js zlib.
 * Generates standard PKZIP 2.0 archives compatible with Windows Explorer, macOS, and Linux unzip.
 */
export class ZipArchive {
  private files: ZipFileEntry[] = [];

  addFile(filename: string, content: string | Buffer) {
    const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    this.files.push({ filename, data });
  }

  generate(): Buffer {
    const localHeaders: Buffer[] = [];
    const centralDirs: Buffer[] = [];
    let offset = 0;

    for (const file of this.files) {
      const filenameBuf = Buffer.from(file.filename, 'utf8');
      const compressedData = zlib.deflateRawSync(file.data);
      const crc = crc32(file.data);

      const uncompressedSize = file.data.length;
      const compressedSize = compressedData.length;

      // Local file header (30 bytes + filename)
      const localHeader = Buffer.alloc(30 + filenameBuf.length);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
      localHeader.writeUInt16LE(20, 4);         // Version needed to extract (2.0)
      localHeader.writeUInt16LE(0, 6);          // General purpose bit flag
      localHeader.writeUInt16LE(8, 8);          // Compression method (8 = deflate)
      localHeader.writeUInt16LE(0, 10);         // Last mod file time
      localHeader.writeUInt16LE(0, 12);         // Last mod file date
      localHeader.writeUInt32LE(crc, 14);       // CRC-32
      localHeader.writeUInt32LE(compressedSize, 18);
      localHeader.writeUInt32LE(uncompressedSize, 22);
      localHeader.writeUInt16LE(filenameBuf.length, 26);
      localHeader.writeUInt16LE(0, 28);         // Extra field length
      filenameBuf.copy(localHeader, 30);

      localHeaders.push(localHeader, compressedData);

      // Central directory header (46 bytes + filename)
      const centralDir = Buffer.alloc(46 + filenameBuf.length);
      centralDir.writeUInt32LE(0x02014b50, 0);  // Central directory header signature
      centralDir.writeUInt16LE(20, 4);          // Version made by
      centralDir.writeUInt16LE(20, 6);          // Version needed to extract
      centralDir.writeUInt16LE(0, 8);           // General purpose bit flag
      centralDir.writeUInt16LE(8, 10);          // Compression method
      centralDir.writeUInt16LE(0, 12);          // Last mod time
      centralDir.writeUInt16LE(0, 14);          // Last mod date
      centralDir.writeUInt32LE(crc, 16);        // CRC-32
      centralDir.writeUInt32LE(compressedSize, 20);
      centralDir.writeUInt32LE(uncompressedSize, 24);
      centralDir.writeUInt16LE(filenameBuf.length, 28);
      centralDir.writeUInt16LE(0, 30);          // Extra field length
      centralDir.writeUInt16LE(0, 32);          // File comment length
      centralDir.writeUInt16LE(0, 34);          // Disk number start
      centralDir.writeUInt16LE(0, 36);          // Internal file attributes
      centralDir.writeUInt32LE(0, 38);          // External file attributes
      centralDir.writeUInt32LE(offset, 42);     // Relative offset of local header
      filenameBuf.copy(centralDir, 46);

      centralDirs.push(centralDir);
      offset += localHeader.length + compressedData.length;
    }

    const centralDirBuffer = Buffer.concat(centralDirs);
    const centralDirSize = centralDirBuffer.length;
    const centralDirOffset = offset;

    // End of central directory record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);         // EOCD signature
    eocd.writeUInt16LE(0, 4);                  // Number of this disk
    eocd.writeUInt16LE(0, 6);                  // Disk where central directory starts
    eocd.writeUInt16LE(this.files.length, 8);   // Number of central directory records on this disk
    eocd.writeUInt16LE(this.files.length, 10);  // Total number of central directory records
    eocd.writeUInt32LE(centralDirSize, 12);    // Size of central directory
    eocd.writeUInt32LE(centralDirOffset, 16);  // Offset of start of central directory
    eocd.writeUInt16LE(0, 20);                 // Comment length

    return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
  }
}

// Standard CRC-32 table computation
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
