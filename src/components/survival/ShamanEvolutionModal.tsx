import React, { useState } from 'react';
import {
  AFFINITIES,
  SUB_ENERGIES,
  defaultAffinityState,
  getShamanDialogueForAffinity,
  getAffinityPerks,
  type AffinityId,
  type SubEnergyId,
  type AffinityState,
} from '@/data/affinitySystem';
import {
  BASE_SHAMAN_CLASSES,
  SHAMAN_CLASSES,
  normalizeShamanClassId,
  type ShamanClassId,
} from '@/lib/survival/shamanEvolution';
import type { OwnedPet } from '@/lib/survival/pets';
import type { Stack } from '@/lib/survival/types';
import { Skull, Sparkles, Check, Lock, ChevronRight, Info } from 'lucide-react';
import { toast } from 'sonner';

export interface EvolutionModalProps {
  isOpen?: boolean;
  open?: boolean;
  onSelectClass?: (classId: Exclude<ShamanClassId, 'NONE'>) => void;
  onSelectShamanClass?: (classId: ShamanClassId) => boolean;
  onClose: () => void;
  currentClass?: ShamanClassId | null;
  pets?: OwnedPet[];
  storage?: Stack[];
  backpack?: Stack[];
  onEvolvePetToSkullDragon?: (petUid: string) => boolean;
  affinityState?: AffinityState;
}

