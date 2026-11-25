#!/usr/bin/env node
// The image gate, restated locally: the same limits the sealed scorer applies
// before any entry reaches the judge.
//
//   node tools/verify.mjs <image>
//
// A PNG must be a complete file: signature, every chunk with a matching CRC,
// and image data whose byte count matches what its header describes. A JPEG
// must run from its start-of-image marker through to its end marker with
// well-formed segment framing. Either way: at most 1 MiB and at most
// 1024 by 1024 pixels.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const [, , file] = process.argv;
if (!file) {
  console.error('usage: node tools/verify.mjs <image>');
  process.exit(2);
}

const MAX_BYTES = 1048576;
const MAX_SIDE = 1024;
const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const bytes = readFileSync(file);
const problems = [];
let valid = true;

const say = (...parts) => console.log(...parts);

say(`  file: ${file}, ${bytes.length} bytes`);

if (bytes.length > MAX_BYTES) {
  problems.push(`${bytes.length} bytes exceeds the ${MAX_BYTES}-byte limit`);
}

const pngMagic = (b) =>
  b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
  b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a;
const jpegMagic = (b) => b[0] === 0xff && b[1] === 0xd8;

if (pngMagic(bytes)) {
  say('  format: PNG');
  let at = 8;
  let ihdr = null;
  let idat = 0;
  const idatParts = [];
  let seenEnd = false;
  while (at + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(at);
    const kind = bytes.toString('ascii', at + 4, at + 8);
    const body = bytes.subarray(at + 8, at + 8 + length);
    if (at + 12 + length > bytes.length) {
      problems.push(`chunk ${kind} at ${at} runs past the end of the file`);
      break;
    }
    const crcExpected = bytes.readUInt32BE(at + 8 + length);
    let crc = -1;
    for (const byte of bytes.subarray(at + 4, at + 8 + length)) {
      crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    crc = (crc ^ -1) >>> 0;
    if (crc !== crcExpected) problems.push(`chunk ${kind} at ${at} fails its CRC`);
    if (kind === 'IHDR') {
      ihdr = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        depth: body[8],
        colour: body[9],
      };
      say(`  ihdr: ${ihdr.width}x${ihdr.height}, ${ihdr.depth}-bit, colour type ${ihdr.colour}`);
    }
    if (kind === 'IDAT') {
      idat += length;
      idatParts.push(bytes.subarray(at + 8, at + 8 + length));
      seenEnd = false;
    } else if (kind === 'IEND') {
      seenEnd = true;
    }
    at += 12 + length;
    if (kind === 'IEND') break;
  }
  if (!ihdr) problems.push('no IHDR chunk');
  if (!seenEnd) problems.push('no IEND chunk: the PNG is truncated');
  if (ihdr) {
    if (ihdr.width > MAX_SIDE || ihdr.height > MAX_SIDE) {
      problems.push(`${ihdr.width}x${ihdr.height} exceeds ${MAX_SIDE}x${MAX_SIDE}`);
    }
    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.colour];
    if (!channels) {
      problems.push(`unknown colour type ${ihdr.colour}`);
    } else {
      // Each filter byte marks the start of a scanline; the rest is data.
      // The IDAT chunks form one zlib stream of those scanlines: inflate it
      // and compare against the size the header describes.
      // Each row carries one filter byte in front of its data: a row is
      // ceil(channels * depth * width / 8) data bytes plus that filter byte.
      const rowBytes = Math.ceil((channels * ihdr.depth * ihdr.width) / 8) + 1;
      const expected = rowBytes * ihdr.height;
      try {
        const scanlines = inflateSync(Buffer.concat(idatParts)).length;
        say(`  idat: inflates to ${scanlines} bytes of scanlines, ${expected} expected`);
        if (scanlines !== expected) {
          problems.push(`IDAT inflates to ${scanlines} bytes, expected ${expected}`);
        }
      } catch (error) {
        problems.push(`IDAT does not inflate: ${error.message}`);
      }
    }
  }
  say(`  valid: ${problems.length ? 0 : 1} (${ihdr ? `${ihdr.width}x${ihdr.height}, ` : ''}${bytes.length} bytes)`);
} else if (jpegMagic(bytes)) {
  say('  format: JPEG');
  let at = 2;
  let height = 0;
  let width = 0;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) {
      problems.push(`bad marker at ${at}`);
      break;
    }
    const marker = bytes[at + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    if (marker === 0xd9) {
      say(`  end marker at ${at}`);
      at += 2;
      break;
    }
    const length = bytes.readUInt16BE(at + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      height = bytes.readUInt16BE(at + 5);
      width = bytes.readUInt16BE(at + 7);
      say(`  sof: ${width}x${height}`);
    }
    at += 2 + length;
  }
  if (at >= bytes.length || bytes[at - 2] !== 0xff || bytes[at - 1] !== 0xd9) {
    problems.push('no end-of-image marker');
  }
  if (width > MAX_SIDE || height > MAX_SIDE) {
    problems.push(`${width}x${height} exceeds ${MAX_SIDE}x${MAX_SIDE}`);
  }
  say(`  valid: ${problems.length ? 0 : 1} (${bytes.length} bytes)`);
} else {
  valid = false;
  say('  format: neither a PNG nor a JPEG');
}

for (const problem of problems) {
  valid = false;
  console.error(`  FAIL: ${problem}`);
}
process.exit(valid ? 0 : 1);
