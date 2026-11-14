import { describe, test, expect } from 'bun:test';
import { ACTIVE_SKILLS, PALISADE_COST, TAME_COST, RECRUIT_COST, RESCUE_COST, buildStructure, relocateOutpost, collectCompanionWork, payAccessible, prepareSkill, recruitCompanion, researchTechnology, tameWolf, type AbilitySave } from '../src/lib/survival/abilities';
import { TECHS } from '../src/lib/survival/tech';
import { OUTPOST_COST } from '../src/lib/survival/bases';
import { countOf } from '../src/lib/survival/inventory';
import { fromGrid, toGrid } from '../src/lib/survival/geo';
import type { WorldCreature } from '../src/lib/survival/types';

const pos = { lat: 37.748, lng: 126.7496 };
const at = 1_000_000;
const fresh = (): AbilitySave => ({ pos, base: { ...pos, level: 1 }, hp: 100, hunger: 20, techs: TECHS.map(t => t.id), storage: [], backpack: [] });
const offset = (m: number) => { const g = toGrid(pos); return fromGrid(g.x + m, g.y); };
const wolf: WorldCreature = { ...pos, kind: 'creature', type: 'wolf', id: 'wolf' };

describe('planned tech research', () => {
  for (const id of ['stone_barrage', 'roar', 'ember_scatter', 'hut_building', 'palisade', 'outpost', 'wolf_taming', 'recruitment', 'rescue']) {
    test(`${id} checks GPS, base, prerequisites, exact materials and duplicate use`, () => {
      const tech = TECHS.find(t => t.id === id);
      if (!tech?.research) throw new Error(`Missing research ${id}`);
      const p = { ...fresh(), techs: tech.requires, storage: tech.research };
      expect(researchTechnology(p, id, false).ok).toBe(false);
      expect(researchTechnology({ ...p, pos: offset(200) }, id, true).ok).toBe(false);
      expect(researchTechnology({ ...p, techs: [] }, id, true).ok).toBe(false);
      expect(researchTechnology({ ...p, storage: [] }, id, true).ok).toBe(false);
      const result = researchTechnology(p, id, true);
      expect(result.ok).toBe(true);
      if (result.ok === false) throw new Error(result.reason);
      expect(result.state.techs).toContain(id);
      expect(result.state.storage).toEqual([]);
      expect(researchTechnology(result.state, id, true).ok).toBe(false);
    });
  }
});
describe('active skill rules', () => {
  test('stone barrage consumes exactly one flint, selects nearest, deals 18, waits 12s', () => {
    const p = { ...fresh(), storage: [{ itemId: 'flint' as const, count: 2 }] };
    const result = prepareSkill(p, 'stone_barrage', [{ ...wolf, ...offset(20), id: 'far' }, wolf], at, true);
    expect(result.ok).toBe(true);
    if (result.ok === false) throw new Error(result.reason);
    expect(result.targets?.map(e => e.id)).toEqual(['wolf']);
    expect(countOf(result.state.storage, 'flint')).toBe(1);
    expect(result.state.cooldowns?.stone_barrage).toBe(at + 12000);
    expect(ACTIVE_SKILLS.stone_barrage.damage).toBe(18);
    expect(prepareSkill(result.state, 'stone_barrage', [wolf], at + 1, true).ok).toBe(false);
  });
  test('roar costs 1 hunger, calms 20s, excludes bosses, waits 30s', () => {
    const result = prepareSkill(fresh(), 'roar', [wolf, { ...wolf, id: 'boss', type: 'boss_direwolf' }], at, true);
    if (result.ok === false) throw new Error(result.reason);
    expect(result.state.hunger).toBe(19);
    expect(result.state.calmUntil).toEqual({ wolf: at + 20000 });
    expect(result.state.cooldowns?.roar).toBe(at + 30000);
    expect(prepareSkill({ ...fresh(), hunger: 0 }, 'roar', [wolf], at, true).ok).toBe(false);
  });
  test('embers require a nearby campfire, resin and branch; 12 damage and 20s cooldown', () => {
    const p = { ...fresh(), storage: ACTIVE_SKILLS.ember_scatter.cost };
    const result = prepareSkill(p, 'ember_scatter', [wolf], at, true);
    if (result.ok === false) throw new Error(result.reason);
    expect(result.state.storage).toEqual([]);
    expect(ACTIVE_SKILLS.ember_scatter.damage).toBe(12);
    expect(result.state.cooldowns?.ember_scatter).toBe(at + 20000);
    expect(prepareSkill({ ...p, pos: offset(51) }, 'ember_scatter', [{ ...wolf, ...offset(51) }], at, true).ok).toBe(false);
  });
  for (const id of Object.keys(ACTIVE_SKILLS) as (keyof typeof ACTIVE_SKILLS)[]) test(`${id} blocks missing skill, GPS and distant/absent targets`, () => {
    const p = { ...fresh(), storage: ACTIVE_SKILLS[id].cost };
    expect(prepareSkill(p, id, [wolf], at, false).ok).toBe(false);
    expect(prepareSkill({ ...p, techs: [] }, id, [wolf], at, true).ok).toBe(false);
    expect(prepareSkill(p, id, [{ ...wolf, ...offset(26) }], at, true).ok).toBe(false);
    expect(prepareSkill(p, id, [], at, true).ok).toBe(false);
  });
});
describe('building and field inventory', () => {
  const moving = () => ({ ...fresh(), pos: offset(500), outpost: { ...offset(200), lastShipAt: 1234 }, backpack: OUTPOST_COST, storage: [{ itemId: 'bone', count: 7 }] });
  test('relocation replaces only the outpost position and consumes one construction cost', () => {
    const p = moving();
    const result = relocateOutpost(p, true);
    if (result.ok === false) throw new Error(result.reason);
    expect(result.state.outpost).toEqual({ ...p.pos, lastShipAt: 1234 });
    expect(result.state.base).toEqual(p.base);
    expect(result.state.storage).toEqual([{ itemId: 'bone', count: 7 }]);
    expect(result.state.backpack).toEqual([]);
    expect(p.outpost).toEqual({ ...offset(200), lastShipAt: 1234 });
  });
  test('relocation rejects unavailable GPS', () => {
    expect(relocateOutpost(moving(), false).ok).toBe(false);
  });
  test('relocation requires an existing outpost and learned technology', () => {
    expect(relocateOutpost({ ...moving(), outpost: null }, true).ok).toBe(false);
    expect(relocateOutpost({ ...moving(), techs: [] }, true).ok).toBe(false);
  });
  test('relocation retains the 150m minimum distance from home', () => {
    expect(relocateOutpost({ ...moving(), pos: offset(149) }, true).ok).toBe(false);
    expect(relocateOutpost({ ...moving(), pos: offset(151) }, true).ok).toBe(true);
  });
  test('relocation requires leaving the old 30m outpost radius', () => {
    expect(relocateOutpost({ ...moving(), pos: offset(229) }, true).ok).toBe(false);
    expect(relocateOutpost({ ...moving(), pos: offset(231) }, true).ok).toBe(true);
  });
  test('relocation cannot charge remote storage or move without materials', () => {
    const p = { ...moving(), backpack: [], storage: OUTPOST_COST };
    expect(relocateOutpost(p, true).ok).toBe(false);
    expect(p.outpost).toEqual(moving().outpost);
    expect(p.storage).toEqual(OUTPOST_COST);
  });
  test('palisade costs 8 logs and 3 cordage and cannot be duplicated', () => {
    expect(PALISADE_COST).toEqual([{ itemId: 'log', count: 8 }, { itemId: 'cordage', count: 3 }]);
    const result = buildStructure({ ...fresh(), storage: PALISADE_COST }, 'palisade', true);
    if (result.ok === false) throw new Error(result.reason);
    expect(result.state.palisade).toBe(true);
    expect(result.state.storage).toEqual([]);
    expect(buildStructure(result.state, 'palisade', true).ok).toBe(false);
    expect(buildStructure({ ...fresh(), storage: PALISADE_COST }, 'palisade', false).ok).toBe(false);
  });
  test('outpost requires 150m and backpack materials, caps at one', () => {
    const p = { ...fresh(), backpack: OUTPOST_COST, pos: offset(151) };
    const result = buildStructure(p, 'outpost', true);
    if (result.ok === false) throw new Error(result.reason);
    expect(result.state.outpost).toEqual(p.pos);
    expect(result.state.backpack).toEqual([]);
    expect(buildStructure(result.state, 'outpost', true).ok).toBe(false);
    expect(buildStructure({ ...p, pos: offset(149) }, 'outpost', true).ok).toBe(false);
  });
  test('remote storage cannot pay field costs; nearby outpost can', () => {
    const p = { ...fresh(), storage: TAME_COST, pos: offset(200) };
    expect(payAccessible(p, TAME_COST)).toBeNull();
    expect(payAccessible({ ...p, outpost: p.pos }, TAME_COST)?.storage).toEqual([]);
  });
});
describe('NPC and pet lifecycle', () => {
  test('taming succeeds below .7, fails at .7 with cost, requires half HP and one-pet cap', () => {
    const p = { ...fresh(), storage: TAME_COST };
    const result = tameWolf(p, wolf, 12, at, true, 0.6999);
    if (result.ok === false) throw new Error(result.reason);
    expect(result.tamed).toBe(true);
    expect(result.state.companions?.[0].kind).toBe('wolf');
    expect(result.state.storage).toEqual([]);
    expect(tameWolf(result.state, wolf, 12, at + 10001, true, 0).ok).toBe(false);
    const fail = tameWolf(p, wolf, 12, at, true, 0.7);
    if (fail.ok === false) throw new Error(fail.reason);
    expect(fail.tamed).toBe(false);
    expect(fail.state.storage).toEqual([]);
    expect(tameWolf(p, wolf, 11, at, true, 0).ok).toBe(false);
    expect(tameWolf(p, { ...wolf, type: 'boss_direwolf' }, 40, at, true, 0).ok).toBe(false);
    expect(tameWolf(p, wolf, 12, at, false, 0).ok).toBe(false);
  });
  test('recruiting requires a shaman, exact payment and max two NPCs', () => {
    const p = { ...fresh(), storage: RECRUIT_COST };
    expect(recruitCompanion(p, 'gatherer', at, true).ok).toBe(false);
    const result = recruitCompanion(p, 'gatherer', at, true, pos);
    if (result.ok === false) throw new Error(result.reason);
    expect(result.state.storage).toEqual([]);
    expect(result.state.companions?.[0].kind).toBe('gatherer');
    const two = { ...result.state, storage: RECRUIT_COST, companions: [...(result.state.companions ?? []), { id: '2', kind: 'rescued' as const, name: 'two', lastWorkAt: at }] };
    expect(recruitCompanion(two, 'gatherer', at, true, pos).ok).toBe(false);
  });
  test('rescue requires boss-earned token, base and payment, consumes one token', () => {
    const p = { ...fresh(), storage: RESCUE_COST, rescueTokens: 1 };
    expect(recruitCompanion({ ...p, rescueTokens: 0 }, 'rescued', at, true).ok).toBe(false);
    const result = recruitCompanion(p, 'rescued', at, true);
    if (result.ok === false) throw new Error(result.reason);
    expect(result.state.rescueTokens).toBe(0);
    expect(result.state.storage).toEqual([]);
    expect(result.state.companions?.[0].kind).toBe('rescued');
  });
  test('work pays every five minutes, caps offline work at six rounds, cannot double-claim', () => {
    const p = { ...fresh(), companions: [{ id: '1', name: 'npc', kind: 'gatherer' as const, lastWorkAt: at }, { id: '2', name: 'rescued', kind: 'rescued' as const, lastWorkAt: at }] };
    expect(collectCompanionWork(p, at + 299999, true).ok).toBe(false);
    const result = collectCompanionWork(p, at + 86400000, true);
    if (result.ok === false) throw new Error(result.reason);
    expect(countOf(result.state.storage, 'branch')).toBe(12);
    expect(countOf(result.state.storage, 'fiber')).toBe(6);
    expect(countOf(result.state.storage, 'bone')).toBe(6);
    expect(countOf(result.state.storage, 'soil')).toBe(6);
    expect(collectCompanionWork(result.state, at + 86400000, true).ok).toBe(false);
    expect(collectCompanionWork(p, at + 86400000, false).ok).toBe(false);
    expect(collectCompanionWork({ ...p, pos: offset(200) }, at + 86400000, true).ok).toBe(false);
    expect(JSON.parse(JSON.stringify(result.state))).toEqual(result.state);
  });
});
import { claimResearch, startResearch } from '../src/lib/survival/abilities';
import { HOUR, researchDurationMs, mapFragments, payExpeditionFood, expeditionRewards } from '../src/lib/survival/homeActivities';
describe('real-time research', () => {
  test('duration tiers 2h/6h/12h/24h by material count', () => {
    expect(researchDurationMs([{ itemId: 'flint', count: 5 }])).toBe(2 * HOUR);
    expect(researchDurationMs([{ itemId: 'flint', count: 8 }])).toBe(6 * HOUR);
    expect(researchDurationMs([{ itemId: 'flint', count: 12 }])).toBe(12 * HOUR);
    expect(researchDurationMs([{ itemId: 'flint', count: 13 }])).toBe(24 * HOUR);
  });
  test('tech is learned only after the timer and claim', () => {
    const tech = TECHS.find(t => t.id === 'roar')!;
    const p = { ...fresh(), techs: tech.requires, storage: tech.research! };
    const r = startResearch(p, 'roar', true, 0);
    if (r.ok === false) throw new Error(r.reason);
    expect(r.state.techs).not.toContain('roar');
    expect(r.state.storage).toEqual([]);
    expect(startResearch({ ...r.state, storage: tech.research! }, 'roar', true, 1).ok).toBe(false);
    const readyAt = r.state.researchJobs![0].readyAt;
    expect(claimResearch(r.state, 'roar', readyAt - 1).ok).toBe(false);
    const c = claimResearch(r.state, 'roar', readyAt);
    if (c.ok === false) throw new Error(c.reason);
    expect(c.state.techs).toContain('roar');
    expect(c.state.researchJobs).toEqual([]);
  });
  test('several techs can be researched at the same time', () => {
    const a = TECHS.find(t => t.id === 'roar')!; const b = TECHS.find(t => t.id === 'stone_barrage')!;
    const p = { ...fresh(), techs: [...a.requires, ...b.requires], storage: [...a.research!, ...b.research!] };
    const r1 = startResearch(p, 'roar', true, 0); if (r1.ok === false) throw new Error(r1.reason);
    const r2 = startResearch(r1.state, 'stone_barrage', true, 0); if (r2.ok === false) throw new Error(r2.reason);
    expect(r2.state.researchJobs!.map(j => j.id)).toEqual(['roar', 'stone_barrage']);
  });
});
describe('expedition', () => {
  test('one map fragment per 25 newly explored steps', () => {
    expect(mapFragments(24, 0)).toBe(0);
    expect(mapFragments(50, 25)).toBe(1);
  });
  test('needs 2 food and rewards only basic materials', () => {
    expect(payExpeditionFood([{ itemId: 'jerky', count: 1 }], [])).toBeNull();
    expect(payExpeditionFood([{ itemId: 'jerky', count: 1 }], [{ itemId: 'cooked_meat', count: 1 }])).not.toBeNull();
    expect(expeditionRewards(42).every(s => ['raw_meat', 'bone', 'hide', 'branch'].includes(s.itemId))).toBe(true);
  });
});
