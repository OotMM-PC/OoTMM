import type { Item, Settings } from '@ootmm/core';
import type { Expr, LogicResultWorld } from '@ootmm/logic';

import { ItemGroups, Items } from '@ootmm/core';
import { isLocationLicenseGranting, isLocationRenewable, makeLocation } from '@ootmm/logic';

type SerializedExpr = (string | number | number[])[];

export type PcSeedLogic = {
  version: 2;
  logicMode: string;
  exprs: SerializedExpr[];
  areas: {
    [name: string]: {
      g: 0 | 1;
      t: 0 | 1 | 2 | 3;
      a: 0 | 1;
      x: { [target: string]: number };
      l: { [locationId: string]: number };
      e: { [eventId: string]: number };
      s: number[] | null;
    };
  };
  prices: number[];
  songEventsOot: number[];
  songEventsMm: number[];
  specials: { [name: string]: { items: string[]; itemsUnique: string[]; count: number } };
  masksRegular: string[];
  renewableLocations: string[];
  licenseLocations: string[];
};

const TIME_CODES: { [k: string]: 0 | 1 | 2 | 3 } = { still: 0, day: 1, night: 2, flow: 3 };

class ExprSerializer {
  readonly pool: SerializedExpr[] = [];
  private readonly indexById = new Map<number, number>();

  serialize(expr: Expr): number {
    const cached = this.indexById.get(expr.id);
    if (cached !== undefined) {
      return cached;
    }

    const node = this.encode(expr);
    const index = this.pool.length;
    this.pool.push(node);
    this.indexById.set(expr.id, index);
    return index;
  }

  private encode(expr: Expr): SerializedExpr {
    switch (expr.type) {
      case 'true': return ['t'];
      case 'false': return ['f'];
      case 'and': return ['and', expr.exprs.map(child => this.serialize(child))];
      case 'or': return ['or', expr.exprs.map(child => this.serialize(child))];
      case 'age': return ['age', expr.age];
      case 'item': return ['has', expr.item.id, expr.count];
      case 'renewable': return ['renew', expr.item.id];
      case 'license': return ['lic', expr.item.id];
      case 'event': return ['ev', expr.event];
      case 'masks': return ['masks', expr.count];
      case 'special': return ['special', expr.specialId];
      case 'time-oot': return ['oottime', expr.flag >>> 0];
      case 'time-mm': return ['mmtime', expr.value >>> 0, expr.value2 >>> 0];
      case 'price': return ['price', expr.slot, expr.max];
      case 'song-event-oot': return ['songevoot', expr.songId, expr.cmp];
      case 'song-event-mm': return ['songevmm', expr.songId, expr.cmp];
      case 'flag-on': return ['flagon', expr.flag >>> 0];
      case 'flag-off': return ['flagoff', expr.flag >>> 0];
    }
  }
}

function bakeSpecials(settings: Settings): PcSeedLogic['specials'] {
  const result: PcSeedLogic['specials'] = {};

  for (const name of Object.keys(settings.specialConds)) {
    const cond = (settings.specialConds as any)[name];
    let items = new Set<Item>();
    let itemsUnique = new Set<Item>();

    if (cond.stones) itemsUnique = new Set([...itemsUnique, ...ItemGroups.STONES]);
    if (cond.medallions) itemsUnique = new Set([...itemsUnique, ...ItemGroups.MEDALLIONS]);
    if (cond.remains) itemsUnique = new Set([...itemsUnique, ...ItemGroups.REMAINS]);
    if (cond.skullsGold) items.add(Items.OOT_GS_TOKEN);
    if (cond.skullsSwamp) items.add(Items.MM_GS_TOKEN_SWAMP);
    if (cond.skullsOcean) items.add(Items.MM_GS_TOKEN_OCEAN);
    if (cond.fairiesWF) items.add(Items.MM_STRAY_FAIRY_WF);
    if (cond.fairiesSH) items.add(Items.MM_STRAY_FAIRY_SH);
    if (cond.fairiesGB) items.add(Items.MM_STRAY_FAIRY_GB);
    if (cond.fairiesST) items.add(Items.MM_STRAY_FAIRY_ST);
    if (cond.fairyTown) items.add(Items.MM_STRAY_FAIRY_TOWN);
    if (cond.masksRegular) itemsUnique = new Set([...itemsUnique, ...ItemGroups.MASKS_REGULAR]);
    if (cond.masksTransform) itemsUnique = new Set([...itemsUnique, ...ItemGroups.MASKS_TRANSFORM]);
    if (cond.masksOot) itemsUnique = new Set([...itemsUnique, ...ItemGroups.MASKS_OOT]);
    if (cond.triforce) items.add(Items.SHARED_TRIFORCE);
    if (cond.coinsRed) items.add(Items.OOT_COIN_RED);
    if (cond.coinsGreen) items.add(Items.OOT_COIN_GREEN);
    if (cond.coinsBlue) items.add(Items.OOT_COIN_BLUE);
    if (cond.coinsYellow) items.add(Items.OOT_COIN_YELLOW);

    result[name] = {
      items: [...items].map(item => item.id).sort(),
      itemsUnique: [...itemsUnique].map(item => item.id).sort(),
      count: cond.count,
    };
  }

  return result;
}

export function makePcSeedLogic(world: LogicResultWorld, settings: Settings, worldId: number): PcSeedLogic {
  const serializer = new ExprSerializer();
  const areas: PcSeedLogic['areas'] = {};

  const serializeMap = (map: { [k: string]: Expr }): { [k: string]: number } => {
    const out: { [k: string]: number } = {};
    for (const key of Object.keys(map)) {
      out[key] = serializer.serialize(map[key]);
    }
    return out;
  };

  const allLocations = new Set<string>();
  for (const name of Object.keys(world.areas)) {
    const area = world.areas[name];
    areas[name] = {
      g: area.game === 'mm' ? 1 : 0,
      t: TIME_CODES[area.time] ?? 0,
      a: area.ageChange ? 1 : 0,
      x: serializeMap(area.exits),
      l: serializeMap(area.locations),
      e: serializeMap(area.events),
      s: area.stay === null ? null : area.stay.map(expr => serializer.serialize(expr)),
    };
    for (const loc of Object.keys(area.locations)) {
      allLocations.add(loc);
    }
  }

  const renewableLocations: string[] = [];
  const licenseLocations: string[] = [];
  for (const loc of allLocations) {
    const globalLoc = makeLocation(loc, worldId);
    if (world.checks[loc] && isLocationRenewable(world, globalLoc)) {
      renewableLocations.push(loc);
    }
    if (world.checks[loc] && isLocationLicenseGranting(world, globalLoc)) {
      licenseLocations.push(loc);
    }
  }

  return {
    version: 2,
    logicMode: settings.logic,
    exprs: serializer.pool,
    areas,
    prices: [...world.prices],
    songEventsOot: [...world.songEventsOot],
    songEventsMm: [...world.songEventsMm],
    specials: bakeSpecials(settings),
    masksRegular: [...ItemGroups.MASKS_REGULAR].map(item => item.id).sort(),
    renewableLocations: renewableLocations.sort(),
    licenseLocations: licenseLocations.sort(),
  };
}
