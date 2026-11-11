import { Flag, Flame, Home, Zap, Eye, Footprints, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FOCUS_LABEL, type ExpeditionFocus, type ExpeditionLog, type ObservedExpedition } from '@/lib/survival/expedition';
import type { LatLng } from '@/lib/survival/types';
import { distanceM } from '@/lib/survival/geo';
import CharacterSprite from './CharacterSprite';
import tribeIdle from '@/assets/survival/tribe-idle.png';
import tribeAttack from '@/assets/survival/tribe-attack.png';
import tribeGather from '@/assets/survival/tribe-gather.png';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CombatImpact, expeditionActorPoint, freshCombatHit } from './ExpeditionCombat';

export function ExpeditionMarker({ crew, project }: { crew: ObservedExpedition; project: (p: LatLng) => { x: number; y: number } }) {
  const pos = expeditionActorPoint(crew, project);
  const hit = freshCombatHit(crew);
  const reduced = useReducedMotion();
  const target = crew.target?.kind === 'creature' ? project(crew.target) : hit ? project(hit.target) : null;
  const dx = target ? target.x - pos.x : 0, dy = target ? target.y - pos.y : 0;
  const length = Math.hypot(dx, dy) || 1;
  const striking = !!hit;
  // Alternate frames for a simple 2-frame action loop.
  const [frame, setFrame] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setFrame(f => f ^ 1), crew.target ? 350 : 280); return () => window.clearInterval(t); }, [!!crew.target]);
  // Recent path (lat/lng) so the trail stays correct while the map moves.
  const trail = useRef<LatLng[]>([]);
  const last = trail.current[trail.current.length - 1];
  if (!last || distanceM(last, crew.pos) > 2) trail.current = [...trail.current, crew.pos].slice(-60);
  const tribeSrc = crew.target ? (frame ? (crew.target.kind === 'node' ? tribeGather : tribeAttack) : tribeIdle) : hit ? tribeAttack : tribeIdle;
  const pts = [crew.home, ...trail.current].map(project);
  const ahead = [crew.pos, ...(crew.phase === 'outbound' ? [...(crew.waypoints ?? []), crew.destination] : [crew.home])].map(project);
  return <>
  {crew.mercenary && <svg aria-hidden className="pointer-events-none absolute inset-0 z-[9] h-full w-full overflow-visible">
    <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="hsl(var(--primary))" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    <polyline points={ahead.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="4 6" opacity={0.5} />
    {crew.phase === 'outbound' && (() => { const d = project(crew.destination); return <circle cx={d.x} cy={d.y} r={6} fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth={2} />; })()}
  </svg>}
  <div data-expedition-marker className={`pointer-events-none absolute z-10 flex w-24 -translate-x-1/2 -translate-y-full flex-col items-center ${target ? '' : 'transition-[left,top] duration-1000 ease-linear motion-reduce:transition-none'}`} style={{ left: pos.x, top: pos.y }}>
    <span className="absolute -top-5 whitespace-nowrap rounded bg-card px-1 text-[10px]">{crew.mercenary ? `부족민 ${crew.mercenary}` : '원정'} · HP {crew.hp}</span>
    <motion.div key={hit?.at ?? 'march'} data-expedition-strike={hit?.at} className="relative" initial={false} animate={striking && !reduced ? { x: [0, dx / length * 28, -dx / length * 7, 0], y: [0, dy / length * 28, -dy / length * 7, 0] } : { x: 0, y: 0 }} transition={{ duration: 0.65, times: [0, 0.23, 0.6, 1] }}>
      <div style={{ transform: (target ? dx < 0 : crew.facing === -1) ? 'scaleX(-1)' : undefined }}>{crew.mercenary ? <motion.img src={tribeSrc} alt={`부족민 ${crew.mercenary}`} className="pixelated h-14 w-auto" animate={!crew.target && !reduced ? { y: frame ? -2 : 0 } : { y: 0 }} transition={{ duration: 0.2 }} /> : <CharacterSprite height={48} action={hit ? 'attack' : crew.target ? crew.target.kind === 'node' ? 'chop' : 'attack' : 'walk'} />}</div>
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
}
export default function ExpeditionSystem(p: Props) {
  return <section aria-label="원정대 관찰" className="space-y-2 border-t border-border bg-background/95 p-2 text-xs">
    <div className="flex flex-wrap items-center gap-2">
      <b className="flex items-center gap-1"><Flag className="!h-4 !w-4 text-primary" />1레벨 원정대</b>
      <span className="ml-auto">{p.crew ? `HP ${p.crew.hp}/100 · ${p.crew.phase === 'returning' ? '귀환' : p.crew.target ? '작업' : '행군'} 중` : '거점 대기 · 기본 100%'}</span>
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
  </section>;
}