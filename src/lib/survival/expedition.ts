import { distanceM, offsetM } from './geo';
import { nodeDef, creatureDef } from './entities';
import { resolveCreatureHit, rollLoot } from './combat';
import type { ItemId } from './items';
import type { LatLng, Stack, WorldEntity } from './types';
import { getTribeClass, type TribeClassId } from '../../data/tribeClasses';

export const EXPEDITION_SPEED_MPS = 15;
export const POCKET_MAX_KMH = 20;
export const OUTDOOR_YIELD = 2;
export const OUTDOOR_RARE_MULT = 3;
export const BASE_RELIC_CHANCE = 0.01;
export const EXPEDITION_RADIUS_M = 10;
export const MAX_EXPEDITION_DISTANCE_M = 1500;

/** Daily maximum auto-expedition active time: 6 hours (21,600 seconds). Resets at 00:00 midnight. */
export const DAILY_EXPEDITION_AUTO_LIMIT_SEC = 6 * 3600;

/** Tribe members earn 30% of standard XP when gathering or hunting on expeditions. */
export const TRIBE_XP_RATIO = 0.3;

/** Today's local date key (YYYY-MM-DD) for daily limit tracking. */
export const getTodayKey = (now: number = Date.now()): string => {
  const d = new Date(now);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface ObservedExpedition {
  pos: LatLng;
  destination: LatLng;
  home: LatLng;
  hp: number;
  phase: 'outbound' | 'returning';
  lastAt: number;
  hitAt: number;
  moraleUntil: number;
  moraleReadyAt: number;
  target?: WorldEntity;
  damage: number;
  cycle: number;
  /** Hired mercenary name; presentation only. */
  mercenary?: string;
  /** Selected specialized tribe class (tank, gatherer, ranged, assassin). */
  tribeClass?: TribeClassId;
  /** Tribe member stat ratio (1/6); 1 for the player's own expedition. */
  statMult?: number;
  maxHp?: number;
  /** Tribe members on this expedition: HP pools, strikes chain and gathering scales per member. */
  members?: number;
  /** True when HP hit 0 and the crew was carried home injured. */
  downed?: boolean;
  /** Joystick control: no auto targeting/patrol; crew walks to a dragged target, then strikes. */
  manual?: boolean;
  focus?: ExpeditionFocus;
  /** Patrol points visited before the destination, so the crew sweeps instead of a straight line. */
  waypoints?: LatLng[];
  /** -1 when last moving west (sprite mirrored), 1 otherwise. */
  facing?: 1 | -1;
  /** Presentation-only record; retains the final strike after the target is removed. */
  combatHit?: { at: number; target: Extract<WorldEntity, { kind: 'creature' }>; damage: number; counterDamage: number; killed: boolean; dodged?: boolean; crit?: boolean; ranged?: boolean };
}
export interface ExpeditionLog { at: number; text: string }

export type ExpeditionFocus = 'survival' | 'materials' | 'hunt';
export const EXPEDITION_SCAN_M = 30;
/** Chance a crew sidesteps a beast's counter-attack. */
export const EXPEDITION_DODGE_CHANCE = 0.2;
const SURVIVAL_NODES = new Set(['berry_bush', 'apple_tree', 'pear_tree', 'herb_patch']);
export const FOCUS_LABEL: Record<ExpeditionFocus, string> = { survival: '생존필수품', materials: '재료', hunt: '사냥' };

/** Whether an entity matches the expedition focus (and is level-one workable). */
export function matchesFocus(e: WorldEntity, focus: ExpeditionFocus = 'materials') {
  if (e.kind === 'creature') return focus === 'hunt' && !creatureDef(e.type).boss;
  if (nodeDef(e.type).requires.tier > 1) return false;
  if (focus === 'hunt') return false;
  return focus === 'survival' ? SURVIVAL_NODES.has(e.type) : !SURVIVAL_NODES.has(e.type);
}
/** Two zig-zag patrol points between home and destination. */
export function patrolWaypoints(home: LatLng, destination: LatLng, cycle = 0): LatLng[] {
  const side = cycle % 2 ? -1 : 1;
  return [1 / 3, 2 / 3].map((t, i) => {
    const p = { lat: home.lat + (destination.lat - home.lat) * t, lng: home.lng + (destination.lng - home.lng) * t };
    const s = (i % 2 ? -1 : 1) * side * 45;
    return offsetM(p, s, -s);
  });
}

/** Outdoor bonuses require fresh, non-stationary accepted GPS movement, not camera/crew motion. */
export function isPocketMovement(distance: number, elapsedMs: number) {
  return distance >= 2 && elapsedMs > 0 && elapsedMs <= 15_000 && distance / (elapsedMs / 1000) * 3.6 <= POCKET_MAX_KMH;
}
export function startObservedExpedition(home: LatLng, destination: LatLng, now: number, focus: ExpeditionFocus = 'materials'): ObservedExpedition | null {
  if (!Number.isFinite(destination.lat) || !Number.isFinite(destination.lng) || Math.abs(destination.lat) > 85 || Math.abs(destination.lng) > 180) return null;
  const distance = distanceM(home, destination);
  if (distance < 10 || distance > MAX_EXPEDITION_DISTANCE_M) return null;
  return { home, destination, pos: home, hp: 100, phase: 'outbound', lastAt: now, hitAt: 0, moraleUntil: 0, moraleReadyAt: 0, damage: 0, cycle: 0, focus, waypoints: patrolWaypoints(home, destination), facing: 1 };
}
export function marchToward(pos: LatLng, destination: LatLng, elapsedMs: number, speedMult = 1): LatLng {
  const distance = distanceM(pos, destination);
  if (distance === 0) return destination;
  const ratio = Math.min(1, EXPEDITION_SPEED_MPS * speedMult * Math.max(0, elapsedMs) / 1000 / distance);
  return { lat: pos.lat + (destination.lat - pos.lat) * ratio, lng: pos.lng + (destination.lng - pos.lng) * ratio };
}
export function expeditionLoot(entity: WorldEntity, outdoor: boolean, random: () => number = Math.random): Stack[] {
  const def = entity.kind === 'node' ? nodeDef(entity.type) : creatureDef(entity.type);
  const loot = rollLoot(def.loot.map(entry => ({ ...entry, chance: entry.chance === undefined ? undefined : Math.min(1, entry.chance * (outdoor ? OUTDOOR_RARE_MULT : 1)) })), random)
    .map(stack => ({ ...stack, count: stack.count * (outdoor ? OUTDOOR_YIELD : 1) }));
  if (random() < BASE_RELIC_CHANCE * (outdoor ? OUTDOOR_RARE_MULT : 1)) loot.push({ itemId: 'ancient_fang', count: 1 });
  return loot;
}

/** Uses shared combat and geographic entities; does not move the player or grant walking distance. */
/** Auto patrol priority: repel ambushing beasts, then focus matches, then any workable node nearby. */
export function autoPatrolTarget(crew: ObservedExpedition, nearby: WorldEntity[]): WorldEntity | undefined {
  const cls = crew.tribeClass ? getTribeClass(crew.tribeClass) : null;
  const aggroRange = cls ? Math.max(EXPEDITION_RADIUS_M, cls.aggroRadiusM) : EXPEDITION_RADIUS_M;
  const reachRange = cls ? Math.max(EXPEDITION_RADIUS_M, cls.attackRangeM) : EXPEDITION_RADIUS_M;
  const sorted = [...nearby].sort((a, b) => distanceM(crew.pos, a) - distanceM(crew.pos, b));
  const close = sorted.filter(e => distanceM(crew.pos, e) <= EXPEDITION_RADIUS_M);
  const aggroBeast = sorted.find(e => e.kind === 'creature' && !creatureDef(e.type).boss && creatureDef(e.type).temper === 'aggressive' && distanceM(crew.pos, e) <= aggroRange);
  if (aggroBeast) return aggroBeast;
  if (cls?.id === 'ranged' && crew.focus === 'hunt') {
    const rangedTarget = sorted.find(e => e.kind === 'creature' && !creatureDef(e.type).boss && distanceM(crew.pos, e) <= reachRange);
    if (rangedTarget) return rangedTarget;
  }
  return close.find(e => matchesFocus(e, crew.focus))
    ?? close.find(e => e.kind === 'node' && (matchesFocus(e, 'survival') || matchesFocus(e, 'materials')));
}
export function advanceExpedition(previous: ObservedExpedition, nearby: WorldEntity[], now: number, outdoor: boolean, repeat: boolean, random: () => number = Math.random, sharedDamage?: Record<string, number>) {
  let crew = { ...previous, lastAt: now };
  const cls = crew.tribeClass ? getTribeClass(crew.tribeClass) : null;
  const speedMult = cls ? cls.speedMult : 1;
  const rewards: Stack[] = [];
  let completed: WorldEntity | undefined;
  let text = '';
  let finished = false;
  // No invented offline catches: suspended tabs resume from the last visual position.
  const elapsed = Math.max(0, Math.min(1000, now - previous.lastAt));
  if (crew.target && !nearby.some(e => e.id === crew.target?.id)) crew = { ...crew, target: undefined, damage: 0 };
  if (!crew.target && crew.phase === 'outbound') {
    const target = autoPatrolTarget(crew, nearby);
    if (target) {
      crew.target = target;
      text = target.kind === 'node' ? `원정대가 ${nodeDef(target.type).name} 발견 · 채집 시작` : `${creatureDef(target.type).name}와 교전 시작! (HP ${crew.hp}/${crew.maxHp ?? 100})`;
    }
  }
  const activeReachM = crew.target?.kind === 'creature' && cls ? Math.max(EXPEDITION_RADIUS_M, cls.attackRangeM) : EXPEDITION_RADIUS_M;
  if (crew.manual && (!crew.target || distanceM(crew.pos, crew.target) > activeReachM)) {
    if (crew.target) {
      const before = crew.pos;
      crew.pos = marchToward(crew.pos, crew.target, elapsed, speedMult);
      if (Math.abs(crew.pos.lng - before.lng) > 1e-9) crew.facing = crew.pos.lng < before.lng ? -1 : 1;
    }
    return { crew, rewards, completed, text, finished };
  }
  if (crew.target) {
    const intervalMs = Math.round((now < crew.moraleUntil ? 500 : 1000) * (cls ? cls.attackIntervalMult : 1));
    if (now - crew.hitAt >= intervalMs) {
      crew.hitAt = now;
      const target = crew.target;
      const max = crew.maxHp ?? 100;
      const roleMult = cls ? (target.kind === 'node' ? cls.gatherMult : cls.atkMult) : 1;
      const isCrit = !!(cls && target.kind === 'creature' && cls.critChance > 0 && random() < cls.critChance);
      const critMult = isCrit && cls ? cls.critMult : 1;
      const power = (crew.statMult ?? 1) * (target.kind === 'node' ? 2 : 12) * roleMult * critMult * (outdoor ? 2 : 1) * (now < crew.moraleUntil ? 1.5 : 1);
      if (target.kind === 'creature') {
        crew.damage = sharedDamage?.[target.id] ?? crew.damage;
        const members = Math.max(1, crew.members ?? 1);
        const def = 3 + (cls ? cls.defBonus : 0);
        const isRangedOpening = !!(cls?.firstStrikeSafe && (crew.damage === 0 || distanceM(crew.pos, target) > EXPEDITION_RADIUS_M));
        let hit = resolveCreatureHit(target.type, crew.damage, power, def, isRangedOpening);
        // Each extra member lands a follow-up strike; the beast retaliates once per exchange.
        for (let i = 1; i < members && hit.dealt < creatureDef(target.type).hp; i++) {
          const next = resolveCreatureHit(target.type, hit.dealt, power, def, isRangedOpening);
          hit = { ...next, counterDamage: hit.counterDamage };
        }
        const dodged = hit.counterDamage > 0 && ((Math.floor(now / 1000) * 2654435761) >>> 0) % 1000 < EXPEDITION_DODGE_CHANCE * 1000;
        const rawCounter = dodged ? 0 : hit.counterDamage;
        const counter = cls && rawCounter > 0 ? Math.max(0, Math.floor(rawCounter * cls.counterDamageMult)) : rawCounter;
        crew.combatHit = { at: now, target, damage: hit.dealt - crew.damage, counterDamage: counter, killed: hit.dealt >= creatureDef(target.type).hp, dodged, crit: isCrit, ranged: isRangedOpening };
        crew.damage = hit.dealt;
        crew.hp = Math.max(0, crew.hp - counter);
        text = `${creatureDef(target.type).name} ${isRangedOpening ? '원거리 사격' : isCrit ? '치명타 연타' : '교전'} · HP ${crew.hp}/${max}`;
      } else {
        crew.damage += power * Math.max(1, crew.members ?? 1);
        text = `원정대가 ${nodeDef(target.type).name} 채집 중입니다…`;
      }
      if (crew.hp <= 0) {
        crew = { ...crew, target: undefined, damage: 0, downed: true, pos: crew.home };
        finished = true;
        text = '쓰러졌습니다! 긴급 후송 · 거점에서 치료가 필요해요';
      } else if (crew.hp <= max * 0.25) {
        crew = { ...crew, phase: 'returning', target: undefined, damage: 0 };
        text = `원정대 위기! HP ${crew.hp}/${max} · 안전 귀환 중`;
      } else if (crew.damage >= (target.kind === 'node' ? nodeDef(target.type).hp : creatureDef(target.type).hp)) {
        completed = target;
        rewards.push(...expeditionLoot(target, outdoor, random));
        crew = { ...crew, target: undefined, damage: 0 };
        text = `원정대 ${target.kind === 'node' ? '채집' : '사냥'} 완료${outdoor ? ' · 친정 보상 2배' : ''}`;
      }
    }
  } else {
    const waypoint = crew.phase === 'outbound' ? crew.waypoints?.[0] : undefined;
    // Detour toward the closest focus match spotted within scan range.
    const spotted = crew.phase === 'outbound' ? nearby
      .filter(e => matchesFocus(e, crew.focus) && distanceM(crew.pos, e) <= EXPEDITION_SCAN_M)
      .sort((a, b) => distanceM(crew.pos, a) - distanceM(crew.pos, b))[0] : undefined;
    const destination = spotted ?? waypoint ?? (crew.phase === 'returning' ? crew.home : crew.destination);
    const before = crew.pos;
    crew.pos = marchToward(crew.pos, destination, elapsed, speedMult);
    if (Math.abs(crew.pos.lng - before.lng) > 1e-9) crew.facing = crew.pos.lng < before.lng ? -1 : 1;
    // Gatherer class auto-sweeps nearby wood/ore/fruit nodes within autoGatherRadiusM while marching.
    if (cls && cls.autoGatherRadiusM > 0) {
      const autoNode = nearby.find((e): e is Extract<WorldEntity, { kind: 'node' }> => e.kind === 'node' && nodeDef(e.type).requires.tier <= 1 && distanceM(crew.pos, e) <= cls.autoGatherRadiusM);
      if (autoNode && !completed) {
        completed = autoNode;
        rewards.push(...expeditionLoot(autoNode, outdoor, random));
        text = `파밍 부족 경로 자동 수거 · ${nodeDef(autoNode.type).name}`;
      }
    }
    if (spotted) {
      if (!previous.target && distanceM(before, spotted) > EXPEDITION_RADIUS_M && !text) text = `${FOCUS_LABEL[crew.focus ?? 'materials']} 단서 포착 · ${spotted.kind === 'node' ? nodeDef(spotted.type).name : creatureDef(spotted.type).name} 쪽으로 이동`;
    } else if (waypoint && distanceM(crew.pos, waypoint) < 1) {
      crew.waypoints = crew.waypoints?.slice(1);
    } else if (!waypoint && distanceM(crew.pos, destination) < 1) {
      if (crew.phase === 'outbound') { crew.phase = 'returning'; text = '목표 타일 도착 · 거점으로 귀환합니다'; }
      else if (repeat) {
        const next = offsetM(crew.home, Math.cos(crew.cycle * 2.4) * 180, Math.sin(crew.cycle * 2.4) * 180);
        crew = { ...crew, hp: crew.maxHp ?? 100, phase: 'outbound', cycle: crew.cycle + 1, destination: next, waypoints: patrolWaypoints(crew.home, next, crew.cycle + 1) };
        text = '거점 회복 완료 · 다음 자동사냥 출발';
      } else { finished = true; text = '원정대가 거점에 귀환했습니다'; }
    }
  }
  return { crew, rewards, completed, text, finished };
}
export const MANUAL_STEP_M = 2;
export const MANUAL_PICK_M = 60;
/** Joystick step (unit vector x=east, y=north); moving cancels the current action and keeps the crew near home. */
export function steerExpedition(crew: ObservedExpedition, x: number, y: number, stepM = MANUAL_STEP_M): ObservedExpedition {
  const len = Math.hypot(x, y);
  if (!len) return crew;
  let pos = offsetM(crew.pos, (x / len) * stepM, (y / len) * stepM);
  if (distanceM(crew.home, pos) > MAX_EXPEDITION_DISTANCE_M) pos = crew.pos;
  return { ...crew, manual: true, pos, target: undefined, damage: 0, facing: x < 0 ? -1 : x > 0 ? 1 : crew.facing };
}
/** Dragged attack/gather icon: pick the nearest matching entity; attack needs a creature, gather a level-one node. */
export function pickManualTarget(crew: ObservedExpedition, candidates: WorldEntity[], action: 'attack' | 'gather'): WorldEntity | undefined {
  return candidates
    .filter(e => action === 'attack' ? e.kind === 'creature' && !creatureDef(e.type).boss : e.kind === 'node' && nodeDef(e.type).requires.tier <= 1)
    .filter(e => distanceM(crew.pos, e) <= MANUAL_PICK_M)
    .sort((a, b) => distanceM(crew.pos, a) - distanceM(crew.pos, b))[0];
}

/** Storage foods the expedition heal button can eat, in priority order. */
export const CREW_HEAL_FOODS: ItemId[] = ['berry', 'raw_meat', 'apple', 'pear', 'coconut', 'jerky', 'cooked_meat'];
/** Low-value foods restore only 10% and are eaten first so better food is saved. */
export const CREW_HEAL_TENTH_FOODS: ItemId[] = ['berry', 'raw_meat'];
/** Cooked meat and jerky refill the crew completely; fruit from apple down restores 30%. */
export const CREW_HEAL_FULL_FOODS: ItemId[] = ['cooked_meat', 'jerky'];

export function crewHealGain(itemId: ItemId, maxHp: number): number {
  const ratio = CREW_HEAL_FULL_FOODS.includes(itemId) ? 1 : CREW_HEAL_TENTH_FOODS.includes(itemId) ? 0.1 : 0.3;
  return Math.max(1, Math.round(maxHp * ratio));
}
