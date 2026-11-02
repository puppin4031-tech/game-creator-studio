import { creatureDef, type CreatureType, type LootRoll } from './entities';
import type { Stack } from './types';

/** A complete hit exchange; defeated creatures cannot retaliate. */
export function resolveCreatureHit(type: CreatureType, damage: number, power: number, defense: number, ranged: boolean) {
  const creature = creatureDef(type);
  const dealt = Math.min(creature.hp, damage + Math.max(1, Math.round(power)));
  const defeated = dealt >= creature.hp;
  const counterDamage = defeated || ranged || creature.atk <= 0 ? 0 : Math.max(1, creature.atk - defense);
  return { dealt, remainingHp: creature.hp - dealt, defeated, counterDamage };
}

/** Inject randomness for exact probability boundary tests. */
export function rollLoot(loot: LootRoll[], random: () => number = Math.random): Stack[] {
  const out: Stack[] = [];
  for (const entry of loot) {
    if (entry.chance !== undefined && random() >= entry.chance) continue;
    const count = entry.min + Math.floor(random() * (entry.max - entry.min + 1));
    if (count > 0) out.push({ itemId: entry.itemId, count });
  }
  return out;
}

export const CREATURE_ATTACK_INTERVAL_MS = 900;