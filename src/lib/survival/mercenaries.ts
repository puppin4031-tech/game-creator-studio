import type { Stack } from './types';

/** Mercenary contract rules (pure). A hired mercenary runs observed expeditions instead of the player. */
export interface MercenaryContract { name: string; hiredAt: number; until: number }

export const MERC_CONTRACT_MS = 24 * 60 * 60 * 1000;
export const MERC_COST: Stack[] = [{ itemId: 'raw_meat', count: 3 }, { itemId: 'hide', count: 1 }];
const NAMES = ['거친 송곳니', '외눈 바위', '붉은 흉터', '늑대 사냥꾼', '돌주먹'];

export const mercActive = (m: MercenaryContract | null | undefined, now: number) => !!m && now < m.until;
export function hireMercenary(now: number, seed = now): MercenaryContract {
  return { name: NAMES[Math.abs(Math.floor(seed / 1000)) % NAMES.length], hiredAt: now, until: now + MERC_CONTRACT_MS };
}
