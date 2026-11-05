import { describe, expect, test } from 'bun:test';
import { MAX_TECH_LEVEL, giantHeartHpBonus, ironSkinDef, primalStrikeMult, techLevel, techUpgradeCost, wildVitalityRegenBonus } from '../src/lib/survival/techLevels';
import { claimResearch, startResearch, type AbilitySave } from '../src/lib/survival/abilities';
import { advanceSurvivalVitals } from '../src/lib/survival/metabolism';

describe('tech levels', () => {
  test('level clamps between 1 and 5', () => {
    expect(techLevel(undefined, 'iron_skin')).toBe(1);
    expect(techLevel({ iron_skin: 9 }, 'iron_skin')).toBe(MAX_TECH_LEVEL);
  });
  test('primal strike attack grows 1.3 → 1.7', () => {
    expect(primalStrikeMult(1)).toBeCloseTo(1.3);
    expect(primalStrikeMult(5)).toBeCloseTo(1.7);
  });
  test('iron skin defense grows 2 → 6', () => {
    expect(ironSkinDef(1)).toBe(2);
    expect(ironSkinDef(5)).toBe(6);
  });
  test('giant heart adds +10 max HP per level, wild vitality +1 regen', () => {
    expect(giantHeartHpBonus(1)).toBe(10);
    expect(giantHeartHpBonus(5)).toBe(50);
    expect(wildVitalityRegenBonus(3)).toBe(3);
  });
  test('upgrade cost scales with level and stops at max', () => {
    const lv2 = techUpgradeCost('giant_heart', 1);
    expect(lv2).toEqual([{ itemId: 'hide', count: 3 }, { itemId: 'cooked_meat', count: 2 }]);
    const lv3 = techUpgradeCost('giant_heart', 2);
    expect(lv3).toEqual([{ itemId: 'hide', count: 6 }, { itemId: 'cooked_meat', count: 4 }]);
    expect(techUpgradeCost('giant_heart', MAX_TECH_LEVEL)).toBeNull();
  });
  test('book-only combat techs have a level-up cost but inspire-only techs do not', () => {
    expect(techUpgradeCost('primal_strike', 1)).not.toBeNull();
    expect(techUpgradeCost('knapping', 1)).toBeNull();
  });
});

const baseSave = (over: Partial<AbilitySave>): AbilitySave => ({
  pos: { lat: 0, lng: 0 }, base: { lat: 0, lng: 0, level: 1 }, hp: 100, hunger: 100,
  techs: [], storage: [], backpack: [], ...over,
});

describe('research level-ups', () => {
  const known = baseSave({ techs: ['giant_heart'], techLevels: { giant_heart: 2 }, storage: [{ itemId: 'hide', count: 20 }, { itemId: 'cooked_meat', count: 20 }] });
  test('re-researching a known tech queues the next level', () => {
    const r = startResearch(known, 'giant_heart', true, 1000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const job = r.state.researchJobs![0];
    expect(job.level).toBe(3);
    expect(job.readyAt).toBeGreaterThan(1000);
    expect(r.state.storage.find(s => s.itemId === 'hide')?.count).toBe(14);
  });
  test('claiming a level-up research raises the tech level', () => {
    const started = startResearch(known, 'giant_heart', true, 1000);
    if (!started.ok) throw new Error('start failed');
    const job = started.state.researchJobs![0];
    const claimed = claimResearch(started.state, 'giant_heart', job.readyAt);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(claimed.state.techLevels?.giant_heart).toBe(3);
    expect(claimed.state.techs).toContain('giant_heart');
  });
  test('maxed techs cannot be re-researched', () => {
    const maxed = baseSave({ techs: ['giant_heart'], techLevels: { giant_heart: 5 } });
    const r = startResearch(maxed, 'giant_heart', true, 1000);
    expect(r.ok).toBe(false);
  });
});

describe('max HP from tech', () => {
  test('vitals clamp to the raised max HP, not 100', () => {
    const s = advanceSurvivalVitals({ hp: 140, hunger: 100, lastTickAt: 0 }, 60_000, 10, 150);
    expect(s.hp).toBe(150);
    const capped = advanceSurvivalVitals({ hp: 140, hunger: 100, lastTickAt: 0 }, 60_000, 10);
    expect(capped.hp).toBe(100);
  });
});
