import { isWalkingPace } from '@/lib/survival/walkPace';
import { advanceExpedition, expeditionLoot, isPocketMovement, startObservedExpedition, EXPEDITION_RADIUS_M, FOCUS_LABEL, type ExpeditionFocus, type ObservedExpedition, type ExpeditionLog } from '@/lib/survival/expedition';
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
import { visionBonus, reachRadius, pocketBonusKg } from '@/lib/survival/utilitySkills';
import { BASE_UPGRADE_MS, EXPEDITION_FOOD_COUNT, EXPEDITION_MS, expeditionRewards, mapFragments, payExpeditionFood, scoutReport, type Expedition, type ScoutTarget, type TimedJob } from '@/lib/survival/homeActivities';
import { EGG_PICK_RADIUS_M, advanceEggs, babyFor, eggReady, newEgg, type BabyDinoId, type CarriedEgg, type EggSpawn } from '@/lib/survival/dinoEggs';
import { ACTIVE_SKILLS, claimResearch, startResearch, atMainBase, atWorkshop, buildStructure, collectCompanionWork, prepareSkill, recruitCompanion, tameWolf, type ActiveSkill, type Companion } from '@/lib/survival/abilities';
import { advanceSurvivalVitals } from '@/lib/survival/metabolism';
import { distanceM } from '@/lib/survival/geo';
import { generateWorld, isNodeAvailable } from '@/lib/survival/world';
import { addStacks, hasAll, removeStacks, splitDeathDrop, splitByCapacity, stackWeight } from '@/lib/survival/inventory';
import { addExperience, dayPhase, xpToNext } from '@/lib/survival/progression';
import { claimWorldQuest, freshProgress, type WorldProgress } from '@/lib/survival/worldProgress';
import { currentQuest, questReady, type QuestState } from '@/lib/survival/quests';
import { checkInspiration, isRecipeUnlocked, prerequisitesMet, readSkillBook, techById, type TechDef } from '@/lib/survival/tech';
import { giantHeartHpBonus, ironSkinDef, primalStrikeMult, techLevel, wildVitalityRegenBonus } from '@/lib/survival/techLevels';
import { SANCTUARY_RADIUS_M, SANCTUARY_REGEN_PER_TICK, LANDMARK_INFO, SHAMAN_BLESS_XP, SHAMAN_RUMORS, SHAMAN_TIPS, TRADER_STOCK, canClaimLandmark, landmarkReward, recordLandmarkClaim, sellPrice, type Landmark, type LandmarkClaims } from '@/lib/survival/landmarks';
import type { TerrainZone } from '@/lib/survival/terrainZone';
import { MELCHIZEDEK_FIRST, MELCHIZEDEK_LINK, RITES, blessingGift, canBless, discoverShrine, emptyShrineState, performRite, recordBlessing, type Shrine, type ShrineState } from '@/lib/survival/sanctuaries';
import { skillCooldownMs, skillDamage, skillLevel, skillUpgradeCost } from '@/lib/survival/skillLevels';
import { ALTAR_COST, INVENTED_DURABILITY, inventionId, registerInventions, type InventedItem } from '@/lib/survival/inventedItems';
import { checkFacility, type InventionInput } from '@/lib/survival/invention';
import { equipInSlot, resolveLoadout, type Equipped, type GearSlot } from '@/lib/survival/equipment';
import { type InventionCredits } from '@/lib/survival/inventionCredits';
import { payAccessible } from '@/lib/survival/abilities';
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
  /** Re-research levels per tech (absent = Lv.1). */
  techLevels?: Record<string, number>;
  explored: LatLng[];
  /** Real-world terrain zone per coarse cell, sampled once from the map. */
  terrainZones: Record<string, TerrainZone>;
  /** Zone cells sampled inside real parks (first sample wins). */
  parkCells: Record<string, boolean>;
  landmarkClaims?: LandmarkClaims;
  packedItems?: ItemId[];
  outpost?: LatLng | null;
  palisade?: boolean;
  cooldowns?: Record<string, number>;
  calmUntil?: Record<string, number>;
  companions?: Companion[];
  rescueTokens?: number;
  skillLevels?: Record<string, number>;
  /** Worn gear per slot (see equipment.ts). */
  equipped?: Equipped;
  altar?: boolean;
  inventions?: InventedItem[];
  inventionCredits?: InventionCredits;
  inventionWalkMark?: number;
  /** New explored steps taken at walking pace (<= 13 km/h); fuels walk rewards. */
  walkSteps?: number;
  /** Carried dino eggs with the walk step count at pickup. */
  dinoEggs?: CarriedEgg[];
  babyDinos?: BabyDinoId[];
  shrines?: ShrineState;
  researching?: TimedJob | null;
  researchJobs?: TimedJob[];
  baseUpgrade?: TimedJob | null;
  expedition?: Expedition | null;
  observedExpedition?: ObservedExpedition | null;
  expeditionAuto?: boolean;
  expeditionLogs?: ExpeditionLog[];
  /** Placeholder camps may be anchored once to the first accepted actual GPS fix. */
  starterCampPending?: boolean;
  expeditionMark?: number;
  /** Lifetime explored steps; explored[] itself is capped. */
  exploredTotal?: number;
  scoutReport?: ScoutTarget[];
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

/** Max HP grows with the giant_heart tech level. */
const maxHpOf = (p: { techs: string[]; techLevels?: Record<string, number> }) =>
  C.baseMaxHp + (p.techs.includes('giant_heart') ? giantHeartHpBonus(techLevel(p.techLevels, 'giant_heart')) : 0);

