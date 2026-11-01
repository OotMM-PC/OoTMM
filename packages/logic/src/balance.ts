import type { PlayerItems, Settings } from '@ootmm/core';
import type { World } from './world';

import { locationData } from './locations';
import { Pathfinder } from './pathfind';

export const STARTING_CHECK_BALANCE_ATTEMPTS = 8;
export const STARTING_CHECK_BALANCE_TARGET = 0.8;

export function startingCheckCounts(worlds: World[], settings: Settings, startingItems: PlayerItems): number[] {
  const state = new Pathfinder(worlds, settings, startingItems).run(null);
  const counts = worlds.map(() => 0);
  for (const location of state.locations) {
    counts[locationData(location).world as number]++;
  }
  return counts;
}

export function startingCheckBalance(counts: number[]): number {
  if (counts.length < 2) {
    return 1;
  }
  const best = Math.max(...counts);
  return best === 0 ? 1 : Math.min(...counts) / best;
}

export function isBetterStartingLayout(counts: number[], best: number[] | null): boolean {
  if (best === null) {
    return true;
  }
  const balanced = startingCheckBalance(counts) >= STARTING_CHECK_BALANCE_TARGET;
  const bestBalanced = startingCheckBalance(best) >= STARTING_CHECK_BALANCE_TARGET;
  if (balanced !== bestBalanced) {
    return balanced;
  }
  if (!balanced) {
    return startingCheckBalance(counts) > startingCheckBalance(best);
  }
  return Math.min(...counts) > Math.min(...best);
}

export function wantsStartingCheckBalance(settings: Settings): boolean {
  return settings.startingChecksBalance && settings.mode === 'multi' && settings.distinctWorlds && settings.players > 1;
}
