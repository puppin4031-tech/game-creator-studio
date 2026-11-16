import { useMemo } from 'react';
import { Flame, Sparkles, Trash2, Utensils, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  countSpoiledFood,
  PERISHABLE_FOOD_IDS,
  SMOKE_CURING_MS,
  TAVERN_RECIPES,
  type SmokehouseBatch,
} from '@/lib/survival/culinary';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import { addStacks, countOf, hasAll } from '@/lib/survival/inventory';
import type { Stack } from '@/lib/survival/types';
import CulinaryDishIcon, { isCustomCulinaryItem } from './CulinaryDishIcon';

interface Props {
  open: 'smokehouse' | 'tavern' | null;
  onClose: () => void;
  onSwitchTab: (tab: 'smokehouse' | 'tavern') => void;
  storage: Stack[];
  backpack: Stack[];
  freshnessPct: number;
  smokeBatches: SmokehouseBatch[];
  now: number;
  onStartSmokeBatch: (itemId: ItemId, count: number) => boolean;
  onInstantSmoke: (itemId: ItemId, kind: 'cooked' | 'dried') => boolean;
  onClaimSmokeBatch: (batchId: string) => boolean;
  onDiscardSpoiled: () => void;
  onCookTavernRecipe: (recipeId: string) => boolean;
  onEatDish?: (itemId: ItemId) => void;
}

const fmtCost = (cost: Stack[]) =>
  cost.map(c => `${ITEMS[c.itemId]?.name ?? c.itemId} ${c.count}`).join(' · ');

