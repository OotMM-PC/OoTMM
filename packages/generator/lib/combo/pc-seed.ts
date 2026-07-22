import type { Game, Options, OptionsInput, PlayerItem, Region, Settings } from '@ootmm/core';
import type { LogicResult, Location } from '@ootmm/logic';

import { ENTRANCES, GOSSIPS_BY_LOCATION, HINTS, Monitor, options as resolveOptions, REGIONS, regionData, SCENES } from '@ootmm/core';
import { BOSS_INDEX_BY_DUNGEON, DUNGEON_ENTRANCES, DUNGEONS_BY_KEY, END_BOSS_METADATA, locationData, logic as runLogic, PATH_EVENT_DATA } from '@ootmm/logic';
import { itemName } from './names';
import type { PcSeedLogic } from './pc-seed-logic';
import { makePcSeedLogic } from './pc-seed-logic';

const FORMAT = 'ootmm.pc.seed.v2';
const GENERATOR_VERSION = '31.1';

type PcSeedPlacement = {
  checkGame: Game;
  checkId: string;
  checkName: string;
  checkAliases: string[];
  // Physical identity so the PC ports resolve to their native check by (scene, type, flag) when the name doesn't match; checkFlag omitted for symbolic types (npc).
  checkScene?: number;
  checkType: string;
  checkNativeId: number | string;
  checkFlag?: number;
  itemGame: Game;
  itemId: string;
  itemName: string;
  cloakItemGame?: Game;
  cloakItemId?: string;
  cloakItemName?: string;
  ownerPlayer: number;
  sourcePlayer: number;
  major: boolean;
};

type PcSeedEntrance = {
  fromGame: Game;
  from: string;
  fromNativeId?: number;
  toGame: Game;
  to: string;
  toNativeId?: number;
};

type PcSeedStartingItem = {
  itemGame: Game;
  itemId: string;
  itemName: string;
  count: number;
};

type PcSeedWorldFlags = { [flag: string]: 'all' | 'none' | string[] };

type PcSeedCosmetics = {
  gerudoTunic: boolean;
  musicCategories: boolean;
  musicNames: boolean;
};

type PcSeedDungeonEntrance = {
  source: string;
  type: 'replace';
  entrance: string;
  entranceIndex: number;
} | {
  source: string;
  type: 'region';
  region: string;
  regionId: number;
};

// --- Hints: exported with the SAME numeric encoding the ROM patcher uses so the ports can port src/common/hint.c verbatim ---

type PcSeedHintRegion = {
  name: string;     // REGIONS key, e.g. 'DEKU_TREE' ('NONE' when absent)
  regionId: number; // og numeric region id (u8; MM regions have the high bit set)
  world: number;    // 0-based world of the region
};

type PcSeedHintItem = {
  itemId: string;
  itemName: string;
  player: number;     // 0 = all, else 1-based owner
  importance: number; // -1 non-major, 0 unreachable, 1 not required, 2 sometimes required, 3 required
};

type PcSeedGossipHint = {
  stone: string;   // GOSSIPS_BY_LOCATION key (stone display name)
  stoneGame: Game;
  // Runtime stone key: raw id, | 0x20 for grotto stones, | 0x40 for MM moon stones.
  stoneKey: number;
  type: 'path' | 'foolish' | 'item-exact' | 'item-region' | 'junk';
  region?: PcSeedHintRegion;   // path / foolish / item-region
  pathId?: number;             // path: 0 woth, 1 triforce, 2 dungeon, 3 boss, 4 end-boss, 5 event
  pathSubId?: number;          // path: sub index within the path kind (og table indices)
  pathPlayer?: number;         // path: 0 = all, else 1-based
  checkId?: number;            // item-exact: og named-check id (u8; MM ids have the high bit set)
  checkName?: string;          // item-exact: named-check key (readability / fallback)
  checkWorld?: number;         // item-exact: 1-based world holding the check
  items?: PcSeedHintItem[];    // item-exact (1..3) / item-region (1)
  junkId?: number;             // junk: index into og kJunkHints (mod 30)
};

