import { describe, expect, it } from 'vitest';
import { compress, decompress } from 'yaz0/lib/browser/index.js';

describe('portable Yaz0 codec used on Windows', () => {
  it.each([0, 7])('round-trips multiple output chunks at level %i', async (level) => {
    const bytes = Uint8Array.from({ length: 16384 }, (_, i) => (i * 73 + (i >>> 4)) & 255);
    const encoded = await compress(bytes, level);
    expect(Array.from(encoded.subarray(0, 4))).toEqual([0x59, 0x61, 0x7a, 0x30]);
    expect(await decompress(encoded)).toEqual(bytes);
  });

  it('handles independent calls and repeated data without corrupting earlier results', async () => {
    const first = new Uint8Array(8192).fill(0x42);
    const second = new Uint8Array([0, 255, 128, 64, 1]);
    const encodedFirst = await compress(first, 7);
    const snapshot = encodedFirst.slice();
    const encodedSecond = await compress(second, 7);
    expect(encodedFirst).toEqual(snapshot);
    expect(await decompress(encodedSecond)).toEqual(second);
    expect(await decompress(encodedFirst)).toEqual(first);
  });
});
