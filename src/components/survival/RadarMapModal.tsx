import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { terrainOnlyStyle, type TerrainPalette } from '@/lib/survival/mapStyle';
import {
  ChevronDown,
  Compass,
  Flag,
  MapPin,
  Navigation,
  Plus,
  Radar,
  RotateCcw,
  Star,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
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
  category: 'material' | 'food' | 'ore' | 'hunt';
  categoryLabel: string;
}

/** Complete list of actual in-game materials and drops from world entities */
export const SEARCHABLE_ITEMS: SearchItemOption[] = [
  // ── 기초 채집 자원 ──
  { id: 'branch', name: '나뭇가지', icon: '🪵', category: 'material', categoryLabel: '기초 채집' },
  { id: 'log', name: '통나무', icon: '🌲', category: 'material', categoryLabel: '기초 채집' },
  { id: 'fiber', name: '식물 섬유', icon: '🌾', category: 'material', categoryLabel: '기초 채집' },
  { id: 'flint', name: '부싯돌', icon: '🪨', category: 'material', categoryLabel: '기초 채집' },
  { id: 'clay', name: '점토', icon: '🏺', category: 'material', categoryLabel: '기초 채집' },
  { id: 'soil', name: '흙더미', icon: '🟤', category: 'material', categoryLabel: '기초 채집' },
  { id: 'resin', name: '송진', icon: '🍯', category: 'material', categoryLabel: '기초 채집' },

  // ── 야생 식량 & 약초 ──
  { id: 'apple', name: '야생 사과', icon: '🍎', category: 'food', categoryLabel: '야생 식량' },
  { id: 'pear', name: '돌배', icon: '🍐', category: 'food', categoryLabel: '야생 식량' },
  { id: 'berry', name: '산딸기', icon: '🫐', category: 'food', categoryLabel: '야생 식량' },
  { id: 'herb', name: '약초', icon: '🌿', category: 'food', categoryLabel: '야생 식량' },
  { id: 'wild_spice', name: '야생 향신초', icon: '🍃', category: 'food', categoryLabel: '야생 식량' },
  { id: 'pepper_berry', name: '매운 후추열매', icon: '🌶️', category: 'food', categoryLabel: '야생 식량' },

  // ── 희귀 광물 & 보석 ──
  { id: 'rock_salt', name: '암염 결정', icon: '🧂', category: 'ore', categoryLabel: '광물·보석' },
  { id: 'frost_shard', name: '빙결석', icon: '❄️', category: 'ore', categoryLabel: '광물·보석' },
  { id: 'quartz', name: '석영 결정', icon: '💎', category: 'ore', categoryLabel: '광물·보석' },
  { id: 'ochre', name: '황토 안료', icon: '🎨', category: 'ore', categoryLabel: '광물·보석' },
  { id: 'obsidian', name: '흑요석', icon: '🖤', category: 'ore', categoryLabel: '광물·보석' },
  { id: 'jade', name: '옥 원석', icon: '❇️', category: 'ore', categoryLabel: '광물·보석' },

  // ── 사냥 전리품 & 공룡 알 ──
  { id: 'dino_egg', name: '공룡 알', icon: '🥚', category: 'hunt', categoryLabel: '사냥·알' },
  { id: 'raw_meat', name: '날고기', icon: '🥩', category: 'hunt', categoryLabel: '사냥·알' },
  { id: 'bone', name: '짐승 뼈', icon: '🦴', category: 'hunt', categoryLabel: '사냥·알' },
  { id: 'hide', name: '날가죽', icon: '🦌', category: 'hunt', categoryLabel: '사냥·알' },
  { id: 'tusk', name: '거대 엄니', icon: '🐘', category: 'hunt', categoryLabel: '사냥·알' },
  { id: 'ancient_fang', name: '고대 송곳니', icon: '🦷', category: 'hunt', categoryLabel: '사냥·알' },
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
  explored?: LatLng[];
  civilizationTechs?: string[];
  onToggleFavorite: (fav: Favorite) => void;
  onRemoveFavorite: (id: string) => void;
  onTrack: (id: string | null) => void;
  onDispatchTo: (target: LatLng, label: string) => void;
}

maplibregl.setWorkerUrl(workerUrl);

const RADAR_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
let cachedRadarStyle: maplibregl.StyleSpecification | null = null;

