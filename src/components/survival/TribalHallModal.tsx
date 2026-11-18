import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Compass,
  Heart,
  MessageSquare,
  Shield,
  Swords,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import mercImg from '@/assets/survival/npc-mercenary.png';
import tribalHallImg from '@/assets/survival/base-tribal-hall.png';
import TribeSprite from './TribeSprite';
import {
  TRIBE_CLASS_LIST,
  getTribeClass,
  type TribeClassId,
} from '@/data/tribeClasses';
import {
  tribeHireCost,
  tribeTrainCost,
  tribeInjured,
  tribeRatio,
  TRIBE_MAX,
  TRIBE_TRAIN_MAX,
  TRIBE_TREAT_COST,
  type TribeState,
} from '@/lib/survival/mercenaries';
import { ITEMS } from '@/lib/survival/items';
import { addStacks, hasAll } from '@/lib/survival/inventory';
import type { Stack } from '@/lib/survival/types';

interface Props {
  open: boolean;
  onClose: () => void;
  tribe: TribeState | undefined;
  storage: Stack[];
  backpack: Stack[];
  playerLevel?: number;
  languageLearned?: boolean;
  onHireTribe?: (classId: TribeClassId) => boolean;
  onSelectTribeClass?: (classId: TribeClassId) => void;
  onTrainTribe?: () => boolean;
  onTreatTribe?: () => boolean;
  onToggleEscort?: () => void;
  onOpenExpedition?: () => void;
  expeditionBusy?: boolean;
}

type TabKey = 'dialogue' | 'hire' | 'manage' | 'expedition';

interface DialogueTopic {
  id: string;
  title: string;
  icon: string;
  speaker: 'huhakacha' | 'ambacho';
  text: string;
  condition?: string;
}

const DIALOGUE_TOPICS: DialogueTopic[] = [
  {
    id: 'status',
    title: '부족민 훈련 & 사기 보고',
    icon: '⚔️',
    speaker: 'huhakacha',
    text: '족장님! 우리 전사들은 매일 모닥불 주위에서 창과 방패를 갈고닦고 있습니다! 훈련을 거듭할수록 족장님 능력치의 1/6에서 최대 1/3까지 강해집니다. 창고 식량이 넉넉할 때 훈련을 진행하십시오!',
  },
  {
    id: 'defense',
    title: '마을 방어 & 적 침입 대비',
    icon: '🛡️',
    speaker: 'huhakacha',
    text: '성벽을 둘러치고 🛡️ 거인 부족(탱커)을 전방에 배치하면 적의 공격을 온몸으로 막아냅니다. 🏹 원거리 사냥꾼을 함께 세워두면 성벽 너머에서 적이 다가오기도 전에 안전하게 요격할 수 있습니다!',
  },
  {
    id: 'ambacho',
    title: "파밍 부족민 '암바초' 소식",
    icon: '🎒',
    speaker: 'ambacho',
    text: '충성충성! 족장님! 저 암바초라고 함다! 뭐든 시켜만 주십쇼! 돌멩이든 나뭇가지든 배낭 가득 주워오겠슴다! 부족회관에서 🎒 파밍 부족민을 더 뽑아주시면 자원 채집이 훨씬 빨라짐다!',
  },
  {
    id: 'upkeep',
    title: '식량 비축 & 배고픔 주의',
    icon: '🍖',
    speaker: 'huhakacha',
    text: '부족민과 공룡들은 거점 창고의 고기와 과일을 시간마다 나누어 먹습니다. 창고가 비면 굶주려 체력 회복이 멈추고 능력이 반토막 나니 창고에 식량을 넉넉히 비축해 두십시오.',
  },
  {
    id: 'escort',
    title: '필드 함께 걷기 (동행 조언)',
    icon: '🚶',
    speaker: 'huhakacha',
    text: '월드로 나갈 때 부족민을 동행시키면 채집 속도가 30% 빨라지고, 맹수가 기습할 때 족장님 대신 앞장서서 방어합니다! [동행 관리] 탭에서 언제든 동행을 켜고 끌 수 있습니다.',
  },
];

const labelStacks = (stacks: Stack[]): string =>
  stacks.map(s => `${ITEMS[s.itemId]?.name ?? s.itemId} ${s.count}개`).join(' · ');

