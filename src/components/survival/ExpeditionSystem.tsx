import { Flag, Flame, Home, Zap, Eye, Footprints, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FOCUS_LABEL, type ExpeditionFocus, type ExpeditionLog, type ObservedExpedition } from '@/lib/survival/expedition';
import type { LatLng } from '@/lib/survival/types';
import { distanceM } from '@/lib/survival/geo';
import CharacterSprite from './CharacterSprite';
import tribeIdle from '@/assets/survival/tribe-idle.png';
import tribeAttack from '@/assets/survival/tribe-attack.png';
import tribeGather from '@/assets/survival/tribe-gather.png';
import tribeWalk1 from '@/assets/survival/tribe-walk1.png';
import tribeWalk2 from '@/assets/survival/tribe-walk2.png';
import tribeHurt from '@/assets/survival/tribe-hurt.png';
import tribeDodge from '@/assets/survival/tribe-dodge.png';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import SpriteAnimator from './SpriteAnimator';
import { useSpriteAnimations } from '@/hooks/useSpriteAnimations';
import { CombatImpact, expeditionActorPoint, freshCombatHit } from './ExpeditionCombat';

export function ExpeditionMarker({ crew, project, members = 1 }: { crew: ObservedExpedition; project: (p: LatLng) => { x: number; y: number }; members?: number }) {
  const pos = expeditionActorPoint(crew, project);
  const hit = freshCombatHit(crew);
  const reduced = useReducedMotion();
  const target = crew.target?.kind === 'creature' ? project(crew.target) : hit ? project(hit.target) : null;
  const dx = target ? target.x - pos.x : 0, dy = target ? target.y - pos.y : 0;
  const length = Math.hypot(dx, dy) || 1;
  const striking = !!hit;
  // Alternate frames for a simple 2-frame action loop.
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setTick(f => f + 1), 140); return () => window.clearInterval(t); }, []);
  const frame = Math.floor(tick / (crew.target ? 2.5 : 2)) % 2;
  const lastPos = useRef(crew.pos); const movedAt = useRef(0);
  if (lastPos.current.lat !== crew.pos.lat || lastPos.current.lng !== crew.pos.lng) { lastPos.current = crew.pos; movedAt.current = Date.now(); }
  const moving = Date.now() - movedAt.current < 1200;
  const since = hit ? Date.now() - hit.at : Infinity;
  const reaction = since >= 220 && since < 750 ? (hit!.counterDamage > 0 ? 'hurt' : hit!.dodged ? 'dodge' : null) : null;
  // Recent path (lat/lng) so the trail stays correct while the map moves.
  const trail = useRef<LatLng[]>([]);
  const last = trail.current[trail.current.length - 1];
  if (!last || distanceM(last, crew.pos) > 2) trail.current = [...trail.current, crew.pos].slice(-60);
  const tribeSrc = reaction === 'hurt' ? tribeHurt : reaction === 'dodge' ? tribeDodge : since < 220 ? tribeAttack
    : crew.target && (!crew.manual || distanceM(crew.pos, crew.target) <= 10) ? (frame ? (crew.target.kind === 'node' ? tribeGather : tribeAttack) : tribeIdle)
    : moving ? (frame ? tribeWalk2 : tribeWalk1) : tribeIdle;
  const { data: tribeRemote } = useSpriteAnimations('tribe');
  const tribeAct = tribeSrc === tribeWalk1 || tribeSrc === tribeWalk2 ? 'walk' : tribeSrc === tribeGather ? 'gather' : tribeSrc === tribeIdle ? 'idle' : 'attack';
  const tribeSheet = tribeRemote?.[tribeAct];
  const pts = [crew.home, ...trail.current].map(project);
  const ahead = [crew.pos, ...(crew.phase === 'outbound' ? [...(crew.waypoints ?? []), crew.destination] : [crew.home])].map(project);
  return <>
  <div data-expedition-marker className={`pointer-events-none absolute z-10 flex w-24 -translate-x-1/2 -translate-y-full flex-col items-center ${target ? '' : 'transition-[left,top] duration-1000 ease-linear motion-reduce:transition-none'}`} style={{ left: pos.x, top: pos.y }}>
    <span className="absolute -top-5 whitespace-nowrap rounded bg-card px-1 text-[10px]">{crew.mercenary ? `부족민 ${crew.mercenary}` : '원정'} · HP {crew.hp}</span>
    <motion.div key={hit?.at ?? 'march'} data-expedition-strike={hit?.at} className="relative" initial={false} animate={striking && !reduced ? { x: [0, dx / length * 28, -dx / length * 7, 0], y: [0, dy / length * 28, -dy / length * 7, 0] } : { x: 0, y: 0 }} transition={{ duration: 0.65, times: [0, 0.23, 0.6, 1] }}>
      <div style={{ transform: (target ? dx < 0 : crew.facing === -1) ? 'scaleX(-1)' : undefined }}>{crew.mercenary && tribeSheet ? <SpriteAnimator url={tribeSheet.url} frames={tribeSheet.frame_count} fps={tribeSheet.fps} height={56} /> : crew.mercenary ? <motion.img src={tribeSrc} alt={`부족민 ${crew.mercenary}`} className="pixelated h-14 w-auto" animate={reduced ? {} : reaction === 'hurt' ? { x: -10, y: 0, rotate: -8, filter: 'brightness(1.8) saturate(0.4)' } : reaction === 'dodge' ? { x: -18, y: -10, rotate: 0, filter: 'none' } : { x: 0, y: moving && !crew.target ? (frame ? -2 : 0) : 0, rotate: 0, filter: 'none' }} transition={{ duration: 0.15 }} /> : null}{crew.mercenary && Array.from({ length: Math.min(4, members - 1) }, (_, k) => <img key={k} src={tribeSrc} alt="" aria-hidden className="pixelated pointer-events-none absolute bottom-0 h-12 w-auto opacity-90" style={{ left: -22 - k * 20, bottom: (k % 2) * 6 }} />)}{crew.mercenary ? null : <CharacterSprite height={48} action={hit ? 'attack' : crew.target ? crew.target.kind === 'node' ? 'chop' : 'attack' : 'walk'} />}</div>
      {hit && hit.counterDamage > 0 && <CombatImpact stamp={hit.at} damage={hit.counterDamage} />}
    </motion.div>
    {crew.target && <Zap className="absolute right-1 top-6 !h-6 !w-6 animate-pulse text-primary" />}
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
}
export interface TribeInfo { count: number; trainLevel: number; ratio: number; maxHp: number; injured: boolean; starving: boolean }

