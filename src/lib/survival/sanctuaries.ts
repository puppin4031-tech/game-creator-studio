// Ancient dolmen sanctuaries guarded by the priest Melchizedek (pure rules).
// Any site can be the first awakened; each discovery joins the player's network.
import type { ItemId } from './items';
import type { LatLng, Stack } from './types';
import { distanceM } from './geo';
import { SANCTUARY_SITES } from './sanctuarySites';

export const SHRINE_AURA_M = 15;
export const SHRINE_BLESS_COOLDOWN_MS = 12 * 60 * 60 * 1000;
export const FIRST_AWAKEN_SACRED = 100;
export const NETWORK_LINK_SACRED = 50;

export interface Shrine extends LatLng { id: string; name: string }
export interface ShrineState { found: string[]; sacred: number; blessedAt: Record<string, number>; rites: number }

const title = (slug: string) => slug.replace(/(^|[-_ ])(\w)/g, (_, s: string, c: string) => `${s ? ' ' : ''}${c.toUpperCase()}`);

export const SHRINES: Shrine[] = SANCTUARY_SITES.map(([slug, lat, lng]) => ({
  id: `shrine:${slug}:${lat.toFixed(4)}`, name: `${title(slug)} 고석 성소`, lat, lng,
}));

export const emptyShrineState = (): ShrineState => ({ found: [], sacred: 0, blessedAt: {}, rites: 0 });

export function shrinesNear(pos: LatLng, radiusM: number): Shrine[] {
  return SHRINES.filter((s) => distanceM(pos, s) <= radiusM);
}

/** Nearest sanctuary the player has not awakened yet (resonance hint). */
export function nearestUnfound(pos: LatLng, st: ShrineState): { shrine: Shrine; distanceM: number } | null {
  let best: { shrine: Shrine; distanceM: number } | null = null;
  for (const s of SHRINES) {
    if (st.found.includes(s.id)) continue;
    const d = distanceM(pos, s);
    if (!best || d < best.distanceM) best = { shrine: s, distanceM: d };
  }
  return best;
}

export type DiscoverResult = { state: ShrineState; gained: number; first: boolean } | null;
/** Awaken a sanctuary; null when already part of the network. */
export function discoverShrine(st: ShrineState, id: string): DiscoverResult {
  if (st.found.includes(id)) return null;
  const first = st.found.length === 0;
  const gained = first ? FIRST_AWAKEN_SACRED : NETWORK_LINK_SACRED;
  return { state: { ...st, found: [...st.found, id], sacred: st.sacred + gained }, gained, first };
}

export interface Rite { id: string; name: string; desc: string; cost: Stack[]; sacred: number; reward?: Stack[] }
export const RITES: Rite[] = [
  { id: 'incense', name: '약초 향의 제사', desc: '약초와 황토를 태워 연기를 올린다.', cost: [{ itemId: 'herb', count: 4 }, { itemId: 'ochre', count: 1 }], sacred: 10 },
  { id: 'obsidian', name: '흑요석의 제사', desc: '불의 돌과 송진을 제단에 바친다.', cost: [{ itemId: 'obsidian', count: 2 }, { itemId: 'resin', count: 1 }], sacred: 20 },
  { id: 'jade', name: '옥빛 맹세의 제사', desc: '땅 깊은 곳의 옥과 빛의 결정을 바친다.', cost: [{ itemId: 'jade', count: 1 }, { itemId: 'quartz', count: 2 }], sacred: 40, reward: [{ itemId: 'sacred_essence', count: 1 }] },
  { id: 'beast', name: '우두머리의 제사', desc: '우두머리 짐승의 송곳니와 털가죽을 바친다.', cost: [{ itemId: 'ancient_fang', count: 1 }, { itemId: 'prime_pelt', count: 1 }], sacred: 60, reward: [{ itemId: 'sacred_essence', count: 2 }] },
];

export function performRite(st: ShrineState, rite: Rite): ShrineState {
  return { ...st, sacred: st.sacred + rite.sacred, rites: st.rites + 1 };
}

export type BlessCheck = { ok: true } | { ok: false; waitMs: number };
export function canBless(st: ShrineState, id: string, now: number): BlessCheck {
  const last = st.blessedAt[id] ?? 0;
  const wait = last + SHRINE_BLESS_COOLDOWN_MS - now;
  return wait > 0 ? { ok: false, waitMs: wait } : { ok: true };
}

/** Periodic gift from the altar; stronger once the network holds more sacred power. */
export function blessingGift(st: ShrineState): Stack[] {
  const gift: Stack[] = [{ itemId: 'sacred_bread' as ItemId, count: 1 }, { itemId: 'purify_dew' as ItemId, count: 1 }];
  if (st.sacred >= 200 || st.found.length >= 3) gift.push({ itemId: 'sacred_essence', count: 1 });
  return gift;
}

export function recordBlessing(st: ShrineState, id: string, now: number): ShrineState {
  return { ...st, blessedAt: { ...st.blessedAt, [id]: now } };
}

export const MELCHIZEDEK_FIRST = '대지가 긴 잠에서 깨어났다. 방랑자여, 그대가 처음으로 이 고석의 성소를 깨웠다. 먼 곳에 잠든 성소들이 그대의 발소리에 응답하기 시작하리라.';
export const MELCHIZEDEK_LINK = '또 하나의 성소가 맥을 이었다. 돌과 돌 사이로 태초의 맹세가 흐른다.';
export const MELCHIZEDEK_WORDS = [
  '하늘과 대지가 맺은 맹세는 돌보다 오래 간다. 귀한 것을 바치는 자에게 성소는 힘을 나눈다.',
  '황금 결계 안에서는 짐승도 이빨을 거둔다. 지친 몸을 쉬어 가라.',
  '살렘의 불꽃은 꺼지지 않는다. 성소를 많이 이을수록 그대의 신성력은 깊어지리라.',
  '흑요석은 불의 기억을, 옥은 땅의 기억을 품고 있다. 제단은 그 기억을 받는다.',
];
