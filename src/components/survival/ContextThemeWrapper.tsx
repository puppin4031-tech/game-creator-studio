import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Flame, PawPrint, Compass, Shield, Zap, Search, Sparkles, Swords, RefreshCw, ChevronRight } from 'lucide-react';
import { HpBar } from './HpBar';
import { countOf } from '@/lib/survival/inventory';
import { computeRangedReach, findAvailableAmmo, ITEMS } from '@/lib/survival/items';
import { eggNeedM, eggWalkedM } from '@/lib/survival/dinoEggs';
import type { GearInstance, Stack } from '@/lib/survival/types';
import type { OwnedPet } from '@/lib/survival/pets';
import type { CarriedEgg } from '@/lib/survival/dinoEggs';
import type { ObservedExpedition } from '@/lib/survival/expedition';

export type ContextMode = 'user' | 'base' | 'pet' | 'expedition';

export interface ContextThemeProps {
  mode: ContextMode;
  onSelectMode: (m: ContextMode) => void;
  hp: number;
  maxHp: number;
  hunger: number;
  weight: number;
  capacity: number;
  level: number;
  weapon: GearInstance | null;
  backpack: Stack[];
  storage: Stack[];
  baseLevel?: number;
  palisade?: boolean;
  pets: OwnedPet[];
  dinoEggs?: CarriedEgg[];
  walkSteps?: number;
  crew: ObservedExpedition | null;
  expeditionLevel?: number;
  expeditionDistanceM?: number;
  lastExpeditionLog?: string;
  onScanNearby?: () => void;
  onOpenPetFusion?: () => void;
  onStartDinoHunt?: () => void;
  onMoraleExpedition?: () => void;
  onRecallExpedition?: () => void;
  onOpenVillageModal?: (modal: string) => void;
  children: React.ReactNode;
}

const CONTEXT_CONFIG: Record<
  ContextMode,
  {
    label: string;
    subLabel: string;
    color: string;
    borderColor: string;
    glowColor: string;
    badgeBg: string;
    badgeText: string;
    icon: typeof User;
  }
> = {
  user: {
    label: '유저',
    subLabel: '족장 야생 생존 HUD',
    color: 'amber',
    borderColor: 'border-amber-500/80',
    glowColor: 'shadow-[inset_0_0_24px_rgba(245,158,11,0.22)]',
    badgeBg: 'bg-amber-950/80 border-amber-500/60',
    badgeText: 'text-amber-400',
    icon: User,
  },
  base: {
    label: '거점',
    subLabel: '모닥불 마을 내정 HUD',
    color: 'orange',
    borderColor: 'border-orange-600/80',
    glowColor: 'shadow-[inset_0_0_24px_rgba(234,88,12,0.22)]',
    badgeBg: 'bg-orange-950/80 border-orange-500/60',
    badgeText: 'text-orange-400',
    icon: Flame,
  },
  pet: {
    label: '펫',
    subLabel: '공룡 도감 & 동행 HUD',
    color: 'emerald',
    borderColor: 'border-emerald-500/80',
    glowColor: 'shadow-[inset_0_0_24px_rgba(16,185,129,0.22)]',
    badgeBg: 'bg-emerald-950/80 border-emerald-500/60',
    badgeText: 'text-emerald-400',
    icon: PawPrint,
  },
  expedition: {
    label: '원정대',
    subLabel: '부족 원정대 전략 지휘 HUD',
    color: 'sky',
    borderColor: 'border-sky-500/80',
    glowColor: 'shadow-[inset_0_0_24px_rgba(14,165,233,0.22)]',
    badgeBg: 'bg-sky-950/80 border-sky-500/60',
    badgeText: 'text-sky-400',
    icon: Compass,
  },
};

