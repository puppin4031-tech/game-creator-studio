import { describe, expect, test } from 'bun:test';
import { addExperience } from '../src/lib/survival/progression';
import { claimWorldQuest, freshProgress } from '../src/lib/survival/worldProgress';
import { QUESTS, type QuestState } from '../src/lib/survival/quests';

const initial = () => ({ ...freshProgress(), base: null as QuestState['base'], gear: [], backpack: [], storage: [], gathered: {} });

describe('survival progression', () => {
  test('level one requires 40 XP and preserves overflow', () => {
    expect(addExperience({ level: 1, xp: 35 }, 8)).toEqual({ level: 2, xp: 3 });
  });
  test('handles multiple level-ups in a single reward', () => {
    expect(addExperience({ level: 1, xp: 0 }, 162)).toEqual({ level: 3, xp: 1 });
  });
  test('does not award incomplete quests', () => {
    const state = initial();
    expect(claimWorldQuest(state)).toBe(state);
  });
  test('first camp grants 15 XP and two berries to storage exactly once', () => {
    const state = { ...initial(), base: { lat: 37, lng: 126, level: 1 as const, placedAt: 1 } };
    const claimed = claimWorldQuest(state);
    expect(claimed.questIndex).toBe(1);
    expect(claimed.xp).toBe(15);
    expect(claimed.storage).toEqual([{ itemId: 'berry', count: 2 }]);
    expect(claimWorldQuest(claimed)).toBe(claimed);
  });
  test('craft quest counts produced cordage units rather than craft clicks', () => {
    const quest = QUESTS.find(q => q.id === 'cordage');
    if (!quest) throw new Error('Missing cordage quest');
    const state: QuestState = { ...initial(), storedGear: [], stats: { gathered: {}, crafted: { cordage: 2 }, kills: 0, deposits: 0 } };
    expect(quest.progress(state)).toEqual({ cur: 2, max: 4 });
  });
  test('saved growth and claimed quest survive serialization', () => {
    const state = { ...initial(), level: 3, xp: 9, questIndex: 2, crafted: { cordage: 4 }, deposits: 2 };
    expect({ ...initial(), ...JSON.parse(JSON.stringify(state)) }).toEqual(state);
  });
});