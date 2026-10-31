import { addExperience } from './progression';
import { currentQuest, questReady, type QuestState } from './quests';
import { addStacks } from './inventory';

export interface WorldProgress {
  level: number;
  xp: number;
  questIndex: number;
  crafted: QuestState['stats']['crafted'];
  kills: number;
  deposits: number;
}

export const freshProgress = (): WorldProgress => ({ level: 1, xp: 0, questIndex: 0, crafted: {}, kills: 0, deposits: 0 });

export function claimWorldQuest<T extends WorldProgress & Omit<QuestState, 'stats' | 'storedGear'> & { gathered: QuestState['stats']['gathered'] }>(state: T): T {
  const snapshot: QuestState = { ...state, storedGear: [], stats: { gathered: state.gathered, crafted: state.crafted, kills: state.kills, deposits: state.deposits } };
  const quest = currentQuest(snapshot);
  if (!quest || !questReady(snapshot)) return state;
  return { ...state, ...addExperience(state, quest.reward.xp), questIndex: state.questIndex + 1, storage: addStacks(state.storage, quest.reward.stacks) };
}