// Reverse-logic oracle: dumps the REAL Pathfinder's reachable locations (starting items only) to diff against the launcher's solver.
// Usage: npx tsx ./lib/pc-seed-logic-validate.ts --seed X --settings <patch.json> --out <file>

import { promises as fs } from 'fs';

import { itemByID, makePlayerItem, Monitor, options } from '@ootmm/core';
import { logic, locationData, Pathfinder } from '@ootmm/logic';
import { parsePcSeedSettingsPatch } from './combo/pc-seed-settings';

const main = async () => {
  const args = process.argv.slice(2);
  let seed = 'OOTMM-PC';
  let settingsFile = '';
  let outFile = 'logic-validate.json';
  let itemsFile = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seed') seed = args[++i];
    else if (args[i] === '--settings') settingsFile = args[++i];
    else if (args[i] === '--out') outFile = args[++i];
    else if (args[i] === '--items') itemsFile = args[++i];
  }

  const settingsPatch = settingsFile ? parsePcSeedSettingsPatch(JSON.parse((await fs.readFile(settingsFile)).toString())) : {};
  const opts = options({ seed, settings: settingsPatch });
  const monitor = new Monitor({}, false);
  const result = await logic(monitor, opts);
  console.log(`logic hash: ${result.hash}`);

  // Extra owned items (simulating a mid-game state), merged on top of the seed's starting items.
  const startingItems = new Map(result.startingItems);
  if (itemsFile) {
    const extra = JSON.parse((await fs.readFile(itemsFile)).toString()) as { [id: string]: number };
    for (const id of Object.keys(extra)) {
      const playerItem = makePlayerItem(itemByID(id), 0);
      startingItems.set(playerItem, (startingItems.get(playerItem) || 0) + extra[id]);
    }
  }

  const pathfinder = new Pathfinder(result.worlds, opts.settings, startingItems);
  // Non-recursive runs defer ANALYSIS_EVENTS into newEvents applied only by the NEXT run(); iterate to the true fixpoint.
  let state = pathfinder.run(null, {});
  for (let i = 0; i < 200; i++) {
    if (state.ws.reduce((acc, ws) => acc + ws.newEvents.size, 0) === 0) {
      break; // no deferred events left: the state is a true fixpoint
    }
    state = pathfinder.run(state, { inPlace: true });
  }
  const locations = [...state.locations].map((loc) => locationData(loc).id).sort();
  const events = [...state.ws[0].events].sort();
  await fs.writeFile(outFile, JSON.stringify({ locations, events }));
  console.log(`reachable: ${locations.length} locations, ${events.length} events -> ${outFile}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
