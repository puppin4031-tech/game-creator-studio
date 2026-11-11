import { expect, test } from 'bun:test';
import { CREW_HEAL_FOODS, CREW_HEAL_FULL_FOODS, crewHealGain } from '../src/lib/survival/expedition';

test('cooked meat and jerky refill the crew completely', () => {
  expect(crewHealGain('cooked_meat', 100)).toBe(100);
  expect(crewHealGain('jerky', 60)).toBe(60);
});

test('fruit from apple down restores 30% of max hp', () => {
  expect(crewHealGain('apple', 100)).toBe(30);
  expect(crewHealGain('pear', 100)).toBe(30);
  expect(crewHealGain('coconut', 100)).toBe(30);
  expect(crewHealGain('berry', 100)).toBe(30);
  expect(crewHealGain('raw_meat', 100)).toBe(30);
});

test('a small crew still recovers at least 10 hp', () => {
  expect(crewHealGain('apple', 20)).toBe(10);
});

test('cooked meat is eaten before jerky, and jerky before fruit', () => {
  expect(CREW_HEAL_FOODS.slice(0, 3)).toEqual(['cooked_meat', 'jerky', 'apple']);
  expect(CREW_HEAL_FULL_FOODS).toEqual(['cooked_meat', 'jerky']);
});
