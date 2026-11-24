import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Plus, Sparkles } from 'lucide-react';
import {
  type ModularSkillsSaveState,
  BASE_ACTIONS,
  FUSED_SKILLS_MAP,
  getSkillDisplayName,
  getSkillDisplayIcon,
  getSkillCooldownMs,
  type BaseActionId,
} from '@/data/modularSkills';

export interface RightSkillDrawerProps {
  modularSkills?: ModularSkillsSaveState;
  cooldowns?: Record<string, number>;
  ready: boolean;
  onUseSkill: (skillId: string) => void;
  onOpenSettings: (initialTargetSlot?: 0 | 1 | 2) => void;
}

const STORAGE_KEY = 'colonion_skill_drawer_open';

/**
 * Right-Edge Collapsible Wooden Skill Drawer (3 Skill Slots + Settings)
 * Anchored flush to right-0 in the lower-right thumb zone (z-index: 1050).
 */
export default function RightSkillDrawer({
  modularSkills,
  cooldowns = {},
  ready,
  onUseSkill,
  onOpenSettings,
}: RightSkillDrawerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const toggleOpen = () => {
    setIsOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // 3 explicit slots: fallback to first 3 equippedSkillIds if not yet initialized
  const slots: [string | null, string | null, string | null] = modularSkills?.equippedSkillSlots ?? [
    modularSkills?.equippedSkillIds?.[0] ?? null,
    modularSkills?.equippedSkillIds?.[1] ?? null,
    modularSkills?.equippedSkillIds?.[2] ?? null,
  ];

  return (
    <aside
      aria-label="우측 전투 스킬 서랍"
      className="fixed right-0 bottom-[calc(4.85rem+env(safe-area-inset-bottom))] z-[1050] flex items-center font-pixel select-none pointer-events-auto [image-rendering:pixelated]"
    >
      <div className="flex items-center">
        {/* Horizontal Slide-Out Wooden Tray */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 200, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="flex items-center gap-1.5 rounded-l-2xl border-y-3 border-l-3 border-[#2b1d14] bg-[#8b5a2b] p-1.5 shadow-[-4px_4px_12px_rgba(0,0,0,0.65)]"
              style={{
                boxShadow: 'inset 0 2px 0 0 #b3773b, inset 0 -2px 0 0 #5c3a1e, -4px 4px 12px rgba(0,0,0,0.6)',
              }}
            >
              {/* [⚙️] Skill Settings / Assignment Button */}
              <button
                type="button"
                onClick={() => onOpenSettings()}
                className="pixel-btn flex h-11 w-10 flex-col items-center justify-center rounded-xl border-2 border-[#2b1d14] bg-[#4a3f35] text-amber-200 shadow-[inset_0_1px_0_0_#6b5d4f] hover:bg-[#594d42] active:translate-y-[1px]"
                title="스킬 슬롯 관리 및 기술 할당"
                aria-label="스킬 설정"
              >
                <Settings className="h-4 w-4 drop-shadow text-amber-200" />
                <span className="text-[8px] font-black text-amber-300 mt-0.5 leading-none">설정</span>
              </button>

              {/* 3 Active Skill Slots (48x48px) */}
              <div className="flex items-center gap-1.5">
                {([0, 1, 2] as const).map(index => {
                  const skillId = slots[index];
                  const playerSkill = skillId ? modularSkills?.unlockedSkills?.[skillId] : undefined;
                  const baseAction = skillId ? BASE_ACTIONS[skillId as BaseActionId] : undefined;
                  const fusedDef = skillId ? FUSED_SKILLS_MAP[skillId] : undefined;
                  const elemColor = fusedDef?.elementColor ?? '#f59e0b';
                  const level = playerSkill?.masteryLevel ?? 1;
                  const isAwakened = level >= 10 || !!playerSkill?.isAwakened;

                  // Cooldown calculation
                  const cdTotal = skillId ? getSkillCooldownMs(skillId, playerSkill) : 10_000;
                  const left = skillId ? Math.max(0, (cooldowns[skillId] ?? 0) - now) : 0;
                  const frac = Math.min(1, left / cdTotal);
                  const onCooldown = left > 0;

                  if (!skillId) {
                    // Empty Slot
                    return (
                      <button
                        key={`slot-empty-${index}`}
                        type="button"
                        onClick={() => onOpenSettings(index)}
                        className="relative flex h-12 w-12 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#4a3828] bg-[#201913] text-stone-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] hover:border-amber-500/70 hover:bg-[#2b221a] hover:text-amber-200 active:scale-95 transition-all cursor-pointer"
                        title={`${index + 1}번 스킬 슬롯: 비어 있음 (터치하여 스킬 장착)`}
                      >
                        {/* Slot index indicator */}
                        <span className="absolute top-1 left-1.5 text-[8px] font-mono font-bold text-stone-500 leading-none">
                          {index + 1}
                        </span>
                        <Plus className="h-5 w-5 opacity-70 drop-shadow" />
                        <span className="text-[7px] text-stone-500 font-bold leading-none mt-0.5">비어있음</span>
                      </button>
                    );
                  }

                  // Equipped Slot
                  const icon = getSkillDisplayIcon(skillId);
                  const displayName = getSkillDisplayName(skillId, playerSkill);

                  return (
                    <button
                      key={`slot-${index}-${skillId}`}
                      type="button"
                      disabled={!ready || onCooldown}
                      onClick={() => onUseSkill(skillId)}
                      className={`relative flex h-12 w-12 flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-[#201913] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.5)] transition-transform active:scale-95 disabled:opacity-85 cursor-pointer ${
                        isAwakened ? 'border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.45)]' : ''
                      }`}
                      style={{
                        borderColor: isAwakened ? '#fbbf24' : elemColor,
                      }}
                      title={`${displayName} (Lv.${level})${onCooldown ? ` - 쿨다운 ${(left / 1000).toFixed(1)}초` : ' - 터치하여 시전'}`}
                    >
                      {/* Slot index small label */}
                      <span className="absolute top-1 left-1 text-[7px] font-mono font-bold text-amber-100/60 leading-none drop-shadow">
                        {index + 1}
                      </span>

                      {/* Awakening Star */}
                      {isAwakened && (
                        <span className="absolute top-0.5 right-0.5 text-[8px] leading-none drop-shadow" title="각성 스킬">
                          ✨
                        </span>
                      )}

                      {/* Skill Icon */}
                      <span className="text-xl leading-none drop-shadow select-none">
                        {icon}
                      </span>

                      {/* Level badge */}
                      <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-amber-200 leading-none drop-shadow">
                        Lv.{level}
                      </span>

                      {/* Cooldown Dark Sweep Overlay */}
                      {onCooldown && (
                        <>
                          <div
                            aria-hidden
                            className="absolute inset-0 bg-black/75 transition-all"
                            style={{ clipPath: `inset(${(1 - frac) * 100}% 0 0 0)` }}
                          />
                          <span className="absolute text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                            {Math.ceil(left / 1000)}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right-Wall Anchored Toggle Tab Handle */}
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={isOpen}
          aria-label={isOpen ? '스킬 서랍 접기' : '스킬 서랍 열기'}
          className={`flex h-14 w-6 items-center justify-center rounded-l-xl border-y-3 border-l-3 border-[#2b1d14] bg-[#8b5a2b] text-amber-100 shadow-[-3px_2px_6px_rgba(0,0,0,0.5)] hover:bg-[#9d6832] active:translate-x-[1px] transition-colors cursor-pointer ${
            !isOpen ? 'animate-pulse' : ''
          }`}
          style={{
            boxShadow: 'inset 0 2px 0 0 #b3773b, inset 0 -2px 0 0 #5c3a1e, -3px 2px 6px rgba(0,0,0,0.5)',
          }}
          title={isOpen ? '스킬 서랍 접기' : '스킬 서랍 열기'}
        >
          <span className="text-xs font-black leading-none drop-shadow">
            {isOpen ? '▶' : '◀'}
          </span>
        </button>
      </div>
    </aside>
  );
}
