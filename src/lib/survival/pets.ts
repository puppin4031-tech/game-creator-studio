import { creatureDef } from './entities';
import { resolveCreatureHit, rollLoot } from './combat';
import { distanceM, offsetM } from './geo';
import { addStacks } from './inventory';
import type { LatLng, Stack, WorldCreature } from './types';
import { BABY_DINOS } from './dinoEggs';

export const PET_MAX_LEVEL = 5;
export const PET_GUARD_SLOTS = 3;
export const maxGuardSlotsFor = (divinityAffinity = 0) => (divinityAffinity >= 100 ? 4 : PET_GUARD_SLOTS);
export const PET_REST_MS = 60_000;
export const PET_DAILY_LOOT_CAP = 10;
export const PET_ATTACK_MS = 2000;
export const PET_BOUNDARY_REACH_M = 20;
export interface OwnedPet {
  uid: string; speciesId: string; name: string; level: number; hp: number;
  deployed: boolean; locked: boolean; restUntil: number;
  role?: 'guard' | 'hunt' | 'follow' | 'idle'; huntAt?: number;
}
export interface PetDefense {
  day: string; claims: number; lastHitAt: number;
  logs: { at: number; text: string }[];
}
export interface PetHit { at: number; petUid: string; target: WorldCreature; damage: number; counterDamage: number; killed: boolean }
export const petStats = (level: number) => {
  const scale = 1 + (Math.min(PET_MAX_LEVEL, Math.max(1, level)) - 1) * 0.25;
  return { maxHp: 80 * scale, attack: 12 * scale };
};
/** Flat damage reduction pets get when beasts retaliate. */
export const PET_DEFENSE = 3;
export const petDay = (now: number) => new Date(now).toISOString().slice(0, 10);
export const emptyPetDefense = (): PetDefense => ({ day: '', claims: 0, lastHitAt: 0, logs: [] });

export function hatchPet(uid: string, speciesId: string, name: string, pets: OwnedPet[]): OwnedPet {
  return { uid, speciesId, name, level: 1, hp: petStats(1).maxHp, deployed: pets.filter(p => p.deployed).length < PET_GUARD_SLOTS, locked: false, restUntil: 0 };
}

/** The presence of pets (including []) marks conversion complete, preventing consumed legacy pets from reappearing. */
export function migratePets<T extends { pets?: OwnedPet[]; babyDinos?: string[] }>(save: T, nameFor: (id: string) => string): T & { pets: OwnedPet[]; babyDinos: string[] } {
  if (save.pets !== undefined) return { ...save, pets: save.pets.map(p => {
    const renamed = ['baby_stego', 'baby_raptor', 'mini_triceratops'].includes(p.speciesId)
      ? BABY_DINOS.find(d => d.id === p.speciesId) : undefined;
    return renamed ? { ...p, name: renamed.name, speciesId: fusionSpecies(p.speciesId) } : p;
  }), babyDinos: [] };
  const pets: OwnedPet[] = [];
  for (const [i, id] of (save.babyDinos ?? []).entries()) pets.push(hatchPet(`legacy-pet:${i}:${id}`, id, nameFor(id), pets));
  return { ...save, pets, babyDinos: [] };
}

/** Legacy and admin versions of the three renamed dinosaurs are one fusion species. */
export function fusionSpecies(id: string): string {
  return ({ baby_stego: 'stagogon85', baby_raptor: 'terranox01', mini_triceratops: 'keratupsgt' } as Record<string, string>)[id] ?? id;
}

export function fusionPartner(pets: OwnedPet[], pet: OwnedPet): OwnedPet | undefined {
  if (pet.locked || pet.level >= PET_MAX_LEVEL) return undefined;
  return pets.find(p => p.uid !== pet.uid && !p.locked && fusionSpecies(p.speciesId) === fusionSpecies(pet.speciesId) && p.level === pet.level);
}

export function fusePets(pets: OwnedPet[], firstId: string, secondId: string, uid: string): { pets: OwnedPet[]; pet: OwnedPet } | null {
  const a = pets.find(p => p.uid === firstId), b = pets.find(p => p.uid === secondId);
  if (!a || !b || firstId === secondId || pets.some(p => p.uid === uid) || a.locked || b.locked || fusionSpecies(a.speciesId) !== fusionSpecies(b.speciesId) || a.level !== b.level || a.level >= PET_MAX_LEVEL) return null;
  const level = a.level + 1;
  const pet = { ...a, speciesId: fusionSpecies(a.speciesId), uid, level, hp: petStats(level).maxHp, restUntil: 0, deployed: a.deployed || b.deployed };
  return { pets: [...pets.filter(p => p.uid !== firstId && p.uid !== secondId), pet], pet };
}

