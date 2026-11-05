import { SURVIVAL_CONFIG as C } from './config';
import { BASE_LEVELS, OUTPOST_COST } from './bases';
import { creatureDef } from './entities';
import { distanceM } from './geo';
import { addStacks, removeStacks } from './inventory';
import { techById, prerequisitesMet } from './tech';
import { techLevel, techUpgradeCost } from './techLevels';
import type { LatLng, Stack, WorldCreature } from './types';
import { researchDurationMs, type TimedJob } from './homeActivities';

export type ActiveSkill = 'stone_barrage' | 'roar' | 'ember_scatter';
export const ACTIVE_SKILLS: Record<ActiveSkill, { name: string; damage: number; cooldownMs: number; cost: Stack[] }> = {
  stone_barrage: { name: '돌팔매 연타', damage: 18, cooldownMs: 12_000, cost: [{ itemId: 'flint', count: 1 }] },
  roar: { name: '포효', damage: 0, cooldownMs: 30_000, cost: [] },
  ember_scatter: { name: '불씨 뿌리기', damage: 12, cooldownMs: 20_000, cost: [{ itemId: 'resin', count: 1 }, { itemId: 'branch', count: 1 }] },
};
export interface Companion { id: string; kind: 'wolf' | 'gatherer' | 'rescued'; name: string; lastWorkAt: number }
export interface AbilitySave {
  pos: LatLng;
  base: (LatLng & { level: 1 | 2 | 3 }) | null;
  hp: number;
  hunger: number;
  techs: string[];
  techLevels?: Record<string, number>;
  storage: Stack[];
  backpack: Stack[];
  outpost?: LatLng | null;
  palisade?: boolean;
  cooldowns?: Record<string, number>;
  calmUntil?: Record<string, number>;
  companions?: Companion[];
  rescueTokens?: number;
}
export type ActionResult<T> = { ok: true; state: T } | { ok: false; reason: string };
export const PALISADE_COST: Stack[] = [{ itemId: 'log', count: 8 }, { itemId: 'cordage', count: 3 }];
export const TAME_COST: Stack[] = [{ itemId: 'beast_bait', count: 1 }, { itemId: 'taming_snare', count: 1 }, { itemId: 'raw_meat', count: 2 }];
export const RECRUIT_COST: Stack[] = [{ itemId: 'shell', count: 10 }, { itemId: 'cooked_meat', count: 2 }];
export const RESCUE_COST: Stack[] = [{ itemId: 'salve', count: 1 }, { itemId: 'jerky', count: 2 }];
export const WORK_MS = 5 * 60_000;
export const WORK_REWARDS: Record<'gatherer' | 'rescued', Stack[]> = {
  gatherer: [{ itemId: 'branch', count: 2 }, { itemId: 'fiber', count: 1 }],
  rescued: [{ itemId: 'bone', count: 1 }, { itemId: 'soil', count: 1 }],
};

