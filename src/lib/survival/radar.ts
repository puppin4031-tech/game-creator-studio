import { distanceM, fromGrid, hash01, offsetM, toGrid } from './geo';
import { BOSS_TYPES, CREATURES, NODES, creatureDef, nodeDef } from './entities';
import { creatureEpoch } from './world';
import { eggSpawnsNear } from './dinoEggs';
import type { LatLng, WorldEntity } from './types';

export const MAX_FAVORITE_SPOTS = 5;
export const RADAR_SCAN_RADIUS_M = 1000;

export type RadarFilterKind = 'ore' | 'egg' | 'boss';

export interface RadarPin {
  id: string;
  kind: 'ore' | 'egg' | 'boss';
  label: string;
  lat: number;
  lng: number;
  discoveredAt: number;
}

export interface RadarHotspot {
  id: string;
  kind: RadarFilterKind;
  name: string;
  lat: number;
  lng: number;
  /** Heatmap circle radius in meters */
  radiusM: number;
  /** Estimated spawn/density probability (0..100) */
  probabilityPct: number;
  distanceM: number;
}

export interface ExpeditionLevelInfo {
  level: 1 | 2 | 3 | 4 | 5;
  xp: number;
  nextXp: number;
  title: string;
  perks: { level: number; text: string; unlocked: boolean }[];
}

const RARE_ORE_TYPES = new Set([
  'flint_rock',
  'hematite_rock',
  'quartz_vein',
  'obsidian_rock',
  'jade_rock',
  'copper_vein',
  'tin_vein',
  'silver_vein',
  'gold_deposit',
  'magnetite_rock',
  'coal_seam',
  'limestone_rock',
  'sulfur_vent',
  'mercury_deposit',
  'meteor_impact',
]);

export function isRareOreNode(type: string): boolean {
  return RARE_ORE_TYPES.has(type);
}

/**
 * Computes expedition level (Lv.1 ~ Lv.5) from cumulative expedition dispatches
 * and cumulative distance traveled (in meters).
 */
export function computeExpeditionLevel(
  expeditionCount = 0,
  totalDistanceM = 0
): ExpeditionLevelInfo {
  const xp = Math.max(0, Math.floor(expeditionCount * 45 + totalDistanceM / 20));
  const thresholds = [0, 80, 220, 450, 800];
  let level: 1 | 2 | 3 | 4 | 5 = 1;
  if (xp >= thresholds[4]) level = 5;
  else if (xp >= thresholds[3]) level = 4;
  else if (xp >= thresholds[2]) level = 3;
  else if (xp >= thresholds[1]) level = 2;

  const nextXp = level < 5 ? thresholds[level] : thresholds[4];
  const titles: Record<1 | 2 | 3 | 4 | 5, string> = {
    1: '초보 정찰대',
    2: '광맥·알 추적대',
    3: '우두머리 수색대',
    4: '고대 유적 탐사단',
    5: '전설의 개척 원정대',
  };

  const perks = [
    {
      level: 1,
      text: 'Lv.1: 기본 주변 채집 및 관찰 자동사냥',
      unlocked: level >= 1,
    },
    {
      level: 2,
      text: "Lv.2: 원정 중 '희귀 광맥 / 공룡 알' 발견 시 지도 위 반짝이는 핀 마커 자동 표시",
      unlocked: level >= 2,
    },
    {
      level: 3,
      text: "Lv.3: 주변 반경 1km 내 '우두머리(보스 공룡)' 출현 구역 레이더 포착 및 지도 표시",
      unlocked: level >= 3,
    },
    {
      level: 4,
      text: 'Lv.4: 레이더 정밀 스캔 반경 확장 및 희귀 광맥 탐지 수 증가',
      unlocked: level >= 4,
    },
    {
      level: 5,
      text: 'Lv.5: 반경 1km 전 구역 마스터 레이더 포착 및 원정 정찰 효율 극대화',
      unlocked: level >= 5,
    },
  ];

  return {
    level,
    xp,
    nextXp,
    title: titles[level],
    perks,
  };
}

/**
 * Checks entities near the expedition crew and returns newly discovered sparkling pins
 * (Lv.2+: rare ore veins & dino eggs; Lv.3+: boss dinosaurs).
 */
export function detectExpeditionPins(
  crewPos: LatLng,
  nearby: WorldEntity[],
  depleted: Record<string, number>,
  now: number,
  expeditionLevel: number,
  existingPins: RadarPin[] = []
): RadarPin[] {
  if (expeditionLevel < 2) return existingPins;
  const map = new Map(existingPins.map(p => [p.id, p]));

  for (const e of nearby) {
    if (e.kind === 'node' && isRareOreNode(e.type) && distanceM(crewPos, e) <= 35) {
      const id = `pin-ore-${e.id}`;
      if (!map.has(id)) {
        map.set(id, {
          id,
          kind: 'ore',
          label: `💎 ${nodeDef(e.type).name}`,
          lat: e.lat,
          lng: e.lng,
          discoveredAt: now,
        });
      }
    }
    if (
      expeditionLevel >= 3 &&
      e.kind === 'creature' &&
      creatureDef(e.type).boss &&
      distanceM(crewPos, e) <= RADAR_SCAN_RADIUS_M
    ) {
      const id = `pin-boss-${e.id}`;
      if (!map.has(id)) {
        map.set(id, {
          id,
          kind: 'boss',
          label: `🦖 ${creatureDef(e.type).name}`,
          lat: e.lat,
          lng: e.lng,
          discoveredAt: now,
        });
      }
    }
  }

  // Also check nearby dino eggs within 45m of the crew
  const eggs = eggSpawnsNear(crewPos, depleted, now);
  for (const egg of eggs) {
    if (distanceM(crewPos, egg) <= 45) {
      const id = `pin-egg-${egg.id}`;
      if (!map.has(id)) {
        map.set(id, {
          id,
          kind: 'egg',
          label: '🥚 신비한 공룡 알',
          lat: egg.lat,
          lng: egg.lng,
          discoveredAt: now,
        });
      }
    }
  }

  return [...map.values()].slice(-24);
}

