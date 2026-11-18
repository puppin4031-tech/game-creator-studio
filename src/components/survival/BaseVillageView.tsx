import { useEffect, useMemo, useRef, useState } from 'react';
import { Hammer, Lock, MessageSquare, Rotate3d, ShieldCheck, Sparkles, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildingAtTile,
  buildingFootprintCells,
  computeBuildingHarvestBubble,
  computeVillageBonuses,
  computeVillagePopulationCapacity,
  ensureVillageState,
  isArtisanUnlocked,
  VILLAGE_BUILDING_LIST,
  VILLAGE_BUILDINGS,
  VILLAGE_GRID_SIZE,
  VILLAGE_SPAWN_MARGIN,
  VILLAGE_TOTAL_GRID_SIZE,
  wallConnections,
  type PlacedVillageBuilding,
  type ShamanSkillId,
  type VillageBuildingId,
  type VillageState,
} from '@/lib/survival/village';
import { countSpoiledFood, type SmokehouseBatch } from '@/lib/survival/culinary';
import { getSpeechStageInfo, type QuestState } from '@/lib/survival/quests';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import { hasAll, addStacks } from '@/lib/survival/inventory';
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
import ShamanEvolutionModal from './ShamanEvolutionModal';
import { type ShamanClassId, type ShamanLevel, SHAMAN_CLASSES } from '@/lib/survival/shamanEvolution';
import SmokehouseTavernModal from './SmokehouseTavernModal';
import TribalHallModal from './TribalHallModal';
import CulinaryDishIcon from './CulinaryDishIcon';
import campfireImg from '@/assets/survival/base-campfire.png';
import hutImg from '@/assets/survival/base-hut.png';
import caveImg from '@/assets/survival/base-cave.png';
import outpostImg from '@/assets/survival/base-outpost.png';
import altarImg from '@/assets/survival/dolmen-shrine.png';
import shamanImg from '@/assets/survival/npc-shaman.png';
import mercImg from '@/assets/survival/npc-mercenary.png';
import tribalHallImg from '@/assets/survival/base-tribal-hall.png';
import baseVillageBg from '@/assets/survival/base-village-bg.png';
import IntentCraftingModal, { type CraftingMode } from './IntentCraftingModal';
import {
  BUILDING_MECHANICS_META,
  GEAR_MECHANICS_META,
  type BuildingMechanicTag,
  type GearMechanicTag,
  type PhysicalAttributes,
} from '@/lib/survival/intentCrafting';

type FacilityModalKind =
  | 'workshop'
  | 'armory'
  | 'altar'
  | 'shaman'
  | 'shaman_quest'
  | 'shaman_evolution'
  | 'smokehouse'
  | 'tavern'
  | 'tribal_hall'
  | 'intent_crafting'
  | null;

interface Props {
  village: VillageState | undefined;
  baseLevel: 1 | 2 | 3;
  playerLevel?: number;
  shamanLevel?: ShamanLevel;
  shamanClass?: ShamanClassId | null;
  expeditionDistanceM?: number;
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
}

type AgentRole = 'campfire_social' | 'shelter_rest' | 'wall_patrol' | 'hauler' | 'shaman';

interface LivingAgent {
  id: string;
  kind: 'tribe' | 'pet' | 'shaman' | 'extra' | 'hall';
  role: AgentRole;
  label: string;
  x: number;
  y: number;
  facing: 1 | -1;
  moving: boolean;
  insideShelter?: boolean;
  jumpTick?: number;
  carryingIcon?: string;
  bubble: string | null;
  restTicks: number;
  /** Individual next decision timestamp so each resident moves asynchronously */
  nextMoveAt: number;
  /** Individual movement transition duration (ms) for organic slow strolling */
  moveDurationMs: number;
  tribeClass?: TribeClassId;
  speciesId?: string;
}

interface PopFloat {
  id: string;
  x: number;
  y: number;
  text: string;
}

const TOUCH_GREETINGS_SPEAK = [
  '♥ 족장님! 오늘 공룡 사냥 나가십니까?',
  '💦 성벽 나무를 더 단단히 손질해 두었습니다!',
  '🍖 주막에서 끓이는 뼈 스튜 냄새가 끝내줍니다!',
  '♥ 족장님이 지어주신 마을이 제일 따뜻합니다!',
  '🛡️ 밤에 랩터가 와도 저희가 완벽히 막아내겠습니다!',
];

const TOUCH_GREETINGS_PRIMITIVE = [
  '♥ 우우! (족장님을 반기며 껑충 뛴다!)',
  '💦 우우우! (든든하게 가슴을 두드린다!)',
  '🍖 우우~ ♥ (모닥불 고기를 가리키며 웃는다!)',
];

function getTribeDialogueLines(
  classId: TribeClassId,
  playerLevel: number,
  languageLearned: boolean
): { heroPrompt: string; npcReply: string; statusHint: string } {
  const cls = getTribeClass(classId);
  if (playerLevel < 5 && !languageLearned) {
    return {
      heroPrompt: '우우… 우우?! (손짓으로 안부를 묻는다)',
      npcReply: `"우우! 크르르… ♥" (${cls.name} 용병이 가슴을 두드리며 든든하게 고개를 끄덕입니다. Lv.5에 주술사에게 언어를 배우면 말을 나눌 수 있습니다.)`,
      statusHint: '원시 몸짓 의사소통 단계 (Lv.5 언어 학습 전)',
    };
  }
  if (!languageLearned && playerLevel >= 5) {
    return {
      heroPrompt: '우우… 나… 말… 배우고 싶어…',
      npcReply: `"우우! 저기 🔮떠돌이 주술사 천막으로 가 보게!" (${cls.name} 용병이 주술사의 천막을 가리킵니다.)`,
      statusHint: '떠돌이 주술사에게 언어 학습 퀘스트를 완료해 보세요!',
    };
  }
  switch (classId) {
    case 'tank':
      return {
        heroPrompt: '거인 부족 전사여, 마을 방어는 든든한가?',
        npcReply: '"족장님! 성벽 안쪽 순찰 경로를 돌며 보초를 서고 있습니다! 어떤 공룡도 우리 성벽을 넘지 못합니다!"',
        statusHint: '🛡️ 거인 부족 · 성벽 순찰 보초 & 피해 감소 활성화',
      };
    case 'gatherer':
      return {
        heroPrompt: '오늘 숲에서 거둔 자원은 어떠한가?',
        npcReply: '"족장님! 창고와 오두막을 오가며 나뭇가지와 고기를 나르고 있습니다. 건물 지붕 위의 수확 풍선도 꼭 터뜨려 챙기세요!"',
        statusHint: '🎒 파밍 부족 · 자동 채집 및 적재량 +30% 활성화',
      };
    case 'ranged':
      return {
        heroPrompt: '활시위와 투창의 상태는 괜찮은가?',
        npcReply: '"바람이 좋습니다, 족장님! 성벽 바로 안쪽에서 침입자를 30m 밖부터 안전하게 요격할 준비가 끝났습니다!"',
        statusHint: '🏹 원거리 부족 · 성벽 너머 30m 원거리 방어 사격',
      };
    case 'assassin':
      return {
        heroPrompt: '뼈 단검의 날이 매섭게 빛나는군.',
        npcReply: '"주막의 향신료 고기 구이를 먹고 힘이 넘칩니다! 누구보다 빠르게 적의 급소를 두 번씩 베어 넘기겠습니다!"',
        statusHint: '⚡ 스피드 딜러 · 공격 속도 2배 및 치명타 특화',
      };
  }
}

