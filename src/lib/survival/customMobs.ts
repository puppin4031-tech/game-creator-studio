import { CREATURES, type CreatureDef } from './entities';

export interface CustomMobRow { mob_id: string; name: string; hp: number; atk: number; temper: string; xp: number; spawn_weight: number; is_active: boolean }

const registered = new Set<string>();
const TEMPERS = new Set(['passive', 'neutral', 'aggressive']);

/** Convert an admin mob row into a creature definition with safe generic loot. */
export function mobDefFromRow(r: CustomMobRow): CreatureDef {
  // Ensure active custom mobs have a noticeable minimum spawn weight on the map
  const rawW = Number(r.spawn_weight);
  const w = Math.max(0.5, Math.min(25, Number.isFinite(rawW) && rawW > 0 ? rawW * 2.5 : 3));
  return {
    name: r.name, sprite: 'mob-boar', hp: Math.max(1, Math.min(500, r.hp)), atk: Math.max(0, Math.min(50, r.atk)),
    temper: (TEMPERS.has(r.temper) ? r.temper : 'neutral') as CreatureDef['temper'], xp: Math.max(0, Math.min(1000, r.xp)),
    loot: [{ itemId: 'raw_meat', min: 1, max: 2 }, { itemId: 'hide', min: 1, max: 1, chance: 0.7 }, { itemId: 'bone', min: 0, max: 1 }],
    biomes: { plains: w, forest: w, rocky: w, wetland: w }, nightWeight: 1.2,
  };
}

let customCatalogVersion = 0;

export function getCustomMobVersion(): number {
  return customCatalogVersion;
}

/** Register admin mobs into the shared creature table (keys prefixed custom_ so built-ins are never overwritten). */
export function registerCustomMobs(rows: CustomMobRow[]) {
  const table = CREATURES as unknown as Record<string, CreatureDef>;
  for (const id of registered) delete table[id];
  registered.clear();
  for (const r of rows) {
    if (!r.is_active) continue;
    const id = `custom_${r.mob_id}`;
    table[id] = mobDefFromRow(r);
    registered.add(id);
  }
  customCatalogVersion++;
}
