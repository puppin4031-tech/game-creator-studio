import { ITEMS, type ItemId } from './items';
import type { LatLng, Stack } from './types';
import type { SpriteKey } from './spriteMeta';

/** Real-world places reinterpreted as Paleolithic landmarks. */
export type LandmarkKind = 'shaman' | 'spring' | 'smokehouse' | 'trader';

export interface Landmark extends LatLng {
  id: string;
  kind: LandmarkKind;
  /** Original real-world name, kept only as faint "ruins of" flavor. */
  origin?: string;
}

export const LANDMARK_INFO: Record<LandmarkKind, { name: string; desc: string; sprite: SpriteKey }> = {
  shaman: { name: '샤먼의 지하 성소', desc: '제사장이 풍문과 생존 지혜를 들려줍니다.', sprite: 'npc-shaman' },
  spring: { name: '신성한 샘터', desc: '맑은 물과 열매를 길어 올릴 수 있습니다.', sprite: 'item-clay-pot' },
  smokehouse: { name: '훈제 보관소', desc: '말린 고기를 얻을 수 있습니다.', sprite: 'item-cooked-meat' },
  trader: { name: '떠돌이 만물상', desc: '물매를 든 꼬마 행상이 물건을 조개 화폐로 사고팝니다.', sprite: 'char-scout' },
};

/** Shaman sanctuary: creatures never spawn inside, and HP regenerates faster. */
export const SANCTUARY_RADIUS_M = 100;
export const SANCTUARY_REGEN_PER_TICK = 3;
/** Natural regen per tick while fed (hunger at or above the threshold). */
export const NATURAL_REGEN_PER_TICK = 1;
export const NATURAL_REGEN_MIN_HUNGER = 30;

/** Abuse limits per landmark. */
export const LANDMARK_COOLDOWN_MS = 30 * 60_000;
export const LANDMARK_DAILY_MAX = 3;
/** Total landmark rewards per player per day across all places. */
export const LANDMARK_GLOBAL_DAILY_MAX = 15;

export interface LandmarkClaims {
  /** Local date key (YYYY-MM-DD) the counters belong to. */
  day: string;
  total: number;
  byId: Record<string, { count: number; lastAt: number }>;
}

export const dayKey = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const freshClaims = (now: number): LandmarkClaims => ({ day: dayKey(now), total: 0, byId: {} });

export type ClaimCheck = { ok: true } | { ok: false; reason: 'cooldown' | 'daily' | 'global'; waitMs?: number };

export function canClaimLandmark(claims: LandmarkClaims | undefined, id: string, now: number): ClaimCheck {
  const c = !claims || claims.day !== dayKey(now) ? freshClaims(now) : claims;
  if (c.total >= LANDMARK_GLOBAL_DAILY_MAX) return { ok: false, reason: 'global' };
  const rec = c.byId[id];
  if (rec && rec.count >= LANDMARK_DAILY_MAX) return { ok: false, reason: 'daily' };
  if (rec && now - rec.lastAt < LANDMARK_COOLDOWN_MS) return { ok: false, reason: 'cooldown', waitMs: LANDMARK_COOLDOWN_MS - (now - rec.lastAt) };
  return { ok: true };
}

export function recordLandmarkClaim(claims: LandmarkClaims | undefined, id: string, now: number): LandmarkClaims {
  const c = !claims || claims.day !== dayKey(now) ? freshClaims(now) : claims;
  const rec = c.byId[id];
  return { day: c.day, total: c.total + 1, byId: { ...c.byId, [id]: { count: (rec?.count ?? 0) + 1, lastAt: now } } };
}

/** Raw POI properties from the vector tiles (OpenMapTiles schema). */
export interface PoiProps { name?: string; class?: string; subclass?: string }

const BRAND: [RegExp, LandmarkKind][] = [
  [/스타벅스|starbucks/i, 'spring'],
  [/맥도날드|mcdonald/i, 'smokehouse'],
  [/다이소|daiso/i, 'trader'],
];

