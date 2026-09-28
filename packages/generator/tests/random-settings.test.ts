import { describe, expect, it } from 'vitest';
import { options } from '@ootmm/core';
import { prepareRandomSettings } from '../lib/combo/random-settings';

describe('generator random option preparation', () => {
  it('keeps multiplayer identities while resolving random settings', async () => {
    const opts = options({ mode: 'random', settings: { mode: 'multi', players: 4, teams: 2, startingAge: 'random' } });
    await prepareRandomSettings(opts);
    expect(opts.settings.mode).toBe('multi');
    expect(opts.settings.players).toBe(4);
    expect(opts.settings.teams).toBe(2);
    expect(['child', 'adult']).toContain(opts.settings.startingAge);
  });

  it('does not randomize settings when applying a patch', async () => {
    const opts = options({ mode: 'patch', settings: { startingAge: 'random' } });
    const before = structuredClone(opts.settings);
    await prepareRandomSettings(opts);
    expect(opts.settings).toEqual(before);
  });
});