export function ContextThemeWrapper({
  mode,
  onSelectMode,
  hp,
  maxHp,
  hunger,
  weight,
  capacity,
  level,
  weapon,
  backpack,
  storage,
  baseLevel = 1,
  palisade = false,
  pets,
  dinoEggs = [],
  walkSteps = 0,
  crew,
  expeditionLevel = 1,
  expeditionDistanceM = 0,
  lastExpeditionLog,
  onScanNearby,
  onOpenPetFusion,
  onStartDinoHunt,
  onMoraleExpedition,
  onRecallExpedition,
  onOpenVillageModal,
  children,
}: ContextThemeProps) {
  const cfg = CONTEXT_CONFIG[mode];

  // Ranged info
  const rangedInfo = useMemo(() => computeRangedReach(weapon, level), [weapon, level]);
  const ammoCount = useMemo(() => {
    if (!rangedInfo.category) return 0;
    const ammo = findAvailableAmmo(backpack, weapon?.itemId);
    return ammo ? countOf(backpack, ammo.itemId) : 0;
  }, [rangedInfo, backpack, weapon]);

  // Base resources summary
  const branchCount = countOf(storage, 'branch') + countOf(backpack, 'branch');
  const stoneCount = countOf(storage, 'flint') + countOf(storage, 'granite') + countOf(backpack, 'flint');
  const boneCount = countOf(storage, 'bone') + countOf(backpack, 'bone');

  // Egg progress
  const firstEgg = dinoEggs[0];
  const eggWalked = firstEgg ? eggWalkedM(firstEgg, walkSteps) : 0;
  const eggNeed = firstEgg ? eggNeedM(firstEgg) : 1000;
  const eggPct = Math.min(100, Math.round((eggWalked / eggNeed) * 100));

  return (
    <div
      data-context-mode={mode}
      className={`relative h-[100dvh] w-full overflow-hidden transition-colors duration-300 border-2 ${cfg.borderColor} ${cfg.glowColor}`}
    >
      {/* Dynamic Context Header Sub-bar */}
      <header
        aria-label="컨텍스트 헤더"
        className="pointer-events-none absolute inset-x-0 top-[calc(max(0.5rem,env(safe-area-inset-top))+2.75rem)] z-25 flex flex-col items-center px-2"
      >
        <div className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded border bg-background/90 px-2.5 py-1 text-xs backdrop-blur-md shadow-md border-border/80">
          {/* Mode Badge & Switcher pill */}
          <div className="flex items-center gap-1.5">
            <span className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
              <cfg.icon className="!h-3 !w-3" />
              <span>{cfg.subLabel}</span>
            </span>
          </div>

          {/* Context-Specific Highlights */}
          <div className="flex items-center gap-2 text-[11px]">
            {mode === 'user' && (
              <div className="flex items-center gap-2 font-mono">
                <span className="flex items-center gap-1 text-red-400">
                  <span>❤️</span>
                  <b>{hp}</b>/{maxHp}
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  <span>🍗</span>
                  <b>{hunger}%</b>
                </span>
                {weapon && (
                  <span className="rounded bg-amber-950/60 border border-amber-600/50 px-1 text-[10px] text-amber-200">
                    🗡️ {ITEMS[weapon.itemId]?.name ?? '무기'}
                    {rangedInfo.category && ` (${ammoCount}발)`}
                  </span>
                )}
              </div>
            )}

            {mode === 'base' && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-orange-400 font-bold">
                  🛡️ 방어 +{baseLevel * 10 + (palisade ? 15 : 0)}
                </span>
                <span className="text-muted-foreground">
                  🪵 {branchCount} · 🪨 {stoneCount} · 🦴 {boneCount}
                </span>
              </div>
            )}

            {mode === 'pet' && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-emerald-400 font-bold">
                  🐾 펫 {pets.length}/20마리
                </span>
                {firstEgg && (
                  <span className="rounded bg-emerald-950/60 border border-emerald-500/50 px-1 text-emerald-200">
                    🥚 알 {eggPct}% ({Math.round(eggWalked)}/{eggNeed}m)
                  </span>
                )}
              </div>
            )}

            {mode === 'expedition' && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-sky-400 font-bold">
                  🧭 원정 Lv.{expeditionLevel}
                </span>
                <span className="text-sky-200">
                  {crew ? `HP ${crew.hp}/${crew.maxHp}` : '대기 중'} · {Math.round(expeditionDistanceM)}m
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {children}

      {/* Mode-Specific Bottom Action Bar */}
      <footer
        aria-label="모드별 전용 하단 액션"
        className="pointer-events-none fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-25 flex flex-col items-center gap-1"
      >
        {/* User Mode: One-hand scan + weight gauge */}
        {mode === 'user' && (
          <aside aria-label="생존 탐색 컨트롤" className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-2 rounded border border-amber-500/60 bg-[#1a1208]/95 p-1.5 shadow-xl text-xs backdrop-blur-md">
            <div className="flex-1 space-y-0.5 px-1">
              <div className="flex justify-between text-[10px] text-amber-200">
                <span>배낭 적재량</span>
                <span className="font-mono font-bold">
                  {weight}/{capacity}kg ({Math.round((weight / Math.max(1, capacity)) * 100)}%)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded bg-black/60 border border-amber-500/30">
                <div
                  className={`h-full transition-all ${
                    weight >= capacity ? 'bg-destructive' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, (weight / Math.max(1, capacity)) * 100)}%` }}
                />
              </div>
            </div>

            {onScanNearby && (
              <button
                type="button"
                onClick={onScanNearby}
                className="pixel-btn flex shrink-0 items-center gap-1 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black py-1.5 px-3 text-xs shadow"
              >
                <Search className="!h-3.5 !w-3.5" />
                <span>주변 탐색</span>
              </button>
            )}
          </aside>
        )}

        {/* Base Mode: Quick Village Buildings navigation */}
        {mode === 'base' && onOpenVillageModal && (
          <aside aria-label="거점 시설 바로가기" className="pointer-events-auto flex w-full max-w-md items-center justify-around gap-1 rounded border border-orange-500/60 bg-[#1c0c05]/95 p-1.5 shadow-xl text-xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => onOpenVillageModal('workshop')}
              className="pixel-btn flex flex-1 items-center justify-center gap-1 bg-orange-700/80 hover:bg-orange-600 text-white py-1 px-1.5 text-[11px]"
            >
              <span>🔨 공방</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenVillageModal('altar')}
              className="pixel-btn flex flex-1 items-center justify-center gap-1 bg-amber-700/80 hover:bg-amber-600 text-white py-1 px-1.5 text-[11px]"
            >
              <span>🔮 제단</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenVillageModal('shaman')}
              className="pixel-btn flex flex-1 items-center justify-center gap-1 bg-purple-700/80 hover:bg-purple-600 text-white py-1 px-1.5 text-[11px]"
            >
              <span>🧙 주술사</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenVillageModal('tribal_hall')}
              className="pixel-btn flex flex-1 items-center justify-center gap-1 bg-emerald-700/80 hover:bg-emerald-600 text-white py-1 px-1.5 text-[11px]"
            >
              <span>🛡️ 부족회관</span>
            </button>
          </aside>
        )}

        {/* Pet Mode: Fusion & Adventure Actions */}
        {mode === 'pet' && (
          <aside aria-label="펫 관리 컨트롤" className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-2 rounded border border-emerald-500/60 bg-[#091811]/95 p-1.5 shadow-xl text-xs backdrop-blur-md">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-lg">🦕</span>
              <div className="text-[10px] text-emerald-300">
                <p className="font-bold">수호 펫 & 공룡 알</p>
                <p className="text-muted-foreground">함께 걷고 합성하여 고대룡으로 진화</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenPetFusion && (
                <button
                  type="button"
                  onClick={onOpenPetFusion}
                  className="pixel-btn flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-2.5 text-xs"
                >
                  <Sparkles className="!h-3.5 !w-3.5" />
                  <span>2마리 합성</span>
                </button>
              )}
              {onStartDinoHunt && (
                <button
                  type="button"
                  onClick={onStartDinoHunt}
                  className="pixel-btn flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-1.5 px-2.5 text-xs"
                >
                  <Swords className="!h-3.5 !w-3.5" />
                  <span>사냥 출정</span>
                </button>
              )}
            </div>
          </aside>
        )}

        {/* Expedition Mode: Ticker ribbon & Tactical controls */}
        {mode === 'expedition' && (
          <aside aria-label="원정 지휘 컨트롤" className="pointer-events-auto flex w-full max-w-md flex-col gap-1 rounded border border-sky-500/60 bg-[#0a1520]/95 p-1.5 shadow-xl text-xs backdrop-blur-md">
            {lastExpeditionLog && (
              <div className="flex items-center gap-1 truncate text-[10px] text-sky-300 border-b border-sky-800/50 pb-1">
                <span className="animate-pulse">📡</span>
                <span className="truncate">{lastExpeditionLog}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-sky-200">
                <b>원정 지휘</b> · {crew ? `${crew.name} 파견 중` : '출정 준비'}
              </div>
              <div className="flex items-center gap-1">
                {onMoraleExpedition && crew && (
                  <button
                    type="button"
                    onClick={onMoraleExpedition}
                    className="pixel-btn flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-1 px-2 text-[11px]"
                  >
                    <Zap className="!h-3 !w-3" />
                    <span>사기 진작</span>
                  </button>
                )}
                {onRecallExpedition && crew && (
                  <button
                    type="button"
                    onClick={onRecallExpedition}
                    className="pixel-btn flex items-center gap-1 bg-destructive hover:bg-destructive/90 text-white font-bold py-1 px-2 text-[11px]"
                  >
                    <RefreshCw className="!h-3 !w-3" />
                    <span>즉시 귀환</span>
                  </button>
                )}
              </div>
            </div>
          </aside>
        )}
      </footer>
    </div>
  );
}
