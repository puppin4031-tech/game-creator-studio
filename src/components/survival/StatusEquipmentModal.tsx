import { useState } from 'react';
import {
  X,
  Shield,
  Swords,
  Pickaxe,
  Sparkles,
  Backpack,
  Heart,
  Zap,
  Trash2,
  Archive,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import {
  GEAR_SLOTS,
  slotUnlocked,
  type GearSlot,
  type Loadout,
} from '@/lib/survival/equipment';
import { gearMult } from '@/lib/survival/upgrade';
import type { GearInstance, Stack } from '@/lib/survival/types';
import type { ActiveFoodBuff } from '@/lib/survival/culinary';
import type { OwnedPet } from '@/lib/survival/pets';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  level: number;
  gear: GearInstance[];
  storedGear?: GearInstance[];
  loadout: Loadout;
  activeBuffs?: ActiveFoodBuff[];
  pets?: OwnedPet[];
  permanentStats?: {
    maxHpBonus?: number;
    atkBonus?: number;
    defBonus?: number;
    carryBonus?: number;
  };
  onEquip: (slot: GearSlot, uid: string | null) => void;
  onDropGear?: (uid: string) => void;
  onStoreGear?: (uid: string) => void;
  onRetrieveGear?: (uid: string) => void;
  canStoreInBase?: boolean;
}

