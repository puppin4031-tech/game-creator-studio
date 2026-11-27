import React, { useMemo } from 'react';
import type { LatLng } from '@/lib/survival/types';
import { getNearbyDecorativeProps, type MapDecorativeProp } from '@/utils/mapPropGenerator';
import { useSpriteAnimations, type SpriteAnimationsData } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from '@/components/survival/SpriteAnimator';
import jungleTreeArt from '@/assets/props/prop_jungle_tree.webp.asset.json';
import palmTreeArt from '@/assets/props/prop_palm_tree.webp.asset.json';
import bushArt from '@/assets/props/prop_bush.webp.asset.json';
import grassTuftArt from '@/assets/props/prop_grass_tuft.webp.asset.json';
import mossyRockArt from '@/assets/props/prop_mossy_rock.webp.asset.json';
import { computeEntityZIndex, isOccludedByCanopy } from '@/utils/depthSorting';

interface MapFoliageOverlayProps {
  center: LatLng;
  playerPos?: LatLng | null;
  basePos?: LatLng | null;
  project: (p: LatLng) => { x: number; y: number };
  metersPerPx: number;
}

// Admin sprite keys for decorative props (uploaded in /admin/sprites); bundled WebP & crisp SVG stay as fallbacks.
export const PROP_SPRITE_KEYS: Record<MapDecorativeProp['type'], string> = {
  jungle_tree: 'prop-jungle-tree',
  palm_tree: 'prop-palm-tree',
  bush: 'prop-bush',
  grass_tuft: 'prop-grass-tuft',
  mossy_rock: 'prop-mossy-rock',
};

// Base heights sized so detailed prop illustrations retain clear silhouettes without sub-pixel downscale crushing.
const PROP_BASE_SIZE: Record<MapDecorativeProp['type'], { w: number; h: number }> = {
  jungle_tree: { w: 68, h: 80 },
  palm_tree: { w: 64, h: 72 },
  bush: { w: 44, h: 34 },
  grass_tuft: { w: 34, h: 26 },
  mossy_rock: { w: 44, h: 34 },
};

// Bundled default high-res artwork; admin uploads override, crisp 16-bit SVG is the final fallback.
const PROP_DEFAULT_ART: Record<MapDecorativeProp['type'], string> = {
  jungle_tree: jungleTreeArt.url,
  palm_tree: palmTreeArt.url,
  bush: bushArt.url,
  grass_tuft: grassTuftArt.url,
  mossy_rock: mossyRockArt.url,
};

