/** Tunable gameplay constants for the paleolithic survival mode. */
export const SURVIVAL_CONFIG = {
  /** Distance (m) within which a node/creature can be interacted with. Sized for typical phone GPS error. */
  interactRadiusM: 25,
  /** Always-visible radius (m) during the day. */
  visionDayM: 86,
  /** Always-visible radius (m) at night. */
  visionNightM: 45,
  /** Radar pulse reveal radius (m). */
  scanRadiusM: 170,
  /** How long a radar pulse keeps far entities visible (ms). */
  scanRevealMs: 45_000,
  /** Radar cooldown (ms). */
  scanCooldownMs: 60_000,
  /** Auto-pickup radius for dropped bundles (m). */
  pickupRadiusM: 14,
  /** Aggressive creatures ambush the player inside this radius (m). */
  ambushRadiusM: 18,
  /** Base carry capacity (kg). */
  baseCarryKg: 40,
  /** Extra carry capacity per level (kg). */
  carryPerLevelKg: 2,
  /** Max carried gear pieces (equipped included). */
  maxCarriedGear: 6,
  /** Base max HP. */
  baseMaxHp: 100,
  hpPerLevel: 5,
  /** Fraction of every backpack stack lost on death. */
  deathDropRatio: 0.3,
  /** Death / overflow bundle lifetime (ms). */
  deathDropTtlMs: 24 * 60 * 60_000,
  overflowDropTtlMs: 2 * 60 * 60_000,
  /** Bare-hand attempts on tier-1 nodes. */
  bareHandHpPenalty: 5,
  bareHandFailChance: 0.5,
  /** Unarmed attack damage. */
  fistAtk: 3,
  critChance: 0.1,
  critMultiplier: 1.8,
  dodgeChance: 0.1,
  /** Survival tick length (ms): hunger drain, regen, starvation. */
  tickMs: 60_000,
  hungerPerTick: 0.25,
  starveHpPerTick: 0.5,
  /** Max ticks applied after the app was closed (prevents offline starvation). */
  maxOfflineTicks: 5,
  /** Field outpost rules. */
  outpostMinDistFromBaseM: 150,
  outpostRadiusM: 30,
  outpostShipFee: 0.2,
  outpostShipCooldownMs: 5 * 60_000,
  /** Base relocation cooldown (ms). */
  baseMoveCooldownMs: 30 * 60_000,
  /** Flee success chance (default). */
  fleeChance: 0.6,
  /** Creatures that were fled from ignore the player for this long (ms). */
  fleeGraceMs: 60_000,
  /** Simulation walk speed (m/s). */
  simWalkSpeedMs: 8,
} as const;

export const QUALITY_MULT = { CRUDE: 0.8, NORMAL: 1, MASTERWORK: 1.3 } as const;
export const QUALITY_LABEL = { CRUDE: '조잡한', NORMAL: '일반', MASTERWORK: '명품' } as const;
