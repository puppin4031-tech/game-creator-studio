import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';
import type { LatLng } from '@/lib/survival/types';
import { terrainOnlyStyle, type TerrainPalette } from '@/lib/survival/mapStyle';
import { terrainDecorations } from '@/lib/survival/terrainScenery';
import { classifyTerrain, type TerrainZone } from '@/lib/survival/terrainZone';

type Rgba = [number, number, number, number];
function parseColor(c: string): Rgba {
  const v = c.trim();
  if (v.startsWith('#')) {
    const h = v.length === 4 ? v.slice(1).split('').map(x => x + x).join('') : v.slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const n = v.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
  return [n[0], n[1], n[2], n[3] ?? 1];
}
const rgba = (c: Rgba) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;
const zoneColor = (zone: TerrainZone, key: 'ground' | 'fog') =>
  parseColor(getComputedStyle(document.documentElement).getPropertyValue(`--survival-zone-${zone}-${key}`) || '#000');
/** Probe offsets (meters) around the player used to sample real surfaces. */
const PROBE_M = [-60, -30, 0, 30, 60];

maplibregl.setWorkerUrl(workerUrl);

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Fetch the style and strip every label, POI, building and brand layer so only terrain remains. */
async function loadTerrainStyle(): Promise<maplibregl.StyleSpecification> {
  const res = await fetch(STYLE_URL);
  if (!res.ok) throw new Error(`style ${res.status}`);
  const style = (await res.json()) as maplibregl.StyleSpecification;
  const css = getComputedStyle(document.documentElement);
  const color = (key: string) => css.getPropertyValue(`--survival-${key}`).trim();
  const palette: TerrainPalette = { forest: color('forest'), grass: color('grass'), wetland: color('wetland'),
    water: color('water'), shore: color('shore'), ice: color('ice'), path: color('path'), pathEdge: color('path-edge') };
  return terrainOnlyStyle(style, color('ground'), palette);
}

export interface Projected { x: number; y: number }

interface Props {
  center: LatLng;
  visionM: number;
  explored: LatLng[];
  onTap?: (p: LatLng) => void;
  /** Render overlays given a projection function. Re-invoked on every map move. */
  /** Terrain zone currently shown; drives ground and fog tint transitions. */
  zone?: TerrainZone;
  /** Called after the map settles with the zone sampled from real surfaces around `center`. */
  onSurfaceZone?: (center: LatLng, zone: TerrainZone) => void;
  /** Map bearing in degrees (0 = north up). */
  bearing?: number;
  children: (project: (p: LatLng) => Projected, metersPerPx: number) => ReactNode;
}

export default function TerrainMap({ center, visionM, explored, onTap, zone = 'plains', onSurfaceZone, bearing = 0, children }: Props) {
  const zoneRef = useRef(onSurfaceZone);
  zoneRef.current = onSurfaceZone;
  const fogColor = useRef<Rgba | null>(null);
  const fogTarget = useRef<Rgba | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const fog = useRef<HTMLCanvasElement>(null);
  const scenery = useRef<HTMLCanvasElement>(null);
  const sceneryDirty = useRef(true);
  const surfaceCache = useRef(new Map<string, boolean>());
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [, setFrame] = useState(0);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;
  const fogData = useRef({ center, visionM, explored });
  fogData.current = { center, visionM, explored };

  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | null = null;
    (async () => {
      try {
        const style = await loadTerrainStyle();
        if (cancelled || !box.current) return;
        const map = new maplibregl.Map({
          container: box.current, style, center: [fogData.current.center.lng, fogData.current.center.lat], zoom: 17.5,
          minZoom: 15, maxZoom: 19.5, attributionControl: { compact: true }, pitchWithRotate: false, dragRotate: false,
        });
        mapRef.current = map;
        setFrame(f => f + 1);
        resize = new ResizeObserver(() => { map.resize(); sceneryDirty.current = true; setFrame(f => f + 1); drawFog(); });
        resize.observe(box.current);
        map.on('move', () => { sceneryDirty.current = true; setFrame((f) => f + 1); });
        map.on('idle', () => { surfaceCache.current.clear(); drawScenery(true); sampleSurface(); });
        map.on('render', () => { if (sceneryDirty.current) { drawScenery(); sceneryDirty.current = false; } drawFog(); });
        map.on('click', (e) => tapRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
      } catch (e) {
        console.error('[TerrainMap] style load failed', e);
        toast.error('지형 지도를 불러오지 못했습니다', { description: '네트워크를 확인해 주세요' });
      }
    })();
    return () => { cancelled = true; resize?.disconnect(); mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smoothly retint ground (MapLibre paint transition) and fog (lerped per frame) on zone change.
  useEffect(() => {
    fogTarget.current = zoneColor(zone, 'fog');
    const map = mapRef.current;
    const bg = map?.getStyle()?.layers.find(l => l.type === 'background');
    if (map && bg) map.setPaintProperty(bg.id, 'background-color-transition', { duration: 2500, delay: 0 });
    if (map && bg) map.setPaintProperty(bg.id, 'background-color', rgba(zoneColor(zone, 'ground')));
    map?.triggerRepaint();
  }, [zone, mapRef.current]);

  // Follow player.
  useEffect(() => { mapRef.current?.easeTo({ center: [center.lng, center.lat], duration: 600 }); }, [center.lat, center.lng]);
  // Heading-up rotation: bearing is already smoothed by the heading hook, so jump without easing.
  useEffect(() => {
    const map = mapRef.current;
    if (map && Math.abs(map.getBearing() - bearing) > 0.2) map.setBearing(bearing);
  }, [bearing, mapRef.current]);
  useEffect(() => { drawFog(); }, [explored.length, visionM]);

  function metersPerPx(map: maplibregl.Map) {
    const lat = map.getCenter().lat;
    return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, map.getZoom() + 1);
  }

  /** A single non-interactive canvas sits beneath fog and gameplay markers. */
  function drawScenery(checkSurfaces = false) {
    const map = mapRef.current, cv = scenery.current, host = box.current;
    if (!map || !cv || !host) return;
    const w = host.clientWidth, h = host.clientHeight, dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    const css = getComputedStyle(document.documentElement);
    const color = (key: string) => css.getPropertyValue(`--survival-deco-${key}`).trim();
    const leaf = color('leaf'), light = color('light'), stone = color('stone'), stoneLight = color('stone-light'), shadow = color('shadow');
    const bounds = map.getBounds();
    const decorations = terrainDecorations({ lat: bounds.getSouth(), lng: bounds.getWest() }, { lat: bounds.getNorth(), lng: bounds.getEast() });
    const waterLayers = map.getStyle().layers.filter(l => l.type === 'fill' && /water/.test(l.id)).map(l => l.id);
    const size = Math.max(0.6, Math.min(1.6, 0.45 / metersPerPx(map)));
    ctx.globalAlpha = 0.65;
    for (const deco of decorations) {
      const p = map.project([deco.lng, deco.lat]);
      if (p.x < -20 || p.y < -20 || p.x > w + 20 || p.y > h + 20) continue;
      if (checkSurfaces && waterLayers.length) surfaceCache.current.set(deco.id, map.queryRenderedFeatures(p, { layers: waterLayers }).length > 0);
      if (surfaceCache.current.get(deco.id)) continue;
      ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.scale(size, size);
      ctx.fillStyle = shadow; ctx.fillRect(-5, 1, 10, 2);
      if (deco.kind === 'pebbles') {
        ctx.fillStyle = stone; ctx.fillRect(-5, -2, 5, 3); ctx.fillRect(2, -1, 3, 2);
        ctx.fillStyle = stoneLight; ctx.fillRect(-4, -3, 3, 2);
      } else {
        ctx.fillStyle = leaf;
        if (deco.kind === 'shrub') { ctx.fillRect(-5, -6, 10, 6); ctx.fillRect(-3, -8, 6, 2); }
        else { ctx.fillRect(-1, -6 - deco.variant, 2, 8); ctx.fillRect(-4, -4, 2, 5); ctx.fillRect(2, -3, 2, 4); }
        ctx.fillStyle = light; ctx.fillRect(-2, -6, 2, 2);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    cv.dataset.decorationCount = String(decorations.length);
  }

  function sampleSurface() {
    const map = mapRef.current;
    if (!map || !zoneRef.current) return;
    const layers = map.getStyle().layers.filter(l => l.type === 'fill' || l.type === 'line');
    const water = layers.filter(l => /water/.test(l.id)).map(l => l.id);
    const rugged = layers.filter(l => l.type === 'fill' && /wood|forest|rock|scree|cliff/.test(l.id)).map(l => l.id);
    const c = fogData.current.center;
    const mLat = 111_320, mLng = 111_320 * Math.cos((c.lat * Math.PI) / 180);
    let w = 0, r = 0, n = 0;
    for (const dx of PROBE_M) for (const dy of PROBE_M) {
      const p = map.project([c.lng + dx / mLng, c.lat + dy / mLat]);
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [[p.x - 3, p.y - 3], [p.x + 3, p.y + 3]];
      if (water.length && map.queryRenderedFeatures(box, { layers: water }).length) w++;
      else if (rugged.length && map.queryRenderedFeatures(box, { layers: rugged }).length) r++;
      n++;
    }
    zoneRef.current(c, classifyTerrain({ water: w / n, rugged: r / n }));
  }

  function drawFog() {
    const map = mapRef.current;
    const cv = fog.current;
    if (!map || !cv || !box.current) return;
    const w = box.current.clientWidth, h = box.current.clientHeight, dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    const target = fogTarget.current ?? zoneColor(zone, 'fog');
    const cur = fogColor.current ?? target;
    const next = cur.map((v, i) => v + (target[i] - v) * 0.06) as Rgba;
    const settled = next.every((v, i) => Math.abs(v - target[i]) < (i === 3 ? 0.002 : 0.5));
    fogColor.current = settled ? target : next;
    if (!settled) map.triggerRepaint();
    ctx.fillStyle = rgba(fogColor.current);
    ctx.fillRect(0, 0, w, h);
    const mpp = metersPerPx(map);
    const { center: c, visionM: v, explored: ex } = fogData.current;
    ctx.globalCompositeOperation = 'destination-out';
    // Remembered terrain: dimly revealed.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const memR = (v * 0.7) / mpp;
    for (const p of ex) {
      const pt = map.project([p.lng, p.lat]);
      if (pt.x < -memR || pt.y < -memR || pt.x > w + memR || pt.y > h + memR) continue;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, memR, 0, Math.PI * 2); ctx.fill();
    }
    // Live vision: fully clear with soft edge.
    const me = map.project([c.lng, c.lat]);
    const r = v / mpp;
    const g = ctx.createRadialGradient(me.x, me.y, r * 0.7, me.x, me.y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(me.x, me.y, r, 0, Math.PI * 2); ctx.fill();
  }

  const map = mapRef.current;
  const project = (p: LatLng): Projected => (map ? map.project([p.lng, p.lat]) : { x: -9999, y: -9999 });

  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      <div ref={box} className="absolute inset-0" />
      <canvas ref={scenery} aria-hidden="true" data-terrain-scenery className="pointer-events-none absolute inset-0 h-full w-full" />
      <canvas ref={fog} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0">{map && children(project, metersPerPx(map))}</div>
    </div>
  );
}