// ── High-Resolution Crisp 16-Bit Pixel-Art Fallback SVGs (Native integer px — zero CSS scale blur) ──
function JungleTreeSvg({ width, height }: { width: number; height: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 68 84"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="block select-none"
    >
      <rect x="16" y="77" width="36" height="4" fill="#14110f" opacity="0.38" />
      <rect x="20" y="75" width="28" height="2" fill="#14110f" opacity="0.28" />
      <rect x="20" y="81" width="28" height="2" fill="#14110f" opacity="0.24" />
      <rect x="28" y="42" width="12" height="36" fill="#2b180d" />
      <rect x="24" y="68" width="4" height="10" fill="#2b180d" />
      <rect x="21" y="73" width="4" height="6" fill="#2b180d" />
      <rect x="40" y="69" width="4" height="9" fill="#2b180d" />
      <rect x="43" y="74" width="4" height="5" fill="#2b180d" />
      <rect x="30" y="44" width="8" height="33" fill="#4e2e18" />
      <rect x="26" y="70" width="4" height="7" fill="#4e2e18" />
      <rect x="39" y="71" width="4" height="6" fill="#3d2312" />
      <rect x="32" y="46" width="3" height="28" fill="#6f4424" />
      <rect x="33" y="50" width="2" height="18" fill="#8b5a32" />
      <rect x="35" y="53" width="2" height="6" fill="#2b180d" />
      <rect x="31" y="63" width="2" height="7" fill="#3d2312" />
      <rect x="20" y="38" width="9" height="4" fill="#3d2312" />
      <rect x="40" y="39" width="8" height="4" fill="#2b180d" />
      <rect x="15" y="40" width="2" height="14" fill="#1f4d1b" />
      <rect x="16" y="46" width="2" height="11" fill="#35752d" />
      <rect x="50" y="41" width="2" height="12" fill="#1f4d1b" />
      <rect x="49" y="45" width="2" height="9" fill="#35752d" />
      <rect x="10" y="22" width="48" height="22" fill="#0f260e" />
      <rect x="6" y="26" width="56" height="14" fill="#0f260e" />
      <rect x="14" y="13" width="40" height="16" fill="#0f260e" />
      <rect x="20" y="7" width="28" height="12" fill="#0f260e" />
      <rect x="25" y="4" width="18" height="6" fill="#0f260e" />
      <rect x="8" y="25" width="52" height="13" fill="#1b4318" />
      <rect x="12" y="16" width="44" height="24" fill="#1b4318" />
      <rect x="18" y="9" width="32" height="16" fill="#1b4318" />
      <rect x="24" y="6" width="20" height="8" fill="#1b4318" />
      <rect x="10" y="23" width="18" height="11" fill="#2d6a26" />
      <rect x="38" y="24" width="20" height="10" fill="#2d6a26" />
      <rect x="15" y="14" width="38" height="14" fill="#2d6a26" />
      <rect x="20" y="8" width="28" height="12" fill="#2d6a26" />
      <rect x="25" y="5" width="18" height="6" fill="#2d6a26" />
      <rect x="27" y="32" width="4" height="5" fill="#1b4318" />
      <rect x="43" y="31" width="4" height="5" fill="#1b4318" />
      <rect x="19" y="21" width="3" height="4" fill="#1b4318" />
      <rect x="12" y="22" width="12" height="6" fill="#469238" />
      <rect x="17" y="13" width="16" height="8" fill="#469238" />
      <rect x="35" y="15" width="14" height="7" fill="#469238" />
      <rect x="41" y="23" width="13" height="6" fill="#469238" />
      <rect x="22" y="7" width="22" height="7" fill="#469238" />
      <rect x="26" y="5" width="14" height="4" fill="#469238" />
      <rect x="27" y="5" width="10" height="3" fill="#74bf54" />
      <rect x="23" y="9" width="8" height="3" fill="#74bf54" />
      <rect x="36" y="10" width="6" height="2" fill="#74bf54" />
      <rect x="18" y="14" width="9" height="3" fill="#74bf54" />
      <rect x="13" y="22" width="6" height="2" fill="#74bf54" />
      <rect x="43" y="23" width="6" height="2" fill="#74bf54" />
      <rect x="29" y="5" width="4" height="2" fill="#a3e079" />
      <rect x="20" y="14" width="4" height="2" fill="#a3e079" />
    </svg>
  );
}

