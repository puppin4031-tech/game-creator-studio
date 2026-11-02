import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import { CREATURES, NODES, creatureDef, nodeDef, type LootRoll } from '@/lib/survival/entities';
import { CREATURE_ATTACK_INTERVAL_MS, resolveCreatureHit, rollLoot } from '@/lib/survival/combat';
import { RECIPES, type Recipe } from '@/lib/survival/recipes';
import { BASE_LEVELS, CAMP_COST } from '@/lib/survival/bases';
import { SURVIVAL_CONFIG as C } from '@/lib/survival/config';
import { distanceM } from '@/lib/survival/geo';
import { generateWorld, isNodeAvailable } from '@/lib/survival/world';
import { addStacks, hasAll, removeStacks, splitDeathDrop, stackWeight } from '@/lib/survival/inventory';
import { addExperience, dayPhase, xpToNext } from '@/lib/survival/progression';
import { claimWorldQuest, freshProgress, type WorldProgress } from '@/lib/survival/worldProgress';
import { currentQuest, questReady, type QuestState } from '@/lib/survival/quests';
import { IRON_SKIN_DEF, PRIMAL_STRIKE_MULT, checkInspiration, isRecipeUnlocked, prerequisitesMet, techById, type TechDef } from '@/lib/survival/tech';
import { NATURAL_REGEN_MIN_HUNGER, NATURAL_REGEN_PER_TICK, SANCTUARY_RADIUS_M, SANCTUARY_REGEN_PER_TICK, LANDMARK_INFO, SHAMAN_BLESS_XP, SHAMAN_RUMORS, SHAMAN_TIPS, TRADER_STOCK, canClaimLandmark, landmarkReward, recordLandmarkClaim, sellPrice, type Landmark, type LandmarkClaims } from '@/lib/survival/landmarks';
import type { TerrainZone } from '@/lib/survival/terrainZone';
import type { GearInstance, LatLng, Stack, WorldEntity } from '@/lib/survival/types';

const SAVE_KEY = 'survival-world-v1';
const EXPLORE_STEP_M = 20;
const MAX_EXPLORED = 3000;

export interface WorldSave extends WorldProgress {
  pos: LatLng;
  hp: number;
  hunger: number;
  backpack: Stack[];
  storage: Stack[];
  gear: GearInstance[];
  base: (LatLng & { level: 1 | 2 | 3; placedAt: number }) | null;
  depleted: Record<string, number>;
  damage: Record<string, number>;
  gathered: Partial<Record<ItemId, number>>;
  techs: string[];
  explored: LatLng[];
  /** Real-world terrain zone per coarse cell, sampled once from the map. */
  terrainZones: Record<string, TerrainZone>;
  /** Zone cells sampled inside real parks (first sample wins). */
  parkCells: Record<string, boolean>;
  landmarkClaims?: LandmarkClaims;
  lastTickAt: number;
}

const fresh = (start: LatLng): WorldSave => ({
  ...freshProgress(),
  pos: start, hp: C.baseMaxHp, hunger: 100, backpack: [], storage: [], gear: [], base: null,
  depleted: {}, damage: {}, gathered: {}, techs: [], explored: [start], terrainZones: {}, parkCells: {}, lastTickAt: Date.now(),
});

function load(start: LatLng, saveKey: string): WorldSave {
  try {
    const raw = localStorage.getItem(saveKey);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<WorldSave>;
      return { ...fresh(start), ...saved, base: saved.base ? { ...saved.base, placedAt: saved.base.placedAt ?? Date.now() } : null };
    }
  } catch (e) {
    console.error('[survival] failed to load save', e);
  }
  return fresh(start);
}

const fmt = (st: Stack[]) => st.map((s) => `${ITEMS[s.itemId].name} ×${s.count}`).join(', ');

