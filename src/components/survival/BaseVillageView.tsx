import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  buildingAtTile,
  buildingFootprintCells,
  computeBuildingHarvestBubble,
  computeVillageBonuses,
  computeVillagePopulationCapacity,
  ensureVillageState,
  getVillageGridSize,
  VILLAGE_BUILDINGS,
  type PlacedVillageBuilding,
  type ShamanSkillId,
  type VillageBuildingCategory,
  type VillageBuildingDef,
  type VillageBuildingId,
  type VillageState,
} from '@/lib/survival/village';
import { countSpoiledFood, type ActiveFoodBuff, type CookingJob, type SmokehouseBatch } from '@/lib/survival/culinary';
import { getSpeechStageInfo, type QuestState } from '@/lib/survival/quests';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import { addStacks, countOf, hasAll } from '@/lib/survival/inventory';
import type { OwnedPet } from '@/lib/survival/pets';
import type { TribeState } from '@/lib/survival/mercenaries';
import type { GearInstance, Stack } from '@/lib/survival/types';
import type { InventedItem } from '@/lib/survival/inventedItems';
import type { InventionInput } from '@/lib/survival/invention';
import { DEFAULT_TRIBE_CLASS, getTribeClass, TRIBE_CLASS_LIST, type TribeClassId } from '@/data/tribeClasses';
import TribeSprite from './TribeSprite';
import PetSprite from './PetSprite';
import ArchitectureWorkshopModal from './ArchitectureWorkshopModal';
import PrimitiveArmoryModal from './PrimitiveArmoryModal';
import AncientAltarModal from './AncientAltarModal';
import WanderingShamanModal from './WanderingShamanModal';
import ShamanQuestModal from './ShamanQuestModal';
import { ShamanEvolutionModal, ShamanResourceHUD } from './ShamanEvolutionUI';
import { type AffinityState, mapAffinityToShamanClass } from '@/data/affinitySystem';
import CivilizationTechModal from './CivilizationTechModal';
import ShamanCuisineModal from './ShamanCuisineModal';
import { getCivilizationEraBadge } from '@/lib/survival/civilizationTech';
import {
  BASE_SHAMAN_CLASSES,
  normalizeShamanClassId,
  type ShamanClassId,
  type ShamanLevel,
} from '@/lib/survival/shamanEvolution';
import SmokehouseTavernModal from './SmokehouseTavernModal';
import TribalHallModal from './TribalHallModal';
import IntentCraftingModal, { type CraftingMode } from './IntentCraftingModal';
import {
  BUILDING_MECHANICS_META,
  type BuildingMechanicTag,
  type GearMechanicTag,
  type PhysicalAttributes,
} from '@/lib/survival/intentCrafting';
import shamanImg from '@/assets/survival/npc-shaman.png';
import mercImg from '@/assets/survival/npc-mercenary.png';
import {
  createInitialSimState,
  persistTerrain,
  type HeatmapOverlayKind,
  type SimResident,
  type VillageSimState,
} from '@/lib/sim/state';
import { startNightSiegeWave } from '@/lib/sim/tick';
import { evaluateBuildingSynergy } from '@/lib/sim/pathfinding';
import VillageCanvas, { type TerrainToolKind } from '@/components/village/VillageCanvas';
import VillageHUD from '@/components/village/VillageHUD';
import BuildToolbar, { type BottomDockTab } from '@/components/village/BuildToolbar';
import FacilityDrawer, { type UnifiedFacilityModal } from '@/components/village/FacilityDrawer';

type FacilityModalKind = UnifiedFacilityModal | null;

interface Props {
  village: VillageState | undefined;
  baseLevel: 1 | 2 | 3;
  playerLevel?: number;
  shamanLevel?: ShamanLevel;
  shamanClass?: ShamanClassId | null;
  affinityState?: AffinityState;
  classResource?: number;
  onTriggerUltimate?: () => void;
  onSelectShamanClass?: (classId: ShamanClassId) => boolean;
  expeditionDistanceM?: number;
  civilizationTechs?: string[];
  languageLearned?: boolean;
  languageQuestAccepted?: boolean;
  shamanQuestAcceptedIndex?: number;
  questState?: QuestState;
  canClaimQuest?: boolean;
  onClaimQuest?: () => void;
  onAcceptShamanQuest?: () => void;
  onAcceptLanguageQuest?: () => void;
  onClaimLanguageQuest?: () => void;
  hasAltar: boolean;
  tribe: TribeState | undefined;
  pets: OwnedPet[];
  storage: Stack[];
  backpack: Stack[];
  gear?: GearInstance[];
  inventions?: InventedItem[];
  inBase: boolean;
  ready: boolean;
  freshnessPct?: number;
  smokeBatches?: SmokehouseBatch[];
  permanentStats?: {
    maxHpBonus?: number;
    atkBonus?: number;
    defBonus?: number;
    carryBonus?: number;
  };
  activeBuffs?: ActiveFoodBuff[];
  cookingJobs?: CookingJob[];
  onCookShamanDish?: (recipeId: string) => boolean;
  onClaimShamanCooking?: (jobId: string) => boolean;
  onHarvestBubble?: (uid: string) => Stack | null;
  onHarvestAllBubbles?: () => Stack[];
  onStartSmokeBatch?: (itemId: ItemId, count: number) => boolean;
  onInstantSmoke?: (itemId: ItemId, kind: 'cooked' | 'dried') => boolean;
  onClaimSmokeBatch?: (batchId: string) => boolean;
  onDiscardSpoiled?: () => void;
  onCookTavernRecipe?: (recipeId: string) => boolean;
  onEatDish?: (itemId: ItemId) => void;
  onPlace: (buildingId: VillageBuildingId, x: number, y: number) => boolean;
  onMove: (uid: string, toX: number, toY: number) => boolean;
  onRemove: (uid: string) => void;
  onResearchBlueprint?: (buildingId: VillageBuildingId) => boolean;
  onGrantBranches?: () => void;
  onTrainShamanSkill?: (skillId: ShamanSkillId) => boolean;
  onForgeSignatureWeapon?: (itemId: ItemId, cost: Stack[]) => boolean;
  onCraftAmmoBundle?: (itemId: 'arrow' | 'sling_stone' | 'javelin', count: number, cost: Stack[]) => boolean;
  onEnhanceWeapon?: (uid: string) => { ok: boolean; plus: number };
  onInvent?: (
    input: InventionInput,
    naming: { name: string; desc: string; masterwork?: boolean; ranged?: boolean }
  ) => InventedItem | null;
  onHireTribe?: (classId: TribeClassId) => boolean;
  onSelectTribeClass?: (classId: TribeClassId) => void;
  onTrainTribe?: () => boolean;
  onTreatTribe?: () => boolean;
  onToggleEscort?: () => void;
  onOpenBaseTab?: (tab: 'village' | 'lab' | 'craft' | 'storage' | 'expedition' | 'pets') => void;
  onOpenObjectives?: () => void;
  onPlaceCustomBuilding?: (params: {
    name: string;
    desc: string;
    category: 'fence' | 'tower' | 'building';
    mechanics: BuildingMechanicTag[];
    physics: PhysicalAttributes;
    hp: number;
    materials: Record<string, number>;
    x: number;
    y: number;
  }) => boolean;
  onCraftCustomGear?: (params: {
    name: string;
    desc: string;
    category: 'melee' | 'ranged' | 'tool' | 'armor';
    mechanics: GearMechanicTag[];
    physics: PhysicalAttributes;
    atk?: number;
    def?: number;
    materials: Record<string, number>;
  }) => boolean;
  onPerformShamanRitual?: (targetLevel: number) => boolean;
  onEvolveShaman?: (classId: ShamanClassId) => boolean;
  onEvolvePetToSkullDragon?: (petUid: string) => boolean;
  onResearchCivilizationTech?: (techId: string) => boolean;
  onReplayTutorial?: () => void;
}