async function loadRadarTerrainStyle(): Promise<maplibregl.StyleSpecification> {
  if (cachedRadarStyle) return cachedRadarStyle;
  const res = await fetch(RADAR_STYLE_URL);
  if (!res.ok) throw new Error(`radar style ${res.status}`);
  const style = (await res.json()) as maplibregl.StyleSpecification;
  const css = getComputedStyle(document.documentElement);
  const color = (key: string) => css.getPropertyValue(`--survival-${key}`).trim();
  const palette: TerrainPalette = {
    forest: color('forest') || '#3b6b3a',
    grass: color('grass') || '#789e54',
    wetland: color('wetland') || '#4e7a6e',
    water: color('water') || '#3b7ea1',
    shore: color('shore') || '#cbb882',
    ice: color('ice') || '#cfe3ec',
    path: color('path') || '#d4c49e',
    pathEdge: color('path-edge') || '#8f7e5b',
  };
  cachedRadarStyle = terrainOnlyStyle(style, color('ground') || '#8fa868', palette);
  return cachedRadarStyle;
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
  explored = [],
  civilizationTechs = [],
  onToggleFavorite,
  onRemoveFavorite,
  onTrack,
  onDispatchTo,
}: Props) {
  // Top 3 category toggles
  const [filters, setFilters] = useState<Record<RadarFilterKind, boolean>>({
    ore: true,
    egg: true,
    boss: true,
  });

  // Dropdown for item search
  const [selectedItemId, setSelectedItemId] = useState<string>('all');
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);

  // Bottom left favorites manager panel toggle
  const [favBoxOpen, setFavBoxOpen] = useState(true);
  const [customName, setCustomName] = useState('');

  // Map Zoom scale & pan offset (meters)
  const [zoomScale, setZoomScale] = useState(1);
  const [panM, setPanM] = useState({ x: 0, y: 0 });

  const [selectedSpot, setSelectedSpot] = useState<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    kindLabel: string;
    probabilityPct?: number;
    distanceM?: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [, setMapTick] = useState(0);

  // Touch gesture state for pinch-to-zoom & smooth panning
  const touchStateRef = useRef<{
    mode: 'none' | 'pan' | 'pinch';
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    initialDist: number;
    initialZoom: number;
    hasDragged: boolean;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    initialDist: 0,
    initialZoom: 1,
    hasDragged: false,
  });

  const isMouseDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const hasMouseDraggedRef = useRef(false);

  // User GPS position is the primary anchor center
  const center = pos;
  const levelInfo = useMemo(
    () => computeExpeditionLevel(expeditionCount, totalDistanceM),
    [expeditionCount, totalDistanceM]
  );

  const hotspots = useMemo(
    () => scanRadarHotspots(center, levelInfo.level, Date.now(), depleted),
    [center.lat, center.lng, levelInfo.level, depleted]
  );

  // Compute counts for top category badges
  const oreCount = hotspots.filter(h => h.kind === 'ore').length;
  const eggCount = hotspots.filter(h => h.kind === 'egg').length;
  const bossCount = hotspots.filter(h => h.kind === 'boss').length;

  const visibleHotspots = hotspots.filter(h => filters[h.kind]);

  // Specific item search filter matching actual entities in the world
  const matchedEntities = useMemo(() => {
    if (selectedItemId === 'all') return [];
    return entities.filter(e => {
      if (depleted[e.id]) return false;
      if (selectedItemId === 'dino_egg') {
        return (e.type as string).includes('egg');
      }
      if (e.kind === 'node') {
        const def = nodeDef(e.type);
        return def?.loot?.some(l => l.itemId === selectedItemId);
      }
      if (e.kind === 'creature') {
        const def = creatureDef(e.type);
        return def?.loot?.some(l => l.itemId === selectedItemId);
      }
      return false;
    });
  }, [entities, depleted, selectedItemId]);

  const hasCompass = civilizationTechs.includes('tech_magnetic_compass');
  const baseScanRadius = hasCompass ? 3000 : RADAR_SCAN_RADIUS_M;
  const currentScanRadius = baseScanRadius / zoomScale;

  // Compute current view center LatLng accounting for panM
  const viewCenterLatLng = useMemo((): LatLng => {
    const mLat = 111_320;
    const mLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);
    return {
      lat: center.lat + panM.y / mLat,
      lng: center.lng + panM.x / mLng,
    };
  }, [center.lat, center.lng, panM.x, panM.y]);

  const computeMapZoom = useCallback((w: number, h: number, lat: number, radiusM: number) => {
    const minDim = Math.max(200, Math.min(w, h));
    const desiredMpp = radiusM / (0.44 * minDim);
    const z = Math.log2((78271.51696 * Math.cos((lat * Math.PI) / 180)) / desiredMpp);
    return Math.max(11, Math.min(18.5, z));
  }, []);

  // Draw fog-of-war canvas: dim unexplored terrain so roads/rivers are still faintly visible,
  // and cut out visited (explored) areas + player + base so detailed roads & terrain shine through!
  const drawRadarFog = useCallback(() => {
    const canvas = fogCanvasRef.current;
    const container = containerRef.current;
    const map = mapRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Semi-transparent dark tactical fog over unexplored regions (lets terrain/roads show dimly)
    ctx.fillStyle = 'rgba(8, 18, 12, 0.56)';
    ctx.fillRect(0, 0, w, h);

    // Cut out explored areas & player/base vision to reveal full detailed roads & terrain
    ctx.globalCompositeOperation = 'destination-out';

    const minDim = Math.max(200, Math.min(w, h));
    const pxPerM = (0.44 * minDim) / currentScanRadius;

    const projectPx = (pt: LatLng) => {
      if (map) {
        const p = map.project([pt.lng, pt.lat]);
        return { x: p.x, y: p.y };
      }
      const mLat = 111_320;
      const mLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);
      const dxM = (pt.lng - center.lng) * mLng - panM.x;
      const dyM = (pt.lat - center.lat) * mLat - panM.y;
      return {
        x: (0.5 + (dxM / currentScanRadius) * 0.44) * w,
        y: (0.5 - (dyM / currentScanRadius) * 0.44) * h,
      };
    };

    const punch = (pt: LatLng, radiusM: number, minPx: number) => {
      const p = projectPx(pt);
      const r = Math.max(minPx, radiusM * pxPerM);
      if (p.x < -r || p.x > w + r || p.y < -r || p.y > h + r) return;
      const grad = ctx.createRadialGradient(p.x, p.y, r * 0.45, p.x, p.y, r);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    if (explored && explored.length > 0) {
      for (const pt of explored) {
        punch(pt, 55, 16);
      }
    }
    punch(pos, 75, 26);
    if (base) punch(base, 85, 30);

    ctx.restore();
  }, [explored, pos, base, center.lat, center.lng, panM.x, panM.y, currentScanRadius]);

  // Mount real MapLibre terrain map inside RadarMapModal when open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let resizeObs: ResizeObserver | null = null;
    (async () => {
      try {
        const style = await loadRadarTerrainStyle();
        if (cancelled || !mapBoxRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const z = computeMapZoom(rect.width || 360, rect.height || 640, viewCenterLatLng.lat, currentScanRadius);
        const map = new maplibregl.Map({
          container: mapBoxRef.current,
          style,
          center: [viewCenterLatLng.lng, viewCenterLatLng.lat],
          zoom: z,
          interactive: false,
          attributionControl: false,
        });
        mapRef.current = map;
        map.on('load', () => {
          if (cancelled) return;
          setMapReady(true);
          setMapTick(t => t + 1);
          drawRadarFog();
        });
        map.on('render', () => {
          drawRadarFog();
        });
        resizeObs = new ResizeObserver(() => {
          map.resize();
          setMapTick(t => t + 1);
          drawRadarFog();
        });
        resizeObs.observe(containerRef.current);
      } catch (e) {
        console.error('[RadarMapModal] maplibre init failed', e);
      }
    })();
    return () => {
      cancelled = true;
      resizeObs?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Sync MapLibre camera with panM, zoomScale, and center
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) {
      drawRadarFog();
      return;
    }
    const rect = container.getBoundingClientRect();
    const z = computeMapZoom(rect.width || 360, rect.height || 640, viewCenterLatLng.lat, currentScanRadius);
    map.jumpTo({ center: [viewCenterLatLng.lng, viewCenterLatLng.lat], zoom: z });
    drawRadarFog();
  }, [viewCenterLatLng.lat, viewCenterLatLng.lng, currentScanRadius, mapReady, drawRadarFog]);

  /** Projects LatLng to percentage coordinates on the radar map canvas with pan & zoom */
  const toMapPct = (target: LatLng) => {
    const map = mapRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (map && mapReady && rect && rect.width > 0 && rect.height > 0) {
      const pt = map.project([target.lng, target.lat]);
      return {
        xPct: (pt.x / rect.width) * 100,
        yPct: (pt.y / rect.height) * 100,
      };
    }
    const mLat = 111_320;
    const mLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);
    const dxM = (target.lng - center.lng) * mLng - panM.x;
    const dyM = (target.lat - center.lat) * mLat - panM.y;
    const xPct = 50 + (dxM / currentScanRadius) * 44;
    const yPct = 50 - (dyM / currentScanRadius) * 44;
    return { xPct, yPct };
  };

  /** Inverses percentage coordinates on the radar map canvas back to LatLng */
  const fromMapPct = (xPct: number, yPct: number): LatLng => {
    const map = mapRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (map && mapReady && rect && rect.width > 0 && rect.height > 0) {
      const ll = map.unproject([(xPct / 100) * rect.width, (yPct / 100) * rect.height]);
      return { lat: ll.lat, lng: ll.lng };
    }
    const mLat = 111_320;
    const mLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);
    const dxM = ((xPct - 50) / 44) * currentScanRadius + panM.x;
    const dyM = ((50 - yPct) / 44) * currentScanRadius + panM.y;
    return {
      lat: center.lat + dyM / mLat,
      lng: center.lng + dxM / mLng,
    };
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

  // Grouped items for the dropdown
  const groupedItems = useMemo(() => {
    const map = new Map<string, SearchItemOption[]>();
    for (const item of SEARCHABLE_ITEMS) {
      const list = map.get(item.categoryLabel) ?? [];
      list.push(item);
      map.set(item.categoryLabel, list);
    }
    return Array.from(map.entries());
  }, []);

  // ── Touch Gesture Handlers (Pinch-to-zoom & 1-finger Pan) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStateRef.current = {
        mode: 'pan',
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startPanX: panM.x,
        startPanY: panM.y,
        initialDist: 0,
        initialZoom: zoomScale,
        hasDragged: false,
      };
    } else if (e.touches.length >= 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStateRef.current = {
        mode: 'pinch',
        startX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        startY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        startPanX: panM.x,
        startPanY: panM.y,
        initialDist: Math.max(10, dist),
        initialZoom: zoomScale,
        hasDragged: true,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect?.width || 360;
    const h = rect?.height || 640;

    if (touchStateRef.current.mode === 'pinch' && e.touches.length >= 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStateRef.current.initialDist > 0) {
        const factor = dist / touchStateRef.current.initialDist;
        const nextZoom = Math.min(3.5, Math.max(0.5, touchStateRef.current.initialZoom * factor));
        setZoomScale(Math.round(nextZoom * 100) / 100);
      }
    } else if (touchStateRef.current.mode === 'pan' && e.touches.length === 1) {
      const dxPx = e.touches[0].clientX - touchStateRef.current.startX;
      const dyPx = e.touches[0].clientY - touchStateRef.current.startY;
      if (Math.abs(dxPx) > 5 || Math.abs(dyPx) > 5) {
        touchStateRef.current.hasDragged = true;
      }
      const meterScale = (currentScanRadius / 44) * 100;
      const deltaMx = (dxPx / w) * meterScale;
      const deltaMy = (dyPx / h) * meterScale;
      setPanM({
        x: touchStateRef.current.startPanX - deltaMx,
        y: touchStateRef.current.startPanY + deltaMy,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStateRef.current.hasDragged && e.changedTouches.length === 1) {
      const targetEl = e.target as HTMLElement;
      if (targetEl && (targetEl.tagName === 'DIV' || targetEl.tagName === 'svg' || targetEl.tagName === 'line' || targetEl.tagName === 'circle')) {
        const touch = e.changedTouches[0];
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const xPct = ((touch.clientX - rect.left) / rect.width) * 100;
          const yPct = ((touch.clientY - rect.top) / rect.height) * 100;
          const coord = fromMapPct(xPct, yPct);
          const dist = Math.round(distanceM(center, coord));
          setSelectedSpot({
            id: `coord-${Date.now()}`,
            name: `지정 좌표 (${dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${dist}m`})`,
            lat: coord.lat,
            lng: coord.lng,
            kindLabel: '📍 지도 지정 좌표',
            distanceM: dist,
          });
        }
      }
    }
    touchStateRef.current.mode = 'none';
  };

  // ── Mouse Drag & Wheel Handlers (Desktop support) ──
  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDraggingRef.current = true;
    hasMouseDraggedRef.current = false;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDraggingRef.current) return;
    const dxPx = e.clientX - lastMousePosRef.current.x;
    const dyPx = e.clientY - lastMousePosRef.current.y;
    if (Math.abs(dxPx) > 3 || Math.abs(dyPx) > 3) {
      hasMouseDraggedRef.current = true;
    }
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect?.width || 360;
    const h = rect?.height || 640;
    const meterScale = (currentScanRadius / 44) * 100;
    const deltaMx = (dxPx / w) * meterScale;
    const deltaMy = (dyPx / h) * meterScale;
    setPanM(p => ({ x: p.x - deltaMx, y: p.y + deltaMy }));
  };

  const handleMouseUp = () => {
    isMouseDraggingRef.current = false;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (touchStateRef.current.hasDragged || hasMouseDraggedRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    const xPct = (xPx / rect.width) * 100;
    const yPct = (yPx / rect.height) * 100;
    const coord = fromMapPct(xPct, yPct);
    const dist = Math.round(distanceM(center, coord));
    setSelectedSpot({
      id: `coord-${Date.now()}`,
      name: `지정 좌표 (${dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${dist}m`})`,
      lat: coord.lat,
      lng: coord.lng,
      kindLabel: '📍 지도 지정 좌표',
      distanceM: dist,
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY < 0 ? 1.2 : 0.82;
    setZoomScale(z => Math.round(Math.min(3.5, Math.max(0.5, z * delta)) * 100) / 100);
  };

  const resetView = () => {
    setZoomScale(1);
    setPanM({ x: 0, y: 0 });
    setSelectedSpot(null);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="전략 지도 및 즐겨찾기"
      className="fixed inset-0 z-50 flex flex-col bg-[#0b140e] font-pixel text-xs text-white select-none overflow-hidden"
    >
      {/* ──────────────── TOP CONTROL BAR ──────────────── */}
      <div className="absolute inset-x-0 top-0 z-40 flex flex-col gap-2 p-2.5 bg-gradient-to-b from-[#080f0a]/95 via-[#080f0a]/85 to-transparent pb-6 pointer-events-none">
        {/* Top Header: Title & GPS Refresh & Close Button */}
        <div className="flex items-center justify-between pointer-events-auto gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border-2 border-emerald-500 bg-[#14231a] text-base shadow-md">
              🗺️
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <b className="text-sm font-black text-emerald-300 drop-shadow truncate">
                  광역 탐색 맵
                </b>
                <span className="text-[10px] text-emerald-200/90 font-mono">
                  (GPS 중심 · 반경 {Math.round(currentScanRadius)}m)
                </span>
              </div>
              {hasCompass && (
                <span className="rounded bg-amber-400/20 border border-amber-400/40 px-1 py-0.2 text-[9px] font-bold text-amber-300">
                  🧭 자력 나침반 (3km 확장)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="유저 GPS 새로고침"
              onClick={() => {
                setPanM({ x: 0, y: 0 });
                toast.success('유저 GPS 위치로 지도를 재정렬했습니다.');
              }}
              className="pixel-btn flex h-8 items-center gap-1 px-2.5 rounded border-2 border-emerald-500 bg-[#142d1e] text-emerald-300 text-xs font-bold shadow hover:bg-[#1b3d29] active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
              <span>새로고침</span>
            </button>
            <button
              type="button"
              aria-label="지도 닫기"
              onClick={onClose}
              className="pixel-btn flex h-8 w-8 items-center justify-center rounded border-2 border-emerald-600 bg-[#162a1d] text-emerald-200 shadow-lg hover:bg-[#1f3827] active:scale-95"
            >
              <X className="!h-4 !w-4" />
            </button>
          </div>
        </div>

        {/* Top Badges & Dropdown: 희귀광물 () | 공룡알 () | 우두머리 () | 찾는물품 v */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          {/* 희귀광물 () */}
          <button
            type="button"
            aria-pressed={filters.ore}
            onClick={() => toggleFilter('ore')}
            className={`pixel-btn flex items-center gap-1 py-1 px-2.5 text-xs rounded transition-all shadow ${
              filters.ore
                ? 'border-2 border-emerald-400 bg-emerald-800 text-white font-bold ring-1 ring-emerald-300'
                : 'border border-emerald-900 bg-[#122016] text-emerald-400/60'
            }`}
          >
            <span>💎 희귀광물</span>
            <span className="rounded bg-black/50 px-1 text-[11px] font-mono text-emerald-300">
              ({oreCount})
            </span>
          </button>

          {/* 공룡알 () */}
          <button
            type="button"
            aria-pressed={filters.egg}
            onClick={() => toggleFilter('egg')}
            className={`pixel-btn flex items-center gap-1 py-1 px-2.5 text-xs rounded transition-all shadow ${
              filters.egg
                ? 'border-2 border-amber-400 bg-amber-800 text-white font-bold ring-1 ring-amber-300'
                : 'border border-amber-900 bg-[#122016] text-amber-400/60'
            }`}
          >
            <span>🥚 공룡알</span>
            <span className="rounded bg-black/50 px-1 text-[11px] font-mono text-amber-300">
              ({eggCount})
            </span>
          </button>

          {/* 우두머리 () */}
          <button
            type="button"
            aria-pressed={filters.boss}
            onClick={() => toggleFilter('boss')}
            className={`pixel-btn flex items-center gap-1 py-1 px-2.5 text-xs rounded transition-all shadow ${
              filters.boss
                ? 'border-2 border-rose-400 bg-rose-800 text-white font-bold ring-1 ring-rose-300'
                : 'border border-rose-900 bg-[#122016] text-rose-400/60'
            }`}
          >
            <span>🦖 우두머리</span>
            <span className="rounded bg-black/50 px-1 text-[11px] font-mono text-rose-300">
              ({bossCount})
            </span>
          </button>

          {/* 찾는물품 v (드롭다운) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setItemDropdownOpen(o => !o)}
              className="pixel-btn flex items-center gap-1.5 py-1 px-2.5 text-xs rounded border-2 border-emerald-400 bg-[#162a1d] text-emerald-100 font-bold shadow-lg hover:bg-[#1f3827]"
            >
              <span>{selectedItemMeta ? `${selectedItemMeta.icon} ${selectedItemMeta.name}` : '🔍 찾는물품'}</span>
              <ChevronDown className={`!h-3.5 !w-3.5 transition-transform ${itemDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {itemDropdownOpen && (
              <div className="pixel-frame absolute left-0 top-full mt-1.5 z-50 max-h-72 w-56 overflow-y-auto rounded bg-[#0d1911] p-1.5 shadow-2xl border-2 border-emerald-500 text-white divide-y divide-emerald-900/60">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemId('all');
                    setItemDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs ${
                    selectedItemId === 'all'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-emerald-100 hover:bg-[#172d1f]'
                  }`}
                >
                  <span className="font-bold">전체 보기 (초기화)</span>
                  <span className="text-[10px] text-emerald-300/70">기본</span>
                </button>

                {groupedItems.map(([groupLabel, items]) => (
                  <div key={groupLabel} className="pt-1.5 pb-1">
                    <div className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      {groupLabel}
                    </div>
                    {items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setItemDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs ${
                          selectedItemId === item.id
                            ? 'bg-emerald-600 text-white font-bold ring-1 ring-emerald-300'
                            : 'text-emerald-100 hover:bg-[#172d1f]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{item.icon}</span>
                          <span className="font-medium text-white">{item.name}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────── FULL-SCREEN CRISP TERRAIN MAP CANVAS ──────────────── */}
      <div
        ref={containerRef}
        data-radar-canvas
        onClick={handleCanvasClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="relative flex-1 w-full h-full overflow-hidden bg-[#0a150e] cursor-grab active:cursor-grabbing touch-none select-none"
      >
        {/* Real OpenFreeMap / MapLibre Terrain & Roads Layer */}
        <div
          ref={mapBoxRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Fog-of-War Canvas: dims unexplored terrain while punching clear holes over visited roads & terrain */}
        <canvas
          ref={fogCanvasRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Subtle Tactical Map Grid Overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(#34d399_1.2px,transparent_1.2px)] [background-size:28px_28px]"
        />

        {/* Topographic Rings & High-Contrast Coordinate Grid */}
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          {/* Main Axis with clean emerald lines */}
          <line x1="50" y1="0" x2="50" y2="100" stroke="#34d399" strokeWidth="0.3" strokeOpacity="0.35" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#34d399" strokeWidth="0.3" strokeOpacity="0.35" />

          {/* Range Circles with clean emerald styling */}
          <circle cx="50" cy="50" r="11" fill="none" stroke="#34d399" strokeWidth="0.35" strokeDasharray="1.5 1.5" strokeOpacity="0.45" />
          <circle cx="50" cy="50" r="22" fill="none" stroke="#34d399" strokeWidth="0.4" strokeDasharray="2 1.5" strokeOpacity="0.5" />
          <circle cx="50" cy="50" r="34" fill="none" stroke="#34d399" strokeWidth="0.45" strokeDasharray="2.5 2" strokeOpacity="0.55" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#34d399" strokeWidth="0.5" strokeOpacity="0.6" />
          <circle cx="50" cy="50" r="48" fill="none" stroke="#10b981" strokeWidth="0.6" strokeOpacity="0.7" />

          {/* Range Labels on SVG axis */}
          <text x="51.5" y="39.5" fill="#ecfdf5" fontSize="2.3" fontWeight="bold" stroke="#064e3b" strokeWidth="0.25" paintOrder="stroke">100m</text>
          <text x="51.5" y="28.5" fill="#ecfdf5" fontSize="2.3" fontWeight="bold" stroke="#064e3b" strokeWidth="0.25" paintOrder="stroke">250m</text>
          <text x="51.5" y="16.5" fill="#ecfdf5" fontSize="2.3" fontWeight="bold" stroke="#064e3b" strokeWidth="0.25" paintOrder="stroke">500m</text>
          <text x="51.5" y="6.5" fill="#ecfdf5" fontSize="2.3" fontWeight="bold" stroke="#064e3b" strokeWidth="0.25" paintOrder="stroke">1,000m</text>

          {/* Route Guide Line to Tracked Spot or Selected Spot (thinner & 70% opacity) */}
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
                strokeWidth="0.55"
                strokeOpacity="0.7"
                strokeDasharray="1.8 1.2"
              />
            );
          })()}
        </svg>

        {/* Visible Hotspot Areas (Ore, Egg, Boss) */}
        {visibleHotspots.map(h => {
          const { xPct, yPct } = toMapPct(h);
          if (xPct < -15 || xPct > 115 || yPct < -15 || yPct > 115) return null;
          const isSelected = selectedSpot?.id === h.id;
          const colorBg =
            h.kind === 'ore'
              ? 'border-2 border-emerald-400 bg-emerald-900/80 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
              : h.kind === 'egg'
                ? 'border-2 border-amber-400 bg-amber-900/80 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                : 'border-2 border-rose-400 bg-rose-950/85 text-rose-100 shadow-[0_0_14px_rgba(244,63,94,0.6)] animate-pulse';
          const icon = h.kind === 'ore' ? '💎' : h.kind === 'egg' ? '🥚' : '🦖';
          const sizePx = Math.max(38, Math.round((h.radiusM / currentScanRadius) * 280));

          return (
            <button
              key={h.id}
              type="button"
              data-radar-hotspot={h.kind}
              aria-label={`${h.name} (${h.probabilityPct}%)`}
              onClick={() => {
                if (touchStateRef.current.hasDragged || hasMouseDraggedRef.current) return;
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
                });
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex flex-col items-center justify-center transition-transform ${colorBg} ${
                isSelected ? 'ring-4 ring-yellow-400 scale-110 z-35' : 'hover:scale-105 z-20'
              }`}
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                width: sizePx,
                height: sizePx,
              }}
            >
              <span className="text-sm drop-shadow">{icon}</span>
              <span className="mt-0.5 text-[9px] font-black leading-none drop-shadow text-white">
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
          const name = isNode ? nodeDef(e.type)?.name ?? e.type : creatureDef(e.type)?.name ?? e.type;
          const icon = selectedItemMeta?.icon ?? '🔍';
          return (
            <button
              key={e.id}
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                if (touchStateRef.current.hasDragged || hasMouseDraggedRef.current) return;
                setSelectedSpot({
                  id: e.id,
                  name,
                  lat: e.lat,
                  lng: e.lng,
                  kindLabel: `🔍 실시간 감지: ${selectedItemMeta?.name}`,
                  probabilityPct: 100,
                  distanceM: Math.round(distanceM(center, e)),
                });
              }}
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform hover:scale-125"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/90 border-2 border-emerald-300 text-xs shadow-[0_0_8px_rgba(52,211,153,0.8)]">
                {icon}
              </span>
              <span className="rounded border border-emerald-700 bg-[#0d1911]/90 px-1 py-0.2 text-[8px] font-bold text-emerald-200 whitespace-nowrap mt-0.5 shadow">
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
              onClick={(ev) => {
                ev.stopPropagation();
                if (touchStateRef.current.hasDragged || hasMouseDraggedRef.current) return;
                setSelectedSpot({
                  id: lm.id,
                  name: lm.origin ?? '신비한 유적 성소',
                  lat: lm.lat,
                  lng: lm.lng,
                  kindLabel: '🏛️ 대지 유적 / 성소',
                  probabilityPct: 100,
                  distanceM: Math.round(distanceM(center, lm)),
                });
              }}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded bg-[#2a170b]/60 border border-amber-400/50 px-1.5 py-0.5 text-[10px] text-amber-200/90 font-bold shadow-md opacity-40 hover:opacity-100 transition-opacity"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              <span>🏛️</span>
              <span className="truncate max-w-[70px]">{lm.origin ?? '성소'}</span>
            </button>
          );
        })}

        {/* Active Coordinate Reticle */}
        {selectedSpot && (() => {
          const { xPct, yPct } = toMapPct(selectedSpot);
          if (xPct < -5 || xPct > 105 || yPct < -5 || yPct > 105) return null;
          return (
            <div
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              <div className="h-9 w-9 rounded-full border-2 border-dashed border-emerald-400 animate-spin [animation-duration:8s]" />
              <div className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            </div>
          );
        })()}

        {/* Saved Favorites Markers */}
        {favorites.map((fav, idx) => {
          const { xPct, yPct } = toMapPct(fav);
          if (xPct < -5 || xPct > 105 || yPct < -5 || yPct > 105) return null;
          const isTracked = tracked?.id === fav.id;
          return (
            <button
              key={fav.id}
              type="button"
              onClick={() => {
                if (touchStateRef.current.hasDragged || hasMouseDraggedRef.current) return;
                setSelectedSpot({
                  id: fav.id,
                  name: fav.name,
                  lat: fav.lat,
                  lng: fav.lng,
                  kindLabel: `⭐ 즐겨찾기 #${idx + 1}`,
                  distanceM: Math.round(distanceM(center, fav)),
                });
              }}
              className={`absolute z-35 -translate-x-1/2 -translate-y-1/2 rounded border-2 px-1.5 py-0.5 text-[9px] font-bold shadow-lg ${
                isTracked
                  ? 'border-yellow-300 bg-yellow-400 text-black scale-110'
                  : 'border-sky-400 bg-sky-950 text-sky-100'
              }`}
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              ⭐#{idx + 1} {fav.name}
            </button>
          );
        })}

        {/* Center Base Marker */}
        {base && (() => {
          const pt = toMapPct(base);
          return (
            <div
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
            >
              <span className="rounded-full border-2 border-white bg-amber-600 px-2 py-0.5 text-[10px] font-black text-white shadow-[0_0_12px_rgba(245,158,11,0.9)]">
                🔥 거점 모닥불
              </span>
            </div>
          );
        })()}

        {/* Player Position Marker */}
        {(() => {
          const pt = toMapPct(pos);
          return (
            <div
              className="pointer-events-none absolute z-45 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
            >
              <span className="h-4 w-4 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_14px_#34d399] animate-ping opacity-75 absolute" />
              <span className="h-4 w-4 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_12px_#34d399]" />
              <span className="mt-0.5 rounded border border-black/80 bg-black/85 px-1 text-[8px] font-bold text-white">
                나
              </span>
            </div>
          );
        })()}

        {/* Expedition Crew Marker */}
        {crewPos && (() => {
          const pt = toMapPct(crewPos);
          return (
            <div
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${pt.xPct}%`, top: `${pt.yPct}%` }}
            >
              <span className="rounded-full border-2 border-white bg-indigo-600 px-2 py-0.5 text-[9px] font-black text-white shadow-[0_0_10px_#6366f1]">
                🚩 원정대
              </span>
            </div>
          );
        })()}

        {/* Floating Zoom & Reset Buttons (Right Edge of Map) */}
        <div className="absolute right-2.5 top-24 z-40 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setZoomScale(z => Math.min(3.5, z * 1.35))}
            className="pixel-btn flex h-9 w-9 items-center justify-center rounded border-2 border-emerald-500 bg-[#162a1d] text-emerald-200 shadow-xl hover:bg-[#203a27] active:scale-95"
            aria-label="지도 확대"
          >
            <ZoomIn className="!h-4 !w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomScale(z => Math.max(0.5, z / 1.35))}
            className="pixel-btn flex h-9 w-9 items-center justify-center rounded border-2 border-emerald-500 bg-[#162a1d] text-emerald-200 shadow-xl hover:bg-[#203a27] active:scale-95"
            aria-label="지도 축소"
          >
            <ZoomOut className="!h-4 !w-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="pixel-btn flex h-9 w-9 items-center justify-center rounded border-2 border-emerald-500 bg-[#162a1d] text-emerald-200 shadow-xl hover:bg-[#203a27] active:scale-95"
            aria-label="화면 중앙 초기화"
          >
            <RotateCcw className="!h-3.5 !w-3.5" />
          </button>
        </div>
      </div>

      {/* ──────────────── SELECTED SPOT ACTION FLOATER (Bottom Center) ──────────────── */}
      {selectedSpot && (
        <div className="absolute inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+6.5rem)] z-40 pixel-frame max-w-md mx-auto space-y-2 bg-[#0f1d14]/95 p-3 shadow-2xl border-2 border-emerald-500 text-white rounded">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-400">{selectedSpot.kindLabel}</span>
              <b className="block text-sm text-white drop-shadow">
                {selectedSpot.name}
                {selectedSpot.probabilityPct !== undefined && ` (확률 ${selectedSpot.probabilityPct}%)`}
              </b>
            </div>
            <div className="text-right text-[10px] text-emerald-200/80">
              <span>거리 {selectedSpot.distanceM ?? Math.round(distanceM(center, selectedSpot))}m</span>
              <button
                type="button"
                onClick={() => setSelectedSpot(null)}
                className="ml-2 text-rose-400 font-bold underline"
              >
                닫기
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onDispatchTo({ lat: selectedSpot.lat, lng: selectedSpot.lng }, selectedSpot.name);
                onClose();
              }}
              className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2 text-xs border-2 border-emerald-400 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
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
              className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2 text-xs border-2 border-emerald-600 bg-[#162a1d] hover:bg-[#203a27] text-emerald-200 font-bold"
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
              className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2 text-xs border-2 border-amber-600 bg-[#241c10] hover:bg-[#342716] text-amber-200 font-bold"
            >
              <Star className="!h-3.5 !w-3.5" />
              즐겨찾기 추가
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────── BOTTOM LEFT: FAVORITE COORDINATES MANAGER BOX ──────────────── */}
      <div className="absolute left-2.5 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-sm flex flex-col items-start">
        {/* Toggle Pill Button */}
        <button
          type="button"
          onClick={() => setFavBoxOpen(o => !o)}
          className="pixel-btn flex items-center gap-1.5 py-1 px-3 text-xs rounded border-2 border-emerald-500 bg-[#162a1d] text-emerald-100 font-bold shadow-xl hover:bg-[#203a27]"
        >
          <span>⭐ 즐겨찾기 좌표 관리</span>
          <span className="rounded bg-black/50 px-1 text-[10px] text-emerald-300 font-mono">
            {favorites.length}/{MAX_FAVORITE_SPOTS}
          </span>
          <span className="text-[10px] text-emerald-400">
            {favBoxOpen ? '▼ 접기' : '▲ 펼치기'}
          </span>
        </button>

        {/* Collapsible Panel */}
        {favBoxOpen && (
          <div className="pixel-frame mt-1.5 w-full space-y-1.5 rounded bg-[#0d1911]/95 p-2.5 shadow-2xl border-2 border-emerald-600 max-h-56 overflow-y-auto text-white">
            {/* Quick Add Bar */}
            <div className="flex gap-1">
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="장소 이름 (예: 흑요석 광맥)"
                maxLength={18}
                className="pixel-box min-w-0 flex-1 rounded bg-[#162a1d] border border-emerald-700 px-2 py-1 text-xs text-white placeholder:text-emerald-300/40 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                disabled={favorites.length >= MAX_FAVORITE_SPOTS}
                onClick={() => addQuickFavorite(pos, `내 스팟 #${favorites.length + 1}`)}
                className="pixel-btn flex items-center gap-1 py-1 px-2.5 text-xs font-bold rounded border border-emerald-400 bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40"
              >
                <Plus className="!h-3 !w-3" />
                현위치
              </button>
            </div>

            {/* Favorite Item Rows */}
            {!favorites.length ? (
              <p className="py-2 text-center text-[11px] text-emerald-300/60">
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
                      className={`pixel-box flex items-center justify-between gap-1 rounded p-1.5 ${
                        isTracked
                          ? 'border border-emerald-400 bg-emerald-950/80 text-white'
                          : 'border border-emerald-900 bg-[#14231a] text-emerald-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <b className="truncate text-[11px] text-white">
                            #{idx + 1} {fav.name}
                          </b>
                          {isTracked && (
                            <span className="rounded bg-emerald-600 px-1 text-[8px] text-white font-bold">
                              안내 중
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-emerald-300/70">
                          {dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${dist}m`} ({fav.lat.toFixed(4)}, {fav.lng.toFixed(4)})
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDispatchTo({ lat: fav.lat, lng: fav.lng }, fav.name);
                            onClose();
                          }}
                          className="pixel-btn rounded py-0.5 px-2 text-[10px] font-bold border border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                          파견
                        </button>
                        <button
                          type="button"
                          onClick={() => onTrack(isTracked ? null : fav.id)}
                          className={`pixel-btn rounded py-0.5 px-2 text-[10px] font-bold border ${
                            isTracked
                              ? 'border-emerald-300 bg-emerald-500 text-black'
                              : 'border-emerald-700 bg-[#1e3424] text-emerald-200'
                          }`}
                        >
                          {isTracked ? '끄기' : '안내'}
                        </button>
                        <button
                          type="button"
                          aria-label={`${fav.name} 삭제`}
                          onClick={() => onRemoveFavorite(fav.id)}
                          className="flex h-6 w-6 items-center justify-center rounded text-rose-400 hover:bg-rose-950/50"
                        >
                          <Trash2 className="!h-3 !w-3" />
                        </button>
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
