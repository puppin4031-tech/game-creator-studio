import { Flag, Flame, Home, Zap, Eye, Footprints, Pause, Play, X, ChevronRight, ChevronLeft, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FOCUS_LABEL, type ExpeditionFocus, type ExpeditionLog, type ObservedExpedition } from '@/lib/survival/expedition';
import { DEFAULT_TRIBE_CLASS, getTribeClass, TRIBE_CLASS_LIST, type TribeClassId } from '@/data/tribeClasses';
import type { LatLng } from '@/lib/survival/types';
import { distanceM } from '@/lib/survival/geo';
import { PLAYER_SPRITE_HEIGHT } from '@/lib/survival/spriteMeta';
import CharacterSprite from './CharacterSprite';
import TribeSprite from './TribeSprite';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CombatImpact, expeditionActorPoint, freshCombatHit } from './ExpeditionCombat';
import { bundledSpriteUrl } from '@/hooks/useItemCatalog';

const SQUAD_CLASSES: TribeClassId[] = ['tank', 'ranged', 'gatherer', 'assassin'];

export function ExpeditionMarker({ crew, project, members = 1, tribeClass }: { crew: ObservedExpedition; project: (p: LatLng) => { x: number; y: number }; members?: number; tribeClass?: TribeClassId }) {
  const pos = expeditionActorPoint(crew, project);
  const hit = freshCombatHit(crew);
  const reduced = useReducedMotion();
  const isAmbacho = crew.mercenary === '암바초' || crew.mercenary?.includes('암바초');
  const activeClassId: TribeClassId = isAmbacho ? 'gatherer' : (crew.tribeClass ?? tribeClass ?? 'gatherer');
  const cls = activeClassId ? getTribeClass(activeClassId) : null;
  const target = crew.target?.kind === 'creature' ? project(crew.target) : hit ? project(hit.target) : null;
  const dx = target ? target.x - pos.x : 0, dy = target ? target.y - pos.y : 0;
  const length = Math.hypot(dx, dy) || 1;
  const striking = !!hit;
  // 4-frame action loop
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setTick(f => f + 1), cls?.id === 'assassin' ? 90 : 140); return () => window.clearInterval(t); }, [cls?.id]);
  const lastPos = useRef(crew.pos); const movedAt = useRef(0);
  if (lastPos.current.lat !== crew.pos.lat || lastPos.current.lng !== crew.pos.lng) { lastPos.current = crew.pos; movedAt.current = Date.now(); }
  const since = hit ? Date.now() - hit.at : Infinity;
  const trail = useRef<LatLng[]>([]);
  const last = trail.current[trail.current.length - 1];
  if (!last || distanceM(last, crew.pos) > 2) trail.current = [...trail.current, crew.pos].slice(-60);
  const engageRadius = cls ? Math.max(10, cls.attackRangeM) : 10;
  const isWoodNode = crew.target?.kind === 'node' && ((crew.target.type as string) === 'oak' || (crew.target.type as string) === 'pine');
  const tribeAct = since < 220 ? 'attack' : crew.target && (!crew.manual || distanceM(crew.pos, crew.target) <= engageRadius) ? (crew.target.kind === 'node' ? (isWoodNode ? 'chop' : 'gather') : 'attack') : 'walk';
  const rapidStrike = cls?.id === 'assassin';
  return <>
  <div data-expedition-marker className={`pointer-events-none absolute z-10 flex w-28 -translate-x-1/2 -translate-y-full flex-col items-center ${target ? '' : 'transition-[left,top] duration-1000 ease-linear motion-reduce:transition-none'}`} style={{ left: pos.x, top: pos.y }}>
    <span className="absolute -top-5 whitespace-nowrap rounded bg-card/90 border border-border px-1.5 py-0.5 text-[10px] font-bold shadow-sm">
      {crew.mercenary ? `${cls ? `${cls.icon} ${cls.name}` : `부족민 ${crew.mercenary}`}` : '원정'} · HP {crew.hp}
    </span>
    <motion.div key={hit?.at ?? 'march'} data-expedition-strike={hit?.at} className="relative" initial={false}
      animate={striking && !reduced ? (rapidStrike
        ? { x: [0, dx / length * 26, -dx / length * 6, dx / length * 28, 0], y: [0, dy / length * 26, -dy / length * 6, dy / length * 28, 0] }
        : { x: [0, dx / length * 28, -dx / length * 7, 0], y: [0, dy / length * 28, -dy / length * 7, 0] }) : { x: 0, y: 0 }}
      transition={rapidStrike ? { duration: 0.42, times: [0, 0.25, 0.5, 0.75, 1] } : { duration: 0.65, times: [0, 0.23, 0.6, 1] }}>
      <div style={{ transform: (target ? dx < 0 : crew.facing === -1) ? 'scaleX(-1)' : undefined }} className="relative flex items-end justify-center">
        {/* 리더 부족민 (대장) */}
        {crew.mercenary && <TribeSprite action={tribeAct} tribeClass={activeClassId} height={52} frameOffset={0} memberIndex={0} />}
        {/* 분대 동행 부족민들: 실제 보유/파견된 부족민 수(members)에 맞춰 렌더링 (암바초 1명일 때는 추가 동행 부족민 0명) */}
        {crew.mercenary && Array.from({ length: Math.min(4, Math.max(0, (crew.members ?? members ?? 1) - 1)) }, (_, k) => {
          const squadClass = SQUAD_CLASSES[(k + (activeClassId === 'tank' ? 1 : 0)) % SQUAD_CLASSES.length];
          const followerAction = tribeAct === 'attack' ? (k % 2 === 1 ? 'attack' : 'idle') : tribeAct;
          const bobY = Math.sin((tick + k * 2) * 0.7) * 2;
          const squadClsDef = getTribeClass(squadClass);
          return (
            <div
              key={k}
              aria-hidden
              className="pointer-events-none absolute bottom-0 opacity-95"
              style={{
                left: k % 2 === 0 ? -18 - Math.floor(k / 2) * 16 : 18 + Math.floor(k / 2) * 16,
                bottom: ((k + 1) % 2) * 3,
                transform: `translateY(${bobY}px)`,
              }}
            >
              <div className="relative">
                <span
                  style={{ transform: (target ? dx < 0 : crew.facing === -1) ? 'scaleX(-1)' : undefined }}
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] drop-shadow inline-block"
                >
                  {squadClsDef.icon}
                </span>
                <TribeSprite
                  action={followerAction}
                  tribeClass={squadClass}
                  height={42}
                  frameOffset={k + 1}
                  memberIndex={k + 1}
                  speedMult={0.92 + k * 0.06}
                />
              </div>
            </div>
          );
        })}
        {crew.mercenary ? null : <CharacterSprite height={PLAYER_SPRITE_HEIGHT} action={hit ? 'attack' : crew.target ? crew.target.kind === 'node' ? 'chop' : 'attack' : 'walk'} />}
      </div>
      {hit && hit.counterDamage > 0 && <CombatImpact stamp={hit.at} damage={hit.counterDamage} />}
    </motion.div>
    {crew.target && <Zap className="absolute right-1 top-6 !h-4 !w-4 animate-pulse text-primary" />}
  </div>
  </>;
}

