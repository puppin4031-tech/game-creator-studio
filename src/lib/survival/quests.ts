import { countOf } from './inventory';
import type { ItemId } from './items';
import type { Stack, SurvivalState } from './types';

export type QuestState = Pick<SurvivalState, 'base' | 'gear' | 'storedGear' | 'backpack' | 'storage' | 'questIndex'> & {
  level?: number;
  stats: Pick<SurvivalState['stats'], 'gathered' | 'crafted' | 'kills' | 'deposits'>;
};

export interface QuestDef {
  id: string;
  title: string;
  hint: string;
  /** 떠돌이 주술사가 생존 목표를 부여하며 건네는 말 */
  shamanQuote: string;
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
  {
    id: 'camp',
    title: '첫 모닥불',
    hint: '안전한 곳에서 [설치] 버튼으로 거점을 세우세요.',
    shamanQuote: '뼈가 시린 밤이 오기 전에 자네의 둥지부터 피워야 한다네. 나뭇가지로 첫 불씨를 지펴 보게.',
    progress: (s) => ({ cur: s.base ? 1 : 0, max: 1 }),
    reward: { xp: 15, stacks: [{ itemId: 'berry', count: 2 }] },
  },
  {
    id: 'branches',
    title: '땔감 모으기',
    hint: '나뭇가지 더미를 채취해 나뭇가지 6개를 모으세요.',
    shamanQuote: '불씨가 꺼지면 맹수들이 눈을 번뜩이지. 주변 풀숲에서 마른 나뭇가지 6개를 주워 오게나.',
    progress: gathered('branch', 6),
    reward: { xp: 20, stacks: [{ itemId: 'fiber', count: 3 }] },
  },
  {
    id: 'flint',
    title: '날카로운 돌',
    hint: '부싯돌 바위에서 부싯돌 4개를 캐세요.',
    shamanQuote: '맨손으론 껍질 하나 벗기기 어렵지. 단단한 부싯돌 4개를 주워 오면 첫 석기를 빚는 법을 알려주겠네.',
    progress: gathered('flint', 4),
    reward: { xp: 20, stacks: [] },
  },
  {
    id: 'deposit',
    title: '귀환',
    hint: '거점 반경 안으로 돌아와 배낭의 자원을 창고에 보관하세요.',
    shamanQuote: '모은 재물을 품에만 안고 다니다간 쓰러졌을 때 다 잃는다네. 거점 창고에 갈무리하는 법을 익히게.',
    progress: (s) => ({ cur: Math.min(1, s.stats.deposits), max: 1 }),
    reward: { xp: 20, stacks: [] },
  },
  {
    id: 'hand_axe',
    title: '첫 석기',
    hint: '거점 제작소에서 주먹도끼를 만드세요.',
    shamanQuote: '돌과 나무를 엮어 자네의 첫 주먹도끼를 만들어 보게! 도구를 쥔 순간부터 비로소 인간이라네.',
    progress: owned('hand_axe', 1),
    reward: { xp: 40, stacks: [{ itemId: 'branch', count: 3 }] },
  },
  {
    id: 'logs',
    title: '벌목꾼',
    hint: '주먹도끼로 참나무·소나무를 베어 통나무 6개를 얻으세요.',
    shamanQuote: '이제 주먹도끼로 큰 나무를 쓰러뜨려 통나무 6개를 구해 오게. 튼튼한 방책과 쉼터의 기둥이 될 걸세.',
    progress: gathered('log', 6),
    reward: { xp: 30, stacks: [] },
  },
  {
    id: 'cordage',
    title: '끈 꼬기',
    hint: '식물 섬유로 노끈 4개를 만드세요.',
    shamanQuote: '풀줄기를 비틀어 노끈 4개를 꼬아 보게. 돌과 나무를 단단히 묶는 생명의 줄이라네.',
    progress: crafted('cordage', 4),
    reward: { xp: 30, stacks: [] },
  },
  {
    id: 'hunt',
    title: '첫 사냥',
    hint: '산토끼나 멧돼지를 사냥하세요.',
    shamanQuote: '열매만으론 기운을 차릴 수 없어. 밖으로 나가 첫 사냥감을 쓰러뜨리고 사냥꾼의 피를 깨우게!',
    progress: (s) => ({ cur: Math.min(1, s.stats.kills), max: 1 }),
    reward: { xp: 40, stacks: [{ itemId: 'berry', count: 3 }] },
  },
  {
    id: 'cook',
    title: '불의 선물',
    hint: '날고기를 모닥불에 구우세요.',
    shamanQuote: '날고기를 불에 구우면 기운이 배로 솟는다네. 모닥불 화로에 고기를 구워 오게나.',
    progress: crafted('cooked_meat', 1),
    reward: { xp: 30, stacks: [] },
  },
  {
    id: 'pickaxe',
    title: '돌을 깨는 자',
    hint: '돌곡괭이를 만드세요.',
    shamanQuote: '더 깊은 바위 속 광물을 캐려면 돌곡괭이가 필요하지. 하나 벼려 오게.',
    progress: owned('stone_pickaxe', 1),
    reward: { xp: 40, stacks: [] },
  },
  {
    id: 'hut',
    title: '뼈 움막',
    hint: '거점을 2단계 움막으로 올리세요.',
    shamanQuote: '모닥불만으론 칼바람을 막기 어렵네. 통나무와 가죽, 뼈를 모아 거점을 2단계 뼈 움막으로 높여 보게.',
    progress: (s) => ({ cur: s.base && s.base.level >= 2 ? 1 : 0, max: 1 }),
    reward: { xp: 100, stacks: [{ itemId: 'resin', count: 2 }] },
  },
  {
    id: 'obsidian',
    title: '화산의 유리',
    hint: '흑요석 4개를 캐세요.',
    shamanQuote: '검은 불꽃이 굳어 된 흑요석 4개를 캐 오게. 그 어떤 맹수의 가죽도 가를 수 있는 신비한 돌이라네.',
    progress: gathered('obsidian', 4),
    reward: { xp: 60, stacks: [] },
  },
  {
    id: 'hunter5',
    title: '사냥 무리',
    hint: '짐승 8마리를 사냥하세요.',
    shamanQuote: '부족의 이름을 떨칠 때가 되었네. 맹수 8마리를 사냥해 이 대지의 주인이 누구인지 보여 주게!',
    progress: (s) => ({ cur: Math.min(8, s.stats.kills), max: 8 }),
    reward: { xp: 80, stacks: [{ itemId: 'cooked_meat', count: 2 }] },
  },
  {
    id: 'cave',
    title: '동굴 거처',
    hint: '거점을 3단계 동굴로 올리세요.',
    shamanQuote: '거점을 3단계 동굴 요새로 발전시키면 고대 제단과 내 주술 천막의 진정한 힘이 열린다네.',
    progress: (s) => ({ cur: s.base && s.base.level >= 3 ? 1 : 0, max: 1 }),
    reward: { xp: 200, stacks: [] },
  },
  {
    id: 'jade',
    title: '옥의 전설',
    hint: '흑요석 곡괭이로 옥을 캐 목걸이를 만드세요.',
    shamanQuote: '푸른 영혼이 깃든 비취 목걸이를 만들어 오게. 태고의 신들이 자네를 축복할 걸세.',
    progress: owned('jade_amulet', 1),
    reward: { xp: 300, stacks: [] },
  },
];

