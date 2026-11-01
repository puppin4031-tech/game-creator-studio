import { expect, test } from 'bun:test';
import { shouldBroadcast, presenceCell, PRESENCE_HEARTBEAT_MS } from '../src/lib/survival/presence';
const a = { lat: 37.748, lng: 126.7496 };
test('first update always sends', () => expect(shouldBroadcast(null, a, 0)).toBe(true));
test('standing still within heartbeat does not send', () => expect(shouldBroadcast({ pos: a, at: 0 }, a, 10000)).toBe(false));
test('heartbeat after 20s', () => expect(shouldBroadcast({ pos: a, at: 0 }, a, PRESENCE_HEARTBEAT_MS)).toBe(true));
test('5m+ move after 3s sends', () => expect(shouldBroadcast({ pos: a, at: 0 }, { lat: a.lat + 0.0001, lng: a.lng }, 3000)).toBe(true));
test('move within 3s throttled', () => expect(shouldBroadcast({ pos: a, at: 0 }, { lat: a.lat + 0.001, lng: a.lng }, 1000)).toBe(false));
test('nearby players share a cell', () => expect(presenceCell(a)).toBe(presenceCell({ lat: 37.7485, lng: 126.7499 })));