interface Props {
  crew?: ObservedExpedition | null; logs: ExpeditionLog[]; target: LatLng | null;
  home: LatLng | null; auto: boolean; pocket: boolean; outdoor: boolean; watching: boolean;
  gpsReady: boolean; canSend: boolean; onSend: () => void; onAuto: () => void;
  focus: ExpeditionFocus; onFocus: (f: ExpeditionFocus) => void;
  onPocket: () => void; onMorale: () => void; onReturn: () => void; onWatch: () => void;
  tribe?: TribeInfo;
  tribeClass?: TribeClassId;
  onSelectClass?: (c: TribeClassId) => void;
  expeditionLevel?: number;
  autoRemainingSec?: number;
  autoLimitSec?: number;
  ambachoDailyDone?: boolean;
}
export interface TribeInfo {
  count: number;
  trainLevel: number;
  ratio: number;
  maxHp: number;
  injured: boolean;
  starving: boolean;
  classId?: TribeClassId;
  classCounts?: Partial<Record<TribeClassId, number>>;
  mercenaryName?: string;
  ambachoDailyDone?: boolean;
}

export interface TribeMember {
  id: string;
  name: string;
  title: string;
  classId: TribeClassId;
  roleDescription: string;
  specialPerk: string;
  slotIndex: number;
}

