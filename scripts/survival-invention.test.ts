import { expect, test } from 'bun:test';
import { checkInvention, recipeHash, researchCost, STAT_CAP } from '../src/lib/survival/invention';

test('hash is order-independent', () => {
  expect(recipeHash({ category: 'weapon', materials: { flint: 5, branch: 2 } }))
    .toBe(recipeHash({ category: 'weapon', materials: { branch: 2, flint: 5 } }));
  expect(recipeHash({ category: 'weapon', materials: { flint: 5, branch: 2 } })).toBe('CAT:weapon|branch:2|flint:5');
});
test('flint + branch + cordage makes a plausible weapon', () => {
  const r = checkInvention({ category: 'weapon', materials: { flint: 3, branch: 2, cordage: 1 } });
  expect(r.ok).toBe(true);
});
test('multi-part weapon without a binder is rejected', () => {
  const r = checkInvention({ category: 'weapon', materials: { flint: 3, branch: 2 } });
  expect(r).toEqual({ ok: false, reason: 'no_binding' });
});
test('soil weapon is implausible', () => {
  expect(checkInvention({ category: 'weapon', materials: { soil: 5 } })).toEqual({ ok: false, reason: 'implausible' });
});
test('more than 4 slots rejected', () => {
  expect(checkInvention({ category: 'relic', materials: { jade: 1, quartz: 1, ochre: 1, bone: 1, tusk: 1 } }).ok).toBe(false);
});
test('power never exceeds hard cap', () => {
  const r = checkInvention({ category: 'weapon', materials: { ancient_fang: 20, obsidian: 20, cordage: 20 } });
  expect(r.ok && r.power <= STAT_CAP.weapon).toBe(true);
});
test('research cost is 10 + 1 per unit', () => {
  expect(researchCost({ flint: 3, branch: 2 })).toBe(15);
});
