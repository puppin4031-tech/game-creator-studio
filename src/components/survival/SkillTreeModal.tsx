import React, { useMemo, useState } from 'react';
import {
  type ModularSkillsSaveState,
  type PlayerModularSkill,
  type BaseActionId,
  type SkillCategory,
  BASE_ACTIONS,
  FUSED_SKILLS,
  FUSED_SKILLS_MAP,
  getFusionRecipe,
  expRequiredForMasteryLevel,
  defaultModularSkillsState,
  defaultPlayerSkill,
  getSkillDisplayName,
  getSkillDisplayIcon,
  getSkillCooldownMs,
  ATTACK_SPECIALIZATIONS,
  DEFENSE_SPECIALIZATIONS,
  BUFF_SPECIALIZATIONS,
} from '@/data/modularSkills';
import {
  type AffinityState,
  type SubEnergyId,
  SUB_ENERGIES,
  defaultAffinityState,
} from '@/data/affinitySystem';
import type { Stack } from '@/lib/survival/types';
import type { ShamanClassId } from '@/lib/survival/shamanEvolution';
import { X, Lock, Check, Sparkles, ChevronRight, Wand2, Shield, Swords, Flame, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SkillTreeModalProps {
  open: boolean;
  onClose: () => void;
  modularSkills?: ModularSkillsSaveState;
  affinityState?: AffinityState;
  onFuseModularSkill?: (baseActionId: BaseActionId, subEnergyId: SubEnergyId) => boolean;
  onEquipModularSkill?: (skillId: string, slotIndex: number) => boolean;
  onSpecializeModularSkill?: (skillId: string, specId: string) => boolean;
  onResetModularSpecialization?: (skillId: string) => boolean;
  onUseModularSkill?: (skillId: string) => boolean;

  // Legacy fallback props
  shamanClass?: ShamanClassId | null;
  playerLevel?: number;
  classSkills?: string[];
  ownedStacks?: Stack[];
  onLearnSkill?: (skillId: string) => boolean | void;
}

type TabType = 'affinity' | 'fusion' | 'my_skills';

const BASE_ACTION_LIST: { id: BaseActionId; name: string; icon: string; category: SkillCategory; desc: string }[] = [
  { id: 'stone_throw', name: '돌팔매질', icon: '🎯', category: 'attack', desc: '돌이나 탄환을 던지는 원거리 기본 공격' },
  { id: 'heavy_strike', name: '내려찍기', icon: '🔨', category: 'attack', desc: '무기나 주먹으로 강하게 타격하는 근접 공격' },
  { id: 'guard_brace', name: '웅크려 막기', icon: '🛡️', category: 'defense', desc: '신체를 웅크려 충격을 완화하는 방어 기술' },
  { id: 'primal_shout', name: '원시 함성', icon: '📢', category: 'buff', desc: '투지를 끌어올리고 동료를 고양하는 보조/소환 기술' },
];

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  open,
  onClose,
  modularSkills,
  affinityState,
  onFuseModularSkill,
  onEquipModularSkill,
  onSpecializeModularSkill,
  onResetModularSpecialization,
  onUseModularSkill,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('fusion');

  // Fusion bench state
  const [selectedBaseAction, setSelectedBaseAction] = useState<BaseActionId>('stone_throw');
  const [selectedSubEnergy, setSelectedSubEnergy] = useState<SubEnergyId>('fire');

  // My skills state
  const [categoryFilter, setCategoryFilter] = useState<'all' | SkillCategory>('all');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('stone_throw');

  const aff = affinityState ?? defaultAffinityState();
  const modState = modularSkills ?? defaultModularSkillsState();
  const unlocked = modState.unlockedSkills ?? {};
  const equipped = modState.equippedSkillIds ?? [];

  // Current fusion recipe preview
  const currentRecipe = useMemo(() => {
    return getFusionRecipe(selectedBaseAction, selectedSubEnergy);
  }, [selectedBaseAction, selectedSubEnergy]);

  const currentEnergyVal = aff.energies?.[selectedSubEnergy] ?? 0;
  const canFuse = currentEnergyVal >= 30 && !!currentRecipe && !unlocked[currentRecipe.id];

  // Selected skill in My Skills tab
  const activePlayerSkill = unlocked[selectedSkillId] ?? defaultPlayerSkill(selectedSkillId);
  const activeBaseAction = BASE_ACTIONS[selectedSkillId as BaseActionId];
  const activeFusedDef = FUSED_SKILLS_MAP[selectedSkillId];
  const activeCategory = activeBaseAction?.category ?? activeFusedDef?.category ?? 'attack';
  const activeDisplayName = getSkillDisplayName(selectedSkillId, activePlayerSkill);
  const activeDisplayIcon = getSkillDisplayIcon(selectedSkillId);
  const isEquipped = equipped.includes(selectedSkillId);

  const expRequired = expRequiredForMasteryLevel(activePlayerSkill.masteryLevel);
  const isAwakened = activePlayerSkill.masteryLevel >= 10 || !!activePlayerSkill.isAwakened;
  const isMaxMastery = activePlayerSkill.masteryLevel >= 20;

  // Specialization options for the selected skill
  const specOptions = useMemo(() => {
    if (activeCategory === 'attack') return ATTACK_SPECIALIZATIONS;
    if (activeCategory === 'defense') return DEFENSE_SPECIALIZATIONS;
    return BUFF_SPECIALIZATIONS;
  }, [activeCategory]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 font-pixel select-none backdrop-blur-xs">
      <div className="relative flex h-[90dvh] w-full max-w-2xl flex-col rounded-2xl border-4 border-[#2b1d14] bg-[#1c1917] text-[#e7e5e4] shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b-2 border-[#2b1d14] bg-[#292524] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-amber-300">
                선사시대 기운 & 모듈러 스킬 시스템
              </h2>
              <p className="text-[10px] text-stone-400">
                행동으로 기운을 쌓고, 기본 동작과 융합하여 각성된 전설 기술을 연마하세요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#44403c] bg-[#1c1917] text-stone-300 hover:bg-[#292524] active:scale-95"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3 Main Tabs: [기운 현황], [스킬 조합대], [내 스킬] */}
        <div className="flex border-b border-[#2b1d14] bg-[#1c1917]">
          <button
            type="button"
            onClick={() => setActiveTab('affinity')}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'affinity'
                ? 'border-amber-500 bg-[#292524] text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-[#221f1d]'
            }`}
          >
            기운 현황 (12기운)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fusion')}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'fusion'
                ? 'border-amber-500 bg-[#292524] text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-[#221f1d]'
            }`}
          >
            ✨ 스킬 조합대 (융합)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my_skills')}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'my_skills'
                ? 'border-amber-500 bg-[#292524] text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-[#221f1d]'
            }`}
          >
            내 스킬 및 숙련도 ({Object.keys(unlocked).length})
          </button>
        </div>

        {/* Tab 1: [기운 현황] */}
        {activeTab === 'affinity' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
            <div className="rounded-xl border border-[#44403c] bg-[#292524] p-3 text-xs leading-relaxed">
              <b className="text-amber-300">💡 4대 성향과 12대 서브 에너지</b>
              <p className="text-stone-300 text-[11px] mt-1">
                강제된 직업 선택 없이 실제 생존 행동(걷기, 채집, 사냥, 전투, 건축, 요리, 기도)을 통해 자연스럽게 기운을 수련합니다.
                서브 에너지가 <b>30</b> 이상 축적되면 해당 기운을 기본 동작에 융합할 수 있습니다.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(SUB_ENERGIES) as SubEnergyId[]).map(energyId => {
                const def = SUB_ENERGIES[energyId];
                const val = aff.energies?.[energyId] ?? 0;
                const pct = Math.min(100, Math.round((val / 100) * 100));
                const isReadyForFusion = val >= 30;

                return (
                  <div
                    key={energyId}
                    className={`rounded-xl border p-3 flex flex-col justify-between gap-2 bg-[#292524] ${
                      isReadyForFusion ? 'border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'border-[#44403c]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{def.icon}</span>
                        <div>
                          <b className="text-xs text-stone-100">{def.name}</b>
                          <span className="block text-[9px] text-stone-400">{def.affinityName} 성향</span>
                        </div>
                      </div>
                      <span className={`text-xs font-mono font-bold ${isReadyForFusion ? 'text-amber-300' : 'text-stone-400'}`}>
                        {val} / 100
                      </span>
                    </div>

                    <p className="text-[10px] text-stone-300 line-clamp-1">{def.howToEarn}</p>

                    {/* Progress Bar with 30-mark indicator */}
                    <div className="relative h-2.5 w-full rounded-full bg-[#1c1917] overflow-hidden border border-[#44403c]">
                      <div
                        className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-amber-600 to-amber-400"
                        style={{ width: `${pct}%` }}
                      />
                      {/* 30% indicator dot */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/70"
                        style={{ left: '30%' }}
                        title="30 기운: 스킬 조합 해금 기준"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: [스킬 조합대] */}
        {activeTab === 'fusion' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="rounded-xl border border-[#44403c] bg-[#292524] p-3 text-xs">
                <b className="text-amber-300">🛠️ 원시 스킬 융합대 (Modular Fusion Bench)</b>
                <p className="text-[11px] text-stone-300 mt-1">
                  <b>[기본 동작]</b> 1개와 <b>[해금된 기운(≥30)]</b> 1개를 결합하여 강력한 모듈러 스킬을 창조합니다.
                </p>
              </div>

              {/* Slot 1: Base Action Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-300">
                  1단계: 기본 동작 선택 (Base Action)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BASE_ACTION_LIST.map(action => {
                    const isSelected = selectedBaseAction === action.id;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => setSelectedBaseAction(action.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                            : 'border-[#44403c] bg-[#292524] hover:bg-[#342f2c]'
                        }`}
                      >
                        <span className="text-2xl mb-1">{action.icon}</span>
                        <b className="text-xs text-stone-100">{action.name}</b>
                        <span className="text-[9px] text-stone-400 mt-0.5">{action.category}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slot 2: Sub-Energy Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-300 flex items-center justify-between">
                  <span>2단계: 주입할 기운 선택 (Sub-Energy ≥ 30 필요)</span>
                  <span className="text-[10px] text-amber-300 font-mono">
                    현재 선택: {SUB_ENERGIES[selectedSubEnergy]?.name} ({currentEnergyVal} 기운)
                  </span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(Object.keys(SUB_ENERGIES) as SubEnergyId[]).map(energyId => {
                    const def = SUB_ENERGIES[energyId];
                    const val = aff.energies?.[energyId] ?? 0;
                    const isEnough = val >= 30;
                    const isSelected = selectedSubEnergy === energyId;

                    return (
                      <button
                        key={energyId}
                        type="button"
                        onClick={() => setSelectedSubEnergy(energyId)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                            : isEnough
                            ? 'border-[#44403c] bg-[#292524] hover:bg-[#342f2c]'
                            : 'border-[#332f2c] bg-[#1c1917] opacity-60'
                        }`}
                      >
                        <span className="text-lg">{def.icon}</span>
                        <div className="min-w-0 flex-1">
                          <b className="block truncate text-[11px] text-stone-200">{def.name}</b>
                          <span className={`text-[9px] font-mono ${isEnough ? 'text-amber-300' : 'text-stone-500'}`}>
                            {val}/30
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Fusion Result Preview Card */}
            {currentRecipe && (
              <div className="rounded-xl border-2 border-amber-500/70 bg-[#292524] p-3.5 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl p-1.5 rounded-xl border border-amber-500/40 bg-[#1c1917]">
                      {currentRecipe.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-sm font-bold text-amber-200">{currentRecipe.nameStage1}</b>
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                          {currentRecipe.category === 'attack' ? '공격' : currentRecipe.category === 'defense' ? '방어' : '보조/소환'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {selectedBaseAction} + {selectedSubEnergy}
                      </span>
                    </div>
                  </div>

                  {unlocked[currentRecipe.id] && (
                    <span className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                      <Check className="h-3 w-3" /> 이미 해금됨
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg border border-[#44403c] bg-[#1c1917] p-2">
                    <b className="text-stone-300 block mb-0.5">초기 단계 (Lv.1~9)</b>
                    <p className="text-stone-400 text-[10px] leading-relaxed">
                      {currentRecipe.descStage1}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-500/30 bg-[#1c1917] p-2">
                    <b className="text-amber-300 block mb-0.5">각성 단계 (Lv.10+): {currentRecipe.nameStage2}</b>
                    <p className="text-stone-400 text-[10px] leading-relaxed">
                      {currentRecipe.descStage2}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (onFuseModularSkill && canFuse) {
                      onFuseModularSkill(selectedBaseAction, selectedSubEnergy);
                    }
                  }}
                  disabled={!canFuse}
                  className="w-full min-h-11 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-900 font-extrabold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50"
                >
                  <Wand2 className="h-4 w-4 mr-1.5" />
                  {unlocked[currentRecipe.id]
                    ? '이미 해금된 스킬입니다 (내 스킬 탭에서 확인)'
                    : currentEnergyVal < 30
                    ? `기운 부족 (${currentEnergyVal}/30)`
                    : '✨ 기운 주입 및 신규 스킬 창조 (조합하기)'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: [내 스킬] */}
        {activeTab === 'my_skills' && (
          <div className="flex-1 overflow-hidden p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
            {/* Left Column: Skill Grid with Category Filter */}
            <div className="flex-1 flex flex-col min-w-0 border-b sm:border-b-0 sm:border-r border-[#2b1d14] pr-0 sm:pr-3 pb-3 sm:pb-0">
              {/* Category Filter Tabs */}
              <div className="flex gap-1 mb-2.5">
                {(['all', 'attack', 'defense', 'buff'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                      categoryFilter === cat
                        ? 'bg-amber-500 text-stone-900'
                        : 'bg-[#292524] text-stone-300 hover:bg-[#342f2c]'
                    }`}
                  >
                    {cat === 'all' ? '전체' : cat === 'attack' ? '⚔️ 공격' : cat === 'defense' ? '🛡️ 방어' : '✨ 보조'}
                  </button>
                ))}
              </div>

              {/* Icon Grid */}
              <div className="flex-1 overflow-y-auto grid grid-cols-4 sm:grid-cols-4 gap-2 p-1">
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
                    const isSelected = selectedSkillId === skillId;
                    const isEquip = equipped.includes(skillId);
                    const isAwak = skill.masteryLevel >= 10 || !!skill.isAwakened;
                    const icon = getSkillDisplayIcon(skillId);
                    const name = getSkillDisplayName(skillId, skill);

                    return (
                      <button
                        key={skillId}
                        type="button"
                        onClick={() => setSelectedSkillId(skillId)}
                        className={`relative flex h-14 w-full flex-col items-center justify-center rounded-xl border p-1 text-center transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-950/50 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                            : 'border-[#44403c] bg-[#292524] hover:bg-[#342f2c]'
                        }`}
                      >
                        <span className="text-xl leading-none">{icon}</span>
                        <span className="truncate w-full text-[9px] font-bold text-stone-200 mt-1">
                          {name}
                        </span>

                        {/* Level badge */}
                        <span className="absolute top-1 left-1 text-[8px] font-mono font-bold text-amber-300 leading-none">
                          Lv.{skill.masteryLevel}
                        </span>

                        {/* Equipped badge */}
                        {isEquip && (
                          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-400" title="퀵바 장착 중" />
                        )}

                        {/* Awakening star */}
                        {isAwak && (
                          <span className="absolute bottom-1 right-1 text-[8px] leading-none text-amber-300">
                            ✨
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Right Column: Selected Skill Details & Specialization */}
            <div className="w-full sm:w-72 flex flex-col justify-between overflow-y-auto space-y-3">
              <div className="space-y-3">
                <div className="rounded-xl border border-[#44403c] bg-[#292524] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{activeDisplayIcon}</span>
                      <div>
                        <b className="text-xs text-amber-200">{activeDisplayName}</b>
                        <span className="block text-[9px] text-stone-400">
                          {activeCategory === 'attack' ? '공격 스킬' : activeCategory === 'defense' ? '방어 스킬' : '보조/소환 스킬'}
                        </span>
                      </div>
                    </div>
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-mono font-bold text-amber-300">
                      Lv.{activePlayerSkill.masteryLevel}
                    </span>
                  </div>

                  {/* Mastery EXP Bar */}
                  <div className="space-y-0.5 pt-1">
                    <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                      <span>숙련도 경험치 (전투 시 +1)</span>
                      <span>
                        {isMaxMastery ? 'MAX' : `${activePlayerSkill.masteryExp} / ${expRequired}`}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#1c1917] overflow-hidden border border-[#44403c]">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300"
                        style={{
                          width: `${isMaxMastery ? 100 : Math.min(100, (activePlayerSkill.masteryExp / expRequired) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[10px] text-stone-300 leading-relaxed pt-1">
                    {isAwakened
                      ? activeFusedDef?.descStage2 ?? activeBaseAction?.desc
                      : activeFusedDef?.descStage1 ?? activeBaseAction?.desc}
                  </p>
                </div>

                {/* Lv.20 1-of-3 Specialization Selector */}
                <div className="rounded-xl border border-amber-500/40 bg-[#292524] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <b className="text-xs text-amber-300 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> Lv.20 마스터 특화 (3중 택1)
                    </b>
                    {activePlayerSkill.chosenSpecialization && (
                      <button
                        type="button"
                        onClick={() => onResetModularSpecialization?.(selectedSkillId)}
                        className="text-[9px] text-rose-300 hover:text-rose-200 underline flex items-center gap-0.5 cursor-pointer"
                        title="거석 성소 또는 본진에서 석영/옥 1개로 초기화"
                      >
                        <RotateCcw className="h-2.5 w-2.5" /> 특화 초기화
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {specOptions.map(opt => {
                      const isChosen = activePlayerSkill.chosenSpecialization === opt.id;
                      const hasChosenAny = !!activePlayerSkill.chosenSpecialization;
                      const canPick = isMaxMastery && !hasChosenAny;

                      return (
                        <div
                          key={opt.id}
                          className={`rounded-lg border p-2 text-left transition-all ${
                            isChosen
                              ? 'border-amber-400 bg-amber-950/60 shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                              : 'border-[#44403c] bg-[#1c1917]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-bold text-stone-200">
                              {opt.icon} {opt.name}
                            </span>
                            {isChosen ? (
                              <span className="text-[9px] font-bold text-amber-300">선택됨 (활성)</span>
                            ) : canPick ? (
                              <button
                                type="button"
                                onClick={() => onSpecializeModularSkill?.(selectedSkillId, opt.id)}
                                className="rounded bg-amber-600 px-2 py-0.5 text-[9px] font-bold text-stone-900 hover:bg-amber-500 active:scale-95"
                              >
                                특화 선택
                              </button>
                            ) : null}
                          </div>
                          <p className="text-[9px] text-stone-400 leading-tight">{opt.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Equip / Unequip Action */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant={isEquipped ? 'secondary' : 'default'}
                  onClick={() => onEquipModularSkill?.(selectedSkillId, 0)}
                  className={`w-full min-h-10 text-xs font-bold shadow ${
                    isEquipped ? 'bg-stone-700 text-stone-200 hover:bg-stone-600' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isEquipped ? '✓ 퀵바에서 장착 해제' : '⚡ 전투 퀵바에 장착 (최대 4개)'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillTreeModal;