type PcSeedHints = {
  gossip: PcSeedGossipHint[];
  dungeonRewards: PcSeedHintRegion[]; // 13: stones[0..2], medallions[3..8], compass hints [9..12]
  lightArrow: PcSeedHintRegion;       // Sheik / Ganon Light Arrows hint
  oathToOrder: PcSeedHintRegion[];    // 6 (song-notes mode) or 1 + NONEs
  ganonBossKey: PcSeedHintRegion;     // NONE unless ganonBossKey === 'anywhere'
  staticImportances: number[];        // FIXED_HINTS_LOCATIONS order (og staticHintsImportance)
};

type PcSeedArtifact = {
  format: typeof FORMAT;
  generatorVersion: typeof GENERATOR_VERSION;
  seedId: string;
  settingsHash: string;
  playerId: number;
  playerCount: number;
  teamId: string;
  // Fully-resolved OoTMM settings (all ~400 options) so the ports honor every flag without re-deriving.
  settings: Settings;
  // Presentation cosmetics use portable metadata instead of host-local paths.
  cosmetics: PcSeedCosmetics;
  // Per-world resolved flags (MQ dungeons, open dungeons, owls, key rings, silver-rupee pouches, ganon trials, ...).
  worldFlags: PcSeedWorldFlags;
  // Exact solver-selected dungeon keys for preCompletedDungeons (counts alone cannot reconstruct this set).
  preCompletedDungeons: string[];
  startingGame: Game;
  songEventsOot: number[];
  songEventsMm: number[];
  // Fully resolved vendor price table in generated prices.h range order.
  prices: number[];
  // Song and owl destinations use native order and bit 31 marks the other game.
  entrancesSong: number[];
  entrancesOwl: number[];
  entrancesSpawn: number[];
  dungeonEntrances: PcSeedDungeonEntrance[];
  // Boss and warp arrays use dungeon order; warp bit 31 marks MM destinations.
  bossIds: number[];
  dungeonWarps: number[];
  placements: PcSeedPlacement[];
  entrances: PcSeedEntrance[];
  startingItems: PcSeedStartingItem[];
  // og OoTMM hints; numeric ids match the ROM patcher encoding (randomizer/hints.ts) so ports can port src/common/hint.c verbatim.
  hints: PcSeedHints;
  // Compiled logic graph for the tracker; location keys match each placement's checkName.
  logic: PcSeedLogic;
};

function playerNumber(player: number | 'all'): number {
  return player === 'all' ? 0 : player + 1;
}

function gameFromItemId(itemId: string): Game {
  if (itemId.startsWith('MM_')) {
    return 'mm';
  }
  return 'oot';
}

function itemToPc(item: PlayerItem) {
  return {
    itemGame: gameFromItemId(item.item.id),
    itemId: item.item.id,
    itemName: itemName(item.item.id),
    ownerPlayer: playerNumber(item.player),
  };
}

function locationWorld(location: Location): number {
  const world = locationData(location).world;
  if (world === null) {
    throw new Error(`PC seed export cannot serialize global location ${location}`);
  }
  return world;
}

