import { test, expect } from 'vitest';

import { makeTestSeed } from '../helpers';
import { STARTING_CHECK_BALANCE_TARGET, isBetterStartingLayout, startingCheckBalance, startingCheckCounts } from '../../src/balance';

test('Starting check balance scores the weakest world against the best', () => {
  expect(startingCheckBalance([10, 8])).toBeCloseTo(0.8);
  expect(startingCheckBalance([12])).toBe(1);
  expect(startingCheckBalance([0, 0])).toBe(1);
});

test('Starting check balance prefers balanced layouts, then the strongest weakest player', () => {
  expect(isBetterStartingLayout([17, 50, 18], null)).toBe(true);
  expect(isBetterStartingLayout([17, 17, 17], [17, 50, 18])).toBe(true);
  expect(isBetterStartingLayout([51, 44, 45], [17, 17, 17])).toBe(true);
  expect(isBetterStartingLayout([44, 60, 52], [51, 44, 45])).toBe(false);
  expect(isBetterStartingLayout([41, 18, 43], [17, 50, 18])).toBe(true);
});

test('Can make a balanced multiworld seed - starting check balance', async () => {
  const res = await makeTestSeed('BALANCE', {
    mode: 'multi',
    players: 3,
    distinctWorlds: true,
    startingChecksBalance: true,
    erRegions: 'full',
    erIndoors: 'full',
    erGrottos: 'full',
  });
  const counts = startingCheckCounts(res.worlds, res.settings, res.startingItems);
  expect(counts).toHaveLength(3);
  expect(Math.min(...counts)).toBeGreaterThan(0);
  expect(startingCheckBalance(counts)).toBeGreaterThanOrEqual(STARTING_CHECK_BALANCE_TARGET);
}, 600000);
