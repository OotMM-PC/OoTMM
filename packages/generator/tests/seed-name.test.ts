import { describe, expect, it } from 'vitest';

import { makeSeedName, seedFileStem } from '../lib/combo/seed-name';

describe('seed names', () => {
  it('is stable for the same seed and settings', () => {
    expect(makeSeedName('abc', 'xxHKjAoV')).toEqual(makeSeedName('abc', 'xxHKjAoV'));
  });

  it('spreads different seeds across many names', () => {
    const names = new Set<string>();
    for (let i = 0; i < 500; i++) {
      names.add(makeSeedName(`seed-${i}`, 'hash').name);
    }
    expect(names.size).toBeGreaterThan(400);
  });

  it('builds a file stem from the name and settings hash', () => {
    const name = makeSeedName('abc', 'x/y+Z');
    expect(seedFileStem(name, 'x/y+Z')).toBe(`${name.slug}-xyZ`);
    expect(name.name.replace(' ', '')).toBe(name.slug);
  });
});
