import React, { useMemo, useState } from 'react';
import {
  CLASS_SKILL_TREES,
  ALL_CLASS_SKILL_NODES,
  checkSkillUnlockRequirements,
  type ClassSkillNode,
  type ShamanClassType,
} from '@/data/classSkillTrees';
import { ITEMS } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';
import type { ShamanClassId } from '@/lib/survival/shamanEvolution';
import { bundledSpriteUrl } from '@/hooks/useItemCatalog';
import { X, Lock, Check, Sparkles, ChevronRight, AlertCircle, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SkillTreeModalProps {
  open: boolean;
  onClose: () => void;
  shamanClass?: ShamanClassId | null;
  playerLevel: number;
  classSkills?: string[];
  ownedStacks: Stack[];
  onLearnSkill: (skillId: string) => boolean | void;
}

function normalizeShamanClass(raw?: string | null): ShamanClassType {
  if (!raw) return 'ENGINEER';
  const upper = raw.toUpperCase();
  if (upper === 'ENGINEER') return 'ENGINEER';
  if (upper === 'MAGE') return 'MAGE';
  if (upper === 'NECROMANCER' || upper === 'WARLOCK') return 'NECROMANCER';
  if (upper === 'HONEST' || upper === 'ORTHODOX') return 'HONEST';
  return 'ENGINEER';
}

const CLASS_TABS: { id: ShamanClassType; label: string; icon: string; color: string }[] = [
  { id: 'ENGINEER', label: '공학 주술사', icon: '🔧', color: 'text-amber-400' },
  { id: 'MAGE', label: '마법술사', icon: '🔮', color: 'text-cyan-400' },
  { id: 'NECROMANCER', label: '흑마술사', icon: '💀', color: 'text-purple-400' },
  { id: 'HONEST', label: '정직한 주술사', icon: '🌿', color: 'text-emerald-400' },
];

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  open,
  onClose,
  shamanClass,
  playerLevel,
  classSkills = [],
  ownedStacks,
  onLearnSkill,
}) => {
  const activeUserClass = useMemo(() => {
    if (!shamanClass || shamanClass === 'NONE') return null;
    return normalizeShamanClass(shamanClass);
  }, [shamanClass]);

  const [selectedClass, setSelectedClass] = useState<ShamanClassType>(() => {
    return activeUserClass ?? 'ENGINEER';
  });

  const treeData = CLASS_SKILL_TREES[selectedClass];

  const [selectedSkillId, setSelectedSkillId] = useState<string>(() => {
    return treeData.branch1.skills[0]?.id ?? 'wooden_sled';
  });

  // Keep selectedSkill valid when switching classes
  const currentSkillNode: ClassSkillNode = useMemo(() => {
    if (ALL_CLASS_SKILL_NODES[selectedSkillId] && ALL_CLASS_SKILL_NODES[selectedSkillId].classId === selectedClass) {
      return ALL_CLASS_SKILL_NODES[selectedSkillId];
    }
    return treeData.branch1.skills[0];
  }, [selectedSkillId, selectedClass, treeData]);

  const skillStatus = useMemo(() => {
    return checkSkillUnlockRequirements(currentSkillNode, playerLevel, classSkills, ownedStacks);
  }, [currentSkillNode, playerLevel, classSkills, ownedStacks]);

  if (!open) return null;

  const handleSelectSkill = (node: ClassSkillNode) => {
    setSelectedSkillId(node.id);
  };

  const handleLearnClick = () => {
    if (skillStatus.isUnlockable) {
      onLearnSkill(currentSkillNode.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in-20">
      <div className="relative flex flex-col h-[92vh] max-h-[820px] w-full max-w-lg rounded-lg border-2 border-amber-900/60 bg-stone-950/95 text-stone-100 shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900/80 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div>
              <h2 className="text-sm font-bold text-amber-200 tracking-wide flex items-center gap-1.5">
                4대 주술사 심화 스킬트리
                {activeUserClass && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-normal">
                    내 클래스: {CLASS_SKILL_TREES[activeUserClass].className}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-stone-400">
                GPS 제약 돌파 & 클래스 고유 특화 테크
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Class Selection Tabs */}
        <div className="grid grid-cols-4 gap-1 border-b border-stone-800 bg-stone-950 p-1.5">
          {CLASS_TABS.map((tab) => {
            const isSelected = selectedClass === tab.id;
            const isMyClass = activeUserClass === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedClass(tab.id);
                  const firstSkill = CLASS_SKILL_TREES[tab.id].branch1.skills[0];
                  if (firstSkill) setSelectedSkillId(firstSkill.id);
                }}
                className={`relative flex flex-col items-center justify-center rounded py-1.5 px-1 text-center transition-all ${
                  isSelected
                    ? 'bg-stone-800 text-stone-100 font-bold border border-amber-600/60 shadow-inner'
                    : 'bg-stone-900/50 text-stone-400 hover:bg-stone-850 hover:text-stone-300'
                }`}
              >
                <span className="text-base leading-none mb-0.5">{tab.icon}</span>
                <span className={`text-[11px] leading-tight truncate w-full ${isSelected ? tab.color : ''}`}>
                  {tab.label}
                </span>
                {isMyClass && (
                  <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tree Container (Compact 2-Branch Layout) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Branch 1 */}
            <div className="flex flex-col items-center rounded-lg border border-stone-800/80 bg-stone-900/40 p-2.5">
              <div className="mb-2 text-center w-full pb-1 border-b border-stone-800">
                <span className="text-[11px] font-bold text-amber-300 truncate block">
                  {treeData.branch1.name}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                {treeData.branch1.skills.map((node, idx) => {
                  const check = checkSkillUnlockRequirements(node, playerLevel, classSkills, ownedStacks);
                  const isSelected = selectedSkillId === node.id;
                  const isLearned = check.isLearned;
                  const isUnlockable = check.isUnlockable;
                  const isLocked = !isLearned && !isUnlockable;

                  return (
                    <React.Fragment key={node.id}>
                      {idx > 0 && (
                        <div className="flex justify-center -my-1 text-stone-600">
                          <ArrowDown className={`h-3.5 w-3.5 ${classSkills.includes(treeData.branch1.skills[idx - 1].id) ? 'text-amber-400/80' : 'text-stone-700'}`} />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSelectSkill(node)}
                        className={`relative group flex flex-col items-center justify-center w-full max-w-[150px] p-2 rounded-md transition-all border text-center ${
                          isSelected
                            ? 'ring-2 ring-amber-400 border-amber-300 bg-stone-800 shadow-md'
                            : isLearned
                            ? 'border-emerald-500/50 bg-emerald-950/20 hover:bg-emerald-950/40 text-stone-200'
                            : isUnlockable
                            ? 'border-amber-500/80 bg-amber-950/30 hover:bg-amber-950/50 animate-pulse text-stone-200'
                            : 'border-stone-800 bg-stone-950/60 opacity-60 text-stone-400 hover:opacity-80'
                        }`}
                      >
                        {/* Status Badges */}
                        {isLearned && (
                          <div className="absolute -top-1.5 -right-1.5 rounded-full bg-emerald-500 p-0.5 text-black shadow">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                        {isUnlockable && (
                          <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 border border-stone-950 shadow animate-ping" />
                        )}
                        {isLocked && (
                          <div className="absolute top-1 right-1 text-stone-500">
                            <Lock className="h-3 w-3" />
                          </div>
                        )}

                        <span className="text-2xl filter drop-shadow mb-1">{node.icon}</span>
                        <span className="text-[11px] font-medium leading-snug line-clamp-1">
                          {node.name}
                        </span>
                        <span className="text-[9px] text-stone-400 mt-0.5">
                          T{node.tier} · Lv.{node.reqLevel}
                        </span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Branch 2 */}
            <div className="flex flex-col items-center rounded-lg border border-stone-800/80 bg-stone-900/40 p-2.5">
              <div className="mb-2 text-center w-full pb-1 border-b border-stone-800">
                <span className="text-[11px] font-bold text-cyan-300 truncate block">
                  {treeData.branch2.name}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 w-full">
                {treeData.branch2.skills.map((node, idx) => {
                  const check = checkSkillUnlockRequirements(node, playerLevel, classSkills, ownedStacks);
                  const isSelected = selectedSkillId === node.id;
                  const isLearned = check.isLearned;
                  const isUnlockable = check.isUnlockable;
                  const isLocked = !isLearned && !isUnlockable;

                  return (
                    <React.Fragment key={node.id}>
                      {idx > 0 && (
                        <div className="flex justify-center -my-1 text-stone-600">
                          <ArrowDown className={`h-3.5 w-3.5 ${classSkills.includes(treeData.branch2.skills[idx - 1].id) ? 'text-cyan-400/80' : 'text-stone-700'}`} />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSelectSkill(node)}
                        className={`relative group flex flex-col items-center justify-center w-full max-w-[150px] p-2 rounded-md transition-all border text-center ${
                          isSelected
                            ? 'ring-2 ring-cyan-400 border-cyan-300 bg-stone-800 shadow-md'
                            : isLearned
                            ? 'border-emerald-500/50 bg-emerald-950/20 hover:bg-emerald-950/40 text-stone-200'
                            : isUnlockable
                            ? 'border-cyan-500/80 bg-cyan-950/30 hover:bg-cyan-950/50 animate-pulse text-stone-200'
                            : 'border-stone-800 bg-stone-950/60 opacity-60 text-stone-400 hover:opacity-80'
                        }`}
                      >
                        {/* Status Badges */}
                        {isLearned && (
                          <div className="absolute -top-1.5 -right-1.5 rounded-full bg-emerald-500 p-0.5 text-black shadow">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                        {isUnlockable && (
                          <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-cyan-400 border border-stone-950 shadow animate-ping" />
                        )}
                        {isLocked && (
                          <div className="absolute top-1 right-1 text-stone-500">
                            <Lock className="h-3 w-3" />
                          </div>
                        )}

                        <span className="text-2xl filter drop-shadow mb-1">{node.icon}</span>
                        <span className="text-[11px] font-medium leading-snug line-clamp-1">
                          {node.name}
                        </span>
                        <span className="text-[9px] text-stone-400 mt-0.5">
                          T{node.tier} · Lv.{node.reqLevel}
                        </span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Inspector Panel */}
        <div className="border-t-2 border-stone-800 bg-stone-900/95 p-3 flex flex-col gap-2.5 shadow-lg">
          {/* Skill Title & Desc */}
          <div className="flex items-start gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-600/50 bg-stone-950 text-2xl shadow-inner">
              {currentSkillNode.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-stone-100 text-xs">
                  {currentSkillNode.name}
                </span>
                <span className="rounded bg-amber-950/80 px-1.5 py-0.2 text-[10px] text-amber-300 border border-amber-800/40">
                  Tier {currentSkillNode.tier}
                </span>
                <span className="text-[10px] text-stone-400">
                  [{currentSkillNode.branchName}]
                </span>
              </div>
              <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
                {currentSkillNode.desc}
              </p>
            </div>
          </div>

          {/* Requirements & Costs */}
          <div className="rounded-md border border-stone-800 bg-stone-950/70 p-2 text-[11px] space-y-1.5">
            <div className="flex items-center gap-3 text-stone-400 flex-wrap">
              <span className={`flex items-center gap-1 ${playerLevel >= currentSkillNode.reqLevel ? 'text-emerald-400' : 'text-rose-400'}`}>
                {playerLevel >= currentSkillNode.reqLevel ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                족장 Lv.{currentSkillNode.reqLevel} (현재 {playerLevel})
              </span>
              {currentSkillNode.reqSkillId && (
                <span className={`flex items-center gap-1 ${classSkills.includes(currentSkillNode.reqSkillId) ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {classSkills.includes(currentSkillNode.reqSkillId) ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  선행: {ALL_CLASS_SKILL_NODES[currentSkillNode.reqSkillId]?.name ?? currentSkillNode.reqSkillId}
                </span>
              )}
            </div>

            {/* Materials requirement */}
            {currentSkillNode.costItems.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5 border-t border-stone-850">
                <span className="text-stone-400 text-[10px] shrink-0">필요 재료:</span>
                {currentSkillNode.costItems.map((cost) => {
                  const owned = ownedStacks.find(s => s.itemId === cost.itemId)?.count ?? 0;
                  const isEnough = owned >= cost.count;
                  const it = ITEMS[cost.itemId];
                  const sprite = bundledSpriteUrl(it?.sprite);

                  return (
                    <span
                      key={cost.itemId}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border ${
                        isEnough
                          ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300'
                          : 'border-rose-900/60 bg-rose-950/30 text-rose-300'
                      }`}
                    >
                      {sprite ? (
                        <img src={sprite} alt="" className="h-3 w-3 object-contain pixelated" />
                      ) : null}
                      <span>{it?.name ?? cost.itemId}</span>
                      <span className="font-bold">
                        {owned}/{cost.count}
                      </span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Missing requirements alert if locked */}
          {!skillStatus.isLearned && !skillStatus.isUnlockable && skillStatus.missingRequirements.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 px-2 py-1 rounded">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{skillStatus.missingRequirements[0]}</span>
            </div>
          )}

          {/* Action Button */}
          {skillStatus.isLearned ? (
            <Button
              type="button"
              disabled
              className="w-full bg-emerald-900/50 text-emerald-300 border border-emerald-600/50 h-9 text-xs cursor-default"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" /> 이미 습득 완료된 기술입니다
            </Button>
          ) : skillStatus.isUnlockable ? (
            <Button
              type="button"
              onClick={handleLearnClick}
              className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold border border-amber-400 h-9 text-xs shadow-md transition-all active:scale-[0.98]"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> 기술 습득하기 (재료 소모)
            </Button>
          ) : (
            <Button
              type="button"
              disabled
              className="w-full bg-stone-850 text-stone-500 border border-stone-800 h-9 text-xs opacity-70"
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" /> 습득 불가 (선행 조건 미달성)
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};

export default SkillTreeModal;
