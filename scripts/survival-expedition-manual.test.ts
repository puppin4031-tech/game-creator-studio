import { expect, test } from 'bun:test';
import { steerExpedition, startObservedExpedition, advanceExpedition } from '../src/lib/survival/expedition';
import { distanceM } from '../src/lib/survival/geo';

const home = { lat: 37.5, lng: 127 };
const crew0 = startObservedExpedition(home, { lat: 37.501, lng: 127 }, 0)!;

test('joystick move cancels the current action and enters manual mode', () => {
  const c = steerExpedition({ ...crew0, target: { id: 'x', kind: 'node', type: 'branch_pile', lat: 37.5, lng: 127 } as never, damage: 3 }, 1, 0);
  expect(c.manual).toBe(true); expect(c.target).toBeUndefined(); expect(c.damage).toBe(0);
  expect(Math.round(distanceM(home, c.pos))).toBe(2);
});
test('manual crew without a target stays put', () => {
  const c = steerExpedition(crew0, 1, 0);
  const r = advanceExpedition(c, [], 1000, false, false);
  expect(r.crew.pos).toEqual(c.pos);
});

import { autoPatrolTarget as pickAuto } from '../src/lib/survival/expedition';
test('auto patrol repels an ambushing raptor before gathering', () => {
  const crew = { pos: { lat: 0, lng: 0 }, focus: 'materials' } as never;
  const raptor = { id: 'r', kind: 'creature', type: 'raptor', lat: 0.00003, lng: 0 } as never;
  const stone = { id: 's', kind: 'node', type: 'stone', lat: 0.00001, lng: 0 } as never;
  expect((pickAuto(crew, [stone, raptor]) as { id: string }).id).toBe('r');
});