/**
 * Generates deterministic heatmap zones (ore, egg, boss) within 1km of center,
 * scaling precision and count by expeditionLevel (Lv.1 ~ Lv.5).
 */
export function scanRadarHotspots(
  center: LatLng,
  expeditionLevel: number,
  now: number,
  depleted: Record<string, number> = {}
): RadarHotspot[] {
  const out: RadarHotspot[] = [];
  const { x, y } = toGrid(center);
  const epoch = creatureEpoch(now);
  const maxSpotsPerKind = Math.min(6, 2 + expeditionLevel);

  // 1. Rare Mineral Veins (💎 희귀 광물 밀집지)
  const oreCandidates: RadarHotspot[] = [];
  const cellM = 180;
  const cx0 = Math.floor((x - RADAR_SCAN_RADIUS_M) / cellM);
  const cx1 = Math.floor((x + RADAR_SCAN_RADIUS_M) / cellM);
  const cy0 = Math.floor((y - RADAR_SCAN_RADIUS_M) / cellM);
  const cy1 = Math.floor((y + RADAR_SCAN_RADIUS_M) / cellM);

  const oreNames = ['흑요석 광맥 지대', '비취·석영 밀집지', '고대 부싯돌 단층', '적철석 노두 구역'];
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cy = cy0; cy <= cy1; cy++) {
      const h = hash01(cx, cy, 41);
      if (h < 0.62) continue;
      const gx = (cx + 0.2 + hash01(cx, cy, 42) * 0.6) * cellM;
      const gy = (cy + 0.2 + hash01(cx, cy, 43) * 0.6) * cellM;
      const pos = fromGrid(gx, gy);
      const dist = Math.round(distanceM(center, pos));
      if (dist < 40 || dist > RADAR_SCAN_RADIUS_M) continue;
      const prob = Math.min(96, Math.round(58 + h * 35 + expeditionLevel * 2));
      const idx = Math.floor(hash01(cx, cy, 44) * oreNames.length) % oreNames.length;
      oreCandidates.push({
        id: `radar-ore:${cx}:${cy}`,
        kind: 'ore',
        name: oreNames[idx],
        lat: pos.lat,
        lng: pos.lng,
        radiusM: Math.max(45, 95 - expeditionLevel * 8),
        probabilityPct: prob,
        distanceM: dist,
      });
    }
  }
  oreCandidates.sort((a, b) => b.probabilityPct - a.probabilityPct || a.distanceM - b.distanceM);
  out.push(...oreCandidates.slice(0, maxSpotsPerKind));

  // 2. Dino Egg Spots (🥚 공룡 알 스팟)
  const realEggs = eggSpawnsNear(center, depleted, now);
  const eggSpots: RadarHotspot[] = realEggs.slice(0, maxSpotsPerKind).map((e, i) => ({
    id: `radar-egg:${e.id}`,
    kind: 'egg',
    name: `공룡 둥지 추정지 #${i + 1}`,
    lat: e.lat,
    lng: e.lng,
    radiusM: Math.max(35, 80 - expeditionLevel * 7),
    probabilityPct: Math.min(95, 70 + expeditionLevel * 5),
    distanceM: Math.round(distanceM(center, e)),
  }));
  // Supplement up to maxSpotsPerKind within 1km if needed
  for (let i = eggSpots.length; i < maxSpotsPerKind; i++) {
    const angle = (i * 2.1 + 0.7) % (Math.PI * 2);
    const dist = 220 + i * 135;
    const pos = offsetM(center, Math.cos(angle) * dist, Math.sin(angle) * dist);
    eggSpots.push({
      id: `radar-egg-est:${i}`,
      kind: 'egg',
      name: `고대 공룡 알 산란지 #${i + 1}`,
      lat: pos.lat,
      lng: pos.lng,
      radiusM: Math.max(40, 85 - expeditionLevel * 7),
      probabilityPct: Math.min(92, 64 + expeditionLevel * 5),
      distanceM: dist,
    });
  }
  out.push(...eggSpots);

  // 3. Boss Dinosaur Zones within 1km (🦖 우두머리 출몰 구역)
  const bossCount = expeditionLevel >= 3 ? Math.min(4, expeditionLevel - 1) : 2;
  for (let i = 0; i < bossCount; i++) {
    const bossType = BOSS_TYPES[(epoch + i) % BOSS_TYPES.length];
    const bossDef = CREATURES[bossType];
    const angle = ((epoch * 0.9 + i * 1.85) % (Math.PI * 2));
    const dist = 260 + i * 210;
    const pos = offsetM(center, Math.cos(angle) * dist, Math.sin(angle) * dist);
    out.push({
      id: `radar-boss:${epoch}:${i}`,
      kind: 'boss',
      name: `${bossDef.name} 출몰 구역`,
      lat: pos.lat,
      lng: pos.lng,
      radiusM: Math.max(65, 130 - expeditionLevel * 10),
      probabilityPct: expeditionLevel >= 3 ? Math.min(95, 72 + expeditionLevel * 4) : 45,
      distanceM: dist,
    });
  }

  return out;
}