export function useSurvivalWorld(start: LatLng, options: { enabled?: boolean; saveKey?: string; cloudSync?: boolean; indoor?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const saveKey = options.saveKey ?? SAVE_KEY;
  const { user } = useAuth();
  const userId = options.cloudSync ? user?.id ?? null : null;
  const [s, setState] = useState<WorldSave>(() => load(start, saveKey));
  const ref = useRef(s);
  ref.current = s;
  registerInventions(s.inventions);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const setS = useCallback((next: WorldSave | ((previous: WorldSave) => WorldSave)) => {
    const value = typeof next === 'function' ? next(ref.current) : next;
    ref.current = value;
    setState(value);
  }, []);
  const [now, setNow] = useState(Date.now());
  const lastCreatureAttack = useRef(0);
  const [pocketMode, setPocketMode] = useState(false);
  const [movingUntil, setMovingUntil] = useState(0);
  const outdoorMovingRef = useRef(0);

  const ensureStarterCamp = useCallback(() => {
    setS(p => p.base ? p : { ...p, base: { ...p.pos, level: 1, placedAt: Date.now() }, starterCampPending: true });
  }, [setS]);
  useEffect(() => { if (options.indoor) ensureStarterCamp(); }, [options.indoor, ensureStarterCamp]);

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

  // Continuous one-second crew ticks must not postpone the ordinary save debounce forever.
  useEffect(() => {
    if (!userId || !s.observedExpedition) return;
    const timer = window.setInterval(() => {
      if (!cloudReadyRef.current) return;
      void supabase.from('survival_saves').upsert({ user_id: userId, payload: ref.current as unknown as Json, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('[survival] expedition save failed', error); });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [userId, !!s.observedExpedition]);

  const isNight = dayPhase(new Date(now)) === 'night';
  const vision = (isNight ? C.visionNightM : C.visionDayM) + visionBonus(s.techs);
  const reach = reachRadius(s.techs);
  const baseDef = s.base ? BASE_LEVELS[s.base.level] : null;
  const [sanctuaries, setSanctuaries] = useState<LatLng[]>([]);
  const inSanctuary = sanctuaries.some((c) => distanceM(s.pos, c) <= SANCTUARY_RADIUS_M);
  const inBase = atWorkshop(s);
  const weight = stackWeight(s.backpack);
  const capacity = C.baseCarryKg + (s.level - 1) * C.carryPerLevelKg + ((s.base?.level ?? 0) >= 2 ? 10 : 0) + pocketBonusKg(s.techs);
  const questState: QuestState = { ...s, storedGear: [], stats: { gathered: s.gathered, crafted: s.crafted, kills: s.kills, deposits: s.deposits } };
  const quest = currentQuest(questState);
  const questProgress = quest?.progress(questState) ?? null;
  const canClaimQuest = questReady(questState);

  const gainXp = (p: WorldSave, amount: number): WorldSave => {
    const progress = addExperience(p, amount);
    if (progress.level > p.level) toast.success(`레벨 ${progress.level} 달성!`, { description: `배낭 용량 ${C.baseCarryKg + (progress.level - 1) * C.carryPerLevelKg}kg` });
    return { ...p, ...progress };
  };

  // Only gear worn in an unlocked slot counts.
  const loadout = useMemo(() => resolveLoadout(s.gear, s.equipped, s.level), [s.gear, s.equipped, s.level]);
  const best = useCallback((pick: (g: GearInstance) => number) =>
    [loadout.tool1, loadout.tool2].reduce<GearInstance | null>((b, g) => (g && pick(g) > (b ? pick(b) : 0) ? g : b), null), [loadout]);
  const weapon = loadout.weapon;
  const armor = loadout.armor;

  const entities: WorldEntity[] = useMemo(() => generateWorld({
    center: s.pos, radiusM: vision, now, isNight, depleted: s.depleted, terrainZones: s.terrainZones, parkCells: s.parkCells, sanctuaries,
    safeZone: s.base && baseDef ? { center: s.base, radiusM: baseDef.radiusM + (s.palisade ? 15 : 0) } : null,
  }).filter(e => !(e.kind === 'creature' && s.outpost && distanceM(e, s.outpost) < C.outpostRadiusM + 15)), [s.pos, vision, now, isNight, s.depleted, s.base, baseDef, s.terrainZones, s.parkCells, sanctuaries, s.palisade, s.outpost]);

  // Survival tick: hunger drain, starvation, base regen (wild_vitality level boosts rest regen).
  useEffect(() => {
    if (!enabled || now - s.lastTickAt < C.tickMs) return;
    const locationRegen = inBase && baseDef ? baseDef.regenPerTick : inSanctuary ? SANCTUARY_REGEN_PER_TICK : 0;
    const regen = locationRegen > 0 && s.techs.includes('wild_vitality') ? locationRegen + wildVitalityRegenBonus(techLevel(s.techLevels, 'wild_vitality')) : locationRegen;
    setS((p) => advanceSurvivalVitals(p, now, regen, maxHpOf(p)));
  }, [now, s.lastTickAt, inBase, inSanctuary, baseDef, enabled, setS, s.techs, s.techLevels]);

  // Auto deposit on entering base. Shell currency stays in the backpack (and is
  // pulled back out of storage) so it can be spent at traders.
  useEffect(() => {
    if (!enabled || !inBase) return;
    const deposit = s.backpack.filter((x) => x.itemId !== 'shell' && !(s.packedItems ?? []).includes(x.itemId));
    const storedShell = s.storage.find((x) => x.itemId === 'shell');
    if (!deposit.length && !storedShell) return;
    if (deposit.length) toast.success(`거점 귀환! ${fmt(deposit)} 창고에 보관`);
    setS((p) => {
      const dep = p.backpack.filter((x) => x.itemId !== 'shell' && !(p.packedItems ?? []).includes(x.itemId));
      const shells = [...p.backpack, ...p.storage].filter((x) => x.itemId === 'shell').reduce((n, x) => n + x.count, 0);
      return {
        ...p,
        storage: addStacks(p.storage.filter((x) => x.itemId !== 'shell'), dep),
        backpack: addStacks(p.backpack.filter(x => x.itemId !== 'shell' && !dep.some(d => d.itemId === x.itemId)), shells ? [{ itemId: 'shell', count: shells }] : []),
        deposits: p.deposits + (dep.length ? 1 : 0),
      };
    });
  }, [inBase, s.backpack, s.storage, enabled, setS]);

  const learn = (p: WorldSave, techs: TechDef[]): WorldSave => {
    techs.forEach((t) => toast.success(`깨달음: ${t.name}`, { description: t.desc }));
    return techs.length ? { ...p, techs: [...p.techs, ...techs.map((t) => t.id)] } : p;
  };

  const lastMoveAt = useRef(0);
  const moveTo = useCallback((pos: LatLng) => {
    const now = Date.now();
    const prevAt = lastMoveAt.current;
    lastMoveAt.current = now;
    setS((p) => {
      const last = p.explored[p.explored.length - 1];
      const explored = !last || distanceM(last, pos) >= EXPLORE_STEP_M ? [...p.explored, pos].slice(-MAX_EXPLORED) : p.explored;
      const grew = explored !== p.explored;
      // Reward walking only counts new steps taken at <= 13 km/h.
      const walking = grew && prevAt > 0 && isWalkingPace(distanceM(p.pos, pos), now - prevAt);
      if (options.indoor && prevAt > 0 && isPocketMovement(distanceM(p.pos, pos), now - prevAt)) {
        outdoorMovingRef.current = now + 10_000;
        setMovingUntil(now + 10_000);
      } else if (options.indoor && prevAt > 0) {
        outdoorMovingRef.current = 0;
        setMovingUntil(0);
      }
      const anchor = p.starterCampPending && p.base && !p.observedExpedition;
      return { ...p, pos, base: anchor ? { ...p.base, ...pos } : p.base, starterCampPending: anchor ? false : p.starterCampPending, explored, exploredTotal: (p.exploredTotal ?? p.explored.length) + (grew ? 1 : 0), walkSteps: (p.walkSteps ?? 0) + (walking ? 1 : 0), dinoEggs: walking && p.dinoEggs?.length ? advanceEggs(p.dinoEggs, distanceM(p.pos, pos), now - prevAt) : p.dinoEggs };
    });
  }, [setS, options.indoor]);

  const appendLog = (p: WorldSave, text: string, at: number): ExpeditionLog[] => [...(p.expeditionLogs ?? []), { at, text }].slice(-20);
  const dispatchObserved = useCallback((destination: LatLng, focus: ExpeditionFocus = 'materials') => {
    const p = ref.current;
    if (!p.base || p.observedExpedition || (enabledRef.current && !atMainBase(p))) return false;
    const crew = startObservedExpedition(p.base, destination, Date.now(), focus);
    if (!crew) { toast.warning('거점에서 10~1,500m 이내 목표를 선택하세요'); return false; }
    setS({ ...p, starterCampPending: false, observedExpedition: crew, expeditionLogs: appendLog(p, `원정대 출발 · 목표: ${FOCUS_LABEL[focus]}`, Date.now()) });
    return true;
  }, [setS]);
  const toggleExpeditionAuto = useCallback((destination: LatLng, focus: ExpeditionFocus = 'materials') => {
    const p = ref.current;
    if (p.expeditionAuto) { setS({ ...p, expeditionAuto: false }); return; }
    if (p.observedExpedition) { setS({ ...p, expeditionAuto: true }); return; }
    if (dispatchObserved(destination, focus)) setS(p => ({ ...p, expeditionAuto: true }));
  }, [dispatchObserved, setS]);
  const rallyExpedition = useCallback(() => {
    const p = ref.current; const crew = p.observedExpedition; const at = Date.now();
    if (!crew || at < crew.moraleReadyAt) return;
    setS({ ...p, observedExpedition: { ...crew, moraleUntil: at + 30_000, moraleReadyAt: at + 60_000 }, expeditionLogs: appendLog(p, '사기 진작! 30초 공격력·채집 속도 상승', at) });
  }, [setS]);
  const recallExpedition = useCallback(() => {
    const p = ref.current; if (!p.observedExpedition) return;
    setS({ ...p, expeditionAuto: false, observedExpedition: null, expeditionLogs: appendLog(p, '즉시 귀환 완료 · 원정대 안전 복귀', Date.now()) });
  }, [setS]);

  useEffect(() => {
    if (!s.observedExpedition) return;
    const timer = window.setInterval(() => {
      const p = ref.current; const crew = p.observedExpedition;
      if (!crew) return;
      const at = Date.now();
      const outdoors = enabledRef.current && at < outdoorMovingRef.current && distanceM(p.pos, crew.pos) <= 40;
      const nearby = generateWorld({ center: crew.pos, radiusM: 30, now: at, isNight: dayPhase(new Date(at)) === 'night', depleted: p.depleted, terrainZones: p.terrainZones, parkCells: p.parkCells });
      const result = advanceExpedition(crew, nearby, at, outdoors, !!p.expeditionAuto);
      let next = { ...p, observedExpedition: result.finished ? null : result.crew };
      if (result.completed) {
        const e = result.completed;
        const gathered = { ...p.gathered };
        for (const item of result.rewards) gathered[item.itemId] = (gathered[item.itemId] ?? 0) + item.count;
        next = { ...next, storage: addStacks(p.storage, result.rewards), gathered, depleted: { ...p.depleted, [e.id]: at }, kills: p.kills + (e.kind === 'creature' ? 1 : 0), ...addExperience(p, e.kind === 'node' ? nodeDef(e.type).xp : creatureDef(e.type).xp) };
        const learned = checkInspiration(gathered, next.techs);
        next.techs = [...next.techs, ...learned.map(t => t.id)];
      }
      if (result.text) next.expeditionLogs = appendLog(p, result.text + (result.rewards.length ? ` · 창고: ${fmt(result.rewards)}` : ''), at);
      setS(next);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [!!s.observedExpedition, setS]);

  useEffect(() => {
    if (!pocketMode) return;
    const timer = window.setInterval(() => {
      if (!enabledRef.current || Date.now() >= outdoorMovingRef.current) return;
      const p = ref.current; const at = Date.now();
      const target = generateWorld({ center: p.pos, radiusM: EXPEDITION_RADIUS_M, now: at, isNight: false, depleted: p.depleted, terrainZones: p.terrainZones }).find(e => e.kind === 'node' && nodeDef(e.type).requires.tier <= 1);
      if (!target) return;
      const cap = C.baseCarryKg + (p.level - 1) * C.carryPerLevelKg + ((p.base?.level ?? 0) >= 2 ? 10 : 0) + pocketBonusKg(p.techs);
      const { fit } = splitByCapacity(expeditionLoot(target, true), cap - stackWeight(p.backpack));
      if (!fit.length) return;
      const gathered = { ...p.gathered };
      for (const item of fit) gathered[item.itemId] = (gathered[item.itemId] ?? 0) + item.count;
      const learned = checkInspiration(gathered, p.techs);
      setS({ ...p, backpack: addStacks(p.backpack, fit), packedItems: [...new Set([...(p.packedItems ?? []), ...fit.map(x => x.itemId)])], gathered, techs: [...p.techs, ...learned.map(t => t.id)], depleted: { ...p.depleted, [target.id]: at }, ...addExperience(p, target.kind === 'node' ? nodeDef(target.type).xp : 0), expeditionLogs: appendLog(p, `포켓 자동채집 · 배낭: ${fmt(fit)}`, at) });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [pocketMode, setS]);

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
    const r = reachRadius(p.techs);
    if (distanceM(p.pos, l) > r) { toast.warning(`${r}m 안으로 다가가세요`); return null; }
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

  /** Shared GPS/range gate for sanctuary actions. */
  const shrineGate = (sh: Shrine): WorldSave | null => {
    const p = ref.current;
    if (!enabledRef.current) { toast.warning('정확한 GPS 신호를 기다려 주세요.'); return null; }
    const r = reachRadius(p.techs);
    if (distanceM(p.pos, sh) > r) { toast.warning(`${r}m 안으로 다가가세요`); return null; }
    return p;
  };

  /** Awaken a sanctuary into the player's network. Returns Melchizedek's words. */
  const awakenShrine = useCallback((sh: Shrine): string | null => {
    const p = shrineGate(sh); if (!p) return null;
    const res = discoverShrine(p.shrines ?? emptyShrineState(), sh.id);
    if (!res) return null;
    setS({ ...p, shrines: res.state });
    toast.success(`${sh.name} 각성 · 신성력 +${res.gained}`);
    return res.first ? MELCHIZEDEK_FIRST : MELCHIZEDEK_LINK;
  }, []);

  const shrineRite = useCallback((sh: Shrine, riteId: string): boolean => {
    const p = shrineGate(sh); if (!p) return false;
    const st = p.shrines ?? emptyShrineState();
    if (!st.found.includes(sh.id)) { toast.warning('먼저 성소를 깨우세요'); return false; }
    const rite = RITES.find((r) => r.id === riteId); if (!rite) return false;
    const left = removeStacks(p.backpack, rite.cost);
    if (!left) { toast.error('제물이 부족합니다'); return false; }
    setS({ ...p, backpack: rite.reward ? addStacks(left, rite.reward) : left, shrines: performRite(st, rite) });
    toast.success(`${rite.name} · 신성력 +${rite.sacred}${rite.reward ? ` · ${fmt(rite.reward)}` : ''}`);
    return true;
  }, []);

  const shrineBless = useCallback((sh: Shrine): boolean => {
    const p = shrineGate(sh); if (!p) return false;
    const st = p.shrines ?? emptyShrineState();
    if (!st.found.includes(sh.id)) { toast.warning('먼저 성소를 깨우세요'); return false; }
    const now = Date.now();
    const check = canBless(st, sh.id, now);
    if (!check.ok) { toast(`제단이 아직 비어 있습니다 · ${Math.ceil((check as { waitMs: number }).waitMs / 3_600_000)}시간 뒤`); return false; }
    const gift = blessingGift(st);
    if (stackWeight(gift) > capacity - stackWeight(p.backpack)) { toast.warning('배낭이 너무 무겁습니다'); return false; }
    setS({ ...p, backpack: addStacks(p.backpack, gift), shrines: recordBlessing(st, sh.id, now) });
    toast.success(`제단의 축복: ${fmt(gift)}`);
    return true;
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
    return { ...p, backpack: kept, hp: Math.round(maxHpOf(p) / 2), pos: p.base ?? p.pos };
  };

  // Report whether a hit succeeded so automatic actions stop on rejected attempts.
  const interact = useCallback((e: WorldEntity): boolean => {
    if (!enabledRef.current) { toast.warning('정확한 GPS 신호를 기다려 주세요.'); return false; }
    const p = ref.current;
    if (e.kind === 'node' ? !isNodeAvailable(e.id, e.type, p.depleted, Date.now()) : !!p.depleted[e.id]) return false;
    const r = reachRadius(p.techs);
    if (distanceM(p.pos, e) > r) { toast.warning(`${r}m 안으로 다가가세요`); return false; }
    if (e.kind === 'creature') {
      const at = Date.now();
      if (at - lastCreatureAttack.current < CREATURE_ATTACK_INTERVAL_MS) return false;
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
          return false;
        }
        if (!tool) return false;
        power = ITEMS[tool.itemId].tool?.power ?? 1;
      }
    } else {
      const d = creatureDef(e.type);
      label = d.name; need = d.hp; loot = d.loot;
      power = weapon ? ITEMS[weapon.itemId].weapon?.atk ?? C.fistAtk : C.fistAtk;
      if (p.techs.includes('primal_strike')) power *= primalStrikeMult(techLevel(p.techLevels, 'primal_strike'));
      const ranged = !!(weapon && ITEMS[weapon.itemId].weapon?.ranged) && !p.damage[e.id];
      power += (p.companions ?? []).some(c => c.kind === 'wolf') ? 3 : 0;
      const defense = (atMainBase(p) && p.palisade ? 3 : 0) + (armor ? ITEMS[armor.itemId].armor?.def ?? 0 : 0) + (p.techs.includes('iron_skin') ? ironSkinDef(techLevel(p.techLevels, 'iron_skin')) : 0);
      const exchange = resolveCreatureHit(e.type, p.damage[e.id] ?? 0, power, defense, ranged || (p.calmUntil?.[e.id] ?? 0) > Date.now());
      power = exchange.dealt - (p.damage[e.id] ?? 0);
      hp -= exchange.counterDamage;
      if (exchange.counterDamage) toast.error(`${d.name} 반격! 체력 -${exchange.counterDamage}`);
      if (hp <= 0) { setS(die({ ...next, hp })); return false; }
      if (!exchange.defeated && d.temper === 'passive' && Math.random() < (d.escapeChance ?? 0)) {
        toast(`${d.name}이(가) 달아났습니다`);
        delete next.damage[e.id];
        setS({ ...next, hp, depleted: { ...p.depleted, [e.id]: Date.now() } });
        return true;
      }
    }
    if (hp <= 0) { setS(die({ ...next, hp })); return false; }
    next.hp = hp;
    const dealt = (p.damage[e.id] ?? 0) + power;
    if (dealt < need) {
      next.damage[e.id] = dealt;
      setS(next);
      return true;
    }
    delete next.damage[e.id];
    const got = options.indoor && Date.now() < outdoorMovingRef.current ? expeditionLoot(e, true) : rollLoot(loot);
    const free = capacity - stackWeight(p.backpack);
    const fits = stackWeight(got) <= free;
    next.backpack = fits ? addStacks(p.backpack, got) : p.backpack;
    next.depleted = { ...p.depleted, [e.id]: Date.now() };
    const gathered = { ...p.gathered };
    if (fits) got.forEach((g) => { gathered[g.itemId] = (gathered[g.itemId] ?? 0) + g.count; });
    next.gathered = gathered;
    next.kills = p.kills + (e.kind === 'creature' ? 1 : 0);
    if (e.kind === 'creature' && creatureDef(e.type).boss) next.rescueTokens = Math.min(2, (p.rescueTokens ?? 0) + 1);
    next = gainXp(next, e.kind === 'node' ? nodeDef(e.type).xp : creatureDef(e.type).xp);
    if (e.kind === 'creature' && creatureDef(e.type).boss && fits) toast.success(`우두머리 처치! ${d0Name(e.type)}`, { description: `획득: ${fmt(got)}` });
    else if (fits) toast.success(`획득: ${fmt(got) || '없음'}`); else toast.warning('배낭이 너무 무겁습니다! 거점에 다녀오세요');
    next = learn(next, checkInspiration(gathered, next.techs));
    setS(next);
    return true;
  }, [best, weapon, armor, capacity, options.indoor]);

  const eat = useCallback((itemId: ItemId) => {
    const it = ITEMS[itemId];
    const p = ref.current;
    const from = p.backpack.some((x) => x.itemId === itemId) ? 'backpack' : 'storage';
    if (!enabledRef.current || (from === 'storage' && !atWorkshop(p))) return;
    if (it.book) {
      if (p.techs.includes(it.book.techId)) { toast('이미 아는 기술입니다'); return; }
      const read = readSkillBook(p[from], itemId, p.techs);
      if (!read) return;
      setS(learn({ ...p, [from]: read.remaining }, [read.tech]));
      return;
    }
    const left = removeStacks(p[from], [{ itemId, count: 1 }]);
    if (!left) return;
    const hpGain = it.food?.hp ?? it.heal ?? 0;
    setS({ ...p, [from]: left, hunger: Math.min(100, p.hunger + (it.food?.hunger ?? 0)), hp: Math.max(1, Math.min(maxHpOf(p), p.hp + hpGain)) });
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
    if (p.base.level === 1 && !p.techs.includes('hut_building')) { toast.error('움집 기술을 먼저 연구하세요'); return; }
    if (p.baseUpgrade) { toast.warning('이미 발전 공사 중입니다'); return; }
    const lv = (p.base.level + 1) as 2 | 3;
    const left = removeStacks(p.storage, BASE_LEVELS[lv].cost);
    if (!left) { toast.error('창고 재료가 부족합니다'); return; }
    const now = Date.now();
    setS({ ...p, storage: left, baseUpgrade: { id: String(lv), startedAt: now, readyAt: now + BASE_UPGRADE_MS[lv] } });
    toast.success(`${BASE_LEVELS[lv].name} 공사를 시작했습니다`);
  }, []);
  /** Completes a finished base upgrade (no GPS needed: it was paid on site). */
  const claimBaseUpgrade = useCallback(() => {
    const p = ref.current; const job = p.baseUpgrade;
    if (!p.base || !job || Date.now() < job.readyAt) return;
    const lv = Number(job.id) as 2 | 3;
    setS({ ...p, baseUpgrade: null, base: { ...p.base, level: lv } });
    toast.success(`${BASE_LEVELS[lv].name}(으)로 발전!`);
  }, [setS]);

  const research = useCallback((techId: string) => {
    const result = startResearch(ref.current, techId, enabledRef.current, Date.now());
    if (result.ok === false) { toast.warning(result.reason); return; }
    setS(result.state);
    toast.success(`${techById(techId)?.name} 연구 시작`);
  }, [setS]);
  const claimTech = useCallback((id: string) => {
    const result = claimResearch(ref.current, id, Date.now());
    if (result.ok === false) { toast.warning(result.reason); return; }
    setS(result.state);
    const lv = result.state.techLevels?.[id];
    toast.success('연구가 완료되었습니다', { description: `${techById(id ?? '')?.name ?? ''}${lv && lv > 1 ? ` Lv.${lv}` : ''} 습득` });
  }, [setS]);
  const startExpedition = useCallback(() => {
    const p = ref.current;
    if (!enabledRef.current || !atMainBase(p)) { toast.warning('본거지에서 원정대를 보낼 수 있어요'); return; }
    if (p.expedition) { toast.warning('원정대가 이미 나가 있습니다'); return; }
    if (mapFragments(p.exploredTotal ?? p.explored.length, p.expeditionMark ?? 0) < 1) { toast.error('사냥터 지도 조각이 없습니다. 밖에서 새 지역을 걸어 밝히세요'); return; }
    const paid = payExpeditionFood(p.backpack, p.storage);
    if (!paid) { toast.error(`식량이 부족합니다 (말린 고기·구운 고기 ${EXPEDITION_FOOD_COUNT}개)`); return; }
    const now = Date.now();
    setS({ ...p, ...paid, expeditionMark: (p.expeditionMark ?? 0) + 25, expedition: { startedAt: now, readyAt: now + EXPEDITION_MS, seed: (now ^ Math.floor(Math.random() * 1e9)) >>> 0 } });
    toast.success('원정대가 사냥터로 떠났습니다');
  }, [setS]);
  const claimExpedition = useCallback(() => {
    const p = ref.current; const e = p.expedition;
    if (!e || Date.now() < e.readyAt || !p.base) return;
    setS({ ...p, expedition: null, storage: addStacks(p.storage, expeditionRewards(e.seed)), scoutReport: scoutReport(e.seed, p.base) });
    toast.success('원정대 귀환! 전리품을 창고에 넣었습니다', { description: '정찰 보고서가 도착했어요' });
  }, [setS]);

  const craft = useCallback((r: Recipe) => {
    const p = ref.current;
    if (!enabledRef.current || !atWorkshop(p)) return;
    if (!isRecipeUnlocked(r, p.techs)) { toast.error('아직 제작법을 모릅니다'); return; }
    if ((r.minLevel ?? 1) > p.level) { toast.error(`족장 Lv.${r.minLevel}부터 만들 수 있어요`); return; }
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
    toast.success(`${it.name} 제작 완료!`, { description: it.durability !== undefined ? '배낭에 담았어요' : '창고에 넣었어요' });
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

  const [skillEffect, setSkillEffect] = useState<{ id: ActiveSkill; at: number } | null>(null);
  const useSkill = useCallback((id: ActiveSkill) => {
    const p = ref.current;
    const at = Date.now();
    const targets = entities.filter((e): e is Extract<WorldEntity, { kind: 'creature' }> => e.kind === 'creature' && !p.depleted[e.id]);
    const result = prepareSkill(p, id, targets, at, enabledRef.current);
    if (result.ok === false) { toast.warning(result.reason); return false; }
    const lv = skillLevel(p.skillLevels, id);
    let next: WorldSave = { ...result.state, damage: { ...p.damage }, depleted: { ...p.depleted }, cooldowns: { ...result.state.cooldowns, [id]: at + skillCooldownMs(id, lv) } };
    if (id !== 'roar') for (const e of result.targets ?? []) {
      const def = creatureDef(e.type);
      const damage = (next.damage[e.id] ?? 0) + skillDamage(id, lv);
      if (damage < def.hp) { next.damage[e.id] = damage; continue; }
      delete next.damage[e.id];
      next.depleted[e.id] = at;
      const got = rollLoot(def.loot);
      if (stackWeight(got) <= capacity - stackWeight(next.backpack)) {
        next.backpack = addStacks(next.backpack, got);
        next.gathered = { ...next.gathered };
        for (const item of got) next.gathered[item.itemId] = (next.gathered[item.itemId] ?? 0) + item.count;
        toast.success(`획득: ${fmt(got)}`);
      } else toast.warning('배낭이 가득 차 전리품을 담지 못했습니다');
      next.kills += 1;
      if (def.boss) next.rescueTokens = Math.min(2, (next.rescueTokens ?? 0) + 1);
      next = gainXp(next, def.xp);
    }
    next = learn(next, checkInspiration(next.gathered, next.techs));
    setS(next);
    setSkillEffect({ id, at });
    toast.success(`${ACTIVE_SKILLS[id].name} 사용`);
    return true;
  }, [capacity, entities, setS]);
  const construct = useCallback((kind: 'palisade' | 'outpost') => {
    const result = buildStructure(ref.current, kind, enabledRef.current);
    if (result.ok === false) { toast.warning(result.reason); return; }
    setS(result.state); toast.success(kind === 'palisade' ? '목책을 세웠습니다' : '전진기지를 세웠습니다');
  }, [setS]);
  const tame = useCallback((id: string) => {
    const p = ref.current;
    const e = entities.find(e => e.id === id && e.kind === 'creature');
    if (!e || e.kind !== 'creature' || p.depleted[id]) { toast.warning('늑대가 더 이상 이곳에 없습니다'); return; }
    const result = tameWolf(p, e, p.damage[id] ?? 0, Date.now(), enabledRef.current, Math.random());
    if (result.ok === false) { toast.warning(result.reason); return; }
    setS(result.tamed ? { ...result.state, depleted: { ...p.depleted, [id]: Date.now() } } : result.state);
    toast(result.tamed ? '늑대가 동료가 되었습니다' : '늑대가 거부했습니다. 재료가 소모되었습니다');
  }, [entities, setS]);
  const recruit = useCallback((kind: 'gatherer' | 'rescued', shaman?: Landmark) => {
    const result = recruitCompanion(ref.current, kind, Date.now(), enabledRef.current, shaman?.kind === 'shaman' ? shaman : undefined);
    if (result.ok === false) { toast.warning(result.reason); return; }
    setS(result.state); toast.success('새로운 NPC 동료를 맞았습니다');
  }, [setS]);
  const collectWork = useCallback(() => {
    const result = collectCompanionWork(ref.current, Date.now(), enabledRef.current);
    if (result.ok === false) { toast.warning(result.reason); return; }
    setS(result.state); toast.success('동료가 모은 재료를 창고에 보관했습니다');
  }, [setS]);
  /** Apply externally settled storage changes (e.g. vassal tribute in/out). */
  const adjustStorage = useCallback((add: Stack[], remove: Stack[] = []) => {
    const p = ref.current;
    const left = remove.length ? removeStacks(p.storage, remove) : p.storage;
    if (!left) return false;
    setS({ ...p, storage: addStacks(left, add) });
    return true;
  }, [setS]);
  const withdraw = useCallback((itemId: ItemId) => {
    const p = ref.current;
    if (!enabledRef.current || !atWorkshop(p)) { toast.warning('거점 안에서만 꺼낼 수 있습니다'); return; }
    const storage = removeStacks(p.storage, [{ itemId, count: 1 }]);
    if (!storage || stackWeight(p.backpack) + ITEMS[itemId].weight > capacity) return;
    setS({ ...p, storage, backpack: addStacks(p.backpack, [{ itemId, count: 1 }]), packedItems: [...new Set([...(p.packedItems ?? []), itemId])] });
  }, [capacity, setS]);

  const storePacked = useCallback(() => {
    if (!enabledRef.current || !atWorkshop(ref.current)) return;
    setS(p => ({ ...p, packedItems: [] }));
  }, [setS]);

  const reset = useCallback(() => { setS(fresh(ref.current.pos)); }, [setS]);

  /** Discard selected backpack stacks; counts are clamped to what is held. */
  const dropItems = useCallback((drops: Stack[]) => {
    const p = ref.current;
    const valid = drops
      .map(d => ({ itemId: d.itemId, count: Math.min(Math.floor(d.count), p.backpack.find(b => b.itemId === d.itemId)?.count ?? 0) }))
      .filter(d => d.count > 0);
    if (!valid.length) return;
    const left = removeStacks(p.backpack, valid);
    if (!left) { toast.error('버릴 수량을 다시 확인하세요'); return; }
    setS({ ...p, backpack: left });
    toast.success(`${valid.reduce((n, d) => n + d.count, 0)}개를 버렸습니다`);
  }, [setS]);

  /** Apply external damage (e.g. another player's attack), reduced by worn armor. */
  const takeDamage = useCallback((amount: number) => {
    const p = ref.current;
    const armorGear = resolveLoadout(p.gear, p.equipped, p.level).armor;
    const dmg = Math.max(1, Math.round(amount) - (armorGear ? ITEMS[armorGear.itemId].armor?.def ?? 0 : 0) - (p.techs.includes('iron_skin') ? ironSkinDef(techLevel(p.techLevels, 'iron_skin')) : 0));
    const hp = p.hp - dmg;
    setS(hp <= 0 ? die({ ...p, hp }) : { ...p, hp });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setS]);

  const upgradeSkill = useCallback((id: ActiveSkill) => {
    const p = ref.current;
    if (!p.techs.includes(id)) { toast.warning('기술을 먼저 배우세요'); return; }
    const lv = skillLevel(p.skillLevels, id);
    const cost = skillUpgradeCost(lv);
    if (!cost) { toast('이미 최고 레벨입니다'); return; }
    const paid = payAccessible(p, cost);
    if (!paid) { toast.error(`재료 부족: ${fmt(cost)}`); return; }
    setS({ ...paid, skillLevels: { ...p.skillLevels, [id]: lv + 1 } });
    toast.success(`${ACTIVE_SKILLS[id].name} Lv.${lv + 1}`);
  }, [setS]);
  const buildAltar = useCallback(() => {
    const p = ref.current;
    if (!enabledRef.current || !atMainBase(p)) { toast.warning('정확한 GPS 신호가 있는 본거지에서 세우세요'); return; }
    if (p.altar) return;
    if ((p.base?.level ?? 0) < 2) { toast.warning('뼈 움막을 먼저 완공하세요'); return; }
    const paid = payAccessible(p, ALTAR_COST);
    if (!paid) { toast.error(`재료 부족: ${fmt(ALTAR_COST)}`); return; }
    setS({ ...paid, altar: true });
    toast.success('제단을 세웠습니다. 이제 발명할 수 있어요');
  }, [setS]);
  /** Consumes the materials and adds one invented item as equipped gear. */
  const invent = useCallback((input: InventionInput, naming?: { name: string; desc: string; masterwork?: boolean }) => {
    const p = ref.current;
    if (!enabledRef.current || !atMainBase(p)) { toast.warning('본거지 연구 시설 앞에서 발명하세요'); return null; }
    const check = checkFacility(input, !!p.altar);
    if (check.ok === false) return null;
    const cost = Object.entries(input.materials).filter(([, q]) => q > 0).map(([itemId, count]) => ({ itemId: itemId as ItemId, count }));
    const paid = payAccessible(p, cost);
    if (!paid) { toast.error('재료가 부족합니다 (배낭 또는 창고)'); return null; }
    const id = inventionId(check.hash);
    const known = (p.inventions ?? []).find(x => x.id === id);
    const inv: InventedItem = known ?? { id, hash: check.hash, name: naming?.name ?? id, desc: naming?.desc ?? '', category: input.category, materials: input.materials, heat: input.heat, sacred: input.sacred, masterwork: naming?.masterwork, power: check.power, createdAt: Date.now() };
    const inventions = known ? p.inventions ?? [] : [...(p.inventions ?? []), inv];
    registerInventions(inventions);
    const g: GearInstance = { uid: crypto.randomUUID(), itemId: id as ItemId, quality: naming?.masterwork ? 'MASTERWORK' : 'NORMAL', durability: INVENTED_DURABILITY, maxDurability: INVENTED_DURABILITY };
    setS({ ...paid, inventions, gear: [...paid.gear, g] });
    toast.success(`${inv.name} 완성! 배낭에 담았어요`, { description: known ? '알려진 발명품을 다시 만들었습니다' : '제작 탭에 레시피가 등록되었어요. 배낭에서 착용할 수 있어요' });
    return inv;
  }, [setS]);

  /** Re-make a known invention from its recorded materials (no invention credit). */
  const craftInvention = useCallback((id: string) => {
    const p = ref.current;
    if (!enabledRef.current || !atMainBase(p)) { toast.warning('본거지 안에서 제작하세요'); return; }
    const inv = (p.inventions ?? []).find(x => x.id === id);
    if (!inv) return;
    const cost = Object.entries(inv.materials).filter(([, q]) => q > 0).map(([itemId, count]) => ({ itemId: itemId as ItemId, count }));
    const paid = payAccessible(p, cost);
    if (!paid) { toast.error('재료가 부족합니다 (배낭 또는 창고)'); return; }
    const g: GearInstance = { uid: crypto.randomUUID(), itemId: id as ItemId, quality: 'NORMAL', durability: INVENTED_DURABILITY, maxDurability: INVENTED_DURABILITY };
    setS({ ...paid, gear: [...paid.gear, g] });
    toast.success(`${inv.name} 제작 완료! 배낭에 담았어요`);
  }, [setS]);

  const equip = useCallback((slot: GearSlot, uid: string | null) => {
    setS(p => ({ ...p, equipped: equipInSlot(p.equipped, slot, uid) }));
  }, [setS]);

  const pickEgg = useCallback((egg: EggSpawn) => {
    const p = ref.current;
    if (!enabledRef.current) { toast.warning('정확한 GPS 신호를 기다려 주세요.'); return false; }
    if (p.depleted[egg.id]) return false;
    if (distanceM(p.pos, egg) > EGG_PICK_RADIUS_M) { toast.warning(`${EGG_PICK_RADIUS_M}m 안으로 다가가세요`); return false; }
    setS({ ...p, backpack: addStacks(p.backpack, [{ itemId: 'dino_egg', count: 1 }]), depleted: { ...p.depleted, [egg.id]: Date.now() },
      dinoEggs: [...(p.dinoEggs ?? []), newEgg(egg.id, p.walkSteps ?? 0, Math.random())] });
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(200);
    toast.success('신비한 픽셀 공룡 알을 주웠어요!', { description: '정해진 거리만큼 걸은 뒤 거점에 오면 부화해요.' });
    return true;
  }, [setS]);
  const hatchEgg = useCallback((eggId: string) => {
    const p = ref.current;
    const egg = (p.dinoEggs ?? []).find(e => e.id === eggId);
    if (!egg || !inBase || !eggReady(egg, p.walkSteps ?? 0)) return null;
    const fromPack = removeStacks(p.backpack, [{ itemId: 'dino_egg', count: 1 }]);
    const fromStore = fromPack ? null : removeStacks(p.storage, [{ itemId: 'dino_egg', count: 1 }]);
    const baby = babyFor(egg);
    setS({ ...p, backpack: fromPack ?? p.backpack, storage: fromStore ?? p.storage, dinoEggs: (p.dinoEggs ?? []).filter(e => e.id !== eggId), babyDinos: [...(p.babyDinos ?? []), baby.id] });
    return baby;
  }, [setS, inBase]);
  const updateInventionCredits = useCallback((credits: InventionCredits) => setS(p => ({ ...p, inventionCredits: credits, inventionWalkMark: credits.walkMeters === 0 ? p.walkSteps ?? 0 : p.inventionWalkMark })), [setS]);

  return { pickEgg, hatchEgg, ensureStarterCamp, dispatchObserved, toggleExpeditionAuto, rallyExpedition, recallExpedition, pocketMode, togglePocket: () => setPocketMode(p => !p), outdoorMoving: enabled && Date.now() < movingUntil, craftInvention, equip, loadout, updateInventionCredits, awakenShrine, shrineRite, shrineBless, upgradeSkill, buildAltar, invent, setSanctuaries, inSanctuary, useSkill, skillEffect, construct, tame, recruit, collectWork, withdraw, storePacked, adjustStorage,
    recordTerrainZone, recordPark, visitLandmark, sellItem, buyItem, takeDamage,
    state: s, entities, vision, reach, isNight, inBase, baseDef, weight, capacity, weapon, maxHp: maxHpOf(s),
    moveTo, interact, eat, placeBase, upgradeBase, claimBaseUpgrade, research, claimTech, startExpedition, claimExpedition, craft, reset, dropItems,
    quest, questProgress, canClaimQuest, claimQuest, nextLevelXp: xpToNext(s.level),
    canAfford: (st: Stack[]) => hasAll(s.storage, st),
    recipes: RECIPES, NODES, CREATURES,
  };
}
