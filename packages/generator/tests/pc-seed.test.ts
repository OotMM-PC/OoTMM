import { describe, expect, it, vi } from 'vitest';

import { Random, SETTINGS } from '@ootmm/core';

import { generatePcSeed, makeNativeCheckAliases, pcCheckId } from '../lib/combo/pc-seed';
import { parsePcSeedSettingsPatch, REMOVED_V30_SETTINGS } from '../lib/combo/pc-seed-settings';

describe('pc seed v31 settings', () => {
  it('exports the complete v31 settings registry', async () => {
    expect(SETTINGS).toHaveLength(399);

    const artifact = JSON.parse(await generatePcSeed({
      seed: 'pc-v31-default',
      cosmetics: {
        gerudoTunic: true,
        musicCategories: false,
        musicNames: false,
      },
      settings: {
        songs: 'anywhere',
        moon: 'open',
        progressiveGoronLullabyMm: 'single',
        progressiveGoronLullabyOot: 'single',
        noDuplicatePlaythroughHints: true,
        mmStyleAirMovementOot: true,
        ootHyperEnemies: true,
        mmHyperEnemies: true,
        boomerangMm: true,
        gfsOot: true,
        slingshotMm: true,
        kamaroMaskOot: true,
        gerudoMaskMm: true,
        skullMaskMm: true,
        spookyMaskMm: true,
        songSoaringOot: true,
        songHealingOot: true,
        songAwakeningOot: true,
        songGoronOot: true,
        songZoraOot: true,
        songOrderOot: true,
        songSunMm: true,
        songZeldaLullabyMm: true,
        songSariasMm: true,
        songMinuetMm: true,
        songBoleroMm: true,
        songSerenadeMm: true,
        songRequiemMm: true,
        songNocturneMm: true,
        songPreludeMm: true,
        powderKegOot: true,
        rustyKeysOot: true,
        rustyKeysMm: true,
        sharedMaskKamaro: true,
        sharedSongHealing: true,
        sharedSongSoaring: true,
        sharedSongAwakening: true,
        sharedSongGoron: true,
        sharedSongZora: true,
        sharedSongOrder: true,
        sharedSongZeldaLullaby: true,
        sharedSongSarias: true,
        sharedSongMinuet: true,
        sharedSongBolero: true,
        sharedSongSerenade: true,
        sharedSongRequiem: true,
        sharedSongNocturne: true,
        sharedSongPrelude: true,
        sharedPowderKeg: true,
        sharedBoomerang: true,
        sharedGFS: true,
        sharedSlingshot: true,
        sharedMaskGerudo: true,
        sharedMaskSkull: true,
        sharedMaskSpooky: true,
        agelessGFS: true,
        agelessSoaring: true,
        erIndoors: 'full',
        erIndoorsTelescopes: true,
        bowSlingshotBreakHives: true,
        shuffleSkulltulaFinalReward: true,
        songEventsShuffleOot: true,
        songEventsShuffleMm: true,
        clearStateDungeonsMm: { type: 'specific', values: ['WF', 'GB'] },
      },
    }));
    expect(artifact.format).toBe('ootmm.pc.seed.v2');
    expect(artifact.generatorVersion).toBe('31.1');
    expect(artifact.cosmetics).toEqual({
      gerudoTunic: true,
      musicCategories: false,
      musicNames: false,
    });
    for (const setting of SETTINGS) {
      expect(artifact.settings).toHaveProperty(setting.key);
    }
    for (const key of [
      'noDuplicatePlaythroughHints', 'shuffleSkulltulaFinalReward', 'songEventsShuffleMm',
      'mmStyleAirMovementOot', 'ootHyperEnemies', 'mmHyperEnemies',
      'boomerangMm', 'gfsOot', 'slingshotMm', 'kamaroMaskOot', 'gerudoMaskMm', 'skullMaskMm',
      'spookyMaskMm', 'songSoaringOot', 'songHealingOot', 'songAwakeningOot', 'songGoronOot',
      'songZoraOot', 'songOrderOot', 'songSunMm', 'songZeldaLullabyMm', 'songSariasMm',
      'songMinuetMm', 'songBoleroMm', 'songSerenadeMm', 'songRequiemMm', 'songNocturneMm',
      'songPreludeMm', 'powderKegOot', 'rustyKeysOot', 'rustyKeysMm', 'sharedMaskKamaro',
      'sharedSongHealing', 'sharedSongSoaring', 'sharedSongAwakening', 'sharedSongGoron',
      'sharedSongZora', 'sharedSongOrder', 'sharedSongZeldaLullaby', 'sharedSongSarias',
      'sharedSongMinuet', 'sharedSongBolero', 'sharedSongSerenade', 'sharedSongRequiem',
      'sharedSongNocturne', 'sharedSongPrelude', 'sharedPowderKeg', 'sharedBoomerang', 'sharedGFS',
      'sharedSlingshot', 'sharedMaskGerudo', 'sharedMaskSkull', 'sharedMaskSpooky', 'agelessGFS',
      'agelessSoaring', 'erIndoorsTelescopes', 'bowSlingshotBreakHives',
    ]) {
      expect(artifact.settings[key], key).toBe(true);
    }
    expect(artifact.settings.moon).toBe('open');
    expect(artifact.settings.progressiveGoronLullabyMm).toBe('single');
    expect(artifact.settings.progressiveGoronLullabyOot).toBe('single');
    expect(artifact.songEventsOot).toHaveLength(18);
    expect(artifact.songEventsMm).toHaveLength(13);
    expect(artifact.entrancesSpawn).toHaveLength(2);
    expect(artifact.dungeonEntrances).toHaveLength(26);
    expect(artifact.logic.version).toBe(2);
    expect(artifact.logic.songEventsOot).toEqual(artifact.songEventsOot);
    expect(artifact.logic.songEventsMm).toEqual(artifact.songEventsMm);
    expect(artifact.logic.exprs.some((expr: unknown[]) => expr[0] === 'songevoot')).toBe(true);
    expect(artifact.logic.exprs.some((expr: unknown[]) => expr[0] === 'songevmm')).toBe(true);
    expect(artifact.worldFlags.clearStateDungeonsMm).toEqual(['GB', 'WF']);

    const skullReward = artifact.placements.find((placement: any) => placement.checkName === 'OOT Skulltula House 100 Tokens');
    expect(skullReward?.checkNativeId).toBe('OOT_GS_100');
    expect(artifact.placements.some((placement: any) => placement.itemId.startsWith('OOT_RUSTY_KEY_'))).toBe(true);
    expect(artifact.placements.some((placement: any) => placement.itemId.startsWith('MM_RUSTY_KEY_'))).toBe(true);
  }, 120_000);

  it('rejects removed v30 settings and normalizes v31 set settings', () => {
    for (const setting of REMOVED_V30_SETTINGS) {
      expect(() => parsePcSeedSettingsPatch({ [setting]: true })).toThrow(/removed in OoTMM v31/);
    }
    expect(parsePcSeedSettingsPatch({ clearStateDungeonsMm: ['WF', 'GB', 'WF'] })).toEqual({
      clearStateDungeonsMm: { type: 'specific', values: ['WF', 'GB'] },
    });
  });
});

