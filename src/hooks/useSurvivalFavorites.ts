import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { LatLng } from '@/lib/survival/types';
import { MAX_FAVORITE_SPOTS } from '@/lib/survival/radar';

export interface Favorite extends LatLng { id: string; name: string; tag?: string }

const KEY = 'survival-favorites-v1';

/** Initial compass bearing (deg, 0 = north) from a to b. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const r = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

export function useSurvivalFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    try { return (JSON.parse(localStorage.getItem(KEY) ?? '[]') as Favorite[]).slice(0, MAX_FAVORITE_SPOTS); } catch { return []; }
  });
  const [trackedId, setTrackedId] = useState<string | null>(null);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(favorites)); }, [favorites]);
  const isFav = (id: string) => favorites.some((f) => f.id === id);
  const toggle = (f: Favorite) => setFavorites((list) => {
    if (list.some((x) => x.id === f.id)) return list.filter((x) => x.id !== f.id);
    if (list.length >= MAX_FAVORITE_SPOTS) {
      toast.warning(`즐겨찾기는 최대 ${MAX_FAVORITE_SPOTS}개까지 저장할 수 있어요`);
      return list;
    }
    return [...list, f];
  });
  const remove = (id: string) => { setFavorites((l) => l.filter((x) => x.id !== id)); if (trackedId === id) setTrackedId(null); };
  const tracked = favorites.find((f) => f.id === trackedId) ?? null;
  return { favorites, isFav, toggle, remove, tracked, setTrackedId, maxCount: MAX_FAVORITE_SPOTS };
}
