import { useState, useMemo, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, BookOpen, Coins, Shield, Trash2, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validStackCount } from '@/lib/survival/inventory';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ITEMS, type ItemId, type ItemDef } from '@/lib/survival/items';
import type { GearInstance, Stack } from '@/lib/survival/types';
import type { GearSlot, Loadout } from '@/lib/survival/equipment';
import { sellPrice } from '@/lib/survival/landmarks';

export interface InventoryMaterialsProps {
  stacks: Stack[];
  gear?: GearInstance[];
  loadout?: Loadout;
  location: 'backpack' | 'storage';
  canTransfer: boolean;
  ready: boolean;
  onTransfer: (id: ItemId, count?: number) => void;
  onTransferGear?: (uid: string) => void;
  onDrop?: (drops: Stack[]) => void;
  onDropGear?: (uid: string) => void;
  onUse: (id: ItemId) => void;
  onEquip?: (slot: GearSlot, uid: string | null) => void;
  onSell?: (id: ItemId, uid?: string) => void;
  icon: (id: ItemId) => ReactNode;
}

/** Unified inventory & storage interface: handles raw materials, tools, equipment, and consumables cleanly. */
export default function InventoryMaterials({
  stacks,
  gear = [],
  loadout,
  location,
  canTransfer,
  ready,
  onTransfer,
  onTransferGear,
  onDrop,
  onDropGear,
  onUse,
  onEquip,
  onSell,
  icon,
}: InventoryMaterialsProps) {
  const [selected, setSelected] = useState<
    | { type: 'stack'; itemId: ItemId }
    | { type: 'gear'; uid: string }
    | null
  >(null);
  const [transferCount, setTransferCount] = useState('1');
  const [dropCount, setDropCount] = useState('1');

  const inBag = location === 'backpack';

  // Find selected item
  const selectedStack = selected?.type === 'stack' ? stacks.find(s => s.itemId === selected.itemId) : undefined;
  const selectedGear = selected?.type === 'gear' ? gear.find(g => g.uid === selected.uid) : undefined;

  const activeItemId: ItemId | undefined = selectedStack?.itemId ?? selectedGear?.itemId;
  const item: ItemDef | undefined = activeItemId ? ITEMS[activeItemId] : undefined;

  const equippedUids = useMemo(
    () =>
      new Set(
        Object.values(loadout ?? {})
          .filter((g): g is GearInstance => !!g)
          .map(g => g.uid)
      ),
    [loadout]
  );

  const isGearEquipped = selectedGear ? (inBag && equippedUids.has(selectedGear.uid)) : false;

  const equippedSlot = useMemo(() => {
    if (!selectedGear || !loadout || !inBag) return undefined;
    const entry = (Object.entries(loadout) as [GearSlot, GearInstance | null][]).find(
      ([_, g]) => g?.uid === selectedGear.uid
    );
    return entry?.[0];
  }, [selectedGear, loadout, inBag]);

  const getTargetSlot = (it: ItemDef): GearSlot => {
    if (it.weapon) return 'weapon';
    if (it.armor) return 'armor';
    if (it.trinket) return 'trinket';
    if (it.tool) {
      if (!loadout?.tool1) return 'tool1';
      if (!loadout?.tool2) return 'tool2';
      return 'tool1';
    }
    return 'extra';
  };

  const transferValid = !!selectedStack && validStackCount(Number(transferCount), selectedStack.count);
  const dropValid = !!selectedStack && validStackCount(Number(dropCount), selectedStack.count);

  const price = activeItemId ? sellPrice(activeItemId) : 0;
  const hasItems = stacks.length > 0 || gear.length > 0;

  return (
    <>
      {hasItems ? (
        <div className="flex flex-wrap gap-1.5">
          {/* 1. Gear instances (tools, weapons, armor, accessories) */}
          {gear.map(g => {
            const it = ITEMS[g.itemId];
            if (!it) return null;
            const isEquipped = inBag && equippedUids.has(g.uid);
            return (
              <Button
                key={`gear-${g.uid}`}
                type="button"
                variant="outline"
                onClick={() => {
                  setSelected({ type: 'gear', uid: g.uid });
                }}
                className={`pixel-frame h-auto min-h-11 max-w-full gap-1.5 bg-card px-2 py-1 text-xs relative ${
                  isEquipped ? 'border-primary/80 ring-1 ring-primary/40' : ''
                }`}
              >
                {icon(g.itemId)}
                <span className="whitespace-normal text-left">
                  {it.name}
                  {g.plus ? <span className="text-amber-500 font-mono font-bold"> +{g.plus}</span> : null}
                </span>
                {isEquipped ? (
                  <span className="shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-1 py-0.5 rounded border border-primary/30">
                    장착 중
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
                    내구 {g.durability}/{g.maxDurability}
                  </span>
                )}
              </Button>
            );
          })}

          {/* 2. Material & consumable stacks */}
          {stacks.map(s => {
            const it = ITEMS[s.itemId];
            if (!it) return null;
            return (
              <Button
                key={`stack-${s.itemId}`}
                type="button"
                variant="outline"
                onClick={() => {
                  setSelected({ type: 'stack', itemId: s.itemId });
                  setTransferCount('1');
                  setDropCount('1');
                }}
                className="pixel-frame h-auto min-h-11 max-w-full gap-1.5 bg-card px-2 py-1 text-xs"
              >
                {icon(s.itemId)}
                <span className="whitespace-normal text-left">{it.name}</span>
                <b className="shrink-0 text-muted-foreground">×{s.count}</b>
              </Button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">비어 있음</p>
      )}

      {/* Action Dialog for Selected Item */}
      <Dialog
        open={!!selected && !!item}
        onOpenChange={open => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="pixel-panel max-h-[85dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto bg-background">
          {item && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-6">
                  {activeItemId && icon(activeItemId)}
                  <span>
                    {item.name}
                    {selectedGear?.plus ? ` +${selectedGear.plus}` : ''}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {inBag ? '배낭' : '거점 창고'} ·{' '}
                  {selectedGear ? (
                    <span>
                      내구도 {selectedGear.durability}/{selectedGear.maxDurability}
                      {isGearEquipped ? ' (착용 중)' : ''}
                    </span>
                  ) : (
                    <span>총수량 {selectedStack?.count ?? 0}개</span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {/* Item Details / Stats */}
              <div className="rounded border border-border/60 bg-muted/30 p-2 space-y-1 text-xs">
                <p className="text-muted-foreground">{item.desc}</p>
                {item.weapon && (
                  <p className="font-mono text-amber-500 font-bold">
                    ⚔️ 공격력 +{item.weapon.atk}{item.weapon.ranged ? ' (원거리 사격 가능)' : ' (근접 무기)'}
                  </p>
                )}
                {item.armor && (
                  <p className="font-mono text-sky-400 font-bold">
                    🛡️ 방어력 +{item.armor.def} (피해 감소)
                  </p>
                )}
                {item.tool && (
                  <p className="font-mono text-emerald-400 font-bold">
                    ⛏️ 도구 위력 +{item.tool.power} (벌목 +{item.tool.chop}, 채광 +{item.tool.mine})
                  </p>
                )}
                {item.trinket && (
                  <p className="font-mono text-purple-400 font-bold">
                    ✨ 전리품 보너스 +{item.trinket.lootBonus} · 경험치 +{item.trinket.xpBonus}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                {/* 1. Base Storage Transfer (Both Materials & Equipment) */}
                {selectedGear && onTransferGear && (
                  <section className="space-y-2 border-b border-border pb-3">
                    <div className="flex items-center justify-between text-sm">
                      <b>{inBag ? '거점 창고로 보관' : '배낭으로 꺼내기'}</b>
                      {isGearEquipped && inBag && (
                        <span className="text-[11px] text-amber-500 font-bold">착용 자동 해제</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="pixel-btn min-h-11 w-full"
                      disabled={!ready || (inBag && !canTransfer)}
                      onClick={() => {
                        onTransferGear(selectedGear.uid);
                        setSelected(null);
                      }}
                    >
                      {inBag ? <ArrowDownToLine className="mr-1.5 h-4 w-4" /> : <ArrowUpFromLine className="mr-1.5 h-4 w-4" />}
                      {inBag ? '거점 창고로 보관하기' : '배낭으로 꺼내기'}
                    </Button>
                  </section>
                )}

                {selectedStack && selectedStack.itemId !== 'shell' && (!inBag || canTransfer) && (
                  <section className="space-y-2 border-b border-border pb-3">
                    {inBag && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <b>거점 창고로 옮기기</b>
                          <span className="text-muted-foreground">보유 {selectedStack.count}개</span>
                        </div>
                        <label className="flex items-center gap-3 text-sm">
                          옮길 개수
                          <Input
                            aria-label="옮길 개수"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={selectedStack.count}
                            step={1}
                            value={transferCount}
                            onChange={e => setTransferCount(e.target.value)}
                            className="h-11 min-w-0 flex-1"
                          />
                        </label>
                        {!transferValid && (
                          <p className="text-xs text-destructive">1~{selectedStack.count} 사이의 정수를 입력하세요.</p>
                        )}
                      </>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="pixel-btn min-h-11 w-full whitespace-normal"
                      disabled={!canTransfer || !ready || (inBag && !transferValid)}
                      onClick={() => {
                        onTransfer(selectedStack.itemId, inBag ? Number(transferCount) : 1);
                        setSelected(null);
                      }}
                    >
                      {inBag ? <ArrowDownToLine className="mr-1.5 h-4 w-4" /> : <ArrowUpFromLine className="mr-1.5 h-4 w-4" />}
                      {inBag ? '창고로 옮기기' : '1개 배낭으로 옮기기'}
                    </Button>
                  </section>
                )}

                {/* 2. Equip / Unequip (Equipment & Tools) */}
                {selectedGear && inBag && onEquip && (
                  <section className="space-y-2 border-b border-border pb-3">
                    <div className="flex items-center justify-between text-sm">
                      <b>장비 장착 상태</b>
                      <span className="text-xs text-muted-foreground">
                        {isGearEquipped ? `현재 [${equippedSlot}] 슬롯 장착 중` : '미착용 상태'}
                      </span>
                    </div>
                    {isGearEquipped ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="pixel-btn min-h-11 w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                        onClick={() => {
                          if (equippedSlot) onEquip(equippedSlot, null);
                          setSelected(null);
                        }}
                      >
                        <Shield className="mr-1.5 h-4 w-4" />
                        장비 해제하기
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="pixel-btn min-h-11 w-full"
                        onClick={() => {
                          const slot = getTargetSlot(item);
                          onEquip(slot, selectedGear.uid);
                          setSelected(null);
                        }}
                      >
                        <Shield className="mr-1.5 h-4 w-4 text-primary" />
                        장비 착용하기
                      </Button>
                    )}
                  </section>
                )}

                {/* 3. Consume / Use (Food / Heal / Book) */}
                {(item.food || item.heal || item.book) && (
                  <Button
                    type="button"
                    className="pixel-btn min-h-11"
                    disabled={!ready || (!inBag && !canTransfer)}
                    onClick={() => {
                      if (activeItemId) onUse(activeItemId);
                      setSelected(null);
                    }}
                  >
                    {item.book ? <BookOpen className="mr-1.5 h-4 w-4" /> : <Utensils className="mr-1.5 h-4 w-4" />}
                    {item.book ? '기술서 읽기' : item.food ? '1개 먹기' : '1개 사용하기'}
                  </Button>
                )}

                {/* 4. Sell Item (조개 화폐 환전) */}
                {inBag && onSell && price > 0 && activeItemId !== 'shell' && (
                  <section className="space-y-1.5 border-b border-border pb-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="pixel-btn min-h-11 w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                      disabled={!ready || isGearEquipped}
                      title={isGearEquipped ? '장착 중인 장비는 먼저 해제해야 판매할 수 있습니다.' : undefined}
                      onClick={() => {
                        if (selectedGear) {
                          onSell(selectedGear.itemId, selectedGear.uid);
                        } else if (selectedStack) {
                          onSell(selectedStack.itemId);
                        }
                        setSelected(null);
                      }}
                    >
                      <Coins className="mr-1.5 h-4 w-4 text-amber-400" />
                      {isGearEquipped
                        ? '장착 중인 장비는 판매 불가'
                        : `조개 화폐로 판매 (조개 +${price}개)`}
                    </Button>
                  </section>
                )}

                {/* 5. Drop / Discard (Materials & Equipment) */}
                {inBag && selectedGear && onDropGear && (
                  <section className="space-y-2">
                    <Button
                      type="button"
                      variant="destructive"
                      className="pixel-btn min-h-11 w-full"
                      disabled={isGearEquipped}
                      title={isGearEquipped ? '장착 중인 장비는 먼저 해제해야 버릴 수 있습니다.' : undefined}
                      onClick={() => {
                        onDropGear(selectedGear.uid);
                        setSelected(null);
                      }}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      {isGearEquipped ? '착용 중인 장비는 버릴 수 없음' : '버리기'}
                    </Button>
                  </section>
                )}

                {inBag && selectedStack && onDrop && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <b>버리기</b>
                      <span className="text-muted-foreground">보유 {selectedStack.count}개</span>
                    </div>
                    <label className="flex items-center gap-3 text-sm">
                      버릴 개수
                      <Input
                        aria-label="버릴 개수"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={selectedStack.count}
                        step={1}
                        value={dropCount}
                        onChange={e => setDropCount(e.target.value)}
                        className="h-11 min-w-0 flex-1"
                      />
                    </label>
                    {!dropValid && (
                      <p className="text-xs text-destructive">1~{selectedStack.count} 사이의 정수를 입력하세요.</p>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      className="pixel-btn min-h-11 w-full"
                      disabled={!dropValid}
                      onClick={() => {
                        onDrop([{ itemId: selectedStack.itemId, count: Number(dropCount) }]);
                        setSelected(null);
                      }}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      버리기
                    </Button>
                  </section>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
