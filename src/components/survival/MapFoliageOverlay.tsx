import React, { useMemo } from 'react';
import type { LatLng } from '@/lib/survival/types';
import { getNearbyDecorativeProps, type MapDecorativeProp } from '@/utils/mapPropGenerator';
import { computeEntityZIndex, isOccludedByCanopy } from '@/utils/depthSorting';

interface MapFoliageOverlayProps {
  center: LatLng;
  playerPos?: LatLng | null;
  basePos?: LatLng | null;
  project: (p: LatLng) => { x: number; y: number };
  metersPerPx: number;
}

// ── Crisp 16-Bit Pixel-Art SVGs ──
function JungleTreeSvg() {
  return (
    <svg
      width="42"
      height="54"
      viewBox="0 0 42 54"
      className="pixelated drop-shadow-[0_4px_3px_rgba(0,0,0,0.35)]"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Ground Shadow */}
      <ellipse cx="21" cy="51" rx="14" ry="3" fill="#1c1917" opacity="0.45" />

      {/* Trunk */}
      <rect x="18" y="28" width="6" height="23" fill="#3b2314" />
      <rect x="19" y="30" width="4" height="20" fill="#5c381e" />
      <rect x="20" y="32" width="2" height="16" fill="#7a4d28" />
      {/* Root flares */}
      <rect x="16" y="47" width="2" height="4" fill="#3b2314" />
      <rect x="24" y="48" width="2" height="3" fill="#3b2314" />

      {/* Foliage Canopy - Deep Shadow Base */}
      <rect x="9" y="10" width="24" height="20" fill="#142e12" rx="2" />
      <rect x="6" y="14" width="30" height="13" fill="#142e12" rx="2" />

      {/* Main Dark Green Leaves */}
      <rect x="10" y="8" width="22" height="19" fill="#1f4a1b" />
      <rect x="7" y="12" width="28" height="13" fill="#1f4a1b" />
      <rect x="13" y="4" width="16" height="18" fill="#1f4a1b" />

      {/* Mid Green Leaf Tufts */}
      <rect x="12" y="6" width="18" height="14" fill="#336e2b" />
      <rect x="9" y="11" width="24" height="9" fill="#336e2b" />
      <rect x="15" y="3" width="12" height="12" fill="#336e2b" />

      {/* Bright Green Highlights */}
      <rect x="14" y="4" width="10" height="5" fill="#4d943c" />
      <rect x="11" y="9" width="8" height="5" fill="#4d943c" />
      <rect x="23" y="10" width="7" height="4" fill="#4d943c" />
      <rect x="16" y="15" width="8" height="3" fill="#4d943c" />

      {/* Top Sunlight Specks */}
      <rect x="16" y="3" width="5" height="3" fill="#78b858" />
      <rect x="13" y="8" width="4" height="2" fill="#78b858" />
    </svg>
  );
}

function PalmTreeSvg() {
  return (
    <svg
      width="38"
      height="48"
      viewBox="0 0 38 48"
      className="pixelated drop-shadow-[0_4px_3px_rgba(0,0,0,0.35)]"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Ground Shadow */}
      <ellipse cx="19" cy="46" rx="10" ry="2.5" fill="#1c1917" opacity="0.45" />

      {/* Curved Palm Trunk */}
      <rect x="18" y="24" width="4" height="22" fill="#3a2415" />
      <rect x="19" y="25" width="2" height="20" fill="#5a381e" />
      {/* Bark notches */}
      <rect x="17" y="28" width="2" height="2" fill="#3a2415" />
      <rect x="21" y="34" width="2" height="2" fill="#3a2415" />
      <rect x="17" y="40" width="2" height="2" fill="#3a2415" />

      {/* Amber Dates / Nuts */}
      <rect x="18" y="18" width="2" height="3" fill="#c2782b" />
      <rect x="20" y="19" width="2" height="3" fill="#d98c36" />

      {/* Palm Fronds - Spreading outwards */}
      {/* Left Fronds */}
      <rect x="4" y="11" width="15" height="4" fill="#1c4518" />
      <rect x="2" y="14" width="10" height="3" fill="#2d6325" />
      <rect x="7" y="8" width="12" height="4" fill="#3f8232" />
      <rect x="8" y="9" width="8" height="2" fill="#69ab56" />

      {/* Right Fronds */}
      <rect x="19" y="11" width="15" height="4" fill="#1c4518" />
      <rect x="26" y="14" width="10" height="3" fill="#2d6325" />
      <rect x="19" y="8" width="12" height="4" fill="#3f8232" />
      <rect x="22" y="9" width="8" height="2" fill="#69ab56" />

      {/* Top Center Fronds */}
      <rect x="16" y="4" width="6" height="12" fill="#3f8232" />
      <rect x="17" y="3" width="4" height="6" fill="#69ab56" />
      <rect x="18" y="2" width="2" height="3" fill="#92cb7c" />
    </svg>
  );
}

function BushSvg() {
  return (
    <svg
      width="30"
      height="24"
      viewBox="0 0 30 24"
      className="pixelated drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Shadow */}
      <ellipse cx="15" cy="22" rx="11" ry="2" fill="#1c1917" opacity="0.4" />

      {/* Shrub Base & Shadow */}
      <rect x="4" y="8" width="22" height="13" fill="#153612" rx="2" />
      <rect x="6" y="6" width="18" height="14" fill="#24541f" />
      <rect x="8" y="4" width="14" height="14" fill="#39752f" />

      {/* Highlights */}
      <rect x="9" y="6" width="7" height="4" fill="#589a4b" />
      <rect x="18" y="8" width="5" height="4" fill="#589a4b" />
      <rect x="11" y="4" width="4" height="2" fill="#80bf6f" />

      {/* Wild Red & Yellow Berries */}
      <rect x="8" y="11" width="2" height="2" fill="#dc2626" />
      <rect x="21" y="10" width="2" height="2" fill="#ef4444" />
      <rect x="14" y="14" width="2" height="2" fill="#f59e0b" />
      <rect x="17" y="7" width="2" height="2" fill="#eab308" />
    </svg>
  );
}

