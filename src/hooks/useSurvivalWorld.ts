// @refresh reset
import { armorySuccessChance, armoryUpgradeCost, gearMult, upgradeCost, weaponAtkWithPlus, weaponAuraForPlus } from '@/lib/survival/upgrade';
import { isWalkingPace } from '@/lib/survival/walkPace';
import { advanceExpedition, steerExpedition, pickManualTarget, MANUAL_PICK_M, expeditionLoot, isPocketMovement, startObservedExpedition, EXPEDITION_RADIUS_M, FOCUS_LABEL, CREW_HEAL_FOODS, crewHealGain, DAILY_EXPEDITION_AUTO_LIMIT_SEC, TRIBE_XP_RATIO, getTodayKey, type ExpeditionFocus, type ObservedExpedition, type ExpeditionLog } from '@/lib/survival/expedition';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import { ITEMS, requiredRangedAmmo, findAvailableAmmo, computeRangedReach, type ItemId } from '@/lib/survival/items';
import { CREATURES, NODES, creatureDef, nodeDef, type LootRoll } from '@/lib/survival/entities';
import { activePetAbilities, bleedDamage, walkLimitKmh, regenHp, REGEN_INTERVAL_MS } from '@/lib/survival/petAbilities';
import { MAX_WALK_KMH } from '@/lib/survival/walkPace';
import { CREATURE_ATTACK_INTERVAL_MS, resolveCreatureHit, rollLoot } from '@/lib/survival/combat';
import { RECIPES, type Recipe } from '@/lib/survival/recipes';
import { BASE_LEVELS, CAMP_COST } from '@/lib/survival/bases';
import { SURVIVAL_CONFIG as C } from '@/lib/survival/config';
import { visionBonus, reachRadius, eggReachRadius, pocketBonusKg } from '@/lib/survival/utilitySkills';
import { BASE_UPGRADE_MS, EXPEDITION_FOOD_COUNT, EXPEDITION_MS, expeditionRewards, mapFragments, payExpeditionFood, scoutReport, type Expedition, type ScoutTarget, type TimedJob } from '@/lib/survival/homeActivities';
import { EGG_PICK_RADIUS_M, EGG_RESPAWN_MS, advanceEggs, babyFor, eggReady, newEgg, petById, type BabyDinoId, type CarriedEgg, type EggSpawn } from '@/lib/survival/dinoEggs';
import { ACTIVE_SKILLS, claimResearch, startResearch, atMainBase, atWorkshop, buildStructure, relocateOutpost, collectCompanionWork, prepareSkill, recruitCompanion, tameWolf, type ActiveSkill, type Companion } from '@/lib/survival/abilities';
import { advanceSurvivalVitals } from '@/lib/survival/metabolism';
import { distanceM } from '@/lib/survival/geo';
import { generateWorld, isNodeAvailable } from '@/lib/survival/world';
import { getCustomMobVersion } from '@/lib/survival/customMobs';
import { hireMercenary, mercActive, tribeHireCost, tribeTrainCost, tribeRatio, tribeInjured, settleUpkeep, upkeepDemand, hasEdibleFoodInStorage, escortReady, escortAmbushDamage, ESCORT_GATHER_MULT, TRIBE_INJURY_MS, TRIBE_TREAT_COST, UPKEEP_MS, type MercenaryContract, type TribeState } from '@/lib/survival/mercenaries';
import { applyTribeWallDefense, DEFAULT_TRIBE_CLASS, getTribeClass, tribeCarryBonusKg, type TribeClassId } from '@/data/tribeClasses';
import { blueprintResearchCost, canPlaceVillageBuilding, computeBuildingHarvestBubble, computeVillageBonuses, ensureVillageState, isArtisanUnlocked, isBlueprintResearched, moveVillageBuilding, placeVillageBuilding, placeCustomVillageBuilding, removeVillageBuilding, SHAMAN_SKILL_DEFS, shamanSkillLevel, VILLAGE_BUILDINGS, type ShamanSkillId, type VillageBuildingId, type VillageState } from '@/lib/survival/village';
import type { BuildingMechanicTag, GearMechanicTag, PhysicalAttributes } from '@/lib/survival/intentCrafting';
import {
  SHAMAN_CLASSES,
  SHAMAN_QUEST_STAGES,
  checkShamanQuestStageProgress,
  type ShamanClassId,
  type ShamanLevel,
} from '@/lib/survival/shamanEvolution';
import { CIV_TECHS, checkCivTechStatus, getCivilizationEraBadge, type CivTechDef } from '@/lib/survival/civilizationTech';
import { settleFoodSpoilage, SMOKE_CURING_MS, TAVERN_RECIPES, SHAMAN_CUISINE_RECIPES, type SmokehouseBatch, type ActiveFoodBuff, type CookingJob, type ShamanDishDef } from '@/lib/survival/culinary';
import { computeExpeditionLevel, detectExpeditionPins, type RadarPin } from '@/lib/survival/radar';
import { addStacks, countOf, hasAll, removeStacks, splitDeathDrop, splitByCapacity, stackWeight, transferStack, validStackCount } from '@/lib/survival/inventory';
import { addExperience, dayPhase, xpToNext } from '@/lib/survival/progression';
import { claimWorldQuest, freshProgress, type WorldProgress } from '@/lib/survival/worldProgress';
import { currentQuest, LANGUAGE_QUEST, languageQuestProgress, questReady, type QuestState } from '@/lib/survival/quests';
import { checkInspiration, isRecipeUnlocked, prerequisitesMet, readSkillBook, techById, type TechDef } from '@/lib/survival/tech';
import { giantHeartHpBonus, ironSkinDef, primalStrikeMult, longReachBonus, techLevel, wildVitalityRegenBonus } from '@/lib/survival/techLevels';
import { SANCTUARY_RADIUS_M, SANCTUARY_REGEN_PER_TICK, LANDMARK_INFO, SHAMAN_BLESS_XP, SHAMAN_RUMORS, SHAMAN_TIPS, TRADER_STOCK, canClaimLandmark, landmarkReward, recordLandmarkClaim, sellPrice, type Landmark, type LandmarkClaims } from '@/lib/survival/landmarks';
import type { TerrainZone } from '@/lib/survival/terrainZone';
import { MELCHIZEDEK_FIRST, MELCHIZEDEK_LINK, RITES, blessingGift, canBless, discoverShrine, emptyShrineState, performRite, recordBlessing, type Shrine, type ShrineState } from '@/lib/survival/sanctuaries';
import { skillCooldownMs, skillDamage, skillLevel, skillUpgradeCost } from '@/lib/survival/skillLevels';
import { ALTAR_COST, INVENTED_DURABILITY, inventionId, registerInventions, gearCategory, gearBasePower, type InventedItem } from '@/lib/survival/inventedItems';
import { checkFacility, reforgePower, REFORGE_SLOTS, type InventionInput, type ReforgeGrade } from '@/lib/survival/invention';
import { equipInSlot, resolveLoadout, type Equipped, type GearSlot } from '@/lib/survival/equipment';
import { type InventionCredits } from '@/lib/survival/inventionCredits';
import { payAccessible } from '@/lib/survival/abilities';
import type { GearInstance, LatLng, Stack, WorldEntity } from '@/lib/survival/types';

import { advancePetDefense, deployPet, setPetRole, settlePetHunts, petRole, PET_GUARD_SLOTS, PET_FOLLOW_SLOTS, PET_FOLLOW_ATK, petStats, type PetRole, fusePets, hatchPet, migratePets, type OwnedPet, type PetDefense, type PetHit } from '@/lib/survival/pets';

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
  pets?: OwnedPet[];
  petDefense?: PetDefense;
  shrines?: ShrineState;
  researching?: TimedJob | null;
  researchJobs?: TimedJob[];
  baseUpgrade?: TimedJob | null;
  expedition?: Expedition | null;
  observedExpedition?: ObservedExpedition | null;
  expeditionAuto?: boolean;
  expeditionAutoDay?: string;
  expeditionAutoSecToday?: number;
  mercenary?: MercenaryContract | null;
  shamanMet?: boolean;
  tribe?: TribeState;
  village?: VillageState;
  expeditionCount?: number;
  expeditionDistanceM?: number;
  discoveredPins?: RadarPin[];
  languageQuestAccepted?: boolean;
  languageLearned?: boolean;
  shamanQuestAcceptedIndex?: number;
  shamanLevel?: 1 | 2 | 3 | 4 | 5;
  shamanClass?: ShamanClassId | null;
  classResource?: number;
  civilizationTechs?: string[];
  smokeBatches?: SmokehouseBatch[];
  lastFreshnessCheckAt?: number;
  shamanTourDone?: boolean;
  expeditionLogs?: ExpeditionLog[];
  /** Placeholder camps may be anchored once to the first accepted actual GPS fix. */
  starterCampPending?: boolean;
  expeditionMark?: number;
  /** Lifetime explored steps; explored[] itself is capped. */
  exploredTotal?: number;
  scoutReport?: ScoutTarget[];
  lastAteAt?: number;
  /** Active food timed buffs */
  activeBuffs?: ActiveFoodBuff[];
  /** Permanent stat increases gained from consuming health tonics/건강식 (+0.5 ~ +1) */
  permanentStats?: {
    maxHpBonus?: number;
    atkBonus?: number;
    defBonus?: number;
    carryBonus?: number;
  };
  /** Cooking cauldron ongoing jobs */
  cookingJobs?: CookingJob[];
  lastTickAt: number;
}

const fresh = (start: LatLng): WorldSave => ({
  ...freshProgress(),
  pos: start, hp: C.baseMaxHp, hunger: 100, backpack: [], storage: [], gear: [], base: null,
  depleted: {}, damage: {}, gathered: {}, techs: [], explored: [start], terrainZones: {}, parkCells: {}, shamanLevel: 1, shamanClass: 'NONE', classResource: 100, civilizationTechs: ['tech_fire_gathering'], lastTickAt: Date.now(),
});

function migrateTribeState(saved: Partial<WorldSave>): Partial<WorldSave> {
  const count = saved.tribe?.count ?? 0;
  if (count > 0) {
    const hasAmbacho = (saved.tribe?.classCounts?.gatherer ?? 0) > 0 || saved.mercenary?.name === '암바초';
    const tankCount = hasAmbacho ? Math.max(0, count - 1) : count;
    const classCounts: Partial<Record<TribeClassId, number>> = {
      tank: tankCount,
      ...(hasAmbacho ? { gatherer: 1 } : {}),
    };
    return {
      ...saved,
      tribe: {
        trainLevel: 0,
        ...saved.tribe,
        count,
        classId: 'tank',
        classCounts,
      },
      mercenary: saved.mercenary ? {
        ...saved.mercenary,
        classId: saved.mercenary.name === '암바초' ? 'gatherer' : 'tank',
      } : saved.mercenary,
    };
  }
  return saved;
}

function load(start: LatLng, saveKey: string): WorldSave {
  try {
    const raw = localStorage.getItem(saveKey);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<WorldSave>;
      const migrated = migrateTribeState(saved);
      return migratePets({ ...fresh(start), ...migrated, base: migrated.base ? { ...migrated.base, placedAt: migrated.base.placedAt ?? Date.now() } : null }, id => petById(id)?.name ?? id);
    }
  } catch (e) {
    console.error('[survival] failed to load save', e);
  }
  return fresh(start);
}

const fmt = (st: Stack[]) => st.map((s) => `${ITEMS[s.itemId].name} ×${s.count}`).join(', ');

