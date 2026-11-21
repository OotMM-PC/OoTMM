import { describe, expect, it } from 'vitest';

import { COLORS, COSMETICS, makeCosmetics, options, Random } from '@ootmm/core';

import { generatePcSeed } from '../lib/combo/pc-seed';
import { resolveCosmeticColors } from '../lib/combo/cosmetics';
import { editPcSeedCosmetics, makePcSeedCosmetics, playerPcSeedCosmetics, readPcSeedCosmetics } from '../lib/combo/pc-seed-cosmetics';

const hex = (key: keyof typeof COLORS) => '#' + COLORS[key].value.toString(16).padStart(6, '0');

describe('pc seed per-player cosmetics', () => {
  it('gives players with their own set those cosmetics and everyone else the shared set', async () => {
    const random = new Random();
    await random.seed('players');
    const opts = options({
      settings: { mode: 'multi', players: 3 },
      cosmetics: { ootTunicKokiri: 'goronred' },
      playerCosmetics: [null, { ootTunicKokiri: 'zorablue', defaultHold: true }],
    });

    const cosmetics = playerPcSeedCosmetics(random, opts);

    expect(cosmetics).toHaveLength(3);
    expect(cosmetics[0].colors.ootTunicKokiri).toBe(hex('goronred'));
    expect(cosmetics[0].defaultHold).toBe(false);
    expect(cosmetics[1].colors.ootTunicKokiri).toBe(hex('zorablue'));
    expect(cosmetics[1].defaultHold).toBe(true);
    expect(cosmetics[2].colors.ootTunicKokiri).toBe(hex('goronred'));
    expect(cosmetics[2].defaultHold).toBe(false);
  });

  it('rolls Random colours separately for each player, with Auto following that player\'s own roll', async () => {
    const random = new Random();
    await random.seed('random-per-player');
    const everyColour = Object.fromEntries(COSMETICS.filter(c => c.type === 'color').map(c => [c.key, 'random']));
    const opts = options({
      settings: { mode: 'multi', players: 3 },
      cosmetics: { ...everyColour, mmTunicHuman: 'auto' },
    });

    const colors = playerPcSeedCosmetics(random, opts).map(c => c.colors);

    expect(new Set(colors.map(c => JSON.stringify(c))).size).toBe(3);
    for (const c of colors) {
      expect(c.mmTunicHuman).toBe(c.ootTunicKokiri);
    }
  });

  it('keeps the shared set for everyone when several teams share player numbers', async () => {
    const random = new Random();
    await random.seed('teams');
    const opts = options({
      settings: { mode: 'multi', players: 2, teams: 2 },
      cosmetics: { ootTunicKokiri: 'goronred' },
      playerCosmetics: [{ ootTunicKokiri: 'zorablue' }],
    });

    const cosmetics = playerPcSeedCosmetics(random, opts);

    expect(cosmetics.map(c => c.colors.ootTunicKokiri)).toEqual([hex('goronred'), hex('goronred')]);
  });

  it('keeps the shared set outside multiworld', async () => {
    const random = new Random();
    await random.seed('solo');
    const opts = options({ cosmetics: { ootTunicKokiri: 'goronred' }, playerCosmetics: [{ ootTunicKokiri: 'zorablue' }] });

    expect(playerPcSeedCosmetics(random, opts).map(c => c.colors.ootTunicKokiri)).toEqual([hex('goronred')]);
  });
});

describe('pc seed cosmetics fields', () => {
  it('match the toggles and colours the cosmetics registry offers', async () => {
    const random = new Random();
    await random.seed('fields');
    const cosmetics = makeCosmetics({});
    const written = makePcSeedCosmetics(cosmetics, resolveCosmeticColors(random, cosmetics));
    const toggles = Object.keys(written).filter(k => k !== 'colors').sort();

    expect(toggles).toEqual(COSMETICS.filter(c => c.type === 'boolean').map(c => c.key).sort());
    expect(Object.keys(resolveCosmeticColors(random, cosmetics)).sort()).toEqual(COSMETICS.filter(c => c.type === 'color').map(c => c.key).sort());
  });
});

describe('pc seed cosmetics editing', () => {
  it('reads a seed, saves it unchanged byte for byte, and changes only the cosmetics when edited', async () => {
    const text = await generatePcSeed({
      seed: 'pc-cosmetics-edit',
      cosmetics: { ootTunicKokiri: 'goronred', mmTunicHuman: 'auto', mmTunicFierceDeity: 'zorablue', ootShieldMirror: 'goronred', dpad: 'zorablue', defaultHold: true },
    });

    const file = readPcSeedCosmetics(text);
    expect(file.cosmetics.ootTunicKokiri).toBe('goronred');
    expect(file.cosmetics.mmTunicHuman).toBe('goronred');
    expect(file.cosmetics.dpad).toBe('zorablue');
    expect(file.cosmetics.ootTunicGoron).toBe('default');
    expect(file.cosmetics.defaultHold).toBe(true);
    expect(file.customColors).toEqual({});
    expect(file.playerId).toBe(1);

    expect(await editPcSeedCosmetics(text, file.cosmetics, file.customColors)).toBe(text);

    const edited = JSON.parse(await editPcSeedCosmetics(text, { ...file.cosmetics, ootTunicKokiri: 'default', ootTunicZora: 'goronred', nightBgm: true }, {}));
    const original = JSON.parse(text);
    expect(edited.cosmetics.colors.ootTunicKokiri).toBeUndefined();
    expect(edited.cosmetics.colors.ootTunicZora).toBe(hex('goronred'));
    expect(edited.cosmetics.nightBgm).toBe(true);
    expect({ ...edited, cosmetics: null }).toEqual({ ...original, cosmetics: null });
  });

  it('keeps colours outside the table and cosmetics fields it does not know', async () => {
    const seed = JSON.parse(await generatePcSeed({ seed: 'pc-cosmetics-custom' }));
    seed.cosmetics.colors.dpad = '#ABCDEF';
    seed.cosmetics.musicCompanion = { fileName: 'songs.zip' };
    const text = JSON.stringify(seed, null, 2);

    const file = readPcSeedCosmetics(text);
    expect(file.cosmetics.dpad).toBe('default');
    expect(file.customColors).toEqual({ dpad: '#ABCDEF' });

    const edited = JSON.parse(await editPcSeedCosmetics(text, { ...file.cosmetics, defaultHold: true }, file.customColors));
    expect(edited.cosmetics.colors.dpad).toBe('#ABCDEF');
    expect(edited.cosmetics.musicCompanion).toEqual({ fileName: 'songs.zip' });
    expect(edited.cosmetics.defaultHold).toBe(true);
  });

  it('refuses files that are not PC seeds for this generator', () => {
    expect(() => readPcSeedCosmetics(JSON.stringify({ format: 'ootmm.pc.seed.v1', generatorVersion: '31.1', cosmetics: {} }))).toThrow();
    expect(() => readPcSeedCosmetics(JSON.stringify({ format: 'ootmm.pc.seed.v2', generatorVersion: '31.1' }))).toThrow();
  });
});