export function pcCheckId(game: Game, locationId: string): string {
  const normalized = locationId
    .replace(/['’]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toUpperCase();
  const prefix = game === 'oot' ? 'OOT_' : 'MM_';
  return normalized.startsWith(prefix) ? normalized : `${prefix}${normalized}`;
}

function addAlias(aliases: Set<string>, value: string) {
  if (value.length > 0) {
    aliases.add(value);
  }
}

function addRcAlias(aliases: Set<string>, checkId: string) {
  const withoutGame = checkId.replace(/^(OOT|MM)_/, '');
  addAlias(aliases, `RC_${withoutGame}`);
}

export function makeNativeCheckAliases(game: Game, locationId: string, checkId: string, type: string): string[] {
  const aliases = new Set<string>();
  addAlias(aliases, locationId);
  addAlias(aliases, checkId);
  addRcAlias(aliases, checkId);

  if (type === 'chest' && !checkId.endsWith('_CHEST')) {
    const chestId = `${checkId}_CHEST`;
    addAlias(aliases, chestId);
    addRcAlias(aliases, chestId);
  }

  if (game === 'oot') {
    if (checkId.startsWith('OOT_MIDOS_HOUSE_')) {
      const suffix = checkId.replace('OOT_MIDOS_HOUSE_', '');
      addAlias(aliases, `OOT_KF_MIDOS_${suffix}`);
      addAlias(aliases, `OOT_KF_MIDOS_${suffix}_CHEST`);
      addAlias(aliases, `RC_KF_MIDOS_${suffix}`);
      addAlias(aliases, `RC_KF_MIDOS_${suffix}_CHEST`);
    }
    if (checkId.startsWith('OOT_KOKIRI_SHOP_ITEM_')) {
      const suffix = checkId.replace('OOT_KOKIRI_SHOP_', '');
      addAlias(aliases, `OOT_KF_SHOP_${suffix}`);
      addAlias(aliases, `RC_KF_SHOP_${suffix}`);
    }
    if (checkId === 'OOT_KOKIRI_SWORD_CHEST') {
      addAlias(aliases, 'OOT_KF_KOKIRI_SWORD_CHEST');
      addAlias(aliases, 'RC_KF_KOKIRI_SWORD_CHEST');
    }
  }

  return [...aliases].filter(alias => alias !== checkId).sort((a, b) => a.localeCompare(b));
}

function makePlacements(logic: LogicResult, worldId: number): PcSeedPlacement[] {
  const placements: PcSeedPlacement[] = [];

  for (const [location, playerItem] of logic.items) {
    if (locationWorld(location) !== worldId) {
      continue;
    }

    const locData = locationData(location);
    const check = logic.worlds[worldId].checks[locData.id];
    if (!check) {
      continue;
    }

    const item = itemToPc(playerItem);
    const cloak = logic.itemCloaks.get(location);
    const checkId = pcCheckId(check.game, locData.id);
    const checkScene = (SCENES as Record<string, number>)[check.scene];
    const checkFlag = typeof check.id === 'number' ? check.id : undefined;
    placements.push({
      checkGame: check.game,
      checkId,
      checkName: locData.id,
      checkAliases: makeNativeCheckAliases(check.game, locData.id, checkId, check.type),
      checkScene: typeof checkScene === 'number' ? checkScene : undefined,
      checkType: check.type,
      checkNativeId: check.id,
      checkFlag,
      itemGame: item.itemGame,
      itemId: item.itemId,
      itemName: item.itemName,
      cloakItemGame: cloak ? gameFromItemId(cloak.id) : undefined,
      cloakItemId: cloak?.id,
      cloakItemName: cloak ? itemName(cloak.id) : undefined,
      ownerPlayer: item.ownerPlayer,
      sourcePlayer: worldId + 1,
      major: false,
    });
  }

  placements.sort((a, b) => a.checkId.localeCompare(b.checkId));
  return placements;
}

function makeEntrances(logic: LogicResult, worldId: number): PcSeedEntrance[] {
  const entrances: PcSeedEntrance[] = [];

  for (const [from, to] of logic.worlds[worldId].entranceOverrides) {
    const fromEntry = ENTRANCES[from as keyof typeof ENTRANCES];
    const toEntry = ENTRANCES[to as keyof typeof ENTRANCES];
    if (!fromEntry || !toEntry) {
      continue;
    }
    entrances.push({
      fromGame: fromEntry.game as Game,
      from,
      fromNativeId: fromEntry.id,
      toGame: toEntry.game as Game,
      to,
      toNativeId: toEntry.id,
    });
  }

  entrances.sort((a, b) => a.from.localeCompare(b.from));
  return entrances;
}

function makeStartingItems(logic: LogicResult, worldId: number): PcSeedStartingItem[] {
  const startingItems: PcSeedStartingItem[] = [];

  for (const [playerItem, count] of logic.startingItems) {
    if (playerItem.player !== 'all' && playerItem.player !== worldId) {
      continue;
    }
    if (count <= 0) {
      continue;
    }
    const item = itemToPc(playerItem);
    startingItems.push({
      itemGame: item.itemGame,
      itemId: item.itemId,
      itemName: item.itemName,
      count,
    });
  }

  startingItems.sort((a, b) => a.itemId.localeCompare(b.itemId));
  return startingItems;
}

function makeWorldFlags(logic: LogicResult, worldId: number): PcSeedWorldFlags {
  const result: PcSeedWorldFlags = {};
  const flags = logic.worlds[worldId].resolvedFlags;
  for (const key of Object.keys(flags) as (keyof typeof flags)[]) {
    const flag = flags[key];
    result[key as string] = flag.resolved();
  }
  return result;
}

function hintRegion(region: Region): PcSeedHintRegion {
  const d = regionData(region);
  const id = (REGIONS as Record<string, number>)[d.id];
  return {
    name: d.id,
    regionId: typeof id === 'number' ? id : 0,
    world: typeof d.world === 'number' ? d.world : 0,
  };
}

function hintItems(items: PlayerItem[], importances: number[]): PcSeedHintItem[] {
  return items.map((it, i) => ({
    itemId: it.item.id,
    itemName: itemName(it.item.id),
    player: playerNumber(it.player),
    importance: typeof importances[i] === 'number' ? importances[i] : -1,
  }));
}

function makeHints(logic: LogicResult, worldId: number): PcSeedHints {
  const wh = logic.hints[worldId];
  const gossip: PcSeedGossipHint[] = [];
  for (const stone of Object.keys(wh.gossip)) {
    const h = wh.gossip[stone];
    const pool = GOSSIPS_BY_LOCATION[stone];
    if (!pool) {
      throw new Error(`Unknown gossip ${stone} for PC seed export`);
    }
    let stoneKey = pool.id;
    if (pool.type === 'gossip-grotto') stoneKey |= 0x20;
    else if (pool.type === 'gossip-moon') stoneKey |= 0x40;
    const rec: PcSeedGossipHint = { stone, stoneGame: h.game, stoneKey, type: h.type };
    switch (h.type) {
      case 'path': {
        rec.region = hintRegion(h.region);
        const { path } = h;
        rec.pathPlayer = path.player === 'all' ? 0 : path.player + 1;
        switch (path.type) {
          case 'woth':
            rec.pathId = 0; rec.pathSubId = 0;
            break;
          case 'triforce':
            rec.pathId = 1; rec.pathSubId = { Power: 0, Courage: 1, Wisdom: 2 }[path.triforce];
            break;
          case 'dungeon':
            rec.pathId = 2; rec.pathSubId = DUNGEONS_BY_KEY.get(path.dungeon)!.id;
            break;
          case 'boss':
            rec.pathId = 3; rec.pathSubId = (BOSS_INDEX_BY_DUNGEON as Record<string, number>)[path.boss];
            break;
          case 'end-boss':
            rec.pathId = 4; rec.pathSubId = END_BOSS_METADATA.findIndex((e) => e.name === path.boss);
            break;
          case 'event':
            rec.pathId = 5; rec.pathSubId = PATH_EVENT_DATA.findIndex((e) => e.key === path.event);
            break;
        }
        break;
      }
      case 'foolish':
        rec.region = hintRegion(h.region);
        break;
      case 'item-exact': {
        const checkId = (HINTS as Record<string, number>)[h.check];
        rec.checkId = typeof checkId === 'number' ? checkId : 0;
        rec.checkName = h.check;
        rec.checkWorld = h.world + 1;
        rec.items = hintItems(h.items, h.importances);
        break;
      }
      case 'item-region':
        rec.region = hintRegion(h.region);
        rec.items = hintItems([h.item], [h.importance]);
        break;
      case 'junk':
        rec.junkId = h.id;
        break;
    }
    gossip.push(rec);
  }
  gossip.sort((a, b) => a.stone.localeCompare(b.stone));

  return {
    gossip,
    dungeonRewards: wh.dungeonRewards.map(hintRegion),
    lightArrow: hintRegion(wh.lightArrow),
    oathToOrder: wh.oathToOrder.map(hintRegion),
    ganonBossKey: hintRegion(wh.ganonBossKey),
    staticImportances: [...wh.staticHintsImportances],
  };
}

function startingGame(opts: Options): Game {
  // OoTMM is hosted by OoT; only an MM-only seed begins in Majora's Mask.
  return opts.settings.games === 'mm' ? 'mm' : 'oot';
}

// entrance() sets bit 31 when the destination game differs from the source.
function resolvedWarpEntrance(srcName: string, logic: LogicResult, worldId: number): number {
  const world = logic.worlds[worldId];
  const dstName = world.entranceOverrides.get(srcName) || srcName;
  const srcGame = /^OOT_/.test(srcName) ? 'oot' : 'mm';
  const dstGame = /^OOT_/.test(dstName) ? 'oot' : 'mm';
  const entr = ENTRANCES[dstName as keyof typeof ENTRANCES];
  if (entr === undefined) {
    throw new Error(`Unknown entrance ${dstName}`);
  }
  let data = entr.id;
  if (srcGame !== dstGame) {
    data = (data | 0x80000000) >>> 0;
  }
  return data;
}

const WARP_SONG_ENTRANCE_NAMES = [
  'OOT_WARP_SONG_MEADOW', 'OOT_WARP_SONG_CRATER', 'OOT_WARP_SONG_LAKE',
  'OOT_WARP_SONG_DESERT', 'OOT_WARP_SONG_GRAVE', 'OOT_WARP_SONG_TEMPLE',
];

const SPAWN_ENTRANCE_NAMES = ['OOT_SPAWN_ADULT', 'OOT_SPAWN_CHILD'];

// entranceAbs() sets bit 31 for MM destinations.
function resolvedAbsEntrance(srcName: string, logic: LogicResult, worldId: number): number {
  const world = logic.worlds[worldId];
  const dstName = world.entranceOverrides.get(srcName) || srcName;
  const dstGame = /^OOT_/.test(dstName) ? 'oot' : 'mm';
  const entr = ENTRANCES[dstName as keyof typeof ENTRANCES];
  if (entr === undefined) {
    throw new Error(`Unknown entrance ${dstName}`);
  }
  let data = entr.id;
  if (dstGame === 'mm') {
    data = (data | 0x80000000) >>> 0;
  }
  return data;
}

// og randomizer/config.ts dungeonWarpsBuffer default names, DT..IST order.
const DUNGEON_WARP_ENTRANCE_NAMES = [
  'OOT_KOKIRI_FOREST_FROM_DEKU_TREE', 'OOT_MOUNTAIN_TRAIL_FROM_DODONGO_CAVERN',
  'OOT_ZORA_FOUNTAIN_FROM_JABU_JABU', 'OOT_SACRED_MEADOW_FROM_TEMPLE_FOREST',
  'OOT_DEATH_CRATER_FROM_TEMPLE_FIRE', 'OOT_LAKE_HYLIA_FROM_TEMPLE_WATER',
  'OOT_GRAVEYARD_FROM_TEMPLE_SHADOW', 'OOT_DESERT_COLOSSUS_FROM_TEMPLE_SPIRIT',
  'MM_WOODFALL_FROM_TEMPLE', 'MM_SNOWHEAD_FROM_TEMPLE',
  'MM_GREAT_BAY_FROM_TEMPLE', 'MM_STONE_TOWER_INVERTED_FROM_TEMPLE',
];

const OWL_WARP_ENTRANCE_NAMES = [
  'MM_WARP_OWL_GREAT_BAY', 'MM_WARP_OWL_ZORA_CAPE', 'MM_WARP_OWL_SNOWHEAD',
  'MM_WARP_OWL_MOUNTAIN_VILLAGE', 'MM_WARP_OWL_CLOCK_TOWN', 'MM_WARP_OWL_MILK_ROAD',
  'MM_WARP_OWL_WOODFALL', 'MM_WARP_OWL_SOUTHERN_SWAMP', 'MM_WARP_OWL_IKANA_CANYON',
  'MM_WARP_OWL_STONE_TOWER',
];

function makeDungeonEntrances(logic: LogicResult, worldId: number): PcSeedDungeonEntrance[] {
  const world = logic.worlds[worldId];
  return DUNGEON_ENTRANCES.map(source => {
    const value = world.dungeonsEntrances.get(source) || { type: 'region' as const, region: 'NONE' as Region };
    if (value.type === 'replace') {
      const entranceIndex = DUNGEON_ENTRANCES.indexOf(value.entrance);
      if (entranceIndex < 0) {
        throw new Error(`PC seed export cannot serialize dungeon entrance ${value.entrance}`);
      }
      return {
        source,
        type: 'replace' as const,
        entrance: value.entrance,
        entranceIndex,
      };
    }
    const regionId = (REGIONS as Record<string, number>)[value.region];
    return {
      source,
      type: 'region' as const,
      region: value.region,
      regionId: typeof regionId === 'number' ? regionId : 0,
    };
  });
}

export function makePcSeedArtifact(logic: LogicResult, opts: Options, worldId: number, teamId: string): string {
  const artifact: PcSeedArtifact = {
    format: FORMAT,
    generatorVersion: GENERATOR_VERSION,
    seedId: opts.seed,
    settingsHash: logic.hash,
    playerId: worldId + 1,
    playerCount: opts.settings.players,
    teamId,
    settings: opts.settings,
    cosmetics: {
      gerudoTunic: opts.cosmetics.gerudoTunic,
      musicCategories: opts.cosmetics.musicCategories,
      musicNames: opts.cosmetics.musicNames,
    },
    worldFlags: makeWorldFlags(logic, worldId),
    preCompletedDungeons: [...logic.worlds[worldId].preCompleted].sort(),
    startingGame: startingGame(opts),
    songEventsOot: [...logic.worlds[worldId].songEventsOot],
    songEventsMm: [...logic.worlds[worldId].songEventsMm],
    prices: [...logic.worlds[worldId].prices],
    entrancesSong: WARP_SONG_ENTRANCE_NAMES.map(e => resolvedWarpEntrance(e, logic, worldId)),
    entrancesOwl: OWL_WARP_ENTRANCE_NAMES.map(e => resolvedWarpEntrance(e, logic, worldId)),
    entrancesSpawn: SPAWN_ENTRANCE_NAMES.map(e => resolvedWarpEntrance(e, logic, worldId)),
    dungeonEntrances: makeDungeonEntrances(logic, worldId),
    bossIds: [...logic.worlds[worldId].bossIds],
    dungeonWarps: DUNGEON_WARP_ENTRANCE_NAMES.map(e => resolvedAbsEntrance(e, logic, worldId)),
    placements: makePlacements(logic, worldId),
    entrances: makeEntrances(logic, worldId),
    startingItems: makeStartingItems(logic, worldId),
    hints: makeHints(logic, worldId),
    logic: makePcSeedLogic(logic.worlds[worldId], opts.settings, worldId),
  };

  return JSON.stringify(artifact, null, 2);
}

// Resolve options, run logic, serialize the artifact. Pure logic (no ROM/patch/native tools) so it runs in a browser worker or Node; single-world (multiworld callers use makePcSeedArtifact per world).
export async function generatePcSeed(input: OptionsInput, onLog?: (msg: string) => void): Promise<string> {
  const opts = resolveOptions(input);
  const monitor = new Monitor(onLog ? { onLog } : {}, false);
  const result = await runLogic(monitor, opts);
  const teamId = '00'.repeat(16);
  return makePcSeedArtifact(result, opts, 0, teamId);
}
