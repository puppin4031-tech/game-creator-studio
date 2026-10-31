// Runtime integrity checks for the survival module.
// Run from the dev page (/dev/survival-check) or unit tests.
import { BASE_LEVELS, CAMP_COST, OUTPOST_COST } from './bases';
import { CLASSES, CLASS_IDS } from './classes';
import { SURVIVAL_CONFIG as C } from './config';
import { CREATURES, NODES, type LootRoll } from './entities';
import { GEAR_CATEGORIES, ITEMS, ITEM_IDS } from './items';
import { xpToNext } from './progression';
import { QUESTS } from './quests';
import { RECIPES } from './recipes';
import { SPRITE_META, type SpriteKey } from './spriteMeta';
import type { Stack } from './types';
import { generateWorld } from './world';

export interface CheckResult {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

// Eagerly resolved by Vite; key = relative path of each sprite file.
const spriteFiles = import.meta.glob('../../assets/survival/*.png', { eager: true });
const spriteFileKeys = new Set(
  Object.keys(spriteFiles).map((p) => p.split('/').pop()?.replace('.png', '') ?? ''),
);

const spriteKeys = new Set<string>(Object.keys(SPRITE_META));
const itemIds = new Set<string>(ITEM_IDS);

const checkStacks = (stacks: Stack[], where: string, problems: string[]) => {
  for (const s of stacks) {
    if (!itemIds.has(s.itemId)) problems.push(`${where}: 알 수 없는 아이템 '${s.itemId}'`);
    if (!(s.count > 0)) problems.push(`${where}: '${s.itemId}' 수량이 ${s.count}`);
  }
};

export function runSurvivalSelfCheck(): CheckResult[] {
  const results: CheckResult[] = [];
  const push = (id: string, label: string, problems: string[]) =>
    results.push({ id, label, ok: problems.length === 0, detail: problems.join(' / ') || undefined });

  // 1. Every sprite key has a real PNG file.
  {
    const problems: string[] = [];
    for (const key of spriteKeys) {
      if (!spriteFileKeys.has(key)) problems.push(`파일 없음: ${key}.png`);
    }
    for (const file of spriteFileKeys) {
      if (!spriteKeys.has(file)) problems.push(`메타 없음: ${file}.png (spriteMeta 재생성 필요)`);
    }
    push('sprite-files', '스프라이트 파일 ↔ 메타 일치', problems);
  }

  // 2. Every item references a registered sprite.
  {
    const problems: string[] = [];
    for (const id of ITEM_IDS) {
      const d = ITEMS[id];
      if (!spriteKeys.has(d.sprite)) problems.push(`${id}: 스프라이트 '${d.sprite}' 없음`);
      if (!(d.weight > 0)) problems.push(`${id}: 무게 ${d.weight}`);
      if (!d.name || !d.desc) problems.push(`${id}: 이름/설명 누락`);
    }
    push('item-sprites', '아이템 정의 (스프라이트·무게·이름)', problems);
  }

  // 3. Gear items have matching gear fields and durability.
  {
    const problems: string[] = [];
    for (const id of ITEM_IDS) {
      const d = ITEMS[id];
      const isGear = GEAR_CATEGORIES.includes(d.category);
      const hasField = !!(d.tool || d.weapon || d.armor || d.trinket);
      if (isGear && !hasField) problems.push(`${id}: 장비 카테고리인데 능력치 필드 없음`);
      if (!isGear && hasField) problems.push(`${id}: 장비 필드가 있는데 카테고리는 '${d.category}'`);
      if (isGear && d.durability === undefined) problems.push(`${id}: 내구도 누락`);
    }
    push('gear-fields', '장비 능력치·내구도 정의', problems);
  }

  // 4. Entity sprites + loot references.
  {
    const problems: string[] = [];
    for (const [t, d] of Object.entries(NODES)) {
      if (!spriteKeys.has(d.sprite)) problems.push(`노드 ${t}: 스프라이트 없음`);
      if (!(d.hp > 0)) problems.push(`노드 ${t}: 체력 ${d.hp}`);
      if (d.requires.kind !== 'none' && d.requires.tier < 1) problems.push(`노드 ${t}: 도구 등급 이상`);
      for (const l of d.loot as LootRoll[]) {
        if (!itemIds.has(l.itemId)) problems.push(`노드 ${t}: 전리품 '${l.itemId}' 없음`);
        if (l.min > l.max) problems.push(`노드 ${t}: '${l.itemId}' min>max`);
      }
      if (Object.values(d.biomes).every((w) => !w)) problems.push(`노드 ${t}: 스폰 가중치 합 0`);
    }
    for (const [t, d] of Object.entries(CREATURES)) {
      if (!spriteKeys.has(d.sprite)) problems.push(`동물 ${t}: 스프라이트 없음`);
      if (!(d.hp > 0)) problems.push(`동물 ${t}: 체력 ${d.hp}`);
      for (const l of d.loot as LootRoll[]) {
        if (!itemIds.has(l.itemId)) problems.push(`동물 ${t}: 전리품 '${l.itemId}' 없음`);
        if (l.min > l.max) problems.push(`동물 ${t}: '${l.itemId}' min>max`);
        if (l.chance !== undefined && (l.chance <= 0 || l.chance > 1)) problems.push(`동물 ${t}: '${l.itemId}' 확률 ${l.chance}`);
      }
      if (Object.values(d.biomes).every((w) => !w)) problems.push(`동물 ${t}: 스폰 가중치 합 0`);
    }
    push('entity-refs', '자원·동물 정의 (스프라이트·전리품·스폰)', problems);
  }

  // 5. Recipe references and rules.
  {
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const r of RECIPES) {
      if (seen.has(r.id)) problems.push(`레시피 id 중복: ${r.id}`);
      seen.add(r.id);
      if (!itemIds.has(r.result)) problems.push(`레시피 ${r.id}: 결과물 '${r.result}' 없음`);
      checkStacks(r.ingredients, `레시피 ${r.id}`, problems);
      const resultDef = itemIds.has(r.result) ? ITEMS[r.result] : null;
      if (resultDef && GEAR_CATEGORIES.includes(resultDef.category) && r.count !== 1)
        problems.push(`레시피 ${r.id}: 장비 결과물인데 수량 ${r.count}`);
      if (r.processSec < 0) problems.push(`레시피 ${r.id}: 가공 시간 ${r.processSec}s`);
    }
    push('recipe-refs', '레시피 정의 (재료·결과·수량)', problems);
  }