function BuildingGraphic({
  b,
  state,
}: {
  b: PlacedVillageBuilding;
  state: VillageState;
}) {
  const def = VILLAGE_BUILDINGS[b.buildingId];
  if (def.connectsWall) {
    const conn = wallConnections(state, b.x, b.y);
    const stroke =
      b.buildingId === 'marble_wall'
        ? '#0f766e'
        : b.buildingId === 'granite_wall'
          ? '#44403c'
          : b.buildingId === 'stone_wall'
            ? '#78716c'
            : b.buildingId === 'log_palisade'
              ? '#78350f'
              : b.buildingId === 'wood_pillar'
                ? '#92400e'
                : '#a16207';
    const fill =
      b.buildingId === 'marble_wall'
        ? '#f5f5f4'
        : b.buildingId === 'granite_wall'
          ? '#a8a29e'
          : b.buildingId === 'stone_wall'
            ? '#d6d3d1'
            : b.buildingId === 'log_palisade'
              ? '#b45309'
              : b.buildingId === 'wood_pillar'
                ? '#d97706'
                : '#ca8a04';
    return (
      <svg viewBox="0 0 32 32" className="h-full w-full" shapeRendering="crispEdges" aria-hidden>
        {conn.n && <rect x="12" y="0" width="8" height="16" fill={fill} stroke={stroke} strokeWidth="2" />}
        {conn.s && <rect x="12" y="16" width="8" height="16" fill={fill} stroke={stroke} strokeWidth="2" />}
        {conn.w && <rect x="0" y="12" width="16" height="8" fill={fill} stroke={stroke} strokeWidth="2" />}
        {conn.e && <rect x="16" y="12" width="16" height="8" fill={fill} stroke={stroke} strokeWidth="2" />}
        <rect
          x={b.buildingId === 'wood_pillar' ? 8 : 9}
          y={b.buildingId === 'wood_pillar' ? 6 : 8}
          width={b.buildingId === 'wood_pillar' ? 16 : 14}
          height={b.buildingId === 'wood_pillar' ? 20 : 16}
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
        />
        {(b.buildingId === 'stone_wall' || b.buildingId === 'granite_wall' || b.buildingId === 'marble_wall') && (
          <path d="M10 14h12M14 9v5M18 14v6" stroke={stroke} strokeWidth="1.5" />
        )}
      </svg>
    );
  }

  switch (b.buildingId) {
    case 'campfire':
      return (
        <div className="relative flex flex-col items-center justify-center">
          <div className="pointer-events-none absolute h-12 w-12 rounded-full bg-amber-400/35 blur-md animate-pulse" />
          <img
            src={campfireImg}
            alt=""
            className="pixelated h-11 w-11 object-contain drop-shadow-[0_0_10px_rgba(251,146,60,0.95)]"
          />
        </div>
      );
    case 'brazier':
      return (
        <div className="relative flex items-center justify-center gap-0.5">
          <img src={campfireImg} alt="" className="pixelated h-7 w-7 object-contain brightness-110 hue-rotate-15" />
          <span className="text-xs">🍖</span>
        </div>
      );
    case 'torch':
      return (
        <div className="flex items-center justify-center gap-1">
          <span className="animate-pulse text-sm leading-none drop-shadow-[0_0_8px_rgba(250,204,21,0.95)]">🕯️</span>
          <span className="animate-pulse text-sm leading-none drop-shadow-[0_0_8px_rgba(250,204,21,0.95)]">🕯️</span>
        </div>
      );
    case 'primitive_storage':
      return <img src={outpostImg} alt="" className="pixelated h-11 w-11 object-contain drop-shadow" />;
    case 'lumber_hut':
      return (
        <div className="relative flex items-center justify-center">
          <img src={outpostImg} alt="" className="pixelated h-10 w-10 object-contain hue-rotate-15" />
          <span className="absolute -right-1 -top-1 text-xs">🪓</span>
        </div>
      );
    case 'smokehouse':
      return (
        <div className="relative flex items-center justify-center">
          <img src={hutImg} alt="" className="pixelated h-11 w-11 object-contain contrast-125 sepia-[0.3]" />
          <span className="absolute -top-2 animate-bounce text-xs">♨️</span>
        </div>
      );
    case 'primitive_tavern':
      return (
        <div className="relative flex items-center justify-center">
          <img src={hutImg} alt="" className="pixelated h-12 w-12 object-contain brightness-105 saturate-150" />
          <div className="absolute -right-1 -top-1 rounded-full bg-card p-0.5 shadow">
            <CulinaryDishIcon itemId="bone_stew" size={16} />
          </div>
        </div>
      );
    case 'tribe_shelter':
      return <img src={hutImg} alt="" className="pixelated h-12 w-12 object-contain drop-shadow" />;
    case 'expedition_barracks':
      return (
        <div className="relative flex items-center justify-center gap-1">
          <img src={hutImg} alt="" className="pixelated h-11 w-11 object-contain" />
          <img src={mercImg} alt="" className="pixelated h-9 w-9 object-contain" />
          <span className="absolute -right-1 -top-1 text-xs">⚔️</span>
        </div>
      );
    case 'build_workshop':
      return (
        <div className="relative flex items-center justify-center">
          <img src={hutImg} alt="" className="pixelated h-11 w-11 object-contain saturate-150" />
          <span className="absolute -right-1 -top-1 text-xs">🔨</span>
        </div>
      );
    case 'stone_smeltery':
      return (
        <div className="relative flex items-center justify-center">
          <img src={caveImg} alt="" className="pixelated h-12 w-14 object-contain" />
          <span className="absolute -right-1 -top-1 text-xs">⚒️</span>
        </div>
      );
    case 'ancient_altar':
      return (
        <img
          src={altarImg}
          alt=""
          className="pixelated h-13 w-14 object-contain drop-shadow-[0_0_8px_hsl(var(--sacred))]"
        />
      );
    case 'tribal_hall':
      return (
        <div className="relative flex h-full w-full items-center justify-center p-0.5">
          <img
            src={tribalHallImg}
            alt="부족회관"
            className="pixelated h-full w-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
          />
        </div>
      );
    case 'wandering_shaman':
    case 'shaman_tent': {
      const cls = state.shamanClass;
      const classMeta = cls ? SHAMAN_CLASSES[cls] : null;
      return (
        <div className="relative flex h-full w-full items-center justify-center p-0.5">
          <img
            src={shamanImg}
            alt="떠돌이 주술사"
            className={`pixelated h-full w-full object-contain ${
              cls === 'warlock'
                ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]'
                : cls === 'mage'
                  ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.9)]'
                  : cls === 'engineer'
                    ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]'
                    : cls === 'orthodox'
                      ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.9)]'
                      : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]'
            }`}
          />
          {classMeta ? (
            <span
              className={`absolute -bottom-1 -right-1 rounded-full border px-1 py-0.2 text-[9px] font-bold shadow ${classMeta.badgeBg}`}
              title={classMeta.name}
            >
              {classMeta.icon}
            </span>
          ) : (
            <span className="absolute -right-0.5 -top-0.5 animate-bounce rounded bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow">
              !
            </span>
          )}
        </div>
      );
    }
    case 'golden_totem':
      return (
        <div className="flex flex-col items-center justify-center">
          <span className="text-lg leading-none drop-shadow-[0_0_8px_#facc15]">🌞</span>
          <span className="-mt-1 text-xl leading-none drop-shadow-[0_0_6px_#eab308]">🗿</span>
        </div>
      );
    case 'rex_skull':
      return (
        <div className="flex items-center justify-center">
          <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">🦖🦴</span>
        </div>
      );
    case 'flower_bed':
      return (
        <div className="flex items-center justify-center gap-0.5 text-sm">
          <span>🌺</span>
          <span>🌼</span>
          <span>🌿</span>
        </div>
      );
    case 'custom_intent_building': {
      const isTower = b.customCategory === 'tower';
      const isFence = b.customCategory === 'fence';
      const icon = isTower ? '🏹' : isFence ? '🛡️' : '🏛️';
      return (
        <div className="relative flex flex-col items-center justify-center p-0.5 text-center">
          <div className="flex items-center justify-center text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            <span>{icon}</span>
          </div>
          <span className="truncate max-w-[44px] text-[8px] font-bold text-amber-300 drop-shadow">
            {b.customName?.slice(0, 4) ?? '특수시설'}
          </span>
        </div>
      );
    }
    default:
      return <span className="text-base">{def.icon}</span>;
  }
}