/** Map a real POI to a landmark kind; unmatched places return null. */
export function classifyPoi(p: PoiProps): LandmarkKind | null {
  const name = p.name ?? '';
  for (const [re, kind] of BRAND) if (re.test(name)) return kind;
  const cls = p.class ?? '', sub = p.subclass ?? '';
  if (cls === 'railway' && /subway|station|halt/.test(sub)) return 'shaman';
  if (/역$/.test(name) && (cls === 'railway' || cls === 'bus')) return 'shaman';
  if (cls === 'cafe' || sub === 'cafe') return 'spring';
  if (cls === 'fast_food' || sub === 'fast_food') return 'smokehouse';
  if (/convenience|variety_store|department_store/.test(sub) || cls === 'grocery') return 'trader';
  return null;
}

/** Merge radius per kind: a station's exits/platforms collapse into one shaman. */
export const LANDMARK_MERGE_M: Record<LandmarkKind, number> = { shaman: 150, spring: 25, smokehouse: 25, trader: 25 };

/** Collapse same-kind landmarks within merge radius into one, placed at the group's centroid with a stable id. */
export function clusterLandmarks(list: Landmark[]): Landmark[] {
  const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id));
  const groups: Landmark[][] = [];
  for (const l of sorted) {
    const r = LANDMARK_MERGE_M[l.kind];
    const g = groups.find(g => g[0].kind === l.kind && g.some(m => {
      const dy = (m.lat - l.lat) * 111320, dx = (m.lng - l.lng) * 111320 * Math.cos(l.lat * Math.PI / 180);
      return Math.hypot(dx, dy) <= r;
    }));
    if (g) g.push(l); else groups.push([l]);
  }
  return groups.map(g => {
    const named = g.find(m => m.origin && /역$/.test(m.origin)) ?? g[0];
    if (g.length === 1) return g[0];
    const lat = g.reduce((s, m) => s + m.lat, 0) / g.length, lng = g.reduce((s, m) => s + m.lng, 0) / g.length;
    return { ...named, id: g[0].id, lat, lng };
  });
}

/** Reward rolled when a landmark is used (shaman blesses with XP instead). */
export function landmarkReward(kind: LandmarkKind, r: number): Stack[] {
  if (kind === 'spring') return r < 0.3 ? [{ itemId: 'spring_water', count: 2 }, { itemId: 'coconut', count: 1 }] : [{ itemId: 'spring_water', count: 2 }];
  if (kind === 'smokehouse') return [{ itemId: 'jerky', count: r < 0.25 ? 2 : 1 }];
  return [];
}
export const SHAMAN_BLESS_XP = 30;

/** Shells paid by the trader per unit sold. */
export const SELL_PRICE: Record<string, number> = { common: 1, uncommon: 3, rare: 8, epic: 20 };
export const sellPrice = (id: ItemId) => (id === 'shell' ? 0 : SELL_PRICE[ITEMS[id].rarity]);
export const TRADER_STOCK: { itemId: ItemId; price: number }[] = [
  { itemId: 'flint', price: 3 },
  { itemId: 'cordage', price: 4 },
  { itemId: 'herb', price: 5 },
  { itemId: 'spring_water', price: 2 },
  { itemId: 'jerky', price: 6 },
  { itemId: 'leather', price: 10 },
  { itemId: 'salve', price: 18 },
];

export const SHAMAN_TIPS = [
  '배낭이 무거우면 거점에 돌아가세요. 들어서는 순간 창고에 쌓입니다.',
  '밤에는 시야가 좁아지고 사나운 짐승이 늘어납니다.',
  '부싯돌 3개면 주먹도끼를 만들 수 있다는 깨달음이 옵니다.',
  '투석구나 활 같은 원거리 무기는 첫 공격에 반격을 받지 않습니다.',
  '같은 샘터는 하루 세 번까지만 물을 내어 줍니다. 계속 걸으세요.',
  '공원과 숲에는 짐승이 세 배 더 많이 몰려듭니다. 무기를 챙기세요.',
];
export const SHAMAN_RUMORS = [
  '강가 습지에는 점토 구덩이가 많다더군.',
  '산자락에서는 흑요석이 자주 보인다고 하네.',
  '큰 공원 깊은 곳에서 늑대 무리를 봤다는 이가 있었지.',
  '평지의 들판에서는 부싯돌을 쉽게 줍는다네.',
  '오늘 밤 공원에 멧돼지 떼가 내려온다는 소문이 있어.',
];

/** Creature density multiplier inside sampled park cells. */
export const PARK_CREATURE_MULT = 3;
