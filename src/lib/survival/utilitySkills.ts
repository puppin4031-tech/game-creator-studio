import { SURVIVAL_CONFIG as C } from './config';

/** Passive utility tech bonuses. Pure so hooks, UI and tests share the same numbers. */
export const VISION_BONUS_M = 15;
export const REACH_WITH_SKILL_M = 35;
export const AUTO_PICKUP_RADIUS_M = 10;
export const AUTO_PICKUP_INTERVAL_MS = 4000;
export const POCKET_BONUS_KG = [0, 30, 60, 100] as const;

export const visionBonus = (techs: string[]) => (techs.includes('keen_eye') ? VISION_BONUS_M : 0);
export const reachRadius = (techs: string[]) => (techs.includes('long_reach') ? REACH_WITH_SKILL_M : C.interactRadiusM);
export const hasAutoPickup = (techs: string[]) => techs.includes('auto_pickup');
export function pocketLevel(techs: string[]): 0 | 1 | 2 | 3 {
  if (techs.includes('pocket_3')) return 3;
  if (techs.includes('pocket_2')) return 2;
  if (techs.includes('pocket_1')) return 1;
  return 0;
}
export const pocketBonusKg = (techs: string[]) => POCKET_BONUS_KG[pocketLevel(techs)];
