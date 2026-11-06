import { expect, test } from 'bun:test';
import { isWalkingPace, MAX_WALK_MPS } from '../src/lib/survival/walkPace';

test('13 km/h limit is about 3.61 m/s', () => { expect(MAX_WALK_MPS).toBeCloseTo(3.611, 2); });
test('jogging at 12 km/h counts', () => { expect(isWalkingPace(20, 6000)).toBe(true); });
test('scooter at 20 km/h does not count', () => { expect(isWalkingPace(20, 3600)).toBe(false); });
