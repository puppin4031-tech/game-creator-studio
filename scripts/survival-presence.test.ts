import { expect, test } from 'bun:test';
import { shouldBroadcast, presenceCell, PRESENCE_HEARTBEAT_MS } from '../src/lib/survival/presence';
const a = { lat: 37.748, lng: 126.7496 };
test('first update always sends', () => expect(shouldBroadcast(null, a, 0)).toBe(true));
test('standing still within heartbeat does not send', () => expect(shouldBroadcast({ pos: a, at: 0 }, a, 10000)).toBe(false));
test('heartbeat after 20s', () => expect(shouldBroadcast({ pos: a, at: 0 }, a, PRESENCE_HEARTBEAT_MS)).toBe(true));
test('5m+ move after 3s sends', () => expect(shouldBroadcast({ pos: a, at: 0 }, { lat: a.lat + 0.0001, lng: a.lng }, 3000)).toBe(true));
test('move within 3s throttled', () => expect(shouldBroadcast({ pos: a, at: 0 }, { lat: a.lat + 0.001, lng: a.lng }, 1000)).toBe(false));
test('nearby players share a cell', () => expect(presenceCell(a)).toBe(presenceCell({ lat: 37.7485, lng: 126.7499 })));

import { publicPosition } from '../src/lib/survival/presence';
import { distanceM } from '../src/lib/survival/geo';
test('shared position near base is snapped to 50m grid', () => {
  const base = { lat: 37.748, lng: 126.7496 };
  const near = { lat: 37.74812, lng: 126.74977 };
  const shared = publicPosition(near, base);
  expect(distanceM(shared, near)).toBeLessThanOrEqual(36);
  // Points inside the same 50m cell collapse to one coordinate.
  expect(publicPosition({ lat: near.lat + 0.00005, lng: near.lng }, base)).toEqual(shared);
});
test('shared position away from base uses 10m grid', () => {
  const far = { lat: 37.76, lng: 126.77 };
  expect(distanceM(publicPosition({ lat: far.lat + 0.00003, lng: far.lng + 0.00004 }, { lat: 37.748, lng: 126.7496 }), far)).toBeLessThanOrEqual(8);
});