const TOUCH_GREETINGS_PRIMITIVE = [
  '우가! 족장님 반갑다!',
  '불 따뜻하다! 고기 냄새 좋다!',
  '돌 나르고 나무 베는 중이다! 우가차차!',
];

const TOUCH_GREETINGS_SPEAK = [
  '♥ 족장님! 오솔길 덕분에 창고로 자원 나르기가 훨씬 수월합니다!',
  '🛡️ 성벽과 방어선을 꼼꼼히 순찰하고 있습니다!',
  '🍖 주막과 훈제소 덕분에 마을 식량이 든든합니다!',
  '🔥 모닥불 온기가 닿는 곳에 쉼터가 있어 밤에도 따뜻합니다!',
];

function getTribeDialogueLines(
  classId: TribeClassId,
  playerLevel: number,
  languageLearned?: boolean
) {
  const stage = getSpeechStageInfo(playerLevel, languageLearned).stage;
  if (stage < 2) {
    return {
      heroPrompt: '우가? 마을 지키는 중인가?',
      npcReply: '"우가차차! 성벽 튼튼! 맹수 오면 몽둥이로 쫓아낸다!"',
    };
  }
  switch (classId) {
    case 'tank':
      return {
        heroPrompt: '거인 부족 전사여, 마을 방어선은 든든한가?',
        npcReply:
          '"족장님! 성벽 안쪽 순찰 경로를 돌며 보초를 서고 있습니다! 밤 습격이 와도 성벽 뒤에서 공격을 받아내겠습니다!"',
      };
    case 'gatherer':
      return {
        heroPrompt: '오늘 작업장 물류와 창고 정리는 잘 되어가나?',
        npcReply:
          '"벌목장과 제련소에서 생산된 자원을 창고로 부지런히 나르고 있습니다! 오솔길을 깔아주시면 훨씬 빨라집니다!"',
      };
    case 'ranged':
      return {
        heroPrompt: '사수여, 야간 방어 사격 준비는 마쳤는가?',
        npcReply:
          '"모닥불과 화로 불빛이 비추는 범위 안에서는 명중률이 크게 올라갑니다! 침입하는 맹수를 사거리 안에서 요격하겠습니다!"',
      };
    case 'assassin':
    default:
      return {
        heroPrompt: '정찰병이여, 외곽 경계림 동향은 어떠한가?',
        npcReply:
          '"해질녘이 되면 어느 방면에서 맹수가 몰려올지 미리 파악해 족장님께 보고하고 있습니다!"',
      };
  }
}

