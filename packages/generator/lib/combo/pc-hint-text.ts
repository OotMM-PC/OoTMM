import type { Game, Item, Settings } from '@ootmm/core';
import type { Confvar } from './confvars';

import { GI } from './data';
import { gi } from './randomizer/util';
import {
  BOSS_COLORS,
  BOSS_NAMES,
  CHECK_NAMES_MM,
  CHECK_NAMES_OOT,
  DUNGEON_NAMES,
  FAST_BUY_ITEMS,
  JUNK_HINTS,
  PATH_END_BOSS_NAMES,
  PATH_EVENT_NAMES,
  PATH_TRIFORCE_NAMES,
  REGION_LINK_POCKET,
  REGION_NAMELESS,
  REGION_NAMES_MM,
  REGION_NAMES_OOT,
  REGION_NOWHERE,
  SHARED_SOUL_NAMES,
  SPECIAL_COND_FIELDS,
  SPECIAL_COND_NAMES,
} from './pc-hint-tables';

export type HintTextContext = {
  settings: Settings;
  config: Set<Confvar>;
  playerId: number;
};

export type HintTextItem = {
  item: Item;
  player: number;
  importance: number;
};

const GI_BY_INDEX = new Map(Object.values(GI).map((entry) => [entry.index, entry]));
const FAST_BUY = new Set<string>(FAST_BUY_ITEMS);
const TAG_COLORS: Record<string, string> = {
  C0: '%c',
  C1: '%r',
  C2: '%p',
  C3: '%y',
  C4: '%b',
  COLOR_RED: '%r',
  COLOR_GREEN: '%g',
  COLOR_BLUE: '%b',
  COLOR_TEAL: '%c',
  COLOR_PINK: '%p',
  COLOR_YELLOW: '%y',
  COLOR_ORANGE: '%o',
};
const IMPORTANCES = ['%runreachable', '%pnot required', '%csometimes required', '%yrequired'];
const BOMBCHU_PACKS_OOT = new Set(['OOT_BOMBCHU_5', 'OOT_BOMBCHU_10', 'OOT_BOMBCHU_20']);
const BOMBCHU_PACKS_MM = new Set(['MM_BOMBCHU', 'MM_BOMBCHU_5', 'MM_BOMBCHU_10', 'MM_BOMBCHU_20']);

function giMarkup(name: string): string {
  return name.replace(/<([^>]+)>/g, (_, tag: string) => {
    const color = TAG_COLORS[tag];
    if (color === undefined) {
      throw new Error(`Unknown item text tag ${tag}`);
    }
    return color;
  });
}

function giIndex(ctx: HintTextContext, item: Item): number {
  return gi(ctx.settings, 'oot', item, false);
}

function giId(index: number): string {
  const entry = GI_BY_INDEX.get(index);
  if (!entry) {
    throw new Error(`Unknown GI index ${index}`);
  }
  return entry.id;
}

function flag(ctx: HintTextContext, name: Confvar): boolean {
  return ctx.config.has(name);
}

function hintedWithImportance(ctx: HintTextContext, id: string): boolean {
  if (!flag(ctx, 'HINT_IMPORTANCE') || id === 'NOTHING') {
    return false;
  }
  if (BOMBCHU_PACKS_OOT.has(id)) {
    return ctx.settings.bombchuBehaviorOot !== 'bagSeparate';
  }
  if (BOMBCHU_PACKS_MM.has(id)) {
    return ctx.settings.bombchuBehaviorMm !== 'bagSeparate';
  }
  return !FAST_BUY.has(id);
}

function importanceText(ctx: HintTextContext, id: string, importance: number): string {
  if (!hintedWithImportance(ctx, id) || importance < 0 || importance > 3) {
    return '';
  }
  return ` (${IMPORTANCES[importance]}%w)`;
}

