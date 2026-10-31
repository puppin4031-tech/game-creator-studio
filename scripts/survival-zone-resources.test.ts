import { describe, test, expect } from 'bun:test';
import { generateNodes } from '../src/lib/survival/world';
import { zoneCellKey, TERRAIN_ZONES, type TerrainZone } from '../src/lib/survival/terrainZone';
import { offsetM } from '../src/lib/survival/geo';
import { NODES, type NodeType } from '../src/lib/survival/entities';
import { RECIPES } from '../src/lib/survival/recipes';

const CENTER = { lat: 37.66, lng: 126.98 };
const RADIUS = 1500;

function zonesFor(zone: TerrainZone) {
  const out: Record<string, TerrainZone> = {};
  for (let dx = -RADIUS; dx <= RADIUS; dx += 60) for (let dy = -RADIUS; dy <= RADIUS; dy += 60) out[zoneCellKey(offsetM(CENTER, dx, dy))] = zone;
  return out;
}

function share(zone: TerrainZone | null) {
  const nodes = generateNodes({ center: CENTER, radiusM: RADIUS, now: 0, isNight: false, depleted: {}, terrainZones: zone ? zonesFor(zone) : {} });
  const c: Partial<Record<NodeType, number>> = {};
  for (const n of nodes) c[n.type] = (c[n.type] ?? 0) + 1;
  const total = nodes.length;
  return { total, s: (t: NodeType) => (c[t] ?? 0) / total, c };
}

const S = Object.fromEntries(TERRAIN_ZONES.map((z) => [z, share(z)])) as Record<TerrainZone, ReturnType<typeof share>>;

describe('terrain zone resource ratios', () => {
  test('node positions/count do not change by zone, only types', () => {
    expect(S.riverside.total).toBe(S.highland.total);
    expect(S.plains.total).toBe(S.highland.total);
  });
  test('riverside has more clay than highland', () => {
    expect(S.riverside.s('clay_pit')).toBeGreaterThan(S.highland.s('clay_pit'));
  });
  test('highland has more stone (flint) than riverside', () => {
    expect(S.highland.s('flint_rock')).toBeGreaterThan(S.riverside.s('flint_rock'));
  });
  test('zone-boosted resources drop items used by real recipes', () => {
    const used = new Set(RECIPES.flatMap((r) => r.ingredients.map((i) => i.itemId)));
    for (const t of ['clay_pit', 'flint_rock'] as NodeType[]) {
      expect(NODES[t].loot.some((l) => used.has(l.itemId))).toBe(true);
    }
  });
  test('print ratios', () => {
    for (const z of TERRAIN_ZONES) console.log(z, JSON.stringify(S[z].c));
  });
});
