import React from 'react';
import {
  Flame,
  Hammer,
  Heart,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
  Wrench,
} from 'lucide-react';
import type { SiegeBattleReport, SimResident } from '@/lib/sim/state';
import type { BottomDockTab } from './BuildToolbar';

export type UnifiedFacilityModal =
  | 'workshop'
  | 'armory'
  | 'altar'
  | 'shaman'
  | 'shaman_quest'
  | 'shaman_evolution'
  | 'civ_tech'
  | 'smokehouse'
  | 'tavern'
  | 'cuisine'
  | 'tribal_hall'
  | 'intent_crafting';

interface FacilityDrawerProps {
  activeTab: BottomDockTab;
  onOpenModal: (modal: UnifiedFacilityModal, intentTab?: 'architecture' | 'armory') => void;
  spoiledCount: number;
  questAlert: boolean;
  residents: SimResident[];
  hauledCountTotal: number;
  needs: { foodPct: number; warmthPct: number; shelterPct: number; happinessPct: number };
  onSelectResident: (r: SimResident) => void;
  lastSiegeReport: SiegeBattleReport;
  damagedWallCount: number;
  onRepairAllWalls: () => void;
  onTriggerNightSiege: () => void;
}

export default function FacilityDrawer({
  activeTab,
  onOpenModal,
  spoiledCount,
  questAlert,
  residents,
  hauledCountTotal,
  needs,
  onSelectResident,
  lastSiegeReport,
  damagedWallCount,
  onRepairAllWalls,
  onTriggerNightSiege,
}: FacilityDrawerProps) {
  if (activeTab === 'facility') {
    return (
      <div className="space-y-2">
        {/* Single Unified Entry Points for All Village Facilities */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5" role="group" aria-label="거점 핵심 시설 바로가기">
          <button
            type="button"
            onClick={() => onOpenModal('workshop')}
            className="pixel-btn flex flex-col items-center justify-center rounded border border-[#4a3322] bg-[#140e0a] p-2 hover:border-amber-500/60"
          >
            <span className="text-base">🏗️</span>
            <b className="text-[11px] text-amber-200">건축공방</b>
            <span className="text-[9px] text-amber-400/70">설계도 연구</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('armory')}
            className="pixel-btn flex flex-col items-center justify-center rounded border border-[#4a3322] bg-[#140e0a] p-2 hover:border-amber-500/60"
          >
            <span className="text-base">⚒️</span>
            <b className="text-[11px] text-amber-200">무기공방</b>
            <span className="text-[9px] text-amber-400/70">장비 단조·강화</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('smokehouse')}
            className="pixel-btn relative flex flex-col items-center justify-center rounded border border-[#4a3322] bg-[#140e0a] p-2 hover:border-amber-500/60"
          >
            <span className="text-base">♨️</span>
            <b className="text-[11px] text-amber-200">훈제보관</b>
            <span className="text-[9px] text-amber-400/70">부패 방지·육포</span>
            {spoiledCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-lime-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('tavern')}
            className="pixel-btn flex flex-col items-center justify-center rounded border border-[#4a3322] bg-[#140e0a] p-2 hover:border-amber-500/60"
          >
            <span className="text-base">🍖</span>
            <b className="text-[11px] text-amber-200">원시주막</b>
            <span className="text-[9px] text-amber-400/70">전투 버프 요리</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('altar')}
            className="pixel-btn flex flex-col items-center justify-center rounded border border-[#4a3322] bg-[#140e0a] p-2 hover:border-amber-500/60"
          >
            <span className="text-base">🗿</span>
            <b className="text-[11px] text-amber-200">고대제단</b>
            <span className="text-[9px] text-amber-400/70">고대 발명·각성</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('shaman')}
            className="pixel-btn relative flex flex-col items-center justify-center rounded border border-[#4a3322] bg-[#140e0a] p-2 hover:border-amber-500/60"
          >
            <span className="text-base">🧙</span>
            <b className="text-[11px] text-amber-200">주술사 성소</b>
            <span className="text-[9px] text-amber-400/70">의식·언어·승급</span>
            {questAlert && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('tribal_hall')}
            className="pixel-btn flex flex-col items-center justify-center rounded border border-[#4a3322] bg-[#140e0a] p-2 hover:border-amber-500/60"
          >
            <span className="text-base">🏛️</span>
            <b className="text-[11px] text-amber-200">부족회관</b>
            <span className="text-[9px] text-amber-400/70">부족 영입·훈련</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('intent_crafting', 'architecture')}
            className="pixel-btn flex flex-col items-center justify-center rounded border border-amber-500/50 bg-amber-950/30 p-2 hover:bg-amber-900/40"
          >
            <span className="text-base">✨</span>
            <b className="text-[11px] text-amber-300">AI 맞춤 공방</b>
            <span className="text-[9px] text-amber-200/80">건축 설계·제련</span>
          </button>
        </div>
      </div>
    );
  }

  if (activeTab === 'tribe') {
    return (
      <div className="space-y-2">
        {/* SimCity Resident Needs & Hauler Logistics Summary */}
        <div className="grid grid-cols-4 gap-1.5 rounded border border-[#4a3322] bg-[#140e0a] p-2 text-center">
          <div>
            <span className="text-[10px] text-amber-300/70 block">🍖 식량 충족</span>
            <b className="text-xs text-emerald-300">{needs.foodPct}%</b>
          </div>
          <div>
            <span className="text-[10px] text-amber-300/70 block">🔥 모닥불 온기</span>
            <b className="text-xs text-amber-300">{needs.warmthPct}%</b>
          </div>
          <div>
            <span className="text-[10px] text-amber-300/70 block">⛺ 쉼터 주거</span>
            <b className="text-xs text-sky-300">{needs.shelterPct}%</b>
          </div>
          <div>
            <span className="text-[10px] text-amber-300/70 block">📦 짐꾼 입고량</span>
            <b className="text-xs text-amber-200">{hauledCountTotal}개</b>
          </div>
        </div>

        {/* Active Residents Roster */}
        <div className="flex max-h-36 flex-wrap gap-1 overflow-y-auto">
          {residents.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectResident(r)}
              className="flex items-center gap-1.5 rounded border border-[#4a3322] bg-[#140e0a] px-2 py-1 text-[11px] hover:border-amber-400"
            >
              <span>
                {r.role === 'hauler'
                  ? '🪵'
                  : r.role === 'wall_patrol'
                    ? '🛡️'
                    : r.kind === 'class_npc'
                      ? '⚡'
                      : r.kind === 'pet'
                        ? '🦖'
                        : '🔥'}
              </span>
              <span className="font-bold text-amber-200">{r.label}</span>
              {r.carrying && (
                <span className="rounded bg-emerald-900/60 px-1 text-[9px] text-emerald-300">
                  {r.carrying.icon} 운반 중
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Tab 4: Defense & Real Siege Battle Report
  return (
    <div className="space-y-2">
      <div
        className={`rounded border p-2.5 space-y-1.5 ${
          lastSiegeReport.victory
            ? 'border-emerald-600/50 bg-emerald-950/25'
            : 'border-rose-600/50 bg-rose-950/25'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <b className={lastSiegeReport.victory ? 'text-emerald-300' : 'text-rose-300'}>
            {lastSiegeReport.summaryTitle}
          </b>
          <span className="text-[10px] text-amber-300/80">
            창고 보호율 {lastSiegeReport.lootProtectedPct}%
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-100/90">
          {lastSiegeReport.summaryDetail}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-[10px] text-amber-300/75">
            누적 성벽 피해: {lastSiegeReport.totalWallDamage} · 돌파 구역:{' '}
            {lastSiegeReport.breachedWalls.length}곳
          </span>
          <div className="flex items-center gap-1.5">
            {damagedWallCount > 0 && (
              <button
                type="button"
                onClick={onRepairAllWalls}
                className="pixel-btn flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white"
              >
                <Wrench className="h-3 w-3" />
                파손 성벽 일괄 수리 ({damagedWallCount}곳)
              </button>
            )}
            <button
              type="button"
              onClick={onTriggerNightSiege}
              className="pixel-btn flex items-center gap-1 rounded bg-rose-700 hover:bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white"
            >
              <Swords className="h-3 w-3" />
              방어전 즉시 테스트
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
