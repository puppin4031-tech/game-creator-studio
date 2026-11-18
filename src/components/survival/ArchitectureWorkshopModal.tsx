import { useMemo, useState } from 'react';
import { Hammer, Lock, ScrollText, Shield, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  blueprintResearchCost,
  buildingArtisanRequirement,
  canPlaceVillageBuilding,
  ensureVillageState,
  isArtisanUnlocked,
  isBlueprintResearched,
  shamanSkillLevel,
  VILLAGE_BUILDING_LIST,
  VILLAGE_GRID_SIZE,
  type VillageBuildingId,
  type VillageState,
} from '@/lib/survival/village';
import { ITEMS } from '@/lib/survival/items';
import { addStacks, hasAll } from '@/lib/survival/inventory';
import type { Stack } from '@/lib/survival/types';

interface Props {
  open: boolean;
  onClose: () => void;
  village: VillageState | undefined;
  baseLevel: 1 | 2 | 3;
  hasAltar: boolean;
  storage: Stack[];
  backpack: Stack[];
  onResearchBlueprint: (buildingId: VillageBuildingId) => boolean;
  onConstructBuilding: (buildingId: VillageBuildingId, x: number, y: number) => boolean;
  onOpenShaman?: () => void;
  onOpenIntentCrafting?: () => void;
}

const fmtCost = (cost: Stack[]) =>
  cost.map(c => `${ITEMS[c.itemId]?.name ?? c.itemId} ${c.count}`).join(' · ');

export default function ArchitectureWorkshopModal({
  open,
  onClose,
  village,
  baseLevel,
  hasAltar,
  storage,
  backpack,
  onResearchBlueprint,
  onConstructBuilding,
  onOpenShaman,
  onOpenIntentCrafting,
}: Props) {
  const [filter, setFilter] = useState<'all' | 'wall' | 'facility'>('all');
  const vState = useMemo(() => ensureVillageState(village, hasAltar), [village, hasAltar]);
  const owned = useMemo(() => addStacks(storage, backpack), [storage, backpack]);

  if (!open) return null;

  const woodLv = shamanSkillLevel(vState.shamanSkills, 'wood_artisan');
  const stoneLv = shamanSkillLevel(vState.shamanSkills, 'stone_artisan');

  const findNextEmptyTile = (buildingId: VillageBuildingId): { x: number; y: number } | null => {
    // Spiral outward from center (5,5) to find an empty region fitting the building's footprint
    for (let r = 1; r < VILLAGE_GRID_SIZE; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = 5 + dx;
          const y = 5 + dy;
          if (canPlaceVillageBuilding(vState, buildingId, x, y, 3).ok) {
            return { x, y };
          }
        }
      }
    }
    return null;
  };

  const list = VILLAGE_BUILDING_LIST.filter(
    b => b.id !== 'custom_intent_building' && (filter === 'all' || b.category === filter)
  );

  return (
    <div
      role="dialog"
      aria-label="건축 공방"
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🪓</span>
          <div>
            <b className="text-sm">원시 건축 공방 · 설계도 & 축조</b>
            <p className="text-[10px] text-muted-foreground">
              장인 등급에 따라 상위 성벽(통나무·돌담·화강암·대리석)과 시설이 해금됩니다
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="건축 공방 닫기"
          onClick={onClose}
          className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
        >
          <X className="!h-4 !w-4" />
        </button>
      </div>

      {/* Artisan Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border bg-accent/15 px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="pixel-box bg-card px-2 py-1 font-bold">
            🪵 나무 장인 Lv.{woodLv}/3
          </span>
          <span className="pixel-box bg-card px-2 py-1 font-bold">
            🪨 석공 장인 Lv.{stoneLv}/3
          </span>
        </div>
        {onOpenShaman && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenShaman}
            className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs"
          >
            🧙 주술사 천막에서 장인 수련
          </Button>
        )}
      </div>

      {/* AI Intent Architecture Banner */}
      {onOpenIntentCrafting && (
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-xs text-amber-900">AI 맞춤 건축 설계 (자연어 용도 입력)</span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onOpenIntentCrafting}
            className="pixel-btn h-auto min-h-0 bg-amber-600 text-white font-bold py-1 px-2.5 text-xs hover:bg-amber-500"
          >
            ✨ AI 건축 설계실 열기
          </Button>
        </div>
      )}

      {/* Category Filter */}
      <div className="grid grid-cols-3 gap-1 border-b border-border bg-background px-3 py-2">
        {(
          [
            ['all', '전체 설계도'],
            ['wall', '🛡️ 재료별 울타리·성벽'],
            ['facility', '⛺ 기능성 시설'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={filter === id ? 'default' : 'outline'}
            onClick={() => setFilter(id)}
            className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Blueprint & Construction List */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {list.map(def => {
          const req = buildingArtisanRequirement(def.id);
          const artisanOk = isArtisanUnlocked(vState.shamanSkills, def.id);
          const researched = isBlueprintResearched(vState, def.id);
          const bpCost = blueprintResearchCost(def.id);
          const canAffordBp = hasAll(owned, bpCost);
          const canAffordBuild = hasAll(owned, def.cost);
          const builtCount = vState.buildings.filter(b => b.buildingId === def.id).length;
          const capped = def.maxCount !== undefined && builtCount >= def.maxCount;
          const reqSkillName = req.skill === 'wood_artisan' ? '🪵 나무 장인' : '🪨 석공 장인';

          return (
            <div
              key={def.id}
              data-workshop-item={def.id}
              className={`pixel-frame flex flex-col gap-1.5 bg-card p-2.5 ${
                !artisanOk ? 'opacity-65' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center border-2 border-foreground bg-background text-lg">
                    {def.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <b className="text-sm">{def.name}</b>
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        내구도 {def.maxHp}
                      </span>
                      {def.maxCount !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          ({builtCount}/{def.maxCount})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-primary">{def.effectLabel}</p>
                  </div>
                </div>
                {!artisanOk ? (
                  <span className="flex items-center gap-1 rounded bg-destructive/15 px-2 py-1 text-[10px] font-bold text-destructive">
                    <Lock className="!h-3.5 !w-3.5" />
                    {reqSkillName} Lv.{req.level} 필요
                  </span>
                ) : researched ? (
                  <span className="rounded bg-emerald-600/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    설계도 습득됨
                  </span>
                ) : (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    설계도 미연구
                  </span>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground">{def.desc}</p>

              {!researched ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-1.5">
                  <span className="text-[11px]">
                    📜 연구 재료: <b>{fmtCost(bpCost)}</b>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!artisanOk || !canAffordBp}
                    onClick={() => onResearchBlueprint(def.id)}
                    className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2.5 text-xs"
                  >
                    <ScrollText className="!h-4 !w-4" />
                    설계도 연구
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-1.5">
                  <span className="text-[11px]">
                    🔨 축조 자재: <b>{fmtCost(def.cost)}</b>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!artisanOk || !canAffordBuild || capped}
                    onClick={() => {
                      const tile = findNextEmptyTile(def.id);
                      if (tile) onConstructBuilding(def.id, tile.x, tile.y);
                    }}
                    className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2.5 text-xs"
                  >
                    <Hammer className="!h-4 !w-4" />
                    {capped ? '완공 상한 도달' : '자재 투입 · 완공'}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
