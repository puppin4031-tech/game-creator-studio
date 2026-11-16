import { useMemo, useState } from 'react';
import { Check, ListChecks, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SHAMAN_SKILL_DEFS,
  shamanSkillLevel,
  type ShamanSkillId,
  type ShamanSkillMap,
} from '@/lib/survival/village';
import {
  currentQuest,
  LANGUAGE_QUEST,
  languageQuestProgress,
  questReady,
  type QuestState,
} from '@/lib/survival/quests';
import { ITEMS } from '@/lib/survival/items';
import { addStacks, hasAll } from '@/lib/survival/inventory';
import type { Stack } from '@/lib/survival/types';
import shamanImg from '@/assets/survival/npc-shaman.png';

interface Props {
  open: boolean;
  onClose: () => void;
  shamanSkills: ShamanSkillMap | undefined;
  storage: Stack[];
  backpack: Stack[];
  onTrainSkill: (skillId: ShamanSkillId) => boolean;
  onOpenWorkshop?: () => void;
  questState?: QuestState;
  canClaimQuest?: boolean;
  onClaimQuest?: () => void;
  shamanQuestAcceptedIndex?: number;
  onAcceptShamanQuest?: () => void;
  languageQuestAccepted?: boolean;
  languageLearned?: boolean;
  onAcceptLanguageQuest?: () => void;
  onClaimLanguageQuest?: () => void;
  onOpenObjectives?: () => void;
}

const fmtCost = (cost: Stack[]) =>
  cost.map(c => `${ITEMS[c.itemId]?.name ?? c.itemId} ${c.count}`).join(' · ');

