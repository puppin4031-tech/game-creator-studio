// Procedural Discovery Engine — stage 1: material physics matrix, hard caps and recipe hashing.
// Pure functions only, so the client pre-check and the server evaluator share identical rules.

export type InventionCategory = 'tool' | 'weapon' | 'building' | 'relic';

export interface MaterialPhysics {
  hardness: number;   // resistance to wear/cutting, 0-10
  toughness: number;  // resistance to shattering, 0-10
  sharpness: number;  // edge potential, 0-10
  binding: number;    // ability to tie/glue parts, 0-10
  mass: number;       // structural heft, 0-10
  mystic: number;     // ritual/relic power, 0-10
  color: string;      // palette-swap base color (hex)
}

export const MATERIAL_PHYSICS: Record<string, MaterialPhysics> = {
  branch:       { hardness: 2, toughness: 4, sharpness: 1, binding: 1, mass: 2, mystic: 0, color: '#8b5a2b' },
  frost_pelt:   { hardness: 1, toughness: 7, sharpness: 0, binding: 3, mass: 2, mystic: 1, color: '#e2e8f0' },
  frost_shard:  { hardness: 6, toughness: 2, sharpness: 7, binding: 0, mass: 3, mystic: 2, color: '#bae6fd' },
  log:          { hardness: 3, toughness: 6, sharpness: 0, binding: 0, mass: 7, mystic: 0, color: '#6b4423' },
  fiber:        { hardness: 0, toughness: 3, sharpness: 0, binding: 6, mass: 0, mystic: 0, color: '#a3b18a' },
  cordage:      { hardness: 1, toughness: 5, sharpness: 0, binding: 9, mass: 0, mystic: 0, color: '#c2a878' },
  resin:        { hardness: 1, toughness: 2, sharpness: 0, binding: 8, mass: 0, mystic: 1, color: '#d97706' },
  flint:        { hardness: 7, toughness: 3, sharpness: 8, binding: 0, mass: 3, mystic: 0, color: '#57534e' },
  obsidian:     { hardness: 6, toughness: 1, sharpness: 10, binding: 0, mass: 3, mystic: 3, color: '#1c1917' },
  quartz:       { hardness: 7, toughness: 2, sharpness: 5, binding: 0, mass: 2, mystic: 5, color: '#e7e5e4' },
  jade:         { hardness: 6, toughness: 8, sharpness: 2, binding: 0, mass: 3, mystic: 9, color: '#15803d' },
  ochre:        { hardness: 2, toughness: 1, sharpness: 0, binding: 1, mass: 1, mystic: 6, color: '#b45309' },
  clay:         { hardness: 1, toughness: 1, sharpness: 0, binding: 4, mass: 5, mystic: 1, color: '#a16207' },
  clay_pot:     { hardness: 4, toughness: 2, sharpness: 0, binding: 0, mass: 4, mystic: 1, color: '#9a3412' },
  soil:         { hardness: 1, toughness: 1, sharpness: 0, binding: 3, mass: 6, mystic: 0, color: '#78350f' },
  bone:         { hardness: 5, toughness: 5, sharpness: 4, binding: 0, mass: 2, mystic: 3, color: '#fef3c7' },
  tusk:         { hardness: 6, toughness: 7, sharpness: 3, binding: 0, mass: 6, mystic: 4, color: '#fffbeb' },
  hide:         { hardness: 1, toughness: 4, sharpness: 0, binding: 4, mass: 1, mystic: 0, color: '#92400e' },
  leather:      { hardness: 2, toughness: 7, sharpness: 0, binding: 6, mass: 1, mystic: 0, color: '#7c2d12' },
  prime_pelt:   { hardness: 2, toughness: 8, sharpness: 0, binding: 5, mass: 2, mystic: 2, color: '#44403c' },
  ancient_fang: { hardness: 8, toughness: 6, sharpness: 9, binding: 0, mass: 1, mystic: 7, color: '#fde68a' },
};