function GrassTuftSvg() {
  return (
    <svg
      width="24"
      height="18"
      viewBox="0 0 24 18"
      className="pixelated drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Base shadow */}
      <ellipse cx="12" cy="16.5" rx="8" ry="1.5" fill="#1c1917" opacity="0.35" />

      {/* Blades */}
      {/* Blade 1 (Left) */}
      <rect x="4" y="9" width="3" height="7" fill="#234a1e" />
      <rect x="5" y="6" width="2" height="5" fill="#3d7532" />
      <rect x="6" y="4" width="2" height="4" fill="#65a454" />

      {/* Blade 2 (Center Left) */}
      <rect x="9" y="7" width="3" height="9" fill="#234a1e" />
      <rect x="10" y="4" width="2" height="6" fill="#3d7532" />
      <rect x="10" y="2" width="2" height="4" fill="#7cb869" />

      {/* Blade 3 (Center Right) */}
      <rect x="13" y="6" width="3" height="10" fill="#234a1e" />
      <rect x="14" y="3" width="2" height="7" fill="#3d7532" />
      <rect x="15" y="1" width="2" height="4" fill="#91cc7c" />

      {/* Blade 4 (Right) */}
      <rect x="17" y="8" width="3" height="8" fill="#234a1e" />
      <rect x="18" y="5" width="2" height="5" fill="#3d7532" />
      <rect x="19" y="3" width="2" height="3" fill="#65a454" />
    </svg>
  );
}

function MossyRockSvg() {
  return (
    <svg
      width="28"
      height="22"
      viewBox="0 0 28 22"
      className="pixelated drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Shadow */}
      <ellipse cx="14" cy="20" rx="11" ry="2" fill="#1c1917" opacity="0.45" />

      {/* Rock Body */}
      <rect x="4" y="7" width="20" height="13" fill="#292524" rx="2" />
      <rect x="5" y="8" width="18" height="10" fill="#44403c" />
      <rect x="7" y="10" width="14" height="7" fill="#57534e" />
      <rect x="12" y="12" width="8" height="4" fill="#78716c" />

      {/* Crack Lines */}
      <rect x="9" y="11" width="1" height="5" fill="#1c1917" />
      <rect x="10" y="13" width="3" height="1" fill="#1c1917" />

      {/* Dripping Prehistoric Moss Cap */}
      <rect x="5" y="5" width="18" height="5" fill="#24541f" rx="1" />
      <rect x="7" y="4" width="14" height="4" fill="#39752f" />
      <rect x="9" y="3" width="10" height="3" fill="#589a4b" />
      {/* Moss Drips */}
      <rect x="7" y="9" width="2" height="3" fill="#39752f" />
      <rect x="13" y="8" width="2" height="4" fill="#39752f" />
      <rect x="19" y="9" width="2" height="2" fill="#39752f" />
    </svg>
  );
}

function RenderPropSprite({ type }: { type: MapDecorativeProp['type'] }) {
  switch (type) {
    case 'jungle_tree':
      return <JungleTreeSvg />;
    case 'palm_tree':
      return <PalmTreeSvg />;
    case 'bush':
      return <BushSvg />;
    case 'grass_tuft':
      return <GrassTuftSvg />;
    case 'mossy_rock':
      return <MossyRockSvg />;
    default:
      return null;
  }
}

export function MapFoliageOverlay({
  center,
  playerPos,
  basePos,
  project,
  metersPerPx,
}: MapFoliageOverlayProps) {
  // 1. Compute deterministic props within 150m (capped at 35, base exclusion 18m)
  const props = useMemo(() => {
    return getNearbyDecorativeProps(center, basePos, 150, 35);
  }, [center.lat, center.lng, basePos?.lat, basePos?.lng]);

  // Dynamic scale adjustment according to zoom
  const zoomScale = Math.max(0.75, Math.min(1.35, 0.55 / Math.max(0.1, metersPerPx)));

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {props.map((prop) => {
        const pt = project(prop.pos);

        // Viewport bounds check for mobile performance
        if (
          pt.x < -60 ||
          pt.x > (typeof window !== 'undefined' ? window.innerWidth + 60 : 1200) ||
          pt.y < -60 ||
          pt.y > (typeof window !== 'undefined' ? window.innerHeight + 60 : 1200)
        ) {
          return null;
        }

        const finalScale = prop.scale * zoomScale;
        const scaleX = prop.flip ? -finalScale : finalScale;
        const zIndex = computeEntityZIndex(prop.pos.lat, center.lat);
        const isTree = prop.type === 'jungle_tree' || prop.type === 'palm_tree';
        const isOccluded = isTree && isOccludedByCanopy(playerPos, prop.pos);

        return (
          <div
            key={prop.id}
            className="absolute pointer-events-none select-none transition-opacity duration-300"
            style={{
              left: `${pt.x}px`,
              top: `${pt.y}px`,
              transform: `translate(-50%, -100%) scale(${scaleX}, ${finalScale})`,
              transformOrigin: 'bottom center',
              imageRendering: 'pixelated',
              zIndex,
              opacity: isOccluded ? 0.45 : 1,
            }}
          >
            <RenderPropSprite type={prop.type} />
          </div>
        );
      })}
    </div>
  );
}