function PalmTreeSvg({ width, height }: { width: number; height: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 78"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="block select-none"
    >
      <rect x="18" y="72" width="28" height="3" fill="#14110f" opacity="0.38" />
      <rect x="22" y="70" width="20" height="2" fill="#14110f" opacity="0.25" />
      <rect x="22" y="75" width="20" height="2" fill="#14110f" opacity="0.22" />
      <rect x="27" y="64" width="10" height="9" fill="#362012" />
      <rect x="29" y="65" width="6" height="7" fill="#5e3a20" />
      <rect x="30" y="66" width="3" height="5" fill="#825330" />
      <rect x="26" y="54" width="9" height="11" fill="#362012" />
      <rect x="28" y="55" width="5" height="9" fill="#5e3a20" />
      <rect x="29" y="56" width="2" height="7" fill="#825330" />
      <rect x="27" y="44" width="8" height="11" fill="#362012" />
      <rect x="29" y="45" width="4" height="9" fill="#5e3a20" />
      <rect x="30" y="46" width="2" height="7" fill="#825330" />
      <rect x="29" y="34" width="7" height="11" fill="#362012" />
      <rect x="30" y="35" width="4" height="9" fill="#5e3a20" />
      <rect x="31" y="36" width="2" height="7" fill="#825330" />
      <rect x="30" y="25" width="7" height="10" fill="#362012" />
      <rect x="31" y="26" width="4" height="8" fill="#6d4426" />
      <rect x="27" y="63" width="8" height="1" fill="#26160c" />
      <rect x="26" y="58" width="8" height="1" fill="#26160c" />
      <rect x="27" y="52" width="7" height="1" fill="#26160c" />
      <rect x="28" y="46" width="7" height="1" fill="#26160c" />
      <rect x="29" y="40" width="6" height="1" fill="#26160c" />
      <rect x="30" y="34" width="6" height="1" fill="#26160c" />
      <rect x="30" y="29" width="6" height="1" fill="#26160c" />
      <rect x="27" y="22" width="5" height="5" fill="#472810" />
      <rect x="28" y="23" width="3" height="3" fill="#8c5220" />
      <rect x="34" y="23" width="5" height="5" fill="#472810" />
      <rect x="35" y="24" width="3" height="3" fill="#a66329" />
      <rect x="31" y="24" width="4" height="4" fill="#6b3d17" />
      <rect x="10" y="19" width="20" height="4" fill="#143311" />
      <rect x="6" y="22" width="12" height="4" fill="#143311" />
      <rect x="36" y="19" width="20" height="4" fill="#143311" />
      <rect x="48" y="22" width="10" height="4" fill="#143311" />
      <rect x="14" y="15" width="18" height="4" fill="#23571e" />
      <rect x="8" y="17" width="12" height="4" fill="#23571e" />
      <rect x="4" y="20" width="8" height="4" fill="#1c4718" />
      <rect x="3" y="24" width="4" height="4" fill="#143311" />
      <rect x="8" y="21" width="2" height="4" fill="#23571e" />
      <rect x="13" y="19" width="2" height="5" fill="#23571e" />
      <rect x="18" y="19" width="2" height="4" fill="#23571e" />
      <rect x="23" y="19" width="2" height="4" fill="#23571e" />
      <rect x="18" y="9" width="15" height="4" fill="#357a2c" />
      <rect x="12" y="11" width="10" height="4" fill="#357a2c" />
      <rect x="9" y="13" width="6" height="3" fill="#23571e" />
      <rect x="16" y="10" width="14" height="2" fill="#5da64b" />
      <rect x="34" y="15" width="18" height="4" fill="#23571e" />
      <rect x="46" y="17" width="12" height="4" fill="#23571e" />
      <rect x="54" y="20" width="7" height="4" fill="#1c4718" />
      <rect x="58" y="24" width="4" height="4" fill="#143311" />
      <rect x="40" y="19" width="2" height="4" fill="#23571e" />
      <rect x="45" y="19" width="2" height="5" fill="#23571e" />
      <rect x="50" y="20" width="2" height="4" fill="#23571e" />
      <rect x="55" y="23" width="2" height="4" fill="#23571e" />
      <rect x="33" y="9" width="15" height="4" fill="#357a2c" />
      <rect x="44" y="11" width="10" height="4" fill="#357a2c" />
      <rect x="51" y="13" width="6" height="3" fill="#23571e" />
      <rect x="35" y="10" width="13" height="2" fill="#5da64b" />
      <rect x="28" y="6" width="10" height="14" fill="#357a2c" />
      <rect x="26" y="4" width="6" height="6" fill="#5da64b" />
      <rect x="34" y="5" width="6" height="5" fill="#5da64b" />
      <rect x="30" y="3" width="6" height="9" fill="#7ec464" />
      <rect x="12" y="16" width="16" height="2" fill="#5da64b" />
      <rect x="37" y="16" width="15" height="2" fill="#5da64b" />
      <rect x="31" y="3" width="4" height="3" fill="#a8e386" />
    </svg>
  );
}