export const ShamanEvolutionModal: React.FC<EvolutionModalProps> = ({
  isOpen,
  open,
  onClose,
  currentClass,
  pets = [],
  storage = [],
  backpack = [],
  onEvolvePetToSkullDragon,
  affinityState = defaultAffinityState(),
}) => {
  const show = isOpen !== undefined ? isOpen : !!open;

  // Determine initial selected tab: player's dominant affinity, or nature by default
  const dominant = affinityState.dominantAffinity ?? 'nature';
  const [selectedAffinity, setSelectedAffinity] = useState<AffinityId>(dominant);

  if (!show) return null;

  const currentMeta = AFFINITIES[selectedAffinity];
  const totalPoints = affinityState.totals[selectedAffinity] ?? 0;
  const perks = getAffinityPerks(affinityState.totals);

  const eligibleDragonPets = pets.filter(p => p.level >= 4 && p.speciesId !== 'skull_dragon');
  const boneCount = (storage.find(s => s.itemId === 'bone')?.count ?? 0) + (backpack.find(s => s.itemId === 'bone')?.count ?? 0);

  const getNextMilestoneGoal = (pts: number) => {
    if (pts < 30) return 30;
    if (pts < 100) return 100;
    if (pts < 250) return 250;
    return 250;
  };

  const nextGoal = getNextMilestoneGoal(totalPoints);
  const progressPct = Math.min(100, Math.round((totalPoints / nextGoal) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 font-pixel">
      <div className={`w-full max-w-lg bg-gradient-to-b ${currentMeta.bgGradient} border-4 ${currentMeta.borderColor} p-4 text-white max-h-[92dvh] overflow-y-auto rounded shadow-2xl space-y-3.5`}>
        {/* Header */}
        <div className="flex justify-between items-start border-b border-white/20 pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔮</span>
              <h2 className="text-base font-bold text-amber-300">
                영혼의 조화 · 4대 친화도 & 12원소 기운
              </h2>
            </div>
            <p className="text-[11px] text-stone-300 mt-0.5">
              단일 전직의 한계를 넘어 족장의 모든 행동(걷기, 채집, 제련, 전투, 치유)으로 4대 친화도를 자유롭게 수련합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-stone-400 hover:text-white px-2 py-1 bg-black/40 border border-stone-600 rounded cursor-pointer"
          >
            [닫기]
          </button>
        </div>

        {/* Shaman Insight Quote */}
        <div className="bg-black/60 border border-amber-600/60 p-2.5 rounded flex items-start gap-2.5 shadow-inner">
          <span className="text-2xl shrink-0 select-none">🧙‍♂️</span>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-amber-400 block mb-0.5">
              대제사장 샤먼의 영혼 감응 계시
            </span>
            <p className="text-xs text-stone-200 leading-snug italic">
              "{getShamanDialogueForAffinity(affinityState)}"
            </p>
          </div>
        </div>

        {/* 4대 친화도 카드 탭 */}
        <div className="grid grid-cols-4 gap-1.5">
          {(['nature', 'engineering', 'death', 'divinity'] as const).map((affKey) => {
            const aff = AFFINITIES[affKey];
            const pts = affinityState.totals[affKey] ?? 0;
            const isSelected = selectedAffinity === affKey;
            const isDominant = affinityState.dominantAffinity === affKey;

            return (
              <button
                key={affKey}
                type="button"
                onClick={() => setSelectedAffinity(affKey)}
                className={`py-2 px-1 border-2 text-[11px] flex flex-col items-center rounded transition-all cursor-pointer ${
                  isSelected
                    ? `${aff.borderColor} bg-black/80 text-white shadow-lg ring-1 ring-white/50`
                    : 'border-stone-700 bg-black/40 text-stone-400 hover:bg-black/60'
                }`}
              >
                <div className="relative">
                  <span className="text-xl mb-0.5">{aff.icon}</span>
                  {isDominant && (
                    <span className="absolute -top-1.5 -right-2 text-[9px] bg-amber-500 text-black px-1 rounded-full font-bold">
                      지배
                    </span>
                  )}
                </div>
                <span className="truncate w-full text-center font-bold text-xs mt-0.5">
                  {aff.name.split(' ')[0]}
                </span>
                <span className={`text-[11px] font-mono font-bold mt-0.5 ${aff.themeColor}`}>
                  {pts} pt
                </span>
              </button>
            );
          })}
        </div>

        {/* 선택된 친화도 요약 & 진척도 바 */}
        <div className="bg-black/55 border border-stone-700 p-3 rounded space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{currentMeta.icon}</span>
              <span className={`text-sm font-bold ${currentMeta.themeColor}`}>
                {currentMeta.name}
              </span>
              <span className="text-[11px] text-stone-300">({currentMeta.title})</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-amber-300 font-mono">
                {totalPoints} / {nextGoal} pt
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-stone-800 border border-stone-600 rounded overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                selectedAffinity === 'nature' ? 'bg-emerald-400' :
                selectedAffinity === 'engineering' ? 'bg-orange-400' :
                selectedAffinity === 'death' ? 'bg-purple-400' : 'bg-amber-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-300">
            <span>{currentMeta.desc}</span>
            <span className="font-bold shrink-0 ml-2">
              {totalPoints >= 30 ? (
                <span className="text-emerald-400">✨ 고유 오라 발현 중</span>
              ) : (
                <span className="text-stone-400">🔒 30pt 달성 시 오라 개방</span>
              )}
            </span>
          </div>
        </div>

        {/* 12원소 하위 기운 상세 카드 */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-stone-200 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>원소 기운 축적 현황 (행동 기반 성장)</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {currentMeta.subEnergies.map(subId => {
              const sub = SUB_ENERGIES[subId];
              const val = affinityState.energies[subId] ?? 0;

              return (
                <div
                  key={subId}
                  className="bg-black/50 border border-stone-700/80 p-2.5 rounded flex flex-col justify-between space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <span>{sub.icon}</span> {sub.name}
                    </span>
                    <span className={`text-xs font-mono font-bold ${currentMeta.themeColor}`}>
                      {val} pt
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-300 leading-snug">
                    {sub.desc}
                  </p>
                  <div className="text-[9px] text-amber-200/90 bg-white/5 p-1 rounded border border-white/10 mt-1">
                    <b>수련:</b> {sub.howToGain}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 단계별 특전 현황 (Milestones: 30 / 100 / 250) */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-stone-200">
            🏛️ 친화도 단계별 영구 특전 (Milestone Perks)
          </span>
          <div className="space-y-1.5">
            {currentMeta.milestones.map((m, idx) => {
              const achieved = totalPoints >= m.points;

              return (
                <div
                  key={m.points}
                  className={`p-2.5 rounded border text-xs flex items-center justify-between gap-2 ${
                    achieved
                      ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-100 shadow-sm'
                      : 'bg-black/40 border-stone-700 text-stone-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="shrink-0">
                      {achieved ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black font-bold text-[10px]">
                          ✓
                        </span>
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 text-stone-400 text-[10px]">
                          🔒
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span className="text-amber-300 font-mono">Tier {idx + 1} ({m.points}pt)</span>
                        <span>{m.title}</span>
                      </div>
                      <p className="text-[10px] text-stone-300 leading-snug mt-0.5">
                        {m.perk}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    achieved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-stone-800 text-stone-400'
                  }`}>
                    {achieved ? '달성 완료' : `${totalPoints}/${m.points}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 흑마술/심연 전용: 스컬 드래곤 암흑 의식 */}
        {selectedAffinity === 'death' && (
          <div className="bg-purple-950/50 border border-purple-500/80 p-3 rounded space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-purple-300">
                <Skull className="h-4 w-4" />
                <span>암흑 강령 제단: 전설 [스컬 드래곤] 각성</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                perks.canSkullDragon ? 'bg-purple-500/30 text-purple-200' : 'bg-black/60 text-stone-400'
              }`}>
                {perks.canSkullDragon ? '의식 해금됨' : `심연 250pt 필요 (${totalPoints}/250)`}
              </span>
            </div>

            <p className="text-[11px] text-stone-300">
              Lv.4 이상의 공룡 펫에게 공룡 뼈 5개를 바쳐 죽음을 초월한 불사의 [스컬 드래곤]으로 각성시킵니다.
            </p>

            {perks.canSkullDragon ? (
              eligibleDragonPets.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {eligibleDragonPets.map(p => (
                    <button
                      key={p.uid}
                      type="button"
                      disabled={boneCount < 5}
                      onClick={() => {
                        if (onEvolvePetToSkullDragon) {
                          const ok = onEvolvePetToSkullDragon(p.uid);
                          if (ok) toast.success(`💀 ${p.name}이(가) 스컬 드래곤으로 각성했습니다!`);
                        }
                      }}
                      className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow ${
                        boneCount >= 5
                          ? 'bg-purple-600 hover:bg-purple-500 text-white'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      <Skull className="h-3.5 w-3.5" />
                      <span>{p.name} (Lv.{p.level}) 각성 (뼈 5개 소모 · 보유: {boneCount})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-purple-300/80 text-[10px]">
                  * 현재 각성 가능한 Lv.4 이상의 공룡 펫이 없습니다. 펫을 합성하여 Lv.4를 달성하세요.
                </p>
              )
            ) : (
              <p className="text-stone-400 text-[10px]">
                * 심연·죽음 기운 250pt에 도달하면 암흑 제단 의식이 활성화됩니다.
              </p>
            )}
          </div>
        )}

        {/* Global Summary Status Pill */}
        <div className="bg-black/70 border border-stone-600 p-2.5 rounded text-[11px] text-stone-300 grid grid-cols-2 gap-2">
          <div>🚀 <b>GPS 이동 한도:</b> <span className="text-amber-300 font-mono">{perks.speedLimitKmh} km/h</span></div>
          <div>🌾 <b>채집 사거리:</b> <span className="text-emerald-300 font-mono">+{perks.extraReachM}m</span></div>
          <div>🌙 <b>야간/동굴 드랍:</b> <span className="text-purple-300 font-mono">+{perks.nightDropBonusPct}%</span></div>
          <div>🥚 <b>알 부화 거리:</b> <span className="text-amber-300 font-mono">-{perks.hatchDiscountPct}%</span></div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 font-bold text-xs text-black bg-amber-400 hover:bg-amber-300 active:scale-[0.99] border-2 border-white shadow-lg cursor-pointer rounded"
        >
          확인 및 수련 계속하기 ▶
        </button>
      </div>
    </div>
  );
};

export default ShamanEvolutionModal;

/** 전직/친화도 활성 시 상단에 띄우는 콤팩트 자원/기운 HUD 바 */
export const ShamanResourceHUD: React.FC<{
  shamanClass?: ShamanClassId | string | null;
  value?: number;
  max?: number;
  onTriggerUltimate?: () => void;
  className?: string;
}> = ({
  shamanClass,
  value = 100,
  max = 100,
  onTriggerUltimate,
  className = '',
}) => {
  const canonical = normalizeShamanClassId(shamanClass);
  if (!canonical) return null;
  const config = BASE_SHAMAN_CLASSES[canonical];
  const isReady = value >= config.ultimateCost;
  const percent = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 bg-black/85 border-2 ${config.borderColor} font-pixel text-xs text-white shadow-md rounded-xs ${className}`}>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-sm shrink-0">{config.resourceIcon}</span>
        <span className={`font-bold ${config.themeColor} shrink-0`}>{config.resourceName}</span>
        <div className="flex-1 h-2.5 bg-stone-800 border border-stone-600 overflow-hidden mx-1 rounded-xs">
          <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-[11px] text-white shrink-0 font-mono">{value}/{max}{config.resourceUnit}</span>
      </div>
      <button
        type="button"
        disabled={!isReady}
        onClick={onTriggerUltimate}
        className={`px-2 py-0.5 text-[11px] font-bold border transition-all ${
          isReady
            ? 'bg-amber-400 text-black border-white animate-pulse active:scale-95 cursor-pointer shadow'
            : 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
        }`}
      >
        {config.ultimateActionName}
      </button>
    </div>
  );
};
