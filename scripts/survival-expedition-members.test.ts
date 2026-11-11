import { expect, test } from 'bun:test';
import { advanceExpedition, startObservedExpedition } from '../src/lib/survival/expedition';

const home = { lat: 37.7, lng: 126.7 };
const node = { id: 'n1', kind: 'node', type: 'tree', lat: home.lat, lng: home.lng } as never;
const gathered = (members: number) => {
  const c = { ...startObservedExpedition(home, { lat: home.lat + 0.002, lng: home.lng }, 0)!, target: node, hitAt: 0, statMult: 1, members };
  return advanceExpedition(c, [], 5000, false, false, () => 0.5).crew.damage;
};
test('three tribe members gather three times faster than one', () => {
  expect(gathered(3)).toBe(gathered(1) * 3);
});
