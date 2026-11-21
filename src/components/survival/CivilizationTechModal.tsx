import { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Flame,
  Hammer,
  HelpCircle,
  Lock,
  Pickaxe,
  Shield,
  Sparkles,
  Swords,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';
import { addStacks, countOf } from '@/lib/survival/inventory';
import {
  CIV_TECHS,
  checkCivTechStatus,
  getCivilizationEraBadge,
  type CivTechDef,
} from '@/lib/survival/civilizationTech';
import {
  CIVILIZATION_ERAS,
  type CivilizationEra,
} from '@/data/resources';

interface Props {
  open: boolean;
  onClose: () => void;
  playerLevel: number;
  researchedTechs: string[];
  storage: Stack[];
  backpack: Stack[];
  onResearchTech: (techId: string) => boolean;
  onOpenWorkshop?: () => void;
}

export default function CivilizationTechModal({
  open,
  onClose,
  playerLevel,
  researchedTechs,
  storage,
  backpack,
  onResearchTech,
  onOpenWorkshop,
}: Props) {
  const currentEra = useMemo(
    () => getCivilizationEraBadge(researchedTechs, playerLevel),
    [researchedTechs, playerLevel]
  );

  const [activeEra, setActiveEra] = useState<CivilizationEra>(currentEra.era);
  const [justResearched, setJustResearched] = useState<string | null>(null);

  const activeEraMeta = CIVILIZATION_ERAS[activeEra];
  const eraTechs = useMemo(
    () => CIV_TECHS.filter(t => t.era === activeEra),
    [activeEra]
  );

  const owned = useMemo(() => addStacks(storage, backpack), [storage, backpack]);

  if (!open) return null;

  const handleResearch = (tech: CivTechDef) => {
    const ok = onResearchTech(tech.id);
    if (ok) {
      setJustResearched(tech.title);
      setTimeout(() => setJustResearched(null), 3000);
    }
  };

  const completedCountInEra = eraTechs.filter(t => researchedTechs.includes(t.id)).length;

  return (
    <div
      role="dialog"
      aria-label="문명 기술 발전 테크트리"
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* 팡파르 축하 배너 */}
      {justResearched && (
        <div className="absolute inset-x-0 top-14 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="pixel-frame flex items-center gap-2 bg-primary px-4 py-2.5 text-primary-foreground shadow-2xl border-2 border-white">
            <span className="text-xl animate-bounce">🎉</span>
            <div>
              <b className="text-sm font-bold">문명 기술 연구 완료!</b>
              <p className="text-[11px] opacity-95">「{justResearched}」 지혜를 터득했습니다!</p>
            </div>
            <Sparkles className="h-5 w-5 animate-spin" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border-2 border-foreground bg-amber-500/20 text-lg">
            🏛️
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <b className="text-sm">문명 기술 테크트리 · 시대 발전</b>
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {currentEra.titleBadge}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              신석기에서 청동기·철기·산업기까지 신규 광물을 채취해 문명을 도약시키세요
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="문명 테크트리 닫기"
          onClick={onClose}
          className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
        >
          <X className="!h-4 !w-4" />
        </button>
      </div>

      {/* Era Selector Tabs */}
      <div className="grid grid-cols-4 gap-1 border-b border-border bg-muted/40 p-1.5">
        {(Object.keys(CIVILIZATION_ERAS) as CivilizationEra[]).map(eraKey => {
          const era = CIVILIZATION_ERAS[eraKey];
          const isSelected = activeEra === eraKey;
          const isCurrentOrPast =
            (eraKey === 'paleolithic') ||
            (eraKey === 'bronze' && playerLevel >= 11) ||
            (eraKey === 'iron' && playerLevel >= 20) ||
            (eraKey === 'alchemy_industry' && playerLevel >= 30);

          return (
            <button
              key={eraKey}
              type="button"
              onClick={() => setActiveEra(eraKey)}
              className={`pixel-frame flex flex-col items-center justify-center py-1.5 px-1 text-center transition-all ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow'
                  : 'bg-card hover:bg-accent/40'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs">
                  {eraKey === 'paleolithic'
                    ? '🪵'
                    : eraKey === 'bronze'
                      ? '⚔️'
                      : eraKey === 'iron'
                        ? '🛡️'
                        : '⚡'}
                </span>
                <b className="truncate text-[10px]">{era.name.split(' ')[0]}</b>
              </div>
              <span className="text-[8px] opacity-80">{era.levelRange}</span>
              {!isCurrentOrPast && <Lock className="mt-0.5 h-2.5 w-2.5 text-muted-foreground" />}
            </button>
          );
        })}
      </div>

      {/* Selected Era Summary Banner */}
      <div className="flex items-center justify-between border-b-2 border-border bg-accent/20 px-3 py-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <b className="text-xs text-foreground font-bold">{activeEraMeta.name}</b>
            <span className="rounded bg-background px-1.5 py-0.2 text-[9px] font-bold border border-foreground/30">
              진척도 {completedCountInEra} / {eraTechs.length}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">{activeEraMeta.description}</p>
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[9px] font-bold text-amber-500">시대 핵심 자원:</span>
            {activeEraMeta.keyResources.map(id => (
              <span
                key={id}
                className="rounded bg-background/80 px-1 text-[8px] border border-border"
              >
                {ITEMS[id]?.name ?? id}
              </span>
            ))}
          </div>
        </div>
        {onOpenWorkshop && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenWorkshop}
            className="pixel-btn h-auto min-h-0 shrink-0 py-1.5 px-2 text-xs"
          >
            🪓 건축 공방
          </Button>
        )}
      </div>

      {/* Tech Tree List */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {eraTechs.map((tech, idx) => {
          const status = checkCivTechStatus(tech, playerLevel, researchedTechs, storage, backpack);
          const isResearched = status.isUnlocked;

          return (
            <div
              key={tech.id}
              className={`pixel-frame space-y-2.5 p-3 transition-colors ${
                isResearched
                  ? 'border-emerald-500/80 bg-emerald-500/5'
                  : status.canResearch
                    ? 'border-primary bg-card shadow-sm'
                    : 'border-border/60 bg-muted/20 opacity-85'
              }`}
            >
              {/* Top Row: Icon + Title + Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-foreground bg-background text-lg shadow">
                    {tech.icon}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <b className="text-sm">{tech.title}</b>
                      <span className="rounded bg-secondary px-1.5 py-0.2 text-[9px] font-bold text-secondary-foreground">
                        요구 Lv.{tech.minPlayerLevel}
                      </span>
                      {isResearched && (
                        <span className="flex items-center gap-0.5 rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600">
                          <Check className="h-3 w-3" /> 연구 완료
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{tech.effectsSummary}</p>
                  </div>
                </div>

                {/* Action button */}
                <Button
                  type="button"
                  size="sm"
                  disabled={isResearched || !status.canResearch}
                  onClick={() => handleResearch(tech)}
                  className={`pixel-btn h-auto min-h-0 shrink-0 gap-1 py-1.5 px-3 text-xs font-bold ${
                    isResearched
                      ? 'bg-emerald-600 text-white'
                      : status.canResearch
                        ? 'bg-primary text-primary-foreground animate-pulse'
                        : 'opacity-50'
                  }`}
                >
                  {isResearched ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> 완료됨
                    </>
                  ) : status.canResearch ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> 연구 착수
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" /> 조건 미달
                    </>
                  )}
                </Button>
              </div>

              {/* Unlocks list */}
              <div className="space-y-1 rounded bg-accent/15 p-2">
                <span className="text-[10px] font-bold text-primary">연구 해금 효과:</span>
                <ul className="space-y-0.5 text-[11px]">
                  {tech.unlocks.map((u, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-foreground/90">
                      <span className="text-primary font-bold">✓</span>
                      <span>{u}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prerequisites & Reason if locked */}
              {!isResearched && !status.canResearch && status.reason && (
                <div className="flex items-center gap-1.5 rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-[10px] text-destructive font-bold">
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>{status.reason}</span>
                </div>
              )}

              {/* Materials Cost Bar */}
              {tech.cost.length > 0 && !isResearched && (
                <div className="border-t border-border pt-1.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>소모 연구 재료 (창고·배낭 합산):</span>
                    <span>{status.canResearch ? '재료 충분' : '재료 부족'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tech.cost.map(costItem => {
                      const have = countOf(owned, costItem.itemId);
                      const isShort = have < costItem.count;
                      const it = ITEMS[costItem.itemId];

                      return (
                        <span
                          key={costItem.itemId}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                            isShort
                              ? 'border-destructive/40 bg-destructive/15 text-destructive'
                              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600'
                          }`}
                        >
                          {it?.name ?? costItem.itemId}: {have} / {costItem.count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
