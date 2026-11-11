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
  const power = Math.min(STAT_CAP[input.category], Math.round(STAT_CAP[input.category] * (score / 10) * (0.5 + 0.5 * qtyFactor) * 100) / 100);
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
  const advice = result.ok ? (synergy ? '현자의 조언: 서로의 물성이 조화롭게 맞물립니다.' : '현자의 조언: 형태를 갖출 수 있는 조합입니다.') : reason === 'no_binding' ? '현자의 조언: 부품을 묶을 노끈·송진·가죽이 필요합니다.' : reason === 'too_many_slots' ? `현자의 조언: 이 시설에는 ${altar ? MAX_SLOTS : ANVIL_SLOTS}종의 재료만 올릴 수 있습니다.` : '현자의 조언: 타격력을 낼 수 있는 단단한 재료(돌, 뼈)가 필요합니다.';
  return { result, kind: !result.ok ? 'smoke' as const : synergy ? 'sacred' as const : 'experiment' as const, advice, hardness, elasticity, sharpness, flammability, total };
}