export function buildTribeMembers(tribe?: TribeInfo, activeTribeClass?: TribeClassId): TribeMember[] {
  if (!tribe || (tribe.count ?? 0) <= 0) return [];
  const count = Math.max(1, tribe.count);
  const baseClass = activeTribeClass ?? tribe.classId ?? DEFAULT_TRIBE_CLASS;
  const counts = tribe.classCounts ?? {};

  const list: TribeMember[] = [];

  // Slot 0 is strictly Ambacho (파밍 부족 / 채집가)
  list.push({
    id: 'member_0_ambacho',
    name: '암바초',
    title: '파밍 부족민 (1번째 동료)',
    classId: 'gatherer',
    roleDescription: '물자 탐색 및 자원 채집 특화 (1일 1회 원정)',
    specialPerk: '돌·나무·약초 채집 속도 +50%, 1일 1회 안전 원정 수행 (복귀 후 거점 휴식)',
    slotIndex: 0,
  });

  const ARCHETYPES: Record<TribeClassId, { names: string[]; titles: string[]; perks: string[] }> = {
    tank: {
      names: ['볼크', '타란', '고르', '바론', '두르'],
      titles: ['바위의 수호자', '철벽의 방패병', '거점 수호대장', '대지의 전사', '불굴의 거인'],
      perks: [
        '선봉 방어 25% 피해 경감, 맹수 어그로 유인 및 아군 안전 확보',
        '체력 +30%, 원정대 피격 시 반격 피해 40% 반사',
        '주변 아군 방어력 +10% 오라 및 기절 저항',
        '중장갑 방어 및 거점 방어 시 생존력 대폭 강화',
        '도발 함성으로 맹수 시선 집중 및 피격 시 방어력 중첩',
      ],
    },
    ranged: {
      names: ['루카', '카이', '엘린', '샤야', '리안'],
      titles: ['숲의 궁수', '바람의 사냥꾼', '매의 눈 정찰병', '깃털 저격수', '정밀 투창병'],
      perks: [
        '사거리 28m 원거리 저격, 맹수 접근 전 선제 타격 및 치명타 +30%',
        '도망치는 맹수 추적 속도 +20%, 가죽·고기 획득량 +25%',
        '시야 반경 +15m 확장, 미발견 자원 및 상자 탐지 확률 증가',
        '원거리 맹수 급소 관통 타격 및 이동속도 저하',
        '투사체 탄속 2배 및 맹수 저항 무시 관통 공격',
      ],
    },
    assassin: {
      names: ['시온', '레노', '카르', '제트', '블레이크'],
      titles: ['그림자 척후병', '독니 암살자', '밤의 추적자', '질풍의 칼날', '은밀한 추적자'],
      perks: [
        '공격 속도 1.8배 가속, 기습 타격 시 맹수 출혈 피해 부여',
        '첫 타격 200% 기습 대미지, 맹수 공격력 15% 약화',
        '회피율 +20%, 신속한 이동으로 위험 상황 이탈',
        '맹수 치명타 시 즉시 재공격 및 연속 연타',
        '야간 전투 시 공격력 +35% 및 맹수 감지 범위 축소',
      ],
    },
    gatherer: {
      names: ['마야', '도리', '루나', '솔', '보리'],
      titles: ['약초 채집사', '곡괭이 장인', '열매 수확가', '대지 탐험가', '풍요의 채집꾼'],
      perks: [
        '식량/약초 수확량 +50% 및 신선도 유지 시간 증가',
        '목재 및 광석 채집 시 희귀 광석 추가 획득 확률 +20%',
        '배낭 및 창고 보관 효율 증가 (+10kg 운반량)',
        '주변 자원 재생 시간 20% 단축',
        '모든 채집 행동의 스태미나 소모 25% 절감',
      ],
    },
  };

  for (let k = 1; k < count; k++) {
    let memberClass: TribeClassId = baseClass;
    if (counts.tank && k <= (counts.tank ?? 0)) {
      memberClass = 'tank';
    } else if (counts.ranged && k <= (counts.tank ?? 0) + (counts.ranged ?? 0)) {
      memberClass = 'ranged';
    } else if (counts.assassin && k <= (counts.tank ?? 0) + (counts.ranged ?? 0) + (counts.assassin ?? 0)) {
      memberClass = 'assassin';
    } else {
      const classCycle: TribeClassId[] = ['tank', 'ranged', 'assassin', 'gatherer'];
      memberClass = classCycle[(k - 1) % classCycle.length];
    }

    const archetype = ARCHETYPES[memberClass];
    const nameIdx = (k - 1) % archetype.names.length;
    const name = archetype.names[nameIdx];
    const title = archetype.titles[nameIdx];
    const specialPerk = archetype.perks[nameIdx];

    list.push({
      id: `member_${k}_${name}`,
      name,
      title: `${title} (${k + 1}번째 동료)`,
      classId: memberClass,
      roleDescription: getTribeClass(memberClass).perkSummary,
      specialPerk,
      slotIndex: k,
    });
  }

  return list;
}

