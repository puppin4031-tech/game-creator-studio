import { describe, test, expect } from 'bun:test';
import { advanceExpedition, expeditionLoot, marchToward, isPocketMovement, startObservedExpedition } from '../src/lib/survival/expedition';
import { offsetM, distanceM } from '../src/lib/survival/geo';
import { SURVIVAL_CONFIG } from '../src/lib/survival/config';
import { splitByCapacity, stackWeight } from '../src/lib/survival/inventory';
import type { WorldEntity } from '../src/lib/survival/types';
const home = { lat: 37.748, lng: 126.7496 };
const node: WorldEntity = { ...home, id: 'test-node', kind: 'node', type: 'flint_rock' };
describe('Indoor expeditions and outdoor pocket rules', () => {
  test('base backpack is 50% larger than the previous 40kg', () => { expect(SURVIVAL_CONFIG.baseCarryKg).toBe(40 * 1.5); });
  test('crew walks exactly 15m per second', () => { expect(distanceM(home, marchToward(home, offsetM(home, 300, 0), 1000))).toBeCloseTo(15, 3); });
  test('level-one dispatch needs no food or walking progress', () => { expect(startObservedExpedition(home, offsetM(home, 180, 0), 1000)?.hp).toBe(100); });
  test('pocket accepts exactly 20km/h', () => { expect(isPocketMovement(50, 9000)).toBe(true); });
  test('pocket rejects faster vehicle travel', () => { expect(isPocketMovement(51, 9000)).toBe(false); });
  test('stationary and stale GPS never qualify', () => { expect(isPocketMovement(0, 9000)).toBe(false); expect(isPocketMovement(3, 16000)).toBe(false); });
  test('outdoor gives 200% of baseline loot', () => { expect(expeditionLoot(node, false, () => 0.5)[0].count).toBe(2); expect(expeditionLoot(node, true, () => 0.5)[0].count).toBe(4); });
  test('rare relic chance is 1% indoors and 3% outdoors', () => { expect(expeditionLoot(node, false, () => 0.02).some(x => x.itemId === 'ancient_fang')).toBe(false); expect(expeditionLoot(node, true, () => 0.02).some(x => x.itemId === 'ancient_fang')).toBe(true); expect(expeditionLoot(node, true, () => 0.03).some(x => x.itemId === 'ancient_fang')).toBe(false); });
  test('crew harvest settles once and never moves player data', () => {
    const crew = startObservedExpedition(home, offsetM(home, 180, 0), 1000);
    if (!crew) throw new Error('missing crew');
    const first = advanceExpedition(crew, [node], 2000, false, false, () => 0.5);
    expect(first.completed).toBeUndefined();
    const second = advanceExpedition(first.crew, [node], 3000, false, false, () => 0.5);
    expect(second.completed?.id).toBe(node.id); expect(second.rewards[0].count).toBe(2);
    expect(advanceExpedition(second.crew, [], 4000, false, false).rewards).toHaveLength(0);
    expect('walkSteps' in second.crew).toBe(false);
  });
  test('pocket loot never overfills the bag', () => { const result = splitByCapacity([{ itemId: 'flint', count: 20 }], 1); expect(stackWeight(result.fit)).toBeLessThanOrEqual(1); expect(result.overflow.length).toBeGreaterThan(0); });
  test('danger triggers return instead of player damage', () => {
    const crew = startObservedExpedition(home, offsetM(home, 180, 0), 1000, 'hunt');
    if (!crew) throw new Error('missing crew');
    const raptor: WorldEntity = { ...home, id: 'raptor', kind: 'creature', type: 'raptor' };
    const result = advanceExpedition({ ...crew, hp: 26 }, [raptor], 2000, false, false);
    expect(result.crew.phase).toBe('returning'); expect(result.crew.hp).toBe(22);
  });
});
import { matchesFocus, patrolWaypoints, startObservedExpedition as startFocus } from '../src/lib/survival/expedition';
import { test as t2, expect as e2 } from 'bun:test';
t2('expedition focus filters targets by theme', () => {
  const at = { lat: 37.5, lng: 127 };
  e2(matchesFocus({ ...at, id: 'a', kind: 'node', type: 'berry_bush' } as never, 'survival')).toBe(true);
  e2(matchesFocus({ ...at, id: 'b', kind: 'node', type: 'flint_rock' } as never, 'survival')).toBe(false);
  e2(matchesFocus({ ...at, id: 'c', kind: 'node', type: 'flint_rock' } as never, 'materials')).toBe(true);
  e2(matchesFocus({ ...at, id: 'd', kind: 'creature', type: 'rabbit' } as never, 'hunt')).toBe(true);
  e2(matchesFocus({ ...at, id: 'e', kind: 'creature', type: 'rabbit' } as never, 'materials')).toBe(false);
});
t2('expeditions patrol through two zig-zag waypoints', () => {
  const crew = startFocus({ lat: 37.5, lng: 127 }, { lat: 37.5, lng: 127.002 }, 0, 'hunt')!;
  e2(crew.focus).toBe('hunt');
  e2(crew.waypoints).toHaveLength(2);
  e2(patrolWaypoints(crew.home, crew.destination)[0].lat).not.toBe(crew.home.lat);
});
