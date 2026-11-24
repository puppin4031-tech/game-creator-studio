import { useState } from 'react';
import { X, Check, Wand2, Plus, Sparkles, Trash2, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type ModularSkillsSaveState,
  type SkillCategory,
  BASE_ACTIONS,
  FUSED_SKILLS_MAP,
  getSkillDisplayName,
  getSkillDisplayIcon,
  type BaseActionId,
} from '@/data/modularSkills';

export interface SkillSettingsModalProps {
  open: boolean;
  onClose: () => void;
  modularSkills?: ModularSkillsSaveState;
  initialTargetSlot?: 0 | 1 | 2;
  onEquipSlot: (slotIndex: 0 | 1 | 2, skillId: string | null) => boolean;
  onOpenSkillBench?: () => void;
}

export default function SkillSettingsModal({
  open,
  onClose,
  modularSkills,
  initialTargetSlot = 0,
  onEquipSlot,
  onOpenSkillBench,
}: SkillSettingsModalProps) {
  const [targetSlot, setTargetSlot] = useState<0 | 1 | 2>(initialTargetSlot);
  const [categoryFilter, setCategoryFilter] = useState<'all' | SkillCategory>('all');

  if (!open) return null;

  const unlocked = modularSkills?.unlockedSkills ?? {};
  const currentSlots: [string | null, string | null, string | null] = modularSkills?.equippedSkillSlots ?? [
    modularSkills?.equippedSkillIds?.[0] ?? null,
    modularSkills?.equippedSkillIds?.[1] ?? null,
    modularSkills?.equippedSkillIds?.[2] ?? null,
  ];

  const currentTargetSkillId = currentSlots[targetSlot];
  const currentTargetSkill = currentTargetSkillId ? unlocked[currentTargetSkillId] : undefined;

  // Handles clicking a skill from the catalog
  const handleSelectSkill = (skillId: string) => {
    onEquipSlot(targetSlot, skillId);
  };

  // Handles unequipping the current target slot
  const handleUnequipTarget = () => {
    onEquipSlot(targetSlot, null);
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 p-2 sm:p-4 font-pixel select-none backdrop-blur-xs">
      <div className="relative flex h-[85dvh] w-full max-w-xl flex-col rounded-2xl border-4 border-[#2b1d14] bg-[#1c1917] text-[#e7e5e4] shadow-2xl overflow-hidden [image-rendering:pixelated]">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b-3 border-[#2b1d14] bg-[#8b5a2b] px-4 py-3 shadow-[inset_0_2px_0_0_#b3773b,inset_0_-2px_0_0_#5c3a1e]">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-amber-200">
                전투 스킬 슬롯 설정 (3슬롯 퀵바)
              </h2>
              <p className="text-[10px] text-amber-100/80">
                장착할 슬롯(1~3)을 선택한 뒤 아래 보유 기술을 터치하여 할당하세요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#2b1d14] bg-[#4a3f35] text-amber-200 hover:bg-[#594d42] active:scale-95 cursor-pointer"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Top Section: 3 Active Slots Display ── */}
        <div className="border-b-2 border-[#2b1d14] bg-[#292524] p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span>퀵바 슬롯 선택 (대상: {targetSlot + 1}번 슬롯)</span>
            {currentTargetSkillId && (
              <button
                type="button"
                onClick={handleUnequipTarget}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-300 hover:text-rose-200 underline cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                선택 슬롯 해제
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {([0, 1, 2] as const).map(index => {
              const skillId = currentSlots[index];
              const isSelected = targetSlot === index;
              const skill = skillId ? unlocked[skillId] : undefined;
              const name = skillId ? getSkillDisplayName(skillId, skill) : '비어 있음';
              const icon = skillId ? getSkillDisplayIcon(skillId) : '+';
              const level = skill?.masteryLevel ?? 1;
              const isAwakened = level >= 10 || !!skill?.isAwakened;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setTargetSlot(index)}
                  className={`relative flex flex-col items-center justify-between p-2.5 rounded-xl border-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-950/50 shadow-[0_0_12px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/60'
                      : 'border-[#44382c] bg-[#1c1917] hover:border-[#635240]'
                  }`}
                >
                  {/* Slot Number Badge */}
                  <div className="w-full flex items-center justify-between mb-1 leading-none">
                    <span className="text-[10px] font-mono font-bold text-amber-300">
                      슬롯 {index + 1}
                    </span>
                    {isSelected && (
                      <span className="rounded bg-amber-500 text-stone-950 px-1 py-0.2 text-[8px] font-black">
                        선택됨
                      </span>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-[#44382c] bg-[#292524] shadow-inner my-1">
                    <span className="text-2xl leading-none">{icon}</span>
                    {skillId && (
                      <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-black text-amber-200">
                        Lv.{level}
                      </span>
                    )}
                    {isAwakened && (
                      <span className="absolute top-0.5 right-0.5 text-[8px] text-amber-300">
                        ✨
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <span className={`block truncate w-full text-center text-[10px] font-bold mt-1 ${
                    skillId ? 'text-stone-100' : 'text-stone-500'
                  }`}>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bottom Section: Unlocked Skills Catalog ── */}
        <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 space-y-2.5">
          {/* Category Filter Tabs */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 flex-1">
              {(['all', 'attack', 'defense', 'buff'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-colors ${
                    categoryFilter === cat
                      ? 'bg-amber-500 text-stone-950 shadow'
                      : 'bg-[#292524] text-stone-300 hover:bg-[#3d3632]'
                  }`}
                >
                  {cat === 'all' ? '전체' : cat === 'attack' ? '⚔️ 공격' : cat === 'defense' ? '🛡️ 방어' : '✨ 보조'}
                </button>
              ))}
            </div>

            {onOpenSkillBench && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSkillBench();
                }}
                className="pixel-btn flex items-center gap-1 rounded-lg border border-amber-500/50 bg-[#8b5a2b] px-2.5 py-1.5 text-[10px] font-bold text-amber-100 hover:bg-[#9d6832]"
                title="스킬 융합대 및 12기운 창 열기"
              >
                <Wand2 className="h-3.5 w-3.5 text-amber-300" />
                <span>융합대 열기</span>
              </button>
            )}
          </div>

          {/* Skill Cards Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 pr-1">
            {Object.keys(unlocked)
              .filter(skillId => {
                if (categoryFilter === 'all') return true;
                const base = BASE_ACTIONS[skillId as BaseActionId];
                const fused = FUSED_SKILLS_MAP[skillId];
                const cat = base?.category ?? fused?.category;
                return cat === categoryFilter;
              })
              .map(skillId => {
                const skill = unlocked[skillId];
                const icon = getSkillDisplayIcon(skillId);
                const name = getSkillDisplayName(skillId, skill);
                const level = skill.masteryLevel ?? 1;
                const isAwakened = level >= 10 || !!skill.isAwakened;

                // Check which slot this skill is currently equipped in
                const equippedSlotIndex = currentSlots.findIndex(s => s === skillId);
                const isCurrentlyEquipped = equippedSlotIndex !== -1;
                const isEquippedInTarget = equippedSlotIndex === targetSlot;

                return (
                  <button
                    key={skillId}
                    type="button"
                    onClick={() => handleSelectSkill(skillId)}
                    className={`flex items-center gap-2 p-2 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isEquippedInTarget
                        ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                        : isCurrentlyEquipped
                        ? 'border-emerald-600/50 bg-[#242d24]'
                        : 'border-[#44382c] bg-[#292524] hover:border-amber-500/60 hover:bg-[#342f2c]'
                    }`}
                  >
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#44382c] bg-[#1c1917]">
                      <span className="text-xl leading-none">{icon}</span>
                      <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold text-amber-200">
                        Lv.{level}
                      </span>
                      {isAwakened && (
                        <span className="absolute top-0.5 right-0.5 text-[8px] text-amber-300">
                          ✨
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-xs text-stone-100">{name}</b>
                      {isCurrentlyEquipped ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-300">
                          <Check className="h-3 w-3" />
                          {equippedSlotIndex + 1}번 슬롯 장착중
                        </span>
                      ) : (
                        <span className="block text-[9px] text-amber-300/80 font-bold">
                          터치하여 {targetSlot + 1}번에 장착
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