function BushSvg({ width, height }: { width: number; height: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 46 36"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="block select-none"
    >
      <rect x="6" y="31" width="34" height="3" fill="#14110f" opacity="0.36" />
      <rect x="10" y="34" width="26" height="1" fill="#14110f" opacity="0.22" />
      <rect x="6" y="15" width="34" height="16" fill="#10290e" />
      <rect x="4" y="18" width="38" height="11" fill="#10290e" />
      <rect x="10" y="10" width="26" height="10" fill="#10290e" />
      <rect x="15" y="7" width="16" height="6" fill="#10290e" />
      <rect x="6" y="17" width="34" height="12" fill="#1e4a19" />
      <rect x="9" y="12" width="28" height="16" fill="#1e4a19" />
      <rect x="15" y="8" width="16" height="10" fill="#1e4a19" />
      <rect x="8" y="16" width="12" height="9" fill="#32702a" />
      <rect x="26" y="16" width="12" height="9" fill="#32702a" />
      <rect x="13" y="10" width="20" height="12" fill="#32702a" />
      <rect x="17" y="8" width="12" height="6" fill="#32702a" />
      <rect x="10" y="15" width="8" height="4" fill="#529c44" />
      <rect x="16" y="9" width="13" height="5" fill="#529c44" />
      <rect x="28" y="15" width="7" height="4" fill="#529c44" />
      <rect x="18" y="8" width="8" height="2" fill="#82c96e" />
      <rect x="11" y="15" width="4" height="2" fill="#82c96e" />
      <rect x="11" y="21" width="3" height="3" fill="#b91c1c" />
      <rect x="11" y="21" width="2" height="2" fill="#f87171" />
      <rect x="31" y="19" width="3" height="3" fill="#b91c1c" />
      <rect x="31" y="19" width="2" height="2" fill="#ef4444" />
      <rect x="21" y="22" width="3" height="3" fill="#d97706" />
      <rect x="21" y="22" width="2" height="2" fill="#fbbf24" />
      <rect x="25" y="13" width="2" height="2" fill="#fde047" />
    </svg>
  );
}

function GrassTuftSvg({ width, height }: { width: number; height: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 38 30"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="block select-none"
    >
      <rect x="7" y="26" width="24" height="2" fill="#14110f" opacity="0.32" />
      <rect x="10" y="28" width="18" height="1" fill="#14110f" opacity="0.2" />
      <rect x="9" y="22" width="20" height="5" fill="#173814" />
      <rect x="7" y="16" width="3" height="8" fill="#1f4d1b" />
      <rect x="5" y="12" width="3" height="5" fill="#35752c" />
      <rect x="4" y="9" width="2" height="4" fill="#5da34e" />
      <rect x="12" y="13" width="3" height="11" fill="#1f4d1b" />
      <rect x="11" y="8" width="3" height="7" fill="#35752c" />
      <rect x="10" y="5" width="2" height="4" fill="#6ab558" />
      <rect x="9" y="3" width="2" height="2" fill="#9be082" />
      <rect x="17" y="11" width="4" height="14" fill="#1f4d1b" />
      <rect x="18" y="6" width="3" height="8" fill="#3c8232" />
      <rect x="19" y="3" width="2" height="4" fill="#74bf60" />
      <rect x="20" y="1" width="2" height="2" fill="#a8e88e" />
      <rect x="23" y="13" width="3" height="11" fill="#1f4d1b" />
      <rect x="24" y="8" width="3" height="6" fill="#35752c" />
      <rect x="26" y="5" width="2" height="4" fill="#6ab558" />
      <rect x="27" y="17" width="3" height="7" fill="#1f4d1b" />
      <rect x="29" y="13" width="3" height="5" fill="#35752c" />
      <rect x="31" y="10" width="2" height="3" fill="#5da34e" />
      <rect x="14" y="14" width="2" height="2" fill="#fde047" />
      <rect x="25" y="16" width="2" height="2" fill="#f9a8d4" />
    </svg>
  );
}

