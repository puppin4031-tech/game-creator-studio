import React from 'react';
import {
  Flame,
  Heart,
  Layers,
  Moon,
  Rotate3d,
  Shield,
  Sparkles,
  Sun,
  Swords,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { HeatmapOverlayKind, SimDayPhase } from '@/lib/sim/state';

interface VillageHUDProps {
  baseLevel: 1 | 2 | 3;
  gridSize: number;
  eraTitleBadge: string;
  onOpenCivTech: () => void;
  woodCount: number;
  stoneCount: number;
  foodCount: number;
  freshnessPct: number;
  spoiledCount: number;
  onOpenSmokehouse: () => void;
  totalWallHp: number;
  residentCount: number;
  happinessPct: number;
  needs: { foodPct: number; warmthPct: number; shelterPct: number };
  phase: SimDayPhase;
  dayNumber: number;
  upcomingRaidDir: string;
  onTriggerNightSiege: () => void;
  heatmap: HeatmapOverlayKind;
  onSelectHeatmap: (h: HeatmapOverlayKind) => void;
  isoView: boolean;
  onToggleIsoView: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  totalReadyBubbles: number;
  onHarvestAllBubbles?: () => void;
}

const PHASE_BADGE: Record<SimDayPhase, { icon: string; label: string; color: string }> = {
  day: { icon: '☀️', label: '낮 (생산·건설)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  dusk: { icon: '🌅', label: '해질녘 (습격 예고)', color: 'bg-orange-500/25 text-orange-200 border-orange-500/50 animate-pulse' },
  night: { icon: '🌙', label: '밤 (방어전 진행 중!)', color: 'bg-rose-600/30 text-rose-200 border-rose-500/60 animate-pulse' },
  dawn: { icon: '🌄', label: '새벽 (전투 결산)', color: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40' },
};

const HEATMAP_BTNS: { id: HeatmapOverlayKind; label: string }[] = [
  { id: 'none', label: '기본 맵' },
  { id: 'light', label: '🔥 온기·빛' },
  { id: 'defense', label: '🛡️ 방어망' },
  { id: 'happiness', label: '😊 상권·행복' },
  { id: 'traffic', label: '🛣️ 물류·도로' },
];

export default function VillageHUD({
  baseLevel,
  gridSize,
  eraTitleBadge,
  onOpenCivTech,
  woodCount,
  stoneCount,
  foodCount,
  freshnessPct,
  spoiledCount,
  onOpenSmokehouse,
  totalWallHp,
  residentCount,
  happinessPct,
  needs,
  phase,
  dayNumber,
  upcomingRaidDir,
  onTriggerNightSiege,
  heatmap,
  onSelectHeatmap,
  isoView,
  onToggleIsoView,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  totalReadyBubbles,
  onHarvestAllBubbles,
}: VillageHUDProps) {
  const phaseMeta = PHASE_BADGE[phase];

  return (
    <div className="rounded-lg border-2 border-[#3d2b1f] bg-[#1e150f] p-2 text-xs text-amber-100 shadow-md space-y-1.5">
      {/* Row 1: Title, Dynamic Grid Size (No hardcoded 16x16!), Day/Night Clock & Siege Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <b className="text-sm text-amber-200">
            🌿 부족 거점 ({gridSize}×{gridSize} 영토) · Lv.{baseLevel}
          </b>
          <button
            type="button"
            onClick={onOpenCivTech}
            className="pixel-btn rounded border border-amber-500/50 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/25"
          >
            {eraTitleBadge}
          </button>
          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${phaseMeta.color}`}>
            {phaseMeta.icon} {dayNumber}일차 · {phaseMeta.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {totalReadyBubbles > 0 && onHarvestAllBubbles && (
            <button
              type="button"
              onClick={onHarvestAllBubbles}
              className="pixel-btn animate-pulse rounded bg-amber-400 px-2 py-1 text-[11px] font-extrabold text-black hover:bg-amber-300"
            >
              ✨ 일괄 수확 ({totalReadyBubbles})
            </button>
          )}
          {phase !== 'night' && (
            <button
              type="button"
              onClick={onTriggerNightSiege}
              className="pixel-btn flex items-center gap-1 rounded border border-rose-500/60 bg-rose-900/60 px-2 py-1 text-[10px] font-bold text-rose-100 hover:bg-rose-800"
              title={`${upcomingRaidDir} 방면 야간 습격 방어전 즉시 시작`}
            >
              <Swords className="h-3 w-3 text-rose-300" />
              밤 습격 ({upcomingRaidDir})
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Compact Core Resources + SimCity Resident Needs & Camera/Heatmap Strip */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-[#332318] pt-1.5 text-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          <span title="보유 목재 (통나무+나뭇가지)">
            🪵 목재 <b className="text-amber-300">{woodCount}</b>
          </span>
          <span title="보유 석재 (부싯돌+돌)">
            🪨 석재 <b className="text-amber-300">{stoneCount}</b>
          </span>
          <span title="보유 식량 및 신선도">
            🍖 식량 <b className="text-amber-300">{foodCount}</b> ({freshnessPct}%)
          </span>
          {spoiledCount > 0 && (
            <button
              type="button"
              onClick={onOpenSmokehouse}
              className="rounded bg-lime-900/60 px-1.5 py-0.2 text-[10px] font-bold text-lime-300 underline"
            >
              🤢 상한음식 {spoiledCount}
            </button>
          )}
          <span title="총 성벽 내구도">
            🛡️ 성벽 <b className="text-sky-300">{totalWallHp}</b>
          </span>
          <span title="거점 상주 인구">
            👥 인구 <b className="text-emerald-300">{residentCount}명</b>
          </span>
          <span
            className="rounded bg-emerald-950/60 border border-emerald-600/40 px-1.5 py-0.2 text-[10px] font-bold text-emerald-300"
            title={`식량 ${needs.foodPct}% · 온기 ${needs.warmthPct}% · 쉼터 ${needs.shelterPct}%`}
          >
            😊 행복도 {happinessPct}%
          </span>
        </div>

        {/* Heatmap Overlay Selector & Camera Controls */}
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex items-center rounded border border-[#4a3322] bg-[#140e0a] p-0.5">
            {HEATMAP_BTNS.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectHeatmap(b.id)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                  heatmap === b.id
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-200/70 hover:text-amber-100'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleIsoView}
            className="pixel-btn flex items-center gap-0.5 rounded border border-[#5c3a1e] bg-[#2b1d14] px-2 py-0.5 text-[10px] font-bold text-amber-200 hover:bg-[#3b281c]"
            title="진정한 2.5D 아이소메트릭 / 탑다운 전환"
          >
            <Rotate3d className="h-3 w-3" />
            {isoView ? '아이소' : '탑다운'}
          </button>

          <div
            className="flex items-center rounded border border-[#5c3a1e] bg-[#140e0a]"
            role="group"
            aria-label="마을 화면 확대 축소"
          >
            <button
              type="button"
              aria-label="마을 축소"
              onClick={onZoomOut}
              className="px-1.5 py-0.5 text-amber-200 hover:bg-[#2b1d14]"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label="마을 배율 초기화"
              onClick={onZoomReset}
              className="border-x border-[#3d281a] px-1.5 py-0.5 text-[10px] font-bold text-amber-200"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="마을 확대"
              onClick={onZoomIn}
              className="px-1.5 py-0.5 text-amber-200 hover:bg-[#2b1d14]"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
