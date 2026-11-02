import type { Item, Options, PlayerItem, PlayerItems } from '@ootmm/core';
import type { ItemPlacement } from './types';
import type { Hints } from './hints';
import type { Analysis } from './analysis';
import type { World } from './world';
import type { Location } from './types';

import { Monitor, Random } from '@ootmm/core';
import { logicPassConfig, logicPassFixer, logicPassHash, logicPassSongEvents } from './misc';
import { logicPassItemProperties } from './item-properties';
import { logicPassWorld, logicPassWorldTransform } from './world';
import { logicPassCloak, logicPassEntrances, logicPassMinimize, logicPassSolver } from './solver';
import { logicPassAnalysis, logicPassAnalysisFoolish, logicPassAnalysisPaths } from './analysis';
import { logicPassHints } from './hints';
import { logicPassPrice } from './price';
import { STARTING_CHECK_BALANCE_ATTEMPTS, STARTING_CHECK_BALANCE_TARGET, isBetterStartingLayout, startingCheckBalance, startingCheckCounts, wantsStartingCheckBalance } from './balance';

type LogicPassFunc<State, Out> = (state: State) => Out;

class LogicPipeline<State> {
  constructor(private readonly state: State) {
  }

  apply<Out>(pass: LogicPassFunc<State, Out>): LogicPipeline<State & Out> {
    const newState = { ...this.state, ...pass(this.state) };
    return new LogicPipeline(newState);
  }

  exec(): State {
    return this.state;
  }
};

export type LogicResultWorld = World;

export type LogicResult = {
  worlds: LogicResultWorld[];
  startingItems: PlayerItems;
  plandoLocations: Map<Location, PlayerItem>;
  items: ItemPlacement;
  itemCloaks: Map<Location, Item>;
  analysis: Analysis;
  hints: Hints;
  hash: string;
};

function pipeline<State>(state: State): LogicPipeline<State> {
  return new LogicPipeline(state);
}

export const worldState = async (monitor: Monitor, opts: Options, attempt = 0) => {
  const random = new Random();
  const seedParts = [opts.seed.length.toString(16), opts.seed, opts.settings.generateSpoilerLog ? '1' : '0'];
  if (attempt > 0) {
    seedParts.push(`balance-${attempt}`);
  }
  await random.seed(seedParts.join('\0'));
  const state = { monitor, opts, settings: opts.settings, random };

  return pipeline(state)
    .apply(logicPassConfig)
    .apply(logicPassItemProperties)
    .apply(logicPassWorld)
    .apply(logicPassFixer)
    .apply(logicPassWorldTransform)
    .exec();
};

const layoutState = async (monitor: Monitor, opts: Options, attempt: number) => {
  const state = await worldState(monitor, opts, attempt);
  return pipeline(state)
    .apply(logicPassPrice)
    .apply(logicPassSongEvents)
    .apply(logicPassEntrances)
    .exec();
};

const balancedLayoutState = async (monitor: Monitor, opts: Options) => {
  if (!wantsStartingCheckBalance(opts.settings)) {
    return layoutState(monitor, opts, 0);
  }

  let best: Awaited<ReturnType<typeof layoutState>> | null = null;
  let bestCounts: number[] | null = null;
  for (let attempt = 0; attempt < STARTING_CHECK_BALANCE_ATTEMPTS; ++attempt) {
    const state = await layoutState(monitor, opts, attempt);
    const counts = startingCheckCounts(state.worlds, state.settings, state.startingItems);
    monitor.log(`Starting check balance attempt ${attempt + 1}: ${counts.join('/')}`);
    if (isBetterStartingLayout(counts, bestCounts)) {
      best = state;
      bestCounts = counts;
    }
    if (startingCheckBalance(counts) >= STARTING_CHECK_BALANCE_TARGET) {
      break;
    }
  }
  return best!;
};

export const solvedWorldState = async (monitor: Monitor, opts: Options) => {
  const state = await balancedLayoutState(monitor, opts);
  return pipeline(state)
    .apply(logicPassSolver)
    .apply(logicPassMinimize)
    .exec();
}

export async function logic(monitor: Monitor, opts: Options): Promise<LogicResult> {
  const state = await solvedWorldState(monitor, opts);

  const data = pipeline(state)
    .apply(logicPassCloak)
    .apply(logicPassAnalysis)
    .apply(logicPassAnalysisPaths)
    .apply(logicPassAnalysisFoolish)
    .apply(logicPassHints)
    .apply(logicPassHash)
    .exec();

    const worlds: LogicResultWorld[] = data.worlds;

    return {
      worlds,
      startingItems: data.startingItems,
      plandoLocations: data.plandoLocations,
      items: data.items,
      itemCloaks: data.itemCloaks,
      analysis: data.analysis,
      hints: data.hints,
      hash: data.hash,
    };
};
