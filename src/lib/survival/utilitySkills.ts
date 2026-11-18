import { SURVIVAL_CONFIG as C } from './config';
import { techLevel, longReachBonus } from './techLevels';
import { EGG_PICK_RADIUS_M } from './dinoEggs';

/** Passive utility tech bonuses. Pure so hooks, UI and tests share the same numbers. */
export const VISION_BONUS_M = 15;
export const REACH_WITH_SKILL_M = 35;
export const AUTO_PICKUP_RADIUS_M = 10;
export const AUTO_PICKUP_INTERVAL_MS = 4000;
export const POCKET_BONUS_KG = [0, 30, 60, 100] as const;

export const visionBonus = (techs: string[]) => (techs.includes('keen_eye') ? VISION_BONUS_M : 0);

/**
 * Reach radius in meters for gathering, melee combat, landmarks, and shrines.
 * Scales with 'long_reach' tech level:
 * - No skill: 25m
 * - Lv.1: 35m
 * - Lv.2: 45m
 * - Lv.3: 55m
 * - Lv.4: 65m
 * - Lv.5: 75m
 */
export const reachRadius = (techs: string[], techLevels?: Record<string, number>) => {
  if (!techs.includes('long_reach')) return C.interactRadiusM;
  const lv = techLevel(techLevels, 'long_reach');
  return C.interactRadiusM + longReachBonus(lv);
};

/**
 * Dinosaur egg pickup radius in meters.
 * Scales with 'long_reach' tech level:
 * - No skill: 20m
 * - Lv.1: 30m
 * - Lv.2: 40m
 * - Lv.3: 50m
 * - Lv.4: 60m
 * - Lv.5: 70m
 */
export const eggReachRadius = (techs: string[], techLevels?: Record<string, number>) => {
  const base = EGG_PICK_RADIUS_M;
  if (!techs.includes('long_reach')) return base;
  const lv = techLevel(techLevels, 'long_reach');
  return base + longReachBonus(lv);
};

export const hasAutoPickup = (techs: string[]) => techs.includes('auto_pickup');
export function pocketLevel(techs: string[]): 0 | 1 | 2 | 3 {
  if (techs.includes('pocket_3')) return 3;
  if (techs.includes('pocket_2')) return 2;
  if (techs.includes('pocket_1')) return 1;
  return 0;
}
export const pocketBonusKg = (techs: string[]) => POCKET_BONUS_KG[pocketLevel(techs)];