function progressiveName(ctx: HintTextContext, id: string): { name: string; ambiguous: boolean } | null {
  switch (id) {
    case 'OOT_SWORD_KOKIRI':
      return flag(ctx, 'OOT_PROGRESSIVE_SWORDS') || flag(ctx, 'OOT_EXTRA_CHILD_SWORDS')
        ? { name: 'a %rProgressive Sword', ambiguous: !flag(ctx, 'SHARED_SWORDS') }
        : null;
    case 'OOT_SWORD_KNIFE':
      return flag(ctx, 'OOT_PROGRESSIVE_SWORDS_GORON') ? { name: 'a %rProgressive Goron Sword', ambiguous: false } : null;
    case 'MM_SWORD_KOKIRI':
      return { name: 'a %rProgressive Sword', ambiguous: !flag(ctx, 'SHARED_SWORDS') };
    case 'OOT_PROGRESSIVE_SHIELD_DEKU':
    case 'MM_PROGRESSIVE_SHIELD_DEKU':
      return { name: 'a %rProgressive Shield', ambiguous: !flag(ctx, 'SHARED_SHIELDS') };
    case 'OOT_OCARINA_FAIRY':
    case 'MM_OCARINA_FAIRY':
      return { name: 'a %rProgressive Ocarina', ambiguous: !flag(ctx, 'SHARED_OCARINA') };
    case 'OOT_HOOKSHOT':
    case 'MM_HOOKSHOT_SHORT':
      return { name: 'a %rProgressive Hookshot', ambiguous: !flag(ctx, 'SHARED_HOOKSHOT') };
    case 'OOT_WALLET':
    case 'MM_WALLET':
      return { name: 'a %rProgressive Wallet', ambiguous: !flag(ctx, 'SHARED_WALLETS') };
    case 'MM_SONG_GORON_HALF':
      return { name: 'a %pProgressive Goron Lullaby', ambiguous: false };
    case 'OOT_SCALE_BRONZE':
    case 'MM_SCALE_BRONZE':
      return { name: 'a %rProgressive Scale', ambiguous: !flag(ctx, 'SHARED_SCALES') && flag(ctx, 'MM_SCALES') };
    case 'OOT_GORON_BRACELET':
    case 'MM_GORON_BRACELET':
      return { name: 'a %rProgressive Strength', ambiguous: !flag(ctx, 'SHARED_STRENGTH') && flag(ctx, 'MM_STRENGTH') };
    case 'OOT_BOW':
    case 'MM_BOW':
      return flag(ctx, 'SHARED_BOWS') ? { name: 'a %rBow', ambiguous: false } : null;
    case 'MM_CLOCK1':
      return flag(ctx, 'MM_CLOCKS_PROGRESSIVE') ? { name: 'a %rProgressive Clock', ambiguous: false } : null;
  }
  if (BOMBCHU_PACKS_OOT.has(id) && ctx.settings.bombchuBehaviorOot === 'bagFirst') {
    return { name: '%rBombchu', ambiguous: false };
  }
  if (BOMBCHU_PACKS_MM.has(id) && ctx.settings.bombchuBehaviorMm === 'bagFirst') {
    return { name: '%rBombchu', ambiguous: false };
  }
  return null;
}

export function hintItemName(ctx: HintTextContext, index: number, importance: number): string {
  const id = giId(index);
  let name = giMarkup(GI_BY_INDEX.get(index)!.name);
  let ambiguous = false;
  if (id === 'OOT_ARROW_ICE' && flag(ctx, 'OOT_BLUE_FIRE_ARROWS')) {
    name = 'the %rBlue Fire Arrows';
  }
  if (id === 'OOT_ARROW_LIGHT' && flag(ctx, 'OOT_SUNLIGHT_ARROWS')) {
    name = 'the %rSunlight Arrows';
  }
  if (id === 'MM_BOMBER_NOTEBOOK' && flag(ctx, 'MENU_NOTEBOOK')) {
    name = "the %rBombers' Tracker";
  }
  if (flag(ctx, 'SHARED_SOULS_NPC') && id in SHARED_SOUL_NAMES) {
    name = (SHARED_SOUL_NAMES as Record<string, string>)[id];
  }
  const progressive = progressiveName(ctx, id);
  if (progressive) {
    name = progressive.name;
    ambiguous = progressive.ambiguous;
  }
  let text = `${name}%w`;
  if (ambiguous && !flag(ctx, 'ONLY_OOT') && !flag(ctx, 'ONLY_MM')) {
    text += index >= GI.MM_RUPEE_GREEN.index ? ' (%pMM%w)' : ' (%cOoT%w)';
  }
  return text + importanceText(ctx, id, importance);
}

