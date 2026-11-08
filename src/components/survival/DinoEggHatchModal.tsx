import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import egg from '@/assets/survival/dinos/egg.png';
import baby_raptor from '@/assets/survival/dinos/baby_raptor.png';
import mini_triceratops from '@/assets/survival/dinos/mini_triceratops.png';
import baby_stego from '@/assets/survival/dinos/baby_stego.png';
import baby_ptera from '@/assets/survival/dinos/baby_ptera.png';
import SpriteAnimator from './SpriteAnimator';
import { useSpriteAnimations } from '@/hooks/useSpriteAnimations';

export const BABY_ART: Record<string, string> = { baby_raptor, mini_triceratops, baby_stego, baby_ptera };
export const EGG_ART = egg;

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, d: 70 + (i % 3) * 22 }));

/** Hatch celebration: egg shakes, cracks, bursts into pixel particles and reveals the baby. */
export default function DinoEggHatchModal({ baby, onClose }: { baby: { id: string; name: string; custom?: boolean } | null; onClose: () => void }) {
  const reduced = useReducedMotion();
  const { data: art } = useSpriteAnimations(baby?.custom ? `pet:${baby.id}` : 'none');
  const sheet = baby && !BABY_ART[baby.id] ? art?.idle : undefined;
  const babySrc = baby ? BABY_ART[baby.id] ?? egg : egg;
  return (
    <AnimatePresence>
      {baby && (
        <motion.div role="dialog" aria-modal aria-label="공룡 알 부화" className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="pixel-frame w-full max-w-sm space-y-4 bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
            <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
              <motion.img src={egg} alt="" className="pixelated absolute h-32 w-32"
                animate={reduced ? { opacity: 0 } : { rotate: [0, -12, 12, -16, 16, 0], scale: [1, 1, 1, 1.1, 1.2, 0], opacity: [1, 1, 1, 1, 1, 0] }}
                transition={{ duration: reduced ? 0.2 : 1.6, times: [0, 0.2, 0.4, 0.6, 0.85, 1] }} />
              {!reduced && PARTICLES.map((p, i) => (
                <motion.span key={i} className={`absolute h-2 w-2 ${i % 2 ? 'bg-primary' : 'bg-accent'}`}
                  initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: Math.cos(p.a) * p.d, y: Math.sin(p.a) * p.d, opacity: [0, 1, 0] }}
                  transition={{ delay: 1.45, duration: 0.8 }} />
              ))}
              <motion.div className="absolute" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: reduced ? 0.2 : 1.55, type: 'spring', stiffness: 260, damping: 14 }}>
                {sheet ? <SpriteAnimator url={sheet.url} frames={sheet.frame_count} fps={sheet.fps} height={144} /> : <img src={babySrc} alt={baby.name} className="pixelated h-36 w-36" />}
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0.3 : 1.8 }} className="space-y-1">
              <p className="text-lg font-bold">{baby.name} 탄생!</p>
              <p className="text-sm text-muted-foreground">함께 걸은 산책이 새 친구를 깨웠어요.</p>
            </motion.div>
            <Button className="h-11 w-full" onClick={onClose}>반가워!</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