const FOCUS_META: Record<ExpeditionFocus, { label: string; icon: string; short: string; detail: string }> = {
  hunt: {
    label: '사냥 (맹수)',
    icon: '🍗',
    short: '맹수 사냥',
    detail: '맹수 레이더 65m 전용 추적 · 고기/가죽/뼈 +50% 특화 (잡목·잡석 채집 일체 배제)',
  },
  survival: {
    label: '생존필수품',
    icon: '🍎',
    short: '식량·약초',
    detail: '식량/샘물/약초 45m 집중 탐색 · 식량 수확량 +50% 특화',
  },
  materials: {
    label: '건축·제작 재료',
    icon: '🪵',
    short: '목재·광석',
    detail: '목재/석재/점토/광석 45m 집중 탐색 · 건축 자재 +50% 특화',
  },
};

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function TribeClassBadge({ selected }: { selected: TribeClassId }) {
  const cls = getTribeClass(selected);
  return (
    <div className="flex items-center gap-1.5 rounded border border-border/70 bg-card/80 px-2 py-1.5 text-[11px]">
      <TribeSprite action="idle" tribeClass={selected} height={26} />
      <div className="min-w-0 flex-1 leading-tight">
        <b className="text-primary">{cls.icon} {cls.name} ({cls.weaponName})</b>
        <p className="truncate text-muted-foreground">{cls.perkSummary}</p>
      </div>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">영입 확정</span>
    </div>
  );
}