export function useSurvivalWorld(start: LatLng, options: { enabled?: boolean; saveKey?: string; cloudSync?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const saveKey = options.saveKey ?? SAVE_KEY;
  const { user } = useAuth();
  const userId = options.cloudSync ? user?.id ?? null : null;
  const [s, setState] = useState<WorldSave>(() => load(start, saveKey));
  const ref = useRef(s);
  ref.current = s;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const setS = useCallback((next: WorldSave | ((previous: WorldSave) => WorldSave)) => {
    const value = typeof next === 'function' ? next(ref.current) : next;
    ref.current = value;
    setState(value);
  }, []);
  const [now, setNow] = useState(Date.now());
  const lastCreatureAttack = useRef(0);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  useEffect(() => {
    try { localStorage.setItem(saveKey, JSON.stringify(s)); }
    catch { toast.error('진행 상태를 기기에 저장하지 못했습니다. 저장 공간을 확인해 주세요.'); }
  }, [s, saveKey]);

  // Cloud sync: on login, restore the newer save (cloud vs this device); then keep uploading changes.
  const cloudReadyRef = useRef(false);
  const skipNextUploadRef = useRef(false);
  useEffect(() => {
    if (!userId) { cloudReadyRef.current = false; return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('survival_saves').select('payload').eq('user_id', userId).maybeSingle();
      if (cancelled) return;
      if (error) { console.error('[survival] cloud load failed', error); cloudReadyRef.current = true; return; }
      const remote = data?.payload as Partial<WorldSave> | undefined;
      const local = ref.current;
      if (remote && (remote.lastTickAt ?? 0) > local.lastTickAt) {
        skipNextUploadRef.current = true;
        setS({ ...fresh(local.pos), ...remote, base: remote.base ? { ...remote.base, placedAt: remote.base.placedAt ?? Date.now() } : null });
        toast.success('클라우드에 저장된 생존 진행도를 불러왔습니다.');
      } else {
        const { error: upErr } = await supabase.from('survival_saves').upsert({ user_id: userId, payload: local as unknown as Json, updated_at: new Date().toISOString() });
        if (upErr) console.error('[survival] cloud save failed', upErr);
      }
      cloudReadyRef.current = true;
    })();
    return () => { cancelled = true; };
  }, [userId, setS]);

  useEffect(() => {
    if (!userId || !cloudReadyRef.current) return;
    if (skipNextUploadRef.current) { skipNextUploadRef.current = false; return; }
    const t = setTimeout(() => {
      supabase.from('survival_saves').upsert({ user_id: userId, payload: ref.current as unknown as Json, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('[survival] cloud save failed', error); });
    }, 2500);
    return () => clearTimeout(t);
  }, [s, userId]);

  const isNight = dayPhase(new Date(now)) === 'night';
  const vision = isNight ? C.visionNightM : C.visionDayM;
  const baseDef = s.base ? BASE_LEVELS[s.base.level] : null;
  const [sanctuaries, setSanctuaries] = useState<LatLng[]>([]);
  const inSanctuary = sanctuaries.some((c) => distanceM(s.pos, c) <= SANCTUARY_RADIUS_M);
  const inBase = !!s.base && !!baseDef && distanceM(s.pos, s.base) <= baseDef.radiusM;
  const weight = stackWeight(s.backpack);
  const capacity = C.baseCarryKg + (s.level - 1) * C.carryPerLevelKg;
  const questState: QuestState = { ...s, storedGear: [], stats: { gathered: s.gathered, crafted: s.crafted, kills: s.kills, deposits: s.deposits } };
  const quest = currentQuest(questState);
  const questProgress = quest?.progress(questState) ?? null;
  const canClaimQuest = questReady(questState);

  const gainXp = (p: WorldSave, amount: number): WorldSave => {
    const progress = addExperience(p, amount);
    if (progress.level > p.level) toast.success(`레벨 ${progress.level} 달성!`, { description: `배낭 용량 ${C.baseCarryKg + (progress.level - 1) * C.carryPerLevelKg}kg` });
    return { ...p, ...progress };
  };

  // Best tool/weapon/armor are used automatically.
  const best = useCallback((pick: (g: GearInstance) => number) =>
    s.gear.reduce<GearInstance | null>((b, g) => (pick(g) > (b ? pick(b) : 0) ? g : b), null), [s.gear]);
  const weapon = best((g) => ITEMS[g.itemId].weapon?.atk ?? 0);
  const armor = best((g) => ITEMS[g.itemId].armor?.def ?? 0);

  const entities: WorldEntity[] = useMemo(() => generateWorld({
    center: s.pos, radiusM: vision, now, isNight, depleted: s.depleted, terrainZones: s.terrainZones, parkCells: s.parkCells, sanctuaries,
    safeZone: s.base && baseDef ? { center: s.base, radiusM: baseDef.radiusM } : null,
  }), [s.pos, vision, now, isNight, s.depleted, s.base, baseDef, s.terrainZones, s.parkCells, sanctuaries]);

  // Survival tick: hunger drain, starvation, base regen.
  useEffect(() => {
    const ticks = Math.min(C.maxOfflineTicks, Math.floor((now - s.lastTickAt) / C.tickMs));
    if (!enabled || ticks <= 0) return;
    setS((p) => {
      const hunger = Math.max(0, p.hunger - ticks * C.hungerPerTick);
      let hp = p.hp;
      if (hunger === 0) hp -= ticks * C.starveHpPerTick;
      if (inBase && baseDef) hp += ticks * baseDef.regenPerTick;
      else if (inSanctuary) hp += ticks * SANCTUARY_REGEN_PER_TICK;
      if (hunger >= NATURAL_REGEN_MIN_HUNGER) hp += ticks * NATURAL_REGEN_PER_TICK;
      return { ...p, hunger, hp: Math.max(1, Math.min(C.baseMaxHp, hp)), lastTickAt: p.lastTickAt + ticks * C.tickMs };
    });
  }, [now, s.lastTickAt, inBase, inSanctuary, baseDef, enabled, setS]);

  // Auto deposit on entering base. Shell currency stays in the backpack (and is
  // pulled back out of storage) so it can be spent at traders.
  useEffect(() => {
    if (!enabled || !inBase) return;
    const deposit = s.backpack.filter((x) => x.itemId !== 'shell');
    const storedShell = s.storage.find((x) => x.itemId === 'shell');
    if (!deposit.length && !storedShell) return;
    if (deposit.length) toast.success(`거점 귀환! ${fmt(deposit)} 창고에 보관`);
    setS((p) => {
      const dep = p.backpack.filter((x) => x.itemId !== 'shell');
      const shells = [...p.backpack, ...p.storage].filter((x) => x.itemId === 'shell').reduce((n, x) => n + x.count, 0);
      return {
        ...p,
        storage: addStacks(p.storage.filter((x) => x.itemId !== 'shell'), dep),
        backpack: shells ? [{ itemId: 'shell', count: shells }] : [],
        deposits: p.deposits + (dep.length ? 1 : 0),
      };
    });
  }, [inBase, s.backpack, s.storage, enabled, setS]);

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
  }, [setS]);

  /** First sample wins so a cell's resource mix never flips after being seen. */
  const recordTerrainZone = useCallback((cell: string, zone: TerrainZone) => {
    setS((p) => (p.terrainZones[cell] ? p : { ...p, terrainZones: { ...p.terrainZones, [cell]: zone } }));
  }, [setS]);

  const recordPark = useCallback((cell: string, park: boolean) => {
    setS((p) => (cell in (p.parkCells ?? {}) ? p : { ...p, parkCells: { ...(p.parkCells ?? {}), [cell]: park } }));
  }, [setS]);

  /** Use a landmark within the interaction radius. Returns the shaman's words, if any. */
  const visitLandmark = useCallback((l: Landmark): string | null => {
    const p = ref.current;
    if (!enabledRef.current) { toast.warning('정확한 GPS 신호를 기다려 주세요.'); return null; }
    if (distanceM(p.pos, l) > C.interactRadiusM) { toast.warning(`${C.interactRadiusM}m 안으로 다가가세요`); return null; }
    const now = Date.now();
    const check = canClaimLandmark(p.landmarkClaims, l.id, now);
    const info = LANDMARK_INFO[l.kind];
    const tip = SHAMAN_TIPS[Math.floor(Math.random() * SHAMAN_TIPS.length)];
    const rumor = Math.random() < 0.5 ? SHAMAN_RUMORS[Math.floor(Math.random() * SHAMAN_RUMORS.length)] : null;
    if (!check.ok) {
      const fail = check as Extract<typeof check, { ok: false }>;
      const msg = fail.reason === 'cooldown' ? `${Math.ceil((fail.waitMs ?? 0) / 60_000)}분 뒤에 다시 오세요` : fail.reason === 'daily' ? '이곳은 오늘 더 내어줄 것이 없습니다 (하루 3회)' : '오늘의 랜드마크 보상을 모두 받았습니다';
      if (l.kind === 'shaman') return `${tip}\n(${msg})`;
      toast(`${info.name}: ${msg}`);
      return null;
    }
    let next: WorldSave = { ...p, landmarkClaims: recordLandmarkClaim(p.landmarkClaims, l.id, now) };
    if (l.kind === 'shaman') {
      next = gainXp(next, SHAMAN_BLESS_XP);
      setS(next);
      toast.success(`샤먼의 축복 · 경험치 +${SHAMAN_BLESS_XP}`);
      return rumor ? `${tip}\n\n풍문: ${rumor}` : tip;
    }
    const got = landmarkReward(l.kind, Math.random());
    if (stackWeight(got) > capacity - stackWeight(p.backpack)) { toast.warning('배낭이 너무 무겁습니다'); return null; }
    setS({ ...next, backpack: addStacks(p.backpack, got) });
    toast.success(`${info.name}: ${fmt(got)}`);
    return null;
  }, [capacity]);

  const sellItem = useCallback((itemId: ItemId) => {
    const p = ref.current;
    const price = sellPrice(itemId);
    const left = price ? removeStacks(p.backpack, [{ itemId, count: 1 }]) : null;
    if (!left) return;
    setS({ ...p, backpack: addStacks(left, [{ itemId: 'shell', count: price }]) });
  }, []);

  const buyItem = useCallback((itemId: ItemId) => {
    const p = ref.current;
    const offer = TRADER_STOCK.find((x) => x.itemId === itemId);
    if (!offer) return;
    const left = removeStacks(p.backpack, [{ itemId: 'shell', count: offer.price }]);
    if (!left) { toast.error('조개 화폐가 부족합니다'); return; }
    if (ITEMS[itemId].weight > capacity - stackWeight(p.backpack)) { toast.warning('배낭이 너무 무겁습니다'); return; }
    setS({ ...p, backpack: addStacks(left, [{ itemId, count: 1 }]) });
    toast.success(`${ITEMS[itemId].name} 구매`);
  }, [capacity]);

  const d0Name = (t: Parameters<typeof creatureDef>[0]) => creatureDef(t).name;

  const die = (p: WorldSave): WorldSave => {
    const { kept, dropped } = splitDeathDrop(p.backpack, C.deathDropRatio);
    toast.error('쓰러졌습니다…', { description: dropped.length ? `잃어버림: ${fmt(dropped)}` : undefined });
    return { ...p, backpack: kept, hp: Math.round(C.baseMaxHp / 2), pos: p.base ?? p.pos };
  };

  const interact = useCallback((e: WorldEntity) => {
    if (!enabledRef.current) { toast.warning('정확한 GPS 신호를 기다려 주세요.'); return; }
    const p = ref.current;
    if (e.kind === 'node' ? !isNodeAvailable(e.id, e.type, p.depleted, Date.now()) : !!p.depleted[e.id]) return;
    if (distanceM(p.pos, e) > C.interactRadiusM) { toast.warning(`${C.interactRadiusM}m 안으로 다가가세요`); return; }
    if (e.kind === 'creature') {
      const at = Date.now();
      if (at - lastCreatureAttack.current < CREATURE_ATTACK_INTERVAL_MS) return;
      lastCreatureAttack.current = at;
    }
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
        if (!tool) return;
        power = ITEMS[tool.itemId].tool?.power ?? 1;
      }
    } else {
      const d = creatureDef(e.type);
      label = d.name; need = d.hp; loot = d.loot;
      power = weapon ? ITEMS[weapon.itemId].weapon?.atk ?? C.fistAtk : C.fistAtk;
      if (p.techs.includes('primal_strike')) power *= PRIMAL_STRIKE_MULT;
      const ranged = !!(weapon && ITEMS[weapon.itemId].weapon?.ranged) && !p.damage[e.id];
      const defense = (armor ? ITEMS[armor.itemId].armor?.def ?? 0 : 0) + (p.techs.includes('iron_skin') ? IRON_SKIN_DEF : 0);
      const exchange = resolveCreatureHit(e.type, p.damage[e.id] ?? 0, power, defense, ranged);
      power = exchange.dealt - (p.damage[e.id] ?? 0);
      hp -= exchange.counterDamage;
      if (exchange.counterDamage) toast.error(`${d.name} 반격! 체력 -${exchange.counterDamage}`);
      if (hp <= 0) { setS(die({ ...next, hp })); return; }
      if (!exchange.defeated && d.temper === 'passive' && Math.random() < (d.escapeChance ?? 0)) {
        toast(`${d.name}이(가) 달아났습니다`);
        delete next.damage[e.id];
        setS({ ...next, hp, depleted: { ...p.depleted, [e.id]: Date.now() } });
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
    const got = rollLoot(loot);
    const free = capacity - stackWeight(p.backpack);
    const fits = stackWeight(got) <= free;
    next.backpack = fits ? addStacks(p.backpack, got) : p.backpack;
    next.depleted = { ...p.depleted, [e.id]: Date.now() };
    const gathered = { ...p.gathered };
    if (fits) got.forEach((g) => { gathered[g.itemId] = (gathered[g.itemId] ?? 0) + g.count; });
    next.gathered = gathered;
    next.kills = p.kills + (e.kind === 'creature' ? 1 : 0);
    next = gainXp(next, e.kind === 'node' ? nodeDef(e.type).xp : creatureDef(e.type).xp);
    if (e.kind === 'creature' && creatureDef(e.type).boss && fits) toast.success(`우두머리 처치! ${d0Name(e.type)}`, { description: `획득: ${fmt(got)}` });
    else if (fits) toast.success(`획득: ${fmt(got) || '없음'}`); else toast.warning('배낭이 너무 무겁습니다! 거점에 다녀오세요');
    next = learn(next, checkInspiration(gathered, next.techs));
    setS(next);
  }, [best, weapon, armor, capacity]);

  const eat = useCallback((itemId: ItemId) => {
    const it = ITEMS[itemId];
    const p = ref.current;
    if (it.book) {
      const t = techById(it.book.techId);
      const left = removeStacks(p.backpack, [{ itemId, count: 1 }]) ?? null;
      if (!t || !left) return;
      if (p.techs.includes(t.id)) { toast('이미 아는 기술입니다'); return; }
      setS(learn({ ...p, backpack: left }, [t]));
      return;
    }
    const from = p.backpack.some((x) => x.itemId === itemId) ? 'backpack' : 'storage';
    if (!enabledRef.current || (from === 'storage' && (!p.base || distanceM(p.pos, p.base) > BASE_LEVELS[p.base.level].radiusM))) return;
    const left = removeStacks(p[from], [{ itemId, count: 1 }]);
    if (!left) return;
    const hpGain = it.food?.hp ?? it.heal ?? 0;
    setS({ ...p, [from]: left, hunger: Math.min(100, p.hunger + (it.food?.hunger ?? 0)), hp: Math.max(1, Math.min(C.baseMaxHp, p.hp + hpGain)) });
    toast(`${it.name} 사용`);
  }, []);

  const placeBase = useCallback(() => {
    if (!enabledRef.current) return;
    const p = ref.current;
    const left = removeStacks(p.backpack, CAMP_COST);
    if (!left) { toast.error(`모닥불 설치에 ${fmt(CAMP_COST)} 필요`); return; }
    setS({ ...p, backpack: left, base: { lat: p.pos.lat, lng: p.pos.lng, level: p.base?.level ?? 1, placedAt: Date.now() } });
    toast.success('이곳에 모닥불 거점을 세웠습니다');
  }, []);

  const upgradeBase = useCallback(() => {
    const p = ref.current;
    if (!enabledRef.current || !p.base || distanceM(p.pos, p.base) > BASE_LEVELS[p.base.level].radiusM) return;
    if (!p.base || p.base.level >= 3) return;
    const lv = (p.base.level + 1) as 2 | 3;
    const left = removeStacks(p.storage, BASE_LEVELS[lv].cost);
    if (!left) { toast.error('창고 재료가 부족합니다'); return; }
    setS({ ...p, storage: left, base: { ...p.base, level: lv } });
    toast.success(`${BASE_LEVELS[lv].name}(으)로 발전!`);
  }, []);

  const research = useCallback((techId: string) => {
    const p = ref.current;
    if (!enabledRef.current || !p.base || distanceM(p.pos, p.base) > BASE_LEVELS[p.base.level].radiusM) return;
    const t = techById(techId);
    if (!t?.research || p.techs.includes(t.id) || !prerequisitesMet(t, p.techs)) return;
    const left = removeStacks(p.storage, t.research);
    if (!left) { toast.error('연구 재료가 창고에 부족합니다'); return; }
    setS(learn({ ...p, storage: left }, [t]));
  }, []);

  const craft = useCallback((r: Recipe) => {
    const p = ref.current;
    if (!enabledRef.current || !p.base || distanceM(p.pos, p.base) > BASE_LEVELS[p.base.level].radiusM) return;
    if (!isRecipeUnlocked(r, p.techs)) { toast.error('아직 제작법을 모릅니다'); return; }
    if (!p.base || p.base.level < r.baseLevel) { toast.error(`거점 ${r.baseLevel}단계 이상 필요`); return; }
    const left = removeStacks(p.storage, r.ingredients);
    if (!left) { toast.error('창고 재료가 부족합니다'); return; }
    const it = ITEMS[r.result];
    const next = { ...p, crafted: { ...p.crafted, [r.result]: (p.crafted[r.result] ?? 0) + r.count } };
    if (it.durability !== undefined) {
      const g: GearInstance = { uid: crypto.randomUUID(), itemId: r.result, quality: 'NORMAL', durability: it.durability, maxDurability: it.durability };
      setS({ ...next, storage: left, gear: [...p.gear, g] });
    } else {
      setS({ ...next, storage: addStacks(left, [{ itemId: r.result, count: r.count }]) });
    }
    toast.success(`${it.name} 제작 완료!`);
  }, []);

  const claimQuest = useCallback(() => {
    const p = ref.current;
    if (!enabledRef.current || !p.base || distanceM(p.pos, p.base) > BASE_LEVELS[p.base.level].radiusM) {
      toast.warning('보상은 GPS 신호가 정확한 거점 안에서 받을 수 있습니다.');
      return;
    }
    const next = claimWorldQuest(p);
    if (next === p) return;
    setS(next);
    toast.success('생존 목표 달성! 보상을 받았습니다.');
  }, [setS]);

  const reset = useCallback(() => { setS(fresh(ref.current.pos)); }, [setS]);

  /** Apply external damage (e.g. another player's attack), reduced by worn armor. */
  const takeDamage = useCallback((amount: number) => {
    const p = ref.current;
    const armorGear = p.gear.find((x) => ITEMS[x.itemId].armor);
    const dmg = Math.max(1, Math.round(amount) - (armorGear ? ITEMS[armorGear.itemId].armor?.def ?? 0 : 0) - (p.techs.includes('iron_skin') ? IRON_SKIN_DEF : 0));
    const hp = p.hp - dmg;
    setS(hp <= 0 ? die({ ...p, hp }) : { ...p, hp });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setS]);

  return { setSanctuaries, inSanctuary,
    recordTerrainZone, recordPark, visitLandmark, sellItem, buyItem, takeDamage,
    state: s, entities, vision, isNight, inBase, baseDef, weight, capacity, weapon,
    moveTo, interact, eat, placeBase, upgradeBase, research, craft, reset,
    quest, questProgress, canClaimQuest, claimQuest, nextLevelXp: xpToNext(s.level),
    canAfford: (st: Stack[]) => hasAll(s.storage, st),
    recipes: RECIPES, NODES, CREATURES,
  };
}
