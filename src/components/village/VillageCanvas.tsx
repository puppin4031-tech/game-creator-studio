import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Check, Move, Trash2, X } from 'lucide-react';
import {
  buildingAtTile,
  buildingFootprintCells,
  canPlaceVillageBuilding,
  VILLAGE_BUILDINGS,
  wallConnections,
  type PlacedVillageBuilding,
  type VillageBuildingId,
  type VillageState,
} from '@/lib/survival/village';
import {
  computeVillageHeatmaps,
  evaluateBuildingSynergy,
  getBuildingInfluenceRadius,
} from '@/lib/sim/pathfinding';
import {
  type HeatmapOverlayKind,
  type SimResident,
  type TerrainTileKind,
  type VillageSimState,
} from '@/lib/sim/state';
import { tickVillageSim } from '@/lib/sim/tick';
import type { Stack } from '@/lib/survival/types';
import campfireImg from '@/assets/survival/base-campfire.png';
import hutImg from '@/assets/survival/base-hut.png';
import caveImg from '@/assets/survival/base-cave.png';
import outpostImg from '@/assets/survival/base-outpost.png';
import altarImg from '@/assets/survival/dolmen-shrine.png';
import shamanImg from '@/assets/survival/npc-shaman.png';
import mercImg from '@/assets/survival/npc-mercenary.png';
import tribalHallImg from '@/assets/survival/base-tribal-hall.png';
import wallWoodPillarImg from '@/assets/survival/wall-wood-pillar.png';
import wallBranchFenceImg from '@/assets/survival/wall-branch-fence.png';
import wallMarbleWallImg from '@/assets/survival/wall-marble-wall.png';
import wallStoneFenceImg from '@/assets/survival/wall-stone-fence.png';
import wolfImg from '@/assets/survival/mob-wolf.png';
import boarImg from '@/assets/survival/mob-boar.png';
import raptorImg from '@/assets/survival/mob-raptor.png';
import mammothImg from '@/assets/survival/mob-mammoth.png';
import oakImg from '@/assets/survival/node-oak.png';
import quartzImg from '@/assets/survival/node-quartz.png';

export type TerrainToolKind = 'none' | 'path' | 'clear';

interface VillageCanvasProps {
  simRef: React.MutableRefObject<VillageSimState>;
  vState: VillageState;
  gridSize: number;
  baseLevel: 1 | 2 | 3;
  playerLevel: number;
  hasFoodInStorage: boolean;
  isoView: boolean;
  zoom: number;
  onZoomChange: (nextZoom: number) => void;
  heatmap: HeatmapOverlayKind;
  buildMode: boolean;
  lineDragMode: boolean;
  terrainTool: TerrainToolKind;
  selectedBuildId: VillageBuildingId;
  selectedPlacedUid: string | null;
  onSelectPlacedUid: (uid: string | null) => void;
  ghostTile: { x: number; y: number } | null;
  onGhostTileChange: (tile: { x: number; y: number } | null) => void;
  onConfirmPlaceBuilding: (buildingId: VillageBuildingId, x: number, y: number) => boolean;
  onMoveBuilding: (uid: string, toX: number, toY: number) => boolean;
  onDemolishBuilding: (uid: string) => void;
  onOpenBuildingFacility: (placed: PlacedVillageBuilding) => void;
  onPaintTerrainTile: (x: number, y: number, tool: 'path' | 'clear') => void;
  buildingBubbles: Record<string, { itemId: Stack['itemId']; icon: string; label: string; count: number }>;
  onHarvestBubble: (b: PlacedVillageBuilding) => void;
  onSelectResident: (resident: SimResident) => void;
}

const IMAGE_URLS: Record<string, string> = {
  campfire: campfireImg,
  hut: hutImg,
  cave: caveImg,
  outpost: outpostImg,
  altar: altarImg,
  shaman: shamanImg,
  merc: mercImg,
  tribal_hall: tribalHallImg,
  wall_wood_pillar: wallWoodPillarImg,
  wall_branch_fence: wallBranchFenceImg,
  wall_marble: wallMarbleWallImg,
  wall_stone: wallStoneFenceImg,
  wolf: wolfImg,
  boar: boarImg,
  raptor: raptorImg,
  mammoth: mammothImg,
  oak: oakImg,
  quartz: quartzImg,
};

function imageKeyForBuilding(id: VillageBuildingId): string {
  switch (id) {
    case 'campfire':
    case 'brazier':
      return 'campfire';
    case 'branch_fence':
      return 'wall_branch_fence';
    case 'wood_pillar':
    case 'log_palisade':
      return 'wall_wood_pillar';
    case 'stone_wall':
    case 'granite_wall':
      return 'wall_stone';
    case 'marble_wall':
      return 'wall_marble';
    case 'tribe_shelter':
    case 'primitive_tavern':
    case 'smokehouse':
      return 'hut';
    case 'primitive_storage':
    case 'stone_smeltery':
      return 'cave';
    case 'lumber_hut':
    case 'build_workshop':
    case 'expedition_barracks':
      return 'outpost';
    case 'ancient_altar':
    case 'golden_totem':
    case 'rex_skull':
      return 'altar';
    case 'shaman_tent':
    case 'wandering_shaman':
      return 'shaman';
    case 'tribal_hall':
    case 'custom_intent_building':
      return 'tribal_hall';
    default:
      return 'hut';
  }
}

