import { Flag, Flame, Home, Zap, Eye, Footprints, Pause, Play } from 'lucide-react';
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

export function ExpeditionMarker({ crew, project, members = 1, tribeClass }: { crew: ObservedExpedition; project: (p: LatLng) => { x: number; y: number }; members?: number; tribeClass?: TribeClassId }) {
  const pos = expeditionActorPoint(crew, project);
  const hit = freshCombatHit(crew);
  const reduced = useReducedMotion();
  const activeClassId = crew.tribeClass ?? tribeClass;
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
  const tribeAct = since < 220 ? 'attack' : crew.target && (!crew.manual || distanceM(crew.pos, crew.target) <= engageRadius) ? (crew.target.kind === 'node' ? 'gather' : 'attack') : 'walk';
  const rapidStrike = cls?.id === 'assassin';
  return <>
  <div data-expedition-marker className={`pointer-events-none absolute z-10 flex w-24 -translate-x-1/2 -translate-y-full flex-col items-center ${target ? '' : 'transition-[left,top] duration-1000 ease-linear motion-reduce:transition-none'}`} style={{ left: pos.x, top: pos.y }}>
    <span className="absolute -top-5 whitespace-nowrap rounded bg-card px-1 text-[10px]">{crew.mercenary ? `${cls ? `${cls.icon} ${cls.name}` : `부족민 ${crew.mercenary}`}` : '원정'} · HP {crew.hp}</span>
    <motion.div key={hit?.at ?? 'march'} data-expedition-strike={hit?.at} className="relative" initial={false}
      animate={striking && !reduced ? (rapidStrike
        ? { x: [0, dx / length * 26, -dx / length * 6, dx / length * 28, 0], y: [0, dy / length * 26, -dy / length * 6, dy / length * 28, 0] }
        : { x: [0, dx / length * 28, -dx / length * 7, 0], y: [0, dy / length * 28, -dy / length * 7, 0] }) : { x: 0, y: 0 }}
      transition={rapidStrike ? { duration: 0.42, times: [0, 0.25, 0.5, 0.75, 1] } : { duration: 0.65, times: [0, 0.23, 0.6, 1] }}>
      <div style={{ transform: (target ? dx < 0 : crew.facing === -1) ? 'scaleX(-1)' : undefined }}>
        {crew.mercenary && <TribeSprite action={tribeAct} tribeClass={activeClassId} height={52} />}
        {crew.mercenary && Array.from({ length: Math.min(4, members - 1) }, (_, k) => <div key={k} aria-hidden className="pointer-events-none absolute bottom-0 opacity-90" style={{ left: -20 - k * 18, bottom: (k % 2) * 5 }}><TribeSprite action={tribeAct} tribeClass={activeClassId} height={44} /></div>)}
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
}
export interface TribeInfo { count: number; trainLevel: number; ratio: number; maxHp: number; injured: boolean; starving: boolean; classId?: TribeClassId }

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
  const [tab, setTab] = useState<'exp' | 'tribe'>('exp');
  const activeClass = p.crew?.tribeClass ?? p.tribeClass ?? p.tribe?.classId ?? DEFAULT_TRIBE_CLASS;
  const cls = getTribeClass(activeClass);
  const compactBtn = 'h-auto min-h-0 py-1.5 px-2.5 text-xs';
  return <section aria-label="원정대 관찰" className="space-y-1.5 border-t border-border bg-background/95 p-2 text-xs">
    <div role="tablist" className="grid grid-cols-2 gap-1">
      {([['exp', '원정 편성'], ['tribe', `부족 용병 (${cls.icon}${cls.name})`]] as const).map(([k, l]) => <Button key={k} role="tab" aria-selected={tab === k} size="sm" variant={tab === k ? 'default' : 'outline'} className={compactBtn} onClick={() => setTab(k)}>{l}</Button>)}
    </div>
    {tab === 'tribe' ? <TribeStats t={p.tribe} crew={p.crew} selectedClass={activeClass} /> : <>
    <div className="flex flex-wrap items-center gap-1.5">
      <b className="flex items-center gap-1"><Flag className="!h-4 !w-4 text-primary" />{p.expeditionLevel ?? 1}레벨 원정대 ({cls.icon}{cls.name})</b>
      <span className="ml-auto">{p.crew ? `HP ${p.crew.hp}/${p.crew.maxHp ?? 100} · ${p.crew.phase === 'returning' ? '귀환' : p.crew.target ? '작업' : '행군'} 중` : '거점 대기 · 기본 100%'}</span>
    </div>
    <TribeClassBadge selected={activeClass} />
    <div role="radiogroup" aria-label="원정 목표" className="grid grid-cols-3 gap-1">
      {(Object.keys(FOCUS_LABEL) as ExpeditionFocus[]).map(f => <Button key={f} size="sm" role="radio" aria-checked={p.focus === f} variant={p.focus === f ? 'default' : 'outline'} disabled={!!p.crew} className={compactBtn} onClick={() => p.onFocus(f)}>{FOCUS_LABEL[f]}</Button>)}
    </div>
    {p.outdoor && <div role="status" className="flex items-center gap-1 bg-primary/15 px-2 py-1 font-bold text-foreground"><Flame className="!h-4 !w-4 shrink-0 text-primary" />족장 친정 · 채집량 200% · 희귀 유물 3배</div>}
    <div className="grid grid-cols-2 gap-1">
      <Button size="sm" className={`${compactBtn} whitespace-normal`} disabled={!p.canSend || !!p.crew} onClick={p.onSend}><Flag className="!h-4 !w-4 shrink-0" />{p.target && p.home ? `${Math.round(distanceM(p.home, p.target))}m 원정대 파견` : '주변 원정대 파견'}</Button>
      <Button size="sm" variant={p.auto ? 'default' : 'outline'} className={`${compactBtn} whitespace-normal`} disabled={!p.canSend && !p.auto} aria-pressed={p.auto} onClick={p.onAuto}>{p.auto ? <Pause className="!h-4 !w-4" /> : <Play className="!h-4 !w-4" />}거점 자동사냥 {p.auto ? '끄기' : '켜기'}</Button>
      <Button size="sm" variant="outline" className={`${compactBtn} whitespace-normal`} disabled={!p.crew || Date.now() < (p.crew?.moraleReadyAt ?? 0)} onClick={p.onMorale}><Zap className="!h-4 !w-4 shrink-0" />원격 사기 진작</Button>
      <Button size="sm" variant="outline" className={compactBtn} disabled={!p.crew} onClick={p.onReturn}><Home className="!h-4 !w-4" />즉시 귀환</Button>
    </div>
    <div className="flex gap-1">
      <Button variant={p.pocket ? 'default' : 'outline'} size="sm" className={`${compactBtn} flex-1 whitespace-normal`} aria-pressed={p.pocket} onClick={p.onPocket}><Footprints className="!h-4 !w-4 shrink-0" />산책·러닝 포켓 {p.pocket ? 'ON' : 'OFF'}</Button>
      <Button variant={p.watching ? 'default' : 'outline'} size="sm" className={compactBtn} disabled={!p.crew} aria-pressed={p.watching} onClick={p.onWatch}><Eye className="!h-4 !w-4" />관찰</Button>
    </div>
    {p.pocket && <p className="text-muted-foreground">{p.gpsReady ? '20km/h 이하 이동 자동채집 · GPS 수신 중' : '위치 신호 대기 · 자동채집 일시정지'}</p>}
    <ol aria-label="원정대 활동 로그" aria-live="polite" className="h-12 space-y-0.5 overflow-y-auto border-l-2 border-primary pl-2 text-[11px]">
      {p.logs.length ? p.logs.slice(-3).map((log, i) => <li key={`${log.at}-${i}`}>{log.text}</li>) : <li className="text-muted-foreground">모닥불 · 원정대 대기 중</li>}
    </ol>
    </>}
  </section>;
}