export default function SmokehouseTavernModal({
  open,
  onClose,
  onSwitchTab,
  storage,
  backpack,
  freshnessPct,
  smokeBatches,
  now,
  onStartSmokeBatch,
  onInstantSmoke,
  onClaimSmokeBatch,
  onDiscardSpoiled,
  onCookTavernRecipe,
  onEatDish,
}: Props) {
  const owned = useMemo(() => addStacks(storage, backpack), [storage, backpack]);
  const spoiledCount = useMemo(
    () => countSpoiledFood(backpack, storage),
    [backpack, storage]
  );

  if (!open) return null;

  const perishables = PERISHABLE_FOOD_IDS.map(id => ({
    id,
    def: ITEMS[id],
    count: countOf(owned, id),
  }));

  const cookedDishes: ItemId[] = [
    'bone_stew',
    'spice_roast',
    'sweet_fruit_skewers',
    'dino_tail_steak',
    'jerky',
    'dried_fruit',
    'cooked_meat',
  ];

  return (
    <div
      role="dialog"
      aria-label={open === 'smokehouse' ? '원시 훈제소' : '원시 주막 요리터'}
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{open === 'smokehouse' ? '♨️' : '🍖'}</span>
          <div>
            <b className="text-sm">
              {open === 'smokehouse'
                ? '원시 훈제소 · 식량 부패 방지 & 훈연 보관'
                : '원시 주막 · 향신료 특제 요리터'}
            </b>
            <p className="text-[10px] text-muted-foreground">
              {open === 'smokehouse'
                ? '날고기와 과일(사과·돌배·산딸기)이 초록색으로 썩기 전에 훈연 보관하거나 말린 고기로 전환하세요'
                : '야생 향신초·암염·매운 후추열매와 식재료를 조합해 스튜와 고기 요리를 만드세요'}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="창 닫기"
          onClick={onClose}
          className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
        >
          <X className="!h-4 !w-4" />
        </button>
      </div>

      {/* Mode Switch Tabs */}
      <div className="grid grid-cols-2 gap-1 border-b border-border bg-background px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant={open === 'smokehouse' ? 'default' : 'outline'}
          onClick={() => onSwitchTab('smokehouse')}
          className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs font-bold"
        >
          ♨️ 원시 훈제소 (훈연 보관 · 부패 관리)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={open === 'tavern' ? 'default' : 'outline'}
          onClick={() => onSwitchTab('tavern')}
          className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs font-bold"
        >
          🍖 원시 주막 (향신료 · 스튜 · 고기요리)
        </Button>
      </div>

      {/* Freshness & Spoilage Alert Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border bg-accent/15 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <b>생식량 신선도: {freshnessPct}%</b>
              <span className="text-[10px] text-muted-foreground">
                (방치 시 초록색 곰팡이가 피며 상한 음식으로 변합니다)
              </span>
            </div>
            <div className="h-2 w-48 overflow-hidden border border-foreground bg-muted">
              <div
                className={`h-full transition-all ${
                  freshnessPct > 50 ? 'bg-emerald-600' : 'bg-destructive'
                }`}
                style={{ width: `${freshnessPct}%` }}
              />
            </div>
          </div>
        </div>

        {spoiledCount > 0 && (
          <div className="flex items-center gap-2 rounded border-2 border-lime-700 bg-lime-950/30 px-2.5 py-1">
            <CulinaryDishIcon itemId="spoiled_food" size={22} />
            <span className="font-bold text-lime-700">
              상한 음식(초록 곰팡이) ×{spoiledCount}
            </span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={onDiscardSpoiled}
              className="pixel-btn h-auto min-h-0 gap-1 py-1 px-2 text-xs"
            >
              <Trash2 className="!h-3.5 !w-3.5" />
              전량 폐기
            </Button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {open === 'smokehouse' ? (
          <>
            {/* Active Smoking Batches */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <b className="text-sm">🔥 훈연 건조실 (자동 말린고기·말린과일 전환)</b>
                <span className="text-[10px] text-primary">
                  일정 시간({SMOKE_CURING_MS / 60_000}분) 후 썩지 않는 보존식으로 전환됩니다
                </span>
              </div>
              {!smokeBatches.length ? (
                <div className="pixel-box bg-card p-3 text-center text-muted-foreground">
                  현재 훈연 중인 식량이 없습니다. 아래 생식량을 눌러 [훈연 보관]에 넣으세요!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {smokeBatches.map(b => {
                    const ready = now >= b.readyAt;
                    const pct = Math.min(
                      100,
                      Math.max(0, Math.round(((now - b.startedAt) / (b.readyAt - b.startedAt)) * 100))
                    );
                    const remSec = Math.max(0, Math.ceil((b.readyAt - now) / 1000));
                    return (
                      <div
                        key={b.id}
                        className="pixel-frame flex items-center justify-between gap-2 bg-card p-2.5"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <b>
                              {ITEMS[b.inputItemId]?.name} ×{b.inputCount} →{' '}
                              {ITEMS[b.outputItemId]?.name} ×{b.outputCount}
                            </b>
                            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              {ready ? '훈연 완료!' : `${remSec}초 남음`}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden bg-muted">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!ready}
                          onClick={() => onClaimSmokeBatch(b.id)}
                          className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs font-bold"
                        >
                          {ready ? '창고로 회수' : '훈연 중'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Perishable Raw Foods List */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <b className="text-sm">🥩 보유 중인 부패 위험 생식량 (날고기 · 사과 · 돌배 · 산딸기)</b>
                <span className="text-[10px] text-muted-foreground">나뭇가지 1개로 즉시 가공하거나 훈연실에 넣으세요</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {perishables.map(({ id, def, count }) => {
                  const isMeat = id === 'raw_meat';
                  const hasBranch = countOf(owned, 'branch') >= 1;
                  return (
                    <div key={id} className="pixel-frame space-y-2 bg-card p-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <b className="text-sm">{def.name}</b>
                          <p className="text-[10px] text-muted-foreground">{def.desc}</p>
                        </div>
                        <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-bold">
                          보유 ×{count}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={count < 1}
                          onClick={() => onStartSmokeBatch(id, Math.min(3, count))}
                          className="pixel-btn h-auto min-h-0 flex-1 py-1.5 px-2 text-xs font-bold"
                        >
                          ♨️ 훈연 보관 넣기 ({Math.min(3, Math.max(1, count))}개)
                        </Button>
                        {isMeat && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={count < 1 || !hasBranch}
                            onClick={() => onInstantSmoke(id, 'cooked')}
                            className="pixel-btn h-auto min-h-0 py-1.5 px-2 text-xs"
                          >
                            🔥 구운고기 직화
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={count < 1 || !hasBranch}
                          onClick={() => onInstantSmoke(id, 'dried')}
                          className="pixel-btn h-auto min-h-0 py-1.5 px-2 text-xs"
                        >
                          🥩 즉시 {isMeat ? '말린고기' : '말린과일'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Spices Inventory Banner */}
            <section className="pixel-frame flex flex-wrap items-center justify-between gap-2 bg-card p-2.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <CulinaryDishIcon itemId="wild_spice" size={20} />
                  <span>
                    야생 향신초: <b>{countOf(owned, 'wild_spice')}</b>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <CulinaryDishIcon itemId="rock_salt" size={20} />
                  <span>
                    암염 결정: <b>{countOf(owned, 'rock_salt')}</b>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <CulinaryDishIcon itemId="pepper_berry" size={20} />
                  <span>
                    매운 후추열매: <b>{countOf(owned, 'pepper_berry')}</b>
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">
                약초 군락·부싯돌 바위·산딸기 덤불 및 주막 방치 보상으로 획득
              </span>
            </section>

            {/* Tavern Culinary Recipes */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <b className="text-sm">🍲 원시 주막 특제 요리 레시피</b>
                <span className="text-[10px] text-primary">요리된 음식은 부패하지 않으며 높은 체력·허기를 회복합니다</span>
              </div>
              <div className="space-y-2">
                {TAVERN_RECIPES.map(r => {
                  const canCook = hasAll(owned, r.ingredients);
                  const heldCount = countOf(owned, r.result);
                  return (
                    <div
                      key={r.id}
                      data-tavern-recipe={r.result}
                      className="pixel-frame flex items-center justify-between gap-3 bg-card p-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-foreground bg-background">
                          <CulinaryDishIcon itemId={r.result} size={34} />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <b className="text-sm">{r.name}</b>
                            {heldCount > 0 && (
                              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                보유 ×{heldCount}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-primary">{r.effectSummary}</p>
                          <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                          <p className="text-[10px]">
                            재료:{' '}
                            <b className={canCook ? 'text-foreground' : 'text-destructive'}>
                              {fmtCost(r.ingredients)}
                            </b>
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!canCook}
                          onClick={() => onCookTavernRecipe(r.id)}
                          className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2.5 text-xs font-bold"
                        >
                          <Flame className="!h-4 !w-4" />
                          요리하기
                        </Button>
                        {heldCount > 0 && onEatDish && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onEatDish(r.result)}
                            className="pixel-btn h-auto min-h-0 gap-1 py-1 px-2 text-[11px]"
                          >
                            <Utensils className="!h-3.5 !w-3.5" />
                            시식하기
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Preserved & Cooked Food Pantry */}
            <section className="space-y-1.5">
              <b className="text-sm">🍽️ 주막 찬장 (보관 중인 요리 & 훈연 식량)</b>
              <div className="flex flex-wrap gap-1.5">
                {cookedDishes.map(id => {
                  const cnt = countOf(owned, id);
                  if (cnt <= 0) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onEatDish?.(id)}
                      className="pixel-box flex items-center gap-1.5 bg-card px-2.5 py-1.5 text-xs"
                    >
                      {isCustomCulinaryItem(id) ? (
                        <CulinaryDishIcon itemId={id} size={20} />
                      ) : (
                        <span>🍖</span>
                      )}
                      <span>{ITEMS[id].name}</span>
                      <b>×{cnt}</b>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
