import type { LatLng } from './types';

export type WorldView = 'user' | 'base' | 'expedition';
export type BaseSite = 'main' | 'outpost';

/** Camera focus per view; falls back to the player when the target is missing. */
export function viewFocus(view: WorldView, site: BaseSite, p: { pos: LatLng; base: LatLng | null; outpost?: LatLng | null; crew?: LatLng | null }): LatLng {
  if (view === 'base') return (site === 'outpost' ? p.outpost : p.base) ?? p.base ?? p.pos;
  if (view === 'expedition') return p.crew ?? p.pos;
  return p.pos;
}
