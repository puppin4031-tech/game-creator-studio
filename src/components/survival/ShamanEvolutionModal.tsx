import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Crown,
  Flame,
  Hammer,
  HelpCircle,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';
import type { OwnedPet } from '@/lib/survival/pets';
import shamanImg from '@/assets/survival/npc-shaman.png';
import {
  BASE_SHAMAN_CLASSES,
  SHAMAN_CLASSES,
  normalizeShamanClassId,
  type ShamanClassId,
  type ShamanClassConfig,
} from '@/lib/survival/shamanEvolution';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  currentClass: ShamanClassId | null;
  pets?: OwnedPet[];
  storage: Stack[];
  backpack: Stack[];
  onSelectShamanClass: (classId: ShamanClassId) => boolean;
  onEvolvePetToSkullDragon?: (petUid: string) => boolean;
}

export default function ShamanEvolutionModal({
  open,
  onClose,
  currentClass,
  pets = [],
  storage,
  backpack,
  onSelectShamanClass,
  onEvolvePetToSkullDragon,
}: Props) {
  const canonicalCurrent = normalizeShamanClassId(currentClass);
  const [selectedCanonical, setSelectedCanonical] = useState<'ENGINEER' | 'MAGE' | 'NECROMANCER' | 'HONEST'>(
    canonicalCurrent ?? 'ENGINEER'
  );
  const [confirmingClassId, setConfirmingClassId] = useState<ShamanClassId | null>(null);

  if (!open) return null;

  const currentMeta = canonicalCurrent ? BASE_SHAMAN_CLASSES[canonicalCurrent] : null;
  const viewingMeta = BASE_SHAMAN_CLASSES[selectedCanonical];

  // Eligible pets for Warlock's Skull Dragon dark ritual (level >= 4)
  const eligibleDragonPets = pets.filter(p => p.level >= 4 && p.speciesId !== 'skull_dragon');
  const existingDragons = pets.filter(p => p.speciesId === 'skull_dragon');
  const boneCount =
    (storage.find(s => s.itemId === 'bone')?.count ?? 0) +
    (backpack.find(s => s.itemId === 'bone')?.count ?? 0);

  const handleChooseClass = (classId: ShamanClassId) => {
    if (canonicalCurrent === normalizeShamanClassId(classId)) return;
    setConfirmingClassId(classId);
  };

  const handleConfirmEvolution = () => {
    if (!confirmingClassId) return;
    const ok = onSelectShamanClass(confirmingClassId);
    if (ok) {
      setConfirmingClassId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="4대 주술사 전직 의식"
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <Sparkles className="h-5 w-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">
                4대 주술사 전직 의식 & 고유 문명 시스템
              </h1>
              {canonicalCurrent ? (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentMeta?.borderColor} ${currentMeta?.themeColor} bg-background`}>
                  현재 전직: {currentMeta?.name}
                </span>
              ) : (
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/40 animate-pulse">
                  전직 선택 대기 중
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              전직 시 고유 자원 메커니즘·전용 NPC·3단계 정밀 제조 트리 및 마을 환경이 변화합니다
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
          aria-label="닫기"
        >
          <X className="!h-4 !w-4" />
        </button>
      </div>

      {/* 4 Class Cards Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b-2 border-border bg-card/60 p-2 gap-2">
        {(Object.values(BASE_SHAMAN_CLASSES) as ShamanClassConfig[]).map(cls => {
          const isSelected = selectedCanonical === cls.canonicalId;
          const isCurrentActive = canonicalCurrent === cls.canonicalId;

          return (
            <button
              key={cls.canonicalId}
              type="button"
              onClick={() => setSelectedCanonical(cls.canonicalId)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                isSelected
                  ? `ring-2 ring-primary ${cls.borderColor} bg-card shadow-md`
                  : 'border-border/60 bg-muted/20 hover:bg-muted/40 text-muted-foreground'
              }`}
            >
              <span className="text-2xl mb-1">{cls.icon}</span>
              <div className="flex items-center gap-1 font-bold text-xs text-foreground">
                <span>{cls.name}</span>
                {isCurrentActive && (
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                )}
              </div>
              <span className="text-[10px] opacity-80 mt-0.5 font-medium">{cls.title}</span>
              {isCurrentActive && (
                <span className="mt-1 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                  활성 중
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Details Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Selected Class Highlight Card */}
        <div
          className={`rounded-lg border-2 ${viewingMeta.borderColor} bg-gradient-to-br ${viewingMeta.bgGradient} p-4 space-y-3 shadow-lg`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 pb-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/80 border-2 border-current text-2xl shadow">
                {viewingMeta.icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    {viewingMeta.name}
                  </h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded bg-background/80 border ${viewingMeta.borderColor} font-bold ${viewingMeta.themeColor}`}>
                    {viewingMeta.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground italic mt-0.5">
                  {viewingMeta.motto}
                </p>
              </div>
            </div>

            {canonicalCurrent === viewingMeta.canonicalId ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 shrink-0">
                <Check className="h-4 w-4" />
                <span>현재 선택된 전직</span>
              </span>
            ) : (
              <Button
                type="button"
                onClick={() => handleChooseClass(viewingMeta.canonicalId)}
                className="pixel-btn h-9 px-4 bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 shrink-0 shadow"
              >
                <span>{canonicalCurrent ? '이 전직으로 변경하기' : '이 전직으로 진화하기'}</span>
              </Button>
            )}
          </div>

          <p className="text-xs leading-relaxed text-foreground/90">
            {viewingMeta.desc}
          </p>

          {/* 1. 고유 메커니즘 자원 & 궁극기 박스 */}
          <div className="rounded-md border border-border/70 bg-background/80 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                <span className="text-base">{viewingMeta.resourceIcon}</span>
                <span>고유 전용 자원: <b className={viewingMeta.themeColor}>{viewingMeta.resourceName} ({viewingMeta.resourceUnit})</b></span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 border border-primary/30 font-bold text-primary">
                궁극기: {viewingMeta.ultimateActionName} (소모: {viewingMeta.ultimateCost}{viewingMeta.resourceUnit})
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {viewingMeta.ultimateDesc}
            </p>
          </div>

          {/* 2. 전용 NPC & 페이퍼돌 레이어 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 전용 NPC */}
            <div className="rounded-md border border-border/70 bg-background/70 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                  <span>🧑‍🌾 전용 마을 NPC:</span>
                  <b className="text-foreground">{viewingMeta.npc.name}</b>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {viewingMeta.npc.role}
                </span>
              </div>
              <p className="text-[11px] italic text-foreground/80 bg-muted/40 p-1.5 rounded">
                "{viewingMeta.npc.dialogue}"
              </p>
              <p className="text-[10px] font-bold text-emerald-400">
                ✨ {viewingMeta.npc.tapRewardDesc}
              </p>
            </div>

            {/* 비주얼 & 페이퍼돌 */}
            <div className="rounded-md border border-border/70 bg-background/70 p-3 space-y-1.5">
              <span className="font-bold text-xs flex items-center gap-1.5 text-sky-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>마을 비주얼 & 부족민 페이퍼돌 장식</span>
              </span>
              <div className="space-y-1 text-[11px] text-foreground/90">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">머리 장식:</span>
                  <b className="text-primary">{viewingMeta.headgearLabel}</b>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">발밑 오라:</span>
                  <span>{viewingMeta.auraText}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 3단계 전용 건물 & 정밀 제조 트리 */}
          <div className="space-y-2 pt-1">
            <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
              <Hammer className="h-4 w-4 text-primary" />
              <span>단계별 전용 건물 & 정밀 제조 트리</span>
            </span>

            <div className="space-y-2">
              {viewingMeta.tiers.map(tier => (
                <div
                  key={tier.tier}
                  className="rounded-lg border border-border/80 bg-background/85 p-3 space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border/60 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        Lv.{tier.tier} 단계
                      </span>
                      <b className="text-xs text-foreground">{tier.buildingName}</b>
                      <span className="text-[10px] text-muted-foreground">· {tier.recipeOrSkillName}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="font-bold text-muted-foreground">필요 재료:</span>
                    {tier.ingredients.map((ing, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-muted/60 px-1.5 py-0.5 text-foreground font-mono"
                      >
                        {ing.name} x{ing.count}
                      </span>
                    ))}
                  </div>

                  <p className="text-[11px] text-emerald-300 font-medium">
                    ⚡ {tier.effectDesc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Warlock Special: Skull Dragon Dark Ritual Section */}
          {viewingMeta.canonicalId === 'NECROMANCER' && (
            <div className="rounded-lg border-2 border-purple-500 bg-purple-950/40 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <Skull className="h-5 w-5 text-purple-400" />
                <h3 className="font-bold text-xs text-purple-300">
                  흑마술사 전용 의식: [스컬 드래곤] 암흑 연성 제단
                </h3>
              </div>
              <p className="text-[11px] text-purple-200/90 leading-relaxed">
                Lv.4 이상의 공룡 펫을 암흑 제단에 바쳐 전설 등급 [스컬 드래곤]으로 각성시킵니다. (체력/공격력 2.2배, 흡혈 15%, 사망 면제)
              </p>

              {existingDragons.length > 0 && (
                <div className="rounded bg-background/60 p-2 text-[11px] text-purple-300">
                  보유 중인 스컬 드래곤: {existingDragons.map(d => `${d.nickname || d.name} (Lv.${d.level})`).join(', ')}
                </div>
              )}

              {eligibleDragonPets.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground">
                    진화 가능한 공룡 펫 (Lv.4 이상):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {eligibleDragonPets.map(p => (
                      <button
                        key={p.uid}
                        type="button"
                        onClick={() => {
                          if (onEvolvePetToSkullDragon) {
                            const ok = onEvolvePetToSkullDragon(p.uid);
                            if (ok) toast.success(`💀 ${p.name}이(가) 불사의 스컬 드래곤으로 각성했습니다!`);
                          }
                        }}
                        className="pixel-btn flex items-center gap-1.5 bg-purple-900/80 hover:bg-purple-800 text-purple-100 py-1 px-2.5 text-xs rounded border border-purple-500/60"
                      >
                        <Skull className="h-3.5 w-3.5 text-purple-300" />
                        <span>{p.nickname || p.name} (Lv.{p.level}) 연성하기</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">
                  * 현재 Lv.4 이상 진화 가능한 공룡 펫이 없습니다. 펫 합성으로 Lv.4를 달성하세요.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmingClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="pixel-frame w-full max-w-sm bg-card p-4 space-y-3 border-2 border-primary">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>전직 의식 확인</span>
            </h3>
            <p className="text-xs text-foreground/90 leading-relaxed">
              <b>{SHAMAN_CLASSES[confirmingClassId]?.name}</b>(으)로 부족의 주술사를 전직하시겠습니까?
              <br />
              고유 자원 메커니즘과 전용 NPC, 3단계 테크트리가 활성화됩니다.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmingClassId(null)}
              >
                취소
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmEvolution}
                className="bg-primary text-primary-foreground font-bold"
              >
                전직 거행
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