export default function StatusEquipmentModal({
  open,
  onClose,
  level,
  gear = [],
  storedGear = [],
  loadout,
  activeBuffs = [],
  pets = [],
  permanentStats = {},
  onEquip,
  onDropGear,
  onStoreGear,
  onRetrieveGear,
  canStoreInBase = true,
}: Props) {
  const [selectedGear, setSelectedGear] = useState<GearInstance | null>(null);
  const [targetSlot, setTargetSlot] = useState<GearSlot | null>(null);

  if (!open) return null;

  // 1. Calculate Base Gear Stats
  let gearAtk = 0;
  let gearDef = 0;
  let gearGather = 0;
  let gearLootBonus = 0;
  let gearXpBonus = 0;
  const specialEffects: string[] = [];

  for (const [slotKey, g] of Object.entries(loadout) as [GearSlot, GearInstance | null][]) {
    if (!g) continue;
    const it = ITEMS[g.itemId];
    if (!it) continue;
    const m = gearMult(g);

    if (it.weapon) {
      const atk = Math.round(it.weapon.atk * m);
      gearAtk += atk;
      if (it.weapon.ranged) specialEffects.push('원거리 저격');
    }
    if (it.armor) {
      const def = Math.round(it.armor.def * m);
      gearDef += def;
    }
    if (it.tool) {
      const pow = Math.round(it.tool.power * m * 10) / 10;
      gearGather = Math.max(gearGather, pow);
      if (it.tool.chop) specialEffects.push(`벌목 ${it.tool.chop}단계`);
      if (it.tool.mine) specialEffects.push(`채굴 ${it.tool.mine}단계`);
    }
    if (it.trinket) {
      gearLootBonus += it.trinket.lootBonus;
      gearXpBonus += it.trinket.xpBonus;
      if (it.trinket.lootBonus > 0) specialEffects.push(`전리품 +${Math.round(it.trinket.lootBonus * 100)}%`);
      if (it.trinket.xpBonus > 0) specialEffects.push(`경험치 +${Math.round(it.trinket.xpBonus * 100)}%`);
    }
    if (g.quality === 'MASTERWORK') specialEffects.push('명품 장인의 숨결 (+15% 위력)');
  }

  // 2. Extra bonus stats from buffs, pets, permanent stats
  let buffAtk = permanentStats.atkBonus ?? 0;
  let buffDef = permanentStats.defBonus ?? 0;
  let buffHp = permanentStats.maxHpBonus ?? 0;

  // Buffs
  for (const b of activeBuffs) {
    if (b.effects.atkBonusPct) {
      buffAtk += Math.round(gearAtk * b.effects.atkBonusPct / 100);
      specialEffects.push(`식사 버프: ${b.name}`);
    }
    if (b.effects.defBonusPct) {
      buffDef += Math.round(gearDef * b.effects.defBonusPct / 100);
      specialEffects.push(`식사 버프: ${b.name}`);
    }
  }

  // Pets
  for (const p of pets) {
    if (p.level >= 2) {
      buffAtk += Math.floor(p.level * 0.5);
      buffDef += Math.floor(p.level * 0.3);
    }
  }

  const wornUids = new Set(
    Object.values(loadout)
      .filter((g): g is GearInstance => !!g)
      .map(g => g.uid)
  );

  // Carried spare gear in backpack
  const carriedGear = gear.filter(g => !wornUids.has(g.uid));

  const handleOpenActionPopup = (g: GearInstance, slot?: GearSlot) => {
    setSelectedGear(g);
    setTargetSlot(slot ?? null);
  };

  const handleEquipItem = (g: GearInstance) => {
    const it = ITEMS[g.itemId];
    if (!it) return;

    // Find suitable slot
    let slot: GearSlot = 'weapon';
    if (it.category === 'weapon') slot = 'weapon';
    else if (it.category === 'armor') slot = 'armor';
    else if (it.category === 'trinket') slot = 'trinket';
    else if (it.category === 'tool') {
      slot = !loadout.tool1 ? 'tool1' : 'tool2';
    } else {
      slot = 'extra';
    }

    onEquip(slot, g.uid);
    toast.success(`${it.name}을(를) 착용했습니다.`);
    setSelectedGear(null);
  };

  const handleUnequipItem = (slot: GearSlot) => {
    onEquip(slot, null);
    toast.info('장비를 해제했습니다.');
    setSelectedGear(null);
  };

  const handleDropItem = (uid: string) => {
    if (onDropGear) {
      onDropGear(uid);
      toast.warning('장비를 바닥에 버렸습니다.');
    }
    setSelectedGear(null);
  };

  const handleStoreItem = (uid: string) => {
    if (!canStoreInBase) {
      toast.warning('거점 안에서만 창고에 보관할 수 있습니다.');
      return;
    }
    if (targetSlot) {
      onEquip(targetSlot, null);
    }
    if (onStoreGear) {
      onStoreGear(uid);
      toast.success('거점 창고에 장비를 보관했습니다.');
    }
    setSelectedGear(null);
  };

  return (
    <div
      role="dialog"
      aria-label="유저 캐릭터 상태창"
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/20 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>내 상태창 & 착용 장비</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-bold">
                Lv.{level}
              </span>
            </h1>
            <p className="text-[10px] text-muted-foreground">
              장비 착용 스탯과 펫·버프 추가 능력치, 특수 효과를 확인하세요
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pixel-btn flex h-9 w-9 items-center justify-center rounded border border-border bg-card p-1 text-foreground"
          aria-label="닫기"
        >
          <X className="!h-5 !w-5" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* 1. 장비 능력치 (종합 스탯 + 초록색 추가치 + 특수효과) */}
        <div className="rounded-lg border-2 border-border bg-card p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
            <span className="font-bold text-xs flex items-center gap-1 text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>장비 능력치 종합</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              초록색: 버프·펫·영구보약 상승치
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* 공격력 */}
            <div className="rounded border border-border/80 bg-background/80 p-2 space-y-0.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Swords className="h-3 w-3 text-amber-500" />
                <span>공격력</span>
              </span>
              <div className="flex items-baseline gap-1 font-bold">
                <span className="text-sm text-foreground">{gearAtk}</span>
                {buffAtk > 0 && (
                  <span className="text-xs text-emerald-400 font-mono font-bold">
                    (+{buffAtk})
                  </span>
                )}
              </div>
            </div>

            {/* 방어력 */}
            <div className="rounded border border-border/80 bg-background/80 p-2 space-y-0.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3 text-sky-500" />
                <span>방어력</span>
              </span>
              <div className="flex items-baseline gap-1 font-bold">
                <span className="text-sm text-foreground">{gearDef}</span>
                {buffDef > 0 && (
                  <span className="text-xs text-emerald-400 font-mono font-bold">
                    (+{buffDef})
                  </span>
                )}
              </div>
            </div>

            {/* 채집 속도 */}
            <div className="rounded border border-border/80 bg-background/80 p-2 space-y-0.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Pickaxe className="h-3 w-3 text-emerald-500" />
                <span>채집 속도</span>
              </span>
              <div className="flex items-baseline gap-1 font-bold">
                <span className="text-sm text-foreground">+{gearGather.toFixed(1)}</span>
              </div>
            </div>

            {/* 체력 보너스 */}
            <div className="rounded border border-border/80 bg-background/80 p-2 space-y-0.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-500" />
                <span>추가 체력</span>
              </span>
              <div className="flex items-baseline gap-1 font-bold">
                <span className="text-sm text-emerald-400 font-mono">
                  {buffHp > 0 ? `+${buffHp}` : '기본'}
                </span>
              </div>
            </div>
          </div>

          {/* 특수 효과 표기 */}
          <div className="rounded bg-muted/40 p-2 text-[11px] space-y-1">
            <span className="font-bold text-muted-foreground block text-[10px]">
              ⭐ 발동 중인 특수 효과:
            </span>
            {specialEffects.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {specialEffects.map((eff, i) => (
                  <span
                    key={i}
                    className="rounded bg-primary/10 border border-primary/30 px-2 py-0.5 text-primary font-medium"
                  >
                    {eff}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">현재 활성화된 특수 효과가 없습니다.</span>
            )}
          </div>
        </div>

        {/* 2. 장비 목록 6슬롯 (무기, 방어구, 부적, 기타, 채집1, 채집2) */}
        <div className="rounded-lg border-2 border-border bg-card p-3 space-y-2">
          <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
            <span>🛡️</span>
            <span>착용 장비 목록 (6슬롯)</span>
          </span>

          <div className="grid grid-cols-2 gap-2">
            {GEAR_SLOTS.map(slot => {
              const g = loadout[slot.id];
              const it = g ? ITEMS[g.itemId] : null;

              return (
                <div
                  key={slot.id}
                  onClick={() => {
                    if (g) handleOpenActionPopup(g, slot.id);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all cursor-pointer ${
                    g
                      ? 'border-primary/60 bg-primary/5 hover:bg-primary/10 active:scale-[0.98]'
                      : 'border-dashed border-border bg-muted/20 text-muted-foreground'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-background border border-border shadow-inner text-xl">
                    {slot.id === 'weapon'
                      ? '⚔️'
                      : slot.id === 'armor'
                      ? '🛡️'
                      : slot.id === 'trinket'
                      ? '🧿'
                      : slot.id === 'extra'
                      ? '💍'
                      : '⛏️'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-muted-foreground block">
                      {slot.label}
                    </span>
                    {it ? (
                      <div>
                        <b className="text-xs text-foreground truncate block">
                          {it.name}{g?.plus ? ` +${g.plus}` : ''}
                        </b>
                        <span className="text-[10px] text-primary block truncate">
                          {it.weapon ? `공격 +${it.weapon.atk}` : it.armor ? `방어 +${it.armor.def}` : it.tool ? `채취 +${it.tool.power}` : '특수'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">비어 있음</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 장비가능한 품목 (배낭 소지 장비: 아이콘과 이름만!) */}
        <div className="rounded-lg border-2 border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
              <Backpack className="h-4 w-4 text-emerald-400" />
              <span>장비 가능한 품목 (배낭 보관)</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {carriedGear.length}개 보유
            </span>
          </div>

          {carriedGear.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {carriedGear.map(g => {
                const it = ITEMS[g.itemId];
                if (!it) return null;

                return (
                  <button
                    key={g.uid}
                    type="button"
                    onClick={() => handleOpenActionPopup(g)}
                    className="flex items-center gap-2 rounded-md border border-border/80 bg-background/80 p-2 text-left hover:border-primary transition-all active:scale-95 shadow-sm"
                  >
                    <span className="text-lg shrink-0">
                      {it.category === 'weapon'
                        ? '⚔️'
                        : it.category === 'armor'
                        ? '🛡️'
                        : it.category === 'trinket'
                        ? '🧿'
                        : '⛏️'}
                    </span>
                    <span className="font-bold text-xs text-foreground truncate flex-1">
                      {it.name}{g.plus ? ` +${g.plus}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic py-2 text-center">
              배낭에 착용 가능한 여분의 장비가 없습니다.
            </p>
          )}
        </div>

        {/* 4. 거점 창고 보관 장비 (창고에 보관된 장비가 있을 경우) */}
        {storedGear && storedGear.length > 0 && (
          <div className="rounded-lg border border-border bg-card/60 p-3 space-y-2">
            <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
              <Archive className="h-4 w-4 text-amber-500" />
              <span>거점 창고 보관 장비</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {storedGear.map(g => {
                const it = ITEMS[g.itemId];
                if (!it) return null;

                return (
                  <button
                    key={g.uid}
                    type="button"
                    onClick={() => {
                      if (onRetrieveGear) {
                        onRetrieveGear(g.uid);
                        toast.success(`${it.name}을(를) 배낭으로 꺼냈습니다.`);
                      }
                    }}
                    className="flex items-center gap-2 rounded border border-border bg-background p-1.5 text-left hover:border-amber-500 text-xs"
                  >
                    <span>📦</span>
                    <span className="truncate">{it.name}{g.plus ? ` +${g.plus}` : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 장비 클릭 시 액션 팝업: [장비 착용 / 해제] [버리기] [창고에 보관] */}
      {selectedGear && (() => {
        const it = ITEMS[selectedGear.itemId];
        const isWorn = wornUids.has(selectedGear.uid);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
            <div className="pixel-frame w-full max-w-xs bg-card p-4 space-y-3 border-2 border-primary shadow-xl">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {it?.category === 'weapon'
                      ? '⚔️'
                      : it?.category === 'armor'
                      ? '🛡️'
                      : it?.category === 'trinket'
                      ? '🧿'
                      : '⛏️'}
                  </span>
                  <div>
                    <b className="text-sm text-foreground">
                      {it?.name}{selectedGear.plus ? ` +${selectedGear.plus}` : ''}
                    </b>
                    <span className="text-[10px] text-muted-foreground block">
                      내구도: {selectedGear.durability}/{selectedGear.maxDurability}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGear(null)}
                  className="pixel-btn p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {it?.desc}
              </p>

              <div className="space-y-1.5 pt-1">
                {isWorn ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (targetSlot) handleUnequipItem(targetSlot);
                    }}
                    className="pixel-btn w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2"
                  >
                    장비 해제
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleEquipItem(selectedGear)}
                    className="pixel-btn w-full bg-primary text-primary-foreground font-bold text-xs py-2 shadow"
                  >
                    장비 착용
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleStoreItem(selectedGear.uid)}
                  className="pixel-btn w-full text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <Archive className="h-3.5 w-3.5 text-amber-500" />
                  <span>창고에 보관</span>
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDropItem(selectedGear.uid)}
                  className="pixel-btn w-full text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>버리기</span>
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