function TribeStats({ t, crew, selectedClass }: { t?: TribeInfo; crew?: ObservedExpedition | null; selectedClass: TribeClassId }) {
  const cls = getTribeClass(selectedClass);
  if (!t || t.count <= 0) return (
    <div className="space-y-2">
      <TribeClassBadge selected={selectedClass} />
      <p className="py-2 text-center text-muted-foreground">아직 부족민이 없어요. 거점 부족회관에서 영입하세요.</p>
    </div>
  );
  const atk = Math.max(1, Math.round(12 * t.ratio * cls.atkMult));
  const hp = crew?.maxHp ?? Math.max(1, Math.round(t.maxHp * cls.hpMult));
  const def = 3 + cls.defBonus;
  const rows: [string, string][] = [
    ['병종·무기', `${cls.icon} ${cls.name} · ${cls.weaponName}`],
    ['인원·훈련', `${t.count}명 · 훈련 ${t.trainLevel}단계`],
    ['상태', t.injured ? '부상 치료 중' : t.starving ? '굶주림 (능력 절반)' : '정상'],
    ['공격력·속도', `1인 ${atk} × ${t.count}연타 (${(1 / cls.attackIntervalMult).toFixed(1)}배속)`],
    ['체력', crew ? `${crew.hp}/${hp}` : `${hp} (합산)`],
    ['방어·사거리', `방어 ${def} · 사거리 ${cls.attackRangeM}m`],
  ];
  return (
    <div className="space-y-1.5">
      <TribeClassBadge selected={selectedClass} />
      <dl className="grid grid-cols-2 gap-1">{rows.map(([k, v]) => <div key={k} className="pixel-box bg-card px-2 py-1"><dt className="text-[10px] text-muted-foreground">{k}</dt><dd className="font-bold text-xs">{v}</dd></div>)}</dl>
    </div>
  );
}
export default function ExpeditionSystem(p: Props) {
  const [tribeDetailOpen, setTribeDetailOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TribeMember | null>(null);
  const activeClass = p.crew?.tribeClass ?? p.tribeClass ?? p.tribe?.classId ?? DEFAULT_TRIBE_CLASS;
  const cls = getTribeClass(activeClass);
  const compactBtn = 'h-auto min-h-0 py-1.5 px-2 text-xs';
  const memberCount = p.tribe?.count ?? 0;
  const statusText = p.crew
    ? `HP ${p.crew.hp}/${p.crew.maxHp ?? 100} · ${p.crew.phase === 'returning' ? '귀환' : p.crew.target ? '작업' : '행군'}`
    : memberCount > 0
      ? `대기 중 · ${memberCount}명`
      : '영입 필요';

  const memberList = useMemo(() => buildTribeMembers(p.tribe, activeClass), [p.tribe, activeClass]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
  }, [memberList.length, checkScroll]);

  const handleScrollLeft = () => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.clientWidth / Math.min(4, memberList.length);
    scrollRef.current.scrollBy({ left: -cardWidth * 2, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  const handleScrollRight = () => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.clientWidth / Math.min(4, memberList.length);
    scrollRef.current.scrollBy({ left: cardWidth * 2, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  return (
    <section aria-label="원정대 관찰" className="space-y-1.5 border-t border-border bg-background/95 p-2 text-xs">
      {/* 가로 최대 4명 부족원 배치 박스 (초과 시 좌우 화살표 스크롤, 클릭 시 개별 상세 팝업) */}
      <div className="relative rounded-md border border-border/80 bg-card p-2 shadow-xs">
        {/* 상단 헤더: 전체 요약 및 전체 정보 보기 */}
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground text-[11px]">부족원 목록</span>
            <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[10px] font-bold text-primary">
              {memberList.length}명
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">{statusText}</span>
            <button
              type="button"
              onClick={() => setTribeDetailOpen(true)}
              className="flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:underline ml-1"
            >
              전체 정보 <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 가로 4명 배치 트랙 & 좌우 스크롤 내비게이션 */}
        <div className="relative flex items-center">
          {memberList.length > 4 && (
            <button
              type="button"
              onClick={handleScrollLeft}
              disabled={!canScrollLeft}
              aria-label="이전 부족원 보기"
              className="absolute -left-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background/95 border border-border shadow-md hover:bg-accent disabled:opacity-0 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-foreground" />
            </button>
          )}

          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex w-full items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 px-0.5 scroll-smooth"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {memberList.map((m, idx) => {
              const mCls = getTribeClass(m.classId);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMember(m)}
                  className="group relative flex flex-col items-center justify-between rounded-lg border border-border/80 bg-background/70 p-1.5 text-center transition-all hover:border-primary/70 hover:bg-accent/40 active:scale-95 shrink-0"
                  style={{
                    width: memberList.length <= 4 ? `calc((100% - ${(memberList.length - 1) * 6}px) / ${memberList.length})` : 'calc((100% - 18px) / 4)',
                    minWidth: '66px',
                    maxWidth: memberList.length === 1 ? '100%' : '84px',
                    scrollSnapAlign: 'start',
                  }}
                >
                  {/* 스프라이트 아바타 */}
                  <div className="relative flex h-10 w-10 items-center justify-center rounded bg-muted/60 group-hover:bg-primary/10 transition-colors">
                    <TribeSprite action={p.crew ? 'walk' : 'idle'} tribeClass={m.classId} height={32} frameOffset={idx} memberIndex={idx} />
                    <span className="absolute -top-1 -right-1 text-[10px] drop-shadow-sm">
                      {mCls.icon}
                    </span>
                  </div>

                  {/* 이름 & 병종 */}
                  <span className="mt-1 w-full truncate text-[11px] font-bold text-foreground group-hover:text-primary">
                    {m.name}
                  </span>
                  <span className="w-full truncate text-[9px] text-muted-foreground">
                    {mCls.name}
                  </span>
                </button>
              );
            })}
          </div>

          {memberList.length > 4 && (
            <button
              type="button"
              onClick={handleScrollRight}
              disabled={!canScrollRight}
              aria-label="다음 부족원 보기"
              className="absolute -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background/95 border border-border shadow-md hover:bg-accent disabled:opacity-0 disabled:pointer-events-none transition-all"
            >
              <ChevronRight className="h-3.5 w-3.5 text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* 원정 목표 선택 (심플 3버튼) */}
      <div role="radiogroup" aria-label="원정 목표" className="grid grid-cols-3 gap-1">
        {(Object.keys(FOCUS_META) as ExpeditionFocus[]).map(f => {
          const meta = FOCUS_META[f];
          return (
            <Button
              key={f}
              size="sm"
              role="radio"
              aria-checked={p.focus === f}
              variant={p.focus === f ? 'default' : 'outline'}
              disabled={!!p.crew}
              className={`${compactBtn} flex items-center justify-center gap-1 font-bold`}
              onClick={() => p.onFocus(f)}
            >
              <span>{meta.icon}</span>
              <span>{meta.short}</span>
            </Button>
          );
        })}
      </div>

      {/* 자동원정 잔여시간 한 줄 요약 */}
      <div className="flex items-center justify-between px-1 text-[11px]">
        <span className="text-muted-foreground">⏱️ 오늘 자동원정</span>
        <span className={`font-mono font-bold ${(p.autoRemainingSec !== undefined && p.autoRemainingSec <= 0) ? 'text-destructive' : 'text-primary'}`}>
          {p.autoRemainingSec !== undefined && p.autoRemainingSec <= 0
            ? '한도 소진 (00:00 초기화)'
            : `${fmtDuration(p.autoRemainingSec ?? 21600)} / 6시간`}
        </span>
      </div>

      {/* 핵심 액션 버튼 */}
      <div className="grid grid-cols-2 gap-1">
        <Button size="sm" className={`${compactBtn} whitespace-normal`} disabled={!p.canSend || !!p.crew} onClick={p.onSend}>
          <Flag className="!h-3.5 !w-3.5 shrink-0" />
          {p.target && p.home ? `${Math.round(distanceM(p.home, p.target))}m 파견` : '원정대 파견'}
        </Button>
        <Button
          size="sm"
          variant={p.auto ? 'default' : 'outline'}
          className={`${compactBtn} whitespace-normal`}
          disabled={(!p.canSend && !p.auto) || ((p.autoRemainingSec !== undefined && p.autoRemainingSec <= 0) && !p.auto)}
          aria-pressed={p.auto}
          onClick={p.onAuto}
        >
          {p.auto ? <Pause className="!h-3.5 !w-3.5" /> : <Play className="!h-3.5 !w-3.5" />}
          {p.auto
            ? '자동사냥 끄기'
            : isAmbachoExhausted
              ? '자동사냥 (완료)'
              : (p.autoRemainingSec !== undefined && p.autoRemainingSec <= 0)
                ? '자동사냥 (소진)'
                : '자동사냥 켜기'}
        </Button>
        <Button size="sm" variant="outline" className={`${compactBtn} whitespace-normal`} disabled={!p.crew || Date.now() < (p.crew?.moraleReadyAt ?? 0)} onClick={p.onMorale}>
          <Zap className="!h-3.5 !w-3.5 shrink-0" />사기 진작
        </Button>
        <Button size="sm" variant="outline" className={compactBtn} disabled={!p.crew} onClick={p.onReturn}>
          <Home className="!h-3.5 !w-3.5" />즉시 귀환
        </Button>
      </div>

      <div className="flex gap-1">
        <Button variant={p.pocket ? 'default' : 'outline'} size="sm" className={`${compactBtn} flex-1 whitespace-normal`} aria-pressed={p.pocket} onClick={p.onPocket}>
          <Footprints className="!h-3.5 !w-3.5 shrink-0" />포켓 {p.pocket ? 'ON' : 'OFF'}
        </Button>
        <Button variant={p.watching ? 'default' : 'outline'} size="sm" className={compactBtn} disabled={!p.crew} aria-pressed={p.watching} onClick={p.onWatch}>
          <Eye className="!h-3.5 !w-3.5" />관찰
        </Button>
      </div>

      {/* 개별 부족원 상세 정보 팝업 모달 */}
      {selectedMember && (() => {
        const mCls = getTribeClass(selectedMember.classId);
        const memberIdx = memberList.findIndex(m => m.id === selectedMember.id);
        const prevMember = memberIdx > 0 ? memberList[memberIdx - 1] : null;
        const nextMember = memberIdx < memberList.length - 1 ? memberList[memberIdx + 1] : null;
        const atk = Math.max(1, Math.round(12 * (p.tribe?.ratio ?? 1) * mCls.atkMult));
        const hp = p.crew?.maxHp ?? Math.max(1, Math.round((p.tribe?.maxHp ?? 100) * mCls.hpMult));
        const curHp = p.crew ? p.crew.hp : hp;
        const def = 3 + mCls.defBonus;

        const memberEquip = {
          weapon: {
            name: mCls.weaponName,
            iconKey: selectedMember.classId === 'gatherer'
              ? 'item-flint-hatchet'
              : selectedMember.classId === 'ranged'
                ? 'item-flint-spear'
                : selectedMember.classId === 'assassin'
                  ? 'item-bone-dagger'
                  : 'item-stone-maul',
            stat: `공격 +${atk}`,
          },
          armor: {
            name: `원시 부족 가죽옷 (Lv.${p.expeditionLevel ?? 1})`,
            iconKey: 'item-fur-cloak',
            stat: `방어 +${def}`,
          },
          tool: {
            name: selectedMember.classId === 'gatherer'
              ? '채집 망태 & 가죽 배낭'
              : '수호의 뼈 부적',
            iconKey: selectedMember.classId === 'gatherer'
              ? 'item-digging-stick'
              : 'item-bone-charm',
            stat: selectedMember.classId === 'gatherer'
              ? `운반 +${Math.round(mCls.carryBonusRatio * 100)}%`
              : '사기 +10%',
          },
        };

        return (
          <div
            className="fixed inset-0 z-[125] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={() => setSelectedMember(null)}
          >
            <div
              className="pixel-panel w-full max-w-sm space-y-3 bg-background p-4 shadow-2xl border border-primary/40 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 상단 헤더: 스프라이트 / 이름 / 병종 */}
              <div className="flex items-start justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/25">
                    <TribeSprite action="walk" tribeClass={selectedMember.classId} height={46} memberIndex={memberIdx} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-base font-extrabold text-foreground truncate">{selectedMember.name}</h3>
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        Lv.{p.expeditionLevel ?? 1}
                      </span>
                    </div>
                    <p className="text-xs text-primary font-medium truncate">{selectedMember.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {mCls.icon} {mCls.name} · 무기: {mCls.weaponName}
                    </p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full shrink-0" onClick={() => setSelectedMember(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 현재 상태 배너 */}
              <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">현재 상태</span>
                <span className="font-bold text-foreground">
                  {p.crew
                    ? `원정 수행 중 (HP ${curHp}/${hp})`
                    : p.tribe?.injured
                      ? '부상 치료 중'
                      : '거점 대기 중 (출정 준비 완료)'}
                </span>
              </div>

              {/* 핵심 능력치 4분할 그리드 */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="pixel-box bg-card p-2 rounded">
                  <span className="text-[10px] text-muted-foreground block">공격력 / 공격속도</span>
                  <span className="font-bold text-foreground text-xs">
                    {atk} 피해
                    <span className="text-[10px] text-muted-foreground font-normal ml-1">
                      ({(1 / mCls.attackIntervalMult).toFixed(1)}배속)
                    </span>
                  </span>
                </div>
                <div className="pixel-box bg-card p-2 rounded">
                  <span className="text-[10px] text-muted-foreground block">방어력 / 사거리</span>
                  <span className="font-bold text-foreground text-xs">
                    방어 {def}
                    <span className="text-[10px] text-muted-foreground font-normal ml-1">
                      · {mCls.attackRangeM}m
                    </span>
                  </span>
                </div>
                <div className="pixel-box bg-card p-2 rounded">
                  <span className="text-[10px] text-muted-foreground block">체력 (합산)</span>
                  <span className="font-bold text-foreground text-xs">{curHp} / {hp}</span>
                </div>
                <div className="pixel-box bg-card p-2 rounded">
                  <span className="text-[10px] text-muted-foreground block">동행 운반 보너스</span>
                  <span className="font-bold text-foreground text-xs">+{Math.round(mCls.carryBonusRatio * 100)}% 운반</span>
                </div>
              </div>

              {/* 개별 부족원 착용 장비 (무기, 방어구, 도구/부적 3슬롯) */}
              <div className="space-y-1.5 pt-0.5">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <span>🛡️</span>
                  <span>부족원 착용 장비 (3슬롯)</span>
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="pixel-box bg-card p-1.5 rounded flex flex-col items-center text-center">
                    <div className="h-8 w-8 flex items-center justify-center bg-muted/70 rounded mb-1">
                      <img src={bundledSpriteUrl(memberEquip.weapon.iconKey) ?? ''} alt="" className="pixelated h-6 w-6 object-contain drop-shadow" />
                    </div>
                    <span className="text-[10px] font-bold truncate w-full text-foreground">{memberEquip.weapon.name}</span>
                    <span className="text-[9px] text-amber-500 font-mono truncate w-full">{memberEquip.weapon.stat}</span>
                  </div>
                  <div className="pixel-box bg-card p-1.5 rounded flex flex-col items-center text-center">
                    <div className="h-8 w-8 flex items-center justify-center bg-muted/70 rounded mb-1">
                      <img src={bundledSpriteUrl(memberEquip.armor.iconKey) ?? ''} alt="" className="pixelated h-6 w-6 object-contain drop-shadow" />
                    </div>
                    <span className="text-[10px] font-bold truncate w-full text-foreground">{memberEquip.armor.name}</span>
                    <span className="text-[9px] text-sky-400 font-mono truncate w-full">{memberEquip.armor.stat}</span>
                  </div>
                  <div className="pixel-box bg-card p-1.5 rounded flex flex-col items-center text-center">
                    <div className="h-8 w-8 flex items-center justify-center bg-muted/70 rounded mb-1">
                      <img src={bundledSpriteUrl(memberEquip.tool.iconKey) ?? ''} alt="" className="pixelated h-6 w-6 object-contain drop-shadow" />
                    </div>
                    <span className="text-[10px] font-bold truncate w-full text-foreground">{memberEquip.tool.name}</span>
                    <span className="text-[9px] text-emerald-400 font-mono truncate w-full">{memberEquip.tool.stat}</span>
                  </div>
                </div>
              </div>

              {/* 고유 특기 및 병종 패시브 */}
              <div className="rounded-lg border border-primary/25 bg-primary/10 p-2.5 text-xs leading-relaxed space-y-1">
                <div className="flex items-center gap-1 font-bold text-primary text-[11px]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>고유 특기 및 역할:</span>
                </div>
                <p className="text-foreground text-[11px] font-medium">
                  {selectedMember.specialPerk}
                </p>
                <p className="text-[10px] text-muted-foreground pt-1 border-t border-primary/15">
                  {mCls.perkSummary}
                </p>
              </div>

              {/* 하단 내비게이션 & 닫기 버튼 */}
              <div className="flex items-center gap-2 pt-1">
                {memberList.length > 1 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 text-xs"
                      disabled={!prevMember}
                      onClick={() => prevMember && setSelectedMember(prevMember)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> 이전 동료
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 text-xs"
                      disabled={!nextMember}
                      onClick={() => nextMember && setSelectedMember(nextMember)}
                    >
                      다음 동료 <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  className={`${memberList.length > 1 ? 'w-20' : 'w-full'} h-8 text-xs font-bold`}
                  onClick={() => setSelectedMember(null)}
                >
                  확인
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 부족민 전체 요약 정보 팝업 */}
      {tribeDetailOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setTribeDetailOpen(false)}
        >
          <div
            className="pixel-panel w-full max-w-sm space-y-2.5 bg-background p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <TribeSprite action="idle" tribeClass={activeClass} height={32} />
                <div>
                  <h3 className="text-sm font-bold text-foreground">{cls.icon} {cls.name} 상세 정보</h3>
                  <p className="text-[11px] text-muted-foreground">{p.expeditionLevel ?? 1}레벨 원정대 · {FOCUS_META[p.focus].label}</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setTribeDetailOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <TribeStats t={p.tribe} crew={p.crew} selectedClass={activeClass} />

            {p.outdoor && (
              <div role="status" className="flex items-center gap-1 rounded bg-primary/15 px-2 py-1 text-[11px] font-bold text-foreground">
                <Flame className="!h-3.5 !w-3.5 shrink-0 text-primary" />족장 친정 · 채집량 200% · 희귀 유물 3배
              </div>
            )}

            <div className="rounded border border-primary/25 bg-primary/10 px-2 py-1.5 text-[11px] leading-snug">
              <span className="font-bold text-primary">{FOCUS_META[p.focus].icon} {FOCUS_META[p.focus].label}: </span>
              <span className="text-foreground">{FOCUS_META[p.focus].detail}</span>
            </div>

            {p.pocket && (
              <p className="text-[11px] text-muted-foreground">
                {p.gpsReady ? '20km/h 이하 이동 자동채집 · GPS 수신 중' : '위치 신호 대기 · 자동채집 일시정지'}
              </p>
            )}

            <div>
              <div className="mb-1 text-[10px] font-bold text-muted-foreground">최근 활동 기록</div>
              <ol aria-label="원정대 활동 로그" aria-live="polite" className="max-h-20 space-y-0.5 overflow-y-auto border-l-2 border-primary pl-2 text-[11px]">
                {p.logs.length ? p.logs.slice(-5).map((log, i) => <li key={`${log.at}-${i}`}>{log.text}</li>) : <li className="text-muted-foreground">모닥불 · 원정대 대기 중</li>}
              </ol>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}