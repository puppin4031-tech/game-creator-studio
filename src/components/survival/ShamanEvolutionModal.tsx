import React, { useState } from 'react';
import {
  BASE_SHAMAN_CLASSES,
  SHAMAN_CLASSES,
  normalizeShamanClassId,
  type ShamanClassId,
  type ShamanClassConfig,
} from '@/lib/survival/shamanEvolution';
import type { OwnedPet } from '@/lib/survival/pets';
import type { Stack } from '@/lib/survival/types';
import { Skull } from 'lucide-react';
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
}

export const ShamanEvolutionModal: React.FC<EvolutionModalProps> = ({
  isOpen,
  open,
  onSelectClass,
  onSelectShamanClass,
  onClose,
  currentClass,
  pets = [],
  storage = [],
  backpack = [],
  onEvolvePetToSkullDragon,
}) => {
  const show = isOpen !== undefined ? isOpen : !!open;
  const canonicalCurrent = normalizeShamanClassId(currentClass);
  const [selected, setSelected] = useState<'ENGINEER' | 'MAGE' | 'NECROMANCER' | 'HONEST'>(
    canonicalCurrent ?? 'ENGINEER'
  );

  if (!show) return null;

  const current = BASE_SHAMAN_CLASSES[selected];
  const eligibleDragonPets = pets.filter(p => p.level >= 4 && p.speciesId !== 'skull_dragon');
  const existingDragons = pets.filter(p => p.speciesId === 'skull_dragon');

  const handleConfirm = () => {
    if (onSelectClass) {
      onSelectClass(selected);
    } else if (onSelectShamanClass) {
      onSelectShamanClass(selected);
    }
    toast.success(`⚡ [${current.name}]으로 전직을 완수했습니다! 마을의 고유 문명과 NPC가 활성화됩니다.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 font-pixel">
      <div className={`w-full max-w-md bg-gradient-to-b ${current.bgGradient} border-4 ${current.borderColor} p-4 text-white max-h-[90dvh] overflow-y-auto rounded shadow-2xl`}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-amber-300">⚡ 주술사 운명의 전직</h2>
            {canonicalCurrent && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/60 border border-stone-500 text-stone-300 font-mono">
                현재: {BASE_SHAMAN_CLASSES[canonicalCurrent]?.name}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-xs text-stone-400 hover:text-white px-1 py-0.5">
            [닫기]
          </button>
        </div>

        {/* 4대 전직 선택 탭 */}
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {(['ENGINEER', 'MAGE', 'NECROMANCER', 'HONEST'] as const).map((key) => {
            const item = BASE_SHAMAN_CLASSES[key];
            const active = selected === key;
            const isCurrent = canonicalCurrent === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`py-2 px-1 border-2 text-[11px] flex flex-col items-center transition-all ${
                  active ? `${item.borderColor} bg-black/70 text-white shadow-md` : 'border-stone-700 bg-black/30 text-stone-400 hover:bg-black/50'
                }`}
              >
                <span className="text-lg mb-0.5">{item.icon}</span>
                <span className="truncate w-full text-center font-bold">
                  {item.name.replace(' 주술사', '')}
                </span>
                {isCurrent && (
                  <span className="text-[9px] text-emerald-400 font-mono mt-0.5">
                    ● 활성
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 선택된 전직 상세 스펙 */}
        <div className="bg-black/50 border border-stone-700 p-3 mb-3 space-y-2 text-xs rounded-sm">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-bold ${current.themeColor}`}>
              {current.icon} {current.name}
            </span>
            <span className="text-[11px] text-stone-300">{current.title}</span>
          </div>

          <div className="text-[11px] text-stone-200 bg-white/5 p-2 border border-stone-700 rounded-xs">
            <div>
              • <b>전용 메커니즘:</b> {current.resourceIcon} {current.resourceName} → [{current.ultimateActionName}]
            </div>
            <div className="text-stone-400 mt-0.5">{current.ultimateDesc}</div>
          </div>

          <div className="text-[11px] text-amber-200 bg-amber-950/30 p-2 border border-amber-800/50 rounded-xs">
            <div>
              • <b>신규 NPC 합류:</b> {current.npc.name} ({current.npc.role})
            </div>
            <div className="text-stone-300 mt-0.5">
              "{current.npc.dialogue}" ({current.npc.tapRewardDesc})
            </div>
          </div>

          <div className="text-[11px] text-sky-200 bg-sky-950/30 p-2 border border-sky-800/50 rounded-xs flex items-center justify-between">
            <span>• <b>페이퍼돌 장식:</b> {current.headgearLabel}</span>
            <span className="text-stone-300 text-[10px]">{current.auraText}</span>
          </div>
        </div>

        {/* 3단계 해금 트리 미리보기 */}
        <div className="space-y-1.5 mb-4">
          <span className="text-[10px] font-bold text-stone-300 block mb-1">
            🏛️ 3단계 정밀 제조 & 해금 시설
          </span>
          {current.tiers.map((t) => (
            <div key={t.tier} className="bg-black/40 border border-stone-700 p-2 text-[11px] rounded-xs">
              <div className="flex justify-between font-bold text-stone-100">
                <span>Tier {t.tier}. {t.buildingName}</span>
                <span className={current.themeColor}>{t.recipeOrSkillName}</span>
              </div>
              <p className="text-stone-400 mt-0.5 leading-snug">{t.effectDesc}</p>
            </div>
          ))}
        </div>

        {/* 흑마술사 전용 스컬 드래곤 연성 섹션 */}
        {selected === 'NECROMANCER' && (
          <div className="bg-purple-950/40 border border-purple-600/60 p-2.5 mb-3 text-[11px] rounded space-y-1.5">
            <div className="flex items-center gap-1.5 text-purple-300 font-bold">
              <Skull className="h-4 w-4" />
              <span>흑마술사 암흑 제단: [스컬 드래곤] 각성</span>
            </div>
            {eligibleDragonPets.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {eligibleDragonPets.map(p => (
                  <button
                    key={p.uid}
                    type="button"
                    onClick={() => {
                      if (onEvolvePetToSkullDragon) {
                        const ok = onEvolvePetToSkullDragon(p.uid);
                        if (ok) toast.success(`💀 ${p.name}이(가) 스컬 드래곤으로 각성했습니다!`);
                      }
                    }}
                    className="px-2 py-1 bg-purple-900 border border-purple-500 text-purple-100 text-[10px] font-bold rounded"
                  >
                    {p.name} (Lv.{p.level}) 연성하기
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-purple-300/80 text-[10px]">
                * Lv.4 이상 공룡 펫을 보유하면 전설 스컬 드래곤으로 진화시킬 수 있습니다.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          className="w-full py-3 font-bold text-sm text-black bg-amber-400 hover:bg-amber-300 active:scale-[0.99] border-2 border-white shadow-lg cursor-pointer"
        >
          [{current.name}]로 영구 전직 확정 ▶
        </button>
      </div>
    </div>
  );
};

export default ShamanEvolutionModal;

/** 전직 후 상단에 띄우는 콤팩트 전용 자원 HUD 바 */
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
