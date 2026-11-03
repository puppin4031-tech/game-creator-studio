import { expect, test } from 'bun:test';
import { pocketBonusKg, reachRadius, visionBonus } from '../src/lib/survival/utilitySkills';
test('pocket levels add 30/60/100kg', () => {
  expect(pocketBonusKg([])).toBe(0);
  expect(pocketBonusKg(['pocket_1'])).toBe(30);
  expect(pocketBonusKg(['pocket_1', 'pocket_2'])).toBe(60);
  expect(pocketBonusKg(['pocket_1', 'pocket_2', 'pocket_3'])).toBe(100);
});
test('long reach widens 25m to 35m', () => { expect(reachRadius([])).toBe(25); expect(reachRadius(['long_reach'])).toBe(35); });
test('keen eye adds 15m vision', () => { expect(visionBonus(['keen_eye'])).toBe(15); });