function TribeStats({ t, crew }: { t?: TribeInfo; crew?: ObservedExpedition | null }) {
  if (!t || t.count <= 0) return <p className="py-4 text-center text-muted-foreground">아직 부족민이 없어요. 거점 주술사에게 영입하세요.</p>;
  const atk = Math.max(1, Math.round(12 * t.ratio));
  const hp = crew?.maxHp ?? t.maxHp;
  const rows: [string, string][] = [
    ['인원', `${t.count}명 · 훈련 ${t.trainLevel}단계`],
    ['상태', t.injured ? '부상 치료 중' : t.starving ? '굶주림 (능력 절반)' : '정상'],
    ['공격력', `1인 ${atk} × ${t.count}연타`],
    ['체력', crew ? `${crew.hp}/${hp}` : `${hp} (합산)`],
    ['방어력', '3 · 회피 20%'],
    ['채집 속도', `×${t.count}`],
  ];
  return <dl className="grid grid-cols-2 gap-1.5">{rows.map(([k, v]) => <div key={k} className="pixel-box bg-card p-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="font-bold">{v}</dd></div>)}</dl>;
}
export default function ExpeditionSystem(p: Props) {
  const [tab, setTab] = useState<'exp' | 'tribe'>('exp');
  return <section aria-label="원정대 관찰" className="space-y-2 border-t border-border bg-background/95 p-2 text-xs">
    <div role="tablist" className="grid grid-cols-2 gap-1">
      {([['exp', '원정'], ['tribe', '부족민']] as const).map(([k, l]) => <Button key={k} role="tab" aria-selected={tab === k} size="sm" variant={tab === k ? 'default' : 'outline'} className="min-h-11 text-xs" onClick={() => setTab(k)}>{l}</Button>)}
    </div>
    {tab === 'tribe' ? <TribeStats t={p.tribe} crew={p.crew} /> : <>
    <div className="flex flex-wrap items-center gap-2">
      <b className="flex items-center gap-1"><Flag className="!h-4 !w-4 text-primary" />1레벨 원정대</b>
      <span className="ml-auto">{p.crew ? `HP ${p.crew.hp}/${p.crew.maxHp ?? 100} · ${p.crew.phase === 'returning' ? '귀환' : p.crew.target ? '작업' : '행군'} 중` : '거점 대기 · 기본 100%'}</span>
    </div>
    <div role="radiogroup" aria-label="원정 목표" className="grid grid-cols-3 gap-1.5">
      {(Object.keys(FOCUS_LABEL) as ExpeditionFocus[]).map(f => <Button key={f} size="sm" role="radio" aria-checked={p.focus === f} variant={p.focus === f ? 'default' : 'outline'} disabled={!!p.crew} className="min-h-11 text-xs" onClick={() => p.onFocus(f)}>{FOCUS_LABEL[f]}</Button>)}
    </div>
    {p.outdoor && <div role="status" className="flex items-center gap-1 bg-primary/15 p-1.5 font-bold text-foreground"><Flame className="!h-4 !w-4 shrink-0 text-primary" />족장 친정 · 채집량 200% · 희귀 유물 3배</div>}
    <div className="grid grid-cols-2 gap-1.5">
      <Button size="sm" className="min-h-11 whitespace-normal text-xs" disabled={!p.canSend || !!p.crew} onClick={p.onSend}><Flag className="!h-4 !w-4 shrink-0" />{p.target && p.home ? `${Math.round(distanceM(p.home, p.target))}m 원정대 파견` : '주변 원정대 파견'}</Button>
      <Button size="sm" variant={p.auto ? 'default' : 'outline'} className="min-h-11 whitespace-normal text-xs" disabled={!p.canSend && !p.auto} aria-pressed={p.auto} onClick={p.onAuto}>{p.auto ? <Pause className="!h-4 !w-4" /> : <Play className="!h-4 !w-4" />}거점 자동사냥 {p.auto ? '끄기' : '켜기'}</Button>
      <Button size="sm" variant="outline" className="min-h-11 whitespace-normal text-xs" disabled={!p.crew || Date.now() < (p.crew?.moraleReadyAt ?? 0)} onClick={p.onMorale}><Zap className="!h-4 !w-4 shrink-0" />원격 사기 진작</Button>
      <Button size="sm" variant="outline" className="min-h-11 text-xs" disabled={!p.crew} onClick={p.onReturn}><Home className="!h-4 !w-4" />즉시 귀환</Button>
    </div>
    <div className="flex gap-1.5">
      <Button variant={p.pocket ? 'default' : 'outline'} size="sm" className="min-h-11 flex-1 whitespace-normal text-xs" aria-pressed={p.pocket} onClick={p.onPocket}><Footprints className="!h-4 !w-4 shrink-0" />산책·러닝 포켓 {p.pocket ? 'ON' : 'OFF'}</Button>
      <Button variant={p.watching ? 'default' : 'outline'} size="sm" className="min-h-11 text-xs" disabled={!p.crew} aria-pressed={p.watching} onClick={p.onWatch}><Eye className="!h-4 !w-4" />관찰</Button>
    </div>
    {p.pocket && <p className="text-muted-foreground">{p.gpsReady ? '20km/h 이하 이동 자동채집 · GPS 수신 중' : '위치 신호 대기 · 자동채집 일시정지'}</p>}
    <ol aria-label="원정대 활동 로그" aria-live="polite" className="h-14 space-y-0.5 overflow-y-auto border-l-2 border-primary pl-2 text-[11px]">
      {p.logs.length ? p.logs.slice(-3).map((log, i) => <li key={`${log.at}-${i}`}>{log.text}</li>) : <li className="text-muted-foreground">모닥불 · 원정대 대기 중</li>}
    </ol>
    </>}
  </section>;
}