/**
 * Lv.5 특별 주술사 퀘스트: 고대 언어 학습
 * "이제 자네도 말을 좀 배워야 될것같네."
 */
export const LANGUAGE_QUEST = {
  id: 'language_learning',
  unlockLevel: 5,
  title: '🗣️ 고대 언어 학습 (Lv.5 주술사 특별 과제)',
  shamanQuote: '이제 자네도 말을 좀 배워야 될것같네. 언제까지 우우거리고만 살 텐가? 내 지혜의 약초와 뼈 서판을 가져오면 말하는 법을 일깨워 주지!',
  hint: '족장 Lv.5 달성 후, 나뭇가지 2개 또는 부싯돌 1개를 모아 떠돌이 주술사에게 언어의 깨달음을 받으세요.',
  rewardXp: 80,
};

export function languageQuestProgress(s: { level?: number; backpack: Stack[]; storage: Stack[] }): {
  unlocked: boolean;
  cur: number;
  max: number;
  ready: boolean;
} {
  const lv = s.level ?? 1;
  const unlocked = lv >= LANGUAGE_QUEST.unlockLevel;
  const branches = countOf(s.backpack, 'branch') + countOf(s.storage, 'branch');
  const flints = countOf(s.backpack, 'flint') + countOf(s.storage, 'flint');
  const matOk = branches >= 2 || flints >= 1 || lv >= 5;
  const cur = (unlocked ? 1 : 0) + (unlocked && matOk ? 1 : 0);
  return { unlocked, cur, max: 2, ready: cur >= 2 };
}

/** 레벨 및 언어 학습 여부에 따른 캐릭터/부족민 발화 예시 */
export function getSpeechStageInfo(level: number, languageLearned?: boolean) {
  if (!languageLearned && level < 5) {
    return {
      canSpeak: false,
      stageLabel: '원시 몸짓 단계 (우우 / ♥ / ⚔️)',
      samplePhrases: ['우우…!', '우우우?', '크르르… 우우!'],
    };
  }
  if (!languageLearned && level >= 5) {
    return {
      canSpeak: false,
      stageLabel: '언어 학습 대기 중 (주술사 퀘스트 완료 시 해금)',
      samplePhrases: ['우우… 나… 말…?', '우우! (주술사에게 말을 배우자)'],
    };
  }
  if (level === 5) {
    return {
      canSpeak: true,
      stageLabel: '더듬거리는 첫 말문 (유저 대화 가능)',
      samplePhrases: ['나… 배고파… 고기…', '불… 따뜻해… 친구… 좋아!', '여기… 돌… 많아… 가자!'],
    };
  }
  if (level <= 7) {
    return {
      canSpeak: true,
      stageLabel: '단어 연결 의사소통 (유저 대화 가능)',
      samplePhrases: ['우리 함께 사냥 가자!', '모닥불 옆에서 고기 먹자.', '조심해, 근처에 큰 공룡이 있어!'],
    };
  }
  return {
    canSpeak: true,
    stageLabel: '능숙한 부족의 언어 (자유 대화)',
    samplePhrases: ['부족의 성벽을 더 높이 쌓아야 하네.', '동맹이여, 함께 우두머리를 토벌하러 가세!'],
  };
}

export const currentQuest = (s: QuestState) => QUESTS[s.questIndex] ?? null;

export function questReady(s: QuestState) {
  const q = currentQuest(s);
  if (!q) return false;
  const p = q.progress(s);
  return p.cur >= p.max;
}
