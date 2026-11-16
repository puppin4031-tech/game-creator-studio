import { useMemo, useState } from 'react';
import { Compass, Flag, MapPin, Navigation, Radar, Sparkles, Star, Trash2, X } from 'lucide-react';
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
import type { Favorite } from '@/hooks/useSurvivalFavorites';
import type { LatLng } from '@/lib/survival/types';

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
  onToggleFavorite,
  onRemoveFavorite,
  onTrack,
  onDispatchTo,
}: Props) {
  const [filters, setFilters] = useState<Record<RadarFilterKind, boolean>>({
    ore: true,
    egg: true,
    boss: true,
  });
  const [selectedSpot, setSelectedSpot] = useState<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    kindLabel: string;
    probabilityPct?: number;
  } | null>(null);
  const [customName, setCustomName] = useState('');

  const center = base ?? pos;
  const levelInfo = useMemo(
    () => computeExpeditionLevel(expeditionCount, totalDistanceM),
    [expeditionCount, totalDistanceM]
  );

  const hotspots = useMemo(
    () => scanRadarHotspots(center, levelInfo.level, Date.now(), depleted),
    [center.lat, center.lng, levelInfo.level, depleted]
  );

  if (!open) return null;

  const visibleHotspots = hotspots.filter(h => filters[h.kind]);

  /** Projects a LatLng within 1km of `center` onto the 0..100% radar canvas. */
  const toRadarPct = (target: LatLng) => {
    const mLat = 111_320;
    const mLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);
    const dxM = (target.lng - center.lng) * mLng;
    const dyM = (target.lat - center.lat) * mLat;
    const xPct = Math.max(6, Math.min(94, 50 + (dxM / RADAR_SCAN_RADIUS_M) * 44));
    const yPct = Math.max(6, Math.min(94, 50 - (dyM / RADAR_SCAN_RADIUS_M) * 44));
    return { xPct, yPct };
  };

  const toggleFilter = (k: RadarFilterKind) =>
    setFilters(prev => ({ ...prev, [k]: !prev[k] }));

  const addQuickFavorite = (target: LatLng, defaultName: string, tag: string) => {
    const label = customName.trim() || defaultName;
    onToggleFavorite({
      id: `fav-${Date.now()}`,
      name: label,
      tag,
      lat: target.lat,
      lng: target.lng,
    });
    setCustomName('');
  };

  const xpPct = Math.min(
    100,
    Math.round((levelInfo.xp / Math.max(1, levelInfo.nextXp)) * 100)
  );

  return (
    <div
      role="dialog"
      aria-label="전략 레이더 맵"
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <Radar className="!h-5 !w-5 text-primary" />
          <div>
            <b className="text-sm">🗺️ 전략 레이더 맵 & 즐겨찾기 지휘소</b>
            <p className="text-[10px] text-muted-foreground">
              원정대 Lv.{levelInfo.level} ({levelInfo.title}) · 반경 1km 자원·공룡 알·우두머리 탐지
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="레이더 맵 닫기"
          onClick={onClose}
          className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
        >
          <X className="!h-4 !w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* 1. Expedition Level Growth & Perks Banner */}
        <section
          aria-label="원정대 레벨 성장"
          className="pixel-frame space-y-1.5 bg-card p-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-1">
            <b className="text-sm text-primary">
              🚩 원정대 Lv.{levelInfo.level}/5 · {levelInfo.title}
            </b>
            <span className="text-[10px] text-muted-foreground">
              누적 원정 {expeditionCount}회 · 누적 탐색 {Math.round(totalDistanceM)}m (XP {levelInfo.xp}/{levelInfo.nextXp})
            </span>
          </div>
          <div className="h-2 w-full border border-foreground bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <ul className="space-y-0.5 pt-0.5 text-[10px]">
            {levelInfo.perks.slice(0, 3).map(pk => (
              <li
                key={pk.level}
                className={pk.unlocked ? 'font-bold text-primary' : 'text-muted-foreground'}
              >
                {pk.unlocked ? '✓ ' : '🔒 '}
                {pk.text}
              </li>
            ))}
          </ul>
        </section>

        {/* 2. Resource Probability & Boss Detection Filter Toggles */}
        <section className="space-y-2">
          <div
            role="group"
            aria-label="자원 확률 및 우두머리 탐지 필터"
            className="grid grid-cols-3 gap-1"
          >
            <button
              type="button"
              aria-pressed={filters.ore}
              onClick={() => toggleFilter('ore')}
              className={`pixel-btn flex items-center justify-center gap-1 py-1.5 px-2 text-xs ${
                filters.ore
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-card text-muted-foreground'
              }`}
            >
              <span>💎</span>
              <span className="truncate">희귀 광물 밀집지</span>
            </button>
            <button
              type="button"
              aria-pressed={filters.egg}
              onClick={() => toggleFilter('egg')}
              className={`pixel-btn flex items-center justify-center gap-1 py-1.5 px-2 text-xs ${
                filters.egg
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-card text-muted-foreground'
              }`}
            >
              <span>🥚</span>
              <span className="truncate">공룡 알 스팟</span>
            </button>
            <button
              type="button"
              aria-pressed={filters.boss}
              onClick={() => toggleFilter('boss')}
              className={`pixel-btn flex items-center justify-center gap-1 py-1.5 px-2 text-xs ${
                filters.boss
                  ? 'bg-destructive text-destructive-foreground font-bold'
                  : 'bg-card text-muted-foreground'
              }`}
            >
              <span>🦖</span>
              <span className="truncate">우두머리 출몰 구역</span>
            </button>
          </div>

          {/* Interactive 1km Tactical Radar Map with Heatmap Circles & Route Lines */}
          <div
            data-radar-canvas
            className="pixel-frame relative mx-auto aspect-square w-full max-w-[350px] overflow-hidden bg-[#0e1f18] text-white"
          >
            {/* Radar Grid & Range Rings (250m, 500m, 1km) */}
            <svg
              viewBox="0 0 100 100"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden
            >
              <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(52,211,153,0.18)" strokeWidth="0.4" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(52,211,153,0.18)" strokeWidth="0.4" />
              <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(52,211,153,0.22)" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
              <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(52,211,153,0.28)" strokeWidth="0.4" strokeDasharray="2 1.5" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(52,211,153,0.38)" strokeWidth="0.5" />
              {/* Route guide line to tracked favorite or selected spot */}
              {(tracked || selectedSpot) && (() => {
                const dest = selectedSpot ?? tracked!;
                const mePt = toRadarPct(pos);
                const destPt = toRadarPct(dest);
                return (
                  <line
                    x1={mePt.xPct}
                    y1={mePt.yPct}
                    x2={destPt.xPct}
                    y2={destPt.yPct}
                    stroke="#facc15"
                    strokeWidth="0.9"
                    strokeDasharray="2 1.2"
                  />
                );
              })()}
            </svg>

            <span className="pointer-events-none absolute left-2 top-1.5 text-[9px] text-emerald-300/80">
              반경 1.0km 전략 스캔 · 원정대 Lv.{levelInfo.level} 정밀도
            </span>

            {/* Heatmap Circles for Ore, Egg, and Boss Hotspots */}
            {visibleHotspots.map(h => {
              const { xPct, yPct } = toRadarPct(h);
              const sizePx = Math.max(30, Math.round((h.radiusM / RADAR_SCAN_RADIUS_M) * 280));
              const isSelected = selectedSpot?.id === h.id;
              const colorClass =
                h.kind === 'ore'
                  ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
                  : h.kind === 'egg'
                    ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                    : 'border-rose-500 bg-rose-600/30 text-rose-100 animate-pulse';
              const icon = h.kind === 'ore' ? '💎' : h.kind === 'egg' ? '🥚' : '🦖';
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
                    })
                  }
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed flex flex-col items-center justify-center transition-transform ${colorClass} ${
                    isSelected ? 'ring-2 ring-yellow-300 scale-110 z-20' : 'hover:scale-105 z-10'
                  }`}
                  style={{
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    width: sizePx,
                    height: sizePx,
                  }}
                >
                  <span className="text-xs leading-none">{icon}</span>
                  <span className="text-[8px] font-bold leading-none">{h.probabilityPct}%</span>
                </button>
              );
            })}

            {/* Sparkling Discovered Pins (Lv.2+ Expedition Discoveries) */}
            {discoveredPins.map(pin => {
              const { xPct, yPct } = toRadarPct(pin);
              return (
                <button
                  key={pin.id}
                  type="button"
                  data-radar-pin={pin.kind}
                  onClick={() =>
                    setSelectedSpot({
                      id: pin.id,
                      name: pin.label,
                      lat: pin.lat,
                      lng: pin.lng,
                      kindLabel: '✨ 원정대 실측 발견 좌표',
                      probabilityPct: 100,
                    })
                  }
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 animate-bounce rounded-full bg-yellow-400/90 px-1 py-0.5 text-[9px] font-bold text-black shadow-[0_0_8px_#facc15]"
                  style={{ left: `${xPct}%`, top: `${yPct}%` }}
                >
                  ✨{pin.label}
                </button>
              );
            })}

            {/* Saved Favorites on Radar */}
            {favorites.map((fav, idx) => {
              const { xPct, yPct } = toRadarPct(fav);
              const isTracked = tracked?.id === fav.id;
              return (
                <button
                  key={fav.id}
                  type="button"
                  data-radar-fav={fav.id}
                  onClick={() =>
                    setSelectedSpot({
                      id: fav.id,
                      name: fav.name,
                      lat: fav.lat,
                      lng: fav.lng,
                      kindLabel: `⭐ 즐겨찾기 #${idx + 1}`,
                    })
                  }
                  className={`absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded border px-1 py-0.5 text-[9px] font-bold ${
                    isTracked
                      ? 'border-yellow-300 bg-yellow-400 text-black'
                      : 'border-sky-300 bg-sky-900/90 text-sky-100'
                  }`}
                  style={{ left: `${xPct}%`, top: `${yPct}%` }}
                >
                  ⭐{fav.name}
                </button>
              );
            })}

            {/* Center Base & Player Marker */}
            {base && (() => {
              const pt = toRadarPct(base);
              return (
                <span
                  className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded bg-amber-500 px-1 text-[9px] font-bold text-black"
                  style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
                >
                  🔥거점
                </span>
              );
            })()}
            {(() => {
              const pt = toRadarPct(pos);
              return (
                <span
                  className="pointer-events-none absolute z-30 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
                  title="내 위치"
                />
              );
            })()}
            {crewPos && (() => {
              const pt = toRadarPct(crewPos);
              return (
                <span
                  className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded bg-primary px-1 text-[9px] font-bold text-primary-foreground"
                  style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
                >
                  🚩원정대
                </span>
              );
            })()}
          </div>

          {/* Selected Radar Spot Action Card */}
          {selectedSpot && (
            <div className="pixel-frame space-y-1.5 bg-card p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-primary">{selectedSpot.kindLabel}</span>
                  <b className="block text-sm">
                    {selectedSpot.name}
                    {selectedSpot.probabilityPct !== undefined && ` (포착 확률 ${selectedSpot.probabilityPct}%)`}
                  </b>
                </div>
                <span className="text-right text-[10px] text-muted-foreground">
                  거리 {Math.round(distanceM(center, selectedSpot))}m
                  <br />
                  추정 좌표 {selectedSpot.lat.toFixed(4)}, {selectedSpot.lng.toFixed(4)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onDispatchTo({ lat: selectedSpot.lat, lng: selectedSpot.lng }, selectedSpot.name);
                    onClose();
                  }}
                  className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2 text-xs"
                >
                  <Flag className="!h-3.5 !w-3.5" />
                  즉시 원정 파견
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
                  경로 안내선
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={favorites.length >= MAX_FAVORITE_SPOTS}
                  onClick={() =>
                    addQuickFavorite(
                      { lat: selectedSpot.lat, lng: selectedSpot.lng },
                      selectedSpot.name,
                      '스팟'
                    )
                  }
                  className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2 text-xs"
                >
                  <Star className="!h-3.5 !w-3.5" />
                  즐겨찾기 저장
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* 3. Favorite Coordinates Manager (Max 5 Spots) */}
        <section
          aria-label="즐겨찾기 좌표 관리"
          className="pixel-frame space-y-2 bg-card p-2.5"
        >
          <div className="flex items-center justify-between">
            <b className="text-sm">
              ⭐ 즐겨찾기 좌표 관리 ({favorites.length}/{MAX_FAVORITE_SPOTS})
            </b>
            <span className="text-[10px] text-muted-foreground">
              터치 시 즉시 원정 파견 또는 경로 안내선 표시
            </span>
          </div>

          {/* Quick Add Bar */}
          <div className="flex gap-1">
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="장소 이름 (예: 공원 알 스팟, 흑요석 광맥)"
              maxLength={20}
              className="pixel-box min-w-0 flex-1 bg-background px-2 py-1 text-xs"
            />
            <Button
              type="button"
              size="sm"
              disabled={favorites.length >= MAX_FAVORITE_SPOTS}
              onClick={() => addQuickFavorite(pos, `내 스팟 #${favorites.length + 1}`, '현재위치')}
              className="pixel-btn h-auto min-h-0 shrink-0 gap-1 py-1.5 px-2.5 text-xs"
            >
              <MapPin className="!h-3.5 !w-3.5" />
              현위치 저장
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={favorites.length >= MAX_FAVORITE_SPOTS}
              onClick={() =>
                addQuickFavorite(
                  offsetM(center, 240, 160),
                  `인근 공원 사냥터 #${favorites.length + 1}`,
                  '공원'
                )
              }
              className="pixel-btn h-auto min-h-0 shrink-0 py-1.5 px-2 text-xs"
            >
              🌳 공원 등록
            </Button>
          </div>

          {!favorites.length ? (
            <p className="py-3 text-center text-muted-foreground">
              저장된 즐겨찾기 좌표가 없습니다. 위 레이더 구역을 터치하거나 [현위치 저장]을 눌러 최대 5개까지 등록하세요.
            </p>
          ) : (
            <div className="space-y-1.5">
              {favorites.map((fav, idx) => {
                const dist = Math.round(distanceM(pos, fav));
                const isTracked = tracked?.id === fav.id;
                return (
                  <div
                    key={fav.id}
                    data-favorite-item={fav.id}
                    className={`pixel-box flex items-center justify-between gap-1.5 p-2 ${
                      isTracked ? 'border-primary bg-primary/10' : 'bg-background'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <b className="truncate text-xs">
                          #{idx + 1} {fav.name}
                        </b>
                        {isTracked && (
                          <span className="rounded bg-primary px-1 text-[9px] text-primary-foreground">
                            안내선 표시 중
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        거리 {dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${dist}m`} · ({fav.lat.toFixed(4)}, {fav.lng.toFixed(4)})
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onDispatchTo({ lat: fav.lat, lng: fav.lng }, fav.name);
                          onClose();
                        }}
                        className="pixel-btn h-auto min-h-0 py-1 px-2 text-xs"
                      >
                        원정 파견
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={isTracked ? 'default' : 'outline'}
                        onClick={() => onTrack(isTracked ? null : fav.id)}
                        className="pixel-btn h-auto min-h-0 py-1 px-2 text-xs"
                      >
                        {isTracked ? '안내 끄기' : '경로 안내'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`${fav.name} 삭제`}
                        onClick={() => onRemoveFavorite(fav.id)}
                        className="h-7 w-7 p-0 text-destructive"
                      >
                        <Trash2 className="!h-3.5 !w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
