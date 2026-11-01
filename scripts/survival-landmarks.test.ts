import { expect, test } from 'bun:test';
import { LANDMARK_COOLDOWN_MS, canClaimLandmark, classifyPoi, freshClaims, recordLandmarkClaim } from '../src/lib/survival/landmarks';
import { generateCreatures } from '../src/lib/survival/world';
import { zoneCellKey } from '../src/lib/survival/terrainZone';
import { fromGrid, toGrid } from '../src/lib/survival/geo';

const T0 = new Date(2026, 10, 1, 9, 0).getTime();

test('same landmark blocked for 30 minutes after a claim', () => {
  const c = recordLandmarkClaim(freshClaims(T0), 'a', T0);
  expect(canClaimLandmark(c, 'a', T0 + 29 * 60_000).ok).toBe(false);
  expect(canClaimLandmark(c, 'a', T0 + LANDMARK_COOLDOWN_MS).ok).toBe(true);
});

test('same landmark gives at most 3 times per day', () => {
  let c = freshClaims(T0);
  for (let i = 0; i < 3; i++) c = recordLandmarkClaim(c, 'a', T0 + i * LANDMARK_COOLDOWN_MS);
  const r = canClaimLandmark(c, 'a', T0 + 4 * LANDMARK_COOLDOWN_MS);
  expect(r.ok === false && r.reason).toBe('daily');
  expect(canClaimLandmark(c, 'a', T0 + 24 * 3600_000).ok).toBe(true);
});

test('at most 15 landmark rewards per day across all places', () => {
  let c = freshClaims(T0);
  for (let i = 0; i < 15; i++) c = recordLandmarkClaim(c, `p${i}`, T0);
  const r = canClaimLandmark(c, 'new', T0);
  expect(r.ok === false && r.reason).toBe('global');
});

test('real places map to landmark kinds', () => {
  expect(classifyPoi({ name: '스타벅스 성수점', class: 'cafe' })).toBe('spring');
  expect(classifyPoi({ name: '맥도날드', class: 'fast_food' })).toBe('smokehouse');
  expect(classifyPoi({ name: '다이소', class: 'shop' })).toBe('trader');
  expect(classifyPoi({ name: '서울숲역', class: 'railway', subclass: 'subway' })).toBe('shaman');
  expect(classifyPoi({ name: '은행', class: 'bank' })).toBe(null);
});

test('parks spawn about three times more creatures', () => {
  const center = { lat: 37.5444, lng: 127.0374 };
  const parkCells: Record<string, boolean> = {};
  const { x, y } = toGrid(center);
  for (let dx = -1000; dx <= 1000; dx += 60) for (let dy = -1000; dy <= 1000; dy += 60) parkCells[zoneCellKey(fromGrid(x + dx, y + dy))] = true;
  const q = { center, radiusM: 800, now: T0, isNight: false, depleted: {} };
  const normal = generateCreatures(q).length;
  const park = generateCreatures({ ...q, parkCells }).length;
  expect(park).toBeGreaterThan(normal * 2.5);
});

import { clusterLandmarks as _cl } from '../src/lib/survival/landmarks';
import { test as _t, expect as _e } from 'bun:test';
_t('station exits within 150m merge into one shaman', () => {
  const mk = (i: number, dLat: number) => ({ id: `lm:shaman:${i}`, kind: 'shaman' as const, lat: 37.5 + dLat, lng: 127, origin: '역삼역' });
  _e(_cl([mk(1, 0), mk(2, 0.0004), mk(3, 0.0009)]).length).toBe(1);
  _e(_cl([mk(1, 0), mk(2, 0.005)]).length).toBe(2);
});

import { generateCreatures as genC } from '../src/lib/survival/world';
import { distanceM as dist } from '../src/lib/survival/geo';
test('no creatures spawn within 100m of a shaman sanctuary', () => {
  const center = { lat: 37.5446, lng: 127.0374 };
  for (let i = 0; i < 20; i++) {
    const now = i * 8 * 60_000;
    const cs = genC({ center, radiusM: 300, now, isNight: true, depleted: {}, sanctuaries: [center] });
    for (const c of cs) expect(dist(c, center)).toBeGreaterThanOrEqual(100);
  }
});
