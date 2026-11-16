import { Check, Lock, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getSpeechStageInfo,
  LANGUAGE_QUEST,
  languageQuestProgress,
  QUESTS,
  type QuestState,
} from '@/lib/survival/quests';
import { ITEMS } from '@/lib/survival/items';
import shamanImg from '@/assets/survival/npc-shaman.png';

interface Props {
  state: QuestState;
  canClaim: boolean;
  onClaim: () => void;
  languageQuestAccepted?: boolean;
  languageLearned?: boolean;
  onAcceptLanguageQuest?: () => void;
  onClaimLanguageQuest?: () => void;
  shamanQuestAcceptedIndex?: number;
  onAcceptShamanQuest?: () => void;
}

export default function SurvivalObjectives({
  state,
  canClaim,
  onClaim,
  languageQuestAccepted = false,
  languageLearned = false,
  onAcceptLanguageQuest,
  onClaimLanguageQuest,
  shamanQuestAcceptedIndex,
  onAcceptShamanQuest,
}: Props) {
  const level = state.level ?? 1;
  const activeQuest = QUESTS[state.questIndex] ?? null;
  const langProg = languageQuestProgress(state);
  const speechInfo = getSpeechStageInfo(level, languageLearned);
  const isCurrentAccepted =
    shamanQuestAcceptedIndex === undefined || shamanQuestAcceptedIndex >= state.questIndex;

  return (
    <div className="space-y-3 font-pixel text-xs">
      {/* Wandering Shaman Quest Giver Banner */}
      <div className="pixel-frame space-y-2 bg-accent/15 p-3">
        <div className="flex items-start gap-2.5">
          <img
            src={shamanImg}
            alt="떠돌이 주술사"
            className="pixelated h-14 w-auto shrink-0 border-2 border-foreground bg-card p-1"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <b className="text-sm text-primary">🧙 떠돌이 주술사의 생존 가르침</b>
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold">
                목표 {Math.min(QUESTS.length, state.questIndex + 1)}/{QUESTS.length}
              </span>
            </div>
            <p className="pixel-box bg-background p-2 text-xs leading-relaxed">
              "{activeQuest ? activeQuest.shamanQuote : '자네는 이미 내가 가르쳐 줄 모든 생존의 지혜를 깨우쳤구먼!'}"
            </p>
            {activeQuest && !isCurrentAccepted && onAcceptShamanQuest && (
              <Button
                type="button"
                size="sm"
                onClick={onAcceptShamanQuest}
                className="pixel-btn mt-1 h-auto min-h-0 w-full gap-1 py-1.5 px-2.5 text-xs"
              >
                <Sparkles className="!h-4 !w-4" />
                주술사의 새 생존 목표 수락하기
              </Button>
            )}
          </div>
        </div>

        {/* Language & Speech Status Bar */}
        <div className="flex items-center justify-between border-t border-border pt-2 text-[11px]">
          <span className="flex items-center gap-1">
            <MessageSquare className="!h-3.5 !w-3.5 text-primary" />
            <b>현재 언어 단계:</b> {speechInfo.stageLabel}
          </span>
          <span className="text-muted-foreground">예: "{speechInfo.samplePhrases[0]}"</span>
        </div>
      </div>

      {/* Special Level 5 Language Learning Quest */}
      <div
        data-language-quest
        className={`pixel-frame space-y-2 p-3 ${
          languageLearned
            ? 'border-emerald-700 bg-emerald-950/15'
            : level >= 5
              ? 'border-primary bg-primary/10'
              : 'bg-card opacity-75'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🗣️</span>
            <b className="text-sm">{LANGUAGE_QUEST.title}</b>
          </div>
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            {languageLearned ? '언어 습득 완료' : level >= 5 ? '주술사 특별 의뢰!' : 'Lv.5 해금'}
          </span>
        </div>

        <p className="pixel-box bg-background p-2 text-xs italic">
          🧙 주술사: "{LANGUAGE_QUEST.shamanQuote}"
        </p>

        {languageLearned ? (
          <p className="text-[11px] font-bold text-emerald-700">
            ✓ 말을 배웠습니다! 이제 부족민들과 문장으로 대화하고, 다른 생존자 유저에게 [대화 신청]으로 실시간 채팅을 나눌 수 있습니다.
          </p>
        ) : level < 5 ? (
          <p className="text-[11px] text-muted-foreground">
            아직 족장 Lv.{level}입니다. Lv.5가 되면 떠돌이 주술사가 말을 가르쳐 주는 특별 생존 목표를 부여합니다. (그전까지는 '우우', '♥', '⚔️' 표현만 가능)
          </p>
        ) : !languageQuestAccepted && onAcceptLanguageQuest ? (
          <Button
            type="button"
            onClick={onAcceptLanguageQuest}
            className="pixel-btn min-h-10 w-full gap-1 bg-primary text-xs font-bold text-primary-foreground"
          >
            <Sparkles className="!h-4 !w-4" />
            "이제 자네도 말을 좀 배워야 될것같네." — 언어 학습 목표 수락
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px]">{LANGUAGE_QUEST.hint}</p>
            <div className="h-2 overflow-hidden rounded-sm bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${(langProg.cur / langProg.max) * 100}%` }}
              />
            </div>
            <Button
              type="button"
              disabled={!langProg.ready}
              onClick={onClaimLanguageQuest}
              className="pixel-btn min-h-10 w-full bg-primary text-xs font-bold text-primary-foreground"
            >
              🗣️ 주술사에게 말 배우기 완료 (경험치 +{LANGUAGE_QUEST.rewardXp} · 유저 채팅 해금!)
            </Button>
          </div>
        )}
      </div>

      {/* Main Shaman Survival Objectives List */}
      <div className="space-y-2.5">
        {QUESTS.map((quest, index) => {
          const completed = index < state.questIndex;
          const active = index === state.questIndex;
          const progress = quest.progress(state);
          const ready = progress.cur >= progress.max;
          return (
            <div
              key={quest.id}
              className={`pixel-box border-b border-border p-2.5 ${
                active
                  ? 'border-primary bg-card'
                  : completed
                    ? 'bg-card/60'
                    : 'bg-background/50 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-foreground bg-background text-xs font-bold">
                  {completed ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : active ? (
                    '🧙'
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                </span>
                <b className="flex-1">
                  [주술사의 과제 {index + 1}] {quest.title}
                </b>
                <span className="text-xs font-bold">
                  {completed ? '완료' : `${progress.cur}/${progress.max}`}
                </span>
              </div>
              {active && (
                <div className="mt-2 space-y-2 text-xs">
                  <p className="text-muted-foreground">🧙 "{quest.shamanQuote}"</p>
                  <p className="font-bold text-foreground">▶ 목표: {quest.hint}</p>
                  <div className="h-2 overflow-hidden rounded-sm bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(progress.cur / progress.max) * 100}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground">
                    보상: 경험치 {quest.reward.xp}
                    {quest.reward.stacks
                      .map(stack => ` · ${ITEMS[stack.itemId].name} ×${stack.count}`)
                      .join('')}
                  </p>
                  <Button
                    className="pixel-btn min-h-10 w-full text-xs"
                    disabled={!ready || !canClaim}
                    onClick={onClaim}
                  >
                    {ready && !canClaim
                      ? '거점의 주술사에게 돌아가 보상 받기'
                      : '🧙 주술사에게 보고하고 보상 받기'}
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
