const ADJECTIVES = [
  'Amber', 'Ancient', 'Brave', 'Bright', 'Bubbly', 'Calm', 'Clever', 'Cosmic', 'Crimson', 'Crystal',
  'Daring', 'Dusty', 'Eager', 'Ember', 'Fancy', 'Fierce', 'Fizzy', 'Frosty', 'Gentle', 'Gilded',
  'Glowing', 'Golden', 'Grumpy', 'Hasty', 'Hidden', 'Hollow', 'Humble', 'Icy', 'Jolly', 'Juicy',
  'Kindly', 'Lively', 'Lost', 'Lucky', 'Lunar', 'Mellow', 'Misty', 'Mossy', 'Mystic', 'Nimble',
  'Noble', 'Odd', 'Plucky', 'Proud', 'Quick', 'Quiet', 'Rapid', 'Royal', 'Rusty', 'Sandy',
  'Shady', 'Silent', 'Silver', 'Sleepy', 'Sly', 'Sneaky', 'Snowy', 'Spooky', 'Stormy', 'Sunny',
  'Swift', 'Tidal', 'Twilight', 'Wild',
];

const NOUNS = [
  'Anju', 'Armos', 'Beamos', 'Biggoron', 'Blupee', 'Bombchu', 'Boomerang', 'Cucco', 'Darunia', 'Deku',
  'Dodongo', 'Epona', 'Fairy', 'Gibdo', 'Gohma', 'Gorman', 'Goron', 'Gossip', 'Hookshot', 'Kafei',
  'Keaton', 'Kokiri', 'Lantern', 'Leever', 'Lullaby', 'Malon', 'Mask', 'Medallion', 'Milk', 'Moblin',
  'Moon', 'Navi', 'Ocarina', 'Octorok', 'Owl', 'Peahat', 'Poe', 'Potion', 'Redead', 'Romani',
  'Rupee', 'Saria', 'Scarecrow', 'Shield', 'Skulltula', 'Song', 'Stalfos', 'Tatl', 'Tektite', 'Tingle',
  'Tokay', 'Triforce', 'Wallmaster', 'Windmill', 'Wolfos', 'Zora', 'Bean', 'Bottle', 'Chest', 'Compass',
  'Feather', 'Lens', 'Mirror', 'Scale',
];

export type SeedName = {
  name: string;
  slug: string;
};

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function makeSeedName(seedId: string, settingsHash: string): SeedName {
  const value = fnv1a(`${seedId}|${settingsHash}`);
  const adjective = ADJECTIVES[value % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(value / ADJECTIVES.length) % NOUNS.length];
  return { name: `${adjective} ${noun}`, slug: `${adjective}${noun}` };
}

export function seedFileStem(name: SeedName, settingsHash: string): string {
  return `${name.slug}-${settingsHash.replace(/[^A-Za-z0-9]/g, '')}`;
}
