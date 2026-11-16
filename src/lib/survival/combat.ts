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
/** Beasts notice the player inside this radius and strike first. */
export const AGGRO_RADIUS_M = 14;
/** Beyond this the beast gives up and returns home (increased so ranged bow/sling hits pull the mob in). */
export const LEASH_RADIUS_M = 40;
export const BEAST_STRIKE_INTERVAL_MS = 2200;

/** Whether a beast attacks a nearby player on its own or chases after being hit (including ranged bow/sling). */
export function beastAggro(type: CreatureType, distance: number, opts: { isNight: boolean; engaged: boolean; calm: boolean }): boolean {
  const c = creatureDef(type);
  if (opts.calm || c.atk <= 0) return false;
  if (c.temper === 'passive' && !opts.engaged) return false;
  const hostile = c.temper === 'aggressive' || (!!c.nightAggressive && opts.isNight) || opts.engaged;
  return hostile && distance <= (opts.engaged ? LEASH_RADIUS_M : AGGRO_RADIUS_M);
}