export default function BaseVillageView({
  village,
  baseLevel,
  playerLevel = 1,
  shamanLevel = 1,
  shamanClass = null,
  expeditionDistanceM = 0,
  languageLearned = false,
  languageQuestAccepted = false,
  shamanQuestAcceptedIndex,
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
}: Props) {
  const vState = useMemo(() => ensureVillageState(village, hasAltar), [village, hasAltar]);
  const bonuses = useMemo(() => computeVillageBonuses(vState), [vState]);
  const popCap = useMemo(
    () => computeVillagePopulationCapacity(vState, baseLevel, playerLevel),
    [vState, baseLevel, playerLevel]
  );
  const ownedPool = useMemo(() => addStacks(storage, backpack), [storage, backpack]);
  const spoiledCount = useMemo(
    () => countSpoiledFood(backpack, storage),
    [backpack, storage]
  );
  const speechInfo = useMemo(
    () => getSpeechStageInfo(playerLevel, languageLearned),
    [playerLevel, languageLearned]
  );

  const [buildMode, setBuildMode] = useState(false);
  const [isoView, setIsoView] = useState(true);
  const [zoom, setZoom] = useState<number>(1);
  const pinchDistRef = useRef<number | null>(null);
  const clampZoom = (v: number) => Math.round(Math.max(0.75, Math.min(2.2, v)) * 100) / 100;
  const [catFilter, setCatFilter] = useState<'all' | 'wall' | 'facility' | 'decor'>('all');
  const [selectedBuildId, setSelectedBuildId] = useState<VillageBuildingId>('branch_fence');
  const [selectedPlacedUid, setSelectedPlacedUid] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<FacilityModalKind>(null);
  const [intentCraftingTab, setIntentCraftingTab] = useState<CraftingMode>('architecture');
  const [talkingAgent, setTalkingAgent] = useState<LivingAgent | null>(null);
  const [buildingPopup, setBuildingPopup] = useState<PlacedVillageBuilding | null>(null);
  const [popFloats, setPopFloats] = useState<PopFloat[]>([]);
  const [showDefenseReport, setShowDefenseReport] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const swipingHarvestRef = useRef(false);

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);

  const selectedPlaced = vState.buildings.find(b => b.uid === selectedPlacedUid) ?? null;

  const modalForBuilding = (buildingId: VillageBuildingId): FacilityModalKind => {
    if (
      buildingId === 'build_workshop' ||
      buildingId === 'wood_pillar' ||
      buildingId === 'branch_fence' ||
      buildingId === 'log_palisade' ||
      buildingId === 'stone_wall' ||
      buildingId === 'granite_wall' ||
      buildingId === 'marble_wall'
    ) {
      return 'workshop';
    }
    if (buildingId === 'stone_smeltery' || buildingId === 'brazier') return 'armory';
    if (buildingId === 'ancient_altar') return 'altar';
    if (buildingId === 'shaman_tent' || buildingId === 'wandering_shaman') return 'shaman_quest';
    if (buildingId === 'tribal_hall') return 'tribal_hall';
    if (buildingId === 'smokehouse') return 'smokehouse';
    if (buildingId === 'primitive_tavern') return 'tavern';
    return null;
  };

  // Compute ready harvest bubbles per building (Supercell-style roof bubbles)
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
      const floatId = `${b.uid}-${Date.now()}`;
      setPopFloats(prev => [
        ...prev,
        {
          id: floatId,
          x: b.x,
          y: b.y,
          text: `${bub.icon} +${got.count}`,
        },
      ]);
      window.setTimeout(() => {
        setPopFloats(prev => prev.filter(f => f.id !== floatId));
      }, 1100);
    }
  };

  // Build Living Agents with Role-Playing Routines (0-byte server load, pure client AI)
  // Scales with base level & building count: combat mercenaries + ambient extra villagers (haulers) + pets + tribal hall NPC
  const desiredAgents = useMemo(() => {
    const list: Omit<
      LivingAgent,
      'x' | 'y' | 'facing' | 'moving' | 'bubble' | 'restTicks' | 'nextMoveAt' | 'moveDurationMs'
    >[] = [
      {
        id: 'npc-hall',
        kind: 'hall',
        role: 'campfire_social',
        label: '부족회관',
      },
    ];
    const rawTribeCount = tribe?.count ?? 0;
    // Only display mercenaries that have actually been hired / recruited.
    const tribeCount = Math.min(popCap.maxTribeCapacity, rawTribeCount);
    const activeClass = tribe?.classId ?? DEFAULT_TRIBE_CLASS;
    const classPool: TribeClassId[] = [];
    if (tribe?.classCounts) {
      for (const c of TRIBE_CLASS_LIST) {
        const n = tribe.classCounts[c.id] ?? 0;
        for (let i = 0; i < n; i++) classPool.push(c.id);
      }
    }
    const fallbackClasses: TribeClassId[] = ['tank', 'gatherer', 'ranged', 'assassin'];
    for (let i = 0; i < tribeCount; i++) {
      const cid = classPool[i] ?? (i === 0 ? activeClass : fallbackClasses[i % fallbackClasses.length]);
      const cls = getTribeClass(cid);
      const isAmbacho = i === 0 && cid === 'gatherer';
      const role: AgentRole =
        cid === 'tank' || cid === 'ranged'
          ? 'wall_patrol'
          : cid === 'gatherer'
            ? 'hauler'
            : i % 2 === 0
              ? 'campfire_social'
              : 'shelter_rest';
      list.push({
        id: `tribe-${i}`,
        kind: 'tribe',
        role,
        label: isAmbacho ? '충성된 암바초 (파밍)' : `${cls.name} ${i + 1}`,
        tribeClass: cid,
        carryingIcon: cid === 'gatherer' ? (i % 2 === 0 ? '🪵' : '🪨') : undefined,
      });
    }

    // Visual-only extra villagers (haulers / campfire socializers) proportional to village development
    for (let e = 0; e < popCap.ambientExtraCount; e++) {
      const isHauler = e % 2 === 0;
      list.push({
        id: `extra-${e}`,
        kind: 'extra',
        role: isHauler ? 'hauler' : 'campfire_social',
        label: isHauler ? `마을 짐꾼 ${e + 1}` : `마을 주민 ${e + 1}`,
        tribeClass: isHauler ? 'gatherer' : 'assassin',
        carryingIcon: isHauler ? (e % 3 === 0 ? '🪵' : e % 3 === 1 ? '🪨' : '🍖') : undefined,
      });
    }

    const guardPets = [
      ...pets.filter(p => p.deployed || p.role === 'guard'),
      ...pets.filter(p => !p.deployed && p.role !== 'guard'),
    ].slice(0, 3);
    for (let pi = 0; pi < guardPets.length; pi++) {
      const pet = guardPets[pi];
      list.push({
        id: `pet-${pet.uid}`,
        kind: 'pet',
        role: pi === 0 ? 'shelter_rest' : 'campfire_social',
        label: pet.name,
        speciesId: pet.speciesId,
      });
    }
    return list;
  }, [tribe?.count, tribe?.classId, tribe?.classCounts, pets, popCap]);

  const [agents, setAgents] = useState<LivingAgent[]>([]);

  const occupiedTileSet = useMemo(() => {
    const set = new Set<string>();
    for (const b of vState.buildings) {
      for (const c of buildingFootprintCells(b.buildingId, b.x, b.y)) {
        set.add(`${c.x},${c.y}`);
      }
    }
    return set;
  }, [vState.buildings]);

  useEffect(() => {
    setAgents(prev => {
      const emptyTiles: { x: number; y: number }[] = [];
      for (let y = 1; y < VILLAGE_GRID_SIZE - 1; y++) {
        for (let x = 1; x < VILLAGE_GRID_SIZE - 1; x++) {
          if (!occupiedTileSet.has(`${x},${y}`)) emptyTiles.push({ x, y });
        }
      }
      if (!emptyTiles.length) emptyTiles.push({ x: 0, y: 0 });
      const now = Date.now();
      return desiredAgents.map((d, idx) => {
        const existing = prev.find(p => p.id === d.id);
        if (existing) {
          return { ...existing, ...d };
        }
        const spawn = emptyTiles[(idx * 5 + 2) % emptyTiles.length];
        // Stagger each agent's initial move time and give slight fractional offset so nobody moves simultaneously
        const jitterX = ((idx * 17) % 5 - 2) * 0.12;
        const jitterY = ((idx * 23) % 5 - 2) * 0.12;
        return {
          ...d,
          x: Math.max(0.5, Math.min(VILLAGE_GRID_SIZE - 1.5, spawn.x + jitterX)),
          y: Math.max(0.5, Math.min(VILLAGE_GRID_SIZE - 1.5, spawn.y + jitterY)),
          facing: idx % 2 === 0 ? 1 : -1,
          moving: false,
          insideShelter: false,
          bubble: null,
          restTicks: 0,
          nextMoveAt: now + 300 + ((idx * 430) % 2100),
          moveDurationMs: 1600 + ((idx * 370) % 1300),
        };
      });
    });
  }, [desiredAgents, occupiedTileSet]);

  // Organic Asynchronous AI Loop: Each resident decides & strolls on their own independent timer
  // with smooth sub-tile coordinates (0.35~0.85 tile steps) instead of rigid 1-tile synchronous grid jumps.
  useEffect(() => {
    if (!agents.length) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setAgents(prev => {
        const campfires = vState.buildings.filter(
          b => b.buildingId === 'campfire' || b.buildingId === 'brazier' || b.buildingId === 'primitive_tavern'
        );
        const shelters = vState.buildings.filter(b => b.buildingId === 'tribe_shelter' || b.buildingId === 'campfire');
        const walls = vState.buildings.filter(b => VILLAGE_BUILDINGS[b.buildingId]?.category === 'wall');
        const storages = vState.buildings.filter(b => b.buildingId === 'primitive_storage');
        const workSpots = vState.buildings.filter(
          b =>
            b.buildingId === 'lumber_hut' ||
            b.buildingId === 'stone_smeltery' ||
            b.buildingId === 'build_workshop' ||
            b.buildingId === 'smokehouse'
        );

        return prev.map((ag, idx) => {
          // Wait until this individual agent's nextMoveAt arrives
          if (now < ag.nextMoveAt) return ag;

          const nextCadence = 1500 + Math.floor(Math.random() * 1600); // 1.5s ~ 3.1s per individual

          if (ag.restTicks > 0) {
            const exitingShelter = ag.insideShelter && ag.restTicks === 1;
            const clearBubble = ag.jumpTick ? now - ag.jumpTick > 2500 : true;
            return {
              ...ag,
              moving: false,
              insideShelter: exitingShelter ? false : ag.insideShelter,
              restTicks: ag.restTicks - 1,
              nextMoveAt: now + nextCadence,
              bubble: clearBubble ? null : ag.bubble,
            };
          }

          // Determine role-based destination coordinate
          let targetPos: { x: number; y: number } | null = null;
          if (ag.role === 'campfire_social' && campfires.length) {
            const cf = campfires[idx % campfires.length];
            targetPos = { x: cf.x + (idx % 2 === 0 ? -0.7 : 2.1), y: cf.y + 0.8 };
          } else if (ag.role === 'shelter_rest' && shelters.length) {
            const sh = shelters[idx % shelters.length];
            targetPos = { x: sh.x + 0.5, y: sh.y + 2.0 };
          } else if (ag.role === 'wall_patrol' && walls.length) {
            const w = walls[(Math.floor(now / 5000) + idx * 3) % walls.length];
            targetPos = { x: Math.max(0.8, Math.min(10.2, w.x)), y: Math.max(0.8, Math.min(10.2, w.y)) };
          } else if (ag.role === 'hauler' && storages.length && workSpots.length) {
            const toStorage = Math.floor(now / 7000 + idx) % 2 === 0;
            const dest = toStorage ? storages[0] : workSpots[idx % workSpots.length];
            targetPos = { x: dest.x + 0.4, y: dest.y + 1.2 };
          }

          // Check if reached role target to perform role action quietly (no text spam)
          if (targetPos && Math.hypot(targetPos.x - ag.x, targetPos.y - ag.y) <= 1.35 && Math.random() < 0.5) {
            if (ag.role === 'shelter_rest') {
              return {
                ...ag,
                moving: false,
                insideShelter: true,
                bubble: null,
                restTicks: 2,
                nextMoveAt: now + 2200,
              };
            }
            if (ag.kind === 'hall') {
              const cf = campfires[0];
              const faceDir: 1 | -1 = cf && ag.x > cf.x ? -1 : 1;
              return {
                ...ag,
                facing: faceDir,
                moving: false,
                bubble: null,
                restTicks: 2,
                nextMoveAt: now + 2400,
              };
            }
            if (ag.role === 'campfire_social') {
              const cf = campfires[0];
              const faceDir: 1 | -1 = cf && ag.x > cf.x ? -1 : 1;
              return {
                ...ag,
                facing: faceDir,
                moving: false,
                bubble: null,
                restTicks: 2,
                nextMoveAt: now + 2200,
              };
            }
            if (ag.role === 'wall_patrol') {
              return {
                ...ag,
                moving: false,
                bubble: null,
                restTicks: 1,
                nextMoveAt: now + 2000,
              };
            }
            if (ag.role === 'hauler') {
              return {
                ...ag,
                moving: false,
                bubble: null,
                restTicks: 1,
                nextMoveAt: now + 1900,
              };
            }
          }

          // Occasional natural pause & look around so residents don't march nonstop
          if (Math.random() < 0.22) {
            return {
              ...ag,
              moving: false,
              bubble: null,
              nextMoveAt: now + 1200 + Math.floor(Math.random() * 1300),
            };
          }

          // Pick 8-directional / free-angle smooth sub-tile step (0.4 ~ 0.85 tiles)
          const stepLen = 0.42 + Math.random() * 0.45;
          const candidateAngles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, -Math.PI / 4, -Math.PI / 2, (-3 * Math.PI) / 4];
          const valid = candidateAngles
            .map(ang => {
              const jitterAng = ang + (Math.random() - 0.5) * 0.35;
              const nx = ag.x + Math.cos(jitterAng) * stepLen;
              const ny = ag.y + Math.sin(jitterAng) * stepLen;
              return { x: nx, y: ny, dx: Math.cos(jitterAng) };
            })
            .filter(
              p =>
                p.x >= 0.3 &&
                p.x <= VILLAGE_GRID_SIZE - 1.2 &&
                p.y >= 0.3 &&
                p.y <= VILLAGE_GRID_SIZE - 1.2 &&
                !occupiedTileSet.has(`${Math.round(p.x)},${Math.round(p.y)}`)
            );

          if (!valid.length) {
            return { ...ag, moving: false, bubble: null, nextMoveAt: now + nextCadence };
          }

          let chosen = valid[Math.floor(Math.random() * valid.length)];
          if (targetPos && Math.random() < 0.68) {
            valid.sort(
              (a, b) =>
                Math.hypot(a.x - targetPos!.x, a.y - targetPos!.y) -
                Math.hypot(b.x - targetPos!.x, b.y - targetPos!.y)
            );
            chosen = valid[0];
          }
          const duration = 1550 + Math.floor(Math.random() * 1250);
          return {
            ...ag,
            x: chosen.x,
            y: chosen.y,
            facing: chosen.dx < -0.08 ? -1 : chosen.dx > 0.08 ? 1 : ag.facing,
            moving: true,
            insideShelter: false,
            bubble: null,
            moveDurationMs: duration,
            nextMoveAt: now + duration + Math.floor(Math.random() * 450),
          };
        });
      });
    }, 280);
    return () => window.clearInterval(timer);
  }, [agents.length, vState.buildings, occupiedTileSet]);

  const handleBuildingPress = (placed: PlacedVillageBuilding) => {
    if (buildMode) {
      setSelectedPlacedUid(placed.uid === selectedPlacedUid ? null : placed.uid);
      return;
    }
    // If the building has a harvest bubble ready, pop & collect it immediately on tap!
    if (buildingBubbles[placed.uid] && onHarvestBubble) {
      triggerPopHarvest(placed);
      return;
    }
    if (placed.buildingId === 'wandering_shaman' || placed.buildingId === 'shaman_tent') {
      setActiveModal('shaman_quest');
      return;
    }
    if (placed.buildingId === 'tribal_hall') {
      setActiveModal('tribal_hall');
      return;
    }
    setSelectedPlacedUid(placed.uid);
    const modal = modalForBuilding(placed.buildingId);
    if (modal) {
      setActiveModal(modal);
      return;
    }
    setBuildingPopup(placed);
  };

  const handleTileClick = (x: number, y: number) => {
    const existing = buildingAtTile(vState, x, y);
    if (!buildMode) {
      if (existing) {
        handleBuildingPress(existing);
      } else {
        setSelectedPlacedUid(null);
      }
      return;
    }
    if (selectedPlacedUid && !existing) {
      if (onMove(selectedPlacedUid, x, y)) {
        setSelectedPlacedUid(null);
      }
      return;
    }
    if (existing) {
      setSelectedPlacedUid(existing.uid === selectedPlacedUid ? null : existing.uid);
      return;
    }
    onPlace(selectedBuildId, x, y);
  };

  // User Touch Feedback: resident stops, faces front, jumps, and shows heart/sweat + greeting!
  const handleAgentClick = (ag: LivingAgent) => {
    if (buildMode) return;
    if (ag.kind === 'shaman') {
      setActiveModal('shaman_quest');
      return;
    }
    if (ag.kind === 'hall') {
      setActiveModal('tribal_hall');
      return;
    }
    const pool =
      languageLearned || playerLevel >= 5 ? TOUCH_GREETINGS_SPEAK : TOUCH_GREETINGS_PRIMITIVE;
    const line = pool[Math.floor(Math.random() * pool.length)];
    setAgents(prev =>
      prev.map(item =>
        item.id === ag.id
          ? {
              ...item,
              moving: false,
              insideShelter: false,
              jumpTick: Date.now(),
              bubble: line,
              restTicks: 5,
            }
          : item
      )
    );
    setTalkingAgent({ ...ag, bubble: line });
  };

  const filteredCatalog = VILLAGE_BUILDING_LIST.filter(
    b => catFilter === 'all' || b.category === catFilter
  );

  return (
    <div className="space-y-2 text-xs" data-village-view>
      {/* Top Status & Mode Bar */}
      <div className="pixel-frame flex flex-wrap items-center justify-between gap-1.5 bg-card p-2">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <b className="text-sm">🌿 부족 마을 광장 (16×16 요새) · Lv.{baseLevel}</b>
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              🛡️ 성벽 {bonuses.totalWallHp}
            </span>
            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold">
              👥 마을 인구 {popCap.totalResidentDisplay}명
            </span>
            <button
              type="button"
              onClick={() => setShowDefenseReport(v => !v)}
              className="pixel-btn flex items-center gap-0.5 bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
            >
              <ShieldCheck className="!h-3 !w-3" />
              방어 일지
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <span>🕯️ 시야 +{bonuses.nightVisionBonusM}m</span>
            <span>⛺ 회복 ×{bonuses.regenSpeedMult}</span>
            <span>📦 적재 +{bonuses.carryBonusKg}kg</span>
            <span>🥩 신선도 {freshnessPct}%</span>
            {spoiledCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveModal('smokehouse')}
                className="font-bold text-lime-700 underline"
              >
                🤢 상한음식 {spoiledCount}개!
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {totalReadyBubbles > 0 && onHarvestAllBubbles && (
            <Button
              type="button"
              size="sm"
              onClick={() => onHarvestAllBubbles()}
              className="pixel-btn h-auto min-h-0 animate-pulse gap-1 bg-amber-500 py-1.5 px-2 text-xs font-bold text-black hover:bg-amber-400"
            >
              ✨ 수확 ({totalReadyBubbles})
            </Button>
          )}
          {/* Village Zoom Controls (- / 100% / +) */}
          <div className="flex items-center rounded border border-foreground bg-background" role="group" aria-label="마을 화면 확대 축소">
            <button
              type="button"
              aria-label="마을 축소"
              onClick={() => setZoom(z => clampZoom(z - 0.2))}
              className="px-1.5 py-1 text-xs font-bold hover:bg-accent"
            >
              <ZoomOut className="!h-3.5 !w-3.5" />
            </button>
            <button
              type="button"
              aria-label="마을 배율 초기화"
              onClick={() => setZoom(1)}
              className="border-x border-border px-1.5 py-1 text-[10px] font-bold"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="마을 확대"
              onClick={() => setZoom(z => clampZoom(z + 0.2))}
              className="px-1.5 py-1 text-xs font-bold hover:bg-accent"
            >
              <ZoomIn className="!h-3.5 !w-3.5" />
            </button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsoView(v => !v)}
            className="pixel-btn h-auto min-h-0 py-1.5 px-2 text-xs"
            title="아이소메트릭 / 탑다운 시점 전환"
          >
            <Rotate3d className="!h-4 !w-4" />
            {isoView ? '아이소' : '탑다운'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={buildMode ? 'default' : 'outline'}
            aria-pressed={buildMode}
            onClick={() => {
              setBuildMode(v => !v);
              setSelectedPlacedUid(null);
            }}
            className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2.5 text-xs font-bold"
          >
            <Hammer className="!h-4 !w-4" />
            🔨 건설 {buildMode ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {/* Night Raid Defense Report Banner (CoC Siege Victory Feel) */}
      {showDefenseReport && (
        <div className="pixel-frame flex items-center justify-between gap-2 border-emerald-700 bg-emerald-950/15 p-2.5 text-xs">
          <div className="space-y-0.5">
            <b className="text-emerald-700">🛡️ 어젯밤 습격 방어 성공 보고서 (실드 보호 활성)</b>
            <p className="text-[11px] leading-snug">
              "어젯밤 외곽 숲(2칸 스폰 구역)에서 굶주린 랩터 무리가 습격했으나,{' '}
              <b>통나무 성벽(HP {bonuses.totalWallHp})</b>과 <b>수호 펫·거인 부족 보초병</b>이 완벽히 막아냈습니다! (창고 손실 0% · 파손 성벽 무료 즉시 수리 완료)"
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDefenseReport(false)}
            className="pixel-btn shrink-0 bg-card px-2 py-1 text-[10px]"
          >
            확인
          </button>
        </div>
      )}

      {/* AI Intent Crafting Workshop Entrance */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-amber-500/40">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base shrink-0">✨</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-amber-950">AI 맞춤 의도 설계 공방</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-800 font-mono font-bold">NEW</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              원하는 용도를 자연어로 적으면 재료 물리 속성을 분석해 맞춤 건축물·장비를 제작합니다
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIntentCraftingTab('architecture');
              setActiveModal('intent_crafting');
            }}
            className="pixel-btn bg-amber-600 text-white px-2 py-1 text-[10px] font-bold hover:bg-amber-500 shadow-sm"
          >
            건축 설계
          </button>
          <button
            type="button"
            onClick={() => {
              setIntentCraftingTab('armory');
              setActiveModal('intent_crafting');
            }}
            className="pixel-btn bg-orange-600 text-white px-2 py-1 text-[10px] font-bold hover:bg-orange-500 shadow-sm"
          >
            장비 제련
          </button>
        </div>
      </div>

      {/* 6 Core Facility Fullscreen Quick Bar (Added Smokehouse & Tavern!) */}
      <div className="grid grid-cols-6 gap-1" role="group" aria-label="거점 핵심 시설 바로가기">
        <button
          type="button"
          onClick={() => setActiveModal('workshop')}
          className="pixel-btn flex items-center justify-center gap-0.5 bg-amber-500/15 text-amber-900 py-2 px-0.5 text-[10px] tracking-tighter font-bold leading-tight"
        >
          <span className="whitespace-nowrap">건축공방</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveModal('armory')}
          className="pixel-btn flex items-center justify-center gap-0.5 bg-orange-500/15 text-orange-900 py-2 px-0.5 text-[10px] tracking-tighter font-bold leading-tight"
        >
          <span className="whitespace-nowrap">무기공방</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveModal('smokehouse')}
          className="pixel-btn relative flex items-center justify-center gap-0.5 bg-yellow-500/15 text-yellow-900 py-2 px-0.5 text-[10px] tracking-tighter font-bold leading-tight"
        >
          <span className="whitespace-nowrap">훈제보관</span>
          {spoiledCount > 0 && <span className="h-2 w-2 rounded-full bg-lime-500" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveModal('tavern')}
          className="pixel-btn flex items-center justify-center gap-0.5 bg-rose-500/15 text-rose-900 py-2 px-0.5 text-[10px] tracking-tighter font-bold leading-tight"
        >
          <span className="whitespace-nowrap">원시주막</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveModal('altar')}
          className="pixel-btn flex items-center justify-center gap-0.5 bg-violet-500/15 text-violet-900 py-2 px-0.5 text-[10px] tracking-tighter font-bold leading-tight"
        >
          <span className="whitespace-nowrap">고대제단</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveModal('shaman')}
          className="pixel-btn relative flex items-center justify-center gap-0.5 bg-emerald-500/15 text-emerald-900 py-2 px-0.5 text-[10px] tracking-tighter font-bold leading-tight"
        >
          <span className="whitespace-nowrap">주술사</span>
          {(canClaimQuest || (playerLevel >= 5 && !languageLearned)) && (
            <span className="h-2 w-2 rounded-full bg-destructive" />
          )}
        </button>
      </div>

      {/* Selected Building Inspector in Build Mode */}
      {selectedPlaced && buildMode && (
        <div className="pixel-box flex items-center justify-between gap-2 bg-accent/15 px-2.5 py-1.5">
          <div className="min-w-0 flex-1">
            <b>
              {VILLAGE_BUILDINGS[selectedPlaced.buildingId].icon}{' '}
              {VILLAGE_BUILDINGS[selectedPlaced.buildingId].name}
            </b>{' '}
            <span className="text-[10px] text-muted-foreground">
              ({VILLAGE_BUILDINGS[selectedPlaced.buildingId].footprintLabel} · 건설 구역 {selectedPlaced.x + 1},{' '}
              {selectedPlaced.y + 1}) · 내구도 {selectedPlaced.hp}/{selectedPlaced.maxHp}
            </span>
            <p className="truncate text-[10px] text-primary">
              중앙 12×12 건설 구역의 빈 타일을 누르면 이동합니다. (외곽 2칸은 침입자 등장 구역)
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={
              selectedPlaced.buildingId === 'campfire' &&
              vState.buildings.filter(b => b.buildingId === 'campfire').length <= 1
            }
            onClick={() => {
              onRemove(selectedPlaced.uid);
              setSelectedPlacedUid(null);
            }}
            className="h-auto min-h-0 gap-1 py-1 px-2 text-xs"
          >
            <Trash2 className="!h-3.5 !w-3.5" />
            철거
          </Button>
        </div>
      )}

      {/* 16x16 Total Map with 2-Tile Outer Invader Spawn Margin + Inner 12x12 Buildable Village (Supports Zoom & Pinch/Wheel) */}
      <div
        className="pixel-frame relative mx-auto flex max-h-[58dvh] items-center justify-center overflow-auto bg-[#1b2613] p-3"
        onWheel={e => {
          if (Math.abs(e.deltaY) > 4) {
            setZoom(z => clampZoom(z + (e.deltaY < 0 ? 0.12 : -0.12)));
          }
        }}
        onTouchStart={e => {
          if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchDistRef.current = Math.hypot(dx, dy);
          }
        }}
        onTouchMove={e => {
          if (e.touches.length === 2 && pinchDistRef.current !== null) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const delta = (dist - pinchDistRef.current) / 180;
            pinchDistRef.current = dist;
            setZoom(z => clampZoom(z + delta));
          }
        }}
        onTouchEnd={() => {
          pinchDistRef.current = null;
        }}
        onPointerDown={() => {
          swipingHarvestRef.current = true;
        }}
        onPointerUp={() => {
          swipingHarvestRef.current = false;
        }}
        onPointerLeave={() => {
          swipingHarvestRef.current = false;
        }}
      >
        {/* Outer 16x16 Siege / Invader Spawn Margin Frame */}
        <div
          className="relative aspect-square w-full max-w-[376px] shrink-0 select-none rounded-sm border-2 border-[#1c2912] p-[12.5%] shadow-inner transition-transform duration-200 overflow-hidden"
          style={{
            backgroundImage: `url(${baseVillageBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            transform: `${
              isoView ? 'perspective(650px) rotateX(19deg) ' : ''
            }scale(${(isoView ? 0.98 : 1) * zoom})`,
            transformOrigin: 'center center',
            transformStyle: isoView ? 'preserve-3d' : undefined,
          }}
        >
          {/* Outer 2-tile Invader Spawn Margin Indicators */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-2 top-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-[#cbe5b4]"
          >
            🌲 외곽 침입 경계림 (16×16 외곽 2칸 스폰 구역)
          </span>

          {/* Inner 12x12 Buildable Village Grid */}
          <div
            role="grid"
            aria-label="12x12 거점 마을 그리드"
            data-build-mode={buildMode ? 'on' : 'off'}
            className={`relative grid h-full w-full grid-cols-12 grid-rows-12 transition-all ${
              buildMode
                ? 'border-2 border-amber-300/90 bg-amber-950/20 shadow-[0_0_12px_rgba(250,204,21,0.35)]'
                : 'border border-[#2a3d1d]/40 bg-transparent'
            }`}
          >
            {/* Base 12x12 Tiles */}
            {Array.from({ length: VILLAGE_GRID_SIZE * VILLAGE_GRID_SIZE }, (_, idx) => {
              const x = idx % VILLAGE_GRID_SIZE;
              const y = Math.floor(idx / VILLAGE_GRID_SIZE);
              const placed = buildingAtTile(vState, x, y);
              const checker = (x + y) % 2 === 0;
              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  role="gridcell"
                  aria-label={
                    placed
                      ? `${VILLAGE_BUILDINGS[placed.buildingId].name} (${x + 1},${y + 1})`
                      : `빈 타일 (${x + 1},${y + 1})`
                  }
                  data-tile={`${x},${y}`}
                  data-building={placed?.buildingId}
                  onClick={() => handleTileClick(x, y)}
                  className={`relative flex items-center justify-center transition-colors ${
                    buildMode
                      ? `border-[0.5px] border-[#2f4222]/40 hover:bg-primary/30 ${
                          checker ? 'bg-amber-300/15' : 'bg-transparent'
                        }`
                      : 'border-0 bg-transparent hover:bg-white/10'
                  }`}
                />
              );
            })}

            {/* Multi-Tile Buildings Layer + Supercell-Style Roof Harvest Bubbles */}
            {vState.buildings.map(b => {
              const def = VILLAGE_BUILDINGS[b.buildingId];
              const w = def?.widthTiles ?? 1;
              const h = def?.heightTiles ?? 1;
              const isSelected = b.uid === selectedPlacedUid;
              const harvestBubble = buildingBubbles[b.uid];

              return (
                <div
                  key={b.uid}
                  data-placed-building={b.buildingId}
                  data-footprint={`${w}x${h}`}
                  className={`absolute z-10 flex flex-col items-center justify-center ${
                    isSelected
                      ? 'ring-2 ring-accent bg-accent/25 z-20'
                      : buildMode
                        ? 'border border-dashed border-foreground/50 bg-black/10'
                        : ''
                  }`}
                  style={{
                    left: `${(b.x / VILLAGE_GRID_SIZE) * 100}%`,
                    top: `${(b.y / VILLAGE_GRID_SIZE) * 100}%`,
                    width: `${(w / VILLAGE_GRID_SIZE) * 100}%`,
                    height: `${(h / VILLAGE_GRID_SIZE) * 100}%`,
                  }}
                >
                  {/* Floating Idle Harvest Bubble on Roof (Tap or Swipe to Pop!) */}
                  {harvestBubble && !buildMode && (
                    <button
                      type="button"
                      data-harvest-bubble={b.buildingId}
                      aria-label={`${def.name} 방치 보상 ${harvestBubble.label} +${harvestBubble.count} 수확`}
                      onClick={e => {
                        e.stopPropagation();
                        triggerPopHarvest(b);
                      }}
                      onPointerEnter={() => {
                        if (swipingHarvestRef.current) triggerPopHarvest(b);
                      }}
                      className="pointer-events-auto -top-3.5 absolute z-30 flex animate-bounce items-center gap-0.5 rounded-full border-2 border-foreground bg-amber-300 px-1.5 py-0.5 text-[9px] font-extrabold text-black shadow-[0_2px_8px_rgba(250,204,21,0.9)] transition-transform active:scale-125"
                    >
                      <span>{harvestBubble.icon}</span>
                      <span>+{harvestBubble.count}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleBuildingPress(b);
                    }}
                    aria-label={`${def.name} (${def.footprintLabel})`}
                    className="relative flex h-full w-full flex-col items-center justify-center transition-transform hover:scale-[1.03]"
                  >
                    {!def.connectsWall && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute bottom-1 h-2.5 w-4/5 rounded-full bg-black/25 blur-[2px]"
                      />
                    )}
                    <div className="relative flex h-full w-full items-center justify-center">
                      <BuildingGraphic b={b} state={vState} />
                    </div>
                    {!def.connectsWall && !buildMode && (
                      <span className="pointer-events-none -mt-1 whitespace-nowrap rounded bg-background/85 px-1 py-0 text-[8px] font-bold leading-tight shadow">
                        {def.name}
                      </span>
                    )}
                    {buildMode && (
                      <span className="pointer-events-none absolute bottom-0 inset-x-0.5 h-1 bg-background/70">
                        <span
                          className="block h-full bg-primary"
                          style={{ width: `${Math.min(100, Math.round((b.hp / b.maxHp) * 100))}%` }}
                        />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}

            {/* Popped Harvest Floating Numbers */}
            {popFloats.map(f => (
              <div
                key={f.id}
                className="pointer-events-none absolute z-40 -translate-y-4 animate-ping whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[10px] font-extrabold text-primary-foreground shadow"
                style={{
                  left: `${(f.x / VILLAGE_GRID_SIZE) * 100}%`,
                  top: `${(f.y / VILLAGE_GRID_SIZE) * 100}%`,
                }}
              >
                {f.text}
              </div>
            ))}

            {/* Autonomous Role-Playing Ecosystem Layer (1칸 characters with smooth individual strolling) */}
            {agents.map(ag => (
              <button
                key={ag.id}
                type="button"
                data-village-agent={ag.kind}
                data-agent-role={ag.role}
                aria-label={`${ag.label} 터치 반응 및 대화하기`}
                onClick={e => {
                  e.stopPropagation();
                  handleAgentClick(ag);
                }}
                className={`absolute z-20 flex flex-col items-center justify-end transition-[left,top,opacity] ease-in-out ${
                  ag.insideShelter ? 'opacity-20 scale-75' : 'opacity-100'
                } ${
                  buildMode
                    ? 'pointer-events-none opacity-50'
                    : 'pointer-events-auto cursor-pointer hover:scale-110'
                }`}
                style={{
                  width: `${100 / VILLAGE_GRID_SIZE}%`,
                  height: `${100 / VILLAGE_GRID_SIZE}%`,
                  left: `${(ag.x / VILLAGE_GRID_SIZE) * 100}%`,
                  top: `${(ag.y / VILLAGE_GRID_SIZE) * 100}%`,
                  transitionDuration: `${ag.moveDurationMs ?? 1900}ms`,
                }}
              >
                {ag.bubble && (
                  <span
                    data-agent-bubble={ag.bubble}
                    className="-top-4 absolute z-30 animate-bounce whitespace-nowrap rounded border border-foreground bg-card px-1 py-0 text-[8px] font-bold leading-tight shadow-sm"
                  >
                    {ag.bubble}
                  </span>
                )}
                {ag.carryingIcon && ag.moving && !ag.bubble && (
                  <span className="-top-2.5 absolute z-20 text-[9px]">{ag.carryingIcon}</span>
                )}
                <div
                  className={ag.jumpTick && Date.now() - ag.jumpTick < 1500 ? 'animate-bounce' : ''}
                  style={{
                    transform: ag.facing === -1 ? 'scaleX(-1)' : undefined,
                  }}
                >
                  {ag.kind === 'shaman' ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={shamanImg}
                        alt="떠돌이 주술사"
                        className={`pixelated h-8 w-auto object-contain ${
                          vState.shamanClass === 'warlock'
                            ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]'
                            : vState.shamanClass === 'mage'
                              ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.9)]'
                              : vState.shamanClass === 'engineer'
                                ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]'
                                : vState.shamanClass === 'orthodox'
                                  ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.9)]'
                                  : 'drop-shadow'
                        }`}
                      />
                      <span className="mt-0.5 whitespace-nowrap rounded bg-background/90 px-1 text-[7px] font-bold border border-foreground/40 leading-none">
                        {vState.shamanClass ? SHAMAN_CLASSES[vState.shamanClass].name : '떠돌이 주술사'}
                      </span>
                    </div>
                  ) : ag.kind === 'hall' ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={mercImg}
                        alt="부족회관"
                        className="pixelated h-10 w-auto object-contain drop-shadow"
                      />
                      <span className="mt-0.5 whitespace-nowrap rounded bg-background/90 px-1 text-[7px] font-bold border border-foreground/40 leading-none">
                        부족회관
                      </span>
                    </div>
                  ) : ag.kind === 'tribe' || ag.kind === 'extra' ? (
                    <TribeSprite
                      action={ag.moving ? 'walk' : 'idle'}
                      tribeClass={ag.tribeClass}
                      height={ag.kind === 'extra' ? 25 : 30}
                      showBadge={false}
                    />
                  ) : (
                    <div className={ag.moving ? 'animate-bounce' : ''}>
                      <PetSprite
                        speciesId={ag.speciesId ?? 'baby_raptor'}
                        name={ag.label}
                        height={24}
                      />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Legend overlay */}
        <div className="pointer-events-none absolute bottom-1.5 right-2 flex items-center gap-1.5 rounded bg-background/85 px-1.5 py-0.5 text-[10px]">
          <span>
            전투용병 {Math.min(popCap.maxTribeCapacity, tribe?.count ?? 0)}명
          </span>
          <span>·</span>
          <span>일꾼주민 {popCap.ambientExtraCount}명</span>
          <span>·</span>
          <span>수호펫 {Math.min(3, pets.length)}마리</span>
        </div>
      </div>

      {/* Interactive Tribe / Pet Conversation Modal */}
      {talkingAgent && !buildMode && (
        <div
          role="dialog"
          aria-label={`${talkingAgent.label} 대화창`}
          className="pixel-frame space-y-2 border-primary bg-card p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-12 w-12 items-center justify-center border-2 border-foreground bg-background">
                {talkingAgent.kind === 'tribe' || talkingAgent.kind === 'extra' ? (
                  <TribeSprite
                    action="walk"
                    tribeClass={talkingAgent.tribeClass}
                    height={38}
                    showBadge={false}
                  />
                ) : talkingAgent.kind === 'hall' ? (
                  <img src={mercImg} alt="부족회관" className="pixelated h-10 w-auto object-contain" />
                ) : talkingAgent.kind === 'shaman' ? (
                  <img src={shamanImg} alt="떠돌이 주술사" className="pixelated h-10 w-auto object-contain" />
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
                    {talkingAgent.role === 'wall_patrol'
                      ? '🛡️ 성벽 순찰 보초'
                      : talkingAgent.role === 'hauler'
                        ? '🪵 자원 운반 일꾼'
                        : talkingAgent.role === 'shelter_rest'
                          ? '⛺ 쉼터 휴식'
                          : '🔥 모닥불 담소'}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {talkingAgent.bubble ??
                    '족장님의 손길에 반갑게 반응하며 마을을 지키고 있습니다!'}
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

          {talkingAgent.kind === 'tribe' || talkingAgent.kind === 'extra' ? (
            (() => {
              const isAmbacho = talkingAgent.label.includes('암바초');
              const dlg = isAmbacho
                ? {
                    heroPrompt: '암바초, 열심히 줍고 있나?',
                    npcReply: '"암바초: 족장님! 돌멩이 주웠슴다! 이거 먹는 겁니까? 충성충성!" (머리를 긁적이며 우직하게 웃어 보입니다.)',
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
              <span>"크르릉~ ♥" (모닥불 곁에서 기분 좋게 꼬리를 흔들며 애교를 부립니다.)</span>
            </div>
          )}

          <div className="flex justify-end gap-1.5">
            {!languageLearned && playerLevel >= 5 && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setTalkingAgent(null);
                  setActiveModal('shaman');
                }}
                className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs"
              >
                🧙 주술사에게 말 배우러 가기
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setTalkingAgent(null)}
              className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs"
            >
              대화 마치고 둘러보기
            </Button>
          </div>
        </div>
      )}

      {/* Facility Function Popup for Non-Modal Buildings */}
      {buildingPopup && !buildMode && (
        <div
          role="dialog"
          aria-label={`${VILLAGE_BUILDINGS[buildingPopup.buildingId].name} 기능 팝업`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 font-pixel text-xs"
          onClick={() => setBuildingPopup(null)}
        >
          <div
            className="pixel-frame w-full max-w-sm space-y-3 bg-background p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b-2 border-foreground pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-card text-xl">
                  {buildingPopup.buildingId === 'custom_intent_building'
                    ? buildingPopup.customCategory === 'tower'
                      ? '🏹'
                      : buildingPopup.customCategory === 'fence'
                        ? '🛡️'
                        : '🏛️'
                    : VILLAGE_BUILDINGS[buildingPopup.buildingId].icon}
                </span>
                <div>
                  <b className="text-sm">
                    {buildingPopup.customName ?? VILLAGE_BUILDINGS[buildingPopup.buildingId].name}
                  </b>
                  <p className="text-[10px] text-primary">
                    크기: {VILLAGE_BUILDINGS[buildingPopup.buildingId].footprintLabel} · 내구도{' '}
                    {buildingPopup.hp}/{buildingPopup.maxHp}
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

            {buildingPopup.buildingId === 'custom_intent_building' && buildingPopup.customMechanics && (
              <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                <span className="text-[10px] font-bold text-amber-950 block">부여된 특수 메커닉:</span>
                <div className="flex flex-wrap gap-1">
                  {buildingPopup.customMechanics.map(tag => {
                    const meta = BUILDING_MECHANICS_META[tag as BuildingMechanicTag];
                    return (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-background/80 text-amber-800 border border-amber-500/40 font-bold"
                      >
                        {meta ? `${meta.icon} ${meta.name}` : tag}
                      </span>
                    );
                  })}
                </div>
                {buildingPopup.physics && (
                  <div className="text-[9px] text-muted-foreground flex gap-2 font-mono pt-1">
                    <span>내구도 {buildingPopup.physics.durability}</span>
                    <span>탄성 {buildingPopup.physics.elasticity}</span>
                    <span>내후성 {buildingPopup.physics.weatherResist}</span>
                    <span>밀도 {buildingPopup.physics.density}</span>
                  </div>
                )}
              </div>
            )}

            <div className="pixel-box bg-accent/15 p-2 font-bold text-primary">
              ✨ 시설 효과: {buildingPopup.buildingId === 'custom_intent_building' ? '의도 기반 특수 메커닉 상시 발동' : VILLAGE_BUILDINGS[buildingPopup.buildingId].effectLabel}
            </div>

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

      {/* Build Mode Palette */}
      {buildMode ? (
        <div className="pixel-frame space-y-2 bg-card p-2">
          <div className="flex items-center justify-between gap-1">
            <div role="tablist" aria-label="건설 시설 분류" className="flex flex-wrap gap-1">
              {(
                [
                  ['all', '전체'],
                  ['wall', '🛡️ 성벽(1칸)'],
                  ['facility', '⛺ 시설(2·4·6칸)'],
                  ['decor', '🌺 조경·토템'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={catFilter === id}
                  onClick={() => setCatFilter(id)}
                  className={`pixel-btn py-1 px-2 text-xs ${
                    catFilter === id ? 'bg-primary text-primary-foreground font-bold' : 'bg-background'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {selectedPlaced
                ? '이동할 빈 타일 선택'
                : `마을 발전도에 따라 주민이 최대 ${popCap.totalResidentDisplay}명까지 늘어납니다`}
            </span>
          </div>

          <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
            {filteredCatalog.map(def => {
              const artisanOk = isArtisanUnlocked(vState.shamanSkills, def.id);
              const unlocked = baseLevel >= def.unlockBaseLevel && artisanOk;
              const affordable = hasAll(ownedPool, def.cost);
              const count = vState.buildings.filter(b => b.buildingId === def.id).length;
              const capped = def.maxCount !== undefined && count >= def.maxCount;
              const active = selectedBuildId === def.id;
              const costLabel = def.cost
                .map(c => `${ITEMS[c.itemId]?.name ?? c.itemId} ${c.count}`)
                .join(' · ');
              return (
                <button
                  key={def.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    setSelectedBuildId(def.id);
                    setSelectedPlacedUid(null);
                  }}
                  className={`pixel-box flex flex-col items-start gap-0.5 p-1.5 text-left transition-colors ${
                    active ? 'border-primary bg-primary/15' : 'bg-background'
                  } ${!unlocked ? 'opacity-50' : ''}`}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <b className="truncate text-xs">
                      {def.icon} {def.name}
                    </b>
                    {!unlocked ? (
                      <span className="flex items-center gap-0.5 text-[10px] text-destructive">
                        <Lock className="!h-3 !w-3" />
                        {!artisanOk ? '장인 수련' : `Lv.${def.unlockBaseLevel}`}
                      </span>
                    ) : (
                      <span className="rounded bg-accent/20 px-1 text-[9px] font-bold">
                        {def.footprintLabel}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-primary">{def.effectLabel}</span>
                  <span
                    className={`text-[10px] ${
                      affordable && !capped ? 'text-muted-foreground' : 'text-destructive'
                    }`}
                  >
                    {capped ? '배치 상한 도달' : `재료: ${costLabel}`}
                  </span>
                </button>
              );
            })}
          </div>
          {!inBase && (
            <p className="text-[11px] text-destructive">
              거점 반경 안에서 건설·배치를 진행할 수 있습니다.
            </p>
          )}
        </div>
      ) : (
        <div className="pixel-box flex items-center justify-between bg-card px-2.5 py-1.5 text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Sparkles className="!h-3.5 !w-3.5 text-primary" />
            지붕 위 말풍선을 터치·드래그해 수확하고, 주민·건물을 눌러 상호작용하세요!
          </span>
          <button
            type="button"
            onClick={() => setBuildMode(true)}
            className="shrink-0 font-bold text-primary underline"
          >
            격자 건설 모드
          </button>
        </div>
      )}

      {/* Facility Fullscreen Modals */}
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
      />
      <ShamanQuestModal
        open={activeModal === 'shaman_quest'}
        onClose={() => setActiveModal(null)}
        shamanLevel={(vState.shamanLevel ?? shamanLevel ?? 1) as any}
        shamanClass={vState.shamanClass ?? shamanClass ?? null}
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
      />
      <ShamanEvolutionModal
        open={activeModal === 'shaman_evolution'}
        onClose={() => setActiveModal(null)}
        currentClass={vState.shamanClass ?? shamanClass ?? null}
        pets={pets}
        storage={storage}
        backpack={backpack}
        onSelectShamanClass={classId =>
          onEvolveShaman ? onEvolveShaman(classId) : false
        }
        onEvolvePetToSkullDragon={petUid =>
          onEvolvePetToSkullDragon ? onEvolvePetToSkullDragon(petUid) : false
        }
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
