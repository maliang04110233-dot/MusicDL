const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;

function createPNG(width, height, pixels) {
  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
      table[n] = v;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData));
    return Buffer.concat([len, typeData, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (1 + width * 4) + 1 + x * 4;
      raw[di] = pixels[si];
      raw[di + 1] = pixels[si + 1];
      raw[di + 2] = pixels[si + 2];
      raw[di + 3] = pixels[si + 3];
    }
  }

  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function createBitmapData(pixels, width, height) {
  // Convert RGBA to BGRA and flip vertically (BMP format)
  const rowSize = Math.ceil(width * 4 / 4) * 4; // rows are aligned to 4 bytes
  const bmpData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcI = (y * width + x) * 4;
      const dstI = (height - 1 - y) * rowSize + x * 4;
      bmpData[dstI] = pixels[srcI + 2];     // B
      bmpData[dstI + 1] = pixels[srcI + 1]; // G
      bmpData[dstI + 2] = pixels[srcI];     // R
      bmpData[dstI + 3] = pixels[srcI + 3]; // A
    }
  }
  return bmpData;
}

function createIconICO(pngBuffers) {
  const entries = [];
  let offset = 6 + pngBuffers.length * 16;
  for (const { size, buf } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = size < 256 ? size : 0;
    entry[1] = 0;
    entry.writeUInt16LE(1, 2); // type: 1 = ICO
    entry.writeUInt16LE(32, 4); // color palette: 32-bit
    entry.writeUInt32BE(buf.length, 8);
    entry.writeUInt32BE(offset, 12);
    entries.push(entry);
    offset += buf.length;
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngBuffers.length, 4);
  return Buffer.concat([header, ...entries, ...pngBuffers.map(e => e.buf)]);
}

function createIconICO_BMP(pngBuffers) {
  // Create ICO with BMP data (more compatible than PNG-in-ICO)
  const entries = [];
  let offset = 6 + pngBuffers.length * 16;
  const bmpBuffers = [];

  for (const { size, pixels } of pngBuffers) {
    // Create BMP data (BITMAPINFOHEADER + pixel data)
    const rowSize = Math.ceil(size * 4 / 4) * 4;
    const pixelDataSize = rowSize * size;
    const bmpHeaderSize = 40; // BITMAPINFOHEADER
    const totalSize = bmpHeaderSize + pixelDataSize;

    const bmpBuf = Buffer.alloc(totalSize);

    // BITMAPINFOHEADER
    bmpBuf.writeUInt32LE(40, 0);           // biSize
    bmpBuf.writeInt32LE(size, 4);          // biWidth
    bmpBuf.writeInt32LE(size * 2, 8);     // biHeight (doubled for XOR+AND mask)
    bmpBuf.writeUInt16LE(1, 12);           // biPlanes
    bmpBuf.writeUInt16LE(32, 14);          // biBitCount (32-bit BGRA)
    bmpBuf.writeUInt32LE(0, 16);           // biCompression (BI_RGB)
    bmpBuf.writeUInt32LE(pixelDataSize, 20); // biSizeImage
    bmpBuf.writeInt32LE(0, 24);            // biXPelsPerMeter
    bmpBuf.writeInt32LE(0, 28);            // biYPelsPerMeter
    bmpBuf.writeUInt32LE(0, 32);           // biClrUsed
    bmpBuf.writeUInt32LE(0, 36);           // biClrImportant

    // Pixel data (bottom-up, BGRA)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcI = (y * size + x) * 4;
        const dstI = bmpHeaderSize + (size - 1 - y) * rowSize + x * 4;
        bmpBuf[dstI] = pixels[srcI + 2];     // B
        bmpBuf[dstI + 1] = pixels[srcI + 1]; // G
        bmpBuf[dstI + 2] = pixels[srcI];     // R
        bmpBuf[dstI + 3] = pixels[srcI + 3]; // A
      }
    }

    bmpBuffers.push({ size, buf: bmpBuf });

    const entry = Buffer.alloc(16);
    entry[0] = size < 256 ? size : 0;
    entry[1] = 0;
    entry.writeUInt16LE(1, 2);  // type: ICO
    entry.writeUInt16LE(32, 4); // color palette: 32-bit
    entry.writeUInt32LE(bmpBuf.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += bmpBuf.length;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);    // Reserved
  header.writeUInt16LE(1, 2);   // Type: 1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4);

  return Buffer.concat([header, ...entries, ...bmpBuffers.map(e => e.buf)]);
}

