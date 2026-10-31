import type { ItemId } from './items';
import type { SpriteKey } from './spriteMeta';

export type Biome = 'plains' | 'forest' | 'rocky' | 'wetland';

export const BIOME_LABEL: Record<Biome, string> = { plains: '초원', forest: '숲', rocky: '암석 지대', wetland: '습지' };

export interface LootRoll {
  itemId: ItemId;
  min: number;
  max: number;
  /** 0..1 probability the roll happens at all. */
  chance?: number;
}

export interface NodeDef {
  name: string;
  sprite: SpriteKey;
  /** Hits (at power 1) to deplete. */
  hp: number;
  /** Required tool: kind and tier. tier 0 = bare hands OK. */
  requires: { kind: 'none' | 'chop' | 'mine'; tier: number };
  loot: LootRoll[];
  xp: number;
  respawnMin: number;
  /** Relative spawn weight per biome. */
  biomes: Partial<Record<Biome, number>>;
}

export interface CreatureDef {
  name: string;
  sprite: SpriteKey;
  hp: number;
  atk: number;
  /** passive = flees, neutral = fights back, aggressive = ambushes. */
  temper: 'passive' | 'neutral' | 'aggressive';
  /** Chance per hit that a passive creature escapes. */
  escapeChance?: number;
  loot: LootRoll[];
  xp: number;
  biomes: Partial<Record<Biome, number>>;
  /** Spawn weight multiplier at night (0 = day only). */
  nightWeight: number;
  /** Becomes aggressive at night. */
  nightAggressive?: boolean;
}

export const NODES = {
  branch_pile: {
    name: '나뭇가지 더미', sprite: 'node-branch', hp: 2, requires: { kind: 'none', tier: 0 },
    loot: [{ itemId: 'branch', min: 2, max: 3 }, { itemId: 'fiber', min: 0, max: 1 }], xp: 3, respawnMin: 15,
    biomes: { plains: 4, forest: 3, wetland: 1, rocky: 1 },
  },
  berry_bush: {
    name: '산딸기 덤불', sprite: 'node-bush', hp: 2, requires: { kind: 'none', tier: 0 },
    loot: [{ itemId: 'berry', min: 2, max: 4 }, { itemId: 'fiber', min: 1, max: 2 }], xp: 3, respawnMin: 20,
    biomes: { plains: 3, forest: 2, wetland: 2 },
  },
  herb_patch: {
    name: '약초 군락', sprite: 'node-herb', hp: 2, requires: { kind: 'none', tier: 0 },
    loot: [{ itemId: 'herb', min: 1, max: 2 }, { itemId: 'fiber', min: 0, max: 1 }], xp: 4, respawnMin: 25,
    biomes: { forest: 2, wetland: 3, plains: 1 },
  },
  flint_rock: {
    name: '부싯돌 바위', sprite: 'node-flint', hp: 3, requires: { kind: 'none', tier: 0 },
    loot: [{ itemId: 'flint', min: 1, max: 2 }], xp: 4, respawnMin: 20,
    biomes: { rocky: 4, plains: 2, forest: 1 },
  },
  clay_pit: {
    name: '점토 웅덩이', sprite: 'node-clay', hp: 3, requires: { kind: 'none', tier: 0 },
    loot: [{ itemId: 'clay', min: 2, max: 3 }], xp: 4, respawnMin: 20,
    biomes: { wetland: 5, plains: 1 },
  },
  bone_pile: {
    name: '짐승 뼈무덤', sprite: 'node-bones', hp: 2, requires: { kind: 'none', tier: 0 },
    loot: [{ itemId: 'bone', min: 2, max: 3 }], xp: 4, respawnMin: 30,
    biomes: { plains: 2, rocky: 2, wetland: 1 },
  },
  oak_tree: {
    name: '참나무', sprite: 'node-oak', hp: 4, requires: { kind: 'chop', tier: 1 },
    loot: [{ itemId: 'log', min: 2, max: 3 }, { itemId: 'branch', min: 1, max: 2 }], xp: 8, respawnMin: 30,
    biomes: { forest: 5, plains: 1, wetland: 1 },
  },
  pine_tree: {
    name: '소나무', sprite: 'node-pine', hp: 4, requires: { kind: 'chop', tier: 1 },
    loot: [{ itemId: 'log', min: 2, max: 2 }, { itemId: 'resin', min: 1, max: 2 }], xp: 8, respawnMin: 30,
    biomes: { forest: 4, rocky: 1 },
  },
  hematite_rock: {
    name: '적철석 바위', sprite: 'node-hematite', hp: 5, requires: { kind: 'mine', tier: 1 },
    loot: [{ itemId: 'ochre', min: 1, max: 2 }, { itemId: 'flint', min: 0, max: 1 }], xp: 10, respawnMin: 40,
    biomes: { rocky: 3, plains: 1 },
  },
  quartz_vein: {
    name: '석영 광맥', sprite: 'node-quartz', hp: 5, requires: { kind: 'mine', tier: 1 },
    loot: [{ itemId: 'quartz', min: 1, max: 2 }], xp: 12, respawnMin: 45,
    biomes: { rocky: 2 },
  },
  obsidian_rock: {
    name: '흑요석 노두', sprite: 'node-obsidian', hp: 6, requires: { kind: 'mine', tier: 1 },
    loot: [{ itemId: 'obsidian', min: 1, max: 2 }], xp: 14, respawnMin: 60,
    biomes: { rocky: 2, forest: 0.3 },
  },
  jade_rock: {
    name: '옥 원석', sprite: 'node-jade', hp: 8, requires: { kind: 'mine', tier: 2 },
    loot: [{ itemId: 'jade', min: 1, max: 1 }, { itemId: 'quartz', min: 0, max: 1 }], xp: 30, respawnMin: 120,
    biomes: { rocky: 0.6, wetland: 0.2 },
  },
} satisfies Record<string, NodeDef>;

