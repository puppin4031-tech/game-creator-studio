import { countOf } from './inventory';
import type { ItemId } from './items';
import type { Stack, SurvivalState } from './types';

export type QuestState = Pick<SurvivalState, 'base' | 'gear' | 'storedGear' | 'backpack' | 'storage' | 'questIndex'> & {
  stats: Pick<SurvivalState['stats'], 'gathered' | 'crafted' | 'kills' | 'deposits'>;
};

export interface QuestDef {
  id: string;
  title: string;
  hint: string;
  progress: (s: QuestState) => { cur: number; max: number };
  reward: { xp: number; stacks: Stack[] };
}

const gathered = (id: ItemId, max: number) => (s: QuestState) => ({ cur: Math.min(max, s.stats.gathered[id] ?? 0), max });
const crafted = (id: ItemId, max: number) => (s: QuestState) => ({ cur: Math.min(max, s.stats.crafted[id] ?? 0), max });
const owned = (id: ItemId, max: number) => (s: QuestState) => ({
  cur: Math.min(max, s.gear.filter((g) => g.itemId === id).length + s.storedGear.filter((g) => g.itemId === id).length + countOf(s.backpack, id) + countOf(s.storage, id)),
  max,
});

export const QUESTS: QuestDef[] = [
  { id: 'camp', title: '첫 모닥불', hint: '안전한 곳에서 [설치] 버튼으로 거점을 세우세요.', progress: (s) => ({ cur: s.base ? 1 : 0, max: 1 }), reward: { xp: 15, stacks: [{ itemId: 'berry', count: 2 }] } },
  { id: 'branches', title: '땔감 모으기', hint: '나뭇가지 더미를 채취해 나뭇가지 6개를 모으세요.', progress: gathered('branch', 6), reward: { xp: 20, stacks: [{ itemId: 'fiber', count: 3 }] } },
  { id: 'flint', title: '날카로운 돌', hint: '부싯돌 바위에서 부싯돌 4개를 캐세요.', progress: gathered('flint', 4), reward: { xp: 20, stacks: [] } },
  { id: 'deposit', title: '귀환', hint: '거점 반경 안으로 돌아오면 배낭이 자동으로 창고에 들어갑니다.', progress: (s) => ({ cur: Math.min(1, s.stats.deposits), max: 1 }), reward: { xp: 20, stacks: [] } },
  { id: 'hand_axe', title: '첫 석기', hint: '거점 제작소에서 주먹도끼를 만드세요.', progress: owned('hand_axe', 1), reward: { xp: 40, stacks: [{ itemId: 'branch', count: 3 }] } },
  { id: 'logs', title: '벌목꾼', hint: '주먹도끼로 참나무·소나무를 베어 통나무 6개를 얻으세요.', progress: gathered('log', 6), reward: { xp: 30, stacks: [] } },
  { id: 'cordage', title: '끈 꼬기', hint: '식물 섬유로 노끈 4개를 만드세요.', progress: crafted('cordage', 4), reward: { xp: 30, stacks: [] } },
  { id: 'hunt', title: '첫 사냥', hint: '산토끼나 멧돼지를 사냥하세요.', progress: (s) => ({ cur: Math.min(1, s.stats.kills), max: 1 }), reward: { xp: 40, stacks: [{ itemId: 'berry', count: 3 }] } },
  { id: 'cook', title: '불의 선물', hint: '날고기를 모닥불에 구우세요.', progress: crafted('cooked_meat', 1), reward: { xp: 30, stacks: [] } },
  { id: 'pickaxe', title: '돌을 깨는 자', hint: '돌곡괭이를 만드세요.', progress: owned('stone_pickaxe', 1), reward: { xp: 40, stacks: [] } },
  { id: 'hut', title: '뼈 움막', hint: '거점을 2단계 움막으로 올리세요.', progress: (s) => ({ cur: s.base && s.base.level >= 2 ? 1 : 0, max: 1 }), reward: { xp: 100, stacks: [{ itemId: 'resin', count: 2 }] } },
  { id: 'obsidian', title: '화산의 유리', hint: '흑요석 4개를 캐세요.', progress: gathered('obsidian', 4), reward: { xp: 60, stacks: [] } },
  { id: 'hunter5', title: '사냥 무리', hint: '짐승 8마리를 사냥하세요.', progress: (s) => ({ cur: Math.min(8, s.stats.kills), max: 8 }), reward: { xp: 80, stacks: [{ itemId: 'cooked_meat', count: 2 }] } },
  { id: 'cave', title: '동굴 거처', hint: '거점을 3단계 동굴로 올리세요.', progress: (s) => ({ cur: s.base && s.base.level >= 3 ? 1 : 0, max: 1 }), reward: { xp: 200, stacks: [] } },
  { id: 'jade', title: '옥의 전설', hint: '흑요석 곡괭이로 옥을 캐 목걸이를 만드세요.', progress: owned('jade_amulet', 1), reward: { xp: 300, stacks: [] } },
];

export const currentQuest = (s: QuestState) => QUESTS[s.questIndex] ?? null;

export function questReady(s: QuestState) {
  const q = currentQuest(s);
  if (!q) return false;
  const p = q.progress(s);
  return p.cur >= p.max;
}
