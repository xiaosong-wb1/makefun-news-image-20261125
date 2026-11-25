// The grader's entrypoint. It finds the finished front page next to itself and
// hands a copy to the grader through $MAKEFUN_OUTPUT_DIR (default /output).
//
// Everything the gate measures is re-measured here so a bad repository fails
// fast and locally instead of in the sandbox: the file must be a complete PNG,
// no larger than one mebibyte, and at most 1024 by 1024 pixels.
//
// The run is deliberately boring: no network, no clock, no randomness, and the
// only byte that changes on disk is the copy it writes. Two runs therefore
// produce identical output.
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, copyFileSync, statSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, 'entry.png');

const BYTE_LIMIT = 1024 * 1024;      // 1 MiB, per the bounty's rules
const SIDE_LIMIT = 1024;             // pixels per edge, per the bounty's rules

// A PNG file begins with this eight-byte signature; the IHDR chunk follows
// immediately and carries the pixel dimensions at fixed offsets.
const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const bytes = readFileSync(source);
const { size } = statSync(source);

if (size > BYTE_LIMIT) {
  throw new Error(`entry.png weighs ${size} bytes; the bounty allows ${BYTE_LIMIT}`);
}
if (!bytes.subarray(0, 8).equals(signature)) {
  throw new Error('entry.png is missing the PNG signature');
}
if (bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') {
  throw new Error('entry.png does not open with an IHDR chunk');
}
const width = bytes.readUInt32BE(16);
const height = bytes.readUInt32BE(20);
if (width > SIDE_LIMIT || height > SIDE_LIMIT) {
  throw new Error(`entry.png measures ${width}x${height}; the bounty allows ${SIDE_LIMIT}x${SIDE_LIMIT}`);
}

const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(destination, { recursive: true });
copyFileSync(source, join(destination, 'entry.png'));

console.log(`entry.png ${width}x${height}, ${size} bytes -> ${destination}`);
