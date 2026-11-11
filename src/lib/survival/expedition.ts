import { distanceM, offsetM } from './geo';
import { nodeDef, creatureDef } from './entities';
import { resolveCreatureHit, rollLoot } from './combat';
import type { LatLng, Stack, WorldEntity } from './types';

export const EXPEDITION_SPEED_MPS = 15;
export const POCKET_MAX_KMH = 20;
export const OUTDOOR_YIELD = 2;
export const OUTDOOR_RARE_MULT = 3;
export const BASE_RELIC_CHANCE = 0.01;
export const EXPEDITION_RADIUS_M = 10;
export const MAX_EXPEDITION_DISTANCE_M = 1500;

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
  focus?: ExpeditionFocus;
  /** Patrol points visited before the destination, so the crew sweeps instead of a straight line. */
  waypoints?: LatLng[];
  /** -1 when last moving west (sprite mirrored), 1 otherwise. */
  facing?: 1 | -1;
  /** Presentation-only record; retains the final strike after the target is removed. */
  combatHit?: { at: number; target: Extract<WorldEntity, { kind: 'creature' }>; damage: number; counterDamage: number; killed: boolean };
}
export interface ExpeditionLog { at: number; text: string }

export type ExpeditionFocus = 'survival' | 'materials' | 'hunt';
export const EXPEDITION_SCAN_M = 30;
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
export function marchToward(pos: LatLng, destination: LatLng, elapsedMs: number): LatLng {
  const distance = distanceM(pos, destination);
  if (distance === 0) return destination;
  const ratio = Math.min(1, EXPEDITION_SPEED_MPS * Math.max(0, elapsedMs) / 1000 / distance);
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
export function advanceExpedition(previous: ObservedExpedition, nearby: WorldEntity[], now: number, outdoor: boolean, repeat: boolean, random: () => number = Math.random, sharedDamage?: Record<string, number>) {
  let crew = { ...previous, lastAt: now };
  const rewards: Stack[] = [];
  let completed: WorldEntity | undefined;
  let text = '';
  let finished = false;
  // No invented offline catches: suspended tabs resume from the last visual position.
  const elapsed = Math.max(0, Math.min(1000, now - previous.lastAt));
  if (crew.target && !nearby.some(e => e.id === crew.target?.id)) crew = { ...crew, target: undefined, damage: 0 };
  if (!crew.target && crew.phase === 'outbound') {
    const target = nearby.find(e => distanceM(crew.pos, e) <= EXPEDITION_RADIUS_M && matchesFocus(e, crew.focus));
    if (target) {
      crew.target = target;
      text = target.kind === 'node' ? `원정대가 ${nodeDef(target.type).name} 발견 · 채집 시작` : `${creatureDef(target.type).name}와 교전 시작! (HP ${crew.hp}/100)`;
    }
  }
  if (crew.target) {
    if (now - crew.hitAt >= (now < crew.moraleUntil ? 500 : 1000)) {
      crew.hitAt = now;
      const target = crew.target;
      const power = (target.kind === 'node' ? 2 : 12) * (outdoor ? 2 : 1) * (now < crew.moraleUntil ? 1.5 : 1);
      if (target.kind === 'creature') {
        crew.damage = sharedDamage?.[target.id] ?? crew.damage;
        const hit = resolveCreatureHit(target.type, crew.damage, power, 3, false);
        crew.combatHit = { at: now, target, damage: hit.dealt - crew.damage, counterDamage: hit.counterDamage, killed: hit.dealt >= creatureDef(target.type).hp };
        crew.damage = hit.dealt;
        crew.hp = Math.max(0, crew.hp - hit.counterDamage);
        text = `${creatureDef(target.type).name} 교전 · HP ${crew.hp}/100`;
      } else {
        crew.damage += power;
        text = `원정대가 ${nodeDef(target.type).name} 채집 중입니다…`;
      }
      if (crew.hp <= 25) {
        crew = { ...crew, phase: 'returning', target: undefined, damage: 0 };
        text = `원정대 위기! HP ${crew.hp}/100 · 안전 귀환 중`;
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
    crew.pos = marchToward(crew.pos, destination, elapsed);
    if (Math.abs(crew.pos.lng - before.lng) > 1e-9) crew.facing = crew.pos.lng < before.lng ? -1 : 1;
    if (spotted) {
      if (!previous.target && distanceM(before, spotted) > EXPEDITION_RADIUS_M && !text) text = `${FOCUS_LABEL[crew.focus ?? 'materials']} 단서 포착 · ${spotted.kind === 'node' ? nodeDef(spotted.type).name : creatureDef(spotted.type).name} 쪽으로 이동`;
    } else if (waypoint && distanceM(crew.pos, waypoint) < 1) {
      crew.waypoints = crew.waypoints?.slice(1);
    } else if (!waypoint && distanceM(crew.pos, destination) < 1) {
      if (crew.phase === 'outbound') { crew.phase = 'returning'; text = '목표 타일 도착 · 거점으로 귀환합니다'; }
      else if (repeat) {
        const next = offsetM(crew.home, Math.cos(crew.cycle * 2.4) * 180, Math.sin(crew.cycle * 2.4) * 180);
        crew = { ...crew, hp: 100, phase: 'outbound', cycle: crew.cycle + 1, destination: next, waypoints: patrolWaypoints(crew.home, next, crew.cycle + 1) };
        text = '거점 회복 완료 · 다음 자동사냥 출발';
      } else { finished = true; text = '원정대가 거점에 귀환했습니다'; }
    }
  }
  return { crew, rewards, completed, text, finished };
}