/** Max HP grows with giant_heart tech level + permanent health tonic bonus (+10 per tonic). */
const maxHpOf = (p: {
  techs: string[];
  techLevels?: Record<string, number>;
  permanentStats?: { maxHpBonus?: number };
}) =>
  C.baseMaxHp +
  (p.techs.includes('giant_heart')
    ? giantHeartHpBonus(techLevel(p.techLevels, 'giant_heart'))
    : 0) +
  (p.permanentStats?.maxHpBonus ?? 0);

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
  const [petHits, setPetHits] = useState<PetHit[]>([]);

  const ensureStarterCamp = useCallback(() => {
    setS(p => p.base ? p : { ...p, base: { ...p.pos, level: 1, placedAt: Date.now() }, starterCampPending: true });
  }, [setS]);
  useEffect(() => { if (options.indoor) ensureStarterCamp(); }, [options.indoor, ensureStarterCamp]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  useEffect(() => {
    try { localStorage.setItem(saveKey, JSON.stringify(s)); }
    catch { toast.error('진행 상태를 기기에 저장하지 못했습니다. 저장 공간을 확인해 주세요.'); }
  }, [s, saveKey]);

  useEffect(() => {
    const t = ref.current.tribe;
    if (t && t.count > 0 && (t.classId !== 'tank' || !t.classCounts?.tank)) {
      const hasAmbacho = (t.classCounts?.gatherer ?? 0) > 0 || ref.current.mercenary?.name === '암바초';
      const tankCount = hasAmbacho ? Math.max(0, t.count - 1) : t.count;
      setS(p => ({
        ...p,
        tribe: {
          ...p.tribe!,
          classId: 'tank',
          classCounts: {
            tank: tankCount,
            ...(hasAmbacho ? { gatherer: 1 } : {}),
          },
        },
      }));
    }
  }, [setS]);

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
      // A fresh device save (lower progress) must never overwrite a more advanced cloud save.
      const progress = (w: Partial<WorldSave>) => (w.level ?? 1) * 1e9 + (w.xp ?? 0);
      const remoteAhead = remote && (progress(remote) !== progress(local)
        ? progress(remote) > progress(local)
        : (remote.lastTickAt ?? 0) > local.lastTickAt);
      if (remote && remoteAhead) {
        skipNextUploadRef.current = true;
        const migratedRemote = migrateTribeState(remote);
        setS(migratePets({ ...fresh(local.pos), ...migratedRemote, base: migratedRemote.base ? { ...migratedRemote.base, placedAt: migratedRemote.base.placedAt ?? Date.now() } : null }, id => petById(id)?.name ?? id));
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
    if (!userId || (!s.observedExpedition && !s.pets?.some(p => p.deployed))) return;
    const timer = window.setInterval(() => {
      if (!cloudReadyRef.current) return;
      void supabase.from('survival_saves').upsert({ user_id: userId, payload: ref.current as unknown as Json, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('[survival] expedition save failed', error); });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [userId, !!s.observedExpedition, s.pets?.some(p => p.deployed)]);

  const isNight = dayPhase(new Date(now)) === 'night';
  const villageBonuses = useMemo(() => computeVillageBonuses(s.village), [s.village]);
  const freshnessInfo = useMemo(
    () => settleFoodSpoilage(s.backpack, s.storage, s.lastFreshnessCheckAt, now),
    [s.backpack, s.storage, s.lastFreshnessCheckAt, now]
  );
  useEffect(() => {
    if (freshnessInfo.spoiledCount <= 0) return;
    setS(p => {
      const settled = settleFoodSpoilage(p.backpack, p.storage, p.lastFreshnessCheckAt, Date.now());
      if (settled.spoiledCount <= 0) return p;
      toast.warning(`🤢 보관하지 않은 생식량 ${settled.spoiledCount}개가 초록색 곰팡이가 피며 상했습니다!`, {
        description: '원시 훈제소에서 훈연 보관하거나 상한 음식을 폐기하세요.',
      });
      return {
        ...p,
        backpack: settled.backpack,
        storage: settled.storage,
        lastFreshnessCheckAt: settled.nextCheckAt,
      };
    });
  }, [freshnessInfo.spoiledCount, setS]);
  const expeditionLevelInfo = useMemo(
    () =>
      computeExpeditionLevel(
        s.expeditionCount ?? 0,
        (s.expeditionDistanceM ?? 0) + (s.walkSteps ?? 0) * 20
      ),
    [s.expeditionCount, s.expeditionDistanceM, s.walkSteps]
  );
  const reach = reachRadius(s.techs, s.techLevels);
  const baseDef = s.base ? BASE_LEVELS[s.base.level] : null;
  const [sanctuaries, setSanctuaries] = useState<LatLng[]>([]);
  const sanctuariesRef = useRef(sanctuaries);
  sanctuariesRef.current = sanctuaries;
  const inSanctuary = sanctuaries.some((c) => distanceM(s.pos, c) <= SANCTUARY_RADIUS_M);
  const inBase = atWorkshop(s);
  const weight = stackWeight(s.backpack);
  const baseCapacity = C.baseCarryKg + (s.level - 1) * C.carryPerLevelKg + ((s.base?.level ?? 0) >= 2 ? 10 : 0) + pocketBonusKg(s.techs) + villageBonuses.carryBonusKg;
  const capacity =
    baseCapacity +
    tribeCarryBonusKg(baseCapacity, s.tribe?.count ?? 0, s.tribe?.classId) +
    (s.permanentStats?.carryBonus ?? 0);
  const questState: QuestState = { ...s, storedGear: [], stats: { gathered: s.gathered, crafted: s.crafted, kills: s.kills, deposits: s.deposits } };
  const quest = currentQuest(questState);
  const questProgress = quest?.progress(questState) ?? null;
  const canClaimQuest = questReady(questState);

  const gainXp = (p: WorldSave, amount: number): WorldSave => {
    const progress = addExperience(p, amount);
    let nextState: WorldSave = { ...p, ...progress };
    if (progress.level > p.level) {
      toast.success(`레벨 ${progress.level} 달성!`, { description: `배낭 용량 ${C.baseCarryKg + (progress.level - 1) * C.carryPerLevelKg}kg` });
      if (progress.level >= 5 && p.level < 5 && !p.languageLearned) {
        nextState = { ...nextState, languageQuestAccepted: true };
        toast.info('🧙 떠돌이 주술사의 부름!', {
          description: `"${LANGUAGE_QUEST.shamanQuote}" (생존 목표에 등록되었습니다)`,
          duration: 6000,
        });
      }
    }
    return nextState;
  };

  // Only gear worn in an unlocked slot counts.
  const loadout = useMemo(() => resolveLoadout(s.gear, s.equipped, s.level), [s.gear, s.equipped, s.level]);
  const best = useCallback((pick: (g: GearInstance) => number) =>
    [loadout.tool1, loadout.tool2].reduce<GearInstance | null>((b, g) => (g && pick(g) > (b ? pick(b) : 0) ? g : b), null), [loadout]);
  const weapon = loadout.weapon;
  const armor = loadout.armor;

  const rangedInfo = useMemo(() => computeRangedReach(weapon, s.level), [weapon, s.level]);
  const baseVision = (isNight ? C.visionNightM + villageBonuses.nightVisionBonusM : C.visionDayM) + visionBonus(s.techs);
  const vision = Math.max(baseVision, rangedInfo.rangeM ? rangedInfo.rangeM + 12 : baseVision);

  const customMobVer = getCustomMobVersion();
  const entities: WorldEntity[] = useMemo(() => generateWorld({
    center: s.pos, radiusM: vision, now, isNight, depleted: s.depleted, terrainZones: s.terrainZones, parkCells: s.parkCells, sanctuaries,
    safeZone: null, playerLevel: s.level,
  }).filter(e => !(e.kind === 'creature' && s.outpost && distanceM(e, s.outpost) < C.outpostRadiusM + 15)), [s.pos, vision, now, isNight, s.depleted, s.terrainZones, s.parkCells, sanctuaries, s.outpost, customMobVer, s.level]);

  // Beasts are no longer blocked or auto-killed around the base on the world map.
  // Defense will occur inside the base village view during siege / invasion events.

  // Stegoron regen + tribe_shelter 2x recovery bonus for crew & pets.
  const regenPct = activePetAbilities(s.pets ?? []).regen ?? 0;
  const shelterMult = villageBonuses.regenSpeedMult;
  useEffect(() => {
    if (regenPct <= 0 && shelterMult <= 1) return;
    const id = window.setInterval(() => setS((p) => {
      const hp = regenPct > 0 ? regenHp(p.hp, maxHpOf(p), regenPct) : p.hp;
      const crew = p.observedExpedition;
      const crewPct = (regenPct > 0 ? regenPct : 0.02) * shelterMult;
      const crewHp = crew ? regenHp(crew.hp, crew.maxHp ?? 100, crewPct) : 0;
      const pets = shelterMult > 1 && p.pets?.length
        ? p.pets.map(pt => {
            const max = petStats(pt.level).maxHp;
            return pt.hp < max ? { ...pt, hp: Math.min(max, pt.hp + 2) } : pt;
          })
        : p.pets;
      if (hp === p.hp && (!crew || crewHp === crew.hp) && pets === p.pets) return p;
      return { ...p, hp, pets, observedExpedition: crew ? { ...crew, hp: crewHp } : crew };
    }), REGEN_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [regenPct, shelterMult]);

  // Survival tick: hunger drain, starvation, base regen (wild_vitality level & tribe_shelter boost rest regen).
  useEffect(() => {
    if (!enabled || now - s.lastTickAt < C.tickMs) return;
    const locationRegen = inBase && baseDef ? baseDef.regenPerTick * villageBonuses.regenSpeedMult : inSanctuary ? SANCTUARY_REGEN_PER_TICK : 0;
    const regen = locationRegen > 0 && s.techs.includes('wild_vitality') ? locationRegen + wildVitalityRegenBonus(techLevel(s.techLevels, 'wild_vitality')) : locationRegen;
    setS((p) => advanceSurvivalVitals(p, now, regen, maxHpOf(p)));
  }, [now, s.lastTickAt, inBase, inSanctuary, baseDef, enabled, setS, s.techs, s.techLevels, villageBonuses.regenSpeedMult]);

  // Auto deposit on entering base. Shell currency stays in the backpack (and is
  // pulled back out of storage) so it can be spent at traders.
  useEffect(() => {
    if (!enabled || !inBase) return;
    // Manual storage only: nothing auto-deposits; only shells are pulled back out of storage.
    const deposit: Stack[] = [];
    const storedShell = s.storage.find((x) => x.itemId === 'shell');
    if (!deposit.length && !storedShell) return;
    if (deposit.length) toast.success(`거점 귀환! ${fmt(deposit)} 창고에 보관`);
    setS((p) => {
      const dep: Stack[] = [];
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
      const walkLimit = walkLimitKmh(activePetAbilities(p.pets ?? []), MAX_WALK_KMH);
      const walking = grew && prevAt > 0 && isWalkingPace(distanceM(p.pos, pos), now - prevAt, walkLimit);
      if (options.indoor && prevAt > 0 && isPocketMovement(distanceM(p.pos, pos), now - prevAt)) {
        outdoorMovingRef.current = now + 10_000;
        setMovingUntil(now + 10_000);
      } else if (options.indoor && prevAt > 0) {
        outdoorMovingRef.current = 0;
        setMovingUntil(0);
      }
      const anchor = p.starterCampPending && p.base && !p.observedExpedition;
      return { ...p, pos, base: anchor ? { ...p.base, ...pos } : p.base, starterCampPending: anchor ? false : p.starterCampPending, explored, exploredTotal: (p.exploredTotal ?? p.explored.length) + (grew ? 1 : 0), walkSteps: (p.walkSteps ?? 0) + (walking ? 1 : 0), dinoEggs: walking && p.dinoEggs?.length ? advanceEggs(p.dinoEggs, distanceM(p.pos, pos), now - prevAt, walkLimit) : p.dinoEggs };
    });
  }, [setS, options.indoor]);

  const appendLog = (p: WorldSave, text: string, at: number): ExpeditionLog[] => [...(p.expeditionLogs ?? []), { at, text }].slice(-20);
  const selectTribeClass = useCallback((classId: TribeClassId) => {
    setS(p => ({
      ...p,
      tribe: { count: 0, trainLevel: 0, ...p.tribe, classId },
      observedExpedition: p.observedExpedition?.mercenary ? { ...p.observedExpedition, tribeClass: classId } : p.observedExpedition,
    }));
  }, [setS]);
  const dispatchObserved = useCallback((destination: LatLng, focus: ExpeditionFocus = 'materials', classId?: TribeClassId) => {
    const p = ref.current;
    const hasTribe = (p.tribe?.count ?? 0) > 0 && !tribeInjured(p.tribe, Date.now());
    if (!p.base || p.observedExpedition || (enabledRef.current && !atMainBase(p) && !hasTribe)) return false;
    const raw = startObservedExpedition(p.base, destination, Date.now(), focus);
    if (!raw) { toast.warning('거점에서 10~1,500m 이내 목표를 선택하세요'); return false; }
    const tribeReady = (p.tribe?.count ?? 0) > 0 && !tribeInjured(p.tribe, Date.now());
    const merc = tribeReady && mercActive(p.mercenary, Date.now()) ? p.mercenary!.name : undefined;
    const chosenClass = classId ?? p.tribe?.classId ?? DEFAULT_TRIBE_CLASS;
    const cls = getTribeClass(chosenClass);
    const ratio = tribeRatio(p.tribe);
    const members = Math.max(1, p.tribe?.count ?? 1);
    const maxHp = Math.max(1, Math.round(maxHpOf(p) * ratio * members * cls.hpMult));
    const crew = merc ? { ...raw, mercenary: merc, tribeClass: chosenClass, statMult: ratio, members, maxHp, hp: maxHp } : { ...raw, tribeClass: chosenClass };
    setS({ ...p, starterCampPending: false, expeditionCount: (p.expeditionCount ?? 0) + 1, tribe: p.tribe ? { ...p.tribe, classId: chosenClass } : p.tribe, observedExpedition: crew, expeditionLogs: appendLog(p, `${merc ? `${cls.icon} ${cls.name}(${merc})` : '원정'} 출발 · 목표: ${FOCUS_LABEL[focus]}`, Date.now()) });
    return true;
  }, [setS]);
  const toggleExpeditionAuto = useCallback((destination: LatLng, focus: ExpeditionFocus = 'materials') => {
    const p = ref.current;
    if (p.expeditionAuto) { setS({ ...p, expeditionAuto: false }); return; }
    const todayKey = getTodayKey();
    const usedSec = p.expeditionAutoDay === todayKey ? (p.expeditionAutoSecToday ?? 0) : 0;
    if (usedSec >= DAILY_EXPEDITION_AUTO_LIMIT_SEC) {
      toast.warning('오늘의 자동사냥 가능 시간(6시간)을 모두 소진했습니다.', {
        description: '내일 자정(00:00)에 다시 충전됩니다. (수동 원정 파견은 계속 가능합니다)',
      });
      return;
    }
    if (p.observedExpedition) { setS({ ...p, expeditionAuto: true }); return; }
    if (dispatchObserved(destination, focus)) setS(p => ({ ...p, expeditionAuto: true }));
  }, [dispatchObserved, setS]);
  const payCost = (p: WorldSave, cost: Stack[]) => {
    // Storage first, then backpack, per item (mixed sources allowed).
    let storage = p.storage, backpack = p.backpack;
    for (const c of cost) {
      const inStore = storage.find(x => x.itemId === c.itemId)?.count ?? 0;
      const a = Math.min(inStore, c.count), b = c.count - a;
      if (a) { const r = removeStacks(storage, [{ itemId: c.itemId, count: a }]); if (!r) return null; storage = r; }
      if (b) { const r = removeStacks(backpack, [{ itemId: c.itemId, count: b }]); if (!r) return null; backpack = r; }
    }
    return { storage, backpack };
  };
  const hireMerc = useCallback((classId?: TribeClassId) => {
    const p = ref.current; const now = Date.now();
    if (!p.base) { toast.warning('거점이 있어야 부족민을 영입할 수 있어요'); return false; }
    const count = p.tribe?.count ?? 0;
    const cost = tribeHireCost(count);
    if (!cost) { toast.info('부족민이 가득 찼어요 (10/10)'); return false; }
    const paid = payCost(p, cost);
    if (!paid) { toast.warning(`재료가 부족해요: ${fmt(cost)}`); return false; }
    const chosenClass = classId ?? 'tank';
    const cls = getTribeClass(chosenClass);
    const m = p.mercenary && mercActive(p.mercenary, now) ? p.mercenary : { ...hireMercenary(now), classId: chosenClass, until: now + 3650 * 86400000 };
    const prevCounts = p.tribe?.classCounts ?? {};
    setS({
      ...p,
      ...paid,
      mercenary: m,
      tribe: {
        trainLevel: 0,
        ...p.tribe,
        count: count + 1,
        classId: p.tribe?.classId ?? chosenClass,
        classCounts: { ...prevCounts, [chosenClass]: (prevCounts[chosenClass] ?? 0) + 1 },
        upkeepAt: p.tribe?.upkeepAt ?? now,
      },
      expeditionLogs: appendLog(p, `${cls.icon} ${cls.name} 영입 · ${count + 1}/10명`, now),
    });
    toast.success(`${cls.icon} ${cls.name} 영입 완료! (총 ${count + 1}명)`);
    return true;
  }, [setS]);
  const trainTribe = useCallback(() => {
    const p = ref.current; const t = p.tribe;
    if (!t?.count) { toast.warning('먼저 부족민을 영입하세요'); return false; }
    const cost = tribeTrainCost(t.trainLevel);
    if (!cost) { toast.info('훈련이 최고 단계예요'); return false; }
    const paid = payCost(p, cost);
    if (!paid) { toast.warning(`재료가 부족해요: ${fmt(cost)}`); return false; }
    setS({ ...p, ...paid, tribe: { ...t, trainLevel: t.trainLevel + 1 } });
    toast.success(`부족민 훈련 ${t.trainLevel + 1}단계 완료!`);
    return true;
  }, [setS]);
  const treatTribe = useCallback(() => {
    const p = ref.current;
    if (!tribeInjured(p.tribe, Date.now())) return false;
    const paid = payCost(p, TRIBE_TREAT_COST);
    if (!paid) { toast.warning('약초 2개와 샘물 1개가 필요해요'); return false; }
    setS({ ...p, ...paid, tribe: { ...p.tribe!, injuredUntil: undefined } });
    toast.success('응급 치료 완료! 부족민이 다시 일어났어요');
    return true;
  }, [setS]);
  const lastStarveWarnRef = useRef<number>(0);
  // Hourly food upkeep for residents (tribe, dinos, tamed pets).
  // Daily rate: 1~2 items per resident per day.
  // Any edible food in storage (cooked meat, jerky, dried fruit, dishes) satisfies hunger.
  useEffect(() => {
    const p = ref.current;
    const t = p.tribe;
    const now = Date.now();
    const residents = (t?.count ?? 0) + (p.pets?.length ?? 0) + (p.companions?.length ?? 0);
    if (!residents || !p.base) return;

    // Immediately resolve hunger if storage now contains any edible food!
    const hasFood = hasEdibleFoodInStorage(p.storage);
    if (t?.starving && hasFood) {
      setS(q => ({
        ...q,
        tribe: { count: 0, trainLevel: 0, ...q.tribe, starving: false },
      }));
      toast.success('🍖 창고 식량을 섭취하여 부족민과 펫의 굶주림이 해소되었어요! (원기 회복)');
      return;
    }

    const since = t?.upkeepAt ?? now;
    const hours = Math.floor((now - since) / UPKEEP_MS);
    if (hours < 1) {
      if (!t?.upkeepAt) {
        setS(q => ({ ...q, tribe: { count: 0, trainLevel: 0, ...q.tribe, upkeepAt: now } }));
      }
      return;
    }

    const r = settleUpkeep(
      p.storage,
      upkeepDemand(t?.count ?? 0, p.pets?.length ?? 0, p.companions?.length ?? 0),
      hours
    );

    const wasStarving = !!t?.starving;
    const isNowStarving = r.starving;

    setS(q => ({
      ...q,
      storage: r.storage,
      tribe: {
        count: 0,
        trainLevel: 0,
        ...q.tribe,
        upkeepAt: since + hours * UPKEEP_MS,
        starving: isNowStarving,
      },
    }));

    if (wasStarving && !isNowStarving) {
      toast.success('🍖 창고 식량을 섭취하여 부족민과 펫의 굶주림이 해소되었어요! (원기 회복)');
    } else if (isNowStarving && (!wasStarving || now - lastStarveWarnRef.current > 30 * 60 * 1000)) {
      lastStarveWarnRef.current = now;
      toast.warning('⚠️ 창고 식량이 부족해 부족민과 펫이 굶주려요 (회복 중단·효율 감소)');
    }
  }, [now, setS]);
  const [crewNearby, setCrewNearby] = useState<WorldEntity[]>([]);
  const setCrewManual = useCallback((on: boolean) => setS(p => p.observedExpedition ? { ...p, expeditionAuto: on ? false : p.expeditionAuto, observedExpedition: { ...p.observedExpedition, manual: on, target: undefined, damage: 0 } } : p), [setS]);
  const steerCrew = useCallback((x: number, y: number) => setS(p => p.observedExpedition ? { ...p, expeditionAuto: false, observedExpedition: steerExpedition(p.observedExpedition, x, y) } : p), [setS]);
  const commandCrew = useCallback((target: WorldEntity) => {
    const crew = ref.current.observedExpedition;
    if (!crew?.manual) return false;
    if (!pickManualTarget(crew, [target], target.kind === 'creature' ? 'attack' : 'gather')) { toast.warning(target.kind === 'creature' ? '이 상대는 공격할 수 없어요' : '이 자원은 아직 채집할 수 없어요'); return false; }
    setS(p => p.observedExpedition ? { ...p, observedExpedition: { ...p.observedExpedition, target, damage: 0 } } : p);
    return true;
  }, [setS]);
  const crewAct = useCallback((kind: 'attack' | 'gather') => {
    const crew = ref.current.observedExpedition; if (!crew) return;
    const list = crewNearby.filter(c => kind === 'attack' ? c.kind === 'creature' : c.kind === 'node')
      .sort((a, b) => distanceM(crew.pos, a) - distanceM(crew.pos, b));
    const target = list.find(t => pickManualTarget(crew, [t], kind));
    if (!target) { toast.warning(kind === 'attack' ? '근처에 공격할 맹수가 없어요' : '근처에 채집할 자원이 없어요'); return; }
    setS(p => p.observedExpedition ? { ...p, observedExpedition: { ...p.observedExpedition, manual: true, target, damage: 0 } } : p);
  }, [crewNearby, setS]);
  const healCrew = useCallback(() => {
    const p = ref.current; const crew = p.observedExpedition; if (!crew) return;
    const max = crew.maxHp ?? 100;
    if (crew.hp >= max) { toast('체력이 이미 가득해요'); return; }
    const id = CREW_HEAL_FOODS.find(f => (p.storage.find(x => x.itemId === f)?.count ?? 0) > 0);
    if (!id) { toast.warning('창고에 고기나 과일이 없어요'); return; }
    const storage = removeStacks(p.storage, [{ itemId: id, count: 1 }]); if (!storage) return;
    const gain = crewHealGain(id, max);
    setS({ ...p, storage, observedExpedition: { ...crew, hp: Math.min(max, crew.hp + gain) } });
    toast.success(`창고의 ${ITEMS[id]?.name ?? id} 1개로 원정 체력 +${gain}`);
  }, [setS]);
  const toggleEscort = useCallback(() => {
    const p = ref.current;
    if (!p.tribe?.count) { toast.warning('먼저 부족민을 영입하세요'); return; }
    const on = !p.tribe.escort;
    setS({ ...p, tribe: { ...p.tribe, escort: on } });
    toast(on ? '부족민이 함께 걸어요 · 채집 속도 +30%, 맹수 기습 방어' : '동행을 멈추고 거점에 남겨 두었어요');
  }, [setS]);
  const grantTutorialBranches = useCallback(() => {
    const p = ref.current;
    const branchesInPack = countOf(p.backpack, 'branch');
    const branchesInStorage = countOf(p.storage, 'branch');
    if (branchesInPack + branchesInStorage >= 25) return;
    const needed = Math.max(1, 25 - (branchesInPack + branchesInStorage));
    setS({
      ...p,
      backpack: addStacks(p.backpack, [
        { itemId: 'branch', count: needed },
        { itemId: 'log', count: 12 },
        { itemId: 'flint', count: 10 },
      ]),
      lastTickAt: Date.now(),
    });
    toast.success(`🌿 건설 지원: 나뭇가지 ${needed}개와 목재/부싯돌이 보급되었습니다!`);
  }, [setS]);

  const pickTutorialBranch = useCallback(() => {
    setS(p => ({
      ...p,
      backpack: addStacks(p.backpack, [{ itemId: 'branch', count: 1 }]),
      lastTickAt: Date.now(),
    }));
  }, [setS]);

  const recruitAmbacho = useCallback(() => {
    const p = ref.current;
    if (p.tribe?.count && (p.tribe.classCounts?.gatherer ?? 0) > 0) return;
    const now = Date.now();
    const prevCounts = p.tribe?.classCounts ?? {};
    const curCount = p.tribe?.count ?? 0;
    const m = {
      name: '암바초',
      hiredAt: now,
      until: now + 3650 * 86400000,
      classId: 'gatherer' as TribeClassId,
    };
    setS({
      ...p,
      mercenary: m,
      tribe: {
        trainLevel: 0,
        ...p.tribe,
        count: Math.max(1, curCount + 1),
        classId: 'gatherer',
        classCounts: { ...prevCounts, gatherer: (prevCounts.gatherer ?? 0) + 1 },
        upkeepAt: p.tribe?.upkeepAt ?? now,
      },
      lastTickAt: now,
    });
    toast.success('🎒 든든한 파밍 부족민 「암바초」가 부족에 영구 합류했습니다!', {
      description: '거점 주변의 나무·광석을 대신 채집하고 창고로 운반합니다.',
    });
  }, [setS]);

  const meetShaman = useCallback(() => setS(p => ({ ...p, shamanMet: true })), [setS]);
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
      const nearby = generateWorld({ center: crew.pos, radiusM: crew.manual ? MANUAL_PICK_M : 30, now: at, isNight: dayPhase(new Date(at)) === 'night', depleted: p.depleted, terrainZones: p.terrainZones, parkCells: p.parkCells, playerLevel: p.level });
      if (crew.manual) setCrewNearby(nearby);
      const todayKey = getTodayKey(at);
      let autoSecToday = p.expeditionAutoDay === todayKey ? (p.expeditionAutoSecToday ?? 0) : 0;
      let nextAuto = !!p.expeditionAuto;
      if (nextAuto) {
        autoSecToday += 1;
        if (autoSecToday >= DAILY_EXPEDITION_AUTO_LIMIT_SEC) {
          nextAuto = false;
          if (crew.phase === 'outbound') {
            crew.phase = 'returning';
            crew.target = undefined;
          }
        }
      }
      const result = advanceExpedition(crew, nearby, at, outdoors, nextAuto, Math.random, p.damage);
      if (nextAuto === false && p.expeditionAuto) {
        result.text = (result.text ? result.text + ' · ' : '') + '⚠️ 오늘 자동사냥 한도(6시간) 도달로 거점에 복귀합니다';
      }
      const stepDist = Math.round(distanceM(crew.pos, result.crew.pos));
      const nextDistM = (p.expeditionDistanceM ?? 0) + stepDist;
      const expLv = computeExpeditionLevel(p.expeditionCount ?? 0, nextDistM + (p.walkSteps ?? 0) * 20).level;
      const nextPins = detectExpeditionPins(result.crew.pos, nearby, p.depleted, at, expLv, p.discoveredPins ?? []);
      let next: WorldSave = {
        ...p,
        expeditionAuto: nextAuto,
        expeditionAutoDay: todayKey,
        expeditionAutoSecToday: autoSecToday,
        expeditionDistanceM: nextDistM,
        discoveredPins: nextPins,
        observedExpedition: result.finished ? null : result.crew,
      };
      if (result.crew.downed && p.tribe) { next.tribe = { ...p.tribe, injuredUntil: at + TRIBE_INJURY_MS }; next.expeditionAuto = false; result.rewards = result.rewards.slice(0, Math.ceil(result.rewards.length / 2)); }
      if (result.crew.target?.kind === 'creature') next.damage = { ...p.damage, [result.crew.target.id]: result.crew.damage };
      if (result.completed) {
        const e = result.completed;
        const gathered = { ...p.gathered };
        for (const item of result.rewards) gathered[item.itemId] = (gathered[item.itemId] ?? 0) + item.count;
        const rawXp = e.kind === 'node' ? nodeDef(e.type).xp : creatureDef(e.type).xp;
        const tribeXp = Math.max(1, Math.round(rawXp * TRIBE_XP_RATIO));
        next = { ...next, storage: addStacks(p.storage, result.rewards), gathered, depleted: { ...p.depleted, [e.id]: at }, kills: p.kills + (e.kind === 'creature' ? 1 : 0), ...addExperience(p, tribeXp) };
        next.damage = { ...next.damage };
        delete next.damage[e.id];
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
      const target = generateWorld({ center: p.pos, radiusM: EXPEDITION_RADIUS_M, now: at, isNight: false, depleted: p.depleted, terrainZones: p.terrainZones, playerLevel: p.level }).find(e => e.kind === 'node' && nodeDef(e.type).requires.tier <= 1);
      if (!target) return;
      const cap = C.baseCarryKg + (p.level - 1) * C.carryPerLevelKg + ((p.base?.level ?? 0) >= 2 ? 10 : 0) + pocketBonusKg(p.techs);
      const { fit } = splitByCapacity(expeditionLoot(target, true), cap - stackWeight(p.backpack));
      if (!fit.length) return;
      const gathered = { ...p.gathered };
      for (const item of fit) gathered[item.itemId] = (gathered[item.itemId] ?? 0) + item.count;
      const learned = checkInspiration(gathered, p.techs);
      const rawXp = target.kind === 'node' ? nodeDef(target.type).xp : 0;
      const pocketXp = Math.max(1, Math.round(rawXp * TRIBE_XP_RATIO));
      setS({ ...p, backpack: addStacks(p.backpack, fit), packedItems: [...new Set([...(p.packedItems ?? []), ...fit.map(x => x.itemId)])], gathered, techs: [...p.techs, ...learned.map(t => t.id)], depleted: { ...p.depleted, [target.id]: at }, ...addExperience(p, pocketXp), expeditionLogs: appendLog(p, `포켓 자동채집 · 배낭: ${fmt(fit)}`, at) });
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
    const r = reachRadius(p.techs, p.techLevels);
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
    const r = reachRadius(p.techs, p.techLevels);
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
    const { category: rangedCat, rangeM: rangedReach } = computeRangedReach(weapon, p.level);
    const isRangedWeapon = e.kind === 'creature' && !!rangedCat;
    const reachBonus = p.techs.includes('long_reach') ? longReachBonus(techLevel(p.techLevels, 'long_reach')) : 0;
    const r = isRangedWeapon ? Math.max(reachRadius(p.techs, p.techLevels), rangedReach + reachBonus) : reachRadius(p.techs, p.techLevels);
    if (distanceM(p.pos, e) > r) { toast.warning(`${r}m 안으로 다가가세요`); return false; }
    if (e.kind === 'creature') {
      const at = Date.now();
      const hasMeleeFast = weapon?.mechanics?.includes('MELEE_FAST') || ITEMS[weapon?.itemId ?? '']?.mechanics?.includes('MELEE_FAST');
      const attackInterval = hasMeleeFast ? Math.round(CREATURE_ATTACK_INTERVAL_MS * 0.6) : CREATURE_ATTACK_INTERVAL_MS;
      if (at - lastCreatureAttack.current < attackInterval) return false;
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
          const needName = kind === 'mine' ? (d.requires.tier >= 2 ? '흑요석 곡괭이' : '돌곡괭이') : (d.requires.tier >= 2 ? '흑요석 도끼' : '돌도끼');
          toast.error(`${d.name}: ${needName}(${kind === 'chop' ? '벌목' : '채굴'} ${d.requires.tier}단계)가 필요합니다`, { description: tier ? `지금 가진 도구는 ${tier}단계예요. 거점에서 ${needName}를 만들어 배낭에 넣으세요.` : `거점에서 ${needName}를 만들어 배낭에 넣으세요.` });
          return false;
        }
        if (!tool) return false;
        power = (ITEMS[tool.itemId].tool?.power ?? 1) * gearMult(tool);
      }
      if (escortReady(p.tribe, Date.now(), !!p.observedExpedition?.mercenary)) power *= ESCORT_GATHER_MULT;
    } else {
      const d = creatureDef(e.type);
      label = d.name; need = d.hp; loot = d.loot;
      // Ranged weapons (bow / sling / spear) require 1 matching ammo in the backpack per shot
      if (isRangedWeapon && distanceM(p.pos, e) > reachRadius(p.techs, p.techLevels)) {
        const ammo = findAvailableAmmo(p.backpack, weapon?.itemId);
        if (!ammo) {
          const ammoLabel = rangedCat === 'bow' ? '화살(🏹)' : '돌멩이 탄환(🪨)이나 부싯돌';
          toast.error(`배낭에 ${ammoLabel}이(가) 없습니다!`, {
            description: '거점 제작 탭이나 모닥불에서 탄환을 만들어 배낭에 넣어 주세요 (1회 공격 시 1개 소진).',
          });
          return false;
        }
        const afterAmmo = removeStacks(p.backpack, [{ itemId: ammo.itemId, count: 1 }]);
        if (!afterAmmo) return false;
        next.backpack = afterAmmo;
      }
      power = weapon ? Math.round((ITEMS[weapon.itemId].weapon?.atk ?? C.fistAtk) * gearMult(weapon)) : C.fistAtk;
      if (p.techs.includes('primal_strike')) power *= primalStrikeMult(techLevel(p.techLevels, 'primal_strike'));

      // Permanent stat bonus from Shaman health tonics (+1 ATK per tonic)
      power += Math.round(p.permanentStats?.atkBonus ?? 0);

      // Active timed food buff (e.g. predator_might +25% ATK)
      const activeFoodAtkBuff = (p.activeBuffs ?? []).find(b => b.expiresAt > Date.now() && b.effects.atkBonusPct);
      if (activeFoodAtkBuff?.effects.atkBonusPct) {
        power = Math.round(power * (1 + activeFoodAtkBuff.effects.atkBonusPct / 100));
      }

      const mobDist = distanceM(p.pos, e);
      // "원거리 무기의 특징은 몹이 가까이 다가올때까지 시간이 있다는거야."
      // If the creature is not in melee clash range (<= 1.8m), it cannot counterattack yet!
      const inMeleeClash = mobDist <= 1.8;
      const isRangedSafety = isRangedWeapon && !inMeleeClash;

      power += (p.companions ?? []).some(c => c.kind === 'wolf') ? 3 : 0;
      power += (p.pets ?? []).filter(x => petRole(x) === 'follow' && x.restUntil <= Date.now()).length * PET_FOLLOW_ATK;

      // POISON_HIT mechanic (+6 poison damage)
      const hasPoisonHit = weapon?.mechanics?.includes('POISON_HIT') || ITEMS[weapon?.itemId ?? '']?.mechanics?.includes('POISON_HIT');
      if (hasPoisonHit) {
        power += 6;
        toast.success('🧪 맹독 주입! 추가 피해 +6');
      }

      // 4 Shaman Class Combat Passives
      const shamanClass = p.shamanClass ?? p.village?.shamanClass;
      if (shamanClass === 'mage') {
        power += 8;
        toast.success('🔮 원소 마법 주술 발동! 화염/빙결 마법 피해 +8');
      } else if (shamanClass === 'warlock') {
        power += 6;
        toast.success('💀 암흑 심연 주술 발동! 지속 맹독 피해 +6');
      } else if (shamanClass === 'orthodox') {
        power = Math.round(power * 1.2);
      }

      // BLEED_HIT mechanic (+25% bleed crit)
      const hasBleedHit = weapon?.mechanics?.includes('BLEED_HIT') || ITEMS[weapon?.itemId ?? '']?.mechanics?.includes('BLEED_HIT');
      if (hasBleedHit) {
        const bleedCrit = Math.max(3, Math.round(power * 0.25));
        power += bleedCrit;
        toast.success(`🩸 출혈 급소타격! 치명타 피해 +${bleedCrit}`);
      }

      // STUN_HIT mechanic (35% stun nullifying monster counterattack)
      const hasStunHit = weapon?.mechanics?.includes('STUN_HIT') || ITEMS[weapon?.itemId ?? '']?.mechanics?.includes('STUN_HIT');
      const isStunned = hasStunHit && Math.random() < 0.35;
      if (isStunned) {
        toast.success('💫 충격 기절(스턴)! 몬스터 반격 무력화');
      }

      const wallBonus = atMainBase(p) && p.palisade ? 3 + (p.tribe?.count && p.tribe.classId === 'tank' ? 4 : 0) : 0;
      let defense = wallBonus + (armor ? Math.round((ITEMS[armor.itemId].armor?.def ?? 0) * gearMult(armor)) : 0) + (p.techs.includes('iron_skin') ? ironSkinDef(techLevel(p.techLevels, 'iron_skin')) : 0);
      // Permanent stat bonus from Shaman health tonics (+1 DEF per tonic)
      defense += Math.round(p.permanentStats?.defBonus ?? 0);
      // Active timed food buff (e.g. iron_shell_buff +25% DEF)
      const activeFoodDefBuff = (p.activeBuffs ?? []).find(b => b.expiresAt > Date.now() && b.effects.defBonusPct);
      if (activeFoodDefBuff?.effects.defBonusPct) {
        defense = Math.round(defense * (1 + activeFoodDefBuff.effects.defBonusPct / 100));
      }
      if (shamanClass === 'orthodox') {
        defense = Math.round(defense * 1.2);
      }
      const bleed = bleedDamage(power, activePetAbilities(p.pets ?? []).bleed ?? 0);
      if (bleed) { power += bleed; toast.success(`테라녹스 출혈! 추가 피해 +${bleed}`); }
      const exchange = resolveCreatureHit(e.type, p.damage[e.id] ?? 0, power, defense, isRangedSafety || (p.calmUntil?.[e.id] ?? 0) > Date.now());
      power = exchange.dealt - (p.damage[e.id] ?? 0);
      let reducedCounter = inMeleeClash && !isStunned
        ? atMainBase(p)
          ? applyTribeWallDefense(exchange.counterDamage, !!p.palisade, p.tribe?.count ?? 0, p.tribe?.classId)
          : exchange.counterDamage
        : 0;

      // DAMAGE_REDUCE mechanic (-30% incoming damage)
      const hasDamageReduce = armor?.mechanics?.includes('DAMAGE_REDUCE') || ITEMS[armor?.itemId ?? '']?.mechanics?.includes('DAMAGE_REDUCE');
      if (hasDamageReduce && reducedCounter > 0) {
        const orig = reducedCounter;
        reducedCounter = Math.round(reducedCounter * 0.7);
        toast.info(`🛡️ 충격 완화 방어구 효과! (받는 피해: ${orig} → ${reducedCounter})`);
      }

      hp -= reducedCounter;
      if (reducedCounter > 0) {
        toast.error(`${d.name} 돌진 박치기 반격! 체력 -${reducedCounter}`);
      } else if (!inMeleeClash && !exchange.defeated) {
        const weaponLabel = rangedCat === 'bow' ? '🏹 활 사격' : rangedCat === 'spear' ? '🗡️ 투창 적중' : '🪨 물매 투척';
        toast.warning(`${weaponLabel}! (${Math.round(mobDist)}m 거리) ${d.name}이(가) 분노하여 달려옵니다!`);
      }
      if (hp <= 0) { setS(die({ ...next, hp })); return false; }
      if (!exchange.defeated && !isRangedWeapon && d.temper === 'passive' && Math.random() < (d.escapeChance ?? 0)) {
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
    let got = options.indoor && Date.now() < outdoorMovingRef.current ? expeditionLoot(e, true) : rollLoot(loot);
    if (e.kind === 'node') {
      const hasGatherBoost = weapon?.mechanics?.includes('GATHER_BOOST') || ITEMS[weapon?.itemId ?? '']?.mechanics?.includes('GATHER_BOOST');
      if (hasGatherBoost && got.length > 0) {
        got = got.map(g => ({ ...g, count: g.count + 1 }));
        toast.success('🌾 풍요로운 수확! 자원 획득량 +1개 추가');
      }
      const shamanClass = p.shamanClass ?? p.village?.shamanClass;
      if (shamanClass === 'orthodox' && Math.random() < 0.25 && got.length > 0) {
        got = got.map(g => ({ ...g, count: g.count + 1 }));
        toast.success('👑 정직한 대현자의 축복! 자원 채집량 +25% 추가 수확');
      }
    }
    const free = capacity - stackWeight(next.backpack);
    const fits = stackWeight(got) <= free;
    next.backpack = fits ? addStacks(next.backpack, got) : next.backpack;
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
    const nowAt = Date.now();

    // Check if this food has an active special buff defined in Shaman Cuisine
    // Rule: Food buffs DO NOT stack; only the last consumed dish's buff remains active!
    const dishRecipe = SHAMAN_CUISINE_RECIPES.find(r => r.resultItemId === itemId && r.buff);
    let activeBuffs = (p.activeBuffs ?? []).filter(b => b.expiresAt > nowAt);
    if (dishRecipe?.buff) {
      const b = dishRecipe.buff;
      activeBuffs = [
        {
          id: b.id,
          name: b.name,
          icon: b.icon,
          desc: b.desc,
          expiresAt: nowAt + b.durationSec * 1000,
          effects: {
            atkBonusPct: b.atkBonusPct,
            defBonusPct: b.defBonusPct,
            speedBonusPct: b.speedBonusPct,
            regenHpPer5s: b.regenHpPer5s,
          },
        },
      ];
      toast.success(`⚡ [${b.name}] 특수 버프 활성화! (${Math.round(b.durationSec / 60)}분간 지속 · 이전 버프 갱신)`, {
        description: b.desc,
      });
    }

    setS({
      ...p,
      [from]: left,
      hunger: Math.min(100, p.hunger + (it.food?.hunger ?? 0)),
      hp: Math.max(1, Math.min(maxHpOf(p), p.hp + hpGain)),
      activeBuffs,
      lastAteAt: nowAt,
    });
    toast(`${it.name} 섭취 완료 (허기 +${it.food?.hunger ?? 0} · 체력 +${hpGain})`);
  }, [setS]);

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
    } else if (r.result === 'arrow' || r.result === 'sling_stone' || (r.result as string) === 'javelin') {
      setS({ ...next, storage: left, backpack: addStacks(p.backpack, [{ itemId: r.result, count: r.count }]) });
    } else {
      setS({ ...next, storage: addStacks(left, [{ itemId: r.result, count: r.count }]) });
    }
    toast.success(`${it.name} 제작 완료!`, { description: it.durability !== undefined || r.result === 'arrow' || r.result === 'sling_stone' || (r.result as string) === 'javelin' ? '배낭에 담았어요' : '창고에 넣었어요' });
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
  const moveOutpost = useCallback(() => {
    const result = relocateOutpost(ref.current, enabledRef.current);
    if (result.ok === false) { toast.warning(result.reason); return; }
    setS(result.state);
    toast.success('전진기지를 현재 위치로 옮겼습니다');
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

  const storeOne = useCallback((itemId: ItemId, count = 1) => {
    const p = ref.current;
    if (!enabledRef.current || !atWorkshop(p)) { toast.warning('거점 안에서만 보관할 수 있습니다'); return; }
    const moved = transferStack(p.backpack, p.storage, itemId, count);
    if (!moved) { toast.warning('보관할 수량을 다시 확인하세요'); return; }
    setS({ ...p, backpack: moved.source, storage: moved.destination });
    toast.success(`${ITEMS[itemId].name} ${count}개를 창고로 옮겼습니다`);
  }, [setS]);
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
      .filter(d => validStackCount(d.count, countOf(p.backpack, d.itemId)));
    if (!valid.length) return;
    const left = removeStacks(p.backpack, valid);
    if (!left) { toast.error('버릴 수량을 다시 확인하세요'); return; }
    setS({ ...p, backpack: left });
    toast.success(`${valid.reduce((n, d) => n + d.count, 0)}개를 버렸습니다`);
  }, [setS]);

  /** Apply external damage (e.g. another player's attack), reduced by worn armor. */
  const takeDamage = useCallback((amount: number, ambush = false) => {
    const p = ref.current;
    if (ambush && escortReady(p.tribe, Date.now(), !!p.observedExpedition?.mercenary)) {
      amount = escortAmbushDamage(amount, Math.random(), p.tribe?.classId);
      if (amount <= 0) { toast.success('동행 부족민이 기습을 막아냈어요!'); return; }
      toast.info('동행 부족민이 기습 피해를 줄였어요');
    }
    if (atMainBase(p) && p.palisade) {
      amount = applyTribeWallDefense(amount, true, p.tribe?.count ?? 0, p.tribe?.classId);
    }
    const armorGear = resolveLoadout(p.gear, p.equipped, p.level).armor;
    const dmg = Math.max(1, Math.round(amount) - (armorGear ? Math.round((ITEMS[armorGear.itemId].armor?.def ?? 0) * gearMult(armorGear)) : 0) - (p.techs.includes('iron_skin') ? ironSkinDef(techLevel(p.techLevels, 'iron_skin')) : 0));
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
  const invent = useCallback((input: InventionInput, naming?: { name: string; desc: string; masterwork?: boolean; ranged?: boolean }) => {
    const p = ref.current;
    if (!enabledRef.current || !atMainBase(p)) { toast.warning('본거지 연구 시설 앞에서 발명하세요'); return null; }
    const check = checkFacility(input, !!p.altar);
    if (check.ok === false) return null;
    const cost = Object.entries(input.materials).filter(([, q]) => q > 0).map(([itemId, count]) => ({ itemId: itemId as ItemId, count }));
    const paid = payAccessible(p, cost);
    if (!paid) { toast.error('재료가 부족합니다 (배낭 또는 창고)'); return null; }
    const id = inventionId(check.hash);
    const known = (p.inventions ?? []).find(x => x.id === id);
    const inv: InventedItem = known ?? { id, hash: check.hash, name: naming?.name ?? id, desc: naming?.desc ?? '', category: input.category, materials: input.materials, heat: input.heat, sacred: input.sacred, masterwork: naming?.masterwork, ranged: naming?.ranged, power: check.power, createdAt: Date.now() };
    const inventions = known ? p.inventions ?? [] : [...(p.inventions ?? []), inv];
    registerInventions(inventions);
    const g: GearInstance = { uid: crypto.randomUUID(), itemId: id as ItemId, quality: naming?.masterwork ? 'MASTERWORK' : 'NORMAL', durability: INVENTED_DURABILITY, maxDurability: INVENTED_DURABILITY };
    setS({ ...paid, inventions, gear: [...paid.gear, g] });
    toast.success(`${inv.name} 완성! 배낭에 담았어요`, { description: known ? '알려진 발명품을 다시 만들었습니다' : '제작 탭에 레시피가 등록되었어요. 배낭에서 착용할 수 있어요' });
    return inv;
  }, [setS]);

  /** Melt one gear piece with catalysts into a new reforged item; keeps uid (equip slot) and plus level. */
  const reforgeGear = useCallback((uid: string, catalysts: Record<string, number>, naming: { name: string; desc: string; analysis?: string; grade?: ReforgeGrade }) => {
    const p = ref.current;
    if (!enabledRef.current || !atMainBase(p) || !p.altar) { toast.warning('본거지 제단에서 재련하세요'); return null; }
    const g = p.gear.find(x => x.uid === uid);
    const baseDef = g && ITEMS[g.itemId];
    const category = gearCategory(baseDef);
    if (!g || !baseDef || !category) return null;
    if (Object.keys(catalysts).length > REFORGE_SLOTS) return null;
    const check = checkFacility({ category, materials: catalysts, heat: true, sacred: true }, true);
    if (check.ok === false) { toast.error('촉매 조합이 맞지 않습니다'); return null; }
    const cost = Object.entries(catalysts).filter(([, q]) => q > 0).map(([itemId, count]) => ({ itemId: itemId as ItemId, count }));
    const paid = payAccessible(p, cost);
    if (!paid) { toast.error('촉매가 부족합니다 (배낭 또는 창고)'); return null; }
    const grade: ReforgeGrade = naming.grade ?? 'normal';
    const hash = `reforge:${g.itemId}:${check.hash}:${grade}`;
    const id = inventionId(hash);
    const known = (p.inventions ?? []).find(x => x.id === id);
    const basePower = gearBasePower(baseDef);
    const inv: InventedItem = known ?? { id, hash, name: naming.name, desc: naming.desc, analysis: naming.analysis, category, materials: catalysts, heat: true, sacred: true, grade, ranged: baseDef.weapon?.ranged, basePower, baseTier: baseDef.tool ? Math.max(baseDef.tool.chop, baseDef.tool.mine) : undefined, reforgedFrom: g.itemId, power: reforgePower(category, basePower, check.power, grade), createdAt: Date.now() };
    const inventions = known ? p.inventions ?? [] : [...(p.inventions ?? []), inv];
    registerInventions(inventions);
        setS({ ...paid, inventions, gear: paid.gear.map(x => x.uid === uid ? { ...x, itemId: id as ItemId, quality: 'NORMAL', durability: INVENTED_DURABILITY, maxDurability: INVENTED_DURABILITY } : x) });
    toast.success(`${grade === 'legend' ? '레전드 등급! ' : grade === 'masterwork' ? '명품 등급! ' : ''}${baseDef.name} → ${inv.name} 재련 완료!`, { description: g.plus ? `강화 +${g.plus} 단계는 그대로 이어집니다` : '착용 중이었다면 그대로 착용됩니다' });
    return inv;
  }, [setS]);

  /** Reinforce one gear piece at the altar (+15% stats per level, max +5). */
  const upgradeGear = useCallback((uid: string) => {
    const p = ref.current;
    if (!enabledRef.current || !atMainBase(p) || !p.altar) { toast.warning('본거지 제단에서 강화하세요'); return; }
    const g = p.gear.find(x => x.uid === uid);
    const cost = g && upgradeCost(g);
    if (!g || !cost) return;
    const paid = payAccessible(p, cost);
    if (!paid) { toast.error('강화 재료가 부족합니다 (배낭 또는 창고)'); return; }
    const plus = (g.plus ?? 0) + 1;
    setS({ ...paid, gear: paid.gear.map(x => x.uid === uid ? { ...x, plus, durability: x.maxDurability } : x) });
    toast.success(`${ITEMS[g.itemId].name} +${plus} 강화 성공!`, { description: `능력치 +${Math.round(plus * 15)}% · 내구도 회복` });
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

  const dropGear = useCallback((uid: string) => {
    setS(p => ({
      ...p,
      gear: p.gear.filter(x => x.uid !== uid),
      equipped: Object.fromEntries(Object.entries(p.equipped ?? {}).filter(([_, v]) => v !== uid)),
    }));
  }, [setS]);

  const storeGear = useCallback((uid: string) => {
    setS(p => {
      const item = p.gear.find(x => x.uid === uid);
      if (!item) return p;
      return {
        ...p,
        gear: p.gear.filter(x => x.uid !== uid),
        storedGear: [...(p.storedGear ?? []), item],
        equipped: Object.fromEntries(Object.entries(p.equipped ?? {}).filter(([_, v]) => v !== uid)),
      };
    });
  }, [setS]);

  const retrieveGear = useCallback((uid: string) => {
    setS(p => {
      const item = (p.storedGear ?? []).find(x => x.uid === uid);
      if (!item) return p;
      return {
        ...p,
        storedGear: (p.storedGear ?? []).filter(x => x.uid !== uid),
        gear: [...p.gear, item],
      };
    });
  }, [setS]);

  const pickEgg = useCallback((egg: EggSpawn) => {
    const p = ref.current;
    if (!enabledRef.current) { toast.warning('정확한 GPS 신호를 기다려 주세요.'); return false; }
    const now = Date.now();
    if (now - (p.depleted[egg.id] ?? -Infinity) < EGG_RESPAWN_MS) { toast.info('이 자리의 알은 이미 주웠어요. 내일 다시 와 보세요.'); return false; }
    const allowedDist = eggReachRadius(p.techs, p.techLevels);
    if (distanceM(p.pos, egg) > allowedDist) { toast.warning(`${allowedDist}m 안으로 다가가세요`); return false; }
    setS({ ...p, backpack: addStacks(p.backpack, [{ itemId: 'dino_egg', count: 1 }]), depleted: { ...p.depleted, [egg.id]: now },
      dinoEggs: [...(p.dinoEggs ?? []), newEgg(`${egg.id}:${now}`, p.walkSteps ?? 0, Math.random())] });
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(200);
    toast.success('신비한 픽셀 공룡 알을 주웠어요!', { description: '정해진 거리만큼 걸은 뒤 거점에 오면 부화해요.' });
    return true;
  }, [setS]);
  const hatchEgg = useCallback((eggId: string) => {
    const p = ref.current;
    const egg = (p.dinoEggs ?? []).find(e => e.id === eggId);
    if (!egg || !enabledRef.current || !atWorkshop(p) || !eggReady(egg, p.walkSteps ?? 0)) return null;
    const fromPack = removeStacks(p.backpack, [{ itemId: 'dino_egg', count: 1 }]);
    const fromStore = fromPack ? null : removeStacks(p.storage, [{ itemId: 'dino_egg', count: 1 }]);
    if (!fromPack && !fromStore) return null;
    const baby = babyFor(egg);
    const pets = p.pets ?? [];
    setS({ ...p, backpack: fromPack ?? p.backpack, storage: fromStore ?? p.storage, dinoEggs: (p.dinoEggs ?? []).filter(e => e.id !== eggId), pets: [...pets, hatchPet(crypto.randomUUID(), baby.id, baby.name, pets)], babyDinos: [], lastTickAt: Date.now() });
    return baby;
  }, [setS]);
  const petAccess = () => {
    const p = ref.current;
    if (!atWorkshop(p) || (!enabledRef.current && !options.indoor)) { toast.warning('거점 안에서 펫을 관리하세요'); return null; }
    return p;
  };
  const mergePets = useCallback((first: string, second: string): boolean => {
    const p = petAccess(); if (!p) return false;
    const result = fusePets(p.pets ?? [], first, second, crypto.randomUUID());
    if (!result) { toast.warning('잠금 해제된 같은 종류·같은 레벨 펫 두 마리가 필요합니다'); return false; }
    setS({ ...p, pets: result.pets, lastTickAt: Date.now() });
    toast.success(`${result.pet.name} Lv.${result.pet.level} 합체 성공!`);
    return true;
  }, [setS, options.indoor]);
  const togglePetDeploy = useCallback((uid: string) => {
    const p = petAccess(); if (!p) return;
    const pets = deployPet(p.pets ?? [], uid);
    if (!pets) { toast.warning('수호 펫은 최대 3마리입니다'); return; }
    setS({ ...p, pets, lastTickAt: Date.now() });
  }, [setS, options.indoor]);
  const assignPetRole = useCallback((uid: string, role: PetRole) => {
    const p = petAccess(); if (!p) return;
    const pets = setPetRole(p.pets ?? [], uid, role, Date.now());
    if (!pets) { toast.warning(role === 'guard' ? `거점 지키기는 최대 ${PET_GUARD_SLOTS}마리예요` : `따라다니기는 최대 ${PET_FOLLOW_SLOTS}마리예요`); return; }
    setS({ ...p, pets, lastTickAt: Date.now() });
  }, [setS, options.indoor]);
  const feedPet = useCallback((uid: string) => {
    const p = ref.current;
    const pet = (p.pets ?? []).find(x => x.uid === uid); if (!pet) return;
    const max = petStats(pet.level).maxHp;
    if (pet.hp >= max) { toast('체력이 이미 가득해요'); return; }
    const id = CREW_HEAL_FOODS.find(f => (p.storage.find(x => x.itemId === f)?.count ?? 0) > 0);
    if (!id) { toast.warning('창고에 고기나 과일이 없어요'); return; }
    const storage = removeStacks(p.storage, [{ itemId: id, count: 1 }]); if (!storage) return;
    const gain = crewHealGain(id, max);
    setS({ ...p, storage, pets: (p.pets ?? []).map(x => x.uid === uid ? { ...x, hp: Math.min(max, x.hp + gain) } : x), lastTickAt: Date.now() });
    toast.success(`${ITEMS[id]?.name ?? id} 1개를 먹였어요 · 체력 +${gain}`);
  }, [setS]);
  // Hunting pets bring loot to storage.
  useEffect(() => {
    const p = ref.current;
    if (!p.pets?.some(x => petRole(x) === 'hunt')) return;
    const r = settlePetHunts(p.pets, Date.now());
    if (!r.trips && r.pets.every((x, i) => x === p.pets![i])) return;
    setS(q => ({ ...q, pets: r.pets, storage: addStacks(q.storage, r.loot) }));
    if (r.trips) toast.success(`사냥 나간 펫이 ${r.trips}번 다녀왔어요 · 창고: ${fmt(r.loot)}`);
  }, [now, setS]);
  const togglePetLock = useCallback((uid: string) => {
    const p = petAccess(); if (!p) return;
    setS({ ...p, pets: (p.pets ?? []).map(pet => pet.uid === uid ? { ...pet, locked: !pet.locked } : pet), lastTickAt: Date.now() });
  }, [setS, options.indoor]);

  const permadeathPet = useCallback((uid: string) => {
    const p = ref.current;
    const target = (p.pets ?? []).find(pt => pt.uid === uid);
    if (!target) return;
    const pName = petById(target.speciesId)?.name ?? target.name;
    setS({
      ...p,
      pets: (p.pets ?? []).filter(pt => pt.uid !== uid),
      lastTickAt: Date.now(),
    });
    toast.error(`💀 ${pName} (Lv.${target.level})이(가) 체력 0이 되어 영구 소멸했습니다!`);
  }, [setS]);

  const updatePetHp = useCallback((uid: string, hp: number) => {
    setS(p => ({
      ...p,
      pets: (p.pets ?? []).map(pt =>
        pt.uid === uid ? { ...pt, hp: Math.max(0, Math.min(petStats(pt.level).maxHp, hp)) } : pt
      ),
      lastTickAt: Date.now(),
    }));
  }, [setS]);

  const consumeDinoMeat = useCallback((): boolean => {
    const p = ref.current;
    const paid = payAccessible(p, [{ itemId: 'cooked_meat', count: 1 }]);
    if (!paid) {
      toast.warning('보유한 구운 고기가 없습니다 (배낭 또는 창고)');
      return false;
    }
    setS({ ...paid, lastTickAt: Date.now() });
    return true;
  }, [setS]);

  const settleDinoExpedition = useCallback((loot: Stack[], distanceM: number) => {
    const p = ref.current;
    const nowAt = Date.now();
    let nextEggs = p.dinoEggs ?? [];
    for (const st of loot) {
      if (st.itemId === 'dino_egg') {
        for (let i = 0; i < st.count; i++) {
          nextEggs = [...nextEggs, newEgg(`dino-exp:${nowAt}:${i}`, p.walkSteps ?? 0, Math.random())];
        }
      }
    }
    const gathered = { ...p.gathered };
    for (const st of loot) gathered[st.itemId] = (gathered[st.itemId] ?? 0) + st.count;
    const xpGain = Math.max(5, Math.round(distanceM * 0.4));
    const next = gainXp(
      {
        ...p,
        storage: addStacks(p.storage, loot),
        dinoEggs: nextEggs,
        gathered,
        expeditionCount: (p.expeditionCount ?? 0) + 1,
        expeditionDistanceM: (p.expeditionDistanceM ?? 0) + distanceM,
        lastTickAt: nowAt,
      },
      xpGain
    );
    setS(next);
    if (loot.length) {
      toast.success(`🏳️ 공룡 탐험대 무사 귀환! (${distanceM}m · 창고: ${fmt(loot)})`);
    } else {
      toast('🏳️ 공룡 탐험대가 거점으로 무사히 후퇴했습니다.');
    }
  }, [setS]);
  const updateInventionCredits = useCallback((credits: InventionCredits) => setS(p => ({ ...p, inventionCredits: credits, inventionWalkMark: credits.walkMeters === 0 ? p.walkSteps ?? 0 : p.inventionWalkMark })), [setS]);

  const placeVillageTile = useCallback((buildingId: VillageBuildingId, x: number, y: number): boolean => {
    const p = ref.current;
    if (!p.base) { toast.warning('먼저 거점을 세우세요'); return false; }
    if (!atWorkshop(p) && !options.indoor) { toast.warning('거점 반경 안에서 건설할 수 있어요'); return false; }
    const v = ensureVillageState(p.village, !!p.altar);
    const check = canPlaceVillageBuilding(v, buildingId, x, y, p.base.level);
    if (check.ok === false) { toast.warning(check.reason); return false; }
    const def = VILLAGE_BUILDINGS[buildingId];
    const paid0 = payCost(p, def.cost); const paid = paid0 && { ...p, ...paid0 };
    if (!paid) { toast.error(`재료가 부족해요: ${fmt(def.cost)}`); return false; }
    const nextV = placeVillageBuilding(v, buildingId, x, y, crypto.randomUUID());
    const hasPal = nextV.buildings.some(b => VILLAGE_BUILDINGS[b.buildingId].category === 'wall');
    const hasAlt = p.altar || buildingId === 'ancient_altar';
    setS({ ...paid, village: nextV, palisade: p.palisade || hasPal, altar: hasAlt, lastTickAt: Date.now() });
    toast.success(`${def.icon} ${def.name} 배치 완료!`);
    return true;
  }, [setS, options.indoor]);

  const placeCustomVillageTile = useCallback((params: {
    name: string;
    desc: string;
    category: 'fence' | 'tower' | 'building';
    mechanics: BuildingMechanicTag[];
    physics: PhysicalAttributes;
    hp: number;
    materials: Record<string, number>;
    x: number;
    y: number;
  }): boolean => {
    const p = ref.current;
    if (!p.base) { toast.warning('먼저 거점을 세우세요'); return false; }
    const v = ensureVillageState(p.village, !!p.altar);
    const check = canPlaceVillageBuilding(v, 'custom_intent_building', params.x, params.y, p.base.level);
    if (check.ok === false) { toast.warning(check.reason); return false; }
    const costStacks: Stack[] = Object.entries(params.materials)
      .filter(([, count]) => count > 0)
      .map(([itemId, count]) => ({ itemId: itemId as ItemId, count }));
    const paid = payAccessible(p, costStacks);
    if (!paid) { toast.error(`재료가 부족합니다: ${fmt(costStacks)}`); return false; }
    const uid = `custom_b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nextV = placeCustomVillageBuilding(v, {
      uid,
      x: params.x,
      y: params.y,
      hp: params.hp,
      customName: params.name,
      customDesc: params.desc,
      customCategory: params.category,
      customMechanics: params.mechanics,
      physics: params.physics,
    });
    const hasPal = nextV.buildings.some(b => b.customMechanics?.includes('WALL_BLOCK') || VILLAGE_BUILDINGS[b.buildingId]?.category === 'wall');
    setS({ ...paid, village: nextV, palisade: p.palisade || hasPal, lastTickAt: Date.now() });
    toast.success(`🏛️ 「${params.name}」 맞춤 건축 완료! (마을 배치됨)`);
    return true;
  }, [setS]);

  const craftCustomGear = useCallback((params: {
    name: string;
    desc: string;
    category: 'melee' | 'ranged' | 'tool' | 'armor';
    mechanics: GearMechanicTag[];
    physics: PhysicalAttributes;
    atk?: number;
    def?: number;
    materials: Record<string, number>;
  }): boolean => {
    const p = ref.current;
    const costStacks: Stack[] = Object.entries(params.materials)
      .filter(([, count]) => count > 0)
      .map(([itemId, count]) => ({ itemId: itemId as ItemId, count }));
    const paid = payAccessible(p, costStacks);
    if (!paid) { toast.error(`재료가 부족합니다: ${fmt(costStacks)}`); return false; }

    const inventionCat = params.category === 'armor' ? 'building' : params.category === 'tool' ? 'tool' : 'weapon';
    const hash = `intent_${params.category}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const id = `inv_${hash.slice(0, 10)}`;
    const power = params.category === 'armor' ? (params.def ?? 5) * 3 : (params.atk ?? 12);
    const inv: InventedItem = {
      id,
      hash,
      name: params.name,
      desc: params.desc,
      category: inventionCat,
      materials: params.materials,
      power,
      ranged: params.category === 'ranged' || params.mechanics.includes('RANGED_SNIPE'),
      customMechanics: params.mechanics,
      physics: params.physics,
      createdAt: Date.now(),
    };

    registerInventions([inv]);

    const isEngineer = p.shamanClass === 'engineer' || p.village?.shamanClass === 'engineer';
    const gearDur = isEngineer ? INVENTED_DURABILITY * 3 : INVENTED_DURABILITY;

    const gearPiece: GearInstance = {
      uid: crypto.randomUUID(),
      itemId: id as ItemId,
      quality: 'MASTERWORK',
      durability: gearDur,
      maxDurability: gearDur,
      plus: 0,
      mechanics: params.mechanics,
    };

    const nextInventions = [...(paid.inventions ?? []), inv];
    const nextGear = [...paid.gear, gearPiece];
    setS({
      ...paid,
      inventions: nextInventions,
      gear: nextGear,
      lastTickAt: Date.now(),
    });
    toast.success(`⚔️ 「${params.name}」 제련 완료! (배낭 장비함에 보관됨)`);
    return true;
  }, [setS]);

  const moveVillageTile = useCallback((uid: string, toX: number, toY: number): boolean => {
    const p = ref.current;
    if (!p.base) return false;
    const v = ensureVillageState(p.village, !!p.altar);
    const res = moveVillageBuilding(v, uid, toX, toY);
    if (res.ok === false) { toast.warning(res.reason); return false; }
    setS({ ...p, village: res.state, lastTickAt: Date.now() });
    toast.success('시설 위치를 옮겼습니다');
    return true;
  }, [setS]);

  const removeVillageTile = useCallback((uid: string) => {
    const p = ref.current;
    if (!p.base) return;
    const v = ensureVillageState(p.village, !!p.altar);
    const target = v.buildings.find(b => b.uid === uid);
    const nextV = removeVillageBuilding(v, uid);
    if (nextV === v) { toast.warning('중심 모닥불은 최소 1개 남겨야 합니다'); return; }
    let nextBackpack = p.backpack;
    if (target) {
      const def = VILLAGE_BUILDINGS[target.buildingId];
      if (def?.cost?.length) {
        nextBackpack = addStacks(nextBackpack, def.cost);
      }
    }
    setS({ ...p, backpack: nextBackpack, village: nextV, lastTickAt: Date.now() });
    toast.success('시설을 철거하고 건설 재료를 회수했습니다');
  }, [setS]);

  const researchVillageBlueprint = useCallback((buildingId: VillageBuildingId): boolean => {
    const p = ref.current;
    if (!p.base) return false;
    const v = ensureVillageState(p.village, !!p.altar);
    if (!isArtisanUnlocked(v.shamanSkills, buildingId)) {
      toast.warning('주술사 천막에서 필요한 장인 등급을 먼저 수련하세요');
      return false;
    }
    if (isBlueprintResearched(v, buildingId)) return true;
    const cost = blueprintResearchCost(buildingId);
    const paid0 = payCost(p, cost); const paid = paid0 && { ...p, ...paid0 };
    if (!paid) { toast.error(`설계도 연구 재료 부족: ${fmt(cost)}`); return false; }
    const def = VILLAGE_BUILDINGS[buildingId];
    const nextV: VillageState = {
      ...v,
      researchedBlueprints: [...new Set([...(v.researchedBlueprints ?? []), buildingId])],
    };
    setS({ ...paid, village: nextV, lastTickAt: Date.now() });
    toast.success(`📜 ${def.name} 설계도 연구 완료!`);
    return true;
  }, [setS]);

  const trainShamanSkill = useCallback((skillId: ShamanSkillId): boolean => {
    const p = ref.current;
    if (!p.base) return false;
    const v = ensureVillageState(p.village, !!p.altar);
    const def = SHAMAN_SKILL_DEFS.find(s => s.id === skillId);
    if (!def) return false;
    const curLv = shamanSkillLevel(v.shamanSkills, skillId);
    if (curLv >= def.maxLevel) { toast('이미 최고 단계입니다'); return false; }
    const nextLv = curLv + 1;
    const cost = def.costForLevel(nextLv);
    const paid0 = payCost(p, cost); const paid = paid0 && { ...p, ...paid0 };
    if (!paid) { toast.error(`수련 재료 부족: ${fmt(cost)}`); return false; }
    const nextV: VillageState = {
      ...v,
      shamanSkills: { ...(v.shamanSkills ?? {}), [skillId]: nextLv },
    };
    const nextTechs = [...new Set([...paid.techs, ...def.grantsTechIds])];
    setS({ ...paid, techs: nextTechs, village: nextV, lastTickAt: Date.now() });
    toast.success(`${def.icon} ${def.name} Lv.${nextLv} 달성!`);
    return true;
  }, [setS]);

  const performShamanRitual = useCallback((targetLevel: number): boolean => {
    const p = ref.current;
    if (!p.base) { toast.warning('먼저 거점을 세우세요'); return false; }
    const stage = SHAMAN_QUEST_STAGES.find(s => s.toLevel === targetLevel);
    if (!stage) return false;

    const v = ensureVillageState(p.village, !!p.altar);
    const totalDist = (p.expeditionDistanceM ?? 0) + (p.walkSteps ?? 0) * 20;
    const prog = checkShamanQuestStageProgress({
      stage,
      storage: p.storage,
      backpack: p.backpack,
      village: v,
      pets: p.pets ?? [],
      expeditionDistanceM: totalDist,
    });

    if (!prog.canRitual) {
      toast.warning('아직 승급 조건을 모두 달성하지 못했습니다.');
      return false;
    }

    let nextP = p;
    if (stage.requiredMaterials.length > 0) {
      const costStacks: Stack[] = stage.requiredMaterials.map(m => ({ itemId: m.itemId, count: m.count }));
      const paid = payCost(p, costStacks);
      if (!paid) {
        toast.error(`승급 공양 재료 부족: ${fmt(costStacks)}`);
        return false;
      }
      nextP = { ...p, ...paid };
    }

    const curSkills = v.shamanSkills ?? {};
    const nextSkills = { ...curSkills };
    if (targetLevel === 2) {
      nextSkills.tanning = Math.max(1, nextSkills.tanning ?? 0);
      nextSkills.woodworking = Math.max(1, nextSkills.woodworking ?? 0);
    } else if (targetLevel === 3) {
      nextSkills.masonry_smelting = Math.max(1, nextSkills.masonry_smelting ?? 0);
      nextSkills.stone_artisan = Math.max(1, nextSkills.stone_artisan ?? 0);
    } else if (targetLevel === 4) {
      nextSkills.masonry_smelting = Math.max(2, nextSkills.masonry_smelting ?? 0);
      nextSkills.wood_artisan = Math.max(2, nextSkills.wood_artisan ?? 0);
    }

    const nextBaseLevel = (targetLevel === 2 ? Math.max(p.base.level, 2) : targetLevel >= 3 ? 3 : p.base.level) as 1 | 2 | 3;
    const nextV: VillageState = {
      ...v,
      shamanLevel: targetLevel as 1 | 2 | 3 | 4 | 5,
      shamanSkills: nextSkills,
    };

    setS({
      ...nextP,
      base: { ...nextP.base, level: nextBaseLevel },
      village: nextV,
      shamanLevel: targetLevel as 1 | 2 | 3 | 4 | 5,
      lastTickAt: Date.now(),
    });

    toast.success(`🔥 [${stage.title}] 승급 의식 성공! 주술사 Lv.${targetLevel} 및 마을 Lv.${nextBaseLevel} 승급!`);
    return true;
  }, [setS]);

  const evolveShaman = useCallback((classId: ShamanClassId): boolean => {
    const p = ref.current;
    const v = ensureVillageState(p.village, !!p.altar);
    const meta = SHAMAN_CLASSES[classId];
    if (!meta) return false;

    const nextV: VillageState = {
      ...v,
      shamanClass: classId,
      classResource: 100,
    };

    setS({
      ...p,
      village: nextV,
      shamanClass: classId,
      classResource: 100,
      lastTickAt: Date.now(),
    });

    toast.success(`🎉 ${meta.icon} [${meta.name}] 전직 의식 완수! 전속 NPC [${meta.npc.name}]이(가) 마을에 합류했습니다!`);
    return true;
  }, [setS]);

  const triggerClassUltimate = useCallback((): boolean => {
    const p = ref.current;
    const rawClass = p.shamanClass ?? p.village?.shamanClass;
    const meta = rawClass ? SHAMAN_CLASSES[rawClass] : null;
    if (!meta) {
      toast.warning('전직을 먼저 완료해야 전용 메커니즘 궁극기를 사용할 수 있습니다.');
      return false;
    }
    const curResource = p.classResource ?? p.village?.classResource ?? 100;
    if (curResource < meta.ultimateCost) {
      toast.error(`${meta.resourceName}이(가) 부족합니다 (${curResource}/${meta.ultimateCost}${meta.resourceUnit}).`);
      return false;
    }

    const nextResource = Math.max(0, curResource - meta.ultimateCost);
    const nextV: VillageState = {
      ...ensureVillageState(p.village, !!p.altar),
      classResource: nextResource,
    };

    setS({
      ...p,
      village: nextV,
      classResource: nextResource,
      lastTickAt: Date.now(),
    });

    toast.success(`⚡ [${meta.ultimateActionName}] 발동! ${meta.ultimateDesc}`);
    return true;
  }, [setS]);

  const evolvePetToSkullDragon = useCallback((petUid: string): boolean => {
    const p = ref.current;
    const isWarlock = p.shamanClass === 'warlock' || p.village?.shamanClass === 'warlock';
    if (!isWarlock) {
      toast.warning('암흑 흑마술사만이 스컬 드래곤 암흑 의식을 거행할 수 있습니다.');
      return false;
    }
    const targetPet = (p.pets ?? []).find(pet => pet.uid === petUid);
    if (!targetPet) return false;
    if (targetPet.level < 4) {
      toast.warning('Lv.4 이상의 강력한 공룡 펫만이 스컬 드래곤으로 진화할 수 있습니다.');
      return false;
    }

    const boneCount = (p.storage.find(s => s.itemId === 'bone')?.count ?? 0) + (p.backpack.find(s => s.itemId === 'bone')?.count ?? 0);
    if (boneCount < 5) {
      toast.error('암흑 의식을 위해 공룡 뼈 5개가 제물로 필요합니다.');
      return false;
    }

    const paid = payAccessible(p, [{ itemId: 'bone', count: 5 }]);
    if (!paid) return false;

    const nextPets = paid.pets.map(pet => {
      if (pet.uid === petUid) {
        return {
          ...pet,
          speciesId: 'skull_dragon',
          name: '💀 스컬 드래곤',
          hp: 250,
          level: Math.max(pet.level, 4),
        };
      }
      return pet;
    });

    setS({
      ...paid,
      pets: nextPets,
      lastTickAt: Date.now(),
    });

    toast.success('💀 암흑 의식 성공! 공룡 펫이 전설의 [스컬 드래곤]으로 각성했습니다!');
    return true;
  }, [setS]);

  const researchCivilizationTech = useCallback((techId: string): boolean => {
    const p = ref.current;
    const tech = CIV_TECHS.find(t => t.id === techId);
    if (!tech) return false;
    const researched = p.civilizationTechs ?? ['tech_fire_gathering'];
    const status = checkCivTechStatus(tech, p.level, researched, p.storage, p.backpack);
    if (status.isUnlocked) {
      toast.info('이미 연구를 완료한 문명 기술입니다.');
      return false;
    }
    if (!status.canResearch) {
      toast.warning(status.reason ?? '연구 조건을 만족하지 못했습니다.');
      return false;
    }

    let nextP = p;
    if (tech.cost.length > 0) {
      const paid = payCost(p, tech.cost);
      if (!paid) {
        toast.error(`연구 재료 부족: ${fmt(tech.cost)}`);
        return false;
      }
      nextP = { ...p, ...paid };
    }

    const nextCivTechs = [...researched, techId];
    const prevBadge = getCivilizationEraBadge(researched, p.level);
    const nextBadge = getCivilizationEraBadge(nextCivTechs, p.level);

    let nextVillage = nextP.village;
    if (techId === 'tech_bitumen_waterproofing' && nextVillage) {
      nextVillage = {
        ...nextVillage,
        buildings: nextVillage.buildings.map(b => ({
          ...b,
          maxHp: Math.round(b.maxHp * 1.3),
        })),
      };
    }

    setS({
      ...nextP,
      village: nextVillage,
      civilizationTechs: nextCivTechs,
      lastTickAt: Date.now(),
    });

    if (nextBadge.era !== prevBadge.era) {
      toast.success(`🎉 ${nextBadge.titleBadge}! 거점이 새로운 문명 시대로 도약했습니다!`, { duration: 5000 });
    } else {
      toast.success(`✨ [${tech.title}] 연구 완료! (${tech.unlocks[0] ?? ''})`);
    }
    return true;
  }, [setS]);

  const forgeSignatureWeapon = useCallback((itemId: ItemId, cost: Stack[]): boolean => {
    const p = ref.current;
    const def = ITEMS[itemId];
    if (!def) return false;
    const paid = payAccessible(p, cost);
    if (!paid) { toast.error(`무기 제작 재료 부족: ${fmt(cost)}`); return false; }
    const dur = def.durability ?? 40;
    const g: GearInstance = { uid: crypto.randomUUID(), itemId, quality: 'NORMAL', durability: dur, maxDurability: dur };
    setS({ ...paid, gear: [...paid.gear, g], lastTickAt: Date.now() });
    toast.success(`🔥 ${def.name} 제작 완료! 아래 [무기 강화]에서 +1~+10강을 시도해 보세요`);
    return true;
  }, [setS]);

  const craftAmmoBundle = useCallback((itemId: 'arrow' | 'sling_stone' | 'javelin', count: number, cost: Stack[]): boolean => {
    const p = ref.current;
    const paid = payAccessible(p, cost);
    if (!paid) {
      toast.error(`탄약 제작 재료 부족: ${fmt(cost)}`);
      return false;
    }
    const crafted = { ...paid.crafted, [itemId]: (paid.crafted[itemId] ?? 0) + count };
    setS({
      ...paid,
      backpack: addStacks(paid.backpack, [{ itemId: itemId as Stack["itemId"], count }]),
      crafted,
      lastTickAt: Date.now(),
    });
    toast.success(`🏹 ${ITEMS[itemId].name} ×${count} 제조 완료! (배낭에 즉시 구비됨)`);
    return true;
  }, [setS]);

  const enhanceArmoryWeapon = useCallback((uid: string): { ok: boolean; plus: number } => {
    const p = ref.current;
    const g = p.gear.find(x => x.uid === uid);
    if (!g) return { ok: false, plus: 0 };
    const cost = armoryUpgradeCost(g);
    if (!cost) { toast('이미 최고 강화(+10강) 상태입니다'); return { ok: false, plus: g.plus ?? 0 }; }
    const paid = payAccessible(p, cost);
    if (!paid) { toast.error(`강화 재료 부족: ${fmt(cost)}`); return { ok: false, plus: g.plus ?? 0 }; }
    const curPlus = g.plus ?? 0;
    const chance = armorySuccessChance(curPlus);
    const success = Math.random() < chance;
    if (!success) {
      setS({ ...paid, lastTickAt: Date.now() });
      toast.warning(`${ITEMS[g.itemId]?.name ?? '무기'} +${curPlus + 1}강 연마 실패… (무기는 보존됨)`);
      return { ok: false, plus: curPlus };
    }
    const nextPlus = curPlus + 1;
    const def = ITEMS[g.itemId];
    const baseAtk = def?.weapon?.atk ?? Math.round((def?.tool?.power ?? 1) * 4);
    const nextAtk = weaponAtkWithPlus(baseAtk, nextPlus);
    const aura = weaponAuraForPlus(nextPlus);
    setS({
      ...paid,
      gear: paid.gear.map(x => (x.uid === uid ? { ...x, plus: nextPlus, durability: x.maxDurability } : x)),
      lastTickAt: Date.now(),
    });
    toast.success(`⚡ ${def?.name ?? '무기'} +${nextPlus}강 성공! (공격력 ${nextAtk} · ${aura.tierName})`);
    return { ok: true, plus: nextPlus };
  }, [setS]);

  const acceptShamanQuest = useCallback(() => {
    setS(p => ({ ...p, shamanQuestAcceptedIndex: p.questIndex }));
    const q = QUESTS_REF();
    toast.success('🧙 떠돌이 주술사의 생존 목표가 등록되었습니다!', {
      description: q ? `목표: ${q.title}` : undefined,
    });
  }, [setS]);

  const QUESTS_REF = () => currentQuest({ ...ref.current, storedGear: [], stats: { gathered: ref.current.gathered, crafted: ref.current.crafted, kills: ref.current.kills, deposits: ref.current.deposits } });

  const acceptLanguageQuest = useCallback(() => {
    const p = ref.current;
    if (p.level < 5) {
      toast.warning('족장 레벨 5가 되면 언어를 배울 수 있습니다');
      return;
    }
    setS({ ...p, languageQuestAccepted: true });
    toast.success('🧙 떠돌이 주술사의 「고대 언어 학습」 퀘스트가 생존 목표에 등록되었습니다!', {
      description: '"이제 자네도 말을 좀 배워야 될것같네."',
    });
  }, [setS]);

  const claimLanguageQuest = useCallback(() => {
    const p = ref.current;
    if (p.languageLearned) return;
    const prog = languageQuestProgress(p);
    if (!prog.ready) {
      toast.warning('족장 Lv.5 및 기초 재료를 준비해 주세요');
      return;
    }
    const next = gainXp({ ...p, languageQuestAccepted: true, languageLearned: true }, LANGUAGE_QUEST.rewardXp);
    setS(next);
    toast.success('🗣️ 말문이 트였습니다! 이제 말을 조금씩 할 수 있으며 다른 생존자 유저와 대화가 가능합니다!');
  }, [setS]);

  const harvestVillageBubble = useCallback((uid: string): Stack | null => {
    const p = ref.current;
    const v = ensureVillageState(p.village, !!p.altar);
    const target = v.buildings.find(b => b.uid === uid);
    if (!target) return null;
    const nowAt = Date.now();
    const workerBonus = (p.tribe?.count ?? 0) + (p.pets?.filter(pt => pt.deployed).length ?? 0);
    const bubble = computeBuildingHarvestBubble(target, nowAt, workerBonus);
    if (!bubble) return null;
    const stack: Stack = { itemId: bubble.itemId, count: bubble.count };
    const nextV: VillageState = {
      ...v,
      buildings: v.buildings.map(b => (b.uid === uid ? { ...b, lastHarvestAt: nowAt } : b)),
    };
    const gathered = { ...p.gathered, [bubble.itemId]: (p.gathered[bubble.itemId] ?? 0) + bubble.count };
    setS({
      ...p,
      village: nextV,
      storage: addStacks(p.storage, [stack]),
      gathered,
      lastTickAt: nowAt,
    });
    toast.success(`${bubble.icon} ${ITEMS[bubble.itemId]?.name ?? bubble.label} +${bubble.count} 수확! (창고 보관)`);
    return stack;
  }, [setS]);

  const harvestAllVillageBubbles = useCallback((): Stack[] => {
    const p = ref.current;
    const v = ensureVillageState(p.village, !!p.altar);
    const nowAt = Date.now();
    const workerBonus = (p.tribe?.count ?? 0) + (p.pets?.filter(pt => pt.deployed).length ?? 0);
    const collected: Stack[] = [];
    const nextBuildings = v.buildings.map(b => {
      const bubble = computeBuildingHarvestBubble(b, nowAt, workerBonus);
      if (!bubble) return b;
      collected.push({ itemId: bubble.itemId, count: bubble.count });
      return { ...b, lastHarvestAt: nowAt };
    });
    if (!collected.length) return [];
    const merged = addStacks([], collected);
    const gathered = { ...p.gathered };
    for (const st of merged) gathered[st.itemId] = (gathered[st.itemId] ?? 0) + st.count;
    setS({
      ...p,
      village: { ...v, buildings: nextBuildings },
      storage: addStacks(p.storage, merged),
      gathered,
      lastTickAt: nowAt,
    });
    toast.success(`✨ 마을 방치 보상 일괄 수확! (${fmt(merged)})`);
    return merged;
  }, [setS]);

  const startSmokeBatch = useCallback((itemId: ItemId, count: number): boolean => {
    const p = ref.current;
    const n = Math.max(1, Math.min(5, count));
    const pc = payCost(p, [{ itemId, count: n }]);
    const paid = pc ? { ...p, ...pc } : null;
    if (!paid) {
      toast.warning(`${ITEMS[itemId]?.name ?? itemId}이(가) 부족합니다`);
      return false;
    }
    const nowAt = Date.now();
    const outItem: 'jerky' | 'dried_fruit' = itemId === 'raw_meat' ? 'jerky' : 'dried_fruit';
    const batch: SmokehouseBatch = {
      id: crypto.randomUUID(),
      inputItemId: itemId,
      inputCount: n,
      outputItemId: outItem,
      outputCount: n,
      startedAt: nowAt,
      readyAt: nowAt + SMOKE_CURING_MS,
    };
    setS({
      ...paid,
      smokeBatches: [...(paid.smokeBatches ?? []), batch],
      lastFreshnessCheckAt: nowAt,
      lastTickAt: nowAt,
    });
    toast.success(`♨️ ${ITEMS[itemId].name} ×${n} 훈연 보관 시작! (부패 방지)`);
    return true;
  }, [setS]);

  const instantSmoke = useCallback((itemId: ItemId, kind: 'cooked' | 'dried'): boolean => {
    const p = ref.current;
    const pc = payCost(p, [
      { itemId, count: 1 },
      { itemId: 'branch', count: 1 },
    ]);
    const paid = pc ? { ...p, ...pc } : null;
    if (!paid) {
      toast.warning(`${ITEMS[itemId]?.name ?? '식재료'} 1개와 나뭇가지 1개가 필요합니다`);
      return false;
    }
    const outId: ItemId =
      kind === 'cooked' ? 'cooked_meat' : itemId === 'raw_meat' ? 'jerky' : 'dried_fruit';
    const crafted = { ...paid.crafted, [outId]: (paid.crafted[outId] ?? 0) + 1 };
    setS({
      ...paid,
      storage: addStacks(paid.storage, [{ itemId: outId, count: 1 }]),
      crafted,
      lastFreshnessCheckAt: Date.now(),
      lastTickAt: Date.now(),
    });
    toast.success(`🔥 ${ITEMS[outId].name} ×1 즉시 가공 완료! (창고 보관)`);
    return true;
  }, [setS]);

  const claimSmokeBatch = useCallback((batchId: string): boolean => {
    const p = ref.current;
    const batch = (p.smokeBatches ?? []).find(b => b.id === batchId);
    if (!batch || Date.now() < batch.readyAt) return false;
    const crafted = {
      ...p.crafted,
      [batch.outputItemId]: (p.crafted[batch.outputItemId] ?? 0) + batch.outputCount,
    };
    setS({
      ...p,
      storage: addStacks(p.storage, [{ itemId: batch.outputItemId, count: batch.outputCount }]),
      crafted,
      smokeBatches: (p.smokeBatches ?? []).filter(b => b.id !== batchId),
      lastTickAt: Date.now(),
    });
    toast.success(`🥩 훈연 완료! ${ITEMS[batch.outputItemId].name} ×${batch.outputCount} 창고 입고!`);
    return true;
  }, [setS]);

  const discardSpoiledFood = useCallback(() => {
    const p = ref.current;
    const nextBag = p.backpack.filter(s => s.itemId !== 'spoiled_food');
    const nextStore = p.storage.filter(s => s.itemId !== 'spoiled_food');
    setS({
      ...p,
      backpack: nextBag,
      storage: nextStore,
      lastFreshnessCheckAt: Date.now(),
      lastTickAt: Date.now(),
    });
    toast.success('🗑️ 초록 곰팡이가 핀 상한 음식을 모두 안전하게 폐기했습니다.');
  }, [setS]);

  const cookTavernRecipe = useCallback((recipeId: string): boolean => {
    const p = ref.current;
    const r = TAVERN_RECIPES.find(x => x.id === recipeId);
    if (!r) return false;
    const pc = payCost(p, r.ingredients);
    const paid = pc ? { ...p, ...pc } : null;
    if (!paid) {
      toast.error(`요리 재료 부족: ${fmt(r.ingredients)}`);
      return false;
    }
    const crafted = { ...paid.crafted, [r.result]: (paid.crafted[r.result] ?? 0) + 1 };
    const next = gainXp(
      {
        ...paid,
        storage: addStacks(paid.storage, [{ itemId: r.result, count: 1 }]),
        crafted,
        lastFreshnessCheckAt: Date.now(),
        lastTickAt: Date.now(),
      },
      r.xp
    );
    setS(next);
    toast.success(`🍲 주막 특선 「${r.name}」 완성! (경험치 +${r.xp} · 창고 보관)`);
    return true;
  }, [setS]);

  const cookShamanDish = useCallback((recipeId: string): boolean => {
    const p = ref.current;
    const r = SHAMAN_CUISINE_RECIPES.find(x => x.id === recipeId);
    if (!r) return false;
    const pc = payCost(p, r.ingredients);
    const paid = pc ? { ...p, ...pc } : null;
    if (!paid) {
      toast.error(`재료가 부족합니다: ${fmt(r.ingredients)}`);
      return false;
    }

    const nowAt = Date.now();
    // Health tonics & special dishes require cauldron cooking time
    if (r.cookTimeSec > 0) {
      const newJob: CookingJob = {
        id: `cook_${nowAt}_${Math.random().toString(36).slice(2, 6)}`,
        recipeId: r.id,
        startedAt: nowAt,
        readyAt: nowAt + r.cookTimeSec * 1000,
      };
      setS({
        ...paid,
        cookingJobs: [...(paid.cookingJobs ?? []), newJob],
        lastTickAt: nowAt,
      });
      toast.info(`🍲 ${r.name} 조리 시작! (가마솥에서 끓이는 중... ${r.cookTimeSec}초 소요)`);
      return true;
    }

    // Instant cooking: 기초 요리 & 일반식
    let nextStorage = paid.storage;
    const crafted = r.resultItemId
      ? { ...paid.crafted, [r.resultItemId]: (paid.crafted[r.resultItemId] ?? 0) + (r.resultCount ?? 1) }
      : paid.crafted;

    if (r.resultItemId) {
      nextStorage = addStacks(nextStorage, [{ itemId: r.resultItemId, count: r.resultCount ?? 1 }]);
    }

    let nextHunger = paid.hunger;
    let nextHp = paid.hp;
    if (r.category === 'regular') {
      nextHunger = Math.min(100, paid.hunger + (r.hungerRestore ?? 0));
      nextHp = Math.min(maxHpOf(paid), paid.hp + (r.hpRestore ?? 0));
    }

    setS({
      ...paid,
      storage: nextStorage,
      crafted,
      hunger: nextHunger,
      hp: nextHp,
      lastTickAt: nowAt,
      lastFreshnessCheckAt: nowAt,
    });

    toast.success(`🍽️ ${r.name} 완성! (${r.tagline})`);
    return true;
  }, [setS]);

  const claimShamanCooking = useCallback((jobId: string): boolean => {
    const p = ref.current;
    const job = (p.cookingJobs ?? []).find(j => j.id === jobId);
    if (!job) return false;
    const nowAt = Date.now();
    if (nowAt < job.readyAt) {
      const remainingSec = Math.ceil((job.readyAt - nowAt) / 1000);
      toast.warning(`⏳ 아직 가마솥에서 푹 끓이는 중입니다! (${remainingSec}초 남음)`);
      return false;
    }

    const r = SHAMAN_CUISINE_RECIPES.find(x => x.id === job.recipeId);
    if (!r) return false;

    let nextStorage = p.storage;
    const crafted = r.resultItemId
      ? { ...p.crafted, [r.resultItemId]: (p.crafted[r.resultItemId] ?? 0) + (r.resultCount ?? 1) }
      : p.crafted;

    if (r.resultItemId) {
      nextStorage = addStacks(nextStorage, [{ itemId: r.resultItemId, count: r.resultCount ?? 1 }]);
    }

    // Apply permanent stats if tonic
    let permStats = p.permanentStats ?? {};
    if (r.permStats) {
      permStats = {
        maxHpBonus: (permStats.maxHpBonus ?? 0) + (r.permStats.maxHpBonus ?? 0),
        atkBonus: (permStats.atkBonus ?? 0) + (r.permStats.atkBonus ?? 0),
        defBonus: (permStats.defBonus ?? 0) + (r.permStats.defBonus ?? 0),
        carryBonus: (permStats.carryBonus ?? 0) + (r.permStats.carryBonus ?? 0),
      };
    }

    // Apply timed buff if present (replaces previous food buffs; only the last eaten buff is active)
    let activeBuffs = (p.activeBuffs ?? []).filter(b => b.expiresAt > nowAt);
    if (r.buff) {
      activeBuffs = [
        {
          id: r.buff.id,
          name: r.buff.name,
          icon: r.buff.icon,
          desc: r.buff.desc,
          expiresAt: nowAt + r.buff.durationSec * 1000,
          effects: {
            atkBonusPct: r.buff.atkBonusPct,
            defBonusPct: r.buff.defBonusPct,
            speedBonusPct: r.buff.speedBonusPct,
            regenHpPer5s: r.buff.regenHpPer5s,
          },
        },
      ];
    }

    const nextHp = Math.min(
      maxHpOf({ ...p, permanentStats: permStats }),
      p.hp + (r.hpRestore ?? 0)
    );
    const nextHunger = Math.min(100, p.hunger + (r.hungerRestore ?? 0));

    setS({
      ...p,
      storage: nextStorage,
      crafted,
      hp: nextHp,
      hunger: nextHunger,
      permanentStats: permStats,
      activeBuffs,
      cookingJobs: (p.cookingJobs ?? []).filter(j => j.id !== jobId),
      lastTickAt: nowAt,
    });

    if (r.category === 'tonic') {
      toast.success(`🎉 ${r.name} 섭취 완료! 스탯이 영구적으로 상승했습니다!`, {
        description: r.tagline,
      });
    } else if (r.buff) {
      toast.success(`⚡ ${r.name} 완성! [${r.buff.name}] 버프 활성화 (${Math.round(r.buff.durationSec / 60)}분간 지속)`, {
        description: r.buff.desc,
      });
    } else {
      toast.success(`🍲 ${r.name} 조리 완성!`);
    }

    return true;
  }, [setS]);

  return { shamanClass: (s.shamanClass ?? s.village?.shamanClass ?? 'NONE') as ShamanClassId, classResource: s.classResource ?? s.village?.classResource ?? 100, triggerClassUltimate, researchCivilizationTech, civilizationEraInfo: getCivilizationEraBadge(s.civilizationTechs ?? ['tech_fire_gathering'], s.level), performShamanRitual, evolveShaman, evolvePetToSkullDragon, placeCustomVillageTile, craftCustomGear, craftAmmoBundle, harvestVillageBubble, harvestAllVillageBubbles, startSmokeBatch, instantSmoke, claimSmokeBatch, discardSpoiledFood, cookTavernRecipe, cookShamanDish, claimShamanCooking, freshnessPct: freshnessInfo.freshnessPct, acceptShamanQuest, acceptLanguageQuest, claimLanguageQuest, expeditionLevelInfo, researchVillageBlueprint, trainShamanSkill, forgeSignatureWeapon, enhanceArmoryWeapon, placeVillageTile, moveVillageTile, removeVillageTile, crewAct, healCrew, crewNearby, setCrewManual, steerCrew, commandCrew, hireMerc, selectTribeClass, toggleEscort, trainTribe, treatTribe, meetShaman, grantTutorialBranches, pickTutorialBranch, recruitAmbacho, pickEgg, hatchEgg, permadeathPet, updatePetHp, consumeDinoMeat, settleDinoExpedition, ensureStarterCamp, dispatchObserved, toggleExpeditionAuto, expeditionAutoRemainingSec: Math.max(0, DAILY_EXPEDITION_AUTO_LIMIT_SEC - (s.expeditionAutoDay === getTodayKey() ? (s.expeditionAutoSecToday ?? 0) : 0)), expeditionAutoLimitSec: DAILY_EXPEDITION_AUTO_LIMIT_SEC, rallyExpedition, recallExpedition, pocketMode, togglePocket: () => setPocketMode(p => !p), outdoorMoving: enabled && Date.now() < movingUntil, craftInvention, upgradeGear, reforgeGear, equip, dropGear, storeGear, retrieveGear, loadout, updateInventionCredits, awakenShrine, shrineRite, shrineBless, upgradeSkill, buildAltar, invent, setSanctuaries, inSanctuary, useSkill, skillEffect, construct, tame, recruit, collectWork, withdraw, storeOne, storePacked, adjustStorage,
    moveOutpost, petHits, mergePets, togglePetDeploy, assignPetRole, feedPet, togglePetLock, recordTerrainZone, recordPark, visitLandmark, sellItem, buyItem, takeDamage,
    state: s, entities, vision, reach, isNight, inBase, baseDef, weight, capacity, weapon, maxHp: maxHpOf(s),
    moveTo, interact, eat, placeBase, upgradeBase, claimBaseUpgrade, research, claimTech, startExpedition, claimExpedition, craft, reset, dropItems,
    quest, questProgress, canClaimQuest, claimQuest, nextLevelXp: xpToNext(s.level),
    canAfford: (st: Stack[]) => hasAll(s.storage, st),
    recipes: RECIPES, NODES, CREATURES,
  };
}

// Hook order can change across modules during edits; force a full reload instead of hot patching.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