  // 6. Base costs and class starters reference valid items.
  {
    const problems: string[] = [];
    for (const lvl of [1, 2, 3] as const) {
      checkStacks(BASE_LEVELS[lvl].cost, `거점 ${lvl}단계`, problems);
      if (!spriteKeys.has(BASE_LEVELS[lvl].sprite)) problems.push(`거점 ${lvl}단계: 스프라이트 없음`);
    }
    checkStacks(CAMP_COST, '야영지 설치비', problems);
    checkStacks(OUTPOST_COST, '전진기지 설치비', problems);
    for (const cid of CLASS_IDS) {
      const c = CLASSES[cid];
      if (!spriteKeys.has(c.sprite)) problems.push(`직업 ${cid}: 스프라이트 없음`);
      checkStacks(c.starter.stacks, `직업 ${cid} 시작 소지품`, problems);
      for (const g of c.starter.gear) {
        if (!itemIds.has(g)) problems.push(`직업 ${cid}: 시작 장비 '${g}' 없음`);
        else if (!GEAR_CATEGORIES.includes(ITEMS[g].category)) problems.push(`직업 ${cid}: '${g}'는 장비가 아님`);
      }
    }
    push('base-class-refs', '거점 비용·직업 시작 소지품', problems);
  }

  // 7. Quest rewards and ordering.
  {
    const problems: string[] = [];
    const seen = new Set<string>();
    for (const q of QUESTS) {
      if (seen.has(q.id)) problems.push(`퀘스트 id 중복: ${q.id}`);
      seen.add(q.id);
      checkStacks(q.reward.stacks, `퀘스트 ${q.id}`, problems);
      if (!(q.reward.xp >= 0)) problems.push(`퀘스트 ${q.id}: 보상 XP ${q.reward.xp}`);
    }
    push('quest-refs', '퀘스트 정의 (보상·중복)', problems);
  }

  // 8. Config sanity.
  {
    const problems: string[] = [];
    const positive: [string, number][] = [
      ['interactRadiusM', C.interactRadiusM], ['visionDayM', C.visionDayM], ['visionNightM', C.visionNightM],
      ['scanRadiusM', C.scanRadiusM], ['baseCarryKg', C.baseCarryKg], ['baseMaxHp', C.baseMaxHp],
      ['tickMs', C.tickMs], ['scanCooldownMs', C.scanCooldownMs],
    ];
    for (const [k, v] of positive) if (!(v > 0)) problems.push(`${k} = ${v}`);
    if (C.deathDropRatio <= 0 || C.deathDropRatio >= 1) problems.push(`deathDropRatio = ${C.deathDropRatio}`);
    if (C.outpostShipFee < 0 || C.outpostShipFee >= 1) problems.push(`outpostShipFee = ${C.outpostShipFee}`);
    if (C.visionNightM > C.visionDayM) problems.push('밤 시야가 낮 시야보다 넓음');
    push('config-sanity', '게임 밸런스 상수', problems);
  }

  // 9. XP curve strictly increasing.
  {
    const problems: string[] = [];
    for (let l = 1; l < 20; l++) {
      if (xpToNext(l + 1) <= xpToNext(l)) problems.push(`레벨 ${l}→${l + 1} 필요 XP가 증가하지 않음`);
    }
    push('xp-curve', '레벨업 경험치 곡선', problems);
  }

  // 10. World generation smoke test: deterministic and non-empty.
  {
    const problems: string[] = [];
    try {
      const q = {
        center: { lat: 37.748, lng: 126.7496 },
        radiusM: 200,
        now: 1_760_000_000_000,
        isNight: false,
        depleted: {} as Record<string, number>,
      };
      const a = generateWorld(q);
      const b = generateWorld(q);
      if (a.length === 0) problems.push('반경 200m 내 생성된 개체 0개');
      const idsA = a.map((e) => e.id).join(',');
      const idsB = b.map((e) => e.id).join(',');
      if (idsA !== idsB) problems.push('같은 입력에 다른 결과 (결정성 깨짐)');
      const dup = new Set<string>();
      for (const e of a) {
        if (dup.has(e.id)) problems.push(`개체 id 중복: ${e.id}`);
        dup.add(e.id);
      }
    } catch (err) {
      problems.push(`월드 생성 예외: ${err instanceof Error ? err.message : String(err)}`);
    }
    push('world-gen', '월드 생성 (결정성·중복·밀도)', problems);
  }

  return results;
}

export const summarizeChecks = (results: CheckResult[]) => ({
  total: results.length,
  passed: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
});

export type { SpriteKey };
