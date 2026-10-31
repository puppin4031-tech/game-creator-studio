import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { haversineDistance } from '@/lib/haversine';
import {
  ENTITIES, EntityType, GearItem, ITEMS, Recipe, Stack, SURVIVAL_CONFIG,
  addStacks, addToBackpack, buildGear, canCraft, rollLoot, splitDeathDrop, stackWeight, QUALITY_LABEL, Quality,
} from '@/lib/survival';

export interface WorldEntity { id: string; type: EntityType; lat: number; lng: number; hp: number }
export interface DropPile { id: string; lat: number; lng: number; items: Stack[] }
export interface LatLng { lat: number; lng: number }

const ENTITY_POOL: EntityType[] = ['BRANCH_PILE', 'BRANCH_PILE', 'FLINT_ROCK', 'FLINT_ROCK', 'CLAY_PIT', 'OAK_TREE', 'OAK_TREE', 'OBSIDIAN_ROCK', 'BOAR', 'RAPTOR'];

function spawnAround(center: LatLng, n: number): WorldEntity[] {
  return Array.from({ length: n }, () => {
    const r = 15 + Math.random() * (SURVIVAL_CONFIG.scanRadiusM - 15);
    const a = Math.random() * Math.PI * 2;
    const type = ENTITY_POOL[Math.floor(Math.random() * ENTITY_POOL.length)];
    return {
      id: crypto.randomUUID(), type,
      lat: center.lat + (r * Math.cos(a)) / 111_320,
      lng: center.lng + (r * Math.sin(a)) / (111_320 * Math.cos((center.lat * Math.PI) / 180)),
      hp: ENTITIES[type].hp,
    };
  });
}

