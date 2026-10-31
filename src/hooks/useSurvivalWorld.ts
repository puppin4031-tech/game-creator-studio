import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import { CREATURES, NODES, creatureDef, nodeDef, isHostileNow, type LootRoll } from '@/lib/survival/entities';
import { RECIPES, type Recipe } from '@/lib/survival/recipes';
import { BASE_LEVELS, CAMP_COST } from '@/lib/survival/bases';
import { SURVIVAL_CONFIG as C } from '@/lib/survival/config';
import { distanceM } from '@/lib/survival/geo';
import { generateWorld } from '@/lib/survival/world';
import { addStacks, hasAll, removeStacks, splitDeathDrop, stackWeight } from '@/lib/survival/inventory';
import { dayPhase } from '@/lib/survival/progression';
import { checkInspiration, isRecipeUnlocked, prerequisitesMet, techById, type TechDef } from '@/lib/survival/tech';
import type { GearInstance, LatLng, Stack, WorldEntity } from '@/lib/survival/types';

const SAVE_KEY = 'survival-world-v1';
const EXPLORE_STEP_M = 20;
const MAX_EXPLORED = 3000;

export interface WorldSave {
  pos: LatLng;
  hp: number;
  hunger: number;
  backpack: Stack[];
  storage: Stack[];
  gear: GearInstance[];
  base: (LatLng & { level: 1 | 2 | 3 }) | null;
  depleted: Record<string, number>;
  damage: Record<string, number>;
  gathered: Partial<Record<ItemId, number>>;
  techs: string[];
  explored: LatLng[];
  lastTickAt: number;
}

const fresh = (start: LatLng): WorldSave => ({
  pos: start, hp: C.baseMaxHp, hunger: 100, backpack: [], storage: [], gear: [], base: null,
  depleted: {}, damage: {}, gathered: {}, techs: [], explored: [start], lastTickAt: Date.now(),
});

function load(start: LatLng): WorldSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...fresh(start), ...(JSON.parse(raw) as Partial<WorldSave>) };
  } catch (e) {
    console.error('[survival] failed to load save', e);
  }
  return fresh(start);
}

function roll(loot: LootRoll[]): Stack[] {
  const out: Stack[] = [];
  for (const l of loot) {
    if (l.chance !== undefined && Math.random() > l.chance) continue;
    const n = l.min + Math.floor(Math.random() * (l.max - l.min + 1));
    if (n > 0) out.push({ itemId: l.itemId, count: n });
  }
  return out;
}

const fmt = (st: Stack[]) => st.map((s) => `${ITEMS[s.itemId].name} ×${s.count}`).join(', ');