describe('pc seed native identities', () => {
  it('normalizes OoT and MM check ids for the native ports', () => {
    expect(pcCheckId('oot', "Mido's House - Top Left")).toBe('OOT_MIDOS_HOUSE_TOP_LEFT');
    expect(pcCheckId('oot', 'OOT_KF_KOKIRI_SWORD_CHEST')).toBe('OOT_KF_KOKIRI_SWORD_CHEST');
    expect(pcCheckId('mm', 'Clock Town South Chest Upper')).toBe('MM_CLOCK_TOWN_SOUTH_CHEST_UPPER');
  });

  it('adds SoH Kokiri Forest aliases', () => {
    const aliases = makeNativeCheckAliases('oot', 'Mido Top Left', 'OOT_MIDOS_HOUSE_TOP_LEFT', 'chest');
    expect(aliases).toContain('OOT_KF_MIDOS_TOP_LEFT');
    expect(aliases).toContain('RC_KF_MIDOS_TOP_LEFT_CHEST');
    expect(aliases).not.toContain('OOT_MIDOS_HOUSE_TOP_LEFT');
  });

  it('adds 2S2H aliases', () => {
    const aliases = makeNativeCheckAliases('mm', 'Clock Town South Chest Upper', 'MM_CLOCK_TOWN_SOUTH_CHEST_UPPER', 'chest');
    expect(aliases).toContain('Clock Town South Chest Upper');
    expect(aliases).toContain('RC_CLOCK_TOWN_SOUTH_CHEST_UPPER');
    expect(aliases).not.toContain('MM_CLOCK_TOWN_SOUTH_CHEST_UPPER');
  });
});

describe('pc seed random starting age', () => {
  it.each([{ draw: 0, age: 'child' }, { draw: 1, age: 'adult' }])(
    'resolves $age before solving and serializing', async ({ draw, age }) => {
      const next = vi.spyOn(Random.prototype, 'next').mockReturnValueOnce(draw);
      const settings = { startingAge: 'random' as const };
      try {
        const artifact = JSON.parse(await generatePcSeed({
          seed: 'windows-spawn-options-31.1-none-random', settings,
        }));
        expect(artifact.settings.startingAge).toBe(age);
        expect(artifact.placements.length).toBeGreaterThan(0);
        expect(artifact.entrancesSpawn).toEqual([0xF20, 0xBB]);
        expect(settings.startingAge).toBe('random');
      } finally {
        next.mockRestore();
      }
    });
});