export function deployPet(pets: OwnedPet[], uid: string, maxGuardSlots: number = PET_GUARD_SLOTS): OwnedPet[] | null {
  const pet = pets.find(p => p.uid === uid);
  if (!pet || (!pet.deployed && pets.filter(p => p.deployed).length >= maxGuardSlots)) return null;
  return pets.map(p => p.uid === uid ? { ...p, deployed: !p.deployed } : p);
}

/** Presentation only: slow stop/start patrol, never GPS or walking credit. */
export function petPatrolPoint(base: LatLng, radius: number, uid: string, now: number): LatLng {
  const seed = [...uid].reduce((s, c) => s + c.charCodeAt(0), 0);
  const cycle = now / 6000 + seed;
  const turn = Math.floor(cycle), t = Math.min(1, (cycle - turn) * 1.7);
  const angle = (turn + t) * 1.35 + seed;
  const r = Math.min(radius * 0.6, 26) * (0.65 + (seed % 4) * 0.1);
  return offsetM(base, Math.cos(angle) * r, Math.sin(angle) * r);
}

export interface PetDefenseSave {
  pets?: OwnedPet[]; petDefense?: PetDefense; damage: Record<string, number>;
  depleted: Record<string, number>; storage: Stack[];
}
/** One visible-time exchange against a boundary beast. Shared damage/depletion makes all fighters settle the same kill once. */
export function advancePetDefense<T extends PetDefenseSave>(save: T, base: LatLng, radius: number, nearby: WorldCreature[], now: number, isNight: boolean, random: () => number = Math.random): { state: T; hits: PetHit[] } {
  const pets = (save.pets ?? []).map(p => p.restUntil > 0 && p.restUntil <= now ? { ...p, hp: petStats(p.level).maxHp, restUntil: 0 } : p);
  const defense = save.petDefense ?? emptyPetDefense();
  const daily = defense.day === petDay(now) ? defense : { ...defense, day: petDay(now), claims: 0 };
  let state: T = { ...save, pets, petDefense: daily };
  const hits: PetHit[] = [];
  if (now - defense.lastHitAt < PET_ATTACK_MS) return { state, hits };
  const guards = pets.filter(p => p.deployed && p.restUntil <= now && p.hp > petStats(p.level).maxHp * 0.25);
  const target = nearby.filter(e => {
    const d = creatureDef(e.type), dist = distanceM(base, e);
    return !save.depleted[e.id] && !d.boss && d.atk > 0 && d.temper !== 'passive' && (d.temper === 'aggressive' || (isNight && d.nightAggressive) || (save.damage[e.id] ?? 0) > 0) && dist >= radius + 15 && dist <= radius + 15 + PET_BOUNDARY_REACH_M;
  }).sort((a, b) => distanceM(base, a) - distanceM(base, b))[0];
  if (!target || !guards.length) return { state, hits };
  const damage = { ...save.damage }, depleted = { ...save.depleted };
  let storage = save.storage, claims = daily.claims;
  const logs = [...daily.logs];
  for (const guard of guards) {
    if (depleted[target.id]) break;
    const hit = resolveCreatureHit(target.type, damage[target.id] ?? 0, petStats(guard.level).attack, 3, false);
    hits.push({ at: now, petUid: guard.uid, target, damage: hit.dealt - (damage[target.id] ?? 0), counterDamage: hit.counterDamage, killed: hit.defeated });
    const hp = Math.max(1, guard.hp - hit.counterDamage);
    const resting = hp <= petStats(guard.level).maxHp * 0.25;
    const index = pets.findIndex(p => p.uid === guard.uid);
    pets[index] = { ...guard, hp, restUntil: resting ? now + PET_REST_MS : 0 };
    if (resting) logs.push({ at: now, text: `${guard.name} · 안전 귀환, 60초 휴식` });
    if (hit.defeated) {
      depleted[target.id] = now;
      delete damage[target.id];
      const reward = claims < PET_DAILY_LOOT_CAP ? rollLoot(creatureDef(target.type).loot, random) : [];
      if (claims < PET_DAILY_LOOT_CAP) claims++;
      storage = addStacks(storage, reward);
      logs.push({ at: now, text: `${guard.name} · ${creatureDef(target.type).name} 방어 성공${reward.length ? ' · 창고에 전리품 보관' : claims >= PET_DAILY_LOOT_CAP ? ' · 오늘 전리품 한도' : ''}` });
    } else damage[target.id] = hit.dealt;
  }
  state = { ...state, pets, damage, depleted, storage, petDefense: { ...daily, claims, lastHitAt: now, logs: logs.slice(-12) } };
  return { state, hits };
}
/* ---------- Pet roles ---------- */
export type PetRole = 'guard' | 'hunt' | 'follow' | 'idle';
export const PET_ROLE_LABEL: Record<PetRole, string> = { guard: '거점 지키기', hunt: '사냥 보내기', follow: '따라다니기', idle: '쉬기' };
export const PET_FOLLOW_SLOTS = 2;
export const PET_HUNT_MS = 20 * 60 * 1000;
export const PET_DAILY_AUTO_HUNT_LIMIT = 2;
/** Each following pet adds attack while walking with the player. */
export const PET_FOLLOW_ATK = 2;
export const petRole = (p: OwnedPet): PetRole => p.role ?? (p.deployed ? 'guard' : 'idle');