/** Material tier 1-4: higher-tier (rarer, later) materials forge stronger gear. */
export const MATERIAL_TIER: Record<string, number> = {
  branch: 1, fiber: 1, soil: 1, clay: 1,
  flint: 2, bone: 2, hide: 2, cordage: 2, log: 2, resin: 2,
  leather: 3, clay_pot: 3, frost_pelt: 3, frost_shard: 3, quartz: 3, ochre: 3,
  obsidian: 4, tusk: 4, prime_pelt: 4, ancient_fang: 4, jade: 4,
};
/** T1 x0.85 ... T4 x1.3, by quantity-weighted average tier. */
export function tierMultiplier(materials: Record<string, number>): number {
  const e = Object.entries(materials).filter(([, q]) => q > 0);
  const total = e.reduce((s, [, q]) => s + q, 0);
  if (!total) return 1;
  const avg = e.reduce((s, [id, q]) => s + (MATERIAL_TIER[id] ?? 1) * q, 0) / total;
  return 0.7 + 0.15 * avg;
}

/** Which physics each category relies on (weights sum to 1). */
export const CATEGORY_WEIGHTS: Record<InventionCategory, Partial<Record<keyof Omit<MaterialPhysics, 'color'>, number>>> = {
  tool:     { hardness: 0.35, sharpness: 0.25, toughness: 0.2, binding: 0.2 },
  weapon:   { sharpness: 0.35, hardness: 0.25, toughness: 0.2, binding: 0.2 },
  building: { toughness: 0.45, hardness: 0.25, binding: 0.2, mass: 0.1 }, // wearable armor, not houses
  relic:    { mystic: 0.7, hardness: 0.15, toughness: 0.15 },
};

export const MAX_SLOTS = 4;
export const MAX_QTY_PER_SLOT = 20;
/** Minimum average score (0-10) a combination must reach to be physically plausible. */
export const MIN_PLAUSIBLE_SCORE = 3.5;
/** Hard caps so no combination outscales hand-authored gear. */
export const STAT_CAP: Record<InventionCategory, number> = { tool: 2.5, weapon: 24, building: 40, relic: 0.25 };
/** Research points: base + per unit of material. */
export const RESEARCH_BASE_COST = 10;
export const RESEARCH_COST_PER_UNIT = 1;

export interface InventionInput { category: InventionCategory; materials: Record<string, number>; heat?: boolean; sacred?: boolean; }

export type InventionCheck =
  | { ok: true; hash: string; score: number; power: number; cost: number; primaryColor: string; secondaryColor: string }
  | { ok: false; reason: 'empty' | 'too_many_slots' | 'bad_qty' | 'unknown_material' | 'implausible' | 'no_binding'; detail?: string };

/** Normalize to a stable, order-independent key: CAT:weapon|bone:2|flint:5 */
export function recipeHash(input: InventionInput): string {
  const parts = Object.entries(input.materials)
    .filter(([, q]) => q > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, q]) => `${id}:${Math.floor(q)}`);
  return `CAT:${input.category}|${parts.join('|')}${input.heat ? '|HEAT' : ''}${input.sacred ? '|SACRED' : ''}`;
}

export function researchCost(materials: Record<string, number>): number {
  const units = Object.values(materials).reduce((s, q) => s + Math.max(0, Math.floor(q)), 0);
  return RESEARCH_BASE_COST + units * RESEARCH_COST_PER_UNIT;
}

export function checkInvention(input: InventionInput): InventionCheck {
  if (!CATEGORY_WEIGHTS[input.category]) return { ok: false, reason: 'implausible' };
  if (Object.values(input.materials).some(q => !Number.isFinite(q) || q < 0)) return { ok: false, reason: 'bad_qty' };
  const entries = Object.entries(input.materials).filter(([, q]) => q > 0);
  if (entries.length === 0) return { ok: false, reason: 'empty' };
  if (entries.length > MAX_SLOTS) return { ok: false, reason: 'too_many_slots' };
  for (const [id, q] of entries) {
    if (!Number.isInteger(q) || q > MAX_QTY_PER_SLOT) return { ok: false, reason: 'bad_qty', detail: id };
    if (!MATERIAL_PHYSICS[id]) return { ok: false, reason: 'unknown_material', detail: id };
  }
  const total = entries.reduce((s, [, q]) => s + q, 0);
  // Quantity-weighted average physics.
  const avg = (k: keyof Omit<MaterialPhysics, 'color'>) =>
    entries.reduce((s, [id, q]) => s + MATERIAL_PHYSICS[id][k] * q, 0) / total;
  // Multi-part tools/weapons need something to hold parts together.
  if ((input.category === 'tool' || input.category === 'weapon') && entries.length > 1) {
    const maxBinding = Math.max(...entries.map(([id]) => MATERIAL_PHYSICS[id].binding));
    if (maxBinding < 4) return { ok: false, reason: 'no_binding' };
  }
  const weights = CATEGORY_WEIGHTS[input.category];
  let score = 0;
  for (const [k, w] of Object.entries(weights)) score += avg(k as keyof Omit<MaterialPhysics, 'color'>) * (w ?? 0);
  // For tools/weapons use the best single-material edge rather than the diluted average.
  if (input.category === 'weapon' || input.category === 'tool') {
    const bestEdge = Math.max(...entries.map(([id]) => MATERIAL_PHYSICS[id].sharpness));
    score = score * 0.6 + bestEdge * 0.4;
  }
  score = Math.round(score * 100) / 100;
  if (score < MIN_PLAUSIBLE_SCORE) return { ok: false, reason: 'implausible' };
  // Diminishing returns on quantity, then hard cap.
  const qtyFactor = Math.min(1, Math.log2(1 + total) / Math.log2(1 + MAX_QTY_PER_SLOT));
  const power = Math.min(STAT_CAP[input.category], Math.round(STAT_CAP[input.category] * (score / 10) * (0.5 + 0.5 * qtyFactor) * tierMultiplier(input.materials) * 100) / 100);
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  return {
    ok: true,
    hash: recipeHash(input),
    score,
    power,
    cost: researchCost(input.materials),
    primaryColor: MATERIAL_PHYSICS[sorted[0][0]].color,
    secondaryColor: MATERIAL_PHYSICS[(sorted[1] ?? sorted[0])[0]].color,
  };
}

