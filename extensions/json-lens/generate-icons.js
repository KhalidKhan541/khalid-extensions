const fs = require('fs');
const path = require('path');

function createPNG(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ -1) >>> 0;
  }

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData));
    return Buffer.concat([len, typeBuffer, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0);
    for (let x = 0; x < size; x++) {
      const cx = x / size;
      const cy = y / size;

      const isBracket = (
        (cx > 0.15 && cx < 0.25 && cy > 0.2 && cy < 0.8) ||
        (cx > 0.15 && cx < 0.35 && cy > 0.2 && cy < 0.3) ||
        (cx > 0.15 && cx < 0.35 && cy > 0.7 && cy < 0.8) ||
        (cx > 0.65 && cx < 0.75 && cy > 0.2 && cy < 0.8) ||
        (cx > 0.65 && cx < 0.85 && cy > 0.2 && cy < 0.3) ||
        (cx > 0.65 && cx < 0.85 && cy > 0.7 && cy < 0.8)
      );

      const isDot = (
        Math.sqrt((cx - 0.5) * (cx - 0.5) + (cy - 0.5) * (cy - 0.5)) < 0.12
      );

      if (isBracket || isDot) {
        rawData.push(37, 99, 235);
      } else {
        const gradient = 1 - Math.sqrt((cx - 0.5) * (cx - 0.5) + (cy - 0.5) * (cy - 0.5)) * 1.5;
        rawData.push(
          Math.floor(30 + gradient * 10),
          Math.floor(30 + gradient * 10),
          Math.floor(60 + gradient * 20)
        );
      }
    }
  }

  const rawDataBuffer = Buffer.from(rawData);
  let compressed;
  try {
    const zlib = require('zlib');
    compressed = zlib.deflateSync(rawDataBuffer);
  } catch (e) {
    compressed = rawDataBuffer;
  }

  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, createChunk('IHDR', ihdr), idat, iend]);
}

const iconsDir = path.join(__dirname, 'icons');

[16, 48, 128].forEach(size => {
  const png = createPNG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Created icon${size}.png`);
});
