import type { LatLng } from '@/lib/survival/types';
import { distanceM } from '@/lib/survival/geo';

/**
 * Computes 2.5D RPG ground-anchored z-index based on latitude relative to map center.
 * South (lower latitude / closer to screen bottom) has higher z-index (rendered in front).
 * North (higher latitude / closer to screen top) has lower z-index (rendered behind).
 * Clamped strictly between 10 and 900.
 */
export function computeEntityZIndex(entityLat: number, centerLat: number): number {
  return Math.max(10, Math.min(900, 500 + Math.round((centerLat - entityLat) * 100000)));
}

/**
 * Checks if a target (e.g. player) is occluded by a tree's canopy.
 * A tree canopy extends North (-Y in screen space) and horizontally around its base trunk.
 * When target is behind the tree trunk (targetLat >= treeLat - 2m) within canopy radius,
 * the tree should fade to semi-transparent so the player remains clearly visible.
 */
export function isOccludedByCanopy(
  targetPos: LatLng | null | undefined,
  treePos: LatLng,
  maxOcclusionRadiusM = 16
): boolean {
  if (!targetPos) return false;
  const dist = distanceM(targetPos, treePos);
  if (dist > maxOcclusionRadiusM) return false;

  // 1 deg lat is ~111km, so 2m ~ 0.000018 deg
  // Target is occluded if it stands anywhere from 2m in front of trunk to behind the canopy
  const latDiff = targetPos.lat - treePos.lat;
  return latDiff >= -0.00002;
}