export function useSurvivalWorld(start: LatLng) {
  const [s, setS] = useState<WorldSave>(() => load(start));
  const ref = useRef(s);
  ref.current = s;
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  useEffect(() => { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); }, [s]);

  const isNight = dayPhase(new Date(now)) === 'night';
  const vision = isNight ? C.visionNightM : C.visionDayM;
  const baseDef = s.base ? BASE_LEVELS[s.base.level] : null;
  const inBase = !!s.base && !!baseDef && distanceM(s.pos, s.base) <= baseDef.radiusM;
  const weight = stackWeight(s.backpack);
  const capacity = C.baseCarryKg;

  // Best tool/weapon/armor are used automatically.
  const best = useCallback((pick: (g: GearInstance) => number) =>
    s.gear.reduce<GearInstance | null>((b, g) => (pick(g) > (b ? pick(b) : 0) ? g : b), null), [s.gear]);
  const weapon = best((g) => ITEMS[g.itemId].weapon?.atk ?? 0);
  const armor = best((g) => ITEMS[g.itemId].armor?.def ?? 0);

  const entities: WorldEntity[] = useMemo(() => generateWorld({
    center: s.pos, radiusM: vision, now, isNight, depleted: s.depleted,
    safeZone: s.base && baseDef ? { center: s.base, radiusM: baseDef.radiusM } : null,
  }), [s.pos, vision, now, isNight, s.depleted, s.base, baseDef]);

  // Survival tick: hunger drain, starvation, base regen.
  useEffect(() => {
    const ticks = Math.min(C.maxOfflineTicks, Math.floor((now - s.lastTickAt) / C.tickMs));
    if (ticks <= 0) return;
    setS((p) => {
      const hunger = Math.max(0, p.hunger - ticks * C.hungerPerTick);
      let hp = p.hp;
      if (hunger === 0) hp -= ticks * C.starveHpPerTick;
      if (inBase && baseDef) hp += ticks * baseDef.regenPerTick;
      return { ...p, hunger, hp: Math.max(1, Math.min(C.baseMaxHp, hp)), lastTickAt: p.lastTickAt + ticks * C.tickMs };
    });
  }, [now, s.lastTickAt, inBase, baseDef]);

  // Auto deposit on entering base.
  useEffect(() => {
    if (!inBase || s.backpack.length === 0) return;
    toast.success(`거점 귀환! ${fmt(s.backpack)} 창고에 보관`);
    setS((p) => ({ ...p, storage: addStacks(p.storage, p.backpack), backpack: [] }));
  }, [inBase, s.backpack]);

  const learn = (p: WorldSave, techs: TechDef[]): WorldSave => {
    techs.forEach((t) => toast.success(`깨달음: ${t.name}`, { description: t.desc }));
    return techs.length ? { ...p, techs: [...p.techs, ...techs.map((t) => t.id)] } : p;
  };

  const moveTo = useCallback((pos: LatLng) => {
    setS((p) => {
      const last = p.explored[p.explored.length - 1];
      const explored = !last || distanceM(last, pos) >= EXPLORE_STEP_M ? [...p.explored, pos].slice(-MAX_EXPLORED) : p.explored;
      return { ...p, pos, explored };
    });
  }, []);

  const die = (p: WorldSave): WorldSave => {
    const { kept, dropped } = splitDeathDrop(p.backpack, C.deathDropRatio);
    toast.error('쓰러졌습니다…', { description: dropped.length ? `잃어버림: ${fmt(dropped)}` : undefined });
    return { ...p, backpack: kept, hp: Math.round(C.baseMaxHp / 2), pos: p.base ?? p.pos };
  };

  const interact = useCallback((e: WorldEntity) => {
    const p = ref.current;
    if (distanceM(p.pos, e) > C.interactRadiusM) { toast.warning(`${C.interactRadiusM}m 안으로 다가가세요`); return; }
    let next: WorldSave = { ...p, damage: { ...p.damage } };
    let hp = p.hp;
    let power = 1;
    let need = 0;
    let loot: LootRoll[] = [];
    let label = '';
    if (e.kind === 'node') {
      const d = nodeDef(e.type);
      label = d.name; need = d.hp; loot = d.loot;
      if (d.requires.kind !== 'none') {
        const kind = d.requires.kind;
        const tool = best((g) => ITEMS[g.itemId].tool?.[kind] ?? 0);
        const tier = tool ? ITEMS[tool.itemId].tool?.[kind] ?? 0 : 0;
        if (tier < d.requires.tier) {
          toast.error(`${d.name}: ${kind === 'chop' ? '도끼' : '곡괭이'}가 필요합니다`, { description: '제작 기술을 먼저 깨우치세요' });
          return;
        }
        power = ITEMS[tool!.itemId].tool?.power ?? 1;
      }
    } else {
      const d = creatureDef(e.type);
      label = d.name; need = d.hp; loot = d.loot;
      power = weapon ? ITEMS[weapon.itemId].weapon?.atk ?? C.fistAtk : C.fistAtk;
      const ranged = !!(weapon && ITEMS[weapon.itemId].weapon?.ranged) && !p.damage[e.id];
      const fightsBack = d.temper !== 'passive' || isHostileNow(e.type, isNight);
      if (fightsBack && !ranged) hp -= Math.max(1, d.atk - (armor ? ITEMS[armor.itemId].armor?.def ?? 0 : 0));
      if (d.temper === 'passive' && Math.random() < (d.escapeChance ?? 0)) {
        toast(`${d.name}이(가) 달아났습니다`);
        setS({ ...next, depleted: { ...p.depleted, [e.id]: Date.now() } });
        return;
      }
    }
    if (hp <= 0) { setS(die({ ...next, hp })); return; }
    next.hp = hp;
    const dealt = (p.damage[e.id] ?? 0) + power;
    if (dealt < need) {
      next.damage[e.id] = dealt;
      toast(`${label} 타격! (${Math.round((dealt / need) * 100)}%)`);
      setS(next);
      return;
    }
    delete next.damage[e.id];
    const got = roll(loot);
    const free = capacity - stackWeight(p.backpack);
    const fits = stackWeight(got) <= free;
    next.backpack = fits ? addStacks(p.backpack, got) : p.backpack;
    next.depleted = { ...p.depleted, [e.id]: Date.now() };
    const gathered = { ...p.gathered };
    if (fits) got.forEach((g) => { gathered[g.itemId] = (gathered[g.itemId] ?? 0) + g.count; });
    next.gathered = gathered;
    if (fits) toast.success(`획득: ${fmt(got) || '없음'}`); else toast.warning('배낭이 너무 무겁습니다! 거점에 다녀오세요');
    next = learn(next, checkInspiration(gathered, next.techs));
    setS(next);
  }, [best, weapon, armor, isNight, capacity]);

  const eat = useCallback((itemId: ItemId) => {
    const it = ITEMS[itemId];
    const p = ref.current;
    const from = p.backpack.some((x) => x.itemId === itemId) ? 'backpack' : 'storage';
    const left = removeStacks(p[from], [{ itemId, count: 1 }]);
    if (!left) return;
    const hpGain = it.food?.hp ?? it.heal ?? 0;
    setS({ ...p, [from]: left, hunger: Math.min(100, p.hunger + (it.food?.hunger ?? 0)), hp: Math.max(1, Math.min(C.baseMaxHp, p.hp + hpGain)) });
    toast(`${it.name} 사용`);
  }, []);

  const placeBase = useCallback(() => {
    const p = ref.current;
    const left = removeStacks(p.backpack, CAMP_COST);
    if (!left) { toast.error(`모닥불 설치에 ${fmt(CAMP_COST)} 필요`); return; }
    setS({ ...p, backpack: left, base: { lat: p.pos.lat, lng: p.pos.lng, level: p.base?.level ?? 1 } });
    toast.success('이곳에 모닥불 거점을 세웠습니다');
  }, []);

  const upgradeBase = useCallback(() => {
    const p = ref.current;
    if (!p.base || p.base.level >= 3) return;
    const lv = (p.base.level + 1) as 2 | 3;
    const left = removeStacks(p.storage, BASE_LEVELS[lv].cost);
    if (!left) { toast.error('창고 재료가 부족합니다'); return; }
    setS({ ...p, storage: left, base: { ...p.base, level: lv } });
    toast.success(`${BASE_LEVELS[lv].name}(으)로 발전!`);
  }, []);

  const research = useCallback((techId: string) => {
    const p = ref.current;
    const t = techById(techId);
    if (!t?.research || p.techs.includes(t.id) || !prerequisitesMet(t, p.techs)) return;
    const left = removeStacks(p.storage, t.research);
    if (!left) { toast.error('연구 재료가 창고에 부족합니다'); return; }
    setS(learn({ ...p, storage: left }, [t]));
  }, []);

  const craft = useCallback((r: Recipe) => {
    const p = ref.current;
    if (!isRecipeUnlocked(r, p.techs)) { toast.error('아직 제작법을 모릅니다'); return; }
    if (!p.base || p.base.level < r.baseLevel) { toast.error(`거점 ${r.baseLevel}단계 이상 필요`); return; }
    const left = removeStacks(p.storage, r.ingredients);
    if (!left) { toast.error('창고 재료가 부족합니다'); return; }
    const it = ITEMS[r.result];
    if (it.durability !== undefined) {
      const g: GearInstance = { uid: crypto.randomUUID(), itemId: r.result, quality: 'NORMAL', durability: it.durability, maxDurability: it.durability };
      setS({ ...p, storage: left, gear: [...p.gear, g] });
    } else {
      setS({ ...p, storage: addStacks(left, [{ itemId: r.result, count: r.count }]) });
    }
    toast.success(`${it.name} 제작 완료!`);
  }, []);

  const reset = useCallback(() => { localStorage.removeItem(SAVE_KEY); setS(fresh(ref.current.pos)); }, []);

  return {
    state: s, entities, vision, isNight, inBase, baseDef, weight, capacity, weapon,
    moveTo, interact, eat, placeBase, upgradeBase, research, craft, reset,
    canAfford: (st: Stack[]) => hasAll(s.storage, st),
    recipes: RECIPES, NODES, CREATURES,
  };
}
