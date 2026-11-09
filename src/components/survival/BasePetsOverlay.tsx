import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { distanceM, offsetM } from '@/lib/survival/geo';
import { petPatrolPoint, type OwnedPet, type PetHit } from '@/lib/survival/pets';
import type { LatLng } from '@/lib/survival/types';
import { haptic, playSample, playSfx } from '@/lib/survival/gameSettings';
import { CombatImpact } from './ExpeditionCombat';
import PetSprite from './PetSprite';

export default function BasePetsOverlay({ base, radius, pets, hits, project }: { base: LatLng; radius: number; pets: OwnedPet[]; hits: PetHit[]; project: (p: LatLng) => { x: number; y: number } }) {
  const reduced = useReducedMotion();
  const [now, setNow] = useState(Date.now());
  const previous = useRef<Record<string, number>>({});
  useEffect(() => {
    if (reduced || !pets.some(p => p.deployed)) return;
    const timer = window.setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 700);
    return () => window.clearInterval(timer);
  }, [reduced, pets.some(p => p.deployed)]);
  useEffect(() => {
    if (!hits.length || document.hidden) return;
    playSample('strike'); haptic(60);
    if (hits.some(h => h.killed)) playSfx('notify');
  }, [hits]);
  return <>
    {pets.filter(p => p.deployed).map(pet => {
      const hit = hits.find(h => h.petUid === pet.uid && Date.now() - h.at < 1800);
      const resting = pet.restUntil > Date.now();
      const pos = hit ? offsetM(base, (hit.target.lng - base.lng) * 111_000 * Math.cos(base.lat * Math.PI / 180) * radius / distanceM(base, hit.target), (hit.target.lat - base.lat) * 111_000 * radius / distanceM(base, hit.target))
        : resting || reduced ? offsetM(base, 8 + pets.indexOf(pet) * 6, 8) : petPatrolPoint(base, radius, pet.uid, now);
      const point = project(pos), target = hit ? project(hit.target) : point;
      const facing = point.x < (previous.current[pet.uid] ?? point.x) ? -1 : 1;
      previous.current[pet.uid] = point.x;
      const dx = target.x - point.x, dy = target.y - point.y, len = Math.hypot(dx, dy) || 1;
      return <div key={pet.uid} data-base-pet={pet.uid} className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center transition-[left,top] duration-700 ease-linear" style={{ left: point.x, top: point.y }}>
        <motion.div key={hit?.at ?? 'idle'} animate={hit && !reduced ? { x: [0, dx / len * 24, 0], y: [0, dy / len * 24, 0] } : { x: 0, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ transform: `scaleX(${hit ? dx < 0 ? -1 : 1 : facing})` }} className={resting ? 'opacity-50' : ''}><PetSprite speciesId={pet.speciesId} name={pet.name} height={44} attacking={!!hit} /></div>
        </motion.div>
        <span className="rounded bg-background/90 px-1 text-[10px]">Lv.{pet.level}{resting ? ' · 휴식' : ''}</span>
        {!!hit?.counterDamage && <CombatImpact stamp={hit.at} damage={hit.counterDamage} />}
      </div>;
    })}
    {hits.filter(h => Date.now() - h.at < 1800).map(h => { const p = project(h.target); return <div key={`${h.at}:${h.petUid}`} className="pointer-events-none absolute z-10" style={{ left: p.x, top: p.y }}><CombatImpact stamp={h.at} damage={h.damage} defeated={h.killed} /></div>; })}
  </>;
}