function MossyRockSvg({ width, height }: { width: number; height: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 46 36"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="block select-none"
    >
      <rect x="5" y="31" width="36" height="3" fill="#14110f" opacity="0.4" />
      <rect x="9" y="34" width="28" height="1" fill="#14110f" opacity="0.24" />
      <rect x="5" y="16" width="36" height="16" fill="#1c1917" />
      <rect x="8" y="11" width="30" height="7" fill="#1c1917" />
      <rect x="12" y="8" width="22" height="5" fill="#1c1917" />
      <rect x="7" y="17" width="32" height="13" fill="#383431" />
      <rect x="10" y="13" width="26" height="15" fill="#4f4a45" />
      <rect x="9" y="18" width="14" height="9" fill="#66605b" />
      <rect x="12" y="15" width="15" height="8" fill="#7d7670" />
      <rect x="14" y="16" width="8" height="4" fill="#9c948d" />
      <rect x="28" y="19" width="10" height="10" fill="#2e2a27" />
      <rect x="21" y="20" width="2" height="8" fill="#24201e" />
      <rect x="19" y="24" width="3" height="2" fill="#24201e" />
      <rect x="31" y="21" width="1" height="6" fill="#1c1917" />
      <rect x="8" y="10" width="28" height="6" fill="#1b4318" />
      <rect x="11" y="7" width="22" height="6" fill="#2c6625" />
      <rect x="14" y="6" width="16" height="4" fill="#468f3a" />
      <rect x="16" y="6" width="9" height="2" fill="#76bf62" />
      <rect x="10" y="15" width="3" height="5" fill="#2c6625" />
      <rect x="11" y="15" width="2" height="3" fill="#468f3a" />
      <rect x="18" y="13" width="4" height="6" fill="#2c6625" />
      <rect x="19" y="13" width="2" height="4" fill="#468f3a" />
      <rect x="26" y="14" width="3" height="7" fill="#1b4318" />
      <rect x="26" y="14" width="2" height="4" fill="#2c6625" />
      <rect x="32" y="15" width="3" height="4" fill="#2c6625" />
      <rect x="25" y="4" width="2" height="3" fill="#468f3a" />
      <rect x="26" y="3" width="2" height="2" fill="#8ad472" />
      <rect x="36" y="28" width="5" height="4" fill="#292524" />
      <rect x="37" y="29" width="3" height="2" fill="#57534e" />
    </svg>
  );
}

function DefaultPropSvg({
  type,
  width,
  height,
}: {
  type: MapDecorativeProp['type'];
  width: number;
  height: number;
}) {
  switch (type) {
    case 'jungle_tree':
      return <JungleTreeSvg width={width} height={height} />;
    case 'palm_tree':
      return <PalmTreeSvg width={width} height={height} />;
    case 'bush':
      return <BushSvg width={width} height={height} />;
    case 'grass_tuft':
      return <GrassTuftSvg width={width} height={height} />;
    case 'mossy_rock':
      return <MossyRockSvg width={width} height={height} />;
    default:
      return null;
  }
}

function DefaultPropArt({
  type,
  width,
  height,
}: {
  type: MapDecorativeProp['type'];
  width: number;
  height: number;
}) {
  const [failed, setFailed] = React.useState(false);
  if (failed) return <DefaultPropSvg type={type} width={width} height={height} />;
  return (
    <img
      src={PROP_DEFAULT_ART[type]}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      onError={() => setFailed(true)}
      style={{
        height: `${height}px`,
        width: 'auto',
        // High-res WebP prop illustrations MUST use smooth hardware mipmap sampling ('auto'),
        // NOT 'pixelated' (which point-skips 512px->34px into jagged aliased noise)!
        imageRendering: 'auto',
      }}
      className="block select-none"
    />
  );
}

// Contact shadow & grounding sink ratios so trees, palms, bushes, grass, and rocks sit firmly planted on the terrain
const PROP_GROUNDING: Record<
  MapDecorativeProp['type'],
  { shadowW: number; shadowH: number; sinkPx: number }
> = {
  jungle_tree: { shadowW: 0.56, shadowH: 9, sinkPx: 4 },
  palm_tree: { shadowW: 0.48, shadowH: 8, sinkPx: 4 },
  bush: { shadowW: 0.78, shadowH: 7, sinkPx: 3 },
  grass_tuft: { shadowW: 0.72, shadowH: 5, sinkPx: 2 },
  mossy_rock: { shadowW: 0.84, shadowH: 8, sinkPx: 3 },
};

