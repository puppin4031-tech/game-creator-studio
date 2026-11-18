import { expect, test } from 'bun:test';
import { eggReachRadius, pocketBonusKg, reachRadius, visionBonus } from '../src/lib/survival/utilitySkills';
test('pocket levels add 30/60/100kg', () => {
  expect(pocketBonusKg([])).toBe(0);
  expect(pocketBonusKg(['pocket_1'])).toBe(30);
  expect(pocketBonusKg(['pocket_1', 'pocket_2'])).toBe(60);
  expect(pocketBonusKg(['pocket_1', 'pocket_2', 'pocket_3'])).toBe(100);
});
test('long reach widens 25m to 35m and scales to 75m at Lv.5', () => {
  expect(reachRadius([])).toBe(25);
  expect(reachRadius(['long_reach'])).toBe(35);
  expect(reachRadius(['long_reach'], { long_reach: 2 })).toBe(45);
  expect(reachRadius(['long_reach'], { long_reach: 5 })).toBe(75);
  expect(eggReachRadius([])).toBe(20);
  expect(eggReachRadius(['long_reach'])).toBe(30);
  expect(eggReachRadius(['long_reach'], { long_reach: 5 })).toBe(70);
});
test('keen eye adds 15m vision', () => { expect(visionBonus(['keen_eye'])).toBe(15); });
