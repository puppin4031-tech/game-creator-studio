import { expect, test } from 'bun:test';
import { CREW_HEAL_FOODS, crewHealGain } from '../src/lib/survival/expedition';

test('cooked meat and jerky refill completely', () => {
  expect(crewHealGain('cooked_meat', 100)).toBe(100);
  expect(crewHealGain('jerky', 60)).toBe(60);
});

test('apple, pear and coconut restore 30%', () => {
  expect(crewHealGain('apple', 100)).toBe(30);
  expect(crewHealGain('coconut', 100)).toBe(30);
});

test('berry and raw meat restore 10%', () => {
  expect(crewHealGain('berry', 100)).toBe(10);
  expect(crewHealGain('raw_meat', 100)).toBe(10);
});

test('10% foods are eaten first, cooked meat last', () => {
  expect(CREW_HEAL_FOODS.slice(0, 2)).toEqual(['berry', 'raw_meat']);
  expect(CREW_HEAL_FOODS.at(-1)).toBe('cooked_meat');
});