function playerSuffix(ctx: HintTextContext, player: number): string {
  if (player !== 0 && player !== 0xff && player !== ctx.playerId) {
    return ` for %yPlayer ${player}%w`;
  }
  return '';
}

function worldSuffix(ctx: HintTextContext, world: number): string {
  if (world !== 0 && world !== 0xff && world !== ctx.playerId) {
    return ` in %yWorld ${world}%w`;
  }
  return '';
}

function hintItem(ctx: HintTextContext, item: HintTextItem): string {
  return hintItemName(ctx, giIndex(ctx, item.item), item.importance) + playerSuffix(ctx, item.player);
}

export function hintRegionText(ctx: HintTextContext, regionId: number, world: number, prepos: boolean): string {
  let region: readonly (string | null)[];
  if (regionId === 0xff) {
    region = REGION_LINK_POCKET;
  } else if (regionId === 0x00) {
    region = REGION_NOWHERE;
  } else if (regionId === 0xfe) {
    region = REGION_NAMELESS;
  } else {
    const table = regionId & 0x80 ? REGION_NAMES_MM : REGION_NAMES_OOT;
    region = table[(regionId & 0x7f) - 1];
    if (!region) {
      throw new Error(`Unknown hint region id ${regionId}`);
    }
  }
  const [preposition, name] = region;
  const head = prepos && preposition ? `${preposition} ` : '';
  return `${head}${name}%w${worldSuffix(ctx, world)}`;
}

function checkText(ctx: HintTextContext, checkId: number, world: number): { text: string; plural: boolean } {
  const table = checkId & 0x80 ? CHECK_NAMES_MM : CHECK_NAMES_OOT;
  const check = table[(checkId & 0x7f) - 1];
  if (!check) {
    throw new Error(`Unknown hint check id ${checkId}`);
  }
  return { text: `${check[0]}%w${worldSuffix(ctx, world)}`, plural: check[1] };
}

function pathText(path: number, subPath: number): string {
  switch (path) {
    case 0:
      return '%yWay of the Hero';
    case 1:
      return PATH_TRIFORCE_NAMES[subPath];
    case 2:
      return `${DUNGEON_NAMES[subPath][0]}Path to ${DUNGEON_NAMES[subPath][1]}%w`;
    case 3:
      return `${BOSS_COLORS[subPath]}Path to ${BOSS_NAMES[subPath]}%w`;
    case 4:
      return PATH_END_BOSS_NAMES[subPath];
    case 5:
      return PATH_EVENT_NAMES[subPath];
  }
  throw new Error(`Unknown hint path ${path}`);
}

export type GossipTextInput =
  | { type: 'path'; regionId: number; world: number; pathId: number; pathSubId: number; player: number }
  | { type: 'foolish'; regionId: number; world: number }
  | { type: 'item-exact'; checkId: number; world: number; items: HintTextItem[] }
  | { type: 'item-region'; regionId: number; world: number; item: HintTextItem }
  | { type: 'junk'; junkId: number };

export function junkHintText(index: number): string {
  return `They say that ${JUNK_HINTS[(index & 0xffff) % JUNK_HINTS.length]}.`;
}

export function gossipHintText(ctx: HintTextContext, hint: GossipTextInput): string {
  let body: string;
  switch (hint.type) {
    case 'path':
      body = `${hintRegionText(ctx, hint.regionId, hint.world, false)} is on the ${pathText(hint.pathId, hint.pathSubId)}%w${playerSuffix(ctx, hint.player)}`;
      break;
    case 'foolish':
      body = `plundering ${hintRegionText(ctx, hint.regionId, hint.world, false)} is a %pfoolish choice%w`;
      break;
    case 'item-exact': {
      const check = checkText(ctx, hint.checkId, hint.world);
      const [first, second, third] = hint.items;
      body = `${check.text}${check.plural ? ' give ' : ' gives '}${hintItem(ctx, first)}`;
      if (third) {
        body += `, ${hintItem(ctx, third)}`;
      }
      if (second) {
        body += ` and ${hintItem(ctx, second)}`;
      }
      break;
    }
    case 'item-region':
      body = `${hintItem(ctx, hint.item)} can be found ${hintRegionText(ctx, hint.regionId, hint.world, true)}`;
      break;
    case 'junk':
      return junkHintText(hint.junkId);
  }
  return `They say that ${body}.`;
}

