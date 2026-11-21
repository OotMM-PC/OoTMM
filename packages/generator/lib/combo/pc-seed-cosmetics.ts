import type { Cosmetics, Options } from '@ootmm/core';

import { COLORS, COSMETICS, makeCosmetics, Random, randString } from '@ootmm/core';
import type { CosmeticColors } from './cosmetics';
import { resolveCosmeticColors } from './cosmetics';

export const PC_SEED_FORMAT = 'ootmm.pc.seed.v2';
export const PC_SEED_GENERATOR_VERSION = '31.1';

export type PcSeedCosmetics = {
  gerudoTunic: boolean;
  musicCategories: boolean;
  musicNames: boolean;
  defaultHold: boolean;
  nightBgm: boolean;
  noLowHealthBeep: boolean;
  applyFreestandings: boolean;
  colors: { [key: string]: string };
};

export type PcSeedColorKey = keyof CosmeticColors;

export type PcSeedCosmeticsFile = {
  cosmetics: Cosmetics;
  customColors: Partial<Record<PcSeedColorKey, string>>;
  playerId: number;
  playerCount: number;
  seedName: string;
  settings: unknown;
};

const COLOR_KEYS = COSMETICS.filter(c => c.type === 'color').map(c => c.key) as PcSeedColorKey[];
const BOOLEAN_KEYS = COSMETICS.filter(c => c.type === 'boolean').map(c => c.key) as (keyof PcSeedCosmetics)[];

export function makePcSeedCosmetics(cosmetics: Cosmetics, colors: CosmeticColors): PcSeedCosmetics {
  const hex: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(colors)) {
    if (value !== null) {
      hex[key] = '#' + value.toString(16).padStart(6, '0');
    }
  }
  return {
    gerudoTunic: cosmetics.gerudoTunic,
    musicCategories: cosmetics.musicCategories,
    musicNames: cosmetics.musicNames,
    defaultHold: cosmetics.defaultHold,
    nightBgm: cosmetics.nightBgm,
    noLowHealthBeep: cosmetics.noLowHealthBeep,
    applyFreestandings: cosmetics.applyFreestandings,
    colors: hex,
  };
}

export function playerPcSeedCosmetics(random: Random, opts: Options): PcSeedCosmetics[] {
  const result: PcSeedCosmetics[] = [];
  for (let i = 0; i < opts.settings.players; i++) {
    const own = opts.settings.mode === 'multi' && opts.settings.teams === 1 ? opts.playerCosmetics[i] : null;
    const cosmetics = own ?? opts.cosmetics;
    result.push(makePcSeedCosmetics(cosmetics, resolveCosmeticColors(random, cosmetics)));
  }
  return result;
}

function parsePcSeed(text: string): any {
  const seed = JSON.parse(text);
  if (seed?.format !== PC_SEED_FORMAT || seed.generatorVersion !== PC_SEED_GENERATOR_VERSION) {
    throw new Error(`Not a PC seed for generator ${PC_SEED_GENERATOR_VERSION} (${PC_SEED_FORMAT})`);
  }
  if (typeof seed.cosmetics !== 'object' || seed.cosmetics === null) {
    throw new Error('The PC seed has no cosmetics section');
  }
  return seed;
}

function colorKeyOf(hex: string): string | null {
  const value = parseInt(hex.replace('#', ''), 16);
  const match = Object.entries(COLORS).find(([, color]) => color.value === value);
  return match ? match[0] : null;
}

export function readPcSeedCosmetics(text: string): PcSeedCosmeticsFile {
  const seed = parsePcSeed(text);
  const stored = seed.cosmetics;
  const input: Partial<Cosmetics> = {};
  const customColors: Partial<Record<PcSeedColorKey, string>> = {};
  for (const key of BOOLEAN_KEYS) {
    if (typeof stored[key] === 'boolean') {
      (input as any)[key] = stored[key];
    }
  }
  for (const key of COLOR_KEYS) {
    const hex = stored.colors?.[key];
    if (typeof hex !== 'string') {
      input[key] = 'default';
      continue;
    }
    const colorKey = colorKeyOf(hex);
    if (colorKey) {
      input[key] = colorKey as Cosmetics[typeof key];
    } else {
      input[key] = 'default';
      customColors[key] = hex;
    }
  }
  return {
    cosmetics: makeCosmetics(input),
    customColors,
    playerId: seed.playerId,
    playerCount: seed.playerCount,
    seedName: seed.seedName,
    settings: seed.settings,
  };
}

export async function editPcSeedCosmetics(text: string, cosmetics: Cosmetics, customColors: Partial<Record<PcSeedColorKey, string>>): Promise<string> {
  const seed = parsePcSeed(text);
  const random = new Random();
  await random.seed(randString());
  const resolved = resolveCosmeticColors(random, cosmetics);
  const edited = makePcSeedCosmetics(cosmetics, resolved);
  const next: { [key: string]: string } = {};
  for (const key of Object.keys(resolved) as PcSeedColorKey[]) {
    const hex = customColors[key] ?? edited.colors[key];
    if (hex !== undefined) {
      next[key] = hex;
    }
  }
  const colors: { [key: string]: string } = {};
  for (const [key, hex] of Object.entries(seed.cosmetics.colors ?? {})) {
    if (!(key in resolved)) {
      colors[key] = hex as string;
    } else if (key in next) {
      colors[key] = next[key];
    }
  }
  seed.cosmetics = { ...seed.cosmetics, ...edited, colors: { ...colors, ...next } };
  return JSON.stringify(seed, null, 2);
}
