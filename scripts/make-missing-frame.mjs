import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function makeImage(width, height, paint) {
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = paint(x, y, width, height);
      const i = (y * width + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }

  return rgba;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function writePng(path, width, height, paint) {
  const output = resolve(path);
  mkdirSync(dirname(output), { recursive: true });
  const png = encodePng(width, height, makeImage(width, height, paint));
  writeFileSync(output, png);
  return png;
}

writePng("src/assets/missing-frame.png", 48, 48, (x, y, width, height) => {
  const checker = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 === 0;
  const border = x < 2 || y < 2 || x >= width - 2 || y >= height - 2;
  const cross = Math.abs(x - y) <= 1 || Math.abs(x + y - (width - 1)) <= 1;
  const question =
    (x >= 21 && x <= 28 && y >= 12 && y <= 15) ||
    (x >= 27 && x <= 31 && y >= 16 && y <= 21) ||
    (x >= 23 && x <= 27 && y >= 22 && y <= 27) ||
    (x >= 23 && x <= 27 && y >= 33 && y <= 36);

  if (question) {
    return [42, 48, 60, 255];
  }

  if (border || cross) {
    return [96, 101, 112, 255];
  }

  const color = checker ? 205 : 226;
  return [color, color, color, 255];
});

const iconPng = writePng("src-tauri/icons/icon.png", 128, 128, (x, y) => {
  const dx = x - 64;
  const dy = y - 64;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const body = distance < 48;
  const earLeft = Math.abs(x - 38) + Math.abs(y - 31) < 24;
  const earRight = Math.abs(x - 90) + Math.abs(y - 31) < 24;
  const eye = (Math.abs(x - 48) < 5 || Math.abs(x - 80) < 5) && y > 50 && y < 62;
  const smile = x > 48 && x < 80 && Math.abs(y - 82) < 3;

  if (!(body || earLeft || earRight)) {
    return [0, 0, 0, 0];
  }

  if (eye || smile) {
    return [32, 38, 50, 255];
  }

  return [90, 144, 226, 255];
});

const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader[6] = 128;
icoHeader[7] = 128;
icoHeader[8] = 0;
icoHeader[9] = 0;
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(iconPng.length, 14);
icoHeader.writeUInt32LE(22, 18);
writeFileSync(resolve("src-tauri/icons/icon.ico"), Buffer.concat([icoHeader, iconPng]));
