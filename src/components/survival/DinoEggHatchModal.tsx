import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import egg from '@/assets/survival/dinos/egg.png';
import baby_raptor from '@/assets/survival/dinos/baby_raptor.png';
import mini_triceratops from '@/assets/survival/dinos/mini_triceratops.png';
import baby_stego from '@/assets/survival/dinos/baby_stego.png';
import baby_ptera from '@/assets/survival/dinos/baby_ptera.png';
import SpriteAnimator from './SpriteAnimator';
import { useSpriteAnimations } from '@/hooks/useSpriteAnimations';
import { haptic, playSfx } from '@/lib/survival/gameSettings';

export const BABY_ART: Record<string, string> = { baby_raptor, mini_triceratops, baby_stego, baby_ptera };
export const EGG_ART = egg;

const BURST_AT = 1.45;
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({ a: (i / 28) * Math.PI * 2 + (i % 2) * 0.1, d: 60 + (i % 4) * 26, s: i % 3 ? 'h-2 w-2' : 'h-3 w-3' }));
const SPARKS = Array.from({ length: 10 }, (_, i) => ({ x: ((i * 37) % 160) - 80, delay: BURST_AT + 0.3 + (i % 5) * 0.15 }));
const SHELLS = [{ x: -60, y: -40, r: -70 }, { x: 62, y: -30, r: 80 }, { x: -40, y: 50, r: -120 }, { x: 46, y: 56, r: 140 }];

/** Hatch celebration: egg shakes with cracks, bursts into pixel particles and reveals the baby with sound and vibration. */
export default function DinoEggHatchModal({ baby, onClose }: { baby: { id: string; name: string; custom?: boolean } | null; onClose: () => void }) {
  const reduced = useReducedMotion();
  const { data: art } = useSpriteAnimations(baby?.custom ? `pet:${baby.id}` : 'none');
  const sheet = baby && !BABY_ART[baby.id] ? art?.idle : undefined;
  const babySrc = baby ? BABY_ART[baby.id] ?? egg : egg;

  useEffect(() => {
    if (!baby) return;
    const timers = [
      ...[300, 650, 1000].map(t => window.setTimeout(() => { playSfx('crack'); haptic(60); }, reduced ? 0 : t)),
      window.setTimeout(() => { playSfx('burst'); haptic([200, 80, 200]); }, reduced ? 100 : BURST_AT * 1000),
      window.setTimeout(() => playSfx('fanfare'), reduced ? 300 : 1700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [baby?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {baby && (
        <motion.div role="dialog" aria-modal aria-label="공룡 알 부화" className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="pixel-frame w-full max-w-sm space-y-4 bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center"
            initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
            <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
              {/* Glow behind the reveal */}
              {!reduced && <motion.div className="absolute h-40 w-40 rounded-full bg-primary/40 blur-2xl"
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.6, 1.1], opacity: [0, 1, 0.6] }} transition={{ delay: BURST_AT, duration: 0.9 }} />}
              {/* Flash */}
              {!reduced && <motion.div className="pointer-events-none fixed inset-0 bg-primary-foreground"
                initial={{ opacity: 0 }} animate={{ opacity: [0, 0.8, 0] }} transition={{ delay: BURST_AT, duration: 0.35 }} />}
              <motion.img src={egg} alt="" className="pixelated absolute h-32 w-32"
                animate={reduced ? { opacity: 0 } : { rotate: [0, -12, 12, -16, 16, 0], scale: [1, 1, 1, 1.1, 1.2, 0], opacity: [1, 1, 1, 1, 1, 0] }}
                transition={{ duration: reduced ? 0.2 : 1.6, times: [0, 0.2, 0.4, 0.6, 0.85, 1] }} />
              {/* Shell fragments */}
              {!reduced && SHELLS.map((p, i) => (
                <motion.img key={`s${i}`} src={egg} alt="" className="pixelated absolute h-8 w-8"
                  style={{ clipPath: 'polygon(0 0, 100% 20%, 60% 100%)' }}
                  initial={{ opacity: 0 }} animate={{ x: p.x, y: [0, p.y, p.y + 60], rotate: p.r, opacity: [0, 1, 0] }}
                  transition={{ delay: BURST_AT, duration: 1 }} />
              ))}
              {!reduced && PARTICLES.map((p, i) => (
                <motion.span key={i} className={`absolute ${p.s} ${i % 3 === 0 ? 'bg-primary' : i % 3 === 1 ? 'bg-accent' : 'bg-secondary'}`}
                  initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: Math.cos(p.a) * p.d, y: [0, Math.sin(p.a) * p.d, Math.sin(p.a) * p.d + 30], opacity: [0, 1, 0] }}
                  transition={{ delay: BURST_AT, duration: 1 }} />
              ))}
              {/* Rising sparkles around the baby */}
              {!reduced && SPARKS.map((p, i) => (
                <motion.span key={`k${i}`} className="absolute h-1.5 w-1.5 bg-primary"
                  initial={{ x: p.x, y: 40, opacity: 0 }} animate={{ y: -90, opacity: [0, 1, 0] }}
                  transition={{ delay: p.delay, duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }} />
              ))}
              <motion.div className="absolute" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: reduced ? 0 : [0, -6, 0] }}
                transition={{ delay: reduced ? 0.2 : 1.55, type: 'spring', stiffness: 260, damping: 14, y: { delay: 2.2, duration: 1.2, repeat: Infinity } }}>
                {sheet ? <SpriteAnimator url={sheet.url} frames={sheet.frame_count} fps={sheet.fps} height={144} /> : <img src={babySrc} alt={baby.name} className="pixelated h-36 w-36" />}
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0.3 : 1.8 }} className="space-y-1">
              <p className="text-xs font-semibold text-primary">새로운 펫</p>
              <p className="text-lg font-bold">{baby.name} 탄생!</p>
              <p className="text-sm text-muted-foreground">함께 걸은 산책이 새 친구를 깨웠어요.</p>
            </motion.div>
            <Button className="h-11 w-full" onClick={onClose}>반가워!</Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