function drawIcon(pixels, size) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.42;

  function dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }

  function setPixel(x, y, R, G, B, A = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    const srcA = pixels[i + 3] / 255;
    const dstA = A / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA > 0) {
      pixels[i] = (pixels[i] * srcA + R * dstA * (1 - srcA)) / outA;
      pixels[i + 1] = (pixels[i + 1] * srcA + G * dstA * (1 - srcA)) / outA;
      pixels[i + 2] = (pixels[i + 2] * srcA + B * dstA * (1 - srcA)) / outA;
      pixels[i + 3] = outA * 255;
    }
  }

  function fillCircle(ox, oy, radius, R, G, B, A) {
    for (let y = Math.floor(oy - radius); y <= Math.ceil(oy + radius); y++) {
      for (let x = Math.floor(ox - radius); x <= Math.ceil(ox + radius); x++) {
        if (dist(x, y, ox, oy) <= radius) setPixel(x, y, R, G, B, A);
      }
    }
  }

  function fillRect(x1, y1, x2, y2, R, G, B, A) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        setPixel(x, y, R, G, B, A);
      }
    }
  }

  function fillEllipse(ox, oy, rx, ry, angle, R, G, B, A) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    for (let y = Math.floor(oy - ry - 2); y <= Math.ceil(oy + ry + 2); y++) {
      for (let x = Math.floor(ox - rx - 2); x <= Math.ceil(ox + rx + 2); x++) {
        const dx = x - ox, dy = y - oy;
        const lx = dx * cos + dy * sin;
        const ly = -dx * sin + dy * cos;
        if ((lx / rx) ** 2 + (ly / ry) ** 2 <= 1) setPixel(x, y, R, G, B, A);
      }
    }
  }

  // Background - dark blue/purple gradient circle
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = dist(x, y, cx, cy);
      if (d <= r) {
        const t = d / r;
        const R = Math.round(20 + t * 15);
        const G = Math.round(10 + t * 8);
        const B = Math.round(80 + t * 30);
        setPixel(x, y, R, G, B, 255);
      } else if (d <= r + 2) {
        const a = Math.max(0, 1 - (d - r) / 2);
        setPixel(x, y, 80, 60, 180, Math.round(a * 255));
      }
    }
  }

  // Single music note color - golden yellow gradient
  const noteColor = { r: 255, g: 200, b: 50 };
  const noteHighlight = { r: 255, g: 240, b: 150 };
  const noteShadow = { r: 200, g: 140, b: 20 };

  // Center the single note
  const noteCenterX = cx + r * 0.05;
  const noteTop = cy - r * 0.6;
  const noteBottom = cy + r * 0.4;
  const stemWidth = Math.max(3, size * 0.03);

  // Note stem (vertical line, slightly tilted)
  for (let y = noteTop; y <= noteBottom; y++) {
    const t = (y - noteTop) / (noteBottom - noteTop);
    // Gradient from highlight to shadow
    const R = Math.round(noteHighlight.r + (noteShadow.r - noteHighlight.r) * t);
    const G = Math.round(noteHighlight.g + (noteShadow.g - noteHighlight.g) * t);
    const B = Math.round(noteHighlight.b + (noteShadow.b - noteHighlight.b) * t);
    // Slight tilt effect
    const offsetX = Math.round(t * stemWidth * 0.3);
    fillRect(Math.round(noteCenterX - stemWidth / 2) + offsetX, Math.round(y),
             Math.round(noteCenterX + stemWidth / 2) + offsetX, Math.round(y), R, G, B, 255);
  }

  // Note head (large filled ellipse)
  const headCx = noteCenterX - r * 0.05;
  const headCy = noteBottom + r * 0.02;
  const headRx = r * 0.28;
  const headRy = r * 0.2;

  // Head shadow
  fillEllipse(headCx + 1, headCy + 1, headRx, headRy, -0.3,
              noteShadow.r, noteShadow.g, noteShadow.b, 180);
  // Head main
  fillEllipse(headCx, headCy, headRx, headRy, -0.3,
              noteColor.r, noteColor.g, noteColor.b, 255);
  // Head highlight
  fillEllipse(headCx - headRx * 0.2, headCy - headRy * 0.2, headRx * 0.4, headRy * 0.4, -0.3,
              noteHighlight.r, noteHighlight.g, noteHighlight.b, 200);

  // Note flag (curved bezier from top of stem)
  const flagStartX = noteCenterX + stemWidth / 2;
  const flagStartY = noteTop;
  const flagEndX = noteCenterX + r * 0.4;
  const flagEndY = noteTop + r * 0.35;
  const flagCtrlX = noteCenterX + r * 0.5;
  const flagCtrlY = noteTop + r * 0.15;

  for (let t = 0; t <= 1; t += 0.003) {
    const x = (1 - t) * (1 - t) * flagStartX + 2 * (1 - t) * t * flagCtrlX + t * t * flagEndX;
    const y = (1 - t) * (1 - t) * flagStartY + 2 * (1 - t) * t * flagCtrlY + t * t * flagEndY;
    const fw = stemWidth * (1.2 - t * 0.4);
    const alpha = Math.round(255 * (1 - t * 0.3));
    fillRect(Math.round(x - fw / 2), Math.round(y - fw / 2),
             Math.round(x + fw / 2), Math.round(y + fw / 2),
             noteColor.r, noteColor.g, noteColor.b, alpha);
  }

  // Glow effect
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = dist(x, y, cx, cy);
      if (d > r) continue;
      const i = (y * size + x) * 4;
      if (pixels[i + 3] > 0 && pixels[i + 3] < 250) {
        const glow = Math.min(1, pixels[i + 3] / 128);
        pixels[i] = Math.min(255, pixels[i] + Math.round(30 * glow));
        pixels[i + 1] = Math.min(255, pixels[i + 1] + Math.round(60 * glow));
        pixels[i + 2] = Math.min(255, pixels[i + 2] + Math.round(100 * glow));
      }
    }
  }
}

// Generate at multiple sizes for ICO
const sizes = [16, 32, 48, 64, 128, 256];
const pngBuffers = [];

for (const sz of sizes) {
  const pixels = new Uint8Array(sz * sz * 4);
  drawIcon(pixels, sz);
  const png = createPNG(sz, sz, pixels);
  pngBuffers.push({ size: sz, buf: png, pixels });
}

// Write BMP-based ICO (more compatible with Windows)
const ico = createIconICO_BMP(pngBuffers);
const icoPath = path.join(__dirname, '..', 'assets', 'icon.ico');
fs.mkdirSync(path.dirname(icoPath), { recursive: true });
fs.writeFileSync(icoPath, ico);
console.log(`icon.ico written (${ico.length} bytes)`);

// Write 256x256 PNG for Linux/macOS
const png256 = pngBuffers.find(e => e.size === 256).buf;
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'icon.png'), png256);
console.log('icon.png written');
