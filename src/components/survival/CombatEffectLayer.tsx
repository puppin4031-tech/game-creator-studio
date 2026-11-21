import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import flintSpearImg from '@/assets/survival/item-flint-spear.png';
import flintImg from '@/assets/survival/item-flint.png';

export type SkillVfxType =
  | 'fireball'
  | 'iceball'
  | 'thunder'
  | 'dark_magic'
  | 'mana_shield'
  | 'ember_spark'
  | 'shockwave_roar';

export interface CombatVfxEvent {
  id: string;
  type: SkillVfxType;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  damage?: number;
  isCrit?: boolean;
}

export interface FloatingDamage {
  id: string;
  x: number;
  y: number;
  damage: number;
  isCrit?: boolean;
}

export interface ProjectileVfx {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  kind: 'arrow' | 'spear' | 'stone' | 'fireball' | 'iceball';
}

/** 3-step Lunge Motion for Framer-Motion (Anticipation -> Lunge -> Return) */
export const lungeVariants = {
  idle: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
  strike: (dir: 1 | -1 = 1) => ({
    x: [0, -8 * dir, 36 * dir, 0],
    scaleX: [1, 0.9, 1.15, 1],
    scaleY: [1, 0.95, 1.05, 1],
    transition: {
      duration: 0.32,
      times: [0, 0.28, 0.52, 1],
      ease: 'easeOut',
    },
  }),
};

/** Screen Shake Helper */
export function useScreenShake() {
  const [shaking, setShaking] = useState(false);
  const triggerShake = (durationMs = 120) => {
    setShaking(true);
    setTimeout(() => setShaking(false), durationMs);
  };
  return { shaking, triggerShake };
}

/** Hit Reaction Wrapper with Hit-Stop & Brightness Flash */
export function HitReactionWrapper({
  hit,
  children,
  className = '',
}: {
  hit: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <motion.div
        animate={
          hit
            ? {
                filter: ['brightness(2.5) contrast(1.2)', 'brightness(1) contrast(1)'],
                x: [0, -6, 6, -3, 3, 0],
              }
            : { filter: 'brightness(1) contrast(1)', x: 0 }
        }
        transition={{ duration: 0.18 }}
      >
        {children}
      </motion.div>

      {/* Slash Arc Effect on Impact */}
      {hit && (
        <motion.div
          initial={{ opacity: 1, scale: 0.5, rotate: -30 }}
          animate={{ opacity: 0, scale: 1.4, rotate: 30 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <svg className="w-12 h-12 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" viewBox="0 0 40 40">
            <path
              d="M 5 35 Q 20 20 35 5"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
      )}
    </div>
  );
}

/** Floating Damage Numbers (Normal: White, Crit: Bold Red/Yellow Arc) */
export function FloatingDamageNumber({
  x,
  y,
  damage,
  isCrit = false,
  onComplete,
}: {
  x: number;
  y: number;
  damage: number;
  isCrit?: boolean;
  onComplete?: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 900);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ x: x - 20, y: y - 10, opacity: 1, scale: isCrit ? 1.4 : 1 }}
      animate={{
        x: x - 20 + (isCrit ? 12 : 6),
        y: y - 55,
        opacity: [1, 1, 0],
        scale: isCrit ? [1.4, 1.6, 1.2] : [1, 1.1, 0.9],
      }}
      transition={{ duration: 0.85, ease: 'easeOut' }}
      className={`pointer-events-none absolute z-50 font-black tracking-wider select-none ${
        isCrit
          ? 'text-yellow-300 drop-shadow-[0_2px_4px_rgba(239,68,68,0.9)] text-base'
          : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-xs'
      }`}
    >
      {isCrit ? `💥 CRIT! -${damage}` : `-${damage}`}
    </motion.div>
  );
}

