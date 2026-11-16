import { useMemo, useState } from 'react';
import {
  ChevronDown,
  Compass,
  Flag,
  Layers,
  MapPin,
  Navigation,
  Plus,
  Radar,
  Sparkles,
  Star,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  computeExpeditionLevel,
  MAX_FAVORITE_SPOTS,
  RADAR_SCAN_RADIUS_M,
  scanRadarHotspots,
  type RadarFilterKind,
  type RadarHotspot,
  type RadarPin,
} from '@/lib/survival/radar';
import { distanceM, offsetM } from '@/lib/survival/geo';
import { nodeDef, creatureDef } from '@/lib/survival/entities';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import type { Favorite } from '@/hooks/useSurvivalFavorites';
import type { LatLng, WorldEntity } from '@/lib/survival/types';
import type { Landmark } from '@/lib/survival/landmarks';

export interface SearchItemOption {
  id: string;
  name: string;
  icon: string;
  category: 'node' | 'creature' | 'egg';
}

export const SEARCHABLE_ITEMS: SearchItemOption[] = [
  { id: 'branch', name: '나뭇가지', icon: '🪵', category: 'node' },
  { id: 'flint', name: '부싯돌', icon: '🪨', category: 'node' },
  { id: 'clay', name: '점토', icon: '🏺', category: 'node' },
  { id: 'herb', name: '약초 / 향신초', icon: '🌿', category: 'node' },
  { id: 'log', name: '통나무 / 송진', icon: '🌲', category: 'node' },
  { id: 'frost_shard', name: '빙결석 / 황토', icon: '❄️', category: 'node' },
  { id: 'quartz', name: '석영', icon: '💎', category: 'node' },
  { id: 'obsidian', name: '흑요석', icon: '🖤', category: 'node' },
  { id: 'jade', name: '옥 원석', icon: '❇️', category: 'node' },
  { id: 'dino_egg', name: '공룡 알', icon: '🥚', category: 'egg' },
  { id: 'apple', name: '사과 / 과일', icon: '🍎', category: 'node' },
  { id: 'raw_meat', name: '고기 / 짐승', icon: '🍖', category: 'creature' },
  { id: 'tusk', name: '엄니 / 가죽', icon: '🐘', category: 'creature' },
  { id: 'ancient_fang', name: '고대 송곳니', icon: '🦷', category: 'creature' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  pos: LatLng;
  base: LatLng | null;
  crewPos?: LatLng | null;
  expeditionCount: number;
  totalDistanceM: number;
  depleted: Record<string, number>;
  discoveredPins: RadarPin[];
  favorites: Favorite[];
  tracked: Favorite | null;
  entities?: WorldEntity[];
  landmarks?: Landmark[];
  onToggleFavorite: (fav: Favorite) => void;
  onRemoveFavorite: (id: string) => void;
  onTrack: (id: string | null) => void;
  onDispatchTo: (target: LatLng, label: string) => void;
}

export default function RadarMapModal({
  open,
  onClose,
  pos,
  base,
  crewPos,
  expeditionCount,
  totalDistanceM,
  depleted,
  discoveredPins,
  favorites,
  tracked,
  entities = [],
  landmarks = [],
  onToggleFavorite,
  onRemoveFavorite,
  onTrack,
  onDispatchTo,
}: Props) {
  // Top 3 categories requested: 희귀광물 (), 공룡알 (), 우두머리 ()
  const [filters, setFilters] = useState<Record<RadarFilterKind, boolean>>({
    ore: true,
    egg: true,
    boss: true,
  });

  // Dropdown for 찾는물품 v (리스트 나오도록)
  const [selectedItemId, setSelectedItemId] = useState<string>('all');
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);

  // Bottom left favorites manager panel toggle
  const [favBoxOpen, setFavBoxOpen] = useState(true);
  const [customName, setCustomName] = useState('');

  // Map Zoom scale & pan offset
  const [zoomScale, setZoomScale] = useState(1);
  const [selectedSpot, setSelectedSpot] = useState<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    kindLabel: string;
    probabilityPct?: number;
    distanceM?: number;
  } | null>(null);

  const center = base ?? pos;
  const levelInfo = useMemo(
    () => computeExpeditionLevel(expeditionCount, totalDistanceM),
    [expeditionCount, totalDistanceM]
  );

  const hotspots = useMemo(
    () => scanRadarHotspots(center, levelInfo.level, Date.now(), depleted),
    [center.lat, center.lng, levelInfo.level, depleted]
  );

  // Compute counts for the top badges
  const oreCount = hotspots.filter(h => h.kind === 'ore').length;
  const eggCount = hotspots.filter(h => h.kind === 'egg').length;
  const bossCount = hotspots.filter(h => h.kind === 'boss').length;

  // Filter spots by category toggles
  const visibleHotspots = hotspots.filter(h => filters[h.kind]);

  // Specific item search filter logic
  const matchedEntities = useMemo(() => {
    if (selectedItemId === 'all') return [];
    return entities.filter(e => {
      if (depleted[e.id]) return false;
      if (e.kind === 'node') {
        const def = nodeDef(e.type);
        return def.loot.some(l => l.itemId === selectedItemId);
      }
      if (e.kind === 'creature') {
        const def = creatureDef(e.type);
        return def.loot.some(l => l.itemId === selectedItemId);
      }
      return false;
    });
  }, [entities, depleted, selectedItemId]);

  if (!open) return null;

  const currentScanRadius = RADAR_SCAN_RADIUS_M / zoomScale;

  /** Projects LatLng to percentage coordinates on the radar map canvas */
  const toMapPct = (target: LatLng) => {
    const mLat = 111_320;
    const mLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);
    const dxM = (target.lng - center.lng) * mLng;
    const dyM = (target.lat - center.lat) * mLat;
    const xPct = 50 + (dxM / currentScanRadius) * 44;
    const yPct = 50 - (dyM / currentScanRadius) * 44;
    return { xPct, yPct };
  };

  const toggleFilter = (k: RadarFilterKind) =>
    setFilters(prev => ({ ...prev, [k]: !prev[k] }));

  const addQuickFavorite = (target: LatLng, defaultName: string) => {
    const label = customName.trim() || defaultName;
    onToggleFavorite({
      id: `fav-${Date.now()}`,
      name: label,
      lat: target.lat,
      lng: target.lng,
    });
    setCustomName('');
  };

  const selectedItemMeta = SEARCHABLE_ITEMS.find(i => i.id === selectedItemId);

  return (
    <div
      role="dialog"
      aria-label="전략 지도 및 즐겨찾기"
      className="fixed inset-0 z-50 flex flex-col bg-[#14231a] font-pixel text-xs text-white select-none overflow-hidden"
    >
      {/* ──────────────── TOP CONTROL BAR (Overlay above full map) ──────────────── */}
      <div className="absolute inset-x-0 top-0 z-40 flex flex-col gap-1.5 p-2 bg-gradient-to-b from-black/90 via-black/75 to-transparent pb-4 pointer-events-none">
        {/* Top Header: Title & Close Button */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded border-2 border-emerald-400 bg-emerald-950/80 text-sm">
              🗺️
            </span>
            <div>
              <b className="text-sm font-black text-emerald-300 drop-shadow">
                광역 탐색 맵 & 지휘소
              </b>
              <span className="ml-2 text-[10px] text-zinc-300">
                중심: {base ? '거점 모닥불' : '현재 위치'} (반경 {Math.round(currentScanRadius)}m)
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="지도 닫기"
            onClick={onClose}
            className="pixel-btn flex h-8 w-8 items-center justify-center bg-card p-0 text-white shadow-md active:scale-95"
          >
            <X className="!h-4 !w-4" />
          </button>
        </div>

        {/* Top Badges & Dropdown: 희귀광물 () | 공룡알 () | 우두머리 () | 찾는물품 v */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          {/* 희귀광물 () */}
          <button
            type="button"
            aria-pressed={filters.ore}
            onClick={() => toggleFilter('ore')}
            className={`pixel-btn flex items-center gap-1 py-1 px-2.5 text-xs transition-colors shadow ${
              filters.ore
                ? 'border-emerald-400 bg-emerald-800 text-white font-bold'
                : 'border-zinc-700 bg-zinc-900/90 text-zinc-400'
            }`}
          >
            <span>💎 희귀광물</span>
            <span className="rounded bg-black/40 px-1 text-[11px] font-mono text-emerald-300">
              ({oreCount})
            </span>
          </button>

          {/* 공룡알 () */}
          <button
            type="button"
            aria-pressed={filters.egg}
            onClick={() => toggleFilter('egg')}
            className={`pixel-btn flex items-center gap-1 py-1 px-2.5 text-xs transition-colors shadow ${
              filters.egg
                ? 'border-amber-400 bg-amber-700 text-white font-bold'
                : 'border-zinc-700 bg-zinc-900/90 text-zinc-400'
            }`}
          >
            <span>🥚 공룡알</span>
            <span className="rounded bg-black/40 px-1 text-[11px] font-mono text-amber-300">
              ({eggCount})
            </span>
          </button>

          {/* 우두머리 () */}
          <button
            type="button"
            aria-pressed={filters.boss}
            onClick={() => toggleFilter('boss')}
            className={`pixel-btn flex items-center gap-1 py-1 px-2.5 text-xs transition-colors shadow ${
              filters.boss
                ? 'border-rose-400 bg-rose-800 text-white font-bold'
                : 'border-zinc-700 bg-zinc-900/90 text-zinc-400'
            }`}
          >
            <span>🦖 우두머리</span>
            <span className="rounded bg-black/40 px-1 text-[11px] font-mono text-rose-300">
              ({bossCount})
            </span>
          </button>

          {/* 찾는물품 v (드롭다운) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setItemDropdownOpen(o => !o)}
              className="pixel-btn flex items-center gap-1.5 py-1 px-2.5 text-xs border-primary bg-primary/25 text-primary-foreground font-bold shadow"
            >
              <span>{selectedItemMeta ? `${selectedItemMeta.icon} ${selectedItemMeta.name}` : '🔍 찾는물품'}</span>
              <ChevronDown className={`!h-3.5 !w-3.5 transition-transform ${itemDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {itemDropdownOpen && (
              <div className="pixel-frame absolute left-0 top-full mt-1 z-50 max-h-56 w-48 overflow-y-auto bg-card p-1 shadow-2xl border-2 border-primary">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemId('all');
                    setItemDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-xs ${
                    selectedItemId === 'all' ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-accent'
                  }`}
                >
                  <span>전체 탐색</span>
                  <span className="text-[10px] text-muted-foreground">기본</span>
                </button>
                {SEARCHABLE_ITEMS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setItemDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs ${
                      selectedItemId === item.id ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-accent'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────── FULL-SCREEN RICH TERRAIN MAP CANVAS ──────────────── */}
      <div
        data-radar-canvas
        className="relative flex-1 w-full h-full overflow-hidden bg-[#162a1c] cursor-grab active:cursor-grabbing"
      >
        {/* Full-Map Stylized Background Texture (Grass/Forest Pattern & Topographic Contours) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(#2d5538_1.5px,transparent_1.5px)] [background-size:24px_24px]"
        />

        {/* Topographic Rings & Radar Circles (100m, 250m, 500m, 1km) */}
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          {/* Subtle Coordinate Axis */}
          <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(74,222,128,0.15)" strokeWidth="0.4" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(74,222,128,0.15)" strokeWidth="0.4" />

          {/* Concentric Range Rings */}
          <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(74,222,128,0.25)" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(74,222,128,0.3)" strokeWidth="0.4" strokeDasharray="2 1.5" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(74,222,128,0.4)" strokeWidth="0.5" strokeDasharray="2.5 2" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="0.6" />

          {/* Dynamic Compass / Sweep Indicator */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(74,222,128,0.6)" strokeWidth="0.7" />

          {/* Route Guide Line to Tracked Spot or Selected Spot */}
          {(tracked || selectedSpot) && (() => {
            const dest = selectedSpot ?? tracked!;
            const mePt = toMapPct(pos);
            const destPt = toMapPct(dest);
            return (
              <line
                x1={mePt.xPct}
                y1={mePt.yPct}
                x2={destPt.xPct}
                y2={destPt.yPct}
                stroke="#facc15"
                strokeWidth="1.2"
                strokeDasharray="2.5 1.5"
              />
            );
          })()}
        </svg>

        {/* Visible Hotspot Areas (Ore, Egg, Boss) */}
        {visibleHotspots.map(h => {
          const { xPct, yPct } = toMapPct(h);
          if (xPct < -10 || xPct > 110 || yPct < -10 || yPct > 110) return null;
          const isSelected = selectedSpot?.id === h.id;
          const colorBg =
            h.kind === 'ore'
              ? 'border-emerald-400 bg-emerald-500/30 text-emerald-200'
              : h.kind === 'egg'
                ? 'border-amber-400 bg-amber-500/30 text-amber-100'
                : 'border-rose-500 bg-rose-600/35 text-rose-100 animate-pulse';
          const icon = h.kind === 'ore' ? '💎' : h.kind === 'egg' ? '🥚' : '🦖';
          const sizePx = Math.max(34, Math.round((h.radiusM / currentScanRadius) * 280));

          return (
            <button
              key={h.id}
              type="button"
              data-radar-hotspot={h.kind}
              aria-label={`${h.name} (${h.probabilityPct}%)`}
              onClick={() =>
                setSelectedSpot({
                  id: h.id,
                  name: h.name,
                  lat: h.lat,
                  lng: h.lng,
                  kindLabel:
                    h.kind === 'ore'
                      ? '💎 희귀 광물 밀집지'
                      : h.kind === 'egg'
                        ? '🥚 공룡 알 스팟'
                        : '🦖 우두머리 출몰 구역',
                  probabilityPct: h.probabilityPct,
                  distanceM: Math.round(distanceM(center, h)),
                })
              }
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed flex flex-col items-center justify-center transition-all ${colorBg} ${
                isSelected ? 'ring-4 ring-yellow-400 scale-110 z-30' : 'hover:scale-105 z-20'
              }`}
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                width: sizePx,
                height: sizePx,
              }}
            >
              <span className="text-sm leading-none drop-shadow">{icon}</span>
              <span className="mt-0.5 text-[9px] font-black leading-none drop-shadow">
                {h.probabilityPct}%
              </span>
            </button>
          );
        })}

        {/* Searching Item Highlighted Drops / Nodes from Searchable Dropdown */}
        {matchedEntities.map(e => {
          const { xPct, yPct } = toMapPct(e);
          if (xPct < -5 || xPct > 105 || yPct < -5 || yPct > 105) return null;
          const isNode = e.kind === 'node';
          const name = isNode ? nodeDef(e.type).name : creatureDef(e.type).name;
          const icon = selectedItemMeta?.icon ?? '🔍';
          return (
            <button
              key={e.id}
              type="button"
              onClick={() =>
                setSelectedSpot({
                  id: e.id,
                  name,
                  lat: e.lat,
                  lng: e.lng,
                  kindLabel: `🔍 실시간 감지: ${selectedItemMeta?.name}`,
                  probabilityPct: 100,
                  distanceM: Math.round(distanceM(center, e)),
                })
              }
              className="absolute z-25 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-bounce"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              <span className="rounded-full bg-yellow-400/90 border border-white p-1 text-xs shadow-[0_0_10px_#facc15]">
                {icon}
              </span>
              <span className="rounded bg-black/80 px-1 py-0.5 text-[8px] font-bold text-yellow-300 whitespace-nowrap">
                {name}
              </span>
            </button>
          );
        })}

        {/* Real Landmarks (Shrines, Shaman Spots, Caves, Spring) */}
        {landmarks.map(lm => {
          const { xPct, yPct } = toMapPct(lm);
          if (xPct < -5 || xPct > 105 || yPct < -5 || yPct > 105) return null;
          return (
            <button
              key={lm.id}
              type="button"
              onClick={() =>
                setSelectedSpot({
                  id: lm.id,
                  name: lm.origin ?? '신비한 유적 성소',
                  lat: lm.lat,
                  lng: lm.lng,
                  kindLabel: '🏛️ 대지 유적 / 성소',
                  probabilityPct: 100,
                  distanceM: Math.round(distanceM(center, lm)),
                })
              }
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded bg-amber-950/85 border border-amber-400 px-1 py-0.5 text-[9px] text-amber-200 shadow"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              <span>🏛️</span>
              <span className="truncate max-w-[64px]">{lm.origin ?? '성소'}</span>
            </button>
          );
        })}

        {/* Discovered Sparkling Pins (Expedition Scout Drops) */}
        {discoveredPins.map(pin => {
          const { xPct, yPct } = toMapPct(pin);
          if (xPct < -5 || xPct > 105 || yPct < -5 || yPct > 105) return null;
          return (
            <button
              key={pin.id}
              type="button"
              onClick={() =>
                setSelectedSpot({
                  id: pin.id,
                  name: pin.label,
                  lat: pin.lat,
                  lng: pin.lng,
                  kindLabel: '✨ 원정대 실측 발견 좌표',
                  probabilityPct: 100,
                  distanceM: Math.round(distanceM(center, pin)),
                })
              }
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 animate-bounce rounded-full bg-yellow-400 px-1.5 py-0.5 text-[9px] font-black text-black shadow-[0_0_10px_#facc15]"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              ✨{pin.label}
            </button>
          );
        })}

        {/* Saved Favorites Markers */}
        {favorites.map((fav, idx) => {
          const { xPct, yPct } = toMapPct(fav);
          if (xPct < -5 || xPct > 105 || yPct < -5 || yPct > 105) return null;
          const isTracked = tracked?.id === fav.id;
          return (
            <button
              key={fav.id}
              type="button"
              onClick={() =>
                setSelectedSpot({
                  id: fav.id,
                  name: fav.name,
                  lat: fav.lat,
                  lng: fav.lng,
                  kindLabel: `⭐ 즐겨찾기 #${idx + 1}`,
                  distanceM: Math.round(distanceM(center, fav)),
                })
              }
              className={`absolute z-35 -translate-x-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-[9px] font-bold shadow ${
                isTracked
                  ? 'border-yellow-300 bg-yellow-400 text-black scale-110'
                  : 'border-sky-300 bg-sky-900/90 text-sky-100'
              }`}
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              ⭐#{idx + 1} {fav.name}
            </button>
          );
        })}

        {/* Center Base & Hero Position Marker */}
        {base && (() => {
          const pt = toMapPct(base);
          return (
            <div
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
            >
              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-black shadow-[0_0_8px_rgba(245,158,11,0.8)]">
                🔥거점 모닥불
              </span>
            </div>
          );
        })()}

        {(() => {
          const pt = toMapPct(pos);
          return (
            <div
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
            >
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_12px_#34d399]" />
              <span className="rounded bg-black/75 px-1 text-[8px] text-white">나</span>
            </div>
          );
        })()}

        {crewPos && (() => {
          const pt = toMapPct(crewPos);
          return (
            <div
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
            >
              <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-black text-primary-foreground shadow">
                🚩원정대
              </span>
            </div>
          );
        })()}

        {/* Floating Zoom In/Out Buttons (Right Edge of Map) */}
        <div className="absolute right-2 top-24 z-40 flex flex-col gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={() => setZoomScale(z => Math.min(2.5, z * 1.35))}
            className="pixel-btn h-9 w-9 p-0 bg-card text-white shadow-lg active:scale-95"
            aria-label="지도 확대"
          >
            <ZoomIn className="!h-4 !w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setZoomScale(z => Math.max(0.6, z / 1.35))}
            className="pixel-btn h-9 w-9 p-0 bg-card text-white shadow-lg active:scale-95"
            aria-label="지도 축소"
          >
            <ZoomOut className="!h-4 !w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setZoomScale(1)}
            className="pixel-btn h-9 w-9 p-0 bg-card text-white shadow-lg active:scale-95"
            aria-label="배율 초기화"
          >
            <RotateCcw className="!h-3.5 !w-3.5" />
          </Button>
        </div>
      </div>

      {/* ──────────────── SELECTED SPOT ACTION FLOATER (Bottom Center) ──────────────── */}
      {selectedSpot && (
        <div className="absolute inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+6.5rem)] z-40 pixel-frame max-w-md mx-auto space-y-1.5 bg-card/95 p-2.5 shadow-2xl border-2 border-primary">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-primary">{selectedSpot.kindLabel}</span>
              <b className="block text-sm text-foreground">
                {selectedSpot.name}
                {selectedSpot.probabilityPct !== undefined && ` (확률 ${selectedSpot.probabilityPct}%)`}
              </b>
            </div>
            <div className="text-right text-[10px] text-muted-foreground">
              <span>거리 {selectedSpot.distanceM ?? Math.round(distanceM(center, selectedSpot))}m</span>
              <button
                type="button"
                onClick={() => setSelectedSpot(null)}
                className="ml-2 text-destructive font-bold underline"
              >
                닫기
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onDispatchTo({ lat: selectedSpot.lat, lng: selectedSpot.lng }, selectedSpot.name);
                onClose();
              }}
              className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2 text-xs bg-primary text-primary-foreground font-bold"
            >
              <Flag className="!h-3.5 !w-3.5" />
              원정 파견
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const existing = favorites.find(
                  f => Math.abs(f.lat - selectedSpot.lat) < 1e-4 && Math.abs(f.lng - selectedSpot.lng) < 1e-4
                );
                if (existing) {
                  onTrack(tracked?.id === existing.id ? null : existing.id);
                } else if (favorites.length < MAX_FAVORITE_SPOTS) {
                  const id = `fav-${Date.now()}`;
                  onToggleFavorite({
                    id,
                    name: selectedSpot.name,
                    lat: selectedSpot.lat,
                    lng: selectedSpot.lng,
                  });
                  onTrack(id);
                }
              }}
              className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2 text-xs"
            >
              <Navigation className="!h-3.5 !w-3.5" />
              안내선 표시
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={favorites.length >= MAX_FAVORITE_SPOTS}
              onClick={() =>
                addQuickFavorite(
                  { lat: selectedSpot.lat, lng: selectedSpot.lng },
                  selectedSpot.name
                )
              }
              className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2 text-xs"
            >
              <Star className="!h-3.5 !w-3.5" />
              즐겨찾기 추가
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────── BOTTOM LEFT: FAVORITE COORDINATES MANAGER BOX ──────────────── */}
      <div className="absolute left-2 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 w-auto max-w-[calc(100vw-1rem)] sm:max-w-sm flex flex-col items-start">
        {/* Toggle Pill Button */}
        <button
          type="button"
          onClick={() => setFavBoxOpen(o => !o)}
          className="pixel-btn flex items-center gap-1.5 py-1 px-2.5 text-xs bg-card border-2 border-foreground text-foreground font-bold shadow-lg"
        >
          <span>⭐ 즐겨찾기 좌표 관리</span>
          <span className="rounded bg-primary/20 px-1 text-[10px] text-primary font-mono">
            {favorites.length}/{MAX_FAVORITE_SPOTS}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {favBoxOpen ? '▼ 접기' : '▲ 펼치기'}
          </span>
        </button>

        {/* Collapsible Panel */}
        {favBoxOpen && (
          <div className="pixel-frame mt-1 w-full space-y-1.5 bg-card/95 p-2 shadow-2xl border-2 border-foreground max-h-52 overflow-y-auto">
            {/* Quick Add Bar */}
            <div className="flex gap-1">
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="장소 이름 (예: 흑요석 광맥)"
                maxLength={18}
                className="pixel-box min-w-0 flex-1 bg-background px-2 py-1 text-xs text-foreground"
              />
              <Button
                type="button"
                size="sm"
                disabled={favorites.length >= MAX_FAVORITE_SPOTS}
                onClick={() => addQuickFavorite(pos, `내 스팟 #${favorites.length + 1}`)}
                className="pixel-btn h-auto min-h-0 shrink-0 gap-1 py-1 px-2 text-xs font-bold"
              >
                <Plus className="!h-3 !w-3" />
                현위치
              </Button>
            </div>

            {/* Favorite Item Rows */}
            {!favorites.length ? (
              <p className="py-2 text-center text-[11px] text-muted-foreground">
                저장된 즐겨찾기가 없습니다. 위 지도 스팟을 터치하거나 [현위치]를 눌러 등록하세요.
              </p>
            ) : (
              <div className="space-y-1">
                {favorites.map((fav, idx) => {
                  const dist = Math.round(distanceM(pos, fav));
                  const isTracked = tracked?.id === fav.id;
                  return (
                    <div
                      key={fav.id}
                      className={`pixel-box flex items-center justify-between gap-1 p-1.5 ${
                        isTracked ? 'border-primary bg-primary/15' : 'bg-background'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <b className="truncate text-[11px] text-foreground">
                            #{idx + 1} {fav.name}
                          </b>
                          {isTracked && (
                            <span className="rounded bg-primary px-1 text-[8px] text-primary-foreground font-bold">
                              안내 중
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-muted-foreground">
                          {dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${dist}m`} ({fav.lat.toFixed(4)}, {fav.lng.toFixed(4)})
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            onDispatchTo({ lat: fav.lat, lng: fav.lng }, fav.name);
                            onClose();
                          }}
                          className="pixel-btn h-auto min-h-0 py-0.5 px-1.5 text-[10px] bg-primary text-primary-foreground font-bold"
                        >
                          파견
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={isTracked ? 'default' : 'outline'}
                          onClick={() => onTrack(isTracked ? null : fav.id)}
                          className="pixel-btn h-auto min-h-0 py-0.5 px-1.5 text-[10px]"
                        >
                          {isTracked ? '끄기' : '안내'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`${fav.name} 삭제`}
                          onClick={() => onRemoveFavorite(fav.id)}
                          className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="!h-3 !w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
