import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Quality, qualityFromCrits, QUALITY_LABEL, Recipe, ITEMS } from '@/lib/survival';

interface Props { recipe: Recipe; onDone: (q: Quality) => void; onCancel: () => void }

const HITS = 3;

export default function KnappingMinigame({ recipe, onDone, onCancel }: Props) {
  const [x, setX] = useState(0); // 0..100 indicator
  const [hits, setHits] = useState<boolean[]>([]);
  const [particles, setParticles] = useState<{ id: number; dx: number; dy: number }[]>([]);
  const dir = useRef(1);
  const frozen = useRef(false);
  const shake = useAnimationControls();
  const critWidth = Math.max(6, 18 - recipe.difficulty * 3);
  const normWidth = 30;
  const critStart = 50 - critWidth / 2;
  const normStart = 50 - normWidth / 2;
  const done = hits.length >= HITS;

  useEffect(() => {
    if (done) return;
    const speed = 1.2 + recipe.difficulty * 0.4;
    let raf = 0;
    const loop = () => {
      if (!frozen.current) {
        setX((v) => {
          let n = v + dir.current * speed;
          if (n >= 100) { n = 100; dir.current = -1; }
          if (n <= 0) { n = 0; dir.current = 1; }
          return n;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [done, recipe.difficulty]);

  const strike = () => {
    if (done) return;
    const crit = x >= critStart && x <= critStart + critWidth;
    const normal = x >= normStart && x <= normStart + normWidth;
    const next = [...hits, crit];
    // Hit-stop 50ms + shake
    frozen.current = true;
    setTimeout(() => { frozen.current = false; }, 50);
    shake.start({ x: [-4, 4, -2, 2, 0], transition: { duration: 0.25 } });
    setParticles(Array.from({ length: 10 }, (_, i) => ({ id: Date.now() + i, dx: (Math.random() - 0.5) * 140, dy: -40 - Math.random() * 60 })));
    setHits(normal || crit ? next : [...hits, false]);
    if (!normal && !crit) (next as boolean[]).splice(0); // miss counted as non-crit
  };

  const crits = hits.filter(Boolean).length;
  const quality = qualityFromCrits(crits, hits.length);
  const chipped = hits.length; // stone loses a layer per hit

  return (
    <div className="absolute inset-0 z-[1500] flex items-center justify-center bg-black/70 p-4 font-pixel">
      <motion.div animate={shake} className="pixel-frame w-full max-w-sm bg-stone-200 p-4 text-stone-900">
        <h3 className="mb-2 text-center text-lg">석기 타격 · {ITEMS[recipe.resultItemId].name}</h3>

        <div className="relative mx-auto my-4 flex h-32 w-32 items-center justify-center">
          <div
            className="pixelated"
            style={{
              width: 96 - chipped * 14, height: 80 - chipped * 10,
              background: done ? ITEMS[recipe.resultItemId].color : '#57534e',
              boxShadow: done && quality === 'MASTERWORK' ? '0 0 0 4px #d4a843, 0 0 24px 8px #d4a843' : '4px 4px 0 0 #000',
              transition: 'all 120ms steps(3)',
            }}
          />
          {particles.map((p) => (
            <motion.span key={p.id} className="absolute h-1 w-1 bg-stone-500"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: p.dx, y: [0, p.dy, p.dy + 80], opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              onAnimationComplete={() => setParticles((ps) => ps.filter((q) => q.id !== p.id))} />
          ))}
        </div>

        {/* Timing bar */}
        <div className="relative h-6 w-full border-4 border-stone-800 bg-stone-400">
          <div className="absolute inset-y-0 bg-yellow-400" style={{ left: `${normStart}%`, width: `${normWidth}%` }} />
          <div className="absolute inset-y-0 bg-orange-500" style={{ left: `${critStart}%`, width: `${critWidth}%` }} />
          <div className="absolute -top-1 -bottom-1 w-1.5 bg-stone-900" style={{ left: `${x}%` }} />
        </div>

        <div className="my-3 flex justify-center gap-2">
          {Array.from({ length: HITS }).map((_, i) => (
            <span key={i} className={`h-4 w-4 border-2 border-stone-800 ${i < hits.length ? (hits[i] ? 'bg-orange-500' : 'bg-stone-500') : 'bg-stone-100'}`} />
          ))}
        </div>

        {!done ? (
          <div className="flex gap-2">
            <button onClick={onCancel} className="pixel-btn min-h-[48px] flex-1 bg-stone-400">취소</button>
            <button onClick={strike} className="pixel-btn min-h-[56px] flex-[2] bg-orange-500 text-lg">내리치기!</button>
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-3">결과: <b>[{QUALITY_LABEL[quality]}]</b> (크리티컬 {crits}/3)</p>
            <button onClick={() => onDone(quality)} className="pixel-btn min-h-[52px] w-full bg-yellow-400">획득하기</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
