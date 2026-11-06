export const DAILY_FREE_INVENTIONS = 5;
export const REWARD_TIMER_MS = 15_000;
export const WALK_REWARD_METERS = 200;
export type RewardType = 'timer' | 'invite' | 'walk';
export interface InventionCredits { day: string; freeLeft: number; bonus: number; fragments: number; inviteClaimed: boolean; walkMeters: number; }
export function kstDay(now: number) { return new Date(now + 9 * 3_600_000).toISOString().slice(0,10); }
export function normalizeCredits(value?: InventionCredits, now = Date.now()): InventionCredits {
  if (value?.day === kstDay(now)) return value;
  return { day: kstDay(now), freeLeft: DAILY_FREE_INVENTIONS, bonus: value?.bonus ?? 0, fragments: value?.fragments ?? 0, inviteClaimed: false, walkMeters: 0 };
}
export function settleCredits(value: InventionCredits, accepted: boolean) {
  if (!accepted) return { ...value, fragments: value.fragments + 1 };
  if (value.freeLeft + value.bonus <= 0) return null;
  return { ...value, freeLeft: Math.max(0,value.freeLeft-1), bonus: value.bonus-(value.freeLeft > 0 ? 0 : 1) };
}
export function rewardAmount(type: RewardType) { return type === 'timer' ? 1 : 3; }