/** Assign a role; guard and follow have slot limits. `deployed` mirrors guard for existing base defense. */
export function setPetRole(pets: OwnedPet[], uid: string, role: PetRole, now: number, maxGuardSlots: number = PET_GUARD_SLOTS): OwnedPet[] | null {
  const pet = pets.find(p => p.uid === uid);
  if (!pet) return null;
  const others = pets.filter(p => p.uid !== uid);
  if (role === 'guard' && others.filter(p => petRole(p) === 'guard').length >= maxGuardSlots) return null;
  if (role === 'follow' && others.filter(p => petRole(p) === 'follow').length >= PET_FOLLOW_SLOTS) return null;
  return pets.map(p => p.uid === uid ? { ...p, role, deployed: role === 'guard', huntAt: role === 'hunt' ? now : undefined } : p);
}

/**
 * Hunting pets return loot every PET_HUNT_MS, strictly capped at `remainingDailyTrips` (max 2/day).
 * Once the daily auto-hunt limit is reached, hunting pets automatically return to 'idle' at base.
 */
export function settlePetHunts(
  pets: OwnedPet[],
  now: number,
  remainingDailyTrips: number = PET_DAILY_AUTO_HUNT_LIMIT,
  random: () => number = Math.random
): { pets: OwnedPet[]; loot: Stack[]; trips: number; limitReached: boolean } {
  let loot: Stack[] = [];
  let trips = 0;
  let quota = Math.max(0, remainingDailyTrips);

  if (quota <= 0) {
    const recalled = pets.map(p =>
      petRole(p) === 'hunt' ? { ...p, role: 'idle' as PetRole, deployed: false, huntAt: undefined } : p
    );
    return { pets: recalled, loot: [], trips: 0, limitReached: true };
  }

  const progressed = pets.map(p => {
    if (petRole(p) !== 'hunt' || p.restUntil > now) return p;
    if (quota <= 0) return p;
    const since = p.huntAt ?? now;
    const rawTrips = Math.floor((now - since) / PET_HUNT_MS);
    if (rawTrips < 1) return p.huntAt ? p : { ...p, huntAt: now };
    const n = Math.min(quota, rawTrips);
    for (let i = 0; i < n; i++) {
      loot = addStacks(loot, [{ itemId: 'raw_meat', count: 1 + (random() < p.level * 0.15 ? 1 : 0) }]);
      if (random() < 0.5) loot = addStacks(loot, [{ itemId: random() < 0.25 ? 'fur' : 'hide', count: 1 }]);
      if (random() < 0.3 + p.level * 0.05) loot = addStacks(loot, [{ itemId: 'bone', count: 1 }]);
    }
    trips += n;
    quota -= n;
    return { ...p, huntAt: since + n * PET_HUNT_MS };
  });

  const limitReached = quota <= 0;
  const next = limitReached
    ? progressed.map(p =>
        petRole(p) === 'hunt' ? { ...p, role: 'idle' as PetRole, deployed: false, huntAt: undefined } : p
      )
    : progressed;

  return { pets: next, loot, trips, limitReached };
}
