import type { ItemId } from './items';
import type { SpriteKey } from './spriteMeta';

export interface ClassDef {
  name: string;
  sprite: SpriteKey;
  tagline: string;
  perks: string[];
  atkMult: number;
  critBonus: number;
  /** Chance of +1 extra unit per loot roll. */
  yieldBonus: number;
  carryBonusKg: number;
  /** Multiplier on crafting minigame sweet-spot width. */
  craftZoneMult: number;
  healMult: number;
  visionMult: number;
  scanCooldownMult: number;
  fleeChance: number;
  starter: { stacks: { itemId: ItemId; count: number }[]; gear: ItemId[] };
}

export const CLASSES = {
  hunter: {
    name: '사냥꾼', sprite: 'char-hunter', tagline: '창 한 자루로 매머드에 맞서는 전사',
    perks: ['공격력 +25%', '치명타 +5%', '나무 몽둥이 지급'],
    atkMult: 1.25, critBonus: 0.05, yieldBonus: 0, carryBonusKg: 0, craftZoneMult: 1, healMult: 1,
    visionMult: 1, scanCooldownMult: 1, fleeChance: 0.6,
    starter: { stacks: [{ itemId: 'berry', count: 3 }], gear: ['wooden_club'] },
  },
  gatherer: {
    name: '채집가', sprite: 'char-gatherer', tagline: '숲과 들의 모든 것을 아는 살림꾼',
    perks: ['채집량 +1 확률 30%', '배낭 +15kg', '식량 지급'],
    atkMult: 1, critBonus: 0, yieldBonus: 0.3, carryBonusKg: 15, craftZoneMult: 1, healMult: 1,
    visionMult: 1, scanCooldownMult: 1, fleeChance: 0.6,
    starter: { stacks: [{ itemId: 'berry', count: 5 }, { itemId: 'fiber', count: 4 }], gear: [] },
  },
  shaman: {
    name: '주술사', sprite: 'char-shaman', tagline: '불과 약초를 다루는 장인',
    perks: ['제작 명중 구간 +50%', '회복 효과 +50%', '약초 연고 지급'],
    atkMult: 1, critBonus: 0, yieldBonus: 0, carryBonusKg: 0, craftZoneMult: 1.5, healMult: 1.5,
    visionMult: 1, scanCooldownMult: 1, fleeChance: 0.6,
    starter: { stacks: [{ itemId: 'herb', count: 2 }, { itemId: 'salve', count: 1 }], gear: [] },
  },
  scout: {
    name: '정찰병', sprite: 'char-scout', tagline: '누구보다 멀리 보고 빨리 달아나는 척후',
    perks: ['시야 +30%', '탐지 쿨타임 -40%', '도주 성공률 85%'],
    atkMult: 1, critBonus: 0, yieldBonus: 0, carryBonusKg: 0, craftZoneMult: 1, healMult: 1,
    visionMult: 1.3, scanCooldownMult: 0.6, fleeChance: 0.85,
    starter: { stacks: [{ itemId: 'berry', count: 3 }], gear: [] },
  },
} satisfies Record<string, ClassDef>;

export type ClassId = keyof typeof CLASSES;
export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];
export const classDef = (id: ClassId): ClassDef => CLASSES[id];
