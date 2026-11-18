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
  SHAMAN_CLASSES,
  type ShamanClassId,
  type ShamanClassMeta,
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
  const [selectedClassId, setSelectedClassId] = useState<ShamanClassId>(currentClass ?? 'engineer');
  const [confirmingClassId, setConfirmingClassId] = useState<ShamanClassId | null>(null);

  if (!open) return null;

  const currentMeta = currentClass ? SHAMAN_CLASSES[currentClass] : null;
  const viewingMeta = SHAMAN_CLASSES[selectedClassId];

  // Eligible pets for Warlock's Skull Dragon dark ritual (level >= 4)
  const eligibleDragonPets = pets.filter(p => p.level >= 4 && p.speciesId !== 'skull_dragon');
  const existingDragons = pets.filter(p => p.speciesId === 'skull_dragon');
  const boneCount =
    (storage.find(s => s.itemId === 'bone')?.count ?? 0) +
    (backpack.find(s => s.itemId === 'bone')?.count ?? 0);

  const handleChooseClass = (classId: ShamanClassId) => {
    if (currentClass === classId) return;
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
                4대 주술사 전직 의식 (Shaman Evolution)
              </h1>
              {currentClass ? (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentMeta?.borderClass} ${currentMeta?.textClass} bg-background`}>
                  현재 전직: {currentMeta?.name}
                </span>
              ) : (
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/40 animate-pulse">
                  전직 선택 대기 중
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              각 전직의 고유 권능과 장단점을 비교하여 부족의 미래를 이끌 전직을 선택하세요
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

      {/* 4 Class Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b-2 border-border bg-card/60 p-2 gap-2">
        {(Object.values(SHAMAN_CLASSES) as ShamanClassMeta[]).map(cls => {
          const isSelected = selectedClassId === cls.id;
          const isCurrentActive = currentClass === cls.id;

          return (
            <button
              key={cls.id}
              type="button"
              onClick={() => setSelectedClassId(cls.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                isSelected
                  ? `ring-2 ring-primary ${cls.borderClass} bg-card shadow-md`
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
              <span className="text-[10px] opacity-80 mt-0.5">{cls.badge}</span>
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
          className={`rounded-lg border-2 ${viewingMeta.borderClass} bg-gradient-to-br ${viewingMeta.bgGradient} p-4 space-y-3 shadow-lg`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/80 pb-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/80 border-2 border-current text-2xl shadow">
                {viewingMeta.icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    {viewingMeta.name}
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-background/70 border border-current font-bold">
                    {viewingMeta.badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground italic mt-0.5">
                  {viewingMeta.motto}
                </p>
              </div>
            </div>

            {currentClass === viewingMeta.id ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 shrink-0">
                <Check className="h-4 w-4" />
                <span>현재 선택된 전직</span>
              </span>
            ) : (
              <Button
                type="button"
                onClick={() => handleChooseClass(viewingMeta.id)}
                className="pixel-btn h-9 px-4 bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 shrink-0 shadow"
              >
                <span>{currentClass ? '이 전직으로 변경하기' : '이 전직으로 진화하기'}</span>
              </Button>
            )}
          </div>

          <p className="text-xs leading-relaxed text-foreground/90">
            {viewingMeta.desc}
          </p>

          {/* Pros & Cons Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Pros */}
            <div className="rounded-md border border-emerald-500/30 bg-background/70 p-3 space-y-1.5">
              <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>핵심 권능 및 특수 혜택 (장점)</span>
              </span>
              <ul className="space-y-1 text-[11px] text-foreground/90">
                {viewingMeta.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div className="rounded-md border border-destructive/30 bg-background/70 p-3 space-y-1.5">
              <span className="font-bold text-xs text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>감수해야 할 제약 및 약점 (단점)</span>
              </span>
              <ul className="space-y-1 text-[11px] text-foreground/90">
                {viewingMeta.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-destructive font-bold">⚠️</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Specialized Interactive Section based on class */}
        {/* 1. WARLOCK EXCLUSIVE: Skull Dragon Evolution Ritual */}
        {selectedClassId === 'warlock' && (
          <div className="rounded-lg border-2 border-emerald-600/50 bg-card p-4 space-y-3 shadow">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <div className="flex items-center gap-2">
                <Skull className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-xs text-foreground">
                    💀 암흑 강령 의식: [스컬 드래곤 (Skull Dragon)] 각성 진화
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Lv.4 이상으로 성장한 공룡 펫에게 공룡 뼈 제물을 바쳐 불사의 스컬 드래곤으로 영구 진화시킵니다
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                제물 뼈 보유: {boneCount} / 5개
              </span>
            </div>

            {/* Existing Dragons */}
            {existingDragons.length > 0 && (
              <div className="p-2.5 rounded border border-emerald-500/40 bg-emerald-950/20 text-xs text-emerald-300 flex items-center justify-between">
                <span>보유 중인 스컬 드래곤: {existingDragons.map(d => d.name).join(', ')}</span>
                <span className="font-bold font-mono">체력 250 · 공격력 +45 · 불사 뼈방패</span>
              </div>
            )}

            {/* Candidate Pets */}
            {eligibleDragonPets.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-muted-foreground block">
                  진화 가능한 Lv.4+ 공룡 펫 목록:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {eligibleDragonPets.map(pet => (
                    <div
                      key={pet.uid}
                      className="flex items-center justify-between p-2.5 rounded border border-border bg-background"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>🦖</span>
                          <span>{pet.name}</span>
                          <span className="text-[10px] px-1 rounded bg-accent/20 text-primary">
                            Lv.{pet.level}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          현재 HP {pet.hp} · 역할: {pet.role ?? '보초'}
                        </span>
                      </div>

                      <Button
                        type="button"
                        disabled={boneCount < 5 || currentClass !== 'warlock'}
                        onClick={() => {
                          if (onEvolvePetToSkullDragon) {
                            onEvolvePetToSkullDragon(pet.uid);
                          }
                        }}
                        className="pixel-btn h-8 px-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px]"
                      >
                        <Skull className="h-3 w-3 mr-1" />
                        <span>스컬 드래곤 진화 (뼈 5개)</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded border border-border/80 bg-muted/20 text-center text-xs text-muted-foreground">
                현재 Lv.4 이상의 공룡 펫이 없습니다. 펫 탭에서 합체 육성하여 Lv.4를 달성하면 스컬 드래곤으로 각성할 수 있습니다.
              </div>
            )}
          </div>
        )}

        {/* 2. ENGINEER EXCLUSIVE: Turret & Metallurgy Info */}
        {selectedClassId === 'engineer' && (
          <div className="rounded-lg border border-amber-500/40 bg-card p-4 space-y-2.5">
            <div className="flex items-center gap-2 border-b border-border/80 pb-2">
              <Wrench className="h-5 w-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-xs text-foreground">
                  🔧 공돌이 전용 특권: 풀무 대장간 & 자동 방어 포탑
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  건축공방 및 무기제련소에서 포탑 및 3배 내구도 장비를 제작할 수 있습니다
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded border border-border bg-background">
                <b className="text-amber-400 block mb-0.5">⚙️ 무기 내구도 3배</b>
                <p className="text-[10px] text-muted-foreground">
                  제작되는 모든 칼·창·활의 최대 내구도가 기존 60에서 180으로 300% 증가합니다.
                </p>
              </div>
              <div className="p-2 rounded border border-border bg-background">
                <b className="text-amber-400 block mb-0.5">🛡️ 자동 방어 포탑</b>
                <p className="text-[10px] text-muted-foreground">
                  마을 외곽에 설치 시 30m 내로 접근하는 맹수를 자동으로 감지해 요격 사격합니다.
                </p>
              </div>
              <div className="p-2 rounded border border-border bg-background">
                <b className="text-amber-400 block mb-0.5">🔩 신규 합금 제련</b>
                <p className="text-[10px] text-muted-foreground">
                  철광석과 석탄을 결합해 청동 및 강철 장비를 제련할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. MAGE EXCLUSIVE: Elemental Magic Grimoire */}
        {selectedClassId === 'mage' && (
          <div className="rounded-lg border border-violet-500/40 bg-card p-4 space-y-2.5">
            <div className="flex items-center gap-2 border-b border-border/80 pb-2">
              <Zap className="h-5 w-5 text-violet-400" />
              <div>
                <h3 className="font-bold text-xs text-foreground">
                  🔮 원소 마법술사 그리모어: 4대 원소 주술
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  전투 시 무기 공격과 함께 강력한 원소 마법이 자동으로 발동합니다
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded border border-border bg-background">
                <b className="text-orange-400 block mb-0.5">🔥 파이어볼</b>
                <p className="text-[10px] text-muted-foreground">단일 대상 30 화염 피해 & 화상 지속 피해</p>
              </div>
              <div className="p-2 rounded border border-border bg-background">
                <b className="text-cyan-400 block mb-0.5">❄️ 아이스볼</b>
                <p className="text-[10px] text-muted-foreground">20 냉기 피해 & 이동속도/공격속도 50% 결빙 감속</p>
              </div>
              <div className="p-2 rounded border border-border bg-background">
                <b className="text-yellow-400 block mb-0.5">⚡ 썬더볼트</b>
                <p className="text-[10px] text-muted-foreground">35 뇌격 관통 피해 & 적 100% 충격 스턴</p>
              </div>
              <div className="p-2 rounded border border-border bg-background">
                <b className="text-purple-400 block mb-0.5">🛡️ 마나 실드</b>
                <p className="text-[10px] text-muted-foreground">다음 적 공격 3회를 완전 무효화하는 배리어</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. ORTHODOX EXCLUSIVE: Ancient Sage Blessing */}
        {selectedClassId === 'orthodox' && (
          <div className="rounded-lg border border-sky-500/40 bg-card p-4 space-y-2.5">
            <div className="flex items-center gap-2 border-b border-border/80 pb-2">
              <Crown className="h-5 w-5 text-sky-400" />
              <div>
                <h3 className="font-bold text-xs text-foreground">
                  👑 정직한 대현자의 은총: 문명 번영 패시브
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  기본기를 극대화하여 부족 전체의 생산력과 전투력을 영구히 증폭시킵니다
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded border border-border bg-background">
                <b className="text-sky-400 block mb-0.5">💪 전원 영구 스탯 +20%</b>
                <p className="text-[10px] text-muted-foreground">부족민 및 모든 펫의 공격력, 방어력, 체력이 상시 +20% 가산됩니다.</p>
              </div>
              <div className="p-2 rounded border border-border bg-background">
                <b className="text-sky-400 block mb-0.5">🌾 채집 파밍량 +25%</b>
                <p className="text-[10px] text-muted-foreground">나무, 돌, 약초 등 야외 자원 채집 시 추가 획득 확률이 대폭 상승합니다.</p>
              </div>
              <div className="p-2 rounded border border-border bg-background">
                <b className="text-sky-400 block mb-0.5">💰 제작/건축 재료 -15% 절약</b>
                <p className="text-[10px] text-muted-foreground">마을 건물 및 장비 제작 시 소모되는 재료가 영구 절약됩니다.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal Overlay */}
      {confirmingClassId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4">
          <div className="pixel-frame w-full max-w-sm space-y-3 bg-card p-4 border-2 border-primary shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <span className="text-2xl">{SHAMAN_CLASSES[confirmingClassId].icon}</span>
              <div>
                <b className="text-sm font-bold text-foreground">
                  [{SHAMAN_CLASSES[confirmingClassId].name}] 전직 확인
                </b>
                <p className="text-[10px] text-muted-foreground">
                  부족의 미래를 결정하는 중대한 의식입니다
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-foreground/90">
              정말로 <b>[{SHAMAN_CLASSES[confirmingClassId].name}]</b> 전직 의식을 거행하시겠습니까?
              선택 시 주술사의 외형과 전용 권능이 즉시 활성화됩니다.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmingClassId(null)}
                className="pixel-btn h-8 text-xs"
              >
                취소
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmEvolution}
                className="pixel-btn h-8 bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90"
              >
                🔥 전직 의식 완수
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
