import { expect, test } from 'bun:test';
import { checkInvention, checkFacility, physicsSignal, masterworkChance, recipeHash, researchCost, STAT_CAP } from '../src/lib/survival/invention';
import { kstDay, normalizeCredits, settleCredits, rewardAmount, REWARD_TIMER_MS } from '../src/lib/survival/inventionCredits';

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
test('basic anvil permits two slots but rejects three', () => {
  expect(checkFacility({category:'tool',materials:{flint:3,cordage:1}},false).ok).toBe(true);
  expect(checkFacility({category:'tool',materials:{flint:3,cordage:1,bone:1}},false).ok).toBe(false);
});
test('altar permits four slots', () => {
  expect(checkFacility({category:'weapon',materials:{flint:3,cordage:1,bone:1,resin:1}},true).ok).toBe(true);
});
test('anvil blocks heat, sacred and non-basic gear', () => {
  expect(checkFacility({category:'tool',materials:{flint:3},heat:true},false).ok).toBe(false);
  expect(checkFacility({category:'tool',materials:{flint:3},sacred:true},false).ok).toBe(false);
  expect(checkFacility({category:'relic',materials:{jade:3}},false).ok).toBe(false);
});
test('heat changes actual power while retaining the cap', () => {
  const input = {category:'tool' as const,materials:{flint:3}};
  const cold=checkFacility(input,true), hot=checkFacility({...input,heat:true},true);
  expect(cold.ok && hot.ok && hot.power>cold.power).toBe(true);
  expect(hot.ok && hot.power<=2.5).toBe(true);
});
test('impossible material combinations show smoke; rare synergy shows sacred', () => {
  expect(physicsSignal({category:'weapon',materials:{fiber:1}},false).kind).toBe('smoke');
  expect(physicsSignal({category:'relic',materials:{jade:3}},true).kind).toBe('sacred');
});
test('altar triples masterwork odds', () => {
  expect(masterworkChance(true)).toBe(masterworkChance(false)*3);
});
test('five free credits reset at KST midnight and preserve bonus/fragments', () => {
  const before=Date.parse('2026-11-05T14:59:59Z'), after=before+1000;
  const spent={...normalizeCredits(undefined,before),freeLeft:0,bonus:3,fragments:2};
  expect(kstDay(before)).toBe('2026-11-05');
  expect(normalizeCredits(spent,after)).toMatchObject({day:'2026-11-06',freeLeft:5,bonus:3,fragments:2});
});
test('AI rejection preserves credits and adds one fragment', () => {
  const c=normalizeCredits();
  expect(settleCredits(c,false)).toMatchObject({freeLeft:5,bonus:0,fragments:1});
});
test('successful invention spends exactly one; zero cannot spend', () => {
  const c=normalizeCredits();
  expect(settleCredits(c,true)?.freeLeft).toBe(4);
  expect(settleCredits({...c,freeLeft:0},true)).toBe(null);
});
test('timer is 15 seconds and rewards are one or three', () => {
  expect(REWARD_TIMER_MS).toBe(15000);
  expect(rewardAmount('timer')).toBe(1);
  expect(rewardAmount('invite')).toBe(3);
  expect(rewardAmount('walk')).toBe(3);
});
