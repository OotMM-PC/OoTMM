import type { Options, Settings } from '@ootmm/core';
import { Random, applyRandomSettings } from '@ootmm/core';

async function randomVariants(settings: Settings) {
  const random = new Random();
  const randBytes = crypto.getRandomValues(new Uint8Array(32));
  const randBytesAsHex = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  await random.seed(randBytesAsHex);

  if (settings.startingAge === 'random') {
    if (random.next() & 1) {
      settings.startingAge = 'adult';
    } else {
      settings.startingAge = 'child';
    }
  }
}

export async function prepareRandomSettings(opts: Options) {
  if (opts.mode === 'random') {
    opts.settings = await applyRandomSettings(opts.random, opts.settings);
  } else if (opts.mode === 'create') {
    await randomVariants(opts.settings);
  }
}