export const ANVIL_SLOTS = 2;
export const BASE_MASTERWORK_CHANCE = 0.05;
export const ALTAR_MASTERWORK_CHANCE = BASE_MASTERWORK_CHANCE * 3;
export function masterworkChance(altar: boolean) { return altar ? ALTAR_MASTERWORK_CHANCE : BASE_MASTERWORK_CHANCE; }
export function checkFacility(input: InventionInput, altar: boolean): InventionCheck {
  if (!altar && (Object.values(input.materials).filter(q => q > 0).length > ANVIL_SLOTS)) return { ok: false, reason: 'too_many_slots' };
  if (!altar && (input.heat || input.sacred || !['tool', 'weapon'].includes(input.category))) return { ok: false, reason: 'implausible' };
  const result = checkInvention(input);
  if (!result.ok) return result;
  // Fire hardens suitable clay/bone; sacred minerals amplify relics. Neither bypasses plausibility or stat caps.
  const heat = input.heat && ['clay', 'bone', 'flint'].some(id => (input.materials[id] ?? 0) > 0) ? 1.08 : 1;
  const sacred = input.sacred && ['jade', 'quartz', 'ancient_fang'].some(id => (input.materials[id] ?? 0) > 0) ? 1.08 : 1;
  return { ...result, power: Math.min(STAT_CAP[input.category], Math.round(result.power * heat * sacred * 100) / 100) };
}

export function physicsSignal(input: InventionInput, altar: boolean) {
  const result = checkFacility(input, altar);
  const entries = Object.entries(input.materials).filter(([,q]) => q > 0);
  const total = entries.reduce((sum,[,q]) => sum+q,0);
  const sum = (key: keyof Omit<MaterialPhysics,'color'>) => entries.reduce((n,[id,q]) => n+(MATERIAL_PHYSICS[id]?.[key] ?? 0)*q,0);
  const hardness = sum('hardness'), elasticity = sum('toughness'), sharpness = sum('sharpness');
  const flammability = entries.reduce((n,[id,q]) => n+(['branch','log','fiber','cordage','resin','hide','leather'].includes(id) ? 8 : 0)*q,0);
  const ratio = elasticity ? hardness / elasticity : 0;
  const synergy = result.ok && (result.score >= 6.5 || (ratio >= 1.4 && ratio <= 1.8) || entries.some(([id]) => ['jade','ancient_fang','obsidian'].includes(id)));
  const reason = 'reason' in result ? result.reason : null;
  const advice = sageAdvice(input.category, reason, result.ok, synergy, altar, entries.map(([id]) => id));
  return { result, kind: !result.ok ? 'smoke' as const : synergy ? 'sacred' as const : 'experiment' as const, advice, hardness, elasticity, sharpness, flammability, total };
}