export default function WanderingShamanModal({
  open,
  onClose,
  shamanSkills,
  storage,
  backpack,
  onTrainSkill,
  onOpenWorkshop,
  questState,
  canClaimQuest,
  onClaimQuest,
  shamanQuestAcceptedIndex,
  onAcceptShamanQuest,
  languageQuestAccepted = false,
  languageLearned = false,
  onAcceptLanguageQuest,
  onClaimLanguageQuest,
  onOpenObjectives,
}: Props) {
  const [tab, setTab] = useState<'quests' | 'skills'>('quests');
  const owned = useMemo(() => addStacks(storage, backpack), [storage, backpack]);

  if (!open) return null;

  const craftSkills = SHAMAN_SKILL_DEFS.filter(s => s.group === 'craft');
  const artisanSkills = SHAMAN_SKILL_DEFS.filter(s => s.group === 'artisan');
  const activeQuest = questState ? currentQuest(questState) : null;
  const activeProg = activeQuest && questState ? activeQuest.progress(questState) : null;
  const readyToClaim = questState ? questReady(questState) : false;
  const level = questState?.level ?? 1;
  const langProg = questState ? languageQuestProgress(questState) : null;
  const isCurrentQuestAccepted =
    questState &&
    (shamanQuestAcceptedIndex === undefined || shamanQuestAcceptedIndex >= questState.questIndex);

  const renderSkillCard = (def: (typeof SHAMAN_SKILL_DEFS)[number]) => {
    const lv = shamanSkillLevel(shamanSkills, def.id);
    const isMax = lv >= def.maxLevel;
    const nextLv = lv + 1;
    const cost = isMax ? null : def.costForLevel(nextLv);
    const canAfford = cost ? hasAll(owned, cost) : false;

    return (
      <div
        key={def.id}
        data-shaman-skill={def.id}
        data-skill-level={lv}
        className="pixel-frame space-y-2 bg-card p-2.5"
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
                  Lv.{lv} / {def.maxLevel}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{def.desc}</p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isMax || !canAfford}
            onClick={() => onTrainSkill(def.id)}
            className="pixel-btn h-auto min-h-0 shrink-0 gap-1 py-1.5 px-2.5 text-xs"
          >
            <Sparkles className="!h-4 !w-4" />
            {isMax ? '수련 완성' : `Lv.${nextLv} 수련`}
          </Button>
        </div>

        {/* Step Nodes Tree Bar */}
        <div className="flex items-center gap-1">
          {Array.from({ length: def.maxLevel }, (_, idx) => {
            const stepLv = idx + 1;
            const unlocked = lv >= stepLv;
            const currentNext = stepLv === nextLv;
            return (
              <div
                key={stepLv}
                className={`flex flex-1 items-center justify-center gap-0.5 border py-1 text-[10px] font-bold ${
                  unlocked
                    ? 'border-primary bg-primary text-primary-foreground'
                    : currentNext
                      ? 'border-accent bg-accent/20 text-foreground'
                      : 'border-border bg-background text-muted-foreground opacity-60'
                }`}
              >
                {unlocked && <Check className="!h-3 !w-3" />}
                Lv.{stepLv}
              </div>
            );
          })}
        </div>

        {/* Unlocks per tier */}
        <ul className="space-y-0.5 border-l-2 border-primary pl-2 text-[11px]">
          {def.unlocksSummary.map((line, idx) => {
            const unlocked = lv >= idx + 1;
            return (
              <li
                key={idx}
                className={unlocked ? 'font-bold text-primary' : 'text-muted-foreground'}
              >
                {unlocked ? '✓ ' : '· '}
                {line}
              </li>
            );
          })}
        </ul>

        {!isMax && cost && (
          <div className="flex items-center justify-between border-t border-border pt-1.5 text-[11px]">
            <span>
              공양 재료: <b className={canAfford ? 'text-foreground' : 'text-destructive'}>{fmtCost(cost)}</b>
            </span>
            <span className="text-[10px] text-muted-foreground">창고·배낭 합산 차감</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-label="떠돌이 주술사 천막"
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* Fullscreen Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <img src={shamanImg} alt="" className="pixelated h-7 w-7 object-contain" />
          <div>
            <b className="text-sm">🧙 떠돌이 주술사 천막 · 생존 목표 & 장인 수련</b>
            <p className="text-[10px] text-muted-foreground">
              주술사가 부여하는 생존 과제를 수행하고 원시 기술·언어를 깨우치세요
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="주술사 천막 닫기"
          onClick={onClose}
          className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
        >
          <X className="!h-4 !w-4" />
        </button>
      </div>

      {/* Shaman Dialogue Banner */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-accent/15 px-3 py-2">
        <div className="flex items-center gap-2">
          <img src={shamanImg} alt="떠돌이 주술사" className="pixelated h-12 w-auto" />
          <p className="leading-snug">
            {level >= 5 && !languageLearned
              ? '"이제 자네도 말을 좀 배워야 될것같네. 내 특별 과제를 마치면 다른 부족민·생존자들과 대화를 나눌 수 있다네!"'
              : activeQuest
                ? `"${activeQuest.shamanQuote}"`
                : '"나무와 돌의 숨결을 깨우치면 더 단단한 성벽과 날카로운 무기를 빚을 수 있다네."'}
          </p>
        </div>
        {onOpenWorkshop && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenWorkshop}
            className="pixel-btn h-auto min-h-0 shrink-0 py-1.5 px-2.5 text-xs"
          >
            🪓 건축 공방
          </Button>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-2 gap-1 border-b border-border bg-background px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant={tab === 'quests' ? 'default' : 'outline'}
          onClick={() => setTab('quests')}
          className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs font-bold"
        >
          📜 주술사 퀘스트 · 언어 학습
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'skills' ? 'default' : 'outline'}
          onClick={() => setTab('skills')}
          className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs font-bold"
        >
          🔨 장인 · 원시 제작술 수련
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {tab === 'quests' && (
          <div className="space-y-3">
            {/* Level 5 Language Quest Card */}
            <div className="pixel-frame space-y-2 border-primary bg-primary/10 p-3">
              <div className="flex items-center justify-between">
                <b className="text-sm">{LANGUAGE_QUEST.title}</b>
                <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {languageLearned ? '습득 완료' : level >= 5 ? '진행 가능!' : `현재 Lv.${level} / Lv.5 해금`}
                </span>
              </div>
              <p className="pixel-box bg-background p-2 text-xs">
                🧙 "{LANGUAGE_QUEST.shamanQuote}"
              </p>
              {languageLearned ? (
                <p className="text-[11px] font-bold text-emerald-700">
                  ✓ 이제 말을 할 수 있습니다! 부족민과 대화하고 주변 유저에게 [대화 신청]을 보내 채팅할 수 있습니다.
                </p>
              ) : level < 5 ? (
                <p className="text-[11px] text-muted-foreground">
                  족장 레벨 5가 되면 이 퀘스트를 받아 말을 배울 수 있습니다. (현재는 우우 / 하트 / 전투 의사표시만 가능)
                </p>
              ) : !languageQuestAccepted ? (
                <Button
                  type="button"
                  onClick={() => onAcceptLanguageQuest?.()}
                  className="pixel-btn min-h-10 w-full bg-primary text-xs font-bold text-primary-foreground"
                >
                  🗣️ 주술사에게 '언어 학습' 퀘스트 받기 (생존 목표 등록)
                </Button>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold">{LANGUAGE_QUEST.hint}</p>
                  <Button
                    type="button"
                    disabled={!langProg?.ready}
                    onClick={() => onClaimLanguageQuest?.()}
                    className="pixel-btn min-h-10 w-full bg-primary text-xs font-bold text-primary-foreground"
                  >
                    🗣️ 말문 트이기 완료! (보상 XP +{LANGUAGE_QUEST.rewardXp} · 유저 채팅 해금)
                  </Button>
                </div>
              )}
            </div>

            {/* Current Main Survival Quest Assigned by Shaman */}
            {activeQuest && activeProg && (
              <div className="pixel-frame space-y-2 bg-card p-3">
                <div className="flex items-center justify-between">
                  <b className="text-sm">🧙 현재 부여된 생존 목표: {activeQuest.title}</b>
                  <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold">
                    {activeProg.cur}/{activeProg.max}
                  </span>
                </div>
                <p className="pixel-box bg-background p-2 text-xs">"{activeQuest.shamanQuote}"</p>
                <p className="text-xs font-bold">▶ 목표: {activeQuest.hint}</p>
                <div className="h-2 overflow-hidden rounded-sm bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(activeProg.cur / activeProg.max) * 100}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {!isCurrentQuestAccepted && onAcceptShamanQuest && (
                    <Button
                      type="button"
                      onClick={onAcceptShamanQuest}
                      className="pixel-btn min-h-10 flex-1 bg-primary text-xs font-bold text-primary-foreground"
                    >
                      📜 이 퀘스트를 생존 목표에 등록하기
                    </Button>
                  )}
                  <Button
                    type="button"
                    disabled={!readyToClaim || !canClaimQuest}
                    onClick={() => onClaimQuest?.()}
                    className="pixel-btn min-h-10 flex-1 text-xs font-bold"
                  >
                    {readyToClaim
                      ? '🧙 주술사에게 완료 보고 · 보상 받기'
                      : `진행 중 (${activeProg.cur}/${activeProg.max})`}
                  </Button>
                  {onOpenObjectives && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onOpenObjectives}
                      className="pixel-btn min-h-10 gap-1 text-xs"
                    >
                      <ListChecks className="!h-4 !w-4" />
                      전체 생존 목표 보기
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Quick view of Artisan & Craft Skills below */}
            <div className="pixel-box flex items-center justify-between bg-card p-2.5">
              <span>장인 스킬(나무·석공) 및 제작술(무두질·목공·제련)도 수련할 수 있습니다.</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setTab('skills')}
                className="pixel-btn h-auto min-h-0 py-1 px-2 text-xs"
              >
                기술 트리 열기
              </Button>
            </div>
          </div>
        )}

        {tab === 'skills' && (
          <>
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <b className="text-sm">🔨 장인 해금 트리 (Lv.1 → Lv.3 · 건축 공방 연동)</b>
                <span className="text-[10px] text-primary">상위 건축물·화강암/대리석 성벽 해금</span>
              </div>
              <div className="space-y-2">{artisanSkills.map(renderSkillCard)}</div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <b className="text-sm">📜 원시 제작술 수련 트리 (Lv.1 → Lv.5 · 레시피 해금)</b>
                <span className="text-[10px] text-primary">무두질 · 목공술 · 석공/제련술</span>
              </div>
              <div className="space-y-2">{craftSkills.map(renderSkillCard)}</div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
