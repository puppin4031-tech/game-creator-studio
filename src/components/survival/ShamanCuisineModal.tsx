import { useState } from 'react';
import {
  X,
  Flame,
  UtensilsCrossed,
  Sparkles,
  Shield,
  Zap,
  Clock,
  Heart,
  Swords,
  Backpack,
  ChefHat,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEMS } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';
import {
  SHAMAN_CUISINE_RECIPES,
  type ShamanCuisineCategory,
  type ShamanDishDef,
  type CookingJob,
  type ActiveFoodBuff,
} from '@/lib/survival/culinary';
import { countOf } from '@/lib/survival/inventory';
import shamanImg from '@/assets/survival/npc-shaman.png';

interface Props {
  open: boolean;
  onClose: () => void;
  storage: Stack[];
  backpack: Stack[];
  permanentStats?: {
    maxHpBonus?: number;
    atkBonus?: number;
    defBonus?: number;
    carryBonus?: number;
  };
  activeBuffs?: ActiveFoodBuff[];
  cookingJobs?: CookingJob[];
  onCookDish: (recipeId: string) => boolean;
  onClaimCooking: (jobId: string) => boolean;
}

const CATEGORY_TABS: {
  id: ShamanCuisineCategory;
  label: string;
  icon: string;
  sub: string;
}[] = [
  { id: 'basic', label: '기초 요리', icon: '🔥', sub: '창고 비축용 주식' },
  { id: 'regular', label: '일반식', icon: '🍖', sub: '체력·허기 대폭 회복' },
  { id: 'special', label: '특별식', icon: '⚡', sub: '20~30분 지속 버프 (중복 불가)' },
  { id: 'tonic', label: '건강식 · 보약', icon: '🌿', sub: '1시간 끓이기 · 영구 스탯' },
];

