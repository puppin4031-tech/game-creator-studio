import React from 'react';
import {
  Building2,
  Hammer,
  Info,
  Route,
  ShieldAlert,
  Sparkles,
  Trees,
  Users,
  Wrench,
} from 'lucide-react';
import {
  isArtisanUnlocked,
  VILLAGE_BUILDING_LIST,
  type ShamanSkillMap,
  type VillageBuildingCategory,
  type VillageBuildingDef,
  type VillageBuildingId,
  type VillageState,
} from '@/lib/survival/village';
import { hasAll } from '@/lib/survival/inventory';
import type { Stack } from '@/lib/survival/types';
import type { TerrainToolKind } from './VillageCanvas';

export type BottomDockTab = 'build' | 'facility' | 'tribe' | 'defense';

interface BuildToolbarProps {
  activeTab: BottomDockTab;
  onSelectTab: (tab: BottomDockTab) => void;
  buildMode: boolean;
  onToggleBuildMode: (on: boolean) => void;
  catFilter: 'all' | VillageBuildingCategory;
  onSelectCatFilter: (c: 'all' | VillageBuildingCategory) => void;
  selectedBuildId: VillageBuildingId;
  onSelectBuildId: (id: VillageBuildingId) => void;
  onInspectBuilding: (def: VillageBuildingDef) => void;
  lineDragMode: boolean;
  onToggleLineDragMode: () => void;
  terrainTool: TerrainToolKind;
  onSelectTerrainTool: (t: TerrainToolKind) => void;
  vState: VillageState;
  baseLevel: 1 | 2 | 3;
  ownedPool: Stack[];
  shamanSkills?: ShamanSkillMap;
  spoiledCount: number;
  questAlert: boolean;
  children?: React.ReactNode;
}