const CAT_NAME: Record<InventionCategory, string> = { weapon: '무기', tool: '도구', building: '방어구', relic: '부적' };
/** Concrete material suggestions per missing property, using real in-game item names. */
const SUGGEST: Record<string, string> = {
  edge: '부싯돌 · 흑요석 · 뼈 · 고대의 송곳니',
  hard: '부싯돌 · 뼈 · 엄니 · 석영',
  tough: '날가죽 · 가죽 · 털가죽 · 혹한의 모피 · 엄니',
  bind: '노끈 · 송진 · 가죽 · 식물 섬유',
  mystic: '옥 · 석영 · 황토 안료 · 고대의 송곳니',
};
const EXAMPLE: Record<InventionCategory, string> = {
  weapon: '예) 부싯돌 3 + 나뭇가지 2 + 노끈 1 → 창 / 흑요석 2 + 뼈 2 + 노끈 1 → 날카로운 창',
  tool: '예) 부싯돌 3 + 노끈 1 → 기초 도구 / 흑요석 2 + 뼈 1 + 노끈 1 → 상급 곡괭이',
  building: '예) 날가죽 3 + 뼈 2 + 노끈 1 → 가죽 갑옷 / 혹한의 모피 2 + 가죽 2 → 털망토',
  relic: '예) 옥 2 + 석영 1 → 옥 부적 / 뼈 2 + 황토 안료 2 → 뼈 부적',
};
export function sageAdvice(cat: InventionCategory, reason: string | null, ok: boolean, synergy: boolean, altar: boolean, used: string[]): string {
  const kind = CAT_NAME[cat];
  if (ok) return synergy
    ? `현자의 조언: 재료들의 성질이 잘 맞물립니다. 이대로 ${kind}를 만들면 효율이 높아요. 수량을 늘리거나 등급 높은 재료(흑요석·옥·우두머리 털가죽)를 더하면 더 강해집니다.`
    : `현자의 조언: ${kind}의 모양은 갖출 수 있어요. 더 강하게 만들려면 ${cat === 'relic' ? SUGGEST.mystic : cat === 'building' ? SUGGEST.tough : SUGGEST.edge} 중 하나를 더해 보세요.`;
  if (!reason || reason === 'empty') return `현자의 조언: 아래 재료 목록에서 + 버튼으로 재료를 올려 주세요.\n${EXAMPLE[cat]}`;
  if (reason === 'too_many_slots') return `현자의 조언: ${altar ? '제단' : '돌모루'}에는 ${altar ? MAX_SLOTS : ANVIL_SLOTS}종의 재료만 올릴 수 있어요. 종류를 줄이고 수량을 늘려 보세요.${altar ? '' : ' 개인 제단을 지으면 4종까지 가능합니다.'}`;
  if (reason === 'no_binding') return `현자의 조언: 부품을 하나로 묶을 결합재가 없어요. ${SUGGEST.bind} 중 하나를 1~2개 넣어 주세요.\n${EXAMPLE[cat]}`;
  if (reason === 'implausible' && !altar && !['tool', 'weapon'].includes(cat)) return '현자의 조언: 돌모루에서는 무기와 도구만 만들 수 있어요. 방어구·부적·고열 제련·신성 부여는 개인 제단이 필요합니다.';
  const need = cat === 'relic' ? `신비한 힘을 담을 재료가 부족해요. ${SUGGEST.mystic}`
    : cat === 'building' ? `몸을 지켜 줄 질긴 재료가 부족해요. ${SUGGEST.tough}`
    : cat === 'tool' ? `단단한 머리 재료가 부족해요. ${SUGGEST.hard}`
    : `날카로운 날이 될 재료가 부족해요. ${SUGGEST.edge}`;
  const weak = used.filter(id => ['branch', 'fiber', 'soil', 'clay', 'hide'].includes(id)).length ? ' 부드러운 재료(나뭇가지·섬유·흙)만으로는 힘이 약합니다.' : '';
  return `현자의 조언: ${need} 중에서 2~3개를 넣어 보세요.${weak}\n${EXAMPLE[cat]}`;
}

/** Altar reforging: an existing gear piece plus up to three catalysts becomes a new item. */
export const REFORGE_SLOTS = 3;
export const REFORGE_CAP_MULT = 1.25;
export function reforgePower(category: InventionCategory, basePower: number, catalystPower: number): number {
  const b = Math.max(0, Number.isFinite(basePower) ? basePower : 0);
  const next = Math.max(b * 1.1, b + Math.max(0, catalystPower) * 0.5);
  return Math.min(STAT_CAP[category] * REFORGE_CAP_MULT, Math.round(next * 100) / 100);
}