function formatRemainingTime(sec: number): string {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m > 0 ? `${h}시간 ${m}분 남음` : `${h}시간 남음`;
  }
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}분 ${s}초 남음` : `${m}분 남음`;
  }
  return `${sec}초 남음`;
}

export default function ShamanCuisineModal({
  open,
  onClose,
  storage,
  backpack,
  permanentStats = {},
  activeBuffs = [],
  cookingJobs = [],
  onCookDish,
  onClaimCooking,
}: Props) {
  const [tab, setTab] = useState<ShamanCuisineCategory>('tonic');
  const now = Date.now();

  if (!open) return null;

  // Accessible materials: storage + backpack combined
  const getAccessibleCount = (itemId: string): number => {
    return countOf(storage, itemId as any) + countOf(backpack, itemId as any);
  };

  const filteredRecipes = SHAMAN_CUISINE_RECIPES.filter(r => r.category === tab);
  const activeJobs = cookingJobs.filter(j => !j.claimed);
  const validBuffs = activeBuffs.filter(b => b.expiresAt > now);

  return (
    <div
      role="dialog"
      aria-label="주술 수라간"
      className="fixed inset-0 z-[1100] flex flex-col bg-background font-pixel text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <img src={shamanImg} alt="" className="pixelated h-8 w-8 object-contain" />
          <div>
            <b className="text-sm flex items-center gap-1.5">
              <span>🧙</span>
              <span>주술사의 요리비법 전수실 & 수라간</span>
            </b>
            <p className="text-[10px] text-muted-foreground">
              주술사에게 기초·일반·특별·보약 비법(자격)을 전수받고, 상점·사냥으로 획득한 조리법을 조리하세요
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
        >
          <X className="!h-4 !w-4" />
        </button>
      </div>

      {/* Shaman's Qualification & Rule Banner */}
      <div className="border-b border-border bg-accent/20 px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold flex items-center gap-1.5 text-primary">
            <span>📜</span>
            <span>주술사 요리비법 전수 자격:</span>
          </span>
          <span className="text-[10px] text-muted-foreground">
            * 주술사를 통해 자격을 습득해야 조리 가능 / 조리법은 상점·사냥에서 획득
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
          <div className="flex items-center gap-1 rounded bg-background/80 p-1.5 border border-emerald-500/50 text-emerald-400">
            <Check className="h-3 w-3 shrink-0" />
            <span className="font-bold">1단계: 기초요리 비법</span>
          </div>
          <div className="flex items-center gap-1 rounded bg-background/80 p-1.5 border border-emerald-500/50 text-emerald-400">
            <Check className="h-3 w-3 shrink-0" />
            <span className="font-bold">2단계: 일반식 비법</span>
          </div>
          <div className="flex items-center gap-1 rounded bg-background/80 p-1.5 border border-primary/50 text-primary">
            <Check className="h-3 w-3 shrink-0" />
            <span className="font-bold">3단계: 특별식 연성</span>
          </div>
          <div className="flex items-center gap-1 rounded bg-background/80 p-1.5 border border-amber-500/50 text-amber-400">
            <Check className="h-3 w-3 shrink-0" />
            <span className="font-bold">4단계: 건강식·보약</span>
          </div>
        </div>
      </div>

      {/* Shaman's Tip & Dialogue */}
      <div className="flex items-center gap-3 border-b border-border bg-accent/10 px-3 py-1.5">
        <span className="text-xl shrink-0">🍲</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] leading-snug break-keep text-foreground/90">
            {tab === 'tonic' &&
              '"건강식 보약은 온갖 희귀한 재료를 가마솥에 푹 고아내야 하네. 시간과 공이 들지만 한 모금만 넘겨도 자네의 육신이 영구히 강해질 걸세!"'}
            {tab === 'special' &&
              '"맹수의 흉포한 부위와 향신초를 버무린 특별식을 먹으면, 20~30분간 야수의 괴력과 강철 피부를 얻을 수 있지."'}
            {tab === 'regular' &&
              '"사골 뼈와 신선한 고기로 푹 끓인 일반식은 지친 몸의 허기와 상처를 즉시 채워주는 가장 든든한 양식이라네."'}
            {tab === 'basic' &&
              '"구운 고기와 말린 과일을 창고에 넉넉히 비축해 두게나. 부족민과 공룡들이 하루 1~2개씩 나눠 먹으며 절대 굶주리지 않을 걸세."'}
          </p>
        </div>
      </div>

      {/* Permanent Stats & Active Buffs Summary */}
      <div className="border-b-2 border-border bg-card/70 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="font-bold text-amber-500 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>영구 스탯 단련:</span>
            </span>
            <span className="flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded border border-border">
              <Heart className="h-3 w-3 text-red-500" />
              <span>체력 +{permanentStats.maxHpBonus ?? 0}</span>
            </span>
            <span className="flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded border border-border">
              <Swords className="h-3 w-3 text-amber-500" />
              <span>공격 +{permanentStats.atkBonus ?? 0}</span>
            </span>
            <span className="flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded border border-border">
              <Shield className="h-3 w-3 text-blue-500" />
              <span>방어 +{permanentStats.defBonus ?? 0}</span>
            </span>
            <span className="flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded border border-border">
              <Backpack className="h-3 w-3 text-emerald-500" />
              <span>배낭 +{permanentStats.carryBonus ?? 0}kg</span>
            </span>
          </div>

          {/* Active Buffs Pill */}
          {validBuffs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {validBuffs.map(b => {
                const remMin = Math.max(1, Math.ceil((b.expiresAt - now) / 60_000));
                return (
                  <span
                    key={b.id}
                    title={b.desc}
                    className="flex items-center gap-1 rounded bg-amber-500/20 border border-amber-500 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 animate-pulse"
                  >
                    <span>{b.icon}</span>
                    <span>{b.name}</span>
                    <span className="text-[9px] opacity-80">({remMin}분)</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Cauldron Cooking Jobs */}
      {activeJobs.length > 0 && (
        <div className="border-b-2 border-primary/50 bg-primary/10 px-3 py-2 space-y-2">
          <p className="font-bold text-[11px] text-primary flex items-center gap-1.5">
            <span className="animate-spin text-sm">🍲</span>
            <span>주술 가마솥 불길 활성화 (조리 진행 중):</span>
          </p>
          <div className="space-y-1.5">
            {activeJobs.map(job => {
              const r = SHAMAN_CUISINE_RECIPES.find(x => x.id === job.recipeId);
              if (!r) return null;
              const isReady = now >= job.readyAt;
              const remainingSec = Math.max(0, Math.ceil((job.readyAt - now) / 1000));
              return (
                <div
                  key={job.id}
                  className="pixel-box flex items-center justify-between gap-3 bg-background p-2 border border-primary"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl animate-bounce">{r.icon}</span>
                    <div>
                      <b className="text-xs">{r.name}</b>
                      <p className="text-[10px] text-muted-foreground">{r.tagline}</p>
                    </div>
                  </div>
                  <div>
                    {isReady ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onClaimCooking(job.id)}
                        className="pixel-btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1 px-3 shadow"
                      >
                        🎉 섭취 & 완성 수령!
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                        <Clock className="h-3 w-3 animate-spin" />
                        <span>{formatRemainingTime(remainingSec)}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="grid grid-cols-4 gap-1 border-b border-border bg-card/60 p-2">
        {CATEGORY_TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`pixel-btn flex flex-col items-center justify-center py-2 px-1 text-center transition-all ${
              tab === t.id
                ? 'bg-primary text-primary-foreground font-bold shadow-md'
                : 'bg-card text-muted-foreground hover:bg-accent'
            }`}
          >
            <span className="text-base sm:text-lg mb-0.5">{t.icon}</span>
            <span className="text-[11px] leading-tight truncate w-full">{t.label}</span>
            <span className="text-[9px] opacity-75 hidden sm:inline">{t.sub}</span>
          </button>
        ))}
      </div>

      {/* Notice Banners for Special & Tonic rules */}
      {tab === 'special' && (
        <div className="flex items-start gap-2 border-b-2 border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
          <span className="text-base shrink-0">💡</span>
          <p className="leading-tight break-keep">
            <b>특별식 버프 규칙:</b> 특별식 버프는 <b>서로 중복되지 않으며, 가장 마지막에 먹은 음식의 버프 1종만 적용</b>됩니다.
          </p>
        </div>
      )}
      {tab === 'tonic' && (
        <div className="flex items-start gap-2 border-b-2 border-primary/40 bg-primary/10 px-3 py-2 text-[11px] text-primary">
          <span className="text-base shrink-0">⏳</span>
          <p className="leading-tight break-keep">
            <b>건강식 보약 규칙:</b> 조리 시작 시 <b>가마솥에서 1시간 동안 푹 고아내며</b>, 완성 후 섭취하면 <b>스탯이 영구적으로 상승</b>합니다.
          </p>
        </div>
      )}

      {/* Recipe List Body */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="space-y-2.5">
          {filteredRecipes.map(recipe => {
            const canAffordAll = recipe.ingredients.every(
              ing => getAccessibleCount(ing.itemId) >= ing.count
            );

            return (
              <div
                key={recipe.id}
                className={`pixel-box p-3 border-2 transition-colors ${
                  canAffordAll
                    ? 'border-border bg-card'
                    : 'border-border/60 bg-card/50 opacity-90'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-2xl sm:text-3xl shrink-0 p-1 bg-accent/20 rounded border border-border">
                      {recipe.icon}
                    </span>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <b className="text-xs sm:text-sm">{recipe.name}</b>
                        {recipe.cookTimeSec > 0 ? (
                          <span className="rounded bg-amber-500/15 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                            ⏱️ 조리 {recipe.cookTimeSec >= 3600 ? `${Math.round(recipe.cookTimeSec / 3600)}시간` : `${recipe.cookTimeSec}초`} (가마솥)
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                            ⚡ 즉시 조리
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-primary">{recipe.tagline}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {recipe.desc}
                      </p>
                    </div>
                  </div>

                  {/* Cook Action Button */}
                  <div className="shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canAffordAll}
                      onClick={() => onCookDish(recipe.id)}
                      className={`pixel-btn py-1.5 px-3 text-xs font-bold ${
                        canAffordAll
                          ? recipe.category === 'tonic'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow'
                            : 'bg-primary text-primary-foreground shadow'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      {recipe.cookTimeSec > 0 ? '🍲 가마솥 끓이기' : '🔥 즉시 조리'}
                    </Button>
                  </div>
                </div>

                {/* Ingredients & Requirements */}
                <div className="mt-2.5 pt-2 border-t border-border/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground">필요 재료:</span>
                    {recipe.ingredients.map(ing => {
                      const have = getAccessibleCount(ing.itemId);
                      const met = have >= ing.count;
                      const it = ITEMS[ing.itemId];
                      return (
                        <span
                          key={ing.itemId}
                          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                            met
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                              : 'bg-destructive/10 border-destructive/30 text-destructive'
                          }`}
                        >
                          <span>{it?.name ?? ing.itemId}</span>
                          <span>
                            {have}/{ing.count}
                          </span>
                          {met && <Check className="h-2.5 w-2.5" />}
                        </span>
                      );
                    })}
                  </div>

                  <span className="text-[10px] text-muted-foreground">창고·배낭 합산 차감</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
