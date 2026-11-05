import type { ItemId } from './items';
import type { LatLng, Stack } from './types';
import { removeStacks } from './inventory';
import { hash01 } from './homeRandom';

/** Real-time research/upgrade timers and base expeditions. Pure so the hook and tests share rules. */
export const HOUR = 3_600_000;

export interface TimedJob { id: string; startedAt: number; readyAt: number; /** Target tech level for level-up research (absent = first learn). */ level?: number }

/** Research time grows with material cost: 2h / 6h / 12h / 24h. */
export function researchDurationMs(cost: Stack[]): number {
  const n = cost.reduce((a, s) => a + s.count, 0);
  if (n <= 5) return 2 * HOUR;
  if (n <= 8) return 6 * HOUR;
  if (n <= 12) return 12 * HOUR;
  return 24 * HOUR;
}
export const BASE_UPGRADE_MS: Record<2 | 3, number> = { 2: 12 * HOUR, 3: 24 * HOUR };

export const isReady = (job: TimedJob | null | undefined, now: number) => !!job && now >= job.readyAt;
export const jobProgress = (job: TimedJob, now: number) => Math.min(1, Math.max(0, (now - job.startedAt) / (job.readyAt - job.startedAt)));
export function fmtRemaining(ms: number) {
  if (ms <= 0) return '완료';
  const h = Math.floor(ms / HOUR); const m = Math.ceil((ms % HOUR) / 60_000);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

// ---- Expedition ----
export const EXPEDITION_MS = 4 * HOUR;
/** New explored points (walked outside, every 20m) needed per expedition = map fragments. */
export const EXPEDITION_EXPLORE_COST = 25;
export const EXPEDITION_FOOD: ItemId[] = ['jerky', 'cooked_meat'];
export const EXPEDITION_FOOD_COUNT = 2;

export interface Expedition { startedAt: number; readyAt: number; seed: number }
export interface ScoutTarget { kind: 'flint' | 'herb' | 'obsidian' | 'boss' | 'clay'; label: string; pos: LatLng; distanceM: number; bearing: string }

export function mapFragments(explored: number, mark: number) {
  return Math.floor(Math.max(0, explored - mark) / EXPEDITION_EXPLORE_COST);
}

/** Pays food from backpack or storage (food preference order). */
export function payExpeditionFood(backpack: Stack[], storage: Stack[]): { backpack: Stack[]; storage: Stack[] } | null {
  let need = EXPEDITION_FOOD_COUNT; let b = backpack; let s = storage;
  for (const id of EXPEDITION_FOOD) {
    for (const src of ['b', 's'] as const) {
      if (!need) break;
      const list = src === 'b' ? b : s;
      const have = list.find(x => x.itemId === id)?.count ?? 0;
      const n = Math.min(have, need);
      if (!n) continue;
      const left = removeStacks(list, [{ itemId: id, count: n }])!;
      if (src === 'b') b = left; else s = left;
      need -= n;
    }
  }
  return need ? null : { backpack: b, storage: s };
}

/** Basic materials only — rare ones must still be hunted outside. */
export function expeditionRewards(seed: number): Stack[] {
  const r = (i: number, min: number, max: number) => min + Math.floor(hash01(seed, i) * (max - min + 1));
  return [
    { itemId: 'raw_meat', count: r(1, 2, 4) },
    { itemId: 'bone', count: r(2, 1, 3) },
    { itemId: 'hide', count: r(3, 1, 2) },
    { itemId: 'branch', count: r(4, 2, 5) },
  ];
}

const LOG_LINES = ['사냥터에 도착해 발자국을 살핀다', '멧돼지 무리를 발견했다', '창을 던져 한 마리를 쓰러뜨렸다', '늑대가 덤불에서 짐승을 몰아냈다', '가죽을 벗기고 뼈를 추린다', '마른 가지를 모아 짐을 꾸린다', '정찰병이 먼 언덕을 살핀다', '거점으로 돌아오는 길에 오른다'];
/** Observation log revealed progressively by elapsed time. */
export function expeditionLog(e: Expedition, now: number): string[] {
  const p = Math.min(1, Math.max(0, (now - e.startedAt) / (e.readyAt - e.startedAt)));
  return LOG_LINES.slice(0, Math.max(1, Math.ceil(p * LOG_LINES.length)));
}

const SCOUT_KINDS: { kind: ScoutTarget['kind']; label: string }[] = [
  { kind: 'flint', label: '부싯돌 노두' }, { kind: 'herb', label: '약초 군락' }, { kind: 'obsidian', label: '흑요석 광맥' },
  { kind: 'boss', label: '우두머리 짐승의 흔적' }, { kind: 'clay', label: '점토 웅덩이' },
];
const DIRS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
/** Tomorrow's walking goals: 3 points 200–800m from base. */
export function scoutReport(seed: number, base: LatLng): ScoutTarget[] {
  return [0, 1, 2].map(i => {
    const k = SCOUT_KINDS[Math.floor(hash01(seed, 10 + i) * SCOUT_KINDS.length)];
    const angle = hash01(seed, 20 + i) * Math.PI * 2;
    const d = 200 + Math.round(hash01(seed, 30 + i) * 600);
    const dLat = (d * Math.cos(angle)) / 111_320;
    const dLng = (d * Math.sin(angle)) / (111_320 * Math.cos((base.lat * Math.PI) / 180));
    return { ...k, pos: { lat: base.lat + dLat, lng: base.lng + dLng }, distanceM: d, bearing: DIRS[Math.round(angle / (Math.PI / 4)) % 8] };
  });
}