export function npcRewardText(ctx: HintTextContext, game: Game, item: Item, cloak: Item | undefined, player: number, importance: number): string {
  let index = gi(ctx.settings, game, item, true);
  if (cloak && giId(index) !== 'MM_SOLD_OUT') {
    index = gi(ctx.settings, game, cloak, true);
  }
  return hintItemName(ctx, index, importance) + playerSuffix(ctx, player);
}

const SPECIAL_COND_INDEX: Record<string, number> = { BRIDGE: 0, MOON: 1 };
const SPECIAL_COND_TEXT_BITS: Record<string, number> = {
  stones: 0,
  medallions: 1,
  remains: 2,
  skullsGold: 4,
  skullsSwamp: 5,
  skullsOcean: 6,
  fairiesWF: 9,
  fairiesSH: 10,
  fairiesGB: 11,
  fairiesST: 12,
  fairyTown: 14,
  masksOot: 16,
  masksRegular: 17,
  masksTransform: 18,
  triforce: 21,
  coinsRed: 22,
  coinsGreen: 23,
  coinsBlue: 24,
  coinsYellow: 25,
};

function bit(n: number): number {
  return (1 << n) >>> 0;
}

function textBitsRule(bits: number, mask: number, maskRaw: number, result: number): number {
  if (mask && ((bits & mask) >>> 0) === mask) {
    return ((bits & ~maskRaw) | result) >>> 0;
  }
  return bits;
}

function textBitsRuleOotMm(ctx: HintTextContext, bits: number, mmFlags: number, ootFlags: number, result: number): number {
  const maskRaw = (ootFlags | mmFlags) >>> 0;
  let mask = maskRaw;
  if (flag(ctx, 'ONLY_OOT')) {
    mask = (mask & ~mmFlags) >>> 0;
  }
  if (flag(ctx, 'ONLY_MM')) {
    mask = (mask & ~ootFlags) >>> 0;
  }
  return textBitsRule(bits, mask, maskRaw, result);
}

export function specialCondText(ctx: HintTextContext, special: string): string | null {
  const index = SPECIAL_COND_INDEX[special];
  const name = index === undefined ? null : SPECIAL_COND_NAMES[index];
  const cond = (ctx.settings.specialConds as Record<string, Record<string, unknown>>)[special];
  if (!name || !cond || !(Number(cond.count) > 0)) {
    return null;
  }
  let bits = 0;
  for (const [key, n] of Object.entries(SPECIAL_COND_TEXT_BITS)) {
    if (cond[key]) {
      bits = (bits | bit(n)) >>> 0;
    }
  }
  bits = textBitsRuleOotMm(ctx, bits, bit(0) | bit(1), bit(2), bit(3));
  bits = textBitsRuleOotMm(ctx, bits, bit(4), bit(5) | bit(6), bit(8));
  bits = textBitsRuleOotMm(ctx, bits, 0, bit(5) | bit(6), bit(7));
  bits = textBitsRuleOotMm(ctx, bits, 0, bit(9) | bit(10) | bit(11) | bit(12) | bit(14), bit(15));
  bits = textBitsRuleOotMm(ctx, bits, 0, bit(9) | bit(10) | bit(11) | bit(12), bit(13));
  bits = textBitsRuleOotMm(ctx, bits, bit(16), bit(18) | bit(17), bit(20));
  bits = textBitsRuleOotMm(ctx, bits, 0, bit(18) | bit(17), bit(19));
  const coins = [ctx.settings.coinsRed, ctx.settings.coinsGreen, ctx.settings.coinsBlue, ctx.settings.coinsYellow];
  const coinsMask = coins.reduce((mask, count, i) => (count ? (mask | bit(22 + i)) >>> 0 : mask), 0);
  bits = textBitsRule(bits, coinsMask, bit(22) | bit(23) | bit(24) | bit(25), bit(26));
  const fields = SPECIAL_COND_FIELDS.filter((_, i) => (bits & bit(i)) !== 0).map((field) => `${field}%w`);
  const list = fields.length > 1 ? `${fields.slice(0, -1).join(', ')} and ${fields[fields.length - 1]}` : fields.join('');
  return `To ${name}%w, you must obtain at least %r${Number(cond.count)}%w of ${list}.`;
}
