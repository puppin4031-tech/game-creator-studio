import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Crown,
  Flame,
  Hammer,
  HelpCircle,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';
import type { VillageBuildingId, VillageState } from '@/lib/survival/village';
import type { OwnedPet } from '@/lib/survival/pets';
import shamanImg from '@/assets/survival/npc-shaman.png';
import {
  checkShamanQuestStageProgress,
  SHAMAN_CLASSES,
  SHAMAN_QUEST_STAGES,
  type ShamanClassId,
  type ShamanLevel,
  type ShamanQuestStage,
} from '@/lib/survival/shamanEvolution';

interface Props {
  open: boolean;
  onClose: () => void;
  shamanLevel?: ShamanLevel;
  shamanClass?: ShamanClassId | null;
  baseLevel: 1 | 2 | 3;
  storage: Stack[];
  backpack: Stack[];
  village?: VillageState;
  pets?: OwnedPet[];
  expeditionDistanceM?: number;
  onPerformRitual: (targetLevel: number) => boolean;
  onOpenEvolutionModal: () => void;
  onOpenSkillsModal?: () => void;
  onOpenWorkshop?: () => void;
}

export default function ShamanQuestModal({
  open,
  onClose,
  shamanLevel = 1,
  shamanClass = null,
  baseLevel = 1,
  storage,
  backpack,
  village,
  pets = [],
  expeditionDistanceM = 0,
  onPerformRitual,
  onOpenEvolutionModal,
  onOpenSkillsModal,
  onOpenWorkshop,
}: Props) {
  // Current view stage: defaults to current progression stage (clamp to 1~4)
  const currentStageIndex = Math.min(3, Math.max(0, shamanLevel - 1));
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(currentStageIndex);

  const activeStage = SHAMAN_QUEST_STAGES[selectedStageIdx];

  const progress = useMemo(() => {
    return checkShamanQuestStageProgress({
      stage: activeStage,
      storage,
      backpack,
      village,
      pets,
      expeditionDistanceM,
    });
  }, [activeStage, storage, backpack, village, pets, expeditionDistanceM]);

  if (!open) return null;

  const isCurrentStageAchieved = shamanLevel > activeStage.fromLevel;
  const isTargetStage = shamanLevel === activeStage.fromLevel;
  const isFutureStage = shamanLevel < activeStage.fromLevel;

  const classMeta = shamanClass ? SHAMAN_CLASSES[shamanClass] : null;

  return (
    <div
      role="dialog"
      aria-label="떠돌이 주술사 승급 퀘스트"
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img src={shamanImg} alt="" className="pixelated h-8 w-8 object-contain" />
            {classMeta && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-foreground text-[10px]">
                {classMeta.icon}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">
                떠돌이 주술사 5단계 승급 & 마을 동시 성장
              </h1>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/40">
                주술사 Lv.{shamanLevel}/5
              </span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/40">
                마을 거점 Lv.{baseLevel}/3
              </span>
              {classMeta && (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${classMeta.borderClass} ${classMeta.textClass} bg-background`}>
                  {classMeta.badge}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              주술사의 스토리 과제를 수행하고 의식을 거행하여 주술사와 마을의 문명을 함께 발전시키세요
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
          aria-label="닫기"
        >
          <X className="!h-4 !w-4" />
        </button>
      </div>

      {/* 5-Step Stage Progression Bar */}
      <div className="grid grid-cols-5 border-b-2 border-border bg-card/60 p-2 gap-1.5">
        {SHAMAN_QUEST_STAGES.map((stg, idx) => {
          const isDone = shamanLevel > stg.fromLevel;
          const isCurrent = shamanLevel === stg.fromLevel;
          const isSelected = selectedStageIdx === idx;

          return (
            <button
              key={stg.fromLevel}
              type="button"
              onClick={() => setSelectedStageIdx(idx)}
              className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all ${
                isSelected
                  ? 'border-primary bg-primary/20 ring-1 ring-primary'
                  : isDone
                    ? 'border-emerald-600/40 bg-emerald-950/20 text-emerald-400'
                    : isCurrent
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 animate-pulse'
                      : 'border-border/60 bg-muted/20 text-muted-foreground opacity-60'
              }`}
            >
              <div className="flex items-center gap-1 font-bold text-xs">
                {isDone ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <span>Lv.{stg.toLevel}</span>
                )}
                <span>{stg.title.slice(0, 5)}</span>
              </div>
              <span className="text-[9px] opacity-75 mt-0.5">
                {isDone ? '승급 완료' : isCurrent ? '진행 중' : '잠김'}
              </span>
            </button>
          );
        })}

        {/* 5th Stage: Evolution Choice */}
        <button
          type="button"
          onClick={() => {
            if (shamanLevel >= 5) {
              onOpenEvolutionModal();
            } else {
              setSelectedStageIdx(3);
            }
          }}
          className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all ${
            shamanLevel >= 5
              ? 'border-purple-500 bg-purple-500/20 text-purple-300 ring-1 ring-purple-500 animate-pulse'
              : 'border-border/60 bg-muted/20 text-muted-foreground opacity-60'
          }`}
        >
          <div className="flex items-center gap-1 font-bold text-xs">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>4대 전직</span>
          </div>
          <span className="text-[9px] opacity-75 mt-0.5">
            {shamanClass ? classMeta?.name ?? '전직 완료' : shamanLevel >= 5 ? '선택 가능!' : 'Lv.5 해금'}
          </span>
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Shaman Story Dialogue Box */}
        <div className="rounded-lg border-2 border-primary/40 bg-card p-3.5 space-y-2.5">
          <div className="flex items-start gap-3">
            <img
              src={shamanImg}
              alt="떠돌이 주술사"
              className="pixelated h-14 w-auto rounded border-2 border-foreground bg-background p-1"
            />
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                  <span>🧙 떠돌이 주술사</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    [제{activeStage.toLevel - 1}막: {activeStage.title}]
                  </span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 font-mono font-bold">
                  {activeStage.subtitle}
                </span>
              </div>
              <p className="text-xs text-foreground/90 italic leading-relaxed">
                "{activeStage.storyQuote}"
              </p>
            </div>
          </div>

          {/* Interactive Story Snippet */}
          <div className="space-y-1 border-t border-border/80 pt-2 text-[11px] text-muted-foreground">
            {activeStage.storyDialogue.map((line, i) => (
              <p key={i} className="leading-snug">
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* Requirements Checklist Card */}
        <div className="rounded-lg border border-border bg-card p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-border/80 pb-2">
            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <span>📋 승급 의식 필요 조건</span>
              <span className="text-[10px] text-muted-foreground">
                (모든 조건을 달성하면 승급 의식을 거행할 수 있습니다)
              </span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                progress.canRitual
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {progress.canRitual ? '✨ 승급 의식 준비 완료!' : '조건 진행 중'}
            </span>
          </div>

          <div className="space-y-2">
            {/* 1. Materials */}
            {progress.materialChecks.map(mc => (
              <div
                key={mc.itemId}
                className={`flex items-center justify-between p-2 rounded border text-xs transition-colors ${
                  mc.done
                    ? 'border-emerald-600/40 bg-emerald-950/15 text-emerald-300'
                    : 'border-border/80 bg-background/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{mc.done ? '✓' : '·'}</span>
                  <span className="font-bold">{mc.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className={mc.done ? 'text-emerald-400 font-bold' : 'text-destructive font-bold'}>
                    {mc.current} / {mc.need}개 보유
                  </span>
                  <span className="text-[10px] text-muted-foreground">(창고·배낭 합산)</span>
                </div>
              </div>
            ))}

            {/* 2. Specific Buildings */}
            {progress.buildingChecks.map(bc => (
              <div
                key={bc.buildingId}
                className={`flex items-center justify-between p-2 rounded border text-xs transition-colors ${
                  bc.done
                    ? 'border-emerald-600/40 bg-emerald-950/15 text-emerald-300'
                    : 'border-border/80 bg-background/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{bc.done ? '✓' : '·'}</span>
                  <span className="font-bold">{bc.label}</span>
                </div>
                <span className={`font-mono font-bold ${bc.done ? 'text-emerald-400' : 'text-destructive'}`}>
                  {bc.done ? '건설 완료' : '미건설 (건축공방에서 배치)'}
                </span>
              </div>
            ))}

            {/* 3. Walls Check (Stage 3) */}
            {progress.wallCheck && (
              <div
                className={`flex items-center justify-between p-2 rounded border text-xs transition-colors ${
                  progress.wallCheck.done
                    ? 'border-emerald-600/40 bg-emerald-950/15 text-emerald-300'
                    : 'border-border/80 bg-background/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{progress.wallCheck.done ? '✓' : '·'}</span>
                  <span className="font-bold">마을 외곽 울타리/성벽 8개 이상 배치</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    progress.wallCheck.done ? 'text-emerald-400' : 'text-destructive'
                  }`}
                >
                  현재 {progress.wallCheck.current} / {progress.wallCheck.need}개
                </span>
              </div>
            )}

            {/* 4. Towers Check (Stage 3) */}
            {progress.towerCheck && (
              <div
                className={`flex items-center justify-between p-2 rounded border text-xs transition-colors ${
                  progress.towerCheck.done
                    ? 'border-emerald-600/40 bg-emerald-950/15 text-emerald-300'
                    : 'border-border/80 bg-background/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{progress.towerCheck.done ? '✓' : '·'}</span>
                  <span className="font-bold">원거리 요격/감시 망루 1개 이상 배치</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    progress.towerCheck.done ? 'text-emerald-400' : 'text-destructive'
                  }`}
                >
                  현재 {progress.towerCheck.current} / {progress.towerCheck.need}개
                </span>
              </div>
            )}

            {/* 5. Pets Check (Stage 3) */}
            {progress.petCheck && (
              <div
                className={`flex items-center justify-between p-2 rounded border text-xs transition-colors ${
                  progress.petCheck.done
                    ? 'border-emerald-600/40 bg-emerald-950/15 text-emerald-300'
                    : 'border-border/80 bg-background/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{progress.petCheck.done ? '✓' : '·'}</span>
                  <span className="font-bold">마을 수호 공룡 펫 2마리 이상 보유</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    progress.petCheck.done ? 'text-emerald-400' : 'text-destructive'
                  }`}
                >
                  현재 {progress.petCheck.current} / {progress.petCheck.need}마리
                </span>
              </div>
            )}

            {/* 6. Expedition Distance (Stage 4) */}
            {progress.expeditionCheck && (
              <div
                className={`flex items-center justify-between p-2 rounded border text-xs transition-colors ${
                  progress.expeditionCheck.done
                    ? 'border-emerald-600/40 bg-emerald-950/15 text-emerald-300'
                    : 'border-border/80 bg-background/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{progress.expeditionCheck.done ? '✓' : '·'}</span>
                  <span className="font-bold">공룡 탐험대 500m 이상 미지의 대지 돌파</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    progress.expeditionCheck.done ? 'text-emerald-400' : 'text-destructive'
                  }`}
                >
                  현재 {progress.expeditionCheck.current}m / {progress.expeditionCheck.need}m
                </span>
              </div>
            )}

            {/* 7. Merged Pet Level (Stage 4) */}
            {progress.mergedPetCheck && (
              <div
                className={`flex items-center justify-between p-2 rounded border text-xs transition-colors ${
                  progress.mergedPetCheck.done
                    ? 'border-emerald-600/40 bg-emerald-950/15 text-emerald-300'
                    : 'border-border/80 bg-background/60 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{progress.mergedPetCheck.done ? '✓' : '·'}</span>
                  <span className="font-bold">Lv.2 이상으로 합체 진화한 공룡 펫 1마리 이상 보유</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    progress.mergedPetCheck.done ? 'text-emerald-400' : 'text-destructive'
                  }`}
                >
                  보유 최고 펫: Lv.{progress.mergedPetCheck.currentMaxLevel} (필요 Lv.{progress.mergedPetCheck.needLevel})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Unlocked Features Preview */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
          <span className="font-bold text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>승급 완료 시 혜택 및 해금 기술</span>
          </span>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {activeStage.unlockedFeatures.map((feat, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 font-bold text-[10px]"
              >
                ✨ {feat}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground pt-1">
            보상 요약: {activeStage.rewardsSummary}
          </p>
        </div>

        {/* Ritual Action Buttons */}
        <div className="pt-2 space-y-2">
          {isCurrentStageAchieved ? (
            <div className="p-3 rounded-lg border border-emerald-600/40 bg-emerald-950/20 text-center space-y-1">
              <span className="font-bold text-emerald-400 text-xs flex items-center justify-center gap-1">
                <Check className="h-4 w-4" />
                <span>제{activeStage.toLevel - 1}막 [{activeStage.title}] 승급 의식을 이미 완수했습니다!</span>
              </span>
              <p className="text-[10px] text-muted-foreground">
                다음 상위 단계를 선택하거나 장인 기술 수련을 진행하세요.
              </p>
            </div>
          ) : isTargetStage ? (
            <Button
              type="button"
              disabled={!progress.canRitual}
              onClick={() => {
                const ok = onPerformRitual(activeStage.toLevel);
                if (ok && activeStage.toLevel === 5) {
                  onOpenEvolutionModal();
                }
              }}
              className={`pixel-btn w-full h-11 gap-2 text-xs font-bold shadow-lg transition-all ${
                progress.canRitual
                  ? 'bg-amber-600 hover:bg-amber-500 text-white animate-bounce'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Flame className="h-4 w-4 text-amber-200" />
              <span>
                {progress.canRitual
                  ? `🔥 제${activeStage.toLevel - 1}막 [${activeStage.title}] 승급 의식 거행하기 (동시 승급)`
                  : '조건을 모두 달성해야 승급 의식을 거행할 수 있습니다'}
              </span>
            </Button>
          ) : (
            <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
              <span className="text-xs text-muted-foreground">
                이전 단계(제{shamanLevel}막)의 승급을 먼저 완수해야 합니다.
              </span>
            </div>
          )}

          {/* Lv.5 Evolution Prompt Button */}
          {shamanLevel >= 5 && (
            <Button
              type="button"
              onClick={onOpenEvolutionModal}
              className="pixel-btn w-full h-11 gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 text-white font-bold text-xs hover:opacity-90 shadow-lg"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>
                {shamanClass
                  ? `🔮 [${classMeta?.name ?? '전직 주술사'}] 4대 전직 메뉴 열기`
                  : '🔮 Lv.5 달성 특전: [4대 전직(공돌이·마법·흑마·정직)] 의식 거행하기!'}
              </span>
            </Button>
          )}

          {/* Auxiliary Nav Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {onOpenSkillsModal && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenSkillsModal}
                className="pixel-btn h-9 gap-1 text-xs"
              >
                <Hammer className="h-3.5 w-3.5" />
                <span>장인 · 원시 제작술 수련</span>
              </Button>
            )}
            {onOpenWorkshop && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenWorkshop}
                className="pixel-btn h-9 gap-1 text-xs"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>마을 건축 공방 열기</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