/** Parabolic Ranged Projectile Arc (Arrow, Spear, Sling Stone) with calculated orientation */
export function RangedProjectileArc({
  startX,
  startY,
  targetX,
  targetY,
  kind,
  onHit,
}: {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  kind: 'arrow' | 'spear' | 'stone' | 'fireball' | 'iceball';
  onHit?: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onHit?.(), 380);
    return () => clearTimeout(t);
  }, [onHit]);

  const dx = targetX - startX;
  const dy = targetY - startY;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Natural sprite tip for item-flint-spear is at -45° (top-right); rotating by angleDeg + 45 aligns the sharp tip directly toward the target mob
  const spearAngle = angleDeg + 45;

  return (
    <motion.div
      initial={{ left: startX, top: startY, opacity: 1, scale: 0.9 }}
      animate={{
        left: targetX,
        top: [startY, Math.min(startY, targetY) - 24, targetY],
        opacity: [1, 1, 0.9],
        scale: [0.9, 1.15, 1.0],
      }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
      className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 drop-shadow-md select-none"
    >
      {kind === 'spear' || kind === 'arrow' ? (
        <img
          src={flintSpearImg}
          alt="투창/화살"
          className="pixelated h-8 w-8 object-contain drop-shadow-[0_0_8px_rgba(250,204,21,0.85)] filter brightness-110"
          style={{ transform: `rotate(${spearAngle}deg)`, transformOrigin: 'center center' }}
        />
      ) : kind === 'stone' ? (
        <motion.img
          src={flintImg}
          alt="부싯돌/돌멩이"
          animate={{ rotate: 720 }}
          transition={{ duration: 0.38, ease: 'linear' }}
          className="pixelated h-6 w-6 object-contain drop-shadow"
        />
      ) : kind === 'fireball' ? (
        <span
          className="inline-block text-2xl select-none"
          style={{ transform: `rotate(${angleDeg}deg)` }}
        >
          🔥
        </span>
      ) : (
        <span
          className="inline-block text-2xl select-none"
          style={{ transform: `rotate(${angleDeg}deg)` }}
        >
          ❄️
        </span>
      )}
    </motion.div>
  );
}

/** 5 Pixel Skill VFX Engines */

/** 1. 🔥 Fireball / Flame Breath VFX */
export function FireballVFX({ x, y, onComplete }: { x: number; y: number; onComplete?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 800);
    return () => clearTimeout(t);
  }, [onComplete]);

  // 12-dot explosion burst
  const dots = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 * Math.PI) / 180;
    const dist = 32 + (i % 3) * 8;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      color: i % 2 === 0 ? '#f97316' : '#eab308',
    };
  });

  return (
    <div className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      {/* Central Flame Burst */}
      <motion.div
        initial={{ scale: 0.5, opacity: 1 }}
        animate={{ scale: [0.5, 1.8, 0], opacity: [1, 0.9, 0] }}
        transition={{ duration: 0.45 }}
        className="absolute -inset-4 rounded-full bg-orange-500/80 blur-xs flex items-center justify-center"
      >
        <span className="text-2xl">🔥</span>
      </motion.div>

      {/* 12 Exploding Pixel Dots */}
      {dots.map((d, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: d.dx, y: d.dy, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute h-2 w-2 rounded-none"
          style={{ backgroundColor: d.color }}
        />
      ))}

      {/* Burn Floating Badge */}
      <motion.span
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: -30, opacity: [1, 1, 0] }}
        transition={{ duration: 0.75, delay: 0.1 }}
        className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-red-950/90 border border-orange-500 px-1 text-[9px] font-bold text-orange-400 shadow"
      >
        🔥 BURN
      </motion.span>
    </div>
  );
}

/** 2. ❄️ Iceball / Frost Roar VFX */
export function IceballVFX({ x, y, onComplete }: { x: number; y: number; onComplete?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 850);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      {/* Expanding Frost Ring */}
      <motion.div
        initial={{ scale: 0.3, opacity: 1 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute -inset-6 rounded-full border-2 border-cyan-400 bg-cyan-500/30"
      />

      {/* Ground Ice Spikes */}
      <motion.div
        initial={{ scaleY: 0, opacity: 1 }}
        animate={{ scaleY: [0, 1.2, 0.9, 0], opacity: [1, 1, 0.8, 0] }}
        transition={{ duration: 0.65 }}
        className="origin-bottom flex items-center justify-center gap-1 -translate-y-2"
      >
        <span className="text-2xl text-cyan-200 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">❄️</span>
        <span className="text-xl text-blue-200">🧊</span>
      </motion.div>

      {/* Slow Floating Badge */}
      <motion.span
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: -28, opacity: [1, 1, 0] }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-cyan-950/90 border border-cyan-400 px-1 text-[9px] font-bold text-cyan-300 shadow"
      >
        ❄️ FROZEN (-30% SPD)
      </motion.span>
    </div>
  );
}

