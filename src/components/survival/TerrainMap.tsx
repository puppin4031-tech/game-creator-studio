import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toast } from 'sonner';
import type { LatLng } from '@/lib/survival/types';
import { terrainOnlyStyle } from '@/lib/survival/mapStyle';

maplibregl.setWorkerUrl(workerUrl);

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Fetch the style and strip every label, POI, building and brand layer so only terrain remains. */
async function loadTerrainStyle(): Promise<maplibregl.StyleSpecification> {
  const res = await fetch(STYLE_URL);
  if (!res.ok) throw new Error(`style ${res.status}`);
  const style = (await res.json()) as maplibregl.StyleSpecification;
  return terrainOnlyStyle(style, getComputedStyle(document.documentElement).getPropertyValue('--survival-ground').trim());
}

export interface Projected { x: number; y: number }

interface Props {
  center: LatLng;
  visionM: number;
  explored: LatLng[];
  onTap?: (p: LatLng) => void;
  /** Render overlays given a projection function. Re-invoked on every map move. */
  children: (project: (p: LatLng) => Projected, metersPerPx: number) => ReactNode;
}

export default function TerrainMap({ center, visionM, explored, onTap, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const fog = useRef<HTMLCanvasElement>(null);
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
        resize = new ResizeObserver(() => { map.resize(); setFrame(f => f + 1); drawFog(); });
        resize.observe(box.current);
        map.on('move', () => setFrame((f) => f + 1));
        map.on('render', drawFog);
        map.on('click', (e) => tapRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
      } catch (e) {
        console.error('[TerrainMap] style load failed', e);
        toast.error('지형 지도를 불러오지 못했습니다', { description: '네트워크를 확인해 주세요' });
      }
    })();
    return () => { cancelled = true; resize?.disconnect(); mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow player.
  useEffect(() => { mapRef.current?.easeTo({ center: [center.lng, center.lat], duration: 600 }); }, [center.lat, center.lng]);
  useEffect(() => { drawFog(); }, [explored.length, visionM]);

  function metersPerPx(map: maplibregl.Map) {
    const lat = map.getCenter().lat;
    return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, map.getZoom() + 1);
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
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--survival-fog').trim();
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
      <div ref={box} className="absolute inset-0 [&_canvas]:[filter:saturate(0.65)_sepia(0.25)_contrast(1.05)]" />
      <canvas ref={fog} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0">{map && children(project, metersPerPx(map))}</div>
    </div>
  );
}
