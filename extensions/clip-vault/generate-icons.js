const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

function crc32(buf) {
  let c = 0xFFFFFFFF;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xEDB88320 ^ (v >>> 1) : v >>> 1;
    table[n] = v;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData));
  return Buffer.concat([len, typeData, crc]);
}

function createPNG(width, height, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0);
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      raw.push(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(raw));
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 3);
  const bg = hexToRgb('#1a1a2e');
  const accent = hexToRgb('#e94560');
  const white = hexToRgb('#ffffff');

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 3;
      const cx = x / size;
      const cy = y / size;

      const cornerRadius = 0.15;
      const inCorner =
        (cx < cornerRadius && cy < cornerRadius && (cx - cornerRadius) ** 2 + (cy - cornerRadius) ** 2 > cornerRadius ** 2) ||
        (cx > 1 - cornerRadius && cy < cornerRadius && (cx - (1 - cornerRadius)) ** 2 + (cy - cornerRadius) ** 2 > cornerRadius ** 2) ||
        (cx < cornerRadius && cy > 1 - cornerRadius && (cx - cornerRadius) ** 2 + (cy - (1 - cornerRadius)) ** 2 > cornerRadius ** 2) ||
        (cx > 1 - cornerRadius && cy > 1 - cornerRadius && (cx - (1 - cornerRadius)) ** 2 + (cy - (1 - cornerRadius)) ** 2 > cornerRadius ** 2);

      if (inCorner) {
        pixels[idx] = bg[0];
        pixels[idx + 1] = bg[1];
        pixels[idx + 2] = bg[2];
        continue;
      }

      const innerLeft = 0.18;
      const innerRight = 0.82;
      const innerTop = 0.12;
      const innerBottom = 0.88;
      const innerRadius = 0.1;

      const inInner =
        cx >= innerLeft && cx <= innerRight && cy >= innerTop && cy <= innerBottom &&
        !(
          (cx < innerLeft + innerRadius && cy < innerTop + innerRadius && (cx - (innerLeft + innerRadius)) ** 2 + (cy - (innerTop + innerRadius)) ** 2 > innerRadius ** 2) ||
          (cx > innerRight - innerRadius && cy < innerTop + innerRadius && (cx - (innerRight - innerRadius)) ** 2 + (cy - (innerTop + innerRadius)) ** 2 > innerRadius ** 2) ||
          (cx < innerLeft + innerRadius && cy > innerBottom - innerRadius && (cx - (innerLeft + innerRadius)) ** 2 + (cy - (innerBottom - innerRadius)) ** 2 > innerRadius ** 2) ||
          (cx > innerRight - innerRadius && cy > innerBottom - innerRadius && (cx - (innerRight - innerRadius)) ** 2 + (cy - (innerBottom - innerRadius)) ** 2 > innerRadius ** 2)
        );

      if (inInner) {
        const slotTop = 0.22;
        const slotBottom = 0.35;
        const slotLeft = 0.3;
        const slotRight = 0.7;

        if (cy >= slotTop && cy <= slotBottom && cx >= slotLeft && cx <= slotRight) {
          pixels[idx] = bg[0];
          pixels[idx + 1] = bg[1];
          pixels[idx + 2] = bg[2];
        } else {
          const textY = 0.55;
          const textX = 0.5;
          const textRadius = 0.18;
          const dx = cx - textX;
          const dy = (cy - textY) * 1.3;
          if (dx * dx + dy * dy < textRadius * textRadius) {
            pixels[idx] = white[0];
            pixels[idx + 1] = white[1];
            pixels[idx + 2] = white[2];
          } else {
            pixels[idx] = accent[0];
            pixels[idx + 1] = accent[1];
            pixels[idx + 2] = accent[2];
          }
        }
      } else {
        pixels[idx] = bg[0];
        pixels[idx + 1] = bg[1];
        pixels[idx + 2] = bg[2];
      }
    }
  }

  return createPNG(size, size, pixels);
}

[16, 48, 128].forEach(size => {
  const png = generateIcon(size);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png);
  console.log(`Created icon${size}.png (${png.length} bytes)`);
});

console.log('Done!');