export default function BaseVillageView({
  village,
  baseLevel,
  playerLevel = 1,
  shamanLevel = 1,
  shamanClass = 'NONE',
  affinityState,
  classResource = 100,
  onTriggerUltimate,
  expeditionDistanceM = 0,
  civilizationTechs = ['tech_fire_gathering'],
  languageLearned = false,
  languageQuestAccepted = false,
  shamanQuestAcceptedIndex = -1,
  questState,
  canClaimQuest,
  onClaimQuest,
  onAcceptShamanQuest,
  onAcceptLanguageQuest,
  onClaimLanguageQuest,
  hasAltar,
  tribe,
  pets,
  storage,
  backpack,
  gear = [],
  inventions = [],
  inBase,
  freshnessPct = 100,
  smokeBatches = [],
  onHarvestBubble,
  onHarvestAllBubbles,
  onStartSmokeBatch,
  onInstantSmoke,
  onClaimSmokeBatch,
  onDiscardSpoiled,
  onCookTavernRecipe,
  onEatDish,
  onPlace,
  onMove,
  onRemove,
  onResearchBlueprint,
  onTrainShamanSkill,
  onForgeSignatureWeapon,
  onCraftAmmoBundle,
  onEnhanceWeapon,
  onInvent,
  onHireTribe,
  onSelectTribeClass,
  onTrainTribe,
  onTreatTribe,
  onToggleEscort,
  onOpenBaseTab,
  onOpenObjectives,
  onPlaceCustomBuilding,
  onCraftCustomGear,
  onPerformShamanRitual,
  onEvolveShaman,
  onEvolvePetToSkullDragon,
  onResearchCivilizationTech,
  onReplayTutorial,
  permanentStats = {},
  activeBuffs = [],
  cookingJobs = [],
  onCookShamanDish,
  onClaimShamanCooking,
}: Props) {
  const vState = useMemo(() => ensureVillageState(village, hasAltar), [village, hasAltar]);
  const activeShamanLevel = (vState.shamanLevel ?? shamanLevel ?? 1) as ShamanLevel;
  const dominantClass = mapAffinityToShamanClass(affinityState?.dominantAffinity ?? null);
  const effectiveClass = dominantClass ?? vState.shamanClass ?? shamanClass;
  // Single canonical class ID across the entire component ('ENGINEER' | 'MAGE' | 'NECROMANCER' | 'HONEST' | null)
  const canonicalClass = normalizeShamanClassId(effectiveClass);
  const isClassChosen = canonicalClass !== null && canonicalClass !== undefined;

  useEffect(() => {
    if (activeShamanLevel >= 5 && !isClassChosen) {
      setActiveModal('shaman_evolution');
    }
  }, [activeShamanLevel, isClassChosen]);

  const villageGridSize = getVillageGridSize(activeShamanLevel);
  const bonuses = useMemo(() => computeVillageBonuses(vState), [vState]);
  const popCap = useMemo(
    () => computeVillagePopulationCapacity(vState, baseLevel, playerLevel),
    [vState, baseLevel, playerLevel]
  );
  const ownedPool = useMemo(() => addStacks(storage, backpack), [storage, backpack]);
  const spoiledCount = useMemo(() => countSpoiledFood(backpack, storage), [backpack, storage]);
  const eraBadge = useMemo(
    () => getCivilizationEraBadge(civilizationTechs, playerLevel),
    [civilizationTechs, playerLevel]
  );

  // Pure Simulation Engine Reference (Zero React state churn on 60fps ticks!)
  const simRef = useRef<VillageSimState>(
    createInitialSimState(vState, villageGridSize, canonicalClass)
  );

  // Sync gridSize or newly placed buildings into simRef without resetting simulation
  useEffect(() => {
    const sim = simRef.current;
    if (sim.gridSize !== villageGridSize) {
      simRef.current = createInitialSimState(vState, villageGridSize, canonicalClass);
      return;
    }
    sim.flowDirty = true;
    for (const b of vState.buildings) {
      if (sim.buildingHpMap[b.uid] === undefined) {
        sim.buildingHpMap[b.uid] = b.hp ?? VILLAGE_BUILDINGS[b.buildingId]?.maxHp ?? 200;
      }
      // Clear natural forest/rock underneath newly placed buildings
      for (const c of buildingFootprintCells(b.buildingId, b.x, b.y)) {
        if (c.x >= 0 && c.y >= 0 && c.x < villageGridSize && c.y < villageGridSize) {
          const idx = c.y * villageGridSize + c.x;
          if (sim.terrain[idx] === 'forest' || sim.terrain[idx] === 'rock') {
            sim.terrain[idx] = 'grass';
          }
        }
      }
    }
  }, [vState, villageGridSize, canonicalClass]);

  // Sync desired residents roster into simRef.current.residents when tribe/pets/class change
  useEffect(() => {
    const sim = simRef.current;
    const desired: Omit<
      SimResident,
      'x' | 'y' | 'targetX' | 'targetY' | 'facing' | 'moving' | 'insideShelter' | 'bubble' | 'bubbleUntil' | 'waitTimerSec'
    >[] = [];

    const rawTribeCount = tribe?.count ?? 0;
    const tribeCount = Math.min(popCap.maxTribeCapacity, rawTribeCount);
    const activeClass = tribe?.classId ?? DEFAULT_TRIBE_CLASS;
    const classPool: TribeClassId[] = [];
    if (tribe?.classCounts) {
      for (const c of TRIBE_CLASS_LIST) {
        const n = tribe.classCounts[c.id] ?? 0;
        for (let i = 0; i < n; i++) classPool.push(c.id);
      }
    }
    const fallbackClasses: TribeClassId[] = ['gatherer', 'tank', 'ranged', 'assassin'];
    const hasAmbachoInCounts = (tribe?.classCounts?.gatherer ?? 0) > 0;

    for (let i = 0; i < tribeCount; i++) {
      const isAmbacho = i === 0 && (hasAmbachoInCounts || activeClass === 'gatherer' || !tribe?.classCounts);
      const cid: TribeClassId = isAmbacho
        ? 'gatherer'
        : (classPool[i] ?? (i === 0 ? activeClass : fallbackClasses[i % fallbackClasses.length]));
      const cls = getTribeClass(cid);
      const role: SimResident['role'] =
        cid === 'ranged'
          ? 'archer_guard'
          : cid === 'tank'
            ? 'wall_patrol'
            : cid === 'gatherer'
              ? 'hauler'
              : i % 2 === 0
                ? 'campfire_social'
                : 'shelter_rest';
      desired.push({
        id: `tribe-${i}`,
        kind: 'tribe',
        role,
        label: isAmbacho ? '충성된 암바초 (파밍)' : `${cls.name} ${i + 1}`,
        tribeClass: cid,
      });
    }

    for (let e = 0; e < popCap.ambientExtraCount; e++) {
      const isHauler = e % 2 === 0;
      desired.push({
        id: `extra-${e}`,
        kind: 'extra',
        role: isHauler ? 'hauler' : 'campfire_social',
        label: isHauler ? `마을 짐꾼 ${e + 1}` : `마을 주민 ${e + 1}`,
        tribeClass: isHauler ? 'gatherer' : 'assassin',
      });
    }

    const guardPets = [
      ...pets.filter(p => p.deployed || p.role === 'guard'),
      ...pets.filter(p => !p.deployed && p.role !== 'guard'),
    ].slice(0, 3);
    for (let pi = 0; pi < guardPets.length; pi++) {
      const pet = guardPets[pi];
      desired.push({
        id: `pet-${pet.uid}`,
        kind: 'pet',
        role: pi === 0 ? 'wall_patrol' : 'campfire_social',
        label: pet.name,
        speciesId: pet.speciesId,
      });
    }

    if (canonicalClass && BASE_SHAMAN_CLASSES[canonicalClass]) {
      const classCfg = BASE_SHAMAN_CLASSES[canonicalClass];
      desired.unshift({
        id: `shaman-class-npc-${canonicalClass}`,
        kind: 'class_npc',
        role: 'class_npc',
        label: `${classCfg.npc.name} (${classCfg.npc.role})`,
        classNpc: classCfg.npc,
      });
    }

    const mid = villageGridSize / 2;
    sim.residents = desired.map((d, idx) => {
      const existing = sim.residents.find(r => r.id === d.id);
      if (existing) {
        return { ...existing, ...d };
      }
      const angle = (idx * 1.35) % (Math.PI * 2);
      const sx = Math.max(1.2, Math.min(villageGridSize - 1.5, mid + Math.cos(angle) * 2.2));
      const sy = Math.max(1.2, Math.min(villageGridSize - 1.5, mid + Math.sin(angle) * 2.2));
      return {
        ...d,
        x: sx,
        y: sy,
        targetX: sx,
        targetY: sy,
        facing: idx % 2 === 0 ? 1 : -1,
        moving: false,
        insideShelter: false,
        bubble: null,
        bubbleUntil: 0,
        carrying: null,
        waitTimerSec: (idx * 0.35) % 1.4,
      };
    });
  }, [tribe?.count, tribe?.classId, tribe?.classCounts, pets, popCap, canonicalClass, villageGridSize]);

  // UI Control States
  const [bottomTab, setBottomTab] = useState<BottomDockTab>('build');
  const [buildMode, setBuildMode] = useState(false);
  const [isoView, setIsoView] = useState(true);
  const [zoom, setZoom] = useState<number>(1);
  const clampZoom = (v: number) => Math.round(Math.max(0.75, Math.min(2.2, v)) * 100) / 100;
  const [heatmap, setHeatmap] = useState<HeatmapOverlayKind>('none');
  const [catFilter, setCatFilter] = useState<'all' | VillageBuildingCategory>('all');
  const [selectedBuildId, setSelectedBuildId] = useState<VillageBuildingId>('branch_fence');
  const [selectedPlacedUid, setSelectedPlacedUid] = useState<string | null>(null);
  const [ghostTile, setGhostTile] = useState<{ x: number; y: number } | null>(null);
  const [lineDragMode, setLineDragMode] = useState(false);
  const [terrainTool, setTerrainTool] = useState<TerrainToolKind>('none');
  const [inspectBuildingDef, setInspectBuildingDef] = useState<VillageBuildingDef | null>(null);
  const [activeModal, setActiveModal] = useState<FacilityModalKind>(null);
  const [intentCraftingTab, setIntentCraftingTab] = useState<CraftingMode>('architecture');
  const [talkingAgent, setTalkingAgent] = useState<SimResident | null>(null);
  const [buildingPopup, setBuildingPopup] = useState<PlacedVillageBuilding | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);

  // Unified single entry mapping for buildings
  const modalForBuilding = (buildingId: VillageBuildingId): FacilityModalKind => {
    if (buildingId === 'build_workshop') return 'workshop';
    if (buildingId === 'stone_smeltery' || buildingId === 'brazier') return 'armory';
    if (buildingId === 'ancient_altar') return 'altar';
    if (buildingId === 'shaman_tent' || buildingId === 'wandering_shaman') return 'shaman';
    if (buildingId === 'tribal_hall') return 'tribal_hall';
    if (buildingId === 'smokehouse') return 'smokehouse';
    if (buildingId === 'primitive_tavern') return 'tavern';
    return null;
  };

  // Compute ready harvest bubbles per building
  const workerBonus = (tribe?.count ?? 0) + pets.filter(p => p.deployed).length;
  const buildingBubbles = useMemo(() => {
    const map: Record<
      string,
      { itemId: Stack['itemId']; icon: string; label: string; count: number }
    > = {};
    for (const b of vState.buildings) {
      const bub = computeBuildingHarvestBubble(b, nowTick, workerBonus);
      if (bub) map[b.uid] = bub;
    }
    return map;
  }, [vState.buildings, nowTick, workerBonus]);

  const totalReadyBubbles = Object.keys(buildingBubbles).length;

  const triggerPopHarvest = (b: PlacedVillageBuilding) => {
    const bub = buildingBubbles[b.uid];
    if (!bub || !onHarvestBubble) return;
    const got = onHarvestBubble(b.uid);
    if (got) {
      simRef.current.floats.push({
        id: `${b.uid}-${Date.now()}`,
        x: b.x + 0.5,
        y: b.y,
        text: `${bub.icon} +${got.count}`,
        color: '#facc15',
        ttlSec: 1.1,
      });
    }
  };

  const handleOpenBuildingFacility = (placed: PlacedVillageBuilding) => {
    const modal = modalForBuilding(placed.buildingId);
    if (modal) {
      setActiveModal(modal);
      return;
    }
    setBuildingPopup(placed);
  };

  const handleDemolishBuilding = (uid: string) => {
    const target = vState.buildings.find(b => b.uid === uid);
    if (!target) return;
    if (
      target.buildingId === 'campfire' &&
      vState.buildings.filter(b => b.buildingId === 'campfire').length <= 1
    ) {
      toast.error('마지막 남은 모닥불은 철거할 수 없습니다.');
      return;
    }
    onRemove(uid);
    delete simRef.current.buildingHpMap[uid];
    simRef.current.flowDirty = true;
    setSelectedPlacedUid(null);
    setBuildingPopup(null);
    toast.success(`${VILLAGE_BUILDINGS[target.buildingId].name} 철거 완료`);
  };

  const handlePaintTerrainTile = (x: number, y: number, tool: 'path' | 'clear') => {
    const sim = simRef.current;
    const idx = y * villageGridSize + x;
    const cur = sim.terrain[idx];
    if (cur === 'water') {
      toast.warning('샘물 타일은 메울 수 없습니다.');
      return;
    }
    if (tool === 'path') {
      if (buildingAtTile(vState, x, y)) {
        toast.warning('건물이 있는 타일에는 오솔길을 깔 수 없습니다.');
        return;
      }
      if (cur !== 'path') {
        sim.terrain[idx] = 'path';
        sim.flowDirty = true;
        persistTerrain(villageGridSize, sim.terrain);
        sim.floats.push({
          id: `path-${Date.now()}`,
          x: x + 0.5,
          y,
          text: '🛣️ 오솔길 포장 (+60% 속도)',
          color: '#fcd34d',
          ttlSec: 0.9,
        });
      }
    } else if (tool === 'clear') {
      if (cur !== 'grass') {
        const label =
          cur === 'forest' ? '🌲 숲 개간 완료' : cur === 'rock' ? '🪨 암석 개간 완료' : '🌱 평지 복구';
        sim.terrain[idx] = 'grass';
        sim.flowDirty = true;
        persistTerrain(villageGridSize, sim.terrain);
        sim.floats.push({
          id: `clr-${Date.now()}`,
          x: x + 0.5,
          y,
          text: label,
          color: '#86efac',
          ttlSec: 0.9,
        });
      }
    }
  };

  const handleSelectResident = (ag: SimResident) => {
    if (buildMode) return;
    const line =
      ag.kind === 'class_npc'
        ? (ag.classNpc?.dialogue ?? '안녕하세요, 족장님!')
        : (languageLearned || playerLevel >= 5 ? TOUCH_GREETINGS_SPEAK : TOUCH_GREETINGS_PRIMITIVE)[
            Math.floor(
              Math.random() *
                (languageLearned || playerLevel >= 5
                  ? TOUCH_GREETINGS_SPEAK.length
                  : TOUCH_GREETINGS_PRIMITIVE.length)
            )
          ];
    ag.bubble = line;
    ag.bubbleUntil = Date.now() + 3500;
    ag.waitTimerSec = 2.5;
    setTalkingAgent({ ...ag, bubble: line });
  };

  const handleTriggerNightSiege = () => {
    startNightSiegeWave(simRef.current, baseLevel, playerLevel);
    toast.warning(
      `🌙 ${simRef.current.upcomingRaidDir} 외곽 경계림에서 야간 습격 방어전이 시작되었습니다!`,
      {
        id: 'village-night-siege-start',
        description: '맹수들이 가장 약한 성벽을 찾아 진격합니다. 수호 병력과 타워가 요격합니다!',
      }
    );
  };

  const handleRepairAllWalls = () => {
    const sim = simRef.current;
    let repaired = 0;
    for (const b of vState.buildings) {
      const maxHp = b.maxHp ?? VILLAGE_BUILDINGS[b.buildingId]?.maxHp ?? 200;
      if ((sim.buildingHpMap[b.uid] ?? maxHp) < maxHp) {
        sim.buildingHpMap[b.uid] = maxHp;
        repaired++;
      }
    }
    sim.flowDirty = true;
    toast.success(`🔧 파손된 방어 시설 ${repaired}곳을 모두 완벽히 수리했습니다!`);
    setNowTick(Date.now());
  };

  // Apply real Shaman Class NPC Blessing effect!
  const handleClaimNpcBlessing = (npcName?: string) => {
    const sim = simRef.current;
    sim.blessingActiveUntil = Date.now() + 5 * 60 * 1000;
    // Also restore 35% HP to all damaged walls
    for (const b of vState.buildings) {
      const maxHp = b.maxHp ?? VILLAGE_BUILDINGS[b.buildingId]?.maxHp ?? 200;
      const cur = sim.buildingHpMap[b.uid] ?? maxHp;
      if (cur < maxHp) {
        sim.buildingHpMap[b.uid] = Math.min(maxHp, cur + Math.round(maxHp * 0.35));
      }
    }
    sim.flowDirty = true;
    toast.success(`✨ [${npcName ?? '전속 주술사'}]의 축복이 마을에 내렸습니다!`, {
      description: '5분간 주민 이동·물류 속도 +25%, 방어 공격력 +25%, 행복도 상승 및 손상 성벽 35% 회복!',
    });
    setTalkingAgent(null);
  };

  // Summary resource counts for slim HUD
  const woodCount = countOf(ownedPool, 'log') + countOf(ownedPool, 'branch');
  const stoneCount = countOf(ownedPool, 'flint') + countOf(ownedPool, 'stone' as ItemId);
  const foodCount =
    countOf(ownedPool, 'cooked_meat') +
    countOf(ownedPool, 'jerky') +
    countOf(ownedPool, 'berry') +
    countOf(ownedPool, 'raw_meat');
  const damagedWallCount = vState.buildings.filter(b => {
    const maxHp = b.maxHp ?? VILLAGE_BUILDINGS[b.buildingId]?.maxHp ?? 200;
    return (simRef.current.buildingHpMap[b.uid] ?? maxHp) < maxHp;
  }).length;
  const questAlert = !!(canClaimQuest || (playerLevel >= 5 && !languageLearned));

  return (
    <div className="space-y-2 text-xs" data-village-view>
      {/* Shaman Evolution Resource Bar (only when evolved) */}
      {canonicalClass && (
        <ShamanResourceHUD
          shamanClass={canonicalClass}
          value={classResource}
          max={100}
          onTriggerUltimate={onTriggerUltimate}
          className="shadow-lg border-2"
        />
      )}

      {/* Shaman Lv.5 Evolution Ready Banner */}
      {activeShamanLevel >= 5 && !isClassChosen && (
        <div className="flex items-center justify-between p-2 rounded bg-gradient-to-r from-amber-600/30 via-orange-600/30 to-purple-600/30 border-2 border-amber-400 shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
            <span>⚡</span>
            <span>주술사 Lv.5 승급 완수! [4대 주술사 전직] 선택 가능</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal('shaman_evolution')}
            className="pixel-btn bg-amber-400 text-black hover:bg-amber-300 font-bold px-2.5 py-1 text-xs"
          >
            전직 선택 ▶
          </button>
        </div>
      )}

      {/* 1. Slim Top Village HUD (Resources, Dynamic Grid Size, Needs/Happiness, Day/Night Clock, Heatmaps) */}
      <VillageHUD
        baseLevel={baseLevel}
        gridSize={villageGridSize}
        eraTitleBadge={eraBadge.titleBadge}
        onOpenCivTech={() => setActiveModal('civ_tech')}
        woodCount={woodCount}
        stoneCount={stoneCount}
        foodCount={foodCount}
        freshnessPct={freshnessPct}
        spoiledCount={spoiledCount}
        onOpenSmokehouse={() => setActiveModal('smokehouse')}
        totalWallHp={bonuses.totalWallHp}
        residentCount={popCap.totalResidentDisplay}
        happinessPct={simRef.current.needs.happinessPct}
        needs={simRef.current.needs}
        phase={simRef.current.phase}
        dayNumber={simRef.current.dayNumber}
        upcomingRaidDir={simRef.current.upcomingRaidDir}
        onTriggerNightSiege={handleTriggerNightSiege}
        heatmap={heatmap}
        onSelectHeatmap={setHeatmap}
        isoView={isoView}
        onToggleIsoView={() => setIsoView(v => !v)}
        zoom={zoom}
        onZoomIn={() => setZoom(z => clampZoom(z + 0.2))}
        onZoomOut={() => setZoom(z => clampZoom(z - 0.2))}
        onZoomReset={() => setZoom(1)}
        totalReadyBubbles={totalReadyBubbles}
        onHarvestAllBubbles={onHarvestAllBubbles ? () => onHarvestAllBubbles() : undefined}
      />

      {/* 2. Star of the Show: 60fps True Isometric & Top-Down Interactive Village Canvas */}
      <VillageCanvas
        simRef={simRef}
        vState={vState}
        gridSize={villageGridSize}
        baseLevel={baseLevel}
        playerLevel={playerLevel}
        hasFoodInStorage={foodCount > 0}
        isoView={isoView}
        zoom={zoom}
        onZoomChange={setZoom}
        heatmap={heatmap}
        buildMode={buildMode}
        lineDragMode={lineDragMode}
        terrainTool={terrainTool}
        selectedBuildId={selectedBuildId}
        selectedPlacedUid={selectedPlacedUid}
        onSelectPlacedUid={setSelectedPlacedUid}
        ghostTile={ghostTile}
        onGhostTileChange={setGhostTile}
        onConfirmPlaceBuilding={(bId, x, y) => {
          const ok = onPlace(bId, x, y);
          if (ok) {
            simRef.current.flowDirty = true;
          }
          return ok;
        }}
        onMoveBuilding={(uid, toX, toY) => {
          const ok = onMove(uid, toX, toY);
          if (ok) {
            simRef.current.flowDirty = true;
          }
          return ok;
        }}
        onDemolishBuilding={handleDemolishBuilding}
        onOpenBuildingFacility={handleOpenBuildingFacility}
        onPaintTerrainTile={handlePaintTerrainTile}
        buildingBubbles={buildingBubbles}
        onHarvestBubble={triggerPopHarvest}
        onSelectResident={handleSelectResident}
      />

      {/* 3. Resident / Dedicated Class NPC Conversation Dialog (Fixed Duplicate Render Bug & Real Blessing!) */}
      {talkingAgent && !buildMode && (
        <div
          role="dialog"
          aria-label={`${talkingAgent.label} 대화창`}
          className="pixel-frame space-y-2 border-primary bg-card p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {/* Avatar Box: Always renders the character/NPC sprite image ONLY (never the text block!) */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-foreground bg-background">
                {talkingAgent.kind === 'class_npc' ? (
                  <img
                    src={mercImg}
                    alt={talkingAgent.classNpc?.name ?? talkingAgent.label}
                    className="pixelated h-10 w-auto object-contain"
                  />
                ) : talkingAgent.kind === 'tribe' || talkingAgent.kind === 'extra' ? (
                  <TribeSprite
                    action="walk"
                    tribeClass={talkingAgent.tribeClass}
                    height={38}
                    showBadge={false}
                  />
                ) : talkingAgent.kind === 'shaman' ? (
                  <img src={shamanImg} alt="주술사" className="pixelated h-10 w-auto object-contain" />
                ) : (
                  <PetSprite
                    speciesId={talkingAgent.speciesId ?? 'baby_raptor'}
                    name={talkingAgent.label}
                    height={34}
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <b className="text-sm">{talkingAgent.label}</b>
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {talkingAgent.role === 'wall_patrol' || talkingAgent.role === 'archer_guard'
                      ? '🛡️ 성벽 방어 보초'
                      : talkingAgent.role === 'hauler'
                        ? '🪵 물류 운반 짐꾼'
                        : talkingAgent.role === 'shelter_rest'
                          ? '⛺ 쉼터 휴식'
                          : talkingAgent.role === 'class_npc'
                            ? '⚡ 전속 마스터 NPC'
                            : '🔥 모닥불 담소'}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {talkingAgent.carrying
                    ? `${talkingAgent.carrying.icon} ${talkingAgent.carrying.label} 창고로 운반 중`
                    : (talkingAgent.bubble ?? '족장님의 손길에 반갑게 반응하며 마을을 지키고 있습니다!')}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="대화창 닫기"
              onClick={() => setTalkingAgent(null)}
              className="pixel-btn bg-background p-1"
            >
              <X className="!h-4 !w-4" />
            </button>
          </div>

          {talkingAgent.kind === 'class_npc' ? (
            <div className="space-y-2 text-xs">
              <div className="pixel-box bg-background p-2.5 space-y-1.5 border border-amber-500/50">
                <div className="flex items-center justify-between font-bold text-amber-500">
                  <span>
                    ⚡ 전속 NPC: {talkingAgent.classNpc?.name} ({talkingAgent.classNpc?.role})
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  "{talkingAgent.classNpc?.dialogue}"
                </p>
                <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-800/40 leading-snug">
                  🎁 <b>축복 효과:</b> {talkingAgent.classNpc?.tapRewardDesc} (5분간 주민 물류 속도 +25%, 방어력 상승 및 파손 성벽 35% 즉시 수리)
                </div>
              </div>
              <div className="flex justify-end gap-1.5">
                <Button
                  size="sm"
                  onClick={() => handleClaimNpcBlessing(talkingAgent.classNpc?.name)}
                  className="pixel-btn bg-amber-400 text-black hover:bg-amber-300 font-bold text-xs"
                >
                  ✨ 축복 받기
                </Button>
              </div>
            </div>
          ) : talkingAgent.kind === 'tribe' || talkingAgent.kind === 'extra' ? (
            (() => {
              const isAmbacho = talkingAgent.label.includes('암바초');
              const dlg = isAmbacho
                ? {
                    heroPrompt: '암바초, 오늘 마을 물류는 잘 돌아가나?',
                    npcReply:
                      '"암바초: 족장님! 벌목장이랑 제련소에서 나온 재료들 창고로 열심히 나르고 있슴다! 오솔길 깔아주셔서 발이 날아다님다!"',
                  }
                : getTribeDialogueLines(
                    talkingAgent.tribeClass ?? DEFAULT_TRIBE_CLASS,
                    playerLevel,
                    languageLearned
                  );
              return (
                <div className="space-y-1.5 text-xs">
                  <div className="pixel-box bg-background p-2">
                    <b className="text-primary">나 (족장 Lv.{playerLevel}): </b>
                    <span>"{dlg.heroPrompt}"</span>
                  </div>
                  <div className="pixel-box bg-accent/15 p-2">
                    <b>{talkingAgent.label}: </b>
                    <span>{dlg.npcReply}</span>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="pixel-box bg-accent/15 p-2 text-xs">
              <b>{talkingAgent.label}: </b>
              <span>"크르릉~ ♥" (모닥불 곁에서 기분 좋게 꼬리를 흔들며 경계를 서고 있습니다.)</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Bottom 4-Tab Toolbar (건설·개간 / 시설·공방 / 부족·물류 / 방어·일지) */}
      <BuildToolbar
        activeTab={bottomTab}
        onSelectTab={setBottomTab}
        buildMode={buildMode}
        onToggleBuildMode={on => {
          setBuildMode(on);
          if (!on) {
            setGhostTile(null);
            setTerrainTool('none');
          }
        }}
        catFilter={catFilter}
        onSelectCatFilter={setCatFilter}
        selectedBuildId={selectedBuildId}
        onSelectBuildId={id => {
          setSelectedBuildId(id);
          setTerrainTool('none');
          setSelectedPlacedUid(null);
        }}
        onInspectBuilding={setInspectBuildingDef}
        lineDragMode={lineDragMode}
        onToggleLineDragMode={() => setLineDragMode(v => !v)}
        terrainTool={terrainTool}
        onSelectTerrainTool={setTerrainTool}
        vState={vState}
        baseLevel={baseLevel}
        ownedPool={ownedPool}
        shamanSkills={vState.shamanSkills}
        spoiledCount={spoiledCount}
        questAlert={questAlert}
      >
        <FacilityDrawer
          activeTab={bottomTab}
          onOpenModal={(modal, intentTab) => {
            if (intentTab) setIntentCraftingTab(intentTab);
            setActiveModal(modal);
          }}
          spoiledCount={spoiledCount}
          questAlert={questAlert}
          residents={simRef.current.residents}
          hauledCountTotal={simRef.current.hauledCountTotal}
          needs={simRef.current.needs}
          onSelectResident={handleSelectResident}
          lastSiegeReport={simRef.current.lastSiegeReport}
          damagedWallCount={damagedWallCount}
          onRepairAllWalls={handleRepairAllWalls}
          onTriggerNightSiege={handleTriggerNightSiege}
        />
      </BuildToolbar>

      {/* Facility Info Popup for Non-Modal Buildings (With SimCity Adjacency Synergy Report!) */}
      {buildingPopup && !buildMode && (
        <div
          role="dialog"
          aria-label={`${VILLAGE_BUILDINGS[buildingPopup.buildingId].name} 기능 팝업`}
          className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/65 p-4 font-pixel text-xs"
          onClick={() => setBuildingPopup(null)}
        >
          <div
            className="pixel-frame w-full max-w-sm space-y-3 bg-background p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b-2 border-foreground pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-card text-xl">
                  {VILLAGE_BUILDINGS[buildingPopup.buildingId].icon}
                </span>
                <div>
                  <b className="text-sm">
                    {buildingPopup.customName ?? VILLAGE_BUILDINGS[buildingPopup.buildingId].name}
                  </b>
                  <p className="text-[10px] text-primary">
                    크기: {VILLAGE_BUILDINGS[buildingPopup.buildingId].footprintLabel} · 내구도{' '}
                    {simRef.current.buildingHpMap[buildingPopup.uid] ?? buildingPopup.hp}/
                    {buildingPopup.maxHp}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="시설 팝업 닫기"
                onClick={() => setBuildingPopup(null)}
                className="pixel-btn bg-card p-1.5"
              >
                <X className="!h-4 !w-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {buildingPopup.customDesc ?? VILLAGE_BUILDINGS[buildingPopup.buildingId].desc}
            </p>

            {/* SimCity Adjacency Synergy Report */}
            {(() => {
              const syn = evaluateBuildingSynergy(
                buildingPopup.buildingId,
                buildingPopup.x,
                buildingPopup.y,
                vState.buildings,
                simRef.current.terrain,
                villageGridSize
              );
              return (
                <div className="rounded border border-emerald-500/40 bg-emerald-950/20 p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">🏙️ 입지·인접 시너지 효율</span>
                    <b className="text-emerald-300">{Math.round(syn.efficiencyMult * 100)}%</b>
                  </div>
                  {syn.tags.length > 0 ? (
                    <ul className="list-disc list-inside text-[11px] text-emerald-200/90 space-y-0.5">
                      {syn.tags.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      오솔길이나 연관 시설(숲·바위·창고·모닥불·토템) 근처에 배치하면 추가 시너지가 발동합니다.
                    </p>
                  )}
                </div>
              );
            })()}

            {buildingPopup.buildingId === 'custom_intent_building' && buildingPopup.customMechanics && (
              <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                <span className="text-[10px] font-bold text-amber-500 block">부여된 특수 메커닉:</span>
                <div className="flex flex-wrap gap-1">
                  {buildingPopup.customMechanics.map(tag => {
                    const meta = BUILDING_MECHANICS_META[tag as BuildingMechanicTag];
                    return (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-background/80 text-amber-400 border border-amber-500/40 font-bold"
                      >
                        {meta ? `${meta.icon} ${meta.name}` : tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {buildingPopup.buildingId === 'custom_intent_building' && (
                <Button
                  type="button"
                  onClick={() => {
                    setBuildingPopup(null);
                    setIntentCraftingTab('architecture');
                    setActiveModal('intent_crafting');
                  }}
                  className="pixel-btn min-h-10 flex-1 bg-amber-600 text-xs font-bold text-white hover:bg-amber-500"
                >
                  ✨ AI 의도 공방 열기
                </Button>
              )}
              {buildingPopup.buildingId === 'primitive_storage' && onOpenBaseTab && (
                <Button
                  type="button"
                  onClick={() => {
                    setBuildingPopup(null);
                    onOpenBaseTab('storage');
                  }}
                  className="pixel-btn min-h-10 flex-1 bg-primary text-xs font-bold text-primary-foreground"
                >
                  📦 창고 물품 관리 열기
                </Button>
              )}
              {buildingPopup.buildingId === 'expedition_barracks' && onOpenBaseTab && (
                <Button
                  type="button"
                  onClick={() => {
                    setBuildingPopup(null);
                    onOpenBaseTab('expedition');
                  }}
                  className="pixel-btn min-h-10 flex-1 bg-primary text-xs font-bold text-primary-foreground"
                >
                  ⚔️ 원정대 편성 · 파견 열기
                </Button>
              )}
              {buildingPopup.buildingId === 'tribe_shelter' && onOpenBaseTab && (
                <Button
                  type="button"
                  onClick={() => {
                    setBuildingPopup(null);
                    onOpenBaseTab('pets');
                  }}
                  className="pixel-btn min-h-10 flex-1 bg-primary text-xs font-bold text-primary-foreground"
                >
                  ⛺ 펫 · 부족민 휴식 관리
                </Button>
              )}
              {buildingPopup.buildingId === 'campfire' && (
                <>
                  <Button
                    type="button"
                    onClick={() => {
                      setBuildingPopup(null);
                      setActiveModal('smokehouse');
                    }}
                    className="pixel-btn min-h-10 flex-1 bg-primary text-xs font-bold text-primary-foreground"
                  >
                    ♨️ 훈연 보관소 열기
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setBuildingPopup(null);
                      setActiveModal('tavern');
                    }}
                    className="pixel-btn min-h-10 flex-1 text-xs font-bold"
                  >
                    🍖 원시 주막 요리
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDemolishBuilding(buildingPopup.uid)}
                className="pixel-btn min-h-10 px-3 text-xs font-bold gap-1"
              >
                <Trash2 className="!h-3.5 !w-3.5" />
                철거
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBuildingPopup(null)}
                className="pixel-btn min-h-10 px-3 text-xs"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Building Info (i) Modal */}
      {inspectBuildingDef && (
        <div
          role="dialog"
          aria-label={`${inspectBuildingDef.name} 상세 정보`}
          className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/65 p-4 text-xs font-pixel"
          onClick={() => setInspectBuildingDef(null)}
        >
          <div
            className="pixel-frame w-full max-w-sm space-y-3 bg-background p-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b-2 border-foreground pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-11 w-11 items-center justify-center border-2 border-foreground bg-card text-2xl">
                  {inspectBuildingDef.icon}
                </span>
                <div>
                  <b className="text-sm">{inspectBuildingDef.name}</b>
                  <p className="text-[10px] text-primary">
                    크기: {inspectBuildingDef.footprintLabel} · 내구도 {inspectBuildingDef.maxHp}
                    {inspectBuildingDef.maxCount ? ` · 최대 ${inspectBuildingDef.maxCount}채` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectBuildingDef(null)}
                className="pixel-btn bg-card p-1.5"
              >
                <X className="!h-4 !w-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {inspectBuildingDef.desc}
            </p>

            <div className="rounded border border-primary/30 bg-primary/10 p-2 text-xs">
              <span className="font-bold text-primary block mb-0.5">✨ 효과 및 입지 시너지</span>
              <p className="text-foreground">{inspectBuildingDef.effectLabel}</p>
            </div>

            <div className="space-y-1.5 rounded border border-border bg-card p-2 text-xs">
              <span className="font-bold text-foreground block">📦 필요 건설 재료</span>
              <div className="grid grid-cols-2 gap-1">
                {inspectBuildingDef.cost.map(c => {
                  const item = ITEMS[c.itemId];
                  const owned = countOf(ownedPool, c.itemId);
                  const ok = owned >= c.count;
                  return (
                    <div
                      key={c.itemId}
                      className={`flex items-center justify-between rounded px-2 py-1 text-[11px] border ${
                        ok ? 'border-border bg-background' : 'border-destructive/40 bg-destructive/10'
                      }`}
                    >
                      <span className="truncate">{item?.name ?? c.itemId}</span>
                      <span className={`font-mono font-bold shrink-0 ${ok ? 'text-emerald-600' : 'text-destructive'}`}>
                        {owned}/{c.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-1.5 pt-1">
              <Button
                type="button"
                disabled={baseLevel < inspectBuildingDef.unlockBaseLevel || !hasAll(ownedPool, inspectBuildingDef.cost)}
                onClick={() => {
                  setSelectedBuildId(inspectBuildingDef.id);
                  setSelectedPlacedUid(null);
                  setTerrainTool('none');
                  setBuildMode(true);
                  setBottomTab('build');
                  setInspectBuildingDef(null);
                  toast.success(`${inspectBuildingDef.name} 선택됨: 맵 타일을 탭해 유령 미리보기 후 확정하세요.`);
                }}
                className="pixel-btn min-h-10 flex-1 bg-primary text-xs font-bold text-primary-foreground"
              >
                🔨 이 건물 선택하여 배치
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInspectBuildingDef(null)}
                className="pixel-btn min-h-10 px-3 text-xs"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Facility Fullscreen Modals (Unified Single Entry Points) */}
      <ArchitectureWorkshopModal
        open={activeModal === 'workshop'}
        onClose={() => setActiveModal(null)}
        village={vState}
        baseLevel={baseLevel}
        hasAltar={hasAltar}
        storage={storage}
        backpack={backpack}
        onResearchBlueprint={id => (onResearchBlueprint ? onResearchBlueprint(id) : false)}
        onConstructBuilding={onPlace}
        onOpenShaman={() => setActiveModal('shaman')}
        onOpenIntentCrafting={() => {
          setIntentCraftingTab('architecture');
          setActiveModal('intent_crafting');
        }}
      />
      <PrimitiveArmoryModal
        open={activeModal === 'armory'}
        onClose={() => setActiveModal(null)}
        gear={gear}
        storage={storage}
        backpack={backpack}
        altar={hasAltar}
        onForgeSignatureWeapon={(itemId, cost) =>
          onForgeSignatureWeapon ? onForgeSignatureWeapon(itemId, cost) : false
        }
        onCraftAmmoBundle={(itemId, count, cost) =>
          onCraftAmmoBundle ? onCraftAmmoBundle(itemId, count, cost) : false
        }
        onInventWeapon={(inp, naming) => (onInvent ? onInvent(inp, naming) : null)}
        onEnhanceWeapon={uid => (onEnhanceWeapon ? onEnhanceWeapon(uid) : { ok: false, plus: 0 })}
        onOpenIntentCrafting={() => {
          setIntentCraftingTab('armory');
          setActiveModal('intent_crafting');
        }}
      />
      <AncientAltarModal
        open={activeModal === 'altar'}
        onClose={() => setActiveModal(null)}
        storage={storage}
        backpack={backpack}
        inventions={inventions}
        onDiscover={(inp, naming) => (onInvent ? onInvent(inp, naming) : null)}
      />
      <WanderingShamanModal
        open={activeModal === 'shaman'}
        onClose={() => setActiveModal(null)}
        shamanSkills={vState.shamanSkills}
        storage={storage}
        backpack={backpack}
        onTrainSkill={id => (onTrainShamanSkill ? onTrainShamanSkill(id) : false)}
        onOpenWorkshop={() => setActiveModal('workshop')}
        onOpenShamanQuest={() => setActiveModal('shaman_quest')}
        onOpenCivTech={() => setActiveModal('civ_tech')}
        onOpenCuisine={() => setActiveModal('cuisine')}
        questState={questState}
        canClaimQuest={canClaimQuest}
        onClaimQuest={onClaimQuest}
        shamanQuestAcceptedIndex={shamanQuestAcceptedIndex}
        onAcceptShamanQuest={onAcceptShamanQuest}
        languageQuestAccepted={languageQuestAccepted}
        languageLearned={languageLearned}
        onAcceptLanguageQuest={onAcceptLanguageQuest}
        onClaimLanguageQuest={onClaimLanguageQuest}
        onOpenObjectives={() => {
          setActiveModal(null);
          onOpenObjectives?.();
        }}
        onReplayTutorial={onReplayTutorial}
      />
      <ShamanQuestModal
        open={activeModal === 'shaman_quest'}
        onClose={() => setActiveModal(null)}
        shamanLevel={activeShamanLevel}
        shamanClass={canonicalClass}
        baseLevel={baseLevel}
        storage={storage}
        backpack={backpack}
        village={vState}
        pets={pets}
        expeditionDistanceM={expeditionDistanceM}
        onPerformRitual={targetLevel =>
          onPerformShamanRitual ? onPerformShamanRitual(targetLevel) : false
        }
        onOpenEvolutionModal={() => setActiveModal('shaman_evolution')}
        onOpenSkillsModal={() => setActiveModal('shaman')}
        onOpenWorkshop={() => setActiveModal('workshop')}
        onOpenCivTech={() => setActiveModal('civ_tech')}
      />
      <ShamanEvolutionModal
        open={activeModal === 'shaman_evolution'}
        onClose={() => setActiveModal(null)}
        currentClass={canonicalClass ?? 'NONE'}
        affinityState={affinityState}
        pets={pets}
        storage={storage}
        backpack={backpack}
        onSelectShamanClass={classId => (onEvolveShaman ? onEvolveShaman(classId) : false)}
        onEvolvePetToSkullDragon={petUid =>
          onEvolvePetToSkullDragon ? onEvolvePetToSkullDragon(petUid) : false
        }
      />
      <CivilizationTechModal
        open={activeModal === 'civ_tech'}
        onClose={() => setActiveModal(null)}
        playerLevel={playerLevel}
        researchedTechs={civilizationTechs}
        storage={storage}
        backpack={backpack}
        onResearchTech={techId =>
          onResearchCivilizationTech ? onResearchCivilizationTech(techId) : false
        }
        onOpenWorkshop={() => setActiveModal('workshop')}
      />
      <ShamanCuisineModal
        open={activeModal === 'cuisine'}
        onClose={() => setActiveModal(null)}
        storage={storage}
        backpack={backpack}
        permanentStats={permanentStats}
        activeBuffs={activeBuffs}
        cookingJobs={cookingJobs}
        onCookDish={recipeId => (onCookShamanDish ? onCookShamanDish(recipeId) : false)}
        onClaimCooking={jobId => (onClaimShamanCooking ? onClaimShamanCooking(jobId) : false)}
      />
      <SmokehouseTavernModal
        open={activeModal === 'smokehouse' || activeModal === 'tavern' ? activeModal : null}
        onClose={() => setActiveModal(null)}
        onSwitchTab={tab => setActiveModal(tab)}
        storage={storage}
        backpack={backpack}
        freshnessPct={freshnessPct}
        smokeBatches={smokeBatches}
        now={nowTick}
        onStartSmokeBatch={(id, cnt) => (onStartSmokeBatch ? onStartSmokeBatch(id, cnt) : false)}
        onInstantSmoke={(id, kind) => (onInstantSmoke ? onInstantSmoke(id, kind) : false)}
        onClaimSmokeBatch={id => (onClaimSmokeBatch ? onClaimSmokeBatch(id) : false)}
        onDiscardSpoiled={() => onDiscardSpoiled?.()}
        onCookTavernRecipe={id => (onCookTavernRecipe ? onCookTavernRecipe(id) : false)}
        onEatDish={id => onEatDish?.(id)}
      />
      <TribalHallModal
        open={activeModal === 'tribal_hall'}
        onClose={() => setActiveModal(null)}
        tribe={tribe}
        storage={storage}
        backpack={backpack}
        playerLevel={playerLevel}
        languageLearned={languageLearned}
        onHireTribe={onHireTribe}
        onSelectTribeClass={onSelectTribeClass}
        onTrainTribe={onTrainTribe}
        onTreatTribe={onTreatTribe}
        onToggleEscort={onToggleEscort}
        onOpenExpedition={() => {
          setActiveModal(null);
          onOpenBaseTab?.('expedition');
        }}
      />
      <IntentCraftingModal
        open={activeModal === 'intent_crafting'}
        onClose={() => setActiveModal(null)}
        initialMode={intentCraftingTab}
        storage={storage}
        backpack={backpack}
        village={village}
        baseLevel={baseLevel}
        onConstructCustomBuilding={params =>
          onPlaceCustomBuilding ? onPlaceCustomBuilding(params) : false
        }
        onCraftCustomGear={params => (onCraftCustomGear ? onCraftCustomGear(params) : false)}
      />
    </div>
  );
}