/** 3. ⚡ Thunderbolt / Lightning VFX */
export function ThunderboltVFX({ x, y, onComplete }: { x: number; y: number; onComplete?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 800);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full" style={{ left: x, top: y }}>
      {/* Screen White Flash */}
      <motion.div
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-white pointer-events-none z-60"
      />

      {/* Zigzag Lightning Bolt from Sky */}
      <motion.svg
        initial={{ pathLength: 0, opacity: 1 }}
        animate={{ pathLength: 1, opacity: [1, 1, 0] }}
        transition={{ duration: 0.25 }}
        className="w-16 h-48 drop-shadow-[0_0_12px_rgba(250,204,21,1)]"
        viewBox="0 0 60 180"
      >
        <path
          d="M 30 0 L 15 60 L 38 75 L 12 130 L 32 140 L 25 180"
          fill="none"
          stroke="#fde047"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 30 0 L 15 60 L 38 75 L 12 130 L 32 140 L 25 180"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>

      {/* Orbiting Stun Stars */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
        className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 text-xs"
      >
        <span className="text-yellow-300">⭐</span>
        <span className="text-yellow-100 font-bold">STUN</span>
        <span className="text-yellow-300">⭐</span>
      </motion.div>
    </div>
  );
}

/** 4. 💀 Dark Magic / Poison & Skull Summon VFX */
export function DarkMagicVFX({ x, y, onComplete }: { x: number; y: number; onComplete?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 900);
    return () => clearTimeout(t);
  }, [onComplete]);

  // Rising poison bubbles
  const bubbles = [
    { dx: -14, delay: 0 },
    { dx: 0, delay: 0.1 },
    { dx: 14, delay: 0.05 },
    { dx: -8, delay: 0.15 },
  ];

  return (
    <div className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      {/* Ground Void Ring */}
      <motion.div
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: [0.2, 1.4, 0], opacity: [1, 0.8, 0] }}
        transition={{ duration: 0.6 }}
        className="absolute -inset-6 rounded-full bg-purple-950/80 border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]"
      />

      {/* Rising Skeleton Sprite from Ground */}
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.5 }}
        animate={{ y: [20, -10, -5], opacity: [0, 1, 0], scale: [0.5, 1.2, 1] }}
        transition={{ duration: 0.75 }}
        className="flex flex-col items-center justify-center text-2xl drop-shadow-[0_0_10px_rgba(168,85,247,1)]"
      >
        <span>💀</span>
      </motion.div>

      {/* Rising Toxic Bubbles */}
      {bubbles.map((b, i) => (
        <motion.div
          key={i}
          initial={{ x: b.dx, y: 10, opacity: 1, scale: 0.8 }}
          animate={{ y: -35, opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.6, delay: b.delay, ease: 'easeOut' }}
          className="absolute h-2.5 w-2.5 rounded-full bg-purple-500 border border-purple-300"
        />
      ))}
    </div>
  );
}

/** 5. 🛡️ Mana Shield / Giant Defense VFX */
export function ManaShieldVFX({ x, y, onComplete }: { x: number; y: number; onComplete?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 1100);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="pointer-events-none absolute z-45 -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      {/* Pulsing Hexagonal Shield Ring */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{
          scale: [0.7, 1.15, 1, 1.05, 1],
          opacity: [0, 0.85, 0.65, 0.8, 0],
        }}
        transition={{ duration: 1.1 }}
        className="h-16 w-16 rounded-full border-2 border-blue-400 bg-blue-500/20 backdrop-blur-xs shadow-[0_0_14px_rgba(59,130,246,0.6)] flex items-center justify-center"
      >
        <span className="text-blue-300 text-lg opacity-80 animate-pulse">🛡️</span>
      </motion.div>

      {/* Expanding Shockwave Wave */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0.9 }}
        animate={{ scale: 2.1, opacity: 0 }}
        transition={{ duration: 0.65, delay: 0.2 }}
        className="absolute -inset-2 rounded-full border border-cyan-300/60"
      />
    </div>
  );
}

/** 6. 🌿 Ember Spark VFX (Primitive scattered sparks from flint/campfire) */
export function EmberSparkVFX({ x, y, onComplete }: { x: number; y: number; onComplete?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 700);
    return () => clearTimeout(t);
  }, [onComplete]);

  const sparks = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 * Math.PI) / 180 + (Math.random() * 0.4 - 0.2);
    const dist = 18 + Math.random() * 16;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 8,
      color: i % 2 === 0 ? '#fb923c' : '#fef08a',
    };
  });

  return (
    <div className="pointer-events-none absolute z-45 -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      <motion.div
        initial={{ scale: 0.6, opacity: 1 }}
        animate={{ scale: [0.6, 1.2, 0], opacity: [1, 0.8, 0] }}
        transition={{ duration: 0.35 }}
        className="text-lg flex items-center justify-center"
      >
        <span>✨</span>
      </motion.div>

      {sparks.map((s, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: s.dx, y: s.dy, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="absolute h-1.5 w-1.5 rounded-none"
          style={{ backgroundColor: s.color }}
        />
      ))}

      <motion.span
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: -22, opacity: [1, 1, 0] }}
        transition={{ duration: 0.65 }}
        className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-stone-900/90 border border-orange-500/60 px-1 text-[9px] font-bold text-orange-300 shadow"
      >
        🔥 불씨 뿌리기
      </motion.span>
    </div>
  );
}

/** 7. 📢 Shockwave Roar VFX (Primitive beast sonic intimidation ring) */
export function ShockwaveRoarVFX({ x, y, onComplete }: { x: number; y: number; onComplete?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete?.(), 650);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="pointer-events-none absolute z-45 -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      {/* Expanding Soundwave Ring 1 */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0.9 }}
        animate={{ scale: 1.8, opacity: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="absolute -inset-8 rounded-full border-2 border-amber-300/80 bg-amber-500/15"
      />
      {/* Expanding Soundwave Ring 2 */}
      <motion.div
        initial={{ scale: 0.2, opacity: 0.8 }}
        animate={{ scale: 2.4, opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        className="absolute -inset-6 rounded-full border border-amber-400/50"
      />

      {/* Roar Icon in Center */}
      <motion.div
        initial={{ scale: 0.8, opacity: 1 }}
        animate={{ scale: [0.8, 1.4, 0.9], opacity: [1, 1, 0] }}
        transition={{ duration: 0.5 }}
        className="text-2xl flex items-center justify-center text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
      >
        <span>📢</span>
      </motion.div>

      <motion.span
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: -26, opacity: [1, 1, 0] }}
        transition={{ duration: 0.6 }}
        className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-stone-900/90 border border-amber-400/60 px-1 text-[9px] font-bold text-amber-300 shadow"
      >
        📢 포효 (위압)
      </motion.span>
    </div>
  );
}

/**
 * Resolves the appropriate skill VFX depending on WHO is casting or attacking:
 * - Primitive players and low-level pets (Lv.1-2) use natural physical/primitive effects (flint sparks, soundwave roar, flying stones).
 * - Advanced entities (Evolved Mage/Warlock/Chief Shamans, or High-Tier Lv.3+ Evolved Pets and Skull Dragons) unleash true elemental and dark magic spells.
 */
export function resolveEntitySkillVfx({
  skillId,
  shamanClass,
  petSpecies,
  petLevel,
  isSkullDragon,
}: {
  skillId?: string;
  shamanClass?: string | null;
  petSpecies?: string;
  petLevel?: number;
  isSkullDragon?: boolean;
}): { vfxType?: SkillVfxType; isStoneBarrage?: boolean } {
  // 1. High-tier or Special Evolved Pet Attack
  if (isSkullDragon) {
    return { vfxType: 'dark_magic' };
  }
  if (petSpecies && petLevel && petLevel >= 3) {
    const sp = petSpecies.toLowerCase();
    if (sp.includes('draco') || sp.includes('carno')) {
      return { vfxType: 'fireball' };
    }
    if (sp.includes('ptero')) {
      return { vfxType: 'thunder' };
    }
    if (sp.includes('stago') || sp.includes('stego')) {
      return { vfxType: 'iceball' };
    }
    if (sp.includes('kerat') || sp.includes('balo')) {
      return { vfxType: 'mana_shield' };
    }
  }

  // 2. Evolved Shaman Magic
  if (shamanClass === 'mage') {
    if (skillId === 'ember_scatter') return { vfxType: 'fireball' };
    if (skillId === 'roar') return { vfxType: 'iceball' };
    if (skillId === 'stone_barrage') return { vfxType: 'thunder' };
    return { vfxType: 'fireball' };
  }
  if (shamanClass === 'warlock') {
    return { vfxType: 'dark_magic' };
  }
  if (shamanClass === 'orthodox') {
    return { vfxType: 'mana_shield' };
  }
  if (shamanClass === 'engineer') {
    return { vfxType: 'fireball' }; // Mechanical explosive burst
  }

  // 3. Normal / Primitive Player Skills (Default)
  if (skillId === 'stone_barrage') {
    return { isStoneBarrage: true }; // Fires 3 rapid stone projectiles instead of a thunder spell!
  }
  if (skillId === 'roar') {
    return { vfxType: 'shockwave_roar' }; // Expanding sonic wave instead of an ice spell!
  }
  if (skillId === 'ember_scatter') {
    return { vfxType: 'ember_spark' }; // Realistic primitive sparks instead of a giant wizard fireball!
  }

  return {};
}

/** Complete Combat VFX Dispatcher Component */
export function CombatEffectLayer({
  events,
  damageNumbers,
  projectiles,
  onRemoveEvent,
  onRemoveDamage,
  onRemoveProjectile,
}: {
  events: CombatVfxEvent[];
  damageNumbers: FloatingDamage[];
  projectiles: ProjectileVfx[];
  onRemoveEvent: (id: string) => void;
  onRemoveDamage: (id: string) => void;
  onRemoveProjectile: (id: string) => void;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {/* Projectiles */}
      {projectiles.map(p => (
        <RangedProjectileArc
          key={p.id}
          startX={p.startX}
          startY={p.startY}
          targetX={p.targetX}
          targetY={p.targetY}
          kind={p.kind}
          onHit={() => onRemoveProjectile(p.id)}
        />
      ))}

      {/* Floating Damage Numbers */}
      {damageNumbers.map(d => (
        <FloatingDamageNumber
          key={d.id}
          x={d.x}
          y={d.y}
          damage={d.damage}
          isCrit={d.isCrit}
          onComplete={() => onRemoveDamage(d.id)}
        />
      ))}

      {/* 5 Skill VFX */}
      {events.map(ev => {
        const x = ev.targetX ?? ev.x;
        const y = ev.targetY ?? ev.y;
        switch (ev.type) {
          case 'fireball':
            return <FireballVFX key={ev.id} x={x} y={y} onComplete={() => onRemoveEvent(ev.id)} />;
          case 'iceball':
            return <IceballVFX key={ev.id} x={x} y={y} onComplete={() => onRemoveEvent(ev.id)} />;
          case 'thunder':
            return <ThunderboltVFX key={ev.id} x={x} y={y} onComplete={() => onRemoveEvent(ev.id)} />;
          case 'dark_magic':
            return <DarkMagicVFX key={ev.id} x={x} y={y} onComplete={() => onRemoveEvent(ev.id)} />;
          case 'mana_shield':
            return <ManaShieldVFX key={ev.id} x={x} y={y} onComplete={() => onRemoveEvent(ev.id)} />;
          case 'ember_spark':
            return <EmberSparkVFX key={ev.id} x={x} y={y} onComplete={() => onRemoveEvent(ev.id)} />;
          case 'shockwave_roar':
            return <ShockwaveRoarVFX key={ev.id} x={x} y={y} onComplete={() => onRemoveEvent(ev.id)} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
