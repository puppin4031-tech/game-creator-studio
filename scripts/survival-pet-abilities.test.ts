import { expect, test } from 'bun:test';
import { abilitiesFor, abilityText, activePetAbilities } from '../src/lib/survival/petAbilities';
const pet = (speciesId: string, level: number, uid = Math.random().toString()) => ({ uid, speciesId, name: '', level, hp: 1, deployed: false, locked: false, restUntil: 0 });

test('terranox bleed shows base plus level bonus', () => {
  const [a] = abilitiesFor('terranox01');
  expect(abilityText(a, 1)).toBe('출혈 확률 5%');
  expect(abilityText(a, 2)).toBe('출혈 확률 5% (+10%)');
  expect(abilityText(a, 3)).toBe('출혈 확률 5% (+20%)');
});
test('archeron raises the walk speed limit to 38 at Lv.2', () => {
  expect(activePetAbilities([pet('archeron02', 2)]).walkKmh).toBe(38);
});
test('two pets of the same species apply only one (highest level)', () => {
  expect(activePetAbilities([pet('terranox01', 1), pet('terranox01', 3)]).bleed).toBe(25);
  expect(activePetAbilities([pet('dracotera93', 1), pet('dracotera93', 1)]).attack).toBe(5);
});
test('legacy built-in ids share the renamed species ability', () => {
  expect(activePetAbilities([pet('baby_raptor', 1), pet('terranox01', 2)]).bleed).toBe(15);
});
