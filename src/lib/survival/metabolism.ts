import { SURVIVAL_CONFIG as C } from './config';
import { NATURAL_REGEN_MIN_HUNGER, NATURAL_REGEN_PER_TICK } from './landmarks';

interface SurvivalVitals {
  hp: number;
  hunger: number;
  lastTickAt: number;
}

/** Settle elapsed time once, discarding capped backlog rather than replaying it. */
export function advanceSurvivalVitals<T extends SurvivalVitals>(state: T, now: number, locationRegen = 0): T {
  const elapsedTicks = Math.floor((now - state.lastTickAt) / C.tickMs);
  if (elapsedTicks <= 0) return state;
  const ticks = Math.min(C.maxOfflineTicks, elapsedTicks);
  let { hp, hunger } = state;
  for (let i = 0; i < ticks; i++) {
    hunger = Math.max(0, hunger - C.hungerPerTick);
    if (hunger === 0) hp -= C.starveHpPerTick;
    hp += locationRegen;
    if (hunger >= NATURAL_REGEN_MIN_HUNGER) hp += NATURAL_REGEN_PER_TICK;
    hp = Math.max(1, Math.min(C.baseMaxHp, hp));
  }
  return { ...state, hp, hunger, lastTickAt: state.lastTickAt + elapsedTicks * C.tickMs };
}