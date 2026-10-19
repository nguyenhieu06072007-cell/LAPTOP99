const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create uploads/brands folder
const brandsDir = path.resolve(__dirname, 'uploads', 'brands');
fs.mkdirSync(brandsDir, { recursive: true });

// Function to generate a simple solid/patterned PNG
function createPng(width, height, r, g, b) {
  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(width, 0);
  IHDR.writeUInt32BE(height, 4);
  IHDR[8] = 8;  // bit depth
  IHDR[9] = 2;  // color type: 2 (RGB)
  IHDR[10] = 0; // compression
  IHDR[11] = 0; // filter
  IHDR[12] = 0; // interlace

  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter type 0 (none)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      // Border effect
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        rawData[pxOffset] = Math.max(0, r - 30);
        rawData[pxOffset + 1] = Math.max(0, g - 30);
        rawData[pxOffset + 2] = Math.max(0, b - 30);
      } else {
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
      }
    }
  }

  const IDAT = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeInt32BE(crc, 8 + len);
    return buf;
  }

  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
    }
    return c ^ -1;
  }

  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', IHDR);
  const idatChunk = makeChunk('IDAT', IDAT);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const brands = [
  { name: 'dell.png', color: [0, 118, 206] },      // Dell Blue
  { name: 'hp.png', color: [0, 150, 214] },        // HP Blue
  { name: 'asus.png', color: [0, 83, 159] },       // Asus Blue
  { name: 'lenovo.png', color: [226, 35, 26] },    // Lenovo Red
  { name: 'acer.png', color: [131, 184, 26] },     // Acer Green
  { name: 'apple.png', color: [85, 85, 85] },      // Apple Space Gray
  { name: 'msi.png', color: [237, 28, 36] },       // MSI Red
  { name: 'lg.png', color: [165, 0, 52] },         // LG Maroon
  { name: 'microsoft.png', color: [0, 164, 239] }, // Microsoft Blue
];

for (const b of brands) {
  const filePath = path.join(brandsDir, b.name);
  fs.writeFileSync(filePath, createPng(120, 60, ...b.color));
  console.log(`Generated: ${filePath}`);
}

console.log('All brand logos generated successfully!');