export default function BuildToolbar({
  activeTab,
  onSelectTab,
  buildMode,
  onToggleBuildMode,
  catFilter,
  onSelectCatFilter,
  selectedBuildId,
  onSelectBuildId,
  onInspectBuilding,
  lineDragMode,
  onToggleLineDragMode,
  terrainTool,
  onSelectTerrainTool,
  vState,
  baseLevel,
  ownedPool,
  shamanSkills,
  spoiledCount,
  questAlert,
  children,
}: BuildToolbarProps) {
  const filteredCatalog = VILLAGE_BUILDING_LIST.filter(
    b => catFilter === 'all' || b.category === catFilter
  );

  return (
    <div className="rounded-lg border-2 border-[#3d2b1f] bg-[#1e150f] p-2 text-xs text-amber-100 shadow-lg space-y-2">
      {/* 4 Core Bottom Dock Tabs: 건설 / 시설 / 부족 / 방어 */}
      <div className="grid grid-cols-4 gap-1" role="tablist" aria-label="거점 하단 메인 툴바">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'build'}
          onClick={() => {
            onSelectTab('build');
            onToggleBuildMode(true);
          }}
          className={`pixel-btn flex items-center justify-center gap-1 rounded py-2 text-xs font-extrabold transition-colors ${
            activeTab === 'build'
              ? 'bg-amber-600 text-white border border-amber-300 shadow'
              : 'bg-[#2b1d14] text-amber-200/80 border border-[#4a3322] hover:bg-[#3a271b]'
          }`}
        >
          <Hammer className="h-3.5 w-3.5" />
          <span>🔨 건설·개간</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'facility'}
          onClick={() => {
            onSelectTab('facility');
            onToggleBuildMode(false);
          }}
          className={`pixel-btn relative flex items-center justify-center gap-1 rounded py-2 text-xs font-extrabold transition-colors ${
            activeTab === 'facility'
              ? 'bg-amber-600 text-white border border-amber-300 shadow'
              : 'bg-[#2b1d14] text-amber-200/80 border border-[#4a3322] hover:bg-[#3a271b]'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>🏛️ 시설·공방</span>
          {(spoiledCount > 0 || questAlert) && (
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tribe'}
          onClick={() => {
            onSelectTab('tribe');
            onToggleBuildMode(false);
          }}
          className={`pixel-btn flex items-center justify-center gap-1 rounded py-2 text-xs font-extrabold transition-colors ${
            activeTab === 'tribe'
              ? 'bg-amber-600 text-white border border-amber-300 shadow'
              : 'bg-[#2b1d14] text-amber-200/80 border border-[#4a3322] hover:bg-[#3a271b]'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>👥 부족·물류</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'defense'}
          onClick={() => {
            onSelectTab('defense');
            onToggleBuildMode(false);
          }}
          className={`pixel-btn flex items-center justify-center gap-1 rounded py-2 text-xs font-extrabold transition-colors ${
            activeTab === 'defense'
              ? 'bg-amber-600 text-white border border-amber-300 shadow'
              : 'bg-[#2b1d14] text-amber-200/80 border border-[#4a3322] hover:bg-[#3a271b]'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>🛡️ 방어·일지</span>
        </button>
      </div>

      {/* Tab 1: Build & SimCity Terrain / Road Tools */}
      {activeTab === 'build' && (
        <div className="space-y-2">
          {/* Category Filter + Continuous Wall Drag + Road / Forest Clear Tools */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div role="tablist" aria-label="건설 시설 분류" className="flex flex-wrap gap-1">
              {(
                [
                  ['all', '전체'],
                  ['wall', '🛡️ 성벽'],
                  ['facility', '⛺ 시설'],
                  ['decor', '🌺 조경'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={catFilter === id && terrainTool === 'none'}
                  onClick={() => {
                    onSelectTerrainTool('none');
                    onSelectCatFilter(id);
                  }}
                  className={`pixel-btn rounded px-2 py-1 text-[11px] font-bold ${
                    catFilter === id && terrainTool === 'none'
                      ? 'bg-amber-500 text-black'
                      : 'bg-[#140e0a] text-amber-200/80 border border-[#4a3322]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* SimCity Road Paving, Terrain Clearing, and Continuous Wall Drag Toggle */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={onToggleLineDragMode}
                className={`pixel-btn rounded px-2 py-1 text-[10px] font-bold border ${
                  lineDragMode
                    ? 'bg-emerald-600 text-white border-emerald-300'
                    : 'bg-[#140e0a] text-amber-200/80 border-[#4a3322]'
                }`}
                title="손가락으로 끌어서 성벽이나 오솔길을 한 줄로 연속 설치합니다"
              >
                🧱 성벽·길 드래그 설치 {lineDragMode ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={() => onSelectTerrainTool(terrainTool === 'path' ? 'none' : 'path')}
                className={`pixel-btn flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold border ${
                  terrainTool === 'path'
                    ? 'bg-amber-600 text-white border-amber-300'
                    : 'bg-[#140e0a] text-amber-200/80 border-[#4a3322]'
                }`}
                title="오솔길 도로를 깔면 짐꾼과 주민의 이동·물류 속도가 +60% 빨라집니다"
              >
                <Route className="h-3 w-3" />
                🛣️ 오솔길 포장
              </button>

              <button
                type="button"
                onClick={() => onSelectTerrainTool(terrainTool === 'clear' ? 'none' : 'clear')}
                className={`pixel-btn flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold border ${
                  terrainTool === 'clear'
                    ? 'bg-emerald-700 text-white border-emerald-300'
                    : 'bg-[#140e0a] text-amber-200/80 border-[#4a3322]'
                }`}
                title="숲·바위 지형을 개간해 건설 부지를 확보하거나 도로를 잔디로 되돌립니다"
              >
                <Trees className="h-3 w-3" />
                🪓 지형 개간
              </button>
            </div>
          </div>

          {terrainTool !== 'none' ? (
            <div className="rounded border border-amber-500/40 bg-amber-950/30 p-2 text-[11px] text-amber-200">
              {terrainTool === 'path'
                ? '🛣️ [오솔길 포장 모드] 맵 타일을 탭하거나 드래그해 작업장과 창고 사이에 오솔길을 연결하세요 (짐꾼 운반 속도 +60%).'
                : '🪓 [지형 개간 모드] 숲·암석 타일이나 기존 오솔길을 탭해 평지(잔디)로 개간합니다. (주의: 벌목장·제련소 옆 숲/암석은 남겨두면 생산 시너지를 줍니다!)'}
            </div>
          ) : (
            <div className="grid max-h-44 grid-cols-2 sm:grid-cols-3 gap-1.5 overflow-y-auto pr-0.5">
              {filteredCatalog.map(def => {
                const artisanOk = isArtisanUnlocked(shamanSkills, def.id);
                const unlocked = baseLevel >= def.unlockBaseLevel && artisanOk;
                const affordable = hasAll(ownedPool, def.cost);
                const count = vState.buildings.filter(b => b.buildingId === def.id).length;
                const capped = def.maxCount !== undefined && count >= def.maxCount;
                const active = selectedBuildId === def.id;

                return (
                  <div
                    key={def.id}
                    className={`flex items-center justify-between rounded border transition-all ${
                      active
                        ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-500/20 text-amber-100 font-bold'
                        : !unlocked
                          ? 'border-[#332318] bg-[#140e0a]/50 opacity-50'
                          : affordable && !capped
                            ? 'border-[#4a3322] bg-[#140e0a] hover:border-amber-500/60'
                            : 'border-[#332318] bg-[#140e0a]/80 opacity-75'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!unlocked || capped}
                      onClick={() => onSelectBuildId(def.id)}
                      className="flex flex-1 items-center gap-1.5 p-1.5 text-left min-w-0"
                    >
                      <span className="text-base shrink-0">{def.icon}</span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="flex items-center gap-1">
                          <span className="truncate text-xs font-bold">{def.name}</span>
                          {active && <span className="text-[10px] text-amber-400">✓</span>}
                        </div>
                        <div className="flex items-center gap-1 text-[9px]">
                          <span className="rounded bg-[#2b1d14] px-1 text-amber-300/80">
                            {def.footprintLabel}
                          </span>
                          {!unlocked ? (
                            <span className="text-rose-400 font-semibold">Lv.{def.unlockBaseLevel}</span>
                          ) : capped ? (
                            <span className="text-stone-400">상한</span>
                          ) : !affordable ? (
                            <span className="text-rose-400 font-semibold">재료 부족</span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">배치 가능</span>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label={`${def.name} 상세 정보`}
                      onClick={e => {
                        e.stopPropagation();
                        onInspectBuilding(def);
                      }}
                      className="h-full px-2 text-amber-300/70 hover:text-amber-100 border-l border-[#332318]"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Other Tabs Content Rendered via FacilityDrawer children */}
      {activeTab !== 'build' && children}
    </div>
  );
}
