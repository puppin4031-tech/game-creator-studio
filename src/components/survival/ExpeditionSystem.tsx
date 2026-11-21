import { Flag, Flame, Home, Zap, Eye, Footprints, Pause, Play, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FOCUS_LABEL, type ExpeditionFocus, type ExpeditionLog, type ObservedExpedition } from '@/lib/survival/expedition';
import { DEFAULT_TRIBE_CLASS, getTribeClass, TRIBE_CLASS_LIST, type TribeClassId } from '@/data/tribeClasses';
import type { LatLng } from '@/lib/survival/types';
import { distanceM } from '@/lib/survival/geo';
import { PLAYER_SPRITE_HEIGHT } from '@/lib/survival/spriteMeta';
import CharacterSprite from './CharacterSprite';
import TribeSprite from './TribeSprite';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CombatImpact, expeditionActorPoint, freshCombatHit } from './ExpeditionCombat';

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
        {crew.mercenary && <TribeSprite action={tribeAct} tribeClass={activeClassId} height={52} frameOffset={0} />}
        {/* 분대 동행 부족민들: 각각 고유한 클래스와 엇박자 보행 움직임 부여 */}
        {crew.mercenary && Array.from({ length: Math.min(4, Math.max(2, members) - 1) }, (_, k) => {
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
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] drop-shadow">
                  {squadClsDef.icon}
                </span>
                <TribeSprite action={followerAction} tribeClass={squadClass} height={42} frameOffset={k + 1} />
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
}
export interface TribeInfo { count: number; trainLevel: number; ratio: number; maxHp: number; injured: boolean; starving: boolean; classId?: TribeClassId }

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
  const activeClass = p.crew?.tribeClass ?? p.tribeClass ?? p.tribe?.classId ?? DEFAULT_TRIBE_CLASS;
  const cls = getTribeClass(activeClass);
  const compactBtn = 'h-auto min-h-0 py-1.5 px-2 text-xs';
  const memberCount = p.tribe?.count ?? 0;
  const statusText = p.crew
    ? `HP ${p.crew.hp}/${p.crew.maxHp ?? 100} · ${p.crew.phase === 'returning' ? '귀환' : p.crew.target ? '작업' : '행군'}`
    : memberCount > 0
      ? `대기 중 · ${memberCount}명`
      : '영입 필요';

  return (
    <section aria-label="원정대 관찰" className="space-y-1.5 border-t border-border bg-background/95 p-2 text-xs">
      {/* 심플 부족민 카드: 디자인 스프라이트 / 이름 (클릭 시 상세 정보 팝업) */}
      <button
        type="button"
        onClick={() => setTribeDetailOpen(true)}
        className="flex w-full items-center gap-2 rounded-md border border-border/80 bg-card px-2.5 py-1.5 text-left transition-colors hover:bg-accent/30 active:scale-[0.99]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted/60">
          <TribeSprite action={p.crew ? 'walk' : 'idle'} tribeClass={activeClass} height={34} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground truncate">{cls.icon} {cls.name}</span>
            <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[10px] font-bold text-primary">Lv.{p.expeditionLevel ?? 1}</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{statusText}</p>
        </div>
        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground shrink-0">
          정보 <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </button>

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

      {/* 부족민 상세 정보 팝업 */}
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