export function atMainBase(p: AbilitySave) {
  return !!p.base && distanceM(p.pos, p.base) <= BASE_LEVELS[p.base.level].radiusM + (p.palisade ? 15 : 0);
}
export function atWorkshop(p: AbilitySave) {
  return atMainBase(p) || (!!p.outpost && distanceM(p.pos, p.outpost) <= C.outpostRadiusM);
}
/** Backpack first; only a nearby workshop grants access to shared storage. */
export function payAccessible<T extends AbilitySave>(p: T, cost: Stack[]): T | null {
  const backpack = [...p.backpack];
  let remaining = backpack;
  const storedCost: Stack[] = [];
  for (const c of cost) {
    const owned = remaining.find(x => x.itemId === c.itemId)?.count ?? 0;
    const n = Math.min(owned, c.count);
    if (n) remaining = removeStacks(remaining, [{ itemId: c.itemId, count: n }]) ?? remaining;
    if (c.count > n) storedCost.push({ itemId: c.itemId, count: c.count - n });
  }
  if (storedCost.length && !atWorkshop(p)) return null;
  const storage = removeStacks(p.storage, storedCost);
  return storage ? { ...p, backpack: remaining, storage } : null;
}
export function researchTechnology<T extends AbilitySave>(p: T, id: string, gpsReady: boolean): ActionResult<T> {
  const t = techById(id);
  if (!gpsReady) return { ok: false, reason: '정확한 GPS 신호가 필요합니다' };
  if (!atWorkshop(p)) return { ok: false, reason: '거점 안에서 연구하세요' };
  if (!t?.research || p.techs.includes(id)) return { ok: false, reason: '이미 배웠거나 연구할 수 없는 기술입니다' };
  if (!prerequisitesMet(t, p.techs)) return { ok: false, reason: '선행 기술을 먼저 배우세요' };
  const storage = removeStacks(p.storage, t.research);
  return storage ? { ok: true, state: { ...p, storage, techs: [...p.techs, id] } } : { ok: false, reason: '창고의 연구 재료가 부족합니다' };
}
type ResearchSave = AbilitySave & { researching?: TimedJob | null; researchJobs?: TimedJob[] };
/** All running research jobs, including a legacy single `researching` entry. */
export function researchJobsOf(p: { researching?: TimedJob | null; researchJobs?: TimedJob[] }): TimedJob[] {
  return [...(p.researchJobs ?? []), ...(p.researching ? [p.researching] : [])];
}
/** Pays research materials now; several techs can run in parallel, each learned after its own timer. */
export function startResearch<T extends ResearchSave>(p: T, id: string, gpsReady: boolean, now: number): ActionResult<T> {
  const jobs = researchJobsOf(p);
  if (jobs.some(j => j.id === id)) return { ok: false, reason: '이미 연구 중인 기술입니다' };
  if (p.techs.includes(id)) {
    // Level-up research for a known tech: scaled cost, learned as the next level.
    const level = techLevel(p.techLevels, id);
    const cost = techUpgradeCost(id, level);
    if (!cost) return { ok: false, reason: '더 이상 강화할 수 없는 기술입니다' };
    if (!gpsReady) return { ok: false, reason: '정확한 GPS 신호가 필요합니다' };
    if (!atWorkshop(p)) return { ok: false, reason: '거점 안에서 연구하세요' };
    const storage = removeStacks(p.storage, cost);
    if (!storage) return { ok: false, reason: '창고의 연구 재료가 부족합니다' };
    const job: TimedJob = { id, startedAt: now, readyAt: now + researchDurationMs(cost), level: level + 1 };
    return { ok: true, state: { ...p, storage, researching: null, researchJobs: [...jobs, job] } };
  }
  const r = researchTechnology(p, id, gpsReady);
  if (r.ok === false) return r;
  const job: TimedJob = { id, startedAt: now, readyAt: now + researchDurationMs(techById(id)!.research!) };
  return { ok: true, state: { ...r.state, techs: p.techs, researching: null, researchJobs: [...jobs, job] } };
}
/** Learns one finished research; nothing happens before its readyAt. */
export function claimResearch<T extends ResearchSave>(p: T, id: string, now: number): ActionResult<T> {
  const jobs = researchJobsOf(p);
  const job = jobs.find(j => j.id === id);
  if (!job) return { ok: false, reason: '진행 중인 연구가 없습니다' };
  if (now < job.readyAt) return { ok: false, reason: '아직 연구 중입니다' };
  return { ok: true, state: { ...p, researching: null, researchJobs: jobs.filter(j => j.id !== id), techs: p.techs.includes(id) ? p.techs : [...p.techs, id], techLevels: job.level ? { ...p.techLevels, [id]: job.level } : p.techLevels } };
}
export function prepareSkill<T extends AbilitySave>(p: T, id: ActiveSkill, targets: WorldCreature[], now: number, gpsReady: boolean): ActionResult<T> & { targets?: WorldCreature[] } {
  if (!gpsReady) return { ok: false, reason: '정확한 GPS 신호가 필요합니다' };
  if (!p.techs.includes(id)) return { ok: false, reason: '기술을 먼저 연구하세요' };
  if ((p.cooldowns?.[id] ?? 0) > now) return { ok: false, reason: '기술이 아직 회복 중입니다' };
  if (id === 'ember_scatter' && !atWorkshop(p)) return { ok: false, reason: '거점 안에서 사용하세요' };
  let nearby = targets.filter(e => distanceM(p.pos, e) <= C.interactRadiusM && (id !== 'roar' || !creatureDef(e.type).boss)).sort((a, b) => distanceM(p.pos, a) - distanceM(p.pos, b));
  if (id === 'stone_barrage') nearby = nearby.slice(0, 1);
  if (!nearby.length) return { ok: false, reason: '25m 안에 대상 짐승이 없습니다' };
  if (id === 'roar' && p.hunger < 1) return { ok: false, reason: '허기가 1 이상 필요합니다' };
  const paid = payAccessible(p, ACTIVE_SKILLS[id].cost);
  if (!paid) return { ok: false, reason: '사용 재료가 부족합니다 (배낭 또는 가까운 창고)' };
  return { ok: true, targets: nearby, state: { ...paid, hunger: p.hunger - (id === 'roar' ? 1 : 0), cooldowns: { ...p.cooldowns, [id]: now + ACTIVE_SKILLS[id].cooldownMs }, calmUntil: id === 'roar' ? { ...p.calmUntil, ...Object.fromEntries(nearby.map(e => [e.id, now + 20_000])) } : p.calmUntil } };
}
export function buildStructure<T extends AbilitySave>(p: T, kind: 'palisade' | 'outpost', gpsReady: boolean): ActionResult<T> {
  if (!gpsReady) return { ok: false, reason: '정확한 GPS 신호가 필요합니다' };
  if (!p.base || !p.techs.includes(kind)) return { ok: false, reason: '본거지와 건축 기술이 필요합니다' };
  if (kind === 'palisade' && (!atMainBase(p) || p.palisade)) return { ok: false, reason: '본거지에서 목책을 한 번만 설치할 수 있습니다' };
  if (kind === 'outpost' && (p.outpost || distanceM(p.pos, p.base) < C.outpostMinDistFromBaseM)) return { ok: false, reason: '전진기지는 1개만, 본거지에서 150m 이상 떨어져 설치하세요' };
  const paid = payAccessible(p, kind === 'palisade' ? PALISADE_COST : OUTPOST_COST);
  if (!paid) return { ok: false, reason: '건축 재료가 부족합니다' };
  return { ok: true, state: kind === 'palisade' ? { ...paid, palisade: true } : { ...paid, outpost: { ...p.pos } } };
}
export function tameWolf<T extends AbilitySave>(p: T, wolf: WorldCreature, damage: number, now: number, gpsReady: boolean, roll: number): ActionResult<T> & { tamed?: boolean } {
  if (!gpsReady || !p.techs.includes('wolf_taming')) return { ok: false, reason: '정확한 GPS와 늑대 길들이기 기술이 필요합니다' };
  if (wolf.type !== 'wolf' || distanceM(p.pos, wolf) > 25 || damage < creatureDef('wolf').hp / 2 || damage >= creatureDef('wolf').hp) return { ok: false, reason: '25m 안 일반 늑대의 체력을 절반 이하로 낮추세요' };
  if ((p.companions ?? []).some(c => c.kind === 'wolf')) return { ok: false, reason: '늑대 펫은 1마리만 동행할 수 있습니다' };
  if ((p.cooldowns?.tame ?? 0) > now) return { ok: false, reason: '테이밍 재시도는 10초 뒤에 가능합니다' };
  const paid = payAccessible(p, TAME_COST);
  if (!paid) return { ok: false, reason: '미끼 1·올가미 1·날고기 2가 필요합니다' };
  const tamed = roll < 0.7;
  return { ok: true, tamed, state: { ...paid, cooldowns: { ...p.cooldowns, tame: now + 10_000 }, companions: tamed ? [...(p.companions ?? []), { id: wolf.id, name: '동행 늑대', kind: 'wolf', lastWorkAt: now }] : p.companions } };
}
export function recruitCompanion<T extends AbilitySave>(p: T, kind: 'gatherer' | 'rescued', now: number, gpsReady: boolean, shaman?: LatLng): ActionResult<T> {
  if (!gpsReady || !p.techs.includes(kind === 'gatherer' ? 'recruitment' : 'rescue') || !p.base) return { ok: false, reason: '정확한 GPS·본거지·모집 기술이 필요합니다' };
  if ((p.companions ?? []).filter(c => c.kind !== 'wolf').length >= 2) return { ok: false, reason: 'NPC 동료는 최대 2명입니다' };
  if (kind === 'gatherer' && (!shaman || distanceM(p.pos, shaman) > 25)) return { ok: false, reason: '샤먼 25m 안에서 모집하세요' };
  if (kind === 'rescued' && (!atMainBase(p) || !(p.rescueTokens && p.rescueTokens > 0))) return { ok: false, reason: '우두머리를 처치한 뒤 본거지에서 구조하세요' };
  const paid = payAccessible(p, kind === 'gatherer' ? RECRUIT_COST : RESCUE_COST);
  if (!paid) return { ok: false, reason: 'NPC 모집 재료가 부족합니다' };
  return { ok: true, state: { ...paid, rescueTokens: (p.rescueTokens ?? 0) - (kind === 'rescued' ? 1 : 0), companions: [...(p.companions ?? []), { id: `npc:${now}:${p.companions?.length ?? 0}`, kind, name: kind === 'gatherer' ? '채집 동료' : '구조된 동료', lastWorkAt: now }] } };
}
export function collectCompanionWork<T extends AbilitySave>(p: T, now: number, gpsReady: boolean): ActionResult<T> {
  if (!gpsReady || !atMainBase(p)) return { ok: false, reason: '정확한 GPS 신호가 있는 본거지에서 받으세요' };
  let storage = p.storage;
  let worked = false;
  const companions = (p.companions ?? []).map(c => {
    if (c.kind === 'wolf') return c;
    const ticks = Math.min(6, Math.floor((now - c.lastWorkAt) / WORK_MS));
    if (ticks <= 0) return c;
    worked = true;
    storage = addStacks(storage, WORK_REWARDS[c.kind].map(s => ({ ...s, count: s.count * ticks })));
    return { ...c, lastWorkAt: now };
  });
  return worked ? { ok: true, state: { ...p, storage, companions } } : { ok: false, reason: '작업 중입니다. 5분 뒤에 다시 확인하세요' };
}