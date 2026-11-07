import { Flag, Flame, Home, Zap, Eye, Footprints, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FOCUS_LABEL, type ExpeditionFocus, type ExpeditionLog, type ObservedExpedition } from '@/lib/survival/expedition';
import type { LatLng } from '@/lib/survival/types';
import { distanceM } from '@/lib/survival/geo';
import CharacterSprite from './CharacterSprite';

export function ExpeditionMarker({ crew, project }: { crew: ObservedExpedition; project: (p: LatLng) => { x: number; y: number } }) {
  const pos = project(crew.pos);
  return <div data-expedition-marker className="pointer-events-none absolute flex w-24 -translate-x-1/2 -translate-y-full flex-col items-center transition-[left,top] duration-1000 ease-linear motion-reduce:transition-none" style={{ left: pos.x, top: pos.y }}>
    <span className="rounded bg-card px-1 text-[10px]">원정대 · HP {crew.hp}</span>
    <div style={{ transform: crew.facing === -1 ? 'scaleX(-1)' : undefined }}><CharacterSprite height={48} action={crew.target ? crew.target.kind === 'node' ? 'chop' : 'attack' : 'walk'} /></div>
    {crew.target && <Zap className="absolute right-1 top-6 !h-6 !w-6 animate-pulse text-primary" />}
  </div>;
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