export function useSurvivalGame(initial: LatLng) {
  const [pos, setPos] = useState<LatLng>(initial);
  const [base, setBase] = useState<LatLng>(initial);
  const [entities, setEntities] = useState<WorldEntity[]>(() => spawnAround(initial, 10));
  const [drops, setDrops] = useState<DropPile[]>([]);
  const [hp, setHp] = useState(100);
  const [backpack, setBackpack] = useState<Stack[]>([]);
  const [storage, setStorage] = useState<Stack[]>([]);
  const [gear, setGear] = useState<GearItem[]>([]);
  const [equippedToolId, setEquippedToolId] = useState<string | null>(null);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null);
  const [nextScanAt, setNextScanAt] = useState(Date.now() + SURVIVAL_CONFIG.tickMs);

  const distToBase = haversineDistance(pos.lat, pos.lng, base.lat, base.lng);
  const inBase = distToBase <= SURVIVAL_CONFIG.baseRadiusM;
  const tool = gear.find((g) => g.instanceId === equippedToolId) ?? null;
  const weapon = gear.find((g) => g.instanceId === equippedWeaponId) ?? null;

  const scan = useCallback(() => {
    setEntities((prev) => {
      const kept = prev.filter((e) => haversineDistance(pos.lat, pos.lng, e.lat, e.lng) <= SURVIVAL_CONFIG.scanRadiusM * 1.5);
      return [...kept, ...spawnAround(pos, Math.max(0, 10 - kept.length))];
    });
    setNextScanAt(Date.now() + SURVIVAL_CONFIG.tickMs);
  }, [pos]);

  // 60s tick scanner
  const scanRef = useRef(scan);
  scanRef.current = scan;
  useEffect(() => {
    const t = setInterval(() => { if (Date.now() >= nextScanAt) scanRef.current(); }, 1000);
    return () => clearInterval(t);
  }, [nextScanAt]);

  // Auto deposit + heal when entering base
  useEffect(() => {
    if (!inBase) return;
    if (backpack.length > 0) {
      const total = backpack.reduce((s, x) => s + x.count, 0);
      setStorage((s) => addStacks(s, backpack));
      setBackpack([]);
      toast.success(`거점에 무사히 귀환! 자원 ${total}개를 창고에 보관했습니다`);
    }
    setHp(100);
  }, [inBase, backpack]);

  // Pick up dropped piles on walk-over
  useEffect(() => {
    const near = drops.find((d) => haversineDistance(pos.lat, pos.lng, d.lat, d.lng) <= 15);
    if (!near) return;
    const r = addToBackpack(backpack, near.items);
    setBackpack(r.backpack);
    setDrops((ds) => ds.filter((d) => d.id !== near.id));
    toast('흘린 자원을 다시 주웠습니다');
  }, [pos, drops, backpack]);

  const wearGear = (id: string | null) => {
    if (!id) return;
    setGear((gs) => gs.flatMap((g) => {
      if (g.instanceId !== id) return [g];
      const d = g.durability - 1;
      if (d <= 0) { toast.error(`${ITEMS[g.itemId].name}이(가) 부러졌습니다!`); return []; }
      return [{ ...g, durability: d }];
    }));
  };

  const die = useCallback(() => {
    const { dropped, kept } = splitDeathDrop(backpack);
    if (dropped.length) setDrops((d) => [...d, { id: crypto.randomUUID(), lat: pos.lat, lng: pos.lng, items: dropped }]);
    setBackpack(kept);
    setHp(100);
    setPos(base);
    toast.error('쓰러졌습니다… 배낭 자원 30%를 그 자리에 흘리고 거점에서 부활합니다');
  }, [backpack, pos, base]);

  const interact = useCallback((entityId: string): { ok: boolean; message: string } => {
    const e = entities.find((x) => x.id === entityId);
    if (!e) return { ok: false, message: '대상이 사라졌습니다' };
    const def = ENTITIES[e.type];
    if (haversineDistance(pos.lat, pos.lng, e.lat, e.lng) > SURVIVAL_CONFIG.interactRadiusM)
      return { ok: false, message: `너무 멉니다 (${SURVIVAL_CONFIG.interactRadiusM}m 이내로 접근)` };

    let dmg = 1;
    let selfDmg = 0;
    if (def.isCreature) {
      dmg = weapon?.atk ?? 3;
      selfDmg = def.atk;
      wearGear(weapon?.instanceId ?? null);
    } else {
      const tier = tool?.gatherTier ?? 0;
      if (tier < def.requiredToolTier) {
        selfDmg = SURVIVAL_CONFIG.bareHandHpPenalty;
        if (Math.random() < 0.5) {
          const nh = hp - selfDmg;
          if (nh <= 0) die(); else setHp(nh);
          return { ok: false, message: `도구가 부족합니다! 채집 실패 (HP -${selfDmg})` };
        }
      }
      wearGear(tool?.instanceId ?? null);
    }

    const nh = hp - selfDmg;
    const newHp = e.hp - dmg;
    if (nh <= 0) { die(); return { ok: false, message: '쓰러졌습니다' }; }
    setHp(nh);

    if (newHp > 0) {
      setEntities((es) => es.map((x) => (x.id === e.id ? { ...x, hp: newHp } : x)));
      return { ok: true, message: selfDmg ? `타격! 반격으로 HP -${selfDmg}` : '타격!' };
    }
    const loot = rollLoot(def.loot);
    const r = addToBackpack(backpack, loot);
    setBackpack(r.backpack);
    setEntities((es) => es.filter((x) => x.id !== e.id));
    const got = r.accepted.map((s) => `${ITEMS[s.itemId].name} x${s.count}`).join(', ') || '없음';
    if (r.rejected) toast.warning(`배낭이 가득 차 ${r.rejected}개를 버렸습니다`);
    return { ok: true, message: `획득: ${got}` };
  }, [entities, pos, tool, weapon, hp, backpack, die]);

  const craft = useCallback((recipe: Recipe, quality: Quality) => {
    if (!canCraft(storage, recipe)) { toast.error('창고 재료가 부족합니다'); return; }
    setStorage((s) => addStacks(s, recipe.ingredients.map((i) => ({ itemId: i.itemId, count: -i.count }))));
    const g = buildGear(recipe, quality, crypto.randomUUID());
    setGear((gs) => [...gs, g]);
    if (recipe.kind === 'TOOL' && (!tool || g.gatherTier >= tool.gatherTier)) setEquippedToolId(g.instanceId);
    if (recipe.kind === 'WEAPON' && (!weapon || g.atk >= weapon.atk)) setEquippedWeaponId(g.instanceId);
    toast.success(`[${QUALITY_LABEL[quality]}] ${ITEMS[g.itemId].name} 제작 완료!`);
  }, [storage, tool, weapon]);

  return {
    pos, setPos, base, setBase, entities, drops, hp, backpack, storage, gear,
    tool, weapon, setEquippedToolId, setEquippedWeaponId,
    inBase, distToBase, backpackWeight: stackWeight(backpack), nextScanAt,
    scan, interact, craft,
  };
}
