import { describe, test, expect } from 'bun:test';
import { acceptGpsFix, smoothGpsFix } from '../src/lib/survival/gps';
import { generateNodes } from '../src/lib/survival/world';
import { offsetM, distanceM } from '../src/lib/survival/geo';
import { terrainOnlyStyle } from '../src/lib/survival/mapStyle';
import type { StyleSpecification } from 'maplibre-gl';

const center = { lat: 37.748, lng: 126.7496 };
const fix = { ...center, accuracy: 5, timestamp: 1000 };
describe('real GPS survival', () => {
  test('accepts the first accurate real position without a default-location speed check', () => { expect(acceptGpsFix({ ...fix, lat: 37.56 }, null)).toBe(true); });
  test('rejects GPS accuracy above 25m', () => { expect(acceptGpsFix({ ...fix, accuracy: 26 }, null)).toBe(false); });
  test('rejects movement faster than 15m per second', () => { expect(acceptGpsFix({ ...fix, ...offsetM(center, 16, 0), timestamp: 2000 }, fix)).toBe(false); });
  test('accepts normal walking and filters GPS jitter', () => {
    const next = { ...fix, ...offsetM(center, 4, 0), timestamp: 3000 };
    expect(acceptGpsFix(next, fix)).toBe(true);
    const filtered = smoothGpsFix(next, fix).fix;
    expect(distanceM(center, filtered)).toBeGreaterThan(0);
    expect(distanceM(center, filtered)).toBeLessThan(4);
  });
  test('apple trees, pear trees and flint retain identical GPS positions between players and reloads', () => {
    const query = { center, radiusM: 1000, now: 2000000, isNight: false, depleted: {} };
    const a = generateNodes(query);
    const b = generateNodes({ ...query, center: offsetM(center, 20, 0), now: 3000000 });
    for (const type of ['apple_tree', 'pear_tree', 'flint_rock']) {
      const node = a.find(n => n.type === type);
      expect(node).toBeDefined();
      expect(b.find(n => n.id === node?.id)).toEqual(node);
    }
  });
  test('a gathered resource does not return on refresh before respawn', () => {
    const query = { center, radiusM: 200, now: 2000000, isNight: false, depleted: {} };
    const node = generateNodes(query)[0];
    if (!node) throw new Error('Missing node fixture');
    expect(generateNodes({ ...query, now: query.now + 1000, depleted: { [node.id]: query.now } }).some(n => n.id === node.id)).toBe(false);
  });
  test('terrain style contains no business labels, symbols or buildings', () => {
    const style: StyleSpecification = { version: 8, sources: {}, layers: [{ id: 'ground', type: 'background' }, { id: 'poi-name', type: 'symbol' }, { id: 'building', type: 'fill', source: 'map' }, { id: 'water', type: 'fill', source: 'map' }] };
    expect(terrainOnlyStyle(style, 'green').layers.map(l => l.id)).toEqual(['ground', 'water']);
  });
});