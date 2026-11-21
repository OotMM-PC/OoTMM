// PC-seed-only generator: runs the logic pass alone (no ROM/patch/toolchain) and emits one PC-seed JSON per world.
// Usage: npx tsx ./lib/pc-seed-cli.ts --seed X [--preset <name>] [--settings <json|b64>] [--players <n>] [--config <yaml>]

import type { OptionsInput } from '@ootmm/core';

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

import { importSettings, Monitor, options, Random, randString } from '@ootmm/core';
import { logic } from '@ootmm/logic';

// Import combo modules directly, NOT from ./combo's index: the index re-exports generator.ts, which pulls in the ROM patch/native tooling we avoid.
import { PRESETS } from './combo/presets';
import { makePcSeedArtifact } from './combo/pc-seed';
import { playerPcSeedCosmetics } from './combo/pc-seed-cosmetics';
import { parsePcSeedSettingsPatch } from './combo/pc-seed-settings';
import { prepareRandomSettings } from './combo/random-settings';
import { makeSeedName, seedFileStem } from './combo/seed-name';
import { makeSpoilerLog } from './combo/spoiler';

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'out');

// Normalize a hand-written JSON settings patch: set-type settings accept shorthand "all"/"none"/["WF","GB"] besides the full { type, values } object.
async function fileExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

const makeOptions = async (args: string[]): Promise<OptionsInput> => {
  const opts: OptionsInput = {};
  opts.settings = {};
  let players: number | null = null;

  for (let i = 0; i < args.length; i++) {
    const opt = args[i];
    switch (opt) {
      case '--seed':
        opts.seed = args[++i];
        break;
      case '--random':
        opts.mode = 'random';
        break;
      case '--players':
      case '--count': {
        players = Number(args[++i]);
        if (!Number.isInteger(players) || players < 1) {
          throw new Error(`Invalid player count: ${args[i]}`);
        }
        break;
      }
      case '--config': {
        const configFile = await fs.readFile(args[++i]);
        const config = YAML.parse(configFile.toString());
        const settingsVal = config.settings;
        if (settingsVal) {
          if (typeof settingsVal === 'string') {
            opts.settings = importSettings(settingsVal);
          } else {
            opts.settings = parsePcSeedSettingsPatch(config.settings);
          }
        }
        if (config.cosmetics) {
          opts.cosmetics = config.cosmetics;
        }
        if (Array.isArray(config.playerCosmetics)) {
          opts.playerCosmetics = config.playerCosmetics;
        }
        if (config.seed) {
          opts.seed = config.seed.toString().trim();
        }
        break;
      }
      case '--settings': {
        // Either a path to a JSON settings-patch file, or an OoTMM settings string (UI Export Settings).
        const value = args[++i];
        if (await fileExists(value)) {
          const raw = JSON.parse((await fs.readFile(value)).toString());
          opts.settings = parsePcSeedSettingsPatch(raw);
        } else {
          opts.settings = importSettings(value);
        }
        break;
      }
      case '--preset': {
        const presetName = args[++i];
        const preset = PRESETS[presetName];
        if (!preset) {
          throw new Error(`Unknown preset: ${presetName}`);
        }
        opts.settings = preset;
        break;
      }
      default:
        throw new Error(`Unknown option: ${opt}`);
    }
  }

  if (players !== null) {
    opts.settings = { ...opts.settings, mode: players > 1 ? 'multi' : 'single', players };
  }

  return opts;
};

const main = async () => {
  const optsInput = await makeOptions(process.argv.slice(2));
  const opts = options(optsInput);
  await prepareRandomSettings(opts);

  const monitor = new Monitor({}, false);
  console.log(`Running OoTMM logic (seed=${opts.seed}, games=${opts.settings.games}, players=${opts.settings.players})...`);
  const logicResult = await logic(monitor, opts);
  const seedName = makeSeedName(opts.seed, logicResult.hash);
  const stem = seedFileStem(seedName, logicResult.hash);
  console.log(`Logic done. name=${seedName.name}, hash=${logicResult.hash}, worlds=${logicResult.worlds.length}`);

  await fs.mkdir(OUT_DIR, { recursive: true });
  const players = opts.settings.players;
  const teams = opts.settings.teams;
  const teamIds = Array.from({ length: teams }, () =>
    teams === 1 ? '00'.repeat(16) : Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex'));

  const colorRandom = new Random();
  await colorRandom.seed(randString());
  const cosmetics = playerPcSeedCosmetics(colorRandom, opts);
  const written: string[] = [];
  for (let i = 0; i < players; i++) {
    for (let team = 0; team < teams; team++) {
      const pcSeed = makePcSeedArtifact(logicResult, opts, i, teamIds[team], cosmetics[i]);
      const player = players === 1 ? '' : `-Player${i + 1}`;
      const teamSuffix = teams === 1 ? '' : `-Team${team + 1}`;
      const name = `${stem}${player}${teamSuffix}.ootmm.json`;
      await fs.writeFile(path.join(OUT_DIR, name), pcSeed);
      written.push(name);
    }
  }
  console.log(`Wrote ${written.length} PC seed file(s) to out/:`);
  written.forEach((n) => console.log('  ' + n));
  if (opts.settings.generateSpoilerLog) {
    const spoilerName = `${stem}-Spoiler.txt`;
    await fs.writeFile(path.join(OUT_DIR, spoilerName), makeSpoilerLog(logicResult, opts));
    console.log(`Wrote spoiler log to out/: ${spoilerName}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
