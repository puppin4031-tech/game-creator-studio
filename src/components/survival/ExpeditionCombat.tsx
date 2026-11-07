import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Swords } from 'lucide-react';
import type { ObservedExpedition } from '@/lib/survival/expedition';
import type { LatLng, WorldEntity } from '@/lib/survival/types';
import { haptic, playFootstep, playSample, playSfx, unlockSound, type SampleId } from '@/lib/survival/gameSettings';

export const CREATURE_RING_RADIUS_M = 20;
export const freshCombatHit = (crew?: ObservedExpedition | null) => {
  const hit = crew?.combatHit;
  return hit && Date.now() - hit.at >= 0 && Date.now() - hit.at < 1200 ? hit : undefined;
};

/** Keeps visual contact independent of geographic travel and walking rewards. */
export function expeditionActorPoint(crew: ObservedExpedition, project: (p: LatLng) => { x: number; y: number }) {
  const origin = project(crew.pos);
  const creature = crew.target?.kind === 'creature' ? crew.target : freshCombatHit(crew)?.target;
  if (!creature) return origin;
  const target = project(creature);
  const dx = origin.x - target.x, dy = origin.y - target.y;
  const length = Math.hypot(dx, dy);
  return { x: target.x + (length > 1 ? dx / length : -1) * 40, y: target.y + (length > 1 ? dy / length : 0) * 40 };
}

// Touch pointerdown is not a user-activation event on mobile; unlock on release/click too.
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;

export function useExpeditionCombatSound(crew?: ObservedExpedition | null, sampleFor?: (e: WorldEntity) => SampleId) {
  const lastAt = useRef(crew?.combatHit?.at ?? 0);
  const lastWorkAt = useRef(crew?.hitAt ?? 0);
  const lastPosition = useRef(crew?.pos);
  const lat = crew?.pos.lat;
  const lng = crew?.pos.lng;
  useEffect(() => {
    UNLOCK_EVENTS.forEach(ev => window.addEventListener(ev, unlockSound, { passive: true }));
    return () => UNLOCK_EVENTS.forEach(ev => window.removeEventListener(ev, unlockSound));
  }, []);
  // Gathering, logging and mining hits on resource nodes.
  useEffect(() => {
    const at = crew?.hitAt ?? 0;
    if (!at || at === lastWorkAt.current) return;
    lastWorkAt.current = at;
    const target = crew?.target;
    if (!target || target.kind !== 'node' || document.hidden) return;
    playSample(sampleFor?.(target) ?? 'gather');
    haptic(20);
  }, [crew?.hitAt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const previous = lastPosition.current;
    lastPosition.current = lat === undefined || lng === undefined ? undefined : { lat, lng };
    if (!previous || lat === undefined || lng === undefined || (lat === previous.lat && lng === previous.lng)) return;
    const step = () => { if (!document.hidden) playFootstep(); };
    step();
    const interval = window.setInterval(step, 360);
    // Geographic ticks arrive once per second; never keep playing after movement stops.
    const stop = window.setTimeout(() => window.clearInterval(interval), 1000);
    return () => { window.clearInterval(interval); window.clearTimeout(stop); };
  }, [lat, lng]);
  useEffect(() => {
    const hit = freshCombatHit(crew);
    if (!hit || hit.at === lastAt.current) return;
    lastAt.current = hit.at;
    if (document.hidden) return;
    playSample('strike');
    haptic(hit.counterDamage ? [45, 35, 65] : 40);
    const timer = hit.killed ? window.setTimeout(() => playSfx('notify'), 200) : undefined;
    return () => window.clearTimeout(timer);
  }, [crew?.combatHit?.at]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function CombatImpact({ stamp, damage, defeated = false }: { stamp: number; damage: number; defeated?: boolean }) {
  const reduced = useReducedMotion();
  return <div data-combat-impact={stamp} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <motion.div key={`spark-${stamp}`} className="absolute text-accent" initial={{ opacity: 1, scale: reduced ? 1 : 0.5 }} animate={{ opacity: 0, scale: reduced ? 1 : 1.8 }} transition={{ duration: 0.45, delay: 0.14 }}><Swords className="!h-8 !w-8" /></motion.div>
    <motion.span key={`damage-${stamp}`} className="absolute -top-5 whitespace-nowrap rounded bg-background/90 px-1 text-sm font-bold text-destructive" initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: reduced ? 0 : -26 }} transition={{ duration: 0.85, delay: 0.16 }}>{defeated ? '처치' : `-${damage}`}</motion.span>
  </div>;
}