function PropVisual({
  type,
  animData,
  finalScale,
}: {
  type: MapDecorativeProp['type'];
  animData?: SpriteAnimationsData;
  finalScale: number;
}) {
  const baseDim = PROP_BASE_SIZE[type];
  const userScale = animData?.scale ?? animData?._scale ?? 1;
  // Render directly at final integer target size — NO CSS transform: scale() bitmap blur!
  const targetH = Math.max(18, Math.round(baseDim.h * userScale * finalScale));
  const targetW = Math.max(20, Math.round((baseDim.w * userScale * finalScale) / 2) * 2);

  const grounding = PROP_GROUNDING[type];
  const shadowWidth = Math.max(14, Math.round(targetW * grounding.shadowW));
  const shadowHeight = Math.max(4, Math.round(grounding.shadowH * Math.min(1.25, finalScale)));
  const sinkOffset = Math.round(grounding.sinkPx * Math.min(1.2, finalScale));

  const fallback = <DefaultPropArt type={type} width={targetW} height={targetH} />;
  const anim = animData?.idle;
  const spriteNode =
    anim?.url && !anim.url.startsWith('local://') ? (
      <SpriteAnimator
        url={anim.url}
        frames={Math.max(1, anim.frame_count || 1)}
        fps={anim.fps}
        height={targetH}
        smooth
        fallback={fallback}
      />
    ) : (
      fallback
    );

  return (
    <div className="relative flex flex-col items-center justify-end">
      {/* Ground contact shadow anchored directly at the terrain coordinate */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 rounded-full bg-black/40 blur-[2px]"
        style={{
          width: `${shadowWidth}px`,
          height: `${shadowHeight}px`,
        }}
      />
      {/* Sink the trunk/base slightly into the contact shadow so it looks rooted in the soil */}
      <div
        className="relative z-10 flex items-end justify-center"
        style={{
          transform: `translateY(${sinkOffset}px)`,
        }}
      >
        {spriteNode}
      </div>
    </div>
  );
}

export function MapFoliageOverlay({
  center,
  playerPos,
  basePos,
  project,
  metersPerPx,
}: MapFoliageOverlayProps) {
  // Hoist sprite queries once per prop type (5 hooks total instead of 35 per map render!)
  const { data: jungleAnim } = useSpriteAnimations(PROP_SPRITE_KEYS.jungle_tree);
  const { data: palmAnim } = useSpriteAnimations(PROP_SPRITE_KEYS.palm_tree);
  const { data: bushAnim } = useSpriteAnimations(PROP_SPRITE_KEYS.bush);
  const { data: grassAnim } = useSpriteAnimations(PROP_SPRITE_KEYS.grass_tuft);
  const { data: rockAnim } = useSpriteAnimations(PROP_SPRITE_KEYS.mossy_rock);

  const animByType: Record<MapDecorativeProp['type'], SpriteAnimationsData | undefined> = {
    jungle_tree: jungleAnim,
    palm_tree: palmAnim,
    bush: bushAnim,
    grass_tuft: grassAnim,
    mossy_rock: rockAnim,
  };

  // 1. Compute deterministic props within 150m (capped at 35, base exclusion 18m)
  const props = useMemo(() => {
    return getNearbyDecorativeProps(center, basePos, 150, 35);
  }, [center.lat, center.lng, basePos?.lat, basePos?.lng]);

  // Dynamic scale adjustment according to zoom
  const zoomScale = Math.max(0.8, Math.min(1.4, 0.55 / Math.max(0.1, metersPerPx)));

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {props.map((prop) => {
        const pt = project(prop.pos);

        // Viewport bounds check for mobile performance
        if (
          pt.x < -80 ||
          pt.x > (typeof window !== 'undefined' ? window.innerWidth + 80 : 1200) ||
          pt.y < -80 ||
          pt.y > (typeof window !== 'undefined' ? window.innerHeight + 80 : 1200)
        ) {
          return null;
        }

        const finalScale = prop.scale * zoomScale;
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
              transform: prop.flip ? 'translate(-50%, -100%) scaleX(-1)' : 'translate(-50%, -100%)',
              transformOrigin: 'center bottom',
              zIndex,
              opacity: isOccluded ? 0.45 : 1,
            }}
          >
            <PropVisual
              type={prop.type}
              animData={animByType[prop.type]}
              finalScale={finalScale}
            />
          </div>
        );
      })}
    </div>
  );
}
