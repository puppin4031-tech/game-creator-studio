import type { LatLng } from '@/lib/survival/types';
import { distanceM } from '@/lib/survival/geo';

export type MapPropType = 'palm_tree' | 'jungle_tree' | 'bush' | 'grass_tuft' | 'mossy_rock';

export interface MapDecorativeProp {
  id: string;
  gridX: number;
  gridY: number;
  type: MapPropType;
  pos: LatLng;
  scale: number;
  flip: boolean;
  variant: number;
}

/**
 * Fast deterministic 32-bit hash function for integer pairs.
 * Same coordinate always returns the exact same number permanently.
 */
export function hashCoordinate(x: number, y: number, seed = 0x5e3d): number {
  let h = (x * 374761393 + y * 668265263 + seed) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Generates a decorative prop for a single ~20m grid cell if it meets spawn chance.
 * Grid definition: gridX = Math.floor(lat * 5000), gridY = Math.floor(lng * 5000)
 */
export function getCellProp(gridX: number, gridY: number): MapDecorativeProp | null {
  // 1. Check ~35% spawn probability
  const spawnRoll = (hashCoordinate(gridX, gridY, 101) % 1000) / 1000;
  if (spawnRoll >= 0.35) {
    return null;
  }

  // 2. Deterministic sub-cell jitter (15% ~ 85% within the cell so props scatter naturally)
  const jitterLat = ((hashCoordinate(gridX, gridY, 202) % 1000) / 1000) * 0.7 + 0.15;
  const jitterLng = ((hashCoordinate(gridX, gridY, 303) % 1000) / 1000) * 0.7 + 0.15;

  const lat = (gridX + jitterLat) / 5000;
  const lng = (gridY + jitterLng) / 5000;

  // 3. Prop variety distribution
  const typeRoll = hashCoordinate(gridX, gridY, 404) % 100;
  let type: MapPropType;
  if (typeRoll < 26) {
    type = 'jungle_tree'; // 26%
  } else if (typeRoll < 48) {
    type = 'palm_tree'; // 22%
  } else if (typeRoll < 72) {
    type = 'bush'; // 24%
  } else if (typeRoll < 86) {
    type = 'grass_tuft'; // 14%
  } else {
    type = 'mossy_rock'; // 14%
  }

  // 4. Subtle scale jitter (0.85 ~ 1.15) and horizontal flip for variety
  const scale = 0.85 + ((hashCoordinate(gridX, gridY, 505) % 100) / 100) * 0.3;
  const flip = (hashCoordinate(gridX, gridY, 606) % 2) === 1;
  const variant = hashCoordinate(gridX, gridY, 707) % 3;

  return {
    id: `prop-${gridX}-${gridY}`,
    gridX,
    gridY,
    type,
    pos: { lat, lng },
    scale,
    flip,
    variant,
  };
}

// In-memory cache keyed by `${centerGridX}_${centerGridY}_${baseKey}` to prevent re-allocating on micro-pans
let cachedKey = '';
let cachedProps: MapDecorativeProp[] = [];

/**
 * Computes deterministic decorative props within radiusM of center.
 * Excludes props within 18m of the player's base.
 * Caps at maxProps (default: 35) to safeguard mobile memory and render loops.
 */
export function getNearbyDecorativeProps(
  center: LatLng,
  basePos?: LatLng | null,
  radiusM = 150,
  maxProps = 35
): MapDecorativeProp[] {
  const centerGridX = Math.floor(center.lat * 5000);
  const centerGridY = Math.floor(center.lng * 5000);
  const baseKey = basePos ? `${basePos.lat.toFixed(4)}_${basePos.lng.toFixed(4)}` : 'nobase';
  const currentKey = `${centerGridX}_${centerGridY}_${baseKey}_${radiusM}_${maxProps}`;

  if (currentKey === cachedKey) {
    return cachedProps;
  }

  // Calculate cell search extent
  // 1 deg lat ~ 111,320m -> 1 cell lat = 111320 / 5000 ~ 22.26m
  // 1 deg lng at 37.5 deg ~ 88,315m -> 1 cell lng = 88315 / 5000 ~ 17.66m
  const spanX = Math.ceil(radiusM / 22.26);
  const spanY = Math.ceil(radiusM / 17.66);

  const candidates: { prop: MapDecorativeProp; dist: number }[] = [];

  for (let dx = -spanX; dx <= spanX; dx++) {
    for (let dy = -spanY; dy <= spanY; dy++) {
      const gx = centerGridX + dx;
      const gy = centerGridY + dy;
      const prop = getCellProp(gx, gy);
      if (!prop) continue;

      // Check distance from current center
      const dist = distanceM(center, prop.pos);
      if (dist > radiusM) continue;

      // Strict Base Exclusion: Exclude anything within 18m of player's campfire/base
      if (basePos && distanceM(basePos, prop.pos) < 18) {
        continue;
      }

      candidates.push({ prop, dist });
    }
  }

  // Sort by distance from center so closest foliage renders first
  candidates.sort((a, b) => a.dist - b.dist);

  const result = candidates.slice(0, maxProps).map(c => c.prop);
  cachedKey = currentKey;
  cachedProps = result;

  return result;
}
