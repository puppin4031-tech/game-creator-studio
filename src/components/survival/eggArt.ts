import earth from '@/assets/survival/dinos/earth-egg.png.asset.json';
import lightning from '@/assets/survival/dinos/lightning-egg.png.asset.json';
import water from '@/assets/survival/dinos/water-egg.png.asset.json';
import fire from '@/assets/survival/dinos/fire-egg.png.asset.json';

export const EGG_ARTS = [earth.url, lightning.url, water.url, fire.url];
/** A visual-only seeded pick stays consistent across screens and reloads. */
export function eggArt(id: string): string {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash ^= hash >>> 16;
  return EGG_ARTS[(hash >>> 0) % EGG_ARTS.length];
}