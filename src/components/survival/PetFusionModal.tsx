import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Swords, Heart, Shield, Award, Check } from 'lucide-react';
import PetSprite from './PetSprite';
import { petStats, type OwnedPet } from '@/lib/survival/pets';
import { petById } from '@/lib/survival/dinoEggs';
import { abilitiesFor, abilityText } from '@/lib/survival/petAbilities';
import { playSfx, haptic } from '@/lib/survival/gameSettings';

export interface PetFusionResult {
  pet: OwnedPet;
  prevLevel: number;
  firstPet?: OwnedPet;
  secondPet?: OwnedPet;
}

interface Props {
  result: PetFusionResult | null;
  onClose: () => void;
}

const BURST_PARTICLES = Array.from({ length: 32 }, (_, i) => ({
  angle: (i / 32) * Math.PI * 2,
  dist: 80 + (i % 4) * 30,
  size: i % 3 === 0 ? 'h-3 w-3' : i % 2 === 0 ? 'h-2 w-2' : 'h-1.5 w-1.5',
  color: i % 4 === 0 ? 'bg-amber-400' : i % 4 === 1 ? 'bg-emerald-400' : i % 4 === 2 ? 'bg-sky-400' : 'bg-purple-400',
}));

export default function PetFusionModal({ result, onClose }: Props) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'gathering' | 'burst' | 'revealed'>('gathering');

  useEffect(() => {
    if (!result) {
      setPhase('gathering');
      return;
    }

    if (reduced) {
      setPhase('revealed');
      playSfx('fanfare');
      return;
    }

    setPhase('gathering');
    playSfx('crack');
    haptic(50);

    const t1 = window.setTimeout(() => {
      setPhase('burst');
      playSfx('burst');
      haptic([120, 60, 200]);
    }, 1100);

    const t2 = window.setTimeout(() => {
      setPhase('revealed');
      playSfx('fanfare');
    }, 1500);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [result?.pet.uid, reduced]);

  if (!result) return null;

  const { pet, prevLevel, firstPet, secondPet } = result;
  const petName = petById(pet.speciesId)?.name ?? pet.name;
  const prevStats = petStats(prevLevel);
  const newStats = petStats(pet.level);
  const atkDiff = Math.round(newStats.attack - prevStats.attack);
  const hpDiff = Math.round(newStats.maxHp - prevStats.maxHp);
  const abilities = abilitiesFor(pet.speciesId);

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="공룡 펫 합체 진화"
        className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/85 p-3.5 backdrop-blur-md font-pixel select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-sm rounded-xl border-4 border-amber-400 bg-gradient-to-b from-[#1a1c23] via-[#121318] to-[#0a0b0e] p-5 text-white shadow-[0_0_50px_rgba(251,191,36,0.35)] overflow-hidden"
          initial={{ scale: 0.8, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
        >
          {/* Top Decorative Lights */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />

          {/* Background Rotating Sunburst Ray on Revealed */}
          {phase === 'revealed' && !reduced && (
            <motion.div
              className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.25)_0%,transparent_70%)] blur-xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
            />
          )}

          {/* Full Screen White Flash on Burst */}
          {phase === 'burst' && !reduced && (
            <motion.div
              className="pointer-events-none fixed inset-0 bg-white"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          )}

          {/* ──────────────── ANIMATION ARENA ──────────────── */}
          <div className="relative mx-auto flex h-48 w-full items-center justify-center overflow-visible">
            {phase === 'gathering' && (
              <>
                {/* Collapsing Energy Circles */}
                <motion.div
                  className="absolute h-36 w-36 rounded-full border-2 border-dashed border-amber-400/80"
                  animate={{ rotate: 360, scale: [1.2, 0.2] }}
                  transition={{ duration: 1.1, ease: 'easeIn' }}
                />
                <motion.div
                  className="absolute h-24 w-24 rounded-full bg-amber-500/30 blur-md"
                  animate={{ scale: [1, 2.2, 0.1], opacity: [0.3, 0.8, 1] }}
                  transition={{ duration: 1.1, ease: 'easeIn' }}
                />

                {/* Pet 1 moving inward from Left */}
                <motion.div
                  className="absolute"
                  initial={{ x: -75, opacity: 0.9, scale: 0.9 }}
                  animate={{ x: 0, opacity: 1, scale: [0.9, 1.1, 0.4] }}
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                >
                  <PetSprite speciesId={firstPet?.speciesId ?? pet.speciesId} name={petName} height={56} />
                </motion.div>

                {/* Pet 2 moving inward from Right */}
                <motion.div
                  className="absolute"
                  initial={{ x: 75, opacity: 0.9, scale: 0.9 }}
                  animate={{ x: 0, opacity: 1, scale: [0.9, 1.1, 0.4] }}
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                >
                  <div style={{ transform: 'scaleX(-1)' }}>
                    <PetSprite speciesId={secondPet?.speciesId ?? pet.speciesId} name={petName} height={56} />
                  </div>
                </motion.div>
              </>
            )}

            {/* Exploding Particles on Burst & Revealed */}
            {(phase === 'burst' || phase === 'revealed') && !reduced && (
              <>
                {BURST_PARTICLES.map((p, i) => (
                  <motion.span
                    key={i}
                    className={`absolute rounded-full ${p.color} ${p.size} shadow-sm`}
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{
                      x: Math.cos(p.angle) * p.dist,
                      y: Math.sin(p.angle) * p.dist,
                      opacity: [1, 1, 0],
                      scale: [1, 1.3, 0],
                    }}
                    transition={{ duration: 0.85, ease: 'easeOut' }}
                  />
                ))}
              </>
            )}

            {/* Revealed Hero Evolved Pet */}
            {phase === 'revealed' && (
              <motion.div
                className="relative flex flex-col items-center"
                initial={{ scale: 0.2, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 16 }}
              >
                {/* Glowing Aura Ring underneath */}
                <motion.div
                  className="absolute -bottom-2 h-14 w-40 rounded-[100%] bg-gradient-to-r from-amber-500/40 via-yellow-300/60 to-amber-500/40 blur-md pointer-events-none"
                  animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Floating Crown / Stars */}
                <motion.div
                  className="mb-1 flex items-center gap-1 text-amber-300 text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span>✨</span>
                  <Award className="h-4 w-4 text-amber-400" />
                  <span>진화 완료</span>
                  <span>✨</span>
                </motion.div>

                {/* Evolved Huge Pet Sprite */}
                <div className="relative py-1">
                  <PetSprite speciesId={pet.speciesId} name={petName} height={84} />
                </div>
              </motion.div>
            )}
          </div>

          {/* ──────────────── RESULT DETAILS & STATS ──────────────── */}
          {phase === 'revealed' && (
            <motion.div
              className="space-y-3.5 pt-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
            >
              {/* Pet Title & Level Progression Banner */}
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-amber-300 drop-shadow flex items-center justify-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>{petName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/50 font-bold font-mono">
                    Lv.{pet.level}
                  </span>
                </h3>
                <div className="flex items-center justify-center gap-2 text-xs text-stone-300">
                  <span className="opacity-70 line-through">Lv.{prevLevel} + Lv.{prevLevel}</span>
                  <span className="text-amber-400 font-bold">➔</span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    Lv.{pet.level} 초월 성장!
                  </span>
                </div>
              </div>

              {/* Stats Growth Card */}
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-stone-800 bg-stone-900/80 p-2.5 text-xs shadow-inner">
                {/* Attack Stat */}
                <div className="flex items-center gap-2 rounded bg-black/40 p-2 border border-stone-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-500/20 text-amber-400 shrink-0">
                    <Swords className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-stone-400 block">공격력</span>
                    <div className="flex items-baseline gap-1 font-bold">
                      <span className="text-xs text-stone-300">{prevStats.attack}</span>
                      <span className="text-[10px] text-stone-500">➔</span>
                      <span className="text-sm text-amber-400 font-black">{newStats.attack}</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">(+{atkDiff})</span>
                    </div>
                  </div>
                </div>

                {/* HP Stat */}
                <div className="flex items-center gap-2 rounded bg-black/40 p-2 border border-stone-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-red-500/20 text-red-400 shrink-0">
                    <Heart className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-stone-400 block">최대 체력</span>
                    <div className="flex items-baseline gap-1 font-bold">
                      <span className="text-xs text-stone-300">{prevStats.maxHp}</span>
                      <span className="text-[10px] text-stone-500">➔</span>
                      <span className="text-sm text-red-400 font-black">{newStats.maxHp}</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">(+{hpDiff})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Passive Abilities Box */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 space-y-1.5 text-xs">
                <span className="font-bold text-[11px] text-amber-300 flex items-center gap-1">
                  <span>⚡</span>
                  <span>강화된 고유 스킬 및 패시브</span>
                </span>
                <div className="space-y-1">
                  {abilities.length > 0 ? (
                    abilities.map(a => (
                      <div key={a.key} className="flex items-center justify-between text-[11px] bg-black/40 rounded px-2 py-1 border border-amber-500/20">
                        <span className="text-stone-300">{a.label}</span>
                        <span className="font-bold text-amber-300 font-mono">
                          {abilityText(a, pet.level)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-stone-400 italic">
                      기본 수호 및 사냥 능력이 강화되었습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* Special Shaman Synergy / Codex Milestone Note */}
              {pet.level >= 4 && (
                <div className="flex items-center gap-2 rounded bg-purple-950/50 border border-purple-500/40 p-2 text-[10px] text-purple-200">
                  <span className="text-base">💀</span>
                  <span>Lv.4 이상 도달! 흑마술사 주술사의 <b>[스컬 드래곤 영구 소환]</b> 제물 자격이 해금되었습니다!</span>
                </div>
              )}

              {/* Confirm / Continue Button */}
              <div className="pt-1">
                <Button
                  type="button"
                  onClick={onClose}
                  className="pixel-btn w-full h-11 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg active:scale-95"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  <span>성장한 공룡 펫과 함께하기</span>
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
