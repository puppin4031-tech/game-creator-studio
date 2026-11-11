import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Swords, Pickaxe, Gamepad2, Bot } from 'lucide-react';
import type { LatLng, WorldEntity } from '@/lib/survival/types';
import type { ObservedExpedition } from '@/lib/survival/expedition';

interface Props {
  crew: ObservedExpedition;
  candidates: WorldEntity[];
  project: (p: LatLng) => { x: number; y: number };
  onManual: (on: boolean) => void;
  onSteer: (x: number, y: number) => void;
  onCommand: (e: WorldEntity) => boolean;
}
const STEER_MS = 150;
const DROP_PX = 48;

/** Manual expedition controls: joystick moves (and cancels actions); drag attack/gather icons onto a target. */
export default function ExpeditionJoystick({ crew, candidates, project, onManual, onSteer, onCommand }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const vec = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ kind: 'attack' | 'gather'; x: number; y: number } | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => { const v = vec.current; if (v.x || v.y) onSteer(v.x, -v.y); }, STEER_MS);
    return () => window.clearInterval(t);
  }, [onSteer]);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = root.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };
  const stick = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2; const len = Math.hypot(x, y);
    if (len > max) { x = x / len * max; y = y / len * max; }
    setKnob({ x, y });
    vec.current = len < 8 ? { x: 0, y: 0 } : { x: x / max, y: y / max };
  };
  const release = () => { vec.current = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); };
  const drop = (e: RPointerEvent) => {
    if (!drag) return;
    const at = local(e);
    const hit = candidates
      .filter(c => drag.kind === 'attack' ? c.kind === 'creature' : c.kind === 'node')
      .map(c => { const p = project(c); return { c, d: Math.hypot(p.x - at.x, p.y - at.y) }; })
      .filter(h => h.d <= DROP_PX).sort((a, b) => a.d - b.d)[0];
    setDrag(null);
    if (hit) onCommand(hit.c);
  };

  const iconBtn = 'pointer-events-auto flex h-14 w-14 touch-none items-center justify-center border-2 border-foreground bg-card shadow-[3px_3px_0_0_hsl(var(--foreground)/0.6)]';
  return <div ref={root} className="pointer-events-none absolute inset-0 z-20" onPointerMove={e => drag && setDrag({ ...drag, ...local(e) })} onPointerUp={drop}>
    <button type="button" aria-pressed={!!crew.manual} onClick={() => onManual(!crew.manual)} className={`${iconBtn} absolute left-3 top-24 h-11 w-auto gap-1 px-2 text-xs font-bold`}>
      {crew.manual ? <><Bot className="!h-4 !w-4" />자동으로</> : <><Gamepad2 className="!h-4 !w-4" />직접 조작</>}
    </button>
    {crew.manual && <>
      <div aria-label="원정 조이스틱" role="application" className="pointer-events-auto absolute bottom-28 left-4 h-28 w-28 touch-none rounded-full border-4 border-foreground/70 bg-background/60"
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); stick(e); }} onPointerMove={e => e.buttons && stick(e)} onPointerUp={release} onPointerCancel={release}>
        <div className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full border-2 border-foreground bg-primary" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
      </div>
      <div className="absolute bottom-28 right-4 flex flex-col gap-3">
        {(['attack', 'gather'] as const).map(k => <button key={k} type="button" aria-label={k === 'attack' ? '공격 아이콘을 적에게 끌어 놓기' : '채집 아이콘을 자원에 끌어 놓기'} className={iconBtn}
          onPointerDown={e => { e.preventDefault(); setDrag({ kind: k, ...local(e) }); }}>
          {k === 'attack' ? <Swords className="!h-7 !w-7" /> : <Pickaxe className="!h-7 !w-7" />}
        </button>)}
      </div>
      <p className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 whitespace-nowrap bg-background/80 px-2 text-[11px]">아이콘을 끌어 적·자원에 놓기 · 움직이면 동작 취소</p>
    </>}
    {drag && <div className="pointer-events-none absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-card/90" style={{ left: drag.x, top: drag.y }}>
      {drag.kind === 'attack' ? <Swords className="!h-6 !w-6 text-destructive" /> : <Pickaxe className="!h-6 !w-6 text-primary" />}
    </div>}
    {drag && candidates.filter(c => drag.kind === 'attack' ? c.kind === 'creature' : c.kind === 'node').map(c => { const p = project(c); return <span key={c.id} className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-dashed border-primary" style={{ left: p.x, top: p.y }} />; })}
  </div>;
}