export default function VillageCanvas({
  simRef,
  vState,
  gridSize,
  baseLevel,
  playerLevel,
  hasFoodInStorage,
  isoView,
  zoom,
  onZoomChange,
  heatmap,
  buildMode,
  lineDragMode,
  terrainTool,
  selectedBuildId,
  selectedPlacedUid,
  onSelectPlacedUid,
  ghostTile,
  onGhostTileChange,
  onConfirmPlaceBuilding,
  onMoveBuilding,
  onDemolishBuilding,
  onOpenBuildingFacility,
  onPaintTerrainTile,
  buildingBubbles,
  onHarvestBubble,
  onSelectResident,
}: VillageCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStateRef = useRef<{
    isDown: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    movedPx: number;
    paintingLine: boolean;
    paintedSet: Set<string>;
    draggingMoveUid: string | null;
    longPressTimer: number | null;
  }>({
    isDown: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
    movedPx: 0,
    paintingLine: false,
    paintedSet: new Set(),
    draggingMoveUid: null,
    longPressTimer: null,
  });
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const [draggingMoveUid, setDraggingMoveUid] = useState<string | null>(null);
  const [, setHudTick] = useState(0);

  // Keep latest props in ref for 60fps requestAnimationFrame loop
  const latestRef = useRef({
    vState,
    gridSize,
    baseLevel,
    playerLevel,
    hasFoodInStorage,
    isoView,
    zoom,
    heatmap,
    buildMode,
    lineDragMode,
    terrainTool,
    selectedBuildId,
    selectedPlacedUid,
    ghostTile,
    buildingBubbles,
  });
  latestRef.current = {
    vState,
    gridSize,
    baseLevel,
    playerLevel,
    hasFoodInStorage,
    isoView,
    zoom,
    heatmap,
    buildMode,
    lineDragMode,
    terrainTool,
    selectedBuildId,
    selectedPlacedUid,
    ghostTile,
    buildingBubbles,
  };

  // Preload images once
  useEffect(() => {
    const map: Record<string, HTMLImageElement> = {};
    for (const [k, src] of Object.entries(IMAGE_URLS)) {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      map[k] = img;
    }
    imagesRef.current = map;
  }, []);

  // Coordinate conversions between Inner Village Grid (x, y) and Canvas CSS Pixels (px, py)
  const getTransformMetrics = useCallback(
    (w: number, h: number, currentZoom = latestRef.current.zoom, isIso = latestRef.current.isoView) => {
      const gSize = latestRef.current.gridSize;
      const baseTileW = isIso ? Math.min(w / (gSize + 3.5), (h * 1.45) / (gSize + 3.5)) : Math.min(w, h) / (gSize + 3.6);
      const tileW = baseTileW * currentZoom;
      const tileH = isIso ? tileW * 0.52 : tileW;
      const originX = isIso
        ? w / 2 + panRef.current.x
        : (w - gSize * tileW) / 2 + panRef.current.x;
      const originY = isIso
        ? (h - gSize * tileH) / 2 + panRef.current.y
        : (h - gSize * tileH) / 2 + panRef.current.y;
      return { tileW, tileH, originX, originY, isIso, gSize };
    },
    []
  );

  const gridToScreen = useCallback(
    (gx: number, gy: number, w: number, h: number) => {
      const { tileW, tileH, originX, originY, isIso } = getTransformMetrics(w, h);
      if (isIso) {
        return {
          x: originX + (gx - gy) * (tileW / 2),
          y: originY + (gx + gy) * (tileH / 2),
          tileW,
          tileH,
        };
      }
      return {
        x: originX + gx * tileW,
        y: originY + gy * tileH,
        tileW,
        tileH,
      };
    },
    [getTransformMetrics]
  );

  const screenToGrid = useCallback(
    (sx: number, sy: number, w: number, h: number): { gx: number; gy: number; tileX: number; tileY: number } => {
      const { tileW, tileH, originX, originY, isIso } = getTransformMetrics(w, h);
      if (isIso) {
        const dx = (sx - originX) / (tileW / 2);
        const dy = (sy - originY) / (tileH / 2);
        const gx = (dx + dy) / 2;
        const gy = (dy - dx) / 2;
        return { gx, gy, tileX: Math.floor(gx), tileY: Math.floor(gy) };
      }
      const gx = (sx - originX) / tileW;
      const gy = (sy - originY) / tileH;
      return { gx, gy, tileX: Math.floor(gx), tileY: Math.floor(gy) };
    },
    [getTransformMetrics]
  );

  // Main 60fps Simulation & Canvas Render Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let uiSyncAccumulator = 0;

    const frame = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const props = latestRef.current;
      const sim = simRef.current;

      // 1. Advance pure simulation state
      tickVillageSim(sim, dt, props.vState, {
        baseLevel: props.baseLevel,
        playerLevel: props.playerLevel,
        hasFoodInStorage: props.hasFoodInStorage,
      });

      uiSyncAccumulator += dt;
      if (uiSyncAccumulator >= 1.0) {
        uiSyncAccumulator = 0;
        setHudTick(t => (t + 1) % 1000);
      }

      // 2. Render onto Canvas
      const canvas = canvasRef.current;
      const host = containerRef.current;
      if (canvas && host) {
        const w = host.clientWidth;
        const h = host.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawVillageScene(ctx, w, h, sim, props);
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    const drawVillageScene = (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      sim: VillageSimState,
      props: typeof latestRef.current
    ) => {
      const { gSize, tileW, tileH, isIso } = getTransformMetrics(w, h, props.zoom, props.isoView);
      const imgs = imagesRef.current;

      // Night/Dusk atmospheric background tint
      const bgColors: Record<VillageSimState['phase'], string> = {
        day: '#162411',
        dusk: '#241a14',
        night: '#0c131f',
        dawn: '#1d2418',
      };
      ctx.fillStyle = bgColors[sim.phase];
      ctx.fillRect(0, 0, w, h);

      // Compute heatmap if active
      const heatmaps =
        props.heatmap !== 'none'
          ? computeVillageHeatmaps(gSize, props.vState.buildings, sim.terrain, sim.trafficCounts)
          : null;

      // Helper to draw a single diamond or square tile at inner grid (tx, ty)
      const drawTilePolygon = (tx: number, ty: number, fill: string, stroke?: string, lineWidth = 1) => {
        if (isIso) {
          const top = gridToScreen(tx, ty, w, h);
          const right = gridToScreen(tx + 1, ty, w, h);
          const bottom = gridToScreen(tx + 1, ty + 1, w, h);
          const left = gridToScreen(tx, ty + 1, w, h);
          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(right.x, right.y);
          ctx.lineTo(bottom.x, bottom.y);
          ctx.lineTo(left.x, left.y);
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
          if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
          }
        } else {
          const pt = gridToScreen(tx, ty, w, h);
          ctx.fillStyle = fill;
          ctx.fillRect(pt.x, pt.y, tileW, tileH);
          if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(pt.x, pt.y, tileW, tileH);
          }
        }
      };

      // A. Draw Outer 2-Tile Invader Spawn Ring (-2 .. gSize+1) + Inner Buildable Village Tiles (0 .. gSize-1)
      for (let ty = -2; ty < gSize + 2; ty++) {
        for (let tx = -2; tx < gSize + 2; tx++) {
          const isOuter = tx < 0 || ty < 0 || tx >= gSize || ty >= gSize;
          const checker = ((tx + ty) & 1) === 0;

          if (isOuter) {
            drawTilePolygon(
              tx,
              ty,
              checker ? '#13200e' : '#162410',
              props.buildMode ? 'rgba(45,65,30,0.25)' : undefined
            );
            continue;
          }

          const tKind = sim.terrain[ty * gSize + tx] ?? 'grass';
          let fill = checker ? '#2d4c1e' : '#28451a';
          if (tKind === 'path') {
            fill = checker ? '#7c5c38' : '#705231';
          } else if (tKind === 'water') {
            fill = '#1d6fa5';
          } else if (tKind === 'forest') {
            fill = '#1e3a15';
          } else if (tKind === 'rock') {
            fill = '#3f3f46';
          }

          drawTilePolygon(
            tx,
            ty,
            fill,
            props.buildMode ? 'rgba(250, 204, 21, 0.28)' : 'rgba(20, 35, 12, 0.35)',
            props.buildMode ? 1 : 0.6
          );

          // Heatmap Overlay Tint
          if (heatmaps && props.heatmap !== 'none') {
            const val = heatmaps[props.heatmap][ty * gSize + tx] ?? 0;
            if (val > 0.03) {
              const alpha = Math.min(0.62, val * 0.65);
              const hmColor =
                props.heatmap === 'light'
                  ? `rgba(251, 146, 60, ${alpha})`
                  : props.heatmap === 'defense'
                    ? `rgba(56, 189, 248, ${alpha})`
                    : props.heatmap === 'happiness'
                      ? `rgba(74, 222, 128, ${alpha})`
                      : `rgba(250, 204, 21, ${alpha})`;
              drawTilePolygon(tx, ty, hmColor);
            }
          }
        }
      }

      // Draw inner buildable village border
      if (isIso) {
        const c0 = gridToScreen(0, 0, w, h);
        const c1 = gridToScreen(gSize, 0, w, h);
        const c2 = gridToScreen(gSize, gSize, w, h);
        const c3 = gridToScreen(0, gSize, w, h);
        ctx.beginPath();
        ctx.moveTo(c0.x, c0.y);
        ctx.lineTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.closePath();
        ctx.strokeStyle = props.buildMode ? '#facc15' : 'rgba(163, 230, 53, 0.45)';
        ctx.lineWidth = props.buildMode ? 2 : 1.5;
        ctx.stroke();
      }

      // B. Dusk Warning Arrows in the Outer 2-Tile Spawn Ring
      if (sim.phase === 'dusk' || sim.phase === 'night') {
        const pulse = 0.55 + Math.sin(performance.now() / 220) * 0.35;
        const dir = sim.upcomingRaidDir;
        const markerCoord =
          dir === '북(N)'
            ? { x: gSize / 2, y: -1 }
            : dir === '북동(NE)'
              ? { x: gSize + 0.8, y: 1 }
              : dir === '동(E)'
                ? { x: gSize + 1, y: gSize / 2 }
                : dir === '남동(SE)'
                  ? { x: gSize + 0.8, y: gSize - 1 }
                  : dir === '남(S)'
                    ? { x: gSize / 2, y: gSize + 1 }
                    : dir === '남서(SW)'
                      ? { x: -1, y: gSize - 1 }
                      : dir === '서(W)'
                        ? { x: -1, y: gSize / 2 }
                        : { x: -1, y: 1 };
        const sc = gridToScreen(markerCoord.x, markerCoord.y, w, h);
        ctx.save();
        ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`⚠️ ${dir} 습격 경로`, sc.x, sc.y);
        ctx.restore();
      }

      // C. Ghost Placement / Influence Radius Ring (Clash of Clans style)
      const activeBuildingForRadius =
        props.buildMode && props.ghostTile && props.terrainTool === 'none'
          ? { id: props.selectedBuildId, x: props.ghostTile.x, y: props.ghostTile.y }
          : props.selectedPlacedUid
            ? (() => {
                const found = props.vState.buildings.find(b => b.uid === props.selectedPlacedUid);
                return found ? { id: found.buildingId, x: found.x, y: found.y } : null;
              })()
            : null;

      if (activeBuildingForRadius) {
        const inf = getBuildingInfluenceRadius(activeBuildingForRadius.id);
        const def = VILLAGE_BUILDINGS[activeBuildingForRadius.id];
        if (inf && def) {
          const cx = activeBuildingForRadius.x + (def.widthTiles ?? 1) / 2;
          const cy = activeBuildingForRadius.y + (def.heightTiles ?? 1) / 2;
          const centerPt = gridToScreen(cx, cy, w, h);
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(
            centerPt.x,
            centerPt.y,
            inf.radius * tileW * (isIso ? 0.72 : 1),
            inf.radius * tileH * (isIso ? 0.72 : 1),
            0,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = inf.color.replace('0.3', '0.14');
          ctx.fill();
          ctx.strokeStyle = inf.color.replace('0.3', '0.85');
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 4]);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Ghost Footprint Tiles (Green if placeable, Red if blocked)
      if (props.buildMode && props.ghostTile && props.terrainTool === 'none') {
        const gx = props.ghostTile.x;
        const gy = props.ghostTile.y;
        const check = canPlaceVillageBuilding(
          props.vState,
          props.selectedBuildId,
          gx,
          gy,
          props.baseLevel,
          gSize
        );
        const cells = buildingFootprintCells(props.selectedBuildId, gx, gy);
        for (const c of cells) {
          drawTilePolygon(
            c.x,
            c.y,
            check.ok ? 'rgba(34, 197, 94, 0.45)' : 'rgba(239, 68, 68, 0.5)',
            check.ok ? '#4ade80' : '#f87171',
            2
          );
        }
      }

      // D. Collect all Depth-Sorted Entities by (x + y) so Isometric Depth Order is 100% True 2.5D!
      type RenderableItem = {
        depth: number;
        draw: () => void;
      };
      const renderables: RenderableItem[] = [];

      // D1. Natural Terrain Props (Forest Trees & Rock Outcrops)
      for (let ty = 0; ty < gSize; ty++) {
        for (let tx = 0; tx < gSize; tx++) {
          const tKind = sim.terrain[ty * gSize + tx];
          if (tKind !== 'forest' && tKind !== 'rock') continue;
          if (buildingAtTile(props.vState, tx, ty)) continue;

          renderables.push({
            depth: tx + ty + 0.5,
            draw: () => {
              const center = gridToScreen(tx + 0.5, ty + 0.75, w, h);
              const img = tKind === 'forest' ? imgs.oak : imgs.quartz;
              const size = tileW * (tKind === 'forest' ? 0.85 : 0.68);
              if (img && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, center.x - size / 2, center.y - size * 0.9, size, size);
              }
            },
          });
        }
      }

      // D2. Outer Forest Decorative Trees on the 2-Tile Perimeter
      for (let ty = -2; ty < gSize + 2; ty += 2) {
        for (let tx = -2; tx < gSize + 2; tx += 2) {
          if (tx >= 0 && ty >= 0 && tx < gSize && ty < gSize) continue;
          renderables.push({
            depth: tx + ty + 0.4,
            draw: () => {
              const center = gridToScreen(tx + 0.5, ty + 0.75, w, h);
              const img = imgs.oak;
              const size = tileW * 0.78;
              if (img && img.complete && img.naturalWidth > 0) {
                ctx.save();
                ctx.globalAlpha = 0.72;
                ctx.drawImage(img, center.x - size / 2, center.y - size * 0.9, size, size);
                ctx.restore();
              }
            },
          });
        }
      }

      // D3. Placed Buildings (Upright Sprites + Auto-Connecting Walls + Selected Highlight)
      for (const b of props.vState.buildings) {
        const def = VILLAGE_BUILDINGS[b.buildingId];
        if (!def) continue;
        const bw = def.widthTiles ?? 1;
        const bh = def.heightTiles ?? 1;
        const cx = b.x + bw / 2;
        const cy = b.y + bh / 2;
        const curHp = sim.buildingHpMap[b.uid] ?? b.hp ?? def.maxHp;
        const maxHp = b.maxHp ?? def.maxHp;
        const isSelected = b.uid === props.selectedPlacedUid;

        renderables.push({
          depth: b.x + bw * 0.6 + (b.y + bh * 0.6),
          draw: () => {
            const foot = gridToScreen(cx, cy + bh * 0.25, w, h);

            // Selection highlight base ring
            if (isSelected) {
              for (const cell of buildingFootprintCells(b.buildingId, b.x, b.y)) {
                drawTilePolygon(cell.x, cell.y, 'rgba(250, 204, 21, 0.35)', '#facc15', 2);
              }
            }

            // Campfire warm night glow halo
            if (b.buildingId === 'campfire' || b.buildingId === 'brazier') {
              const glowR = tileW * (b.buildingId === 'campfire' ? 3.2 : 2.2);
              const grad = ctx.createRadialGradient(foot.x, foot.y, 4, foot.x, foot.y, glowR);
              grad.addColorStop(0, 'rgba(251, 146, 60, 0.38)');
              grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(foot.x, foot.y, glowR, 0, Math.PI * 2);
              ctx.fill();
            }

            // Connected Wall Segment Drawing
            if (def.connectsWall) {
              const conn = wallConnections(props.vState, b.x, b.y);
              const cPt = gridToScreen(b.x + 0.5, b.y + 0.5, w, h);
              const wallColor =
                b.buildingId === 'marble_wall'
                  ? '#e2e8f0'
                  : b.buildingId === 'granite_wall' || b.buildingId === 'stone_wall'
                    ? '#94a3b8'
                    : b.buildingId === 'log_palisade'
                      ? '#78350f'
                      : '#a16207';

              ctx.save();
              if (curHp <= 0) ctx.globalAlpha = 0.28;
              ctx.strokeStyle = wallColor;
              ctx.lineWidth = Math.max(4, tileW * 0.22);
              ctx.lineCap = 'round';
              if (conn.n) {
                const nPt = gridToScreen(b.x + 0.5, b.y, w, h);
                ctx.beginPath();
                ctx.moveTo(cPt.x, cPt.y - tileH * 0.15);
                ctx.lineTo(nPt.x, nPt.y - tileH * 0.15);
                ctx.stroke();
              }
              if (conn.s) {
                const sPt = gridToScreen(b.x + 0.5, b.y + 1, w, h);
                ctx.beginPath();
                ctx.moveTo(cPt.x, cPt.y - tileH * 0.15);
                ctx.lineTo(sPt.x, sPt.y - tileH * 0.15);
                ctx.stroke();
              }
              if (conn.e) {
                const ePt = gridToScreen(b.x + 1, b.y + 0.5, w, h);
                ctx.beginPath();
                ctx.moveTo(cPt.x, cPt.y - tileH * 0.15);
                ctx.lineTo(ePt.x, ePt.y - tileH * 0.15);
                ctx.stroke();
              }
              if (conn.w) {
                const wPt = gridToScreen(b.x, b.y + 0.5, w, h);
                ctx.beginPath();
                ctx.moveTo(cPt.x, cPt.y - tileH * 0.15);
                ctx.lineTo(wPt.x, wPt.y - tileH * 0.15);
                ctx.stroke();
              }
              ctx.restore();
            }

            // Upright Sprite (NEVER squished by CSS rotateX!)
            const imgKey = imageKeyForBuilding(b.buildingId);
            const img = imgs[imgKey];
            const sprW = tileW * Math.max(0.85, bw * 0.78);
            const sprH = sprW * (b.buildingId === 'tribal_hall' ? 1.25 : 0.95);

            ctx.save();
            if (curHp <= 0) ctx.globalAlpha = 0.25;
            // Ground shadow
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath();
            ctx.ellipse(foot.x, foot.y, sprW * 0.38, tileH * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();

            if (img && img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, foot.x - sprW / 2, foot.y - sprH * 0.88, sprW, sprH);
            }

            // Pending Work Output Crate Icon (Waiting for Hauler!)
            const pendingOut = sim.workOutputBuffer[b.uid];
            if (pendingOut && !props.buildMode) {
              ctx.font = '11px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(pendingOut.icon, foot.x + sprW * 0.28, foot.y - sprH * 0.2);
            }

            // Show HP bar ONLY if damaged or selected or in build mode
            if (curHp < maxHp || isSelected) {
              const barW = Math.max(24, sprW * 0.7);
              const barX = foot.x - barW / 2;
              const barY = foot.y - sprH * 0.96;
              ctx.fillStyle = 'rgba(0,0,0,0.75)';
              ctx.fillRect(barX, barY, barW, 4);
              const ratio = Math.max(0, Math.min(1, curHp / Math.max(1, maxHp)));
              ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#f59e0b' : '#ef4444';
              ctx.fillRect(barX, barY, barW * ratio, 4);
            }

            // Show Building Name Label ONLY when selected (eliminates permanent label clutter!)
            if (isSelected) {
              const labelText = b.customName ?? def.name;
              ctx.font = 'bold 11px sans-serif';
              const tw = ctx.measureText(labelText).width + 12;
              ctx.fillStyle = 'rgba(20, 14, 10, 0.92)';
              ctx.fillRect(foot.x - tw / 2, foot.y - sprH - 20, tw, 16);
              ctx.strokeStyle = '#facc15';
              ctx.lineWidth = 1;
              ctx.strokeRect(foot.x - tw / 2, foot.y - sprH - 20, tw, 16);
              ctx.fillStyle = '#fef08a';
              ctx.textAlign = 'center';
              ctx.fillText(labelText, foot.x, foot.y - sprH - 8);
            }
            ctx.restore();
          },
        });
      }

      // D4. Ghost Building Upright Preview in Build Mode
      if (props.buildMode && props.ghostTile && props.terrainTool === 'none') {
        const def = VILLAGE_BUILDINGS[props.selectedBuildId];
        if (def) {
          const bw = def.widthTiles ?? 1;
          const bh = def.heightTiles ?? 1;
          const cx = props.ghostTile.x + bw / 2;
          const cy = props.ghostTile.y + bh / 2;
          renderables.push({
            depth: props.ghostTile.x + bw + props.ghostTile.y + bh + 0.1,
            draw: () => {
              const foot = gridToScreen(cx, cy + bh * 0.25, w, h);
              const img = imgs[imageKeyForBuilding(props.selectedBuildId)];
              const sprW = tileW * Math.max(0.85, bw * 0.78);
              const sprH = sprW * 0.95;
              ctx.save();
              ctx.globalAlpha = 0.72;
              if (img && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, foot.x - sprW / 2, foot.y - sprH * 0.88, sprW, sprH);
              }
              ctx.restore();
            },
          });
        }
      }

      // D5. Residents & Haulers (with Carried Resource Icon & Mood Bubble!)
      for (const r of sim.residents) {
        if (r.insideShelter) continue;
        renderables.push({
          depth: r.x + r.y + 0.65,
          draw: () => {
            const pt = gridToScreen(r.x, r.y, w, h);
            const bounce = r.moving ? Math.abs(Math.sin(performance.now() / 120)) * 3.5 : 0;
            const img = r.kind === 'shaman' ? imgs.shaman : r.kind === 'pet' ? imgs.raptor : imgs.merc;
            const size = tileW * (r.kind === 'pet' ? 0.58 : 0.7);

            ctx.save();
            // Ground shadow
            ctx.fillStyle = 'rgba(0,0,0,0.32)';
            ctx.beginPath();
            ctx.ellipse(pt.x, pt.y, size * 0.3, tileH * 0.16, 0, 0, Math.PI * 2);
            ctx.fill();

            if (img && img.complete && img.naturalWidth > 0) {
              ctx.save();
              ctx.translate(pt.x, pt.y - bounce);
              if (r.facing === -1) ctx.scale(-1, 1);
              ctx.drawImage(img, -size / 2, -size * 0.92, size, size);
              ctx.restore();
            }

            // Hauler Cargo Bundle Above Shoulder
            if (r.carrying) {
              ctx.font = '12px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(r.carrying.icon, pt.x + 8, pt.y - size * 0.75 - bounce);
            }

            // Speech / Mood Bubble
            if (r.bubble) {
              ctx.font = 'bold 9.5px sans-serif';
              const bw = ctx.measureText(r.bubble).width + 10;
              const bx = pt.x - bw / 2;
              const by = pt.y - size - 18 - bounce;
              ctx.fillStyle = 'rgba(255,255,255,0.95)';
              ctx.fillRect(bx, by, bw, 14);
              ctx.strokeStyle = '#1c1917';
              ctx.lineWidth = 1;
              ctx.strokeRect(bx, by, bw, 14);
              ctx.fillStyle = '#09090b';
              ctx.textAlign = 'center';
              ctx.fillText(r.bubble, pt.x, by + 10.5);
            }
            ctx.restore();
          },
        });
      }

      // D6. Night Siege Raiders (Enemies Marching along Flow Field)
      for (const en of sim.enemies) {
        renderables.push({
          depth: en.x + en.y + 0.7,
          draw: () => {
            const pt = gridToScreen(en.x, en.y, w, h);
            const bounce = Math.abs(Math.sin(performance.now() / 110)) * 3;
            const img = imgs[en.species] ?? imgs.wolf;
            const size = tileW * (en.species === 'mammoth' ? 1.05 : 0.76);

            ctx.save();
            // Red danger ring under enemy
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(pt.x, pt.y, size * 0.36, tileH * 0.2, 0, 0, Math.PI * 2);
            ctx.stroke();

            if (img && img.complete && img.naturalWidth > 0) {
              ctx.save();
              ctx.translate(pt.x, pt.y - bounce);
              if (en.facing === -1) ctx.scale(-1, 1);
              if (en.hitFlashSec > 0) ctx.filter = 'brightness(1.8)';
              ctx.drawImage(img, -size / 2, -size * 0.9, size, size);
              ctx.restore();
            }

            // Enemy HP Bar
            const barW = 26;
            const barY = pt.y - size - 6;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(pt.x - barW / 2, barY, barW, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(pt.x - barW / 2, barY, barW * Math.max(0, en.hp / en.maxHp), 4);
            ctx.restore();
          },
        });
      }

      // Execute depth-sorted painter's algorithm
      renderables.sort((a, b) => a.depth - b.depth);
      for (const item of renderables) {
        item.draw();
      }

      // E. Draw Projectiles (Arrows, Stones, Fireballs)
      for (const p of sim.projectiles) {
        const pt = gridToScreen(p.x, p.y, w, h);
        ctx.save();
        ctx.fillStyle = p.kind === 'fireball' ? '#fb923c' : p.kind === 'arrow' ? '#fde047' : '#cbd5e1';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - tileH * 0.4, p.kind === 'fireball' ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // F. Draw Floating Combat & Hauler Delivery Texts
      for (const fl of sim.floats) {
        const pt = gridToScreen(fl.x, fl.y, w, h);
        ctx.save();
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillText(fl.text, pt.x + 1, pt.y - tileH * 0.6 + 1);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, pt.x, pt.y - tileH * 0.6);
        ctx.restore();
      }
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [getTransformMetrics, gridToScreen, simRef]);

  // Harvest bubble swipe & pointer hit-testing (Works 100% on mobile touch!)
  const trySwipeHarvestAtPoint = (clientX: number, clientY: number) => {
    if (buildMode) return false;
    // 1. Check DOM element under finger via document.elementFromPoint
    const el = document.elementFromPoint(clientX, clientY);
    const bubbleBtn = el?.closest('[data-harvest-uid]') as HTMLElement | null;
    if (bubbleBtn) {
      const uid = bubbleBtn.getAttribute('data-harvest-uid');
      const bld = vState.buildings.find(b => b.uid === uid);
      if (bld && buildingBubbles[bld.uid]) {
        onHarvestBubble(bld);
        return true;
      }
    }
    return false;
  };

  // Pointer Down / Move / Up handlers for Pan, Wall Line-Drag, Long-Press Building Move, and Tap
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const host = containerRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { tileX, tileY } = screenToGrid(sx, sy, rect.width, rect.height);

    const ds = dragStateRef.current;
    ds.isDown = true;
    ds.startX = e.clientX;
    ds.startY = e.clientY;
    ds.startPanX = panRef.current.x;
    ds.startPanY = panRef.current.y;
    ds.movedPx = 0;
    ds.paintedSet.clear();

    if (ds.longPressTimer) window.clearTimeout(ds.longPressTimer);

    // Check if user is starting a continuous wall/road line drag in build mode
    const isWallSelected =
      buildMode && terrainTool === 'none' && !!VILLAGE_BUILDINGS[selectedBuildId]?.connectsWall;
    if (buildMode && (lineDragMode || terrainTool !== 'none') && (isWallSelected || terrainTool !== 'none')) {
      ds.paintingLine = true;
      if (tileX >= 0 && tileY >= 0 && tileX < gridSize && tileY < gridSize) {
        const key = `${tileX},${tileY}`;
        ds.paintedSet.add(key);
        if (terrainTool !== 'none') {
          onPaintTerrainTile(tileX, tileY, terrainTool);
        } else {
          onConfirmPlaceBuilding(selectedBuildId, tileX, tileY);
        }
      }
      return;
    }

    ds.paintingLine = false;

    // Long-press on an existing building (420ms) starts drag-move mode!
    if (tileX >= 0 && tileY >= 0 && tileX < gridSize && tileY < gridSize) {
      const existing = buildingAtTile(vState, tileX, tileY);
      if (existing) {
        ds.longPressTimer = window.setTimeout(() => {
          if (ds.movedPx < 10) {
            ds.draggingMoveUid = existing.uid;
            setDraggingMoveUid(existing.uid);
            onSelectPlacedUid(existing.uid);
          }
        }, 420);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const host = containerRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { tileX, tileY } = screenToGrid(sx, sy, rect.width, rect.height);
    const ds = dragStateRef.current;

    if (!ds.isDown) {
      if (buildMode && tileX >= 0 && tileY >= 0 && tileX < gridSize && tileY < gridSize) {
        if (!ghostTile || ghostTile.x !== tileX || ghostTile.y !== tileY) {
          onGhostTileChange({ x: tileX, y: tileY });
        }
      }
      return;
    }

    // Mobile Touch Swipe Harvest across roof bubbles!
    if (!buildMode && trySwipeHarvestAtPoint(e.clientX, e.clientY)) {
      return;
    }

    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    ds.movedPx = Math.hypot(dx, dy);

    if (ds.movedPx > 10 && ds.longPressTimer) {
      window.clearTimeout(ds.longPressTimer);
      ds.longPressTimer = null;
    }

    // Continuous line drag for walls or dirt paths
    if (ds.paintingLine) {
      if (tileX >= 0 && tileY >= 0 && tileX < gridSize && tileY < gridSize) {
        const key = `${tileX},${tileY}`;
        if (!ds.paintedSet.has(key)) {
          ds.paintedSet.add(key);
          if (terrainTool !== 'none') {
            onPaintTerrainTile(tileX, tileY, terrainTool);
          } else {
            onConfirmPlaceBuilding(selectedBuildId, tileX, tileY);
          }
        }
      }
      return;
    }

    // Drag-moving an existing building via long-press
    if (ds.draggingMoveUid) {
      if (tileX >= 0 && tileY >= 0 && tileX < gridSize && tileY < gridSize) {
        onGhostTileChange({ x: tileX, y: tileY });
      }
      return;
    }

    // 1-Finger Camera Pan
    if (ds.movedPx > 5) {
      panRef.current = {
        x: Math.max(-260, Math.min(260, ds.startPanX + dx)),
        y: Math.max(-220, Math.min(220, ds.startPanY + dy)),
      };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const host = containerRef.current;
    const ds = dragStateRef.current;
    if (ds.longPressTimer) {
      window.clearTimeout(ds.longPressTimer);
      ds.longPressTimer = null;
    }

    if (!host) {
      ds.isDown = false;
      return;
    }

    const rect = host.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { gx, gy, tileX, tileY } = screenToGrid(sx, sy, rect.width, rect.height);

    // Finish drag-moving a building
    if (ds.draggingMoveUid) {
      const uid = ds.draggingMoveUid;
      ds.draggingMoveUid = null;
      setDraggingMoveUid(null);
      if (tileX >= 0 && tileY >= 0 && tileX < gridSize && tileY < gridSize) {
        onMoveBuilding(uid, tileX, tileY);
      }
      ds.isDown = false;
      return;
    }

    if (ds.paintingLine) {
      ds.paintingLine = false;
      ds.isDown = false;
      return;
    }

    // Clean Tap (moved < 8px)
    if (ds.movedPx < 8) {
      if (tileX >= 0 && tileY >= 0 && tileX < gridSize && tileY < gridSize) {
        if (buildMode) {
          if (terrainTool !== 'none') {
            onPaintTerrainTile(tileX, tileY, terrainTool);
          } else {
            const existing = buildingAtTile(vState, tileX, tileY);
            if (selectedPlacedUid && !existing) {
              if (onMoveBuilding(selectedPlacedUid, tileX, tileY)) {
                onSelectPlacedUid(null);
              }
            } else if (existing && (!ghostTile || (ghostTile.x === tileX && ghostTile.y === tileY))) {
              onSelectPlacedUid(existing.uid === selectedPlacedUid ? null : existing.uid);
            } else {
              // Position Clash-of-Clans ghost preview at tapped tile!
              onGhostTileChange({ x: tileX, y: tileY });
            }
          }
        } else {
          // Normal Mode Tap: 1) Check Resident first, 2) Check Building (NEVER auto-harvests bubble on building body tap!)
          const clickedResident = simRef.current.residents.find(
            r => !r.insideShelter && Math.hypot(r.x - gx, r.y - gy) <= 0.7
          );
          if (clickedResident) {
            onSelectResident(clickedResident);
          } else {
            const existing = buildingAtTile(vState, tileX, tileY);
            if (existing) {
              onSelectPlacedUid(existing.uid);
              onOpenBuildingFacility(existing);
            } else {
              onSelectPlacedUid(null);
            }
          }
        }
      }
    }

    ds.isDown = false;
  };

  // Focal-Point Wheel & Pinch Zoom (keeps cursor/pinch point anchored!)
  const applyFocalZoom = (nextZoomRaw: number, focalX: number, focalY: number) => {
    const host = containerRef.current;
    if (!host) return;
    const clamped = Math.round(Math.max(0.75, Math.min(2.2, nextZoomRaw)) * 100) / 100;
    if (clamped === zoom) return;
    const ratio = clamped / zoom;
    const cx = host.clientWidth / 2;
    const cy = host.clientHeight / 2;
    panRef.current = {
      x: Math.max(-280, Math.min(280, (panRef.current.x - (focalX - cx)) * ratio + (focalX - cx))),
      y: Math.max(-240, Math.min(240, (panRef.current.y - (focalY - cy)) * ratio + (focalY - cy))),
    };
    onZoomChange(clamped);
  };

  const hostW = containerRef.current?.clientWidth ?? 360;
  const hostH = containerRef.current?.clientHeight ?? 360;
  const selectedPlaced = vState.buildings.find(b => b.uid === selectedPlacedUid) ?? null;

  // Evaluate ghost placement validity & SimCity adjacency synergy for floating CoC confirm bar
  const ghostEvaluation =
    buildMode && ghostTile && terrainTool === 'none'
      ? {
          check: canPlaceVillageBuilding(
            vState,
            selectedBuildId,
            ghostTile.x,
            ghostTile.y,
            baseLevel,
            gridSize
          ),
          synergy: evaluateBuildingSynergy(
            selectedBuildId,
            ghostTile.x,
            ghostTile.y,
            vState.buildings,
            simRef.current.terrain,
            gridSize
          ),
        }
      : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[54dvh] min-h-[320px] max-h-[540px] select-none overflow-hidden rounded-lg border-2 border-[#3d2b1f] bg-[#131f0e] shadow-inner touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={e => {
        if (Math.abs(e.deltaY) > 3 && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          applyFocalZoom(
            zoom + (e.deltaY < 0 ? 0.14 : -0.14),
            e.clientX - rect.left,
            e.clientY - rect.top
          );
        }
      }}
      onTouchStart={e => {
        if (e.touches.length === 2 && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          pinchRef.current = {
            dist: Math.hypot(dx, dy),
            midX: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
            midY: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
          };
        }
      }}
      onTouchMove={e => {
        if (e.touches.length === 2 && pinchRef.current) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          const delta = (dist - pinchRef.current.dist) / 160;
          pinchRef.current.dist = dist;
          applyFocalZoom(zoom + delta, pinchRef.current.midX, pinchRef.current.midY);
        }
      }}
      onTouchEnd={() => {
        pinchRef.current = null;
      }}
    >
      {/* 60fps Hardware-Accelerated Village Canvas */}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Accessible Hidden Grid & Placed Building Markers for Automated Tests & Screen Readers */}
      <div
        role="grid"
        aria-label={`${gridSize}x${gridSize} 거점 마을 그리드`}
        data-build-mode={buildMode ? 'on' : 'off'}
        className="sr-only"
      >
        {Array.from({ length: gridSize * gridSize }, (_, idx) => {
          const x = idx % gridSize;
          const y = Math.floor(idx / gridSize);
          const placed = buildingAtTile(vState, x, y);
          return (
            <button
              key={`sr-tile-${x}-${y}`}
              type="button"
              role="gridcell"
              data-tile={`${x},${y}`}
              data-building={placed?.buildingId}
              aria-label={
                placed
                  ? `${VILLAGE_BUILDINGS[placed.buildingId].name} (${x + 1},${y + 1})`
                  : `빈 타일 (${x + 1},${y + 1})`
              }
              onClick={() => {
                if (buildMode) {
                  if (terrainTool !== 'none') onPaintTerrainTile(x, y, terrainTool);
                  else onConfirmPlaceBuilding(selectedBuildId, x, y);
                } else if (placed) {
                  onOpenBuildingFacility(placed);
                }
              }}
            />
          );
        })}
        {vState.buildings.map(b => {
          const def = VILLAGE_BUILDINGS[b.buildingId];
          return (
            <div
              key={`sr-bld-${b.uid}`}
              data-placed-building={b.buildingId}
              data-footprint={`${def?.widthTiles ?? 1}x${def?.heightTiles ?? 1}`}
            />
          );
        })}
      </div>

      {/* Dedicated Roof Harvest Bubbles Layer (Separated from Building Tap + Supports Touch Swipe!) */}
      {!buildMode &&
        vState.buildings.map(b => {
          const bub = buildingBubbles[b.uid];
          if (!bub) return null;
          const def = VILLAGE_BUILDINGS[b.buildingId];
          const pt = gridToScreen(
            b.x + (def?.widthTiles ?? 1) / 2,
            b.y + (def?.heightTiles ?? 1) * 0.2,
            hostW,
            hostH
          );
          return (
            <button
              key={`bub-${b.uid}`}
              type="button"
              data-harvest-bubble={b.buildingId}
              data-harvest-uid={b.uid}
              aria-label={`${def.name} 방치 보상 ${bub.label} +${bub.count} 수확`}
              onPointerDown={e => {
                e.stopPropagation();
                onHarvestBubble(b);
              }}
              onClick={e => {
                e.stopPropagation();
                onHarvestBubble(b);
              }}
              style={{
                left: `${Math.round(pt.x)}px`,
                top: `${Math.round(pt.y - pt.tileW * 0.65)}px`,
              }}
              className="pointer-events-auto absolute z-30 -translate-x-1/2 -translate-y-full flex items-center gap-0.5 rounded-full border-2 border-[#2b1d14] bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-black shadow-md animate-bounce hover:bg-amber-300 active:scale-90"
            >
              <span>{bub.icon}</span>
              <span>+{bub.count}</span>
            </button>
          );
        })}

      {/* Outer Siege Perimeter Badge */}
      <div className="pointer-events-none absolute left-2 top-2 z-20 flex items-center gap-1.5 rounded bg-black/70 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
        <span>
          🌲 영토 {gridSize}×{gridSize} (외곽 침입림 {gridSize + 4}×{gridSize + 4})
        </span>
        {draggingMoveUid && (
          <span className="text-amber-300 animate-pulse">· ✋ 건물을 원하는 타일로 끌어 놓으세요</span>
        )}
      </div>

      {/* Clash-of-Clans Style Ghost Placement Confirmation Bar + Adjacency Synergy Preview */}
      {buildMode && ghostTile && ghostEvaluation && terrainTool === 'none' && (
        <div className="pointer-events-auto absolute bottom-2.5 left-1/2 z-30 -translate-x-1/2 w-[92%] max-w-md rounded-lg border-2 border-amber-400 bg-[#1c130d]/95 p-2 text-xs text-amber-100 shadow-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{VILLAGE_BUILDINGS[selectedBuildId].icon}</span>
                <b className="truncate text-amber-200">
                  {VILLAGE_BUILDINGS[selectedBuildId].name} ({ghostTile.x + 1}, {ghostTile.y + 1})
                </b>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    ghostEvaluation.check.ok
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {ghostEvaluation.check.ok
                    ? `효율 ${Math.round(ghostEvaluation.synergy.efficiencyMult * 100)}%`
                    : (ghostEvaluation.check as { ok: false; reason: string }).reason}
                </span>
              </div>
              {ghostEvaluation.synergy.tags.length > 0 ? (
                <p className="mt-0.5 truncate text-[10px] text-emerald-300">
                  {ghostEvaluation.synergy.tags.join(' · ')}
                </p>
              ) : (
                <p className="mt-0.5 truncate text-[10px] text-amber-300/70">
                  {VILLAGE_BUILDINGS[selectedBuildId].effectLabel}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={!ghostEvaluation.check.ok}
                onClick={() => {
                  if (onConfirmPlaceBuilding(selectedBuildId, ghostTile.x, ghostTile.y)) {
                    onGhostTileChange(null);
                  }
                }}
                className="pixel-btn flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-2.5 py-1.5 text-xs font-extrabold text-white shadow"
              >
                <Check className="h-3.5 w-3.5" />
                건설 확정
              </button>
              <button
                type="button"
                onClick={() => onGhostTileChange(null)}
                className="pixel-btn rounded bg-stone-800 hover:bg-stone-700 p-1.5 text-stone-200"
                aria-label="미리보기 취소"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Placed Building Floating Action Bar (Select -> Info / Move / Demolish) */}
      {selectedPlaced && !ghostTile && (
        <div className="pointer-events-auto absolute bottom-2.5 left-1/2 z-30 -translate-x-1/2 w-[92%] max-w-md rounded-lg border-2 border-amber-500/80 bg-[#1c130d]/95 p-2 text-xs text-amber-100 shadow-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span>{VILLAGE_BUILDINGS[selectedPlaced.buildingId].icon}</span>
                <b className="truncate text-amber-200">
                  {selectedPlaced.customName ?? VILLAGE_BUILDINGS[selectedPlaced.buildingId].name}
                </b>
                <span className="text-[10px] text-amber-400/80">
                  HP {simRef.current.buildingHpMap[selectedPlaced.uid] ?? selectedPlaced.hp}/
                  {selectedPlaced.maxHp}
                </span>
              </div>
              <p className="text-[10px] text-amber-300/75 truncate">
                길게 눌러 드래그 이동 · 또는 빈 타일 터치로 위치 이동
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!buildMode && (
                <button
                  type="button"
                  onClick={() => onOpenBuildingFacility(selectedPlaced)}
                  className="pixel-btn rounded bg-amber-600 hover:bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white"
                >
                  시설 열기
                </button>
              )}
              <button
                type="button"
                onClick={() => onDemolishBuilding(selectedPlaced.uid)}
                className="pixel-btn flex items-center gap-0.5 rounded bg-rose-700 hover:bg-rose-600 px-2 py-1 text-[11px] font-bold text-white"
              >
                <Trash2 className="h-3 w-3" />
                철거
              </button>
              <button
                type="button"
                onClick={() => onSelectPlacedUid(null)}
                className="pixel-btn rounded bg-stone-800 p-1 text-stone-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
