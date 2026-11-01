import { expect, test } from 'bun:test';
import { generateCreatures } from '../src/lib/survival/world';
import { CREATURES } from '../src/lib/survival/entities';
import { zoneCellKey } from '../src/lib/survival/terrainZone';
import { fromGrid, toGrid } from '../src/lib/survival/geo';

const center = { lat: 37.5444, lng: 127.0374 };
const parkCellsAround = () => {
  const cells: Record<string, boolean> = {};
  const { x, y } = toGrid(center);
  for (let dx = -2000; dx <= 2000; dx += 40) for (let dy = -2000; dy <= 2000; dy += 40) cells[zoneCellKey(fromGrid(x + dx, y + dy))] = true;
  return cells;
};
const isBoss = (t: keyof typeof CREATURES) => !!(CREATURES[t] as { boss?: boolean }).boss;

test('bosses never spawn outside parks', () => {
  for (let i = 0; i < 20; i++) {
    const cs = generateCreatures({ center, radiusM: 1500, now: i * 8 * 60_000, isNight: false, depleted: {} });
    expect(cs.some((c) => isBoss(c.type))).toBe(false);
  }
});

test('bosses appear inside parks', () => {
  const parkCells = parkCellsAround();
  const cs = generateCreatures({ center, radiusM: 1500, now: 0, isNight: false, depleted: {}, parkCells });
  expect(cs.some((c) => isBoss(c.type))).toBe(true);
});

test('every boss can drop a skill book', () => {
  for (const d of Object.values(CREATURES)) if ((d as { boss?: boolean }).boss) expect(d.loot.some((l) => String(l.itemId).startsWith('tome_'))).toBe(true);
});