export default function TribalHallModal({
  open,
  onClose,
  tribe,
  storage,
  backpack,
  playerLevel = 1,
  languageLearned = false,
  onHireTribe,
  onSelectTribeClass,
  onTrainTribe,
  onTreatTribe,
  onToggleEscort,
  onOpenExpedition,
  expeditionBusy = false,
}: Props) {
  const [tab, setTab] = useState<TabKey>('dialogue');
  const [activeTopicId, setActiveTopicId] = useState<string>('status');
  const now = Date.now();

  const count = tribe?.count ?? 0;
  const isInjured = tribeInjured(tribe, now);
  const trainLevel = tribe?.trainLevel ?? 0;
  const hireCost = tribeHireCost(count);
  const trainCost = tribeTrainCost(trainLevel);
  const powerRatio = Math.round(tribeRatio(tribe) * 100);

  const owned = useMemo(() => addStacks(storage, backpack), [storage, backpack]);

  const canAffordHire = hireCost ? hasAll(owned, hireCost) : false;
  const canAffordTrain = trainCost ? hasAll(owned, trainCost) : false;
  const canAffordTreat = hasAll(owned, TRIBE_TREAT_COST);

  if (!open) return null;

  const currentTopic =
    DIALOGUE_TOPICS.find(t => t.id === activeTopicId) ?? DIALOGUE_TOPICS[0];

  const handleHire = (classId: TribeClassId) => {
    if (!onHireTribe) return;
    onHireTribe(classId);
    onSelectTribeClass?.(classId);
  };

  return (
    <div
      role="dialog"
      aria-label="부족회관 화면"
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <img
            src={tribalHallImg}
            alt="부족회관"
            className="pixelated h-8 w-auto object-contain drop-shadow"
          />
          <div>
            <b className="text-sm">부족회관 · 용병 교관 '후하카차'</b>
            <p className="text-[10px] text-muted-foreground">
              부족민 대화 · 4대 클래스 영입 · 필드 동행 · 훈련 & 치료 · 원정 지휘
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="부족회관 닫기"
          onClick={onClose}
          className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
        >
          <X className="!h-4 !w-4" />
        </button>
      </div>

      {/* Top Status & Roster Overview */}
      <div className="border-b border-border bg-muted/40 p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">
              부족민 <b className="text-primary">{count}</b> / {TRIBE_MAX}명
            </span>
            <div className="flex items-center gap-1">
              <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                🛡️ 거인 {tribe?.classCounts?.tank ?? (count > 0 ? count : 0)}
              </span>
              <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                🎒 파밍 {tribe?.classCounts?.gatherer ?? 0}
              </span>
              <span className="rounded border border-sky-500/40 bg-sky-500/10 px-1 py-0.5 text-[9px] font-bold text-sky-600 dark:text-sky-400">
                🏹 원거리 {tribe?.classCounts?.ranged ?? 0}
              </span>
              <span className="rounded border border-purple-500/40 bg-purple-500/10 px-1 py-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-400">
                ⚡ 암살 {tribe?.classCounts?.assassin ?? 0}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="rounded bg-background px-1.5 py-0.5 border border-border">
              기본 전투력: <b>{powerRatio}%</b>
            </span>
            <span
              className={`rounded px-1.5 py-0.5 border font-bold ${
                tribe?.escort
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-muted-foreground/30 bg-background text-muted-foreground'
              }`}
            >
              {tribe?.escort ? '🚶 동행 켜짐' : '⛺ 거점 대기'}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 border font-bold ${
                isInjured
                  ? 'border-destructive bg-destructive/20 text-destructive'
                  : 'border-emerald-600/40 bg-emerald-600/10 text-emerald-600'
              }`}
            >
              {isInjured ? '⚠️ 부상 중' : '💚 건강'}
            </span>
            {tribe?.starving && (
              <span className="rounded border border-destructive bg-destructive text-destructive-foreground px-1.5 py-0.5 font-bold animate-pulse">
                굶주림 (식량 부족)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div
        role="tablist"
        className="grid grid-cols-4 gap-1 border-b border-border bg-background px-3 py-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'dialogue'}
          onClick={() => setTab('dialogue')}
          className={`pixel-btn flex items-center justify-center gap-1 py-2 text-xs font-bold ${
            tab === 'dialogue' ? 'bg-primary text-primary-foreground' : 'bg-card'
          }`}
        >
          <MessageSquare className="!h-3.5 !w-3.5" />
          <span>부족 대화</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'hire'}
          onClick={() => setTab('hire')}
          className={`pixel-btn flex items-center justify-center gap-1 py-2 text-xs font-bold ${
            tab === 'hire' ? 'bg-primary text-primary-foreground' : 'bg-card'
          }`}
        >
          <UserPlus className="!h-3.5 !w-3.5" />
          <span>용병 영입</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'manage'}
          onClick={() => setTab('manage')}
          className={`pixel-btn flex items-center justify-center gap-1 py-2 text-xs font-bold ${
            tab === 'manage' ? 'bg-primary text-primary-foreground' : 'bg-card'
          }`}
        >
          <Users className="!h-3.5 !w-3.5" />
          <span>동행·훈련·치료</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'expedition'}
          onClick={() => setTab('expedition')}
          className={`pixel-btn flex items-center justify-center gap-1 py-2 text-xs font-bold ${
            tab === 'expedition' ? 'bg-primary text-primary-foreground' : 'bg-card'
          }`}
        >
          <Compass className="!h-3.5 !w-3.5" />
          <span>원정대 지휘</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Tab 1: Dialogue */}
        {tab === 'dialogue' && (
          <div className="space-y-3">
            {/* Speaker & Speech Box */}
            <div className="pixel-frame flex flex-col sm:flex-row items-center sm:items-start gap-3 bg-card p-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="relative flex h-24 w-24 items-center justify-center rounded border-2 border-foreground bg-background/80 shadow">
                  {currentTopic.speaker === 'ambacho' ? (
                    <TribeSprite action="walk" tribeClass="gatherer" height={60} />
                  ) : (
                    <img
                      src={mercImg}
                      alt="후하카차"
                      className="pixelated h-20 w-auto object-contain drop-shadow"
                    />
                  )}
                  <span className="absolute -bottom-2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[9px] font-bold text-background shadow">
                    {currentTopic.speaker === 'ambacho' ? '파밍 부족민 암바초' : "교관 '후하카차'"}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <b className="text-sm text-primary flex items-center gap-1">
                    <span>{currentTopic.icon}</span>
                    <span>{currentTopic.title}</span>
                  </b>
                  <span className="text-[10px] text-muted-foreground">
                    {playerLevel < 5 && !languageLearned ? '원시 몸짓 소통' : '부족 신뢰도: 최고'}
                  </span>
                </div>

                <div className="pixel-box bg-background p-3 text-xs leading-relaxed space-y-1.5">
                  <p>"{currentTopic.text}"</p>
                  {playerLevel < 5 && !languageLearned && (
                    <p className="border-t border-border pt-1.5 text-[11px] text-muted-foreground italic">
                      우우… 우우?! (족장님이 아직 원시 몸짓 단계이지만, 후하카차와 전사들은 족장님을 굳게 믿고 따르고 있습니다. Lv.5에 주술사에게 언어를 배우면 더 다양한 지휘가 가능합니다.)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Dialogue Topics Selector */}
            <div className="space-y-1.5">
              <b className="text-xs text-muted-foreground">교관에게 질문 및 조언 구하기</b>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {DIALOGUE_TOPICS.map(topic => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setActiveTopicId(topic.id)}
                    className={`pixel-box flex items-center gap-2 p-2.5 text-left transition-colors ${
                      activeTopicId === topic.id
                        ? 'border-primary bg-primary/10 font-bold text-foreground'
                        : 'bg-card hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className="text-base">{topic.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs">{topic.title}</div>
                      <div className="truncate text-[10px] opacity-75">
                        {topic.speaker === 'ambacho' ? '암바초와의 대화' : '후하카차의 조언'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="pixel-frame flex flex-wrap items-center justify-between gap-2 bg-muted/30 p-2.5">
              <span className="text-xs">
                부족민을 추가 영입하거나 함께 다니기를 설정하시겠습니까?
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  onClick={() => setTab('hire')}
                  className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs"
                >
                  <UserPlus className="!h-3.5 !w-3.5 mr-1" />
                  용병 영입하기
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTab('manage')}
                  className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs"
                >
                  <Users className="!h-3.5 !w-3.5 mr-1" />
                  동행·훈련 관리
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hire Mercenaries */}
        {tab === 'hire' && (
          <div className="space-y-3">
            {/* Hire Cost & Requirement Banner */}
            <div className="pixel-frame bg-card p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <b className="text-sm flex items-center gap-1.5">
                  <UserPlus className="!h-4 !w-4 text-primary" />
                  <span>
                    새 부족민 영입 ({count + 1}번째 / 최대 {TRIBE_MAX}명)
                  </span>
                </b>
                <span className="text-xs font-bold text-primary">
                  보유 인원: {count} / {TRIBE_MAX}
                </span>
              </div>
              <div className="pixel-box bg-background p-2 text-xs">
                {hireCost ? (
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span>
                      필요 재료:{' '}
                      <b className={canAffordHire ? 'text-primary' : 'text-destructive'}>
                        {labelStacks(hireCost)}
                      </b>
                    </span>
                    <span className="text-[10px] text-muted-foreground">창고·배낭 합산 차감</span>
                  </div>
                ) : (
                  <span className="text-primary font-bold">
                    부족민 정원이 가득 찼습니다 (최대 10/10명)
                  </span>
                )}
              </div>
            </div>

            {/* 4 Tribe Classes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {TRIBE_CLASS_LIST.map(cls => {
                const classCount = tribe?.classCounts?.[cls.id] ?? 0;
                return (
                  <div
                    key={cls.id}
                    className="pixel-frame flex flex-col justify-between bg-card p-3 space-y-2.5 border-2 border-foreground"
                  >
                    <div>
                      {/* Class Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-11 w-11 items-center justify-center border-2 border-foreground bg-background">
                            <TribeSprite
                              action={cls.id === 'gatherer' ? 'gather' : 'idle'}
                              tribeClass={cls.id}
                              height={34}
                              showBadge={false}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <b className="text-sm">
                                {cls.icon} {cls.name}
                              </b>
                              <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-bold">
                                {cls.role}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              무기: {cls.weaponName}
                            </span>
                          </div>
                        </div>

                        <span className="rounded border border-primary/50 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          {classCount}명 보유
                        </span>
                      </div>

                      {/* Perk Summary */}
                      <div className="mt-2 space-y-1">
                        <div className="pixel-box bg-background/80 p-2 text-[11px] font-bold text-primary leading-snug">
                          {cls.perkSummary}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {cls.desc}
                        </p>
                      </div>
                    </div>

                    {/* Hire Action */}
                    <div className="pt-1">
                      <Button
                        type="button"
                        disabled={!hireCost || !canAffordHire}
                        onClick={() => handleHire(cls.id)}
                        className="pixel-btn w-full py-2 text-xs font-bold"
                      >
                        {count >= TRIBE_MAX
                          ? '정원 마감 (10명)'
                          : !canAffordHire
                            ? '재료 부족 (영입 불가)'
                            : `${cls.icon} ${cls.name} 영입하기`}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Escort, Training & Treatment */}
        {tab === 'manage' && (
          <div className="space-y-3">
            {/* Section 1: Escort */}
            <div className="pixel-frame bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <b className="text-sm flex items-center gap-1.5">
                  <UserCheck className="!h-4 !w-4 text-primary" />
                  <span>필드 함께 걷기 (부족민 동행)</span>
                </b>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    tribe?.escort
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tribe?.escort ? '동행 중' : '거점 대기'}
                </span>
              </div>

              <div className="pixel-box bg-background p-2.5 text-xs space-y-1">
                <p>
                  <b>효과:</b> 월드를 함께 걸을 때 채집 속도 <b>+30%</b>, 맹수 기습 시 어그로 분산
                  및 방어 보너스!
                </p>
                <p className="text-[11px] text-muted-foreground">
                  (거인 부족은 방어 피해를 감소시키고, 원거리 부족은 성벽 너머에서 요격합니다.
                  원정 출격 중에는 동행할 수 없습니다.)
                </p>
              </div>

              <Button
                type="button"
                variant={tribe?.escort ? 'secondary' : 'default'}
                disabled={count === 0 || isInjured || expeditionBusy}
                onClick={onToggleEscort}
                className="pixel-btn w-full py-2 text-xs font-bold"
              >
                {count === 0
                  ? '부족민이 없습니다 (먼저 영입하세요)'
                  : isInjured
                    ? '부상 중 (치료 전 동행 불가)'
                    : expeditionBusy
                      ? '원정 출격 중 (동행 불가)'
                      : tribe?.escort
                        ? '🛑 동행 멈추기 (거점에 남겨두기)'
                        : '🚶 함께 걷기 (필드 동행 시작)'}
              </Button>
            </div>

            {/* Section 2: Training */}
            <div className="pixel-frame bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <b className="text-sm flex items-center gap-1.5">
                  <Swords className="!h-4 !w-4 text-primary" />
                  <span>
                    부족민 훈련 (Lv.{trainLevel} / {TRIBE_TRAIN_MAX})
                  </span>
                </b>
                <span className="text-xs font-bold text-primary">
                  전투력 계수: {powerRatio}%
                </span>
              </div>

              {/* Progress Tier Bar */}
              <div className="flex items-center gap-1">
                {Array.from({ length: TRIBE_TRAIN_MAX }, (_, i) => {
                  const stepLv = i + 1;
                  const isDone = trainLevel >= stepLv;
                  return (
                    <div
                      key={stepLv}
                      className={`flex-1 text-center py-1 text-[10px] font-bold border ${
                        isDone
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground opacity-60'
                      }`}
                    >
                      Lv.{stepLv}
                    </div>
                  );
                })}
              </div>

              <div className="pixel-box bg-background p-2.5 text-xs space-y-1">
                <p>
                  훈련을 진행할 때마다 모든 부족민의 기본 전투·채집 능력이 <b>+3%</b>씩 영구히
                  상승합니다.
                </p>
                {trainCost ? (
                  <p className="text-[11px]">
                    훈련 비용:{' '}
                    <b className={canAffordTrain ? 'text-primary' : 'text-destructive'}>
                      {labelStacks(trainCost)}
                    </b>
                  </p>
                ) : (
                  <p className="text-primary font-bold">최고 훈련 단계에 도달했습니다 (Lv.5)</p>
                )}
              </div>

              <Button
                type="button"
                disabled={count === 0 || !trainCost || !canAffordTrain}
                onClick={onTrainTribe}
                className="pixel-btn w-full py-2 text-xs font-bold"
              >
                {count === 0
                  ? '부족민이 없습니다'
                  : !trainCost
                    ? '최고 단계 훈련 완료'
                    : !canAffordTrain
                      ? '재료 부족 (훈련 불가)'
                      : `⚔️ 부족민 Lv.${trainLevel + 1} 훈련하기`}
              </Button>
            </div>

            {/* Section 3: Emergency Treatment */}
            <div className="pixel-frame bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <b className="text-sm flex items-center gap-1.5">
                  <Heart className="!h-4 !w-4 text-destructive" />
                  <span>부상 치료 (응급 처치)</span>
                </b>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    isInjured
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-emerald-600/20 text-emerald-600'
                  }`}
                >
                  {isInjured ? '부상 중' : '모든 부족민 건강'}
                </span>
              </div>

              {isInjured ? (
                <div className="pixel-box bg-destructive/10 border-destructive/50 p-2.5 text-xs space-y-1">
                  <p className="font-bold text-destructive">
                    ⚠️ 부족민이 전투/원정 중 부상을 입었습니다!
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    남은 부상 시간: {Math.ceil(((tribe?.injuredUntil ?? 0) - now) / 60000)}분
                  </p>
                  <p className="text-[11px]">
                    치료 재료: <b className="text-foreground">{labelStacks(TRIBE_TREAT_COST)}</b>
                  </p>
                </div>
              ) : (
                <div className="pixel-box bg-background p-2 text-xs text-muted-foreground">
                  부상자가 없습니다. 부족민들이 최상의 컨디션으로 거점과 원정대를 지키고 있습니다.
                </div>
              )}

              {isInjured && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canAffordTreat}
                  onClick={onTreatTribe}
                  className="pixel-btn w-full py-2 text-xs font-bold"
                >
                  {canAffordTreat
                    ? '🩹 응급 치료하기 (약초 2개 · 샘물 1개)'
                    : '치료 재료 부족 (약초 2개와 샘물 1개 필요)'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Expedition Link */}
        {tab === 'expedition' && (
          <div className="space-y-3">
            <div className="pixel-frame bg-card p-3 space-y-2">
              <b className="text-sm flex items-center gap-1.5">
                <Compass className="!h-4 !w-4 text-primary" />
                <span>부족 원정대 출격 및 지휘</span>
              </b>
              <p className="text-xs text-muted-foreground leading-relaxed">
                부족민과 수호 펫들을 조직하여 거점 반경 1,500m 이내의 미개척지로 파견할 수 있습니다.
                원정대는 목재, 희귀 광석, 고기, 그리고 미지의 공룡 알을 찾아 거점으로 운반해 옵니다.
              </p>

              <div className="pixel-box bg-background p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span>출격 가능 부족민:</span>
                  <b className="text-primary">{count}명</b>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span>부상 상태:</span>
                  <span className={isInjured ? 'text-destructive font-bold' : 'text-emerald-600'}>
                    {isInjured ? '부상 중 (치료 필요)' : '정상 출격 가능'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>원정 추천 특화:</span>
                  <span className="font-bold">🎒 파밍 부족 (수거력 극대화)</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={onOpenExpedition}
                className="pixel-btn w-full py-2.5 text-xs font-bold bg-primary text-primary-foreground"
              >
                🗺️ 부족 원정대 출격 및 현황 화면 열기
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
