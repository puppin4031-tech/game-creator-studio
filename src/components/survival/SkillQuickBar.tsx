import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Wand2, Zap } from 'lucide-react';
import {
  type ModularSkillsSaveState,
  BASE_ACTIONS,
  FUSED_SKILLS_MAP,
  getSkillDisplayName,
  getSkillDisplayIcon,
  getSkillCooldownMs,
  type BaseActionId,
} from '@/data/modularSkills';
import { ACTIVE_SKILLS, type ActiveSkill } from '@/lib/survival/abilities';
import { skillCooldownMs, skillLevel } from '@/lib/survival/skillLevels';

export interface SkillQuickBarProps {
  modularSkills?: ModularSkillsSaveState;
  cooldowns?: Record<string, number>;
  ready: boolean;
  onUseModularSkill?: (skillId: string) => void;
  onOpenSkillModal?: () => void;

  // Legacy fallback props
  known?: string[];
  levels?: Record<string, number>;
  onUse?: (id: ActiveSkill) => void;
}

/** Right-edge thumb quick-bar for equipped modular skills with cooldown sweep & awakening badges. */
export function SkillQuickBar({
  modularSkills,
  cooldowns,
  ready,
  onUseModularSkill,
  onOpenSkillModal,
  known = [],
  levels,
  onUse,
}: SkillQuickBarProps) {
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  // Determine active skills to display: preference to modular skills equipped
  const equippedModularIds = modularSkills?.equippedSkillIds?.filter(id => !!modularSkills.unlockedSkills[id]) ?? [];
  const hasModularSkills = equippedModularIds.length > 0;

  // Legacy fallback
  const legacyIds = (Object.keys(ACTIVE_SKILLS) as ActiveSkill[]).filter(id => known.includes(id));
  if (!hasModularSkills && !legacyIds.length) return null;

  return (
    <div
      aria-label="전투 및 생존 스킬 퀵바"
      className="absolute right-2 top-[55%] z-25 -translate-y-1/2 flex flex-col items-center gap-1.5 font-pixel select-none"
    >
      {/* Fold / Unfold & Skill Window Open Button */}
      <div className="flex items-center gap-1">
        {onOpenSkillModal && (
          <button
            type="button"
            onClick={onOpenSkillModal}
            className="pixel-btn h-8 w-8 rounded-lg bg-[#2b1d14] border border-amber-500/50 text-amber-300 shadow flex items-center justify-center hover:bg-[#3d291c] active:scale-95"
            title="스킬 조합 및 기운 창 열기"
          >
            <Wand2 className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          aria-label={open ? '스킬 바 접기' : '스킬 바 펼치기'}
          onClick={() => setOpen(v => !v)}
          className="pixel-btn h-8 w-8 rounded-lg bg-[#2b1d14] border border-[#44382c] text-amber-100 shadow flex items-center justify-center hover:bg-[#3d291c] active:scale-95"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 text-primary" />}
        </button>
      </div>

      {open && hasModularSkills && (
        <div className="flex flex-col items-center gap-2">
          {equippedModularIds.map(skillId => {
            const playerSkill = modularSkills?.unlockedSkills[skillId];
            const baseAction = BASE_ACTIONS[skillId as BaseActionId];
            const fusedDef = FUSED_SKILLS_MAP[skillId];
            const cdTotal = getSkillCooldownMs(skillId, playerSkill);
            const left = Math.max(0, (cooldowns?.[skillId] ?? 0) - now);
            const frac = Math.min(1, left / cdTotal);
            const icon = getSkillDisplayIcon(skillId);
            const displayName = getSkillDisplayName(skillId, playerSkill);
            const level = playerSkill?.masteryLevel ?? 1;
            const isAwakened = level >= 10 || !!playerSkill?.isAwakened;
            const hasSpec = !!playerSkill?.chosenSpecialization;

            // Element color border
            const elemColor = fusedDef?.elementColor ?? '#f59e0b';

            return (
              <button
                key={skillId}
                type="button"
                disabled={!ready || left > 0}
                onClick={() => onUseModularSkill?.(skillId)}
                title={`${displayName} (Lv.${level})`}
                className={`relative flex h-12 w-12 flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-[#1c1917] shadow-lg transition-transform active:scale-95 disabled:opacity-75 ${
                  isAwakened ? 'border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'border-[#44382c]'
                }`}
                style={{ borderColor: isAwakened ? '#fbbf24' : elemColor }}
              >
                {/* Skill Icon */}
                <span className="text-xl leading-none drop-shadow select-none">
                  {icon}
                </span>

                {/* Level badge */}
                <span className="absolute bottom-0.5 right-1 text-[8px] font-black leading-none text-amber-200">
                  {level}
                </span>

                {/* Awakening Star / Crown badge */}
                {isAwakened && (
                  <span className="absolute top-0.5 left-0.5 text-[9px] leading-none" title="각성 상태">
                    ✨
                  </span>
                )}
                {hasSpec && (
                  <span className="absolute top-0.5 right-0.5 text-[9px] leading-none text-amber-300" title="궁극 특화 전직">
                    👑
                  </span>
                )}

                {/* Cooldown Sweep Overlay */}
                {left > 0 && (
                  <>
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-black/75"
                      style={{ clipPath: `inset(${(1 - frac) * 100}% 0 0 0)` }}
                    />
                    <span className="absolute text-xs font-black text-white drop-shadow">
                      {Math.ceil(left / 1000)}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Legacy Fallback for older saves without modular skills */}
      {open && !hasModularSkills && (
        <div className="flex flex-col items-center gap-1.5">
          {legacyIds.map(id => {
            const lv = skillLevel(levels, id);
            const cdTotal = skillCooldownMs(id, lv);
            const left = Math.max(0, (cooldowns?.[id] ?? 0) - now);
            const frac = Math.min(1, left / cdTotal);
            return (
              <button
                key={id}
                type="button"
                disabled={!ready || left > 0}
                onClick={() => onUse?.(id)}
                className="relative flex h-11 w-11 flex-col items-center justify-center overflow-hidden rounded-xl border border-primary/40 bg-card shadow disabled:opacity-75"
              >
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-[8px] font-bold text-amber-200">Lv.{lv}</span>
                {left > 0 && (
                  <>
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-black/70"
                      style={{ clipPath: `inset(${(1 - frac) * 100}% 0 0 0)` }}
                    />
                    <span className="absolute text-[10px] font-bold text-white">
                      {Math.ceil(left / 1000)}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
