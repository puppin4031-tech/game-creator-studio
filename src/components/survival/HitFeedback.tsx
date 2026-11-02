import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/** Watches hp; returns a hit counter that increments whenever hp drops. */
export function useHitPulse(hp: number) {
  const prev = useRef(hp);
  const [hit, setHit] = useState<{ n: number; dmg: number }>({ n: 0, dmg: 0 });
  useEffect(() => {
    const damage = prev.current - hp;
    if (damage > 0) setHit((h) => ({ n: h.n + 1, dmg: damage }));
    prev.current = hp;
  }, [hp]);
  return hit;
}

/** Red glowing screen edge that flashes on every hit. */
export function DamageVignette({ hitKey }: { hitKey: number }) {
  return (
    <AnimatePresence>
      {hitKey > 0 && (
        <motion.div key={hitKey} aria-hidden className="pointer-events-none absolute inset-0 z-40"
          style={{ boxShadow: 'inset 0 0 70px 18px hsl(var(--destructive) / 0.8)' }}
          initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} />
      )}
    </AnimatePresence>
  );
}

/** HP bar with a lagging "damage chunk" trail behind the live value. */
export function HpBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const [trail, setTrail] = useState(pct);
  useEffect(() => {
    if (pct >= trail) { setTrail(pct); return; }
    const t = window.setTimeout(() => setTrail(pct), 400);
    return () => window.clearTimeout(t);
  }, [pct, trail]);
  return (
    <div className="relative h-2.5 flex-1 overflow-hidden border border-foreground bg-muted">
      <div className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-500 ease-out" style={{ width: `${trail}%` }} />
      <div className="absolute inset-y-0 left-0 bg-destructive transition-[width] duration-100" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Wraps the character: red blink + floating damage number on hit. */
export function HitFlash({ hit, children }: { hit: { n: number; dmg: number }; children: React.ReactNode }) {
  return (
    <div className="relative">
      <motion.div key={hit.n} initial={false}
        animate={hit.n ? { filter: ['brightness(1)', 'brightness(1.4) sepia(1) saturate(6) hue-rotate(-50deg)', 'brightness(1)', 'brightness(1.4) sepia(1) saturate(6) hue-rotate(-50deg)', 'brightness(1)'] } : {}}
        transition={{ duration: 0.5 }}>
        {children}
      </motion.div>
      <AnimatePresence>
        {hit.n > 0 && (
          <motion.span key={hit.n} className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-sm font-bold text-destructive drop-shadow"
            initial={{ y: 0, opacity: 1 }} animate={{ y: -28, opacity: 0 }} transition={{ duration: 0.9 }}>
            -{hit.dmg}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