export type NodeType = keyof typeof NODES;

export const CREATURES = {
  rabbit: {
    name: '산토끼', sprite: 'mob-rabbit', hp: 6, atk: 0, temper: 'passive', escapeChance: 0.3,
    loot: [{ itemId: 'raw_meat', min: 1, max: 1 }, { itemId: 'hide', min: 0, max: 1, chance: 0.6 }], xp: 6,
    biomes: { plains: 5, forest: 3, wetland: 3 }, nightWeight: 0.2,
  },
  boar: {
    name: '멧돼지', sprite: 'mob-boar', hp: 30, atk: 6, temper: 'neutral',
    loot: [{ itemId: 'raw_meat', min: 2, max: 3 }, { itemId: 'hide', min: 1, max: 2 }, { itemId: 'bone', min: 1, max: 1 }, { itemId: 'tusk', min: 1, max: 1, chance: 0.25 }], xp: 22,
    biomes: { forest: 4, plains: 3, wetland: 4, rocky: 2 }, nightWeight: 0.8,
  },
  wolf: {
    name: '회색 늑대', sprite: 'mob-wolf', hp: 24, atk: 8, temper: 'neutral', nightAggressive: true,
    loot: [{ itemId: 'hide', min: 2, max: 2 }, { itemId: 'bone', min: 1, max: 2 }, { itemId: 'raw_meat', min: 1, max: 1 }], xp: 26,
    biomes: { forest: 3, rocky: 3, plains: 1 }, nightWeight: 2.5,
  },
  raptor: {
    name: '랩터', sprite: 'mob-raptor', hp: 40, atk: 12, temper: 'aggressive',
    loot: [{ itemId: 'hide', min: 2, max: 3 }, { itemId: 'bone', min: 2, max: 3 }, { itemId: 'raw_meat', min: 2, max: 2 }], xp: 45,
    biomes: { rocky: 3, forest: 1, plains: 1 }, nightWeight: 1.4,
  },
  mammoth: {
    name: '매머드', sprite: 'mob-mammoth', hp: 120, atk: 18, temper: 'neutral',
    loot: [{ itemId: 'raw_meat', min: 6, max: 8 }, { itemId: 'hide', min: 4, max: 5 }, { itemId: 'tusk', min: 2, max: 2 }, { itemId: 'bone', min: 4, max: 5 }], xp: 130,
    biomes: { wetland: 1.2, plains: 0.8, rocky: 0.6 }, nightWeight: 0.6,
  },
} satisfies Record<string, CreatureDef>;

export type CreatureType = keyof typeof CREATURES;

export const nodeDef = (t: NodeType): NodeDef => NODES[t];
export const creatureDef = (t: CreatureType): CreatureDef => CREATURES[t];

export const isHostileNow = (t: CreatureType, isNight: boolean) => {
  const d = creatureDef(t);
  return d.temper === 'aggressive' || (isNight && !!d.nightAggressive);
};
