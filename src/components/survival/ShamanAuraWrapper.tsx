import React from 'react';
import { motion } from 'framer-motion';
import {
  SHAMAN_CLASSES,
  BASE_SHAMAN_CLASSES,
  normalizeShamanClassId,
  type ShamanClassId,
} from '@/lib/survival/shamanEvolution';

interface AuraWrapperProps {
  shamanClass?: ShamanClassId | string | null;
  children: React.ReactNode;
}

/** 기존 4프레임 부족민·펫 스프라이트에 전직별 오라와 액세서리를 얹는 페이퍼돌 래퍼 */
export const ShamanAuraWrapper: React.FC<AuraWrapperProps> = ({ shamanClass, children }) => {
  const canonical = normalizeShamanClassId(shamanClass);
  if (!canonical) return <>{children}</>;
  const config = BASE_SHAMAN_CLASSES[canonical];

  return (
    <div className={`relative inline-flex items-center justify-center ${config?.auraClass ?? ''}`}>
      {/* 발밑 오라 링 */}
      {canonical === 'MAGE' && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-1 w-8 h-3 rounded-full border border-dashed border-sky-400/80 pointer-events-none"
        />
      )}
      {canonical === 'NECROMANCER' && (
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -bottom-1 w-8 h-3 rounded-full bg-purple-600/40 blur-[2px] pointer-events-none"
        />
      )}
      {canonical === 'ENGINEER' && (
        <motion.div
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute -bottom-0.5 w-7 h-2 rounded-full bg-orange-500/30 blur-[1px] pointer-events-none"
        />
      )}
      {canonical === 'HONEST' && (
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute -bottom-0.5 w-7 h-2 rounded-full bg-amber-400/30 blur-[1px] pointer-events-none"
        />
      )}

      {/* 기존 4프레임 캐릭터 스프라이트 */}
      <div className="relative z-10 flex items-center justify-center">{children}</div>

      {/* 머리 위 픽셀 액세서리 배지 (페이퍼돌 레이어) */}
      <span className="absolute -top-2.5 right-0 text-[10px] z-20 pointer-events-none select-none drop-shadow-sm">
        {canonical === 'ENGINEER' && '🥽'}
        {canonical === 'HONEST' && '🪶'}
        {canonical === 'NECROMANCER' && '🦴'}
        {canonical === 'MAGE' && '🔮'}
      </span>
    </div>
  );
};

/** 거점 마을(BaseVillageView) 위에 덮어 전직별 색감과 파티클을 연출하는 오버레이 */
export const VillageAtmosphereOverlay: React.FC<{ shamanClass?: ShamanClassId | string | null }> = ({ shamanClass }) => {
  const canonical = normalizeShamanClassId(shamanClass);
  if (!canonical) return null;
  const config = BASE_SHAMAN_CLASSES[canonical];

  const particleColor =
    canonical === 'ENGINEER' ? 'bg-orange-300' :
    canonical === 'MAGE' ? 'bg-sky-300' :
    canonical === 'NECROMANCER' ? 'bg-purple-400' : 'bg-amber-200';

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden z-20 ${config?.villageTint ?? ''}`}>
      {/* 흑마술사 전용 보라색 비네팅 */}
      {canonical === 'NECROMANCER' && (
        <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(88,28,135,0.65)]" />
      )}
      {/* 떠다니는 픽셀 분위기 파티클 12개 */}
      {Array.from({ length: 12 }).map((_, idx) => (
        <motion.div
          key={idx}
          className={`absolute w-1.5 h-1.5 rounded-full ${particleColor} opacity-70`}
          style={{ left: `${(idx * 8.5) % 95}%`, bottom: `${(idx * 13) % 40}%` }}
          animate={{ y: [-10, -90], opacity: [0, 0.85, 0] }}
          transition={{ duration: 3 + (idx % 3), repeat: Infinity, delay: idx * 0.35 }}
        />
      ))}
    </div>
  );
};

export default ShamanAuraWrapper;
