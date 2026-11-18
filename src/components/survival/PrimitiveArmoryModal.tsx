import { useMemo, useState } from 'react';
import { Flame, Hammer, Minus, Plus, Sparkles, Swords, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import {
  armorySuccessChance,
  armoryUpgradeCost,
  MAX_ARMORY_PLUS,
  weaponAtkWithPlus,
  weaponAuraForPlus,
} from '@/lib/survival/upgrade';
import {
  MATERIAL_PHYSICS,
  MATERIAL_TIER,
  physicsSignal,
  type InventionInput,
} from '@/lib/survival/invention';
import { fallbackInventionName, type InventedItem } from '@/lib/survival/inventedItems';
import { matchBlueprint } from '@/lib/survival/blueprints';
import { addStacks, hasAll } from '@/lib/survival/inventory';
import type { GearInstance, Stack } from '@/lib/survival/types';

import hatchetImg from '@/assets/survival/item-flint-hatchet.png';
import daggerImg from '@/assets/survival/item-bone-dagger.png';
import obsidianSpearImg from '@/assets/survival/item-obsidian-spear.png';
import flintSpearImg from '@/assets/survival/item-flint-spear.png';
import bowImg from '@/assets/survival/item-bone-bow.png';
import obsidianAxeImg from '@/assets/survival/item-obsidian-axe.png';
import clubImg from '@/assets/survival/item-wooden-club.png';
import maulImg from '@/assets/survival/item-stone-maul.png';
import slingImg from '@/assets/survival/item-sling.png';
import CulinaryDishIcon from './CulinaryDishIcon';

const WEAPON_ICON_MAP: Partial<Record<ItemId, string>> = {
  flint_hatchet: hatchetImg,
  bone_dagger: daggerImg,
  obsidian_spear: obsidianSpearImg,
  flint_spear: flintSpearImg,
  bone_bow: bowImg,
  sling: slingImg,
  obsidian_axe: obsidianAxeImg,
  wooden_club: clubImg,
  stone_maul: maulImg,
};

export const SIGNATURE_WEAPONS: {
  itemId: ItemId;
  label: string;
  cost: Stack[];
}[] = [
  {
    itemId: 'flint_hatchet',
    label: '돌도끼',
    cost: [
      { itemId: 'flint', count: 2 },
      { itemId: 'branch', count: 2 },
      { itemId: 'cordage', count: 1 },
    ],
  },
  {
    itemId: 'bone_dagger',
    label: '뼈단검',
    cost: [
      { itemId: 'bone', count: 2 },
      { itemId: 'flint', count: 1 },
      { itemId: 'cordage', count: 1 },
    ],
  },
  {
    itemId: 'obsidian_spear',
    label: '흑요석 창',
    cost: [
      { itemId: 'obsidian', count: 2 },
      { itemId: 'log', count: 1 },
      { itemId: 'cordage', count: 1 },
    ],
  },
  {
    itemId: 'bone_bow',
    label: '뼈 활 (원거리)',
    cost: [
      { itemId: 'bone', count: 2 },
      { itemId: 'branch', count: 3 },
      { itemId: 'cordage', count: 2 },
    ],
  },
  {
    itemId: 'sling',
    label: '새총·물매 (원거리)',
    cost: [
      { itemId: 'hide', count: 1 },
      { itemId: 'cordage', count: 2 },
    ],
  },
];

export const RANGED_AMMO_BUNDLES: {
  itemId: 'arrow' | 'sling_stone';
  label: string;
  bundleCount: number;
  desc: string;
  cost: Stack[];
}[] = [
  {
    itemId: 'arrow',
    label: '화살 묶음 (×8발)',
    bundleCount: 8,
    desc: '활 사격 시 1발씩 소모 (배낭에 자동 보관)',
    cost: [
      { itemId: 'branch', count: 1 },
      { itemId: 'flint', count: 1 },
    ],
  },
  {
    itemId: 'sling_stone',
    label: '돌멩이 탄환 (×10개)',
    bundleCount: 10,
    desc: '새총·물매 사격 시 1개씩 소모 (배낭에 자동 보관)',
    cost: [{ itemId: 'flint', count: 1 }],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  gear: GearInstance[];
  storage: Stack[];
  backpack: Stack[];
  altar: boolean;
  onForgeSignatureWeapon: (itemId: ItemId, cost: Stack[]) => boolean;
  onCraftAmmoBundle?: (itemId: 'arrow' | 'sling_stone' | 'javelin', count: number, cost: Stack[]) => boolean;
  onInventWeapon: (
    input: InventionInput,
    naming: { name: string; desc: string; masterwork?: boolean; ranged?: boolean }
  ) => InventedItem | null;
  onEnhanceWeapon: (uid: string) => { ok: boolean; plus: number };
  onOpenIntentCrafting?: () => void;
}

export default function PrimitiveArmoryModal({
  open,
  onClose,
  gear,
  storage,
  backpack,
  altar,
  onForgeSignatureWeapon,
  onCraftAmmoBundle,
  onInventWeapon,
  onEnhanceWeapon,
  onOpenIntentCrafting,
}: Props) {
  const [activeTab, setActiveTab] = useState<'both' | 'develop' | 'enhance'>('both');
  const [mats, setMats] = useState<Record<string, number>>({});
  const [sparkUid, setSparkUid] = useState<string | null>(null);

  const owned = useMemo(() => addStacks(storage, backpack), [storage, backpack]);
  const have = (id: string) =>
    owned.filter(s => s.itemId === id).reduce((n, s) => n + s.count, 0);

  const input: InventionInput = {
    category: 'weapon',
    materials: mats,
    heat: true,
    sacred: altar,
  };
  const signal = useMemo(() => physicsSignal(input, true), [mats, altar]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const weapons = gear.filter(g => {
    const def = ITEMS[g.itemId];
    return !!(def && (def.weapon || def.tool));
  });

  const usableMats = Object.keys(MATERIAL_PHYSICS).filter(id => have(id) > 0);
  const selectedKeys = Object.keys(mats);

  const stepMat = (id: string, delta: number) => {
    setMats(prev => {
      if (delta > 0 && !prev[id] && Object.keys(prev).length >= 4) return prev;
      const nextCount = Math.max(0, Math.min(have(id), 20, (prev[id] ?? 0) + delta));
      const next = { ...prev, [id]: nextCount };
      if (!nextCount) delete next[id];
      return next;
    });
  };

  const handleInventWeapon = () => {
    if (!signal.result.ok) return;
    const bp = matchBlueprint('weapon', mats);
    const naming = bp
      ? { name: bp.name, desc: bp.desc, ranged: bp.ranged, masterwork: signal.kind === 'sacred' }
      : {
          name: fallbackInventionName('weapon', mats),
          desc: '석기 무기 제작소에서 고열로 벼려낸 원시 무기.',
          masterwork: signal.kind === 'sacred',
        };
    const made = onInventWeapon(input, naming);
    if (made) setMats({});
  };

  const handleEnhance = (uid: string) => {
    const res = onEnhanceWeapon(uid);
    if (res.ok) {
      setSparkUid(uid);
      window.setTimeout(() => setSparkUid(prev => (prev === uid ? null : prev)), 1100);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="석기·원시 무기 제작소"
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* Fullscreen Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <div>
            <b className="text-sm">석기·원시 무기 제작소 (Primitive Armory)</b>
            <p className="text-[10px] text-muted-foreground">
              상단 [무기 개발/발명] · 하단 [무기 +1 ~ +10강 강화 & 픽셀 오라]
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="무기 제작소 닫기"
          onClick={onClose}
          className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
        >
          <X className="!h-4 !w-4" />
        </button>
      </div>

      {/* Section View Switcher */}
      <div role="tablist" className="grid grid-cols-3 gap-1 border-b border-border bg-background px-3 py-1.5">
        {(
          [
            ['both', '상·하단 통합 보기'],
            ['develop', '🔨 상단: 무기 개발/발명'],
            ['enhance', '⚡ 하단: 무기 강화 (+1~+10)'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            size="sm"
            variant={activeTab === id ? 'default' : 'outline'}
            onClick={() => setActiveTab(id)}
            className="pixel-btn h-auto min-h-0 py-1.5 px-2 text-xs"
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* AI Intent Crafting Banner */}
        {onOpenIntentCrafting && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-orange-400" />
              <div>
                <span className="font-bold text-xs text-orange-950">AI 맞춤 무기·도구·방어구 제련소</span>
                <p className="text-[10px] text-muted-foreground">자연어로 용도를 적으면 재료 물리 속성을 분석해 맞춤 특수 효과 부여</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={onOpenIntentCrafting}
              className="pixel-btn h-auto min-h-0 bg-orange-600 text-white font-bold py-1 px-2.5 text-xs hover:bg-orange-500 shrink-0"
            >
              ✨ AI 제련실 열기
            </Button>
          </div>
        )}

        {/* UPPER SECTION: [무기 개발/발명] */}
        {(activeTab === 'both' || activeTab === 'develop') && (
          <section
            aria-label="무기 개발 및 발명"
            className="pixel-frame space-y-2.5 bg-card p-2.5"
          >
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <b className="flex items-center gap-1.5 text-sm">
                <Hammer className="!h-4 !w-4 text-primary" />
                [무기 개발 / 발명]
              </b>
              <span className="text-[10px] text-muted-foreground">
                4대 대표 원시 무기 즉시 주조 & 신소재 무기 발명
              </span>
            </div>

            {/* 4 Signature Weapons Quick Forge */}
            <div>
              <span className="text-[11px] font-bold">대표 원시 무기 즉시 제작 (돌도끼 · 뼈단검 · 흑요석 창 · 활)</span>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {SIGNATURE_WEAPONS.map(w => {
                  const def = ITEMS[w.itemId];
                  const canMake = hasAll(owned, w.cost);
                  const costStr = w.cost
                    .map(c => `${ITEMS[c.itemId]?.name ?? c.itemId} ${c.count}`)
                    .join(' · ');
                  return (
                    <div
                      key={w.itemId}
                      className="pixel-box flex items-center justify-between gap-1.5 bg-background p-1.5"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <img
                          src={WEAPON_ICON_MAP[w.itemId] ?? hatchetImg}
                          alt=""
                          className="pixelated h-7 w-7 shrink-0 object-contain"
                        />
                        <div className="min-w-0 leading-tight">
                          <b className="block truncate">{w.label}</b>
                          <span className="block text-[10px] text-primary">
                            공격력 +{def?.weapon?.atk ?? 4}
                            {def?.weapon?.ranged ? ' · 원거리' : ''}
                          </span>
                          <span className="block truncate text-[9px] text-muted-foreground">
                            {costStr}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!canMake}
                        onClick={() => onForgeSignatureWeapon(w.itemId, w.cost)}
                        className="pixel-btn h-auto min-h-0 shrink-0 py-1 px-2 text-xs"
                      >
                        제작
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ranged Ammo Crafting (Arrows & Sling Stones -> Stored directly into Backpack) */}
            <div className="space-y-1 border-t border-border pt-2">
              <div className="flex items-center justify-between">
                <b className="text-[11px] text-primary">🏹 원거리 전용 탄약 제조 (배낭에 즉시 구비 · 1회 사격 시 1개 소진)</b>
                <span className="text-[10px] text-muted-foreground">
                  배낭 보유: 화살 {backpack.find(s => s.itemId === 'arrow')?.count ?? 0}발 · 돌멩이{' '}
                  {backpack.find(s => s.itemId === 'sling_stone')?.count ?? 0}개
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {RANGED_AMMO_BUNDLES.map(ammo => {
                  const canCraft = hasAll(owned, ammo.cost);
                  const costStr = ammo.cost
                    .map(c => `${ITEMS[c.itemId]?.name ?? c.itemId} ${c.count}`)
                    .join(' · ');
                  return (
                    <div
                      key={ammo.itemId}
                      data-ammo-craft={ammo.itemId}
                      className="pixel-box flex items-center justify-between gap-2 bg-background p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-foreground bg-card">
                          <CulinaryDishIcon itemId={ammo.itemId} size={22} />
                        </div>
                        <div className="leading-tight">
                          <b>{ammo.label}</b>
                          <p className="text-[10px] text-muted-foreground">{ammo.desc}</p>
                          <span className="text-[10px] font-bold text-primary">재료: {costStr}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!canCraft}
                        onClick={() =>
                          onCraftAmmoBundle?.(ammo.itemId, ammo.bundleCount, ammo.cost)
                        }
                        className="pixel-btn h-auto min-h-0 shrink-0 py-1.5 px-2.5 text-xs font-bold"
                      >
                        제조 (+{ammo.bundleCount})
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Weapon Invention Slots */}
            <div className="space-y-1.5 border-t border-border pt-2">
              <div className="flex items-center justify-between">
                <b className="text-xs">신소재 무기 조합 발명 (최대 4슬롯)</b>
                <span className="text-[10px] text-primary">
                  {signal.result.ok
                    ? `예상 공격력 +${Math.round(signal.result.power)}`
                    : '날카로운 재료 + 결합재를 조합하세요'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 4 }, (_, i) => {
                  const k = selectedKeys[i];
                  return (
                    <div
                      key={i}
                      className="pixel-box flex h-11 items-center justify-center bg-background px-1 text-center text-[11px]"
                    >
                      {k ? `${ITEMS[k as ItemId]?.name ?? k} ×${mats[k]}` : '빈 슬롯'}
                    </div>
                  );
                })}
              </div>
              <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                {usableMats.map(id => (
                  <div
                    key={id}
                    className="pixel-box flex items-center gap-1 bg-background px-1.5 py-0.5 text-[11px]"
                  >
                    <span className="font-bold text-primary">T{MATERIAL_TIER[id] ?? 1}</span>
                    <span>
                      {ITEMS[id as ItemId]?.name ?? id}({have(id)})
                    </span>
                    <button
                      type="button"
                      aria-label={`${ITEMS[id as ItemId]?.name ?? id} 빼기`}
                      onClick={() => stepMat(id, -1)}
                      className="px-1 font-bold"
                    >
                      -
                    </button>
                    <b>{mats[id] ?? 0}</b>
                    <button
                      type="button"
                      aria-label={`${ITEMS[id as ItemId]?.name ?? id} 추가`}
                      onClick={() => stepMat(id, 1)}
                      className="px-1 font-bold text-primary"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                disabled={!signal.result.ok}
                onClick={handleInventWeapon}
                className="pixel-btn h-auto min-h-0 w-full gap-1 py-1.5 px-2.5 text-xs"
              >
                <Sparkles className="!h-4 !w-4" />
                새로운 원시 무기 발명하기
              </Button>
            </div>
          </section>
        )}

        {/* LOWER SECTION: [무기 강화 (+1 ~ +10강)] */}
        {(activeTab === 'both' || activeTab === 'enhance') && (
          <section
            aria-label="무기 강화"
            className="pixel-frame space-y-2.5 bg-card p-2.5"
          >
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <b className="flex items-center gap-1.5 text-sm">
                <Zap className="!h-4 !w-4 text-accent" />
                [무기 강화 · +1 ~ +{MAX_ARMORY_PLUS}강]
              </b>
              <span className="text-[10px] text-muted-foreground">
                광석·뼈·가죽 소모 · 단계별 픽셀 광택(Aura) & 공격력 상승
              </span>
            </div>

            {!weapons.length ? (
              <p className="py-4 text-center text-muted-foreground">
                보유 중인 무기가 없습니다. 상단 [무기 개발/발명]에서 돌도끼·뼈단검·흑요석 창·활을 먼저 제작하세요!
              </p>
            ) : (
              <div className="space-y-2">
                {weapons.map(w => {
                  const def = ITEMS[w.itemId];
                  const plus = w.plus ?? 0;
                  const baseAtk = def?.weapon?.atk ?? Math.round((def?.tool?.power ?? 1) * 4);
                  const curAtk = weaponAtkWithPlus(baseAtk, plus);
                  const nextAtk = weaponAtkWithPlus(baseAtk, Math.min(MAX_ARMORY_PLUS, plus + 1));
                  const aura = weaponAuraForPlus(plus);
                  const cost = armoryUpgradeCost(w);
                  const canPay = cost ? hasAll(owned, cost) : false;
                  const chancePct = Math.round(armorySuccessChance(plus) * 100);
                  const isSparking = sparkUid === w.uid;

                  return (
                    <div
                      key={w.uid}
                      data-armory-weapon={w.itemId}
                      data-weapon-plus={plus}
                      className={`pixel-box flex flex-col gap-1.5 bg-background p-2 transition-all ${
                        isSparking ? 'ring-2 ring-amber-400 scale-[1.01]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Weapon Icon with Pixel Aura Effect */}
                        <div
                          data-weapon-aura={aura.tierName}
                          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-none transition-shadow ${aura.ringClass}`}
                          style={{ boxShadow: aura.glowStyle }}
                        >
                          <img
                            src={WEAPON_ICON_MAP[w.itemId] ?? hatchetImg}
                            alt={def?.name ?? w.itemId}
                            className="pixelated h-8 w-8 object-contain"
                          />
                          {plus > 0 && (
                            <span
                              className={`absolute -right-1 -top-1 px-1 text-[9px] leading-tight ${aura.badgeClass}`}
                            >
                              +{plus}
                            </span>
                          )}
                          {(plus >= 4 || isSparking) && (
                            <Sparkles
                              aria-hidden
                              className="pointer-events-none absolute -bottom-1 -left-1 !h-3.5 !w-3.5 animate-ping text-amber-300"
                            />
                          )}
                        </div>

                        {/* Weapon Name, Aura Badge & Attack Stat Rise */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <b className="text-sm">
                              {def?.name ?? w.itemId} {plus > 0 ? `+${plus}강` : ''}
                            </b>
                            <span className={`px-1.5 py-0.5 text-[9px] ${aura.badgeClass}`}>
                              ✨ {aura.tierName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span>
                              공격력: <b className="text-primary">{curAtk}</b>
                              {plus > 0 && (
                                <span className="ml-1 text-[10px] text-emerald-600">
                                  (기본 {baseAtk} + 강화보너스 {curAtk - baseAtk})
                                </span>
                              )}
                            </span>
                            {plus < MAX_ARMORY_PLUS && (
                              <span className="font-bold text-amber-600">
                                → +{plus + 1}강 시 {nextAtk} (+{nextAtk - curAtk} 상승)
                              </span>
                            )}
                          </div>
                          {cost ? (
                            <p className="text-[10px] text-muted-foreground">
                              필요 재료:{' '}
                              {cost
                                .map(c => `${ITEMS[c.itemId]?.name ?? c.itemId} ${c.count}`)
                                .join(' · ')}{' '}
                              · 성공률 {chancePct}%
                            </p>
                          ) : (
                            <p className="text-[10px] font-bold text-amber-600">
                              최고 단계(+{MAX_ARMORY_PLUS}강) 신화 무기에 도달했습니다!
                            </p>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          disabled={!cost || !canPay}
                          onClick={() => handleEnhance(w.uid)}
                          className="pixel-btn h-auto min-h-0 shrink-0 gap-1 py-1.5 px-2.5 text-xs"
                        >
                          <Swords className="!h-4 !w-4" />
                          {cost ? `+${plus + 1}강 강화` : 'MAX'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
