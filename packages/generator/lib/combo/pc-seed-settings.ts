import { SETTINGS } from '@ootmm/core';

export const REMOVED_V30_SETTINGS = new Set([
  'crossWarpOot',
  'crossWarpMm',
  'progressiveGoronLullaby',
  'sunSongMm',
]);

const SPECIAL_SETTINGS = new Set([
  'startingItems',
  'tricks',
  'junkLocations',
  'specialConds',
  'plando',
  'hints',
]);

export function parsePcSeedSettingsPatch(data: any): any {
  const result = {} as any;
  for (const key in data) {
    if (SPECIAL_SETTINGS.has(key)) {
      result[key] = data[key];
      continue;
    }

    const setting = SETTINGS.find(x => x.key === key);
    if (!setting) {
      if (REMOVED_V30_SETTINGS.has(key)) {
        throw new Error(`Setting ${key} was removed in OoTMM v31`);
      }
      throw new Error(`Unknown setting: ${key}`);
    }

    if (setting.type === 'set') {
      if (data[key] instanceof Array) {
        result[key] = { type: 'specific', values: Array.from(new Set(data[key])) };
      } else if (data[key] instanceof Object) {
        result[key] = { ...data[key] };
      } else {
        result[key] = { type: data[key] };
      }
    } else {
      result[key] = data[key];
    }
  }
  return result;
}
