import { tribeRatio, tribeInjured } from '@/lib/survival/mercenaries';
import { DEFAULT_TRIBE_CLASS, getTribeClass, type TribeClassId } from '@/data/tribeClasses';
// @refresh reset
// Custom GPS/world hook changes must remount this screen instead of reusing stale hook queues.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SkillControls, ConstructionControls, CompanionControls, SkillEffect } from '@/components/survival/SurvivalAbilities';
import CharacterSprite from '@/components/survival/CharacterSprite';
import WinterThemeOverlay from '@/components/WinterThemeOverlay';
import DinoEggHatchModal from '@/components/survival/DinoEggHatchModal';
import { eggArt } from '@/components/survival/eggArt';
import CulinaryDishIcon, { isCustomCulinaryItem } from '@/components/survival/CulinaryDishIcon';
import { EGG_SPAWN_RADIUS_M, eggNeedM, eggReady, eggSpawnsNear, eggWalkedM, type CarriedEgg } from '@/lib/survival/dinoEggs';
import { useCustomCatalog } from '@/hooks/useCustomCatalog';
import CreatureSprite from '@/components/survival/CreatureSprite';
import ExpeditionSystem, { ExpeditionMarker } from '@/components/survival/ExpeditionSystem';
import OfflineReportModal, { type OfflineRewardItem } from '@/components/OfflineReportModal';
import TribeCodexModal from '@/components/TribeCodexModal';
import TribalHallModal from '@/components/survival/TribalHallModal';
import SpriteAnimator from '@/components/survival/SpriteAnimator';
import { preloadCoreSprites, useSpriteAnimations } from '@/hooks/useSpriteAnimations';
import { CombatImpact, CREATURE_RING_RADIUS_M, expeditionActorPoint, freshCombatHit, useExpeditionCombatSound, useMovementSound } from '@/components/survival/ExpeditionCombat';
import type { ExpeditionFocus } from '@/lib/survival/expedition';
import BackpackDiscard from '@/components/survival/BackpackDiscard';
import InventoryMaterials from '@/components/survival/InventoryMaterials';
import { BaseFortressOverlay } from '@/components/survival/BaseFortressOverlay';
import PetSprite from '@/components/survival/PetSprite';
import { viewFocus, type BaseSite, type WorldView } from '@/lib/survival/worldView';
import ExpeditionJoystick from '@/components/survival/ExpeditionJoystick';
import TribeSprite from '@/components/survival/TribeSprite';
import { escortReady } from '@/lib/survival/mercenaries';
import { petRole } from '@/lib/survival/pets';
import { AltarPanel } from '@/components/survival/AltarPanel';
import { EquipmentSlots } from '@/components/survival/EquipmentSlots';
import { addStacks, hasAll } from "@/lib/survival/inventory";
import RightSkillDrawer from '@/components/survival/RightSkillDrawer';
import SkillSettingsModal from '@/components/survival/SkillSettingsModal';
import { useAutoAction } from '@/hooks/useAutoAction';
import { BEAST_STRIKE_INTERVAL_MS, beastAggro } from '@/lib/survival/combat';
import { ACTIVE_SKILLS, type ActiveSkill } from '@/lib/survival/abilities';
import { MAX_SKILL_LEVEL, skillLevel, skillUpgradeCost } from '@/lib/survival/skillLevels';
import { type SpriteAction } from '@/hooks/useSpriteAnimations';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Backpack, Flame, Lightbulb, LocateFixed, X, Lock, ListChecks, Compass, ChevronUp, ChevronDown, HelpCircle, Search, Settings, Egg, Star, MapPin, Navigation, Radar, Map as MapIcon, FileText, BookOpen, Zap, Shield, Home, Radio, RefreshCw, Sparkles } from 'lucide-react';
import { UiGuideOverlay } from '@/components/survival/UiGuideOverlay';
import { bearingDeg, useSurvivalFavorites } from '@/hooks/useSurvivalFavorites';
import { useDeviceHeading } from '@/hooks/useDeviceHeading';
import { useSurvivalGps } from '@/hooks/useSurvivalGps';
import { Button } from '@/components/ui/button';
import { ColonionOpening, PIONEER_NAME_KEY } from '@/components/survival/ColonionOpening';
import { hasSeenStoryTutorial, STORY_TUTORIAL_SEEN_KEY, StoryTutorialModal } from '@/components/survival/StoryTutorial';
import { ContextThemeWrapper, type ContextMode } from '@/components/survival/ContextThemeWrapper';
import ErrorBoundary from '@/components/ErrorBoundary';
import {
  CombatEffectLayer,
  HitReactionWrapper,
  lungeVariants,
  resolveEntitySkillVfx,
  type CombatVfxEvent,
  type FloatingDamage,
  type ProjectileVfx,
  type SkillVfxType,
  useScreenShake,
} from '@/components/survival/CombatEffectLayer';
import {
  SurvivalTutorialOverlay,
  TutorialGroundBranches,
  generateTutorialGroundBranches,
  type TutorialStep,
  type TutorialGroundBranch,
  TUTORIAL_COMPLETED_KEY,
} from '@/components/survival/SurvivalTutorialOverlay';
import SurvivalObjectives from '@/components/survival/SurvivalObjectives';
import { toast } from 'sonner';
import TerrainMap from '@/components/survival/TerrainMap';
import { MapFoliageOverlay } from '@/components/survival/MapFoliageOverlay';
import { computeEntityZIndex } from '@/utils/depthSorting';
import { useSurvivalWorld } from '@/hooks/useSurvivalWorld';
import { zoneCellKey } from '@/lib/survival/terrainZone';
import { gearEffect, isGearItem, ITEMS, requiredRangedAmmo, findAvailableAmmo, computeRangedReach, type ItemId } from '@/lib/survival/items';
import { nodeDef, creatureDef, BOSS_TYPES } from '@/lib/survival/entities';
import { PLAYER_SPRITE_HEIGHT, SPRITE_META, type SpriteKey } from '@/lib/survival/spriteMeta';
import { BASE_LEVELS, CAMP_COST } from '@/lib/survival/bases';
import { SURVIVAL_CONFIG as C } from '@/lib/survival/config';
import { distanceM, offsetM } from '@/lib/survival/geo';
import { generateWorld, isNodeAvailable } from '@/lib/survival/world';
import { AUTO_PICKUP_INTERVAL_MS, AUTO_PICKUP_RADIUS_M, hasAutoPickup } from '@/lib/survival/utilitySkills';
import { ACTOR_IDLE_RETURN_MS, shouldReturnToCenter, type ActorTarget } from '@/lib/survival/actorPos';
import { TECHS, isRecipeUnlocked, prerequisitesMet, techForRecipe } from '@/lib/survival/tech';
import { countOf } from '@/lib/survival/inventory';
import type { LatLng, Stack, WorldEntity } from '@/lib/survival/types';
import { DamageVignette, HitFlash, HpBar, useHitPulse } from '@/components/survival/HitFeedback';
import LandmarkSheet from '@/components/survival/LandmarkSheet';
import { LANDMARK_INFO, SANCTUARY_RADIUS_M, type Landmark } from '@/lib/survival/landmarks';
import { SHRINE_AURA_M, emptyShrineState, shrinesNear, type Shrine } from '@/lib/survival/sanctuaries';
import ShrineSheet from '@/components/survival/ShrineSheet';
import dolmenShrine from '@/assets/survival/dolmen-shrine.png';
import melchizedekImg from '@/assets/survival/melchizedek.png';
import uiBackpackImg from '@/assets/survival/ui-backpack.png';
import uiEggImg from '@/assets/survival/ui-egg.png';
import uiCampfireImg from '@/assets/survival/ui-campfire.png';
import uiStoneGearImg from '@/assets/survival/ui-stone-gear.png';
import uiHeartImg from '@/assets/survival/ui-heart.png';
import uiBananaImg from '@/assets/survival/ui-banana.png';
import uiStoneImg from '@/assets/survival/ui-stone.png';
import uiChevronDownImg from '@/assets/survival/ui-chevron-down.png';
import PeerActionMenu, { type PeerChatMessage } from '@/components/survival/PeerActionMenu';
import { LANGUAGE_QUEST } from '@/lib/survival/quests';
import { useSurvivalPresence, type PeerEvent, type PeerPlayer } from '@/hooks/useSurvivalPresence';
import { EMOTES, PVP_BASE_DAMAGE, DUEL_MAX_DISTANCE_M } from '@/lib/survival/presence';
import { researchJobsOf } from '@/lib/survival/abilities';
import { JobCard, ExpeditionPanel } from '@/components/survival/HomeJobs';
import { BASE_UPGRADE_MS, isReady, researchDurationMs } from '@/lib/survival/homeActivities';
import { sendNotice } from '@/lib/survival/notify';
import GameMenu, { useGameSettings } from '@/components/survival/GameMenu';
import { EMOTE_ICON } from '@/components/survival/emoteIcons';
import { playSfx, playSample, haptic, setBgmPlaying, type SampleId } from '@/lib/survival/gameSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TECH_CATEGORIES, TECH_CATEGORY, type TechCategory } from '@/lib/survival/techCategories';
import { MAX_TECH_LEVEL, techLevel, techUpgradeCost, longReachBonus } from '@/lib/survival/techLevels';
import { eggReachRadius } from '@/lib/survival/utilitySkills';
import PetPanel from '@/components/survival/PetPanel';
import BaseVillageView from '@/components/survival/BaseVillageView';
import RadarMapModal from '@/components/survival/RadarMapModal';
import DinoExpeditionModal from '@/components/survival/DinoExpeditionModal';
import StatusEquipmentModal from '@/components/survival/StatusEquipmentModal';
import AccountSaveEditorModal from '@/components/survival/AccountSaveEditorModal';
import NicknameSetupModal from '@/components/survival/NicknameSetupModal';
import SkillTreeModal from '@/components/survival/SkillTreeModal';
import { atWorkshop } from '@/lib/survival/abilities';

const START: LatLng = { lat: 37.748, lng: 126.7496 };
const spriteUrls = import.meta.glob('../../assets/survival/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const url = (k: SpriteKey) => spriteUrls[`../../assets/survival/${k}.png`];

const LANDMARK_FEATURE_SCALE = 1.15;
// Hard materials (stone, wood, ore) use the strike animation; soft ones use gather.
/** Per-target work label and sound so gathering, logging, mining and hunting read differently. */
export function workKind(e: WorldEntity): { label: string; sample: SampleId } {
  if (e.kind === 'creature') return { label: '사냥 중', sample: 'strike' };
  const req = nodeDef(e.type).requires.kind;
  if (req === 'chop' || /tree|branch/.test(e.type)) return { label: '벌목 중', sample: 'chop' };
  if (req === 'mine' || /rock|vein/.test(e.type)) return { label: '채광 중', sample: 'mine' };
  return { label: '채집 중', sample: 'gather' };
}
const STRIKE_NODES = new Set<string>([
  'flint_rock', 'branch_pile', 'oak_tree', 'pine_tree', 'hematite_rock', 'quartz_vein', 'obsidian_rock', 'jade_rock',
  'copper_vein', 'tin_vein', 'bitumen_seep', 'silver_vein', 'gold_deposit', 'magnetite_rock', 'coal_seam', 'limestone_rock', 'sulfur_vent', 'mercury_deposit', 'meteor_impact',
]);

function Sprite({ k, scale = 1, className = '' }: { k: SpriteKey; scale?: number; className?: string }) {
  const m = SPRITE_META[k];
  const h = m?.h ?? 32;
  if (k === 'char-hunter') return <CharacterSprite height={h * scale} className={className} />;
  const { data } = useSpriteAnimations(k);
  const anim = data?.idle ?? (data as Record<string, any>)?.[k];
  const targetScale = (data?.scale ?? 1) * scale;
  const targetH = Math.round(h * targetScale);
  const staticSrc = url(k);
  if (anim?.url) {
    return (
      <SpriteAnimator
        url={anim.url}
        frames={anim.frame_count}
        fps={anim.fps}
        height={targetH}
        fallback={<img src={staticSrc} height={targetH} style={{ height: targetH, width: 'auto' }} alt="" draggable={false} className={`pixelated select-none ${className}`} />}
      />
    );
  }
  return <img src={staticSrc} height={targetH} style={{ height: targetH, width: 'auto' }} alt="" draggable={false} className={`pixelated select-none ${className}`} />;
}

function Stacks({ stacks, onUse, have }: { stacks: Stack[]; onUse?: (id: ItemId) => void; have?: Stack[] }) {
  if (!stacks?.length) return <p className="text-sm text-muted-foreground">비어 있음</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {stacks.map((s) => {
        const it = ITEMS[s.itemId];
        if (!it) {
          return (
            <div key={s.itemId} className="pixel-frame flex min-h-11 items-center gap-1 bg-muted px-1.5 py-1 text-xs text-muted-foreground">
              <span>{s.itemId}</span><b>×{s.count}</b>
            </div>
          );
        }
        const short = have && countOf(have, s.itemId) < s.count;
        const usable = onUse && (it.food || it.heal || it.book);
        return (
          <button key={s.itemId} type="button" disabled={!usable} onClick={() => usable && onUse(s.itemId)}
            className={`pixel-frame flex min-h-11 items-center gap-1 bg-card px-1.5 py-1 text-xs ${short ? 'text-destructive' : ''} ${usable ? 'active:translate-y-0.5' : ''}`}>
            <Sprite k={it.sprite} scale={0.75} />
            <span>{it.name}</span><b>×{s.count}</b>
          </button>
        );
      })}
    </div>
  );
}

type Panel = 'none' | 'bag' | 'base' | 'tech' | 'quests' | 'favs';

function RedDot() {
  return <span aria-label="새 알림" className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-destructive ring-2 ring-background" />;
}
function MenuBtn({ icon: Icon, label, onClick, dot }: { icon: typeof Backpack; label: string; onClick: () => void; dot?: boolean }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className="pixel-btn relative flex h-auto min-h-0 items-center justify-center gap-1 bg-card py-1.5 px-2.5 text-xs">
      <Icon className="!h-4 !w-4 shrink-0" /><span>{label}</span>{dot && <RedDot />}
    </Button>
  );
}

type CraftCat = 'all' | 'tool' | 'weapon' | 'armor' | 'trinket' | 'etc';
const CRAFT_CATS: { id: CraftCat; label: string }[] = [
  { id: 'all', label: '전체' }, { id: 'tool', label: '도구' }, { id: 'weapon', label: '무기' },
  { id: 'armor', label: '방어구' }, { id: 'trinket', label: '부적' }, { id: 'etc', label: '기타' },
];
const craftCatOf = (id: ItemId): CraftCat => {
  const c = ITEMS[id].category;
  return c === 'tool' || c === 'weapon' || c === 'armor' || c === 'trinket' ? c : 'etc';
};

export default function SurvivalSimulator({ realGps = false }: { realGps?: boolean }) {
  const { user, profile, isLoading: authLoading, signOut, refreshProfile } = useAuth();
  // Opening now lives on the main page ("/"); first-time players see the 5-step story tutorial before entering the world.
  const [showOpening, setShowOpening] = useState(false);
  const [chiefName, setChiefName] = useState(() => localStorage.getItem(PIONEER_NAME_KEY) ?? '');
  const enterWorld = (name: string) => {
    sessionStorage.setItem('colonion.openingSeen', '1');
    if (name) { setChiefName(name); toast.success(`${name} 족장님, 구석기 시대에 오신 것을 환영합니다`); }
    setShowOpening(false);
  };
  const [compassOn, setCompassOn] = useState(false);
  const { heading, requestPermission } = useDeviceHeading(compassOn);
  const toggleCompass = async () => {
    if (compassOn) { setCompassOn(false); return; }
    try {
      const ok = await requestPermission();
      if (!ok) { toast.error('방향 센서 권한이 필요합니다', { description: '브라우저 설정에서 동작 및 방향 접근을 허용해 주세요.' }); return; }
      setCompassOn(true);
      toast.success('방향 따라가기를 켰습니다');
    } catch {
      toast.error('방향 센서를 사용할 수 없습니다');
    }
  };
  const navigate = useNavigate();

  // Nickname Setup Modal State:
  // Shown on very first entry if nickname is unset or placeholder ("원시인xxx") and hasSetNickname !== true
  const [showNicknameModal, setShowNicknameModal] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasSet = localStorage.getItem('colonion.hasSetNickname') === 'true' ||
      sessionStorage.getItem('colonion.hasSetNickname') === 'true';
    if (hasSet) return false;
    const existing = localStorage.getItem(PIONEER_NAME_KEY) ||
      sessionStorage.getItem('colonion.guestNickname') ||
      '';
    const trimmed = existing.trim();
    return !trimmed || /^원시인\d*$/i.test(trimmed);
  });

  // Sync with authenticated user profile when auth completes
  useEffect(() => {
    if (authLoading) return;
    if (user && !user.is_anonymous) {
      const userHasSet = localStorage.getItem(`colonion.hasSetNickname.${user.id}`) === 'true' ||
        localStorage.getItem('colonion.hasSetNickname') === 'true';
      const storedName = localStorage.getItem(`colonion.nickname.${user.id}`) ||
        profile?.display_name ||
        user.user_metadata?.display_name ||
        localStorage.getItem(PIONEER_NAME_KEY);
      if (storedName && !/^원시인\d*$/i.test(storedName.trim())) {
        setChiefName(storedName.trim());
        if (!userHasSet) {
          localStorage.setItem(`colonion.hasSetNickname.${user.id}`, 'true');
          localStorage.setItem('colonion.hasSetNickname', 'true');
        }
        setShowNicknameModal(false);
      } else if (!userHasSet) {
        setShowNicknameModal(true);
      }
    }
  }, [authLoading, user, profile]);

  // Distinguish non-member (guest) vs registered member account
  const isGuest = !user || user.is_anonymous === true;
  const guestSaveKey = realGps ? 'survival-guest-gps-world-v1' : 'survival-guest-world-v1';
  const memberSaveKey = realGps ? 'survival-gps-world-v1' : 'survival-world-v1';
  const currentSaveKey = isGuest ? guestSaveKey : memberSaveKey;

  // Unconditionally wipe any old guest save if fresh game requested
  if (typeof window !== 'undefined' && isGuest && sessionStorage.getItem('colonion.forceFreshGame') === '1') {
    sessionStorage.removeItem('colonion.forceFreshGame');
    try {
      localStorage.removeItem(guestSaveKey);
      localStorage.removeItem(`${guestSaveKey}_backup`);
      localStorage.removeItem('colonion.tutorialStep.guest');
      localStorage.removeItem('colonion_last_active_at');
    } catch { /* ignore */ }
  }

  const accountTutorialKey = user && !user.is_anonymous ? `colonion.tutorialCompleted.${user.id}` : null;
  const TUTORIAL_STEP_STORAGE_KEY = user && !user.is_anonymous
    ? `colonion.tutorialStep.${user.id}`
    : 'colonion.tutorialStep.guest';

  // Manual override from settings switch or complete/skip actions
  const [tutorialCompletedOverride, setTutorialCompletedOverride] = useState<boolean | null>(null);

  // Initial local check for world initialization before GPS
  const isLocalTutorialDone = typeof window !== 'undefined' && (
    isGuest
      ? (sessionStorage.getItem('colonion.forceTutorial') !== '1' && sessionStorage.getItem('colonion.guestTutorialCompleted') === '1')
      : (!!accountTutorialKey && localStorage.getItem(accountTutorialKey) === '1')
  );
  const [gpsReady, setGpsReady] = useState(false);
  const g = useSurvivalWorld(START, {
    enabled: !realGps || gpsReady || !isLocalTutorialDone,
    saveKey: currentSaveKey,
    cloudSync: realGps && !isGuest,
    indoor: realGps,
  });
  const gps = useSurvivalGps(realGps, g.moveTo, g.state.base ?? g.state.pos ?? START, g.maxSpeedKmh);
  useEffect(() => setGpsReady(gps.ready || gps.isIndoor), [gps.ready, gps.isIndoor]);
  useEffect(() => { preloadCoreSprites(); }, []);
  const { state: s } = g;

  // Check whether tutorial is completed:
  // 1. Non-members (guests): MUST unconditionally start from tutorial unless completed in current session.
  // 2. Members (1 account per 1 tutorial): checked via accountTutorialKey or save data.
  const isTutorialCompleted = useMemo(() => {
    if (tutorialCompletedOverride !== null) {
      return tutorialCompletedOverride;
    }
    if (typeof window === 'undefined') return false;

    const forceTutorial = sessionStorage.getItem('colonion.forceTutorial') === '1';
    if (forceTutorial) {
      return false;
    }

    if (isGuest) {
      return sessionStorage.getItem('colonion.guestTutorialCompleted') === '1';
    }

    if (accountTutorialKey) {
      const accountDone = localStorage.getItem(accountTutorialKey) === '1';
      if (accountDone) return true;
    }
    return !!s.tutorialCompleted || !!s.shamanMet;
  }, [tutorialCompletedOverride, isGuest, accountTutorialKey, s.tutorialCompleted, s.shamanMet]);
  const [expeditionTarget, setExpeditionTarget] = useState<LatLng | null>(null);
  const [watchExpedition, setWatchExpedition] = useState(true);
  const [view, setView] = useState<WorldView>('user');
  const [baseSite, setBaseSite] = useState<BaseSite>('main');
  const crew = s.observedExpedition;
  useExpeditionCombatSound(crew, e => workKind(e).sample);
  useMovementSound(s.pos);
  const reducedMotion = useReducedMotion();
  const expeditionHit = freshCombatHit(crew);
  const [expeditionFocus, setExpeditionFocus] = useState<ExpeditionFocus>('materials');
  const observationEntities = crew ? generateWorld({ center: crew.pos, radiusM: g.vision, now: Date.now(), isNight: g.isNight, depleted: s.depleted, terrainZones: s.terrainZones, parkCells: s.parkCells }) : [];
  const visibleEntities = [...new Map([...g.entities, ...observationEntities].map(e => [e.id, e])).values()];
  const nearbyBeast = visibleEntities.some(e => e.kind === 'creature' && !s.depleted[e.id] && distanceM(crew?.pos ?? s.pos, e) <= 50);
  useEffect(() => {
    if (!nearbyBeast) return;
    const timer = window.setInterval(() => { if (!document.hidden) playSample('beastCall'); }, 12_000);
    return () => window.clearInterval(timer);
  }, [nearbyBeast]);
  const expeditionDestination = expeditionTarget ?? offsetM(s.base ?? s.pos, 180, 0);
  const hasTribe = (s.tribe?.count ?? 0) > 0;
  const isAmbachoActive = s.mercenary?.name === '암바초' || (s.tribe?.classCounts?.gatherer ?? 0) > 0;
  const activeTribeClassId: TribeClassId = crew?.tribeClass ?? (isAmbachoActive ? 'gatherer' : (s.tribe?.classId ?? DEFAULT_TRIBE_CLASS));
  const activeTribeClass = getTribeClass(activeTribeClassId);
  const canDispatch = !!s.base && (!realGps || gps.ready || gps.isIndoor || g.inBase || hasTribe);
  const [fieldExp, setFieldExp] = useState(false);
  const [radarOpen, setRadarOpen] = useState(false);
  const handleOpenRadar = useCallback(() => {
    setRadarOpen(true);
    g.gainEnergy('wind', 1, { reason: 'scan' });
  }, [g]);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [saveEditorOpen, setSaveEditorOpen] = useState(false);
  const [skillBarVisible, setSkillBarVisible] = useState(true);
  const [tribeInfoModalOpen, setTribeInfoModalOpen] = useState(false);
  const [offlineReportModalOpen, setOfflineReportModalOpen] = useState(false);
  const [offlineElapsedMinutes, setOfflineElapsedMinutes] = useState(0);
  const [codexModalOpen, setCodexModalOpen] = useState(false);
  const [skillTreeModalOpen, setSkillTreeModalOpen] = useState(false);
  const [skillSettingsModalOpen, setSkillSettingsModalOpen] = useState(false);
  const [initialSkillSlot, setInitialSkillSlot] = useState<0 | 1 | 2>(0);

  const stateRef = useRef(s);
  stateRef.current = s;

  // Track last active timestamp, handle visibilitychange, and auto-trigger Ambacho Offline Report
  useEffect(() => {
    const LAST_ACTIVE_KEY = 'colonion_last_active_at';

    const checkAndTriggerOfflineReport = () => {
      const raw = localStorage.getItem(LAST_ACTIVE_KEY);
      const now = Date.now();
      const todayKey = new Date(now).toISOString().slice(0, 10);

      // BLOCK OfflineReportModal on fresh start, during nickname setup, or before tutorial is completed
      const currentSave = stateRef.current;
      const isCompleted = isTutorialCompleted || currentSave.shamanMet || currentSave.tutorialCompleted;
      const hasAmbacho = currentSave.mercenary?.name === '암바초' || (currentSave.tribe?.classCounts?.gatherer ?? 0) > 0;

      // 1일 1회 암바초 오프라인 파밍 보고서 제한 (Ambacho offline report: 1 time per day)
      const lastReportDate = currentSave.lastOfflineReportDate || localStorage.getItem('colonion_last_offline_report_date');
      const alreadyClaimedToday = lastReportDate === todayKey;

      if (showNicknameModal || !isCompleted || !hasAmbacho || alreadyClaimedToday || !raw) {
        localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
        return;
      }

      const lastTime = parseInt(raw, 10);
      if (!isNaN(lastTime) && lastTime > 0) {
        const diffMin = Math.floor((now - lastTime) / (60 * 1000));
        if (diffMin >= 30) {
          setOfflineElapsedMinutes(diffMin);
          setOfflineReportModalOpen(true);
        }
      }
      localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
    };

    // Check on mount
    checkAndTriggerOfflineReport();

    const timer = window.setInterval(() => {
      if (!document.hidden) {
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      }
    }, 15_000);

    const onVisibilityChange = () => {
      if (document.hidden) {
        // App backgrounded or screen locked: stamp last active and flush auto-save
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
        g.flushSave();
      } else {
        // App resumed / tab focused: check if enough time passed for Offline Report
        checkAndTriggerOfflineReport();
      }
    };

    const onUnload = () => {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      g.flushSave();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [g]);

  const handleClaimOfflineReport = (items: OfflineRewardItem[], classResourceAmount?: number) => {
    const todayKey = new Date().toISOString().slice(0, 10);
    localStorage.setItem('colonion_last_offline_report_date', todayKey);
    g.claimOfflineRewards(
      items.map(it => ({ itemId: it.itemId, count: it.count })),
      classResourceAmount,
      todayKey
    );
    localStorage.setItem('colonion_last_active_at', Date.now().toString());
  };
  const expeditionControls = <ExpeditionSystem crew={crew} logs={s.expeditionLogs ?? []} target={expeditionTarget} home={s.base} auto={!!s.expeditionAuto} pocket={g.pocketMode} outdoor={g.outdoorMoving && (g.pocketMode || (!!crew && distanceM(s.pos, crew.pos) <= 40))} watching={view === 'expedition'} gpsReady={gps.ready || gps.isIndoor} canSend={canDispatch}
    focus={crew?.focus ?? expeditionFocus} onFocus={setExpeditionFocus}
    tribeClass={activeTribeClassId}
    expeditionLevel={g.expeditionLevelInfo.level}
    autoRemainingSec={g.expeditionAutoRemainingSec}
    autoLimitSec={g.expeditionAutoLimitSec}
    onSend={() => { if (g.dispatchObserved(expeditionDestination, expeditionFocus, activeTribeClassId)) { setWatchExpedition(true); setPanel('none'); setView('expedition'); } }}
    onAuto={() => { g.toggleExpeditionAuto(expeditionDestination, expeditionFocus); setWatchExpedition(true); }} onPocket={g.togglePocket} onMorale={g.rallyExpedition} onReturn={g.recallExpedition} onWatch={() => setView(v => v === 'expedition' ? 'user' : 'expedition')}
    tribe={s.tribe ? { count: s.tribe.count, trainLevel: s.tribe.trainLevel ?? 0, ratio: tribeRatio(s.tribe), maxHp: Math.max(1, Math.round(g.maxHp * tribeRatio(s.tribe) * s.tribe.count)), injured: tribeInjured(s.tribe, Date.now()), starving: !!s.tribe.starving, classId: s.tribe.classId, classCounts: s.tribe.classCounts, mercenaryName: s.mercenary?.name } : undefined} />;
  const [panel, setPanel] = useState<Panel>('none');
  const [baseTab, setBaseTab] = useState<'village' | 'lab' | 'craft' | 'storage' | 'expedition' | 'pets'>('village');
  const [craftCat, setCraftCat] = useState<CraftCat>('all');

  // Strict First-Time Boot Priority: Shaman Tutorial Step 1 is the #1 overlay (StoryTutorial deferred)
  const [showStoryTutorial, setShowStoryTutorial] = useState(false);

  // 3-Phase Interactive Survival Tutorial State
  const [tutorialStep, setTutorialStepState] = useState<TutorialStep | null>(() => {
    if (typeof window === 'undefined') return null;
    const forceTutorial = sessionStorage.getItem('colonion.forceTutorial') === '1';
    if (forceTutorial) {
      sessionStorage.removeItem('colonion.forceTutorial');
      return 'phase1_meet';
    }
    if (isGuest) {
      const guestDone = sessionStorage.getItem('colonion.guestTutorialCompleted') === '1';
      if (guestDone) return 'completed';
      return 'phase1_meet';
    }
    if (accountTutorialKey) {
      const memberDone = localStorage.getItem(accountTutorialKey) === '1' || !!s.tutorialCompleted || !!s.shamanMet;
      if (memberDone) return 'completed';
    }
    const savedStep = s.tutorialStep || localStorage.getItem(TUTORIAL_STEP_STORAGE_KEY);
    if (savedStep && savedStep !== 'completed') {
      return savedStep as TutorialStep;
    }
    return 'phase1_meet';
  });

  // Synchronize when auth completes for registered member
  useEffect(() => {
    if (!authLoading && user && !user.is_anonymous) {
      const memberKey = `colonion.tutorialCompleted.${user.id}`;
      const memberDone = localStorage.getItem(memberKey) === '1' || !!s.tutorialCompleted || !!s.shamanMet;
      if (memberDone && tutorialCompletedOverride === null) {
        setTutorialStepState(prev => (prev === 'phase1_meet' ? 'completed' : prev));
      }
    }
  }, [authLoading, user, s.tutorialCompleted, s.shamanMet, tutorialCompletedOverride]);

  const setTutorialStep = useCallback((step: TutorialStep) => {
    setTutorialStepState(step);
    try {
      localStorage.setItem(TUTORIAL_STEP_STORAGE_KEY, step);
      if (step === 'completed') {
        if (user && !user.is_anonymous) {
          localStorage.setItem(`colonion.tutorialCompleted.${user.id}`, '1');
        } else {
          sessionStorage.setItem('colonion.guestTutorialCompleted', '1');
        }
        localStorage.setItem(TUTORIAL_COMPLETED_KEY, '1');
      }
    } catch { /* ignore */ }
    g.updateTutorialState?.(step, step === 'completed');
  }, [g, user, TUTORIAL_STEP_STORAGE_KEY]);

  const [tutorialBranches, setTutorialBranches] = useState<TutorialGroundBranch[]>([]);
  const [collectedBranches, setCollectedBranches] = useState(() => {
    return Math.min(3, countOf(s.backpack, 'branch'));
  });

  // Sync collectedBranches if backpack already contains branches (e.g. page refresh mid-tutorial)
  useEffect(() => {
    const packBranches = countOf(s.backpack, 'branch');
    if (packBranches > collectedBranches && packBranches <= 3) {
      setCollectedBranches(packBranches);
    }
  }, [s.backpack, collectedBranches]);

  // Decoupled Ground Branches: Spawns immediately and smoothly recenters if GPS moves player by >30m
  useEffect(() => {
    if (tutorialStep === 'phase1_gather' && collectedBranches < 3) {
      const needsRegen =
        tutorialBranches.length === 0 ||
        tutorialBranches.some(b => distanceM(s.pos, b) > 30);
      if (needsRegen) {
        setTutorialBranches(generateTutorialGroundBranches(s.pos));
      }
    }
  }, [tutorialStep, tutorialBranches, collectedBranches, s.pos]);

  const handlePickTutorialBranch = (branchId: string) => {
    g.pickTutorialBranch();
    setTutorialBranches(prev => prev.filter(b => b.id !== branchId));
    setCollectedBranches(prev => {
      const next = prev + 1;
      toast.success(`🌿 나뭇가지를 주워 배낭에 넣었습니다! (${next}/3)`);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(50);
      return next;
    });
  };

  const handleCompleteTutorial = useCallback(() => {
    g.meetShaman();
    g.recruitAmbacho();
    try {
      if (user && !user.is_anonymous) {
        localStorage.setItem(`colonion.tutorialCompleted.${user.id}`, '1');
      } else {
        sessionStorage.setItem('colonion.guestTutorialCompleted', '1');
      }
      localStorage.setItem(TUTORIAL_STEP_STORAGE_KEY, 'completed');
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, '1');
    } catch { /* ignore */ }
    setTutorialStepState('completed');
    setTutorialCompletedOverride(true);
    toast.success('🎉 기본 생존 튜토리얼을 모두 완료했습니다!');
  }, [g, user, TUTORIAL_STEP_STORAGE_KEY]);

  const handleToggleTutorial = useCallback((wantsTutorial: boolean) => {
    if (wantsTutorial) {
      try {
        if (user && !user.is_anonymous) {
          localStorage.removeItem(`colonion.tutorialCompleted.${user.id}`);
        } else {
          sessionStorage.removeItem('colonion.guestTutorialCompleted');
        }
        localStorage.removeItem(TUTORIAL_STEP_STORAGE_KEY);
        localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
        localStorage.removeItem(STORY_TUTORIAL_SEEN_KEY);
        sessionStorage.removeItem('colonion.storyTutorialSeenSession');
      } catch { /* ignore */ }
      setCollectedBranches(0);
      setTutorialBranches(generateTutorialGroundBranches(s.pos));
      setTutorialStepState('phase1_meet');
      setTutorialCompletedOverride(false);
      g.updateTutorialState?.('phase1_meet', false);
      toast.info('📖 초보자 튜토리얼을 다시 시작합니다.');
    } else {
      try {
        if (user && !user.is_anonymous) {
          localStorage.setItem(`colonion.tutorialCompleted.${user.id}`, '1');
        } else {
          sessionStorage.setItem('colonion.guestTutorialCompleted', '1');
        }
        localStorage.setItem(TUTORIAL_STEP_STORAGE_KEY, 'completed');
        localStorage.setItem(TUTORIAL_COMPLETED_KEY, '1');
      } catch { /* ignore */ }
      g.meetShaman();
      g.recruitAmbacho();
      g.updateTutorialState?.('completed', true);
      setTutorialStepState('completed');
      setTutorialCompletedOverride(true);
      toast.success('초보자 튜토리얼을 건너뛰고 완료 처리했습니다.');
    }
  }, [user, TUTORIAL_STEP_STORAGE_KEY, s.pos, g]);

  const handleReplayTutorial = () => {
    handleToggleTutorial(true);
  };

  const handleConfirmNickname = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setChiefName(trimmed);
    setShowNicknameModal(false);
    toast.success(`${trimmed} 족장님, 환영합니다!`);

    try {
      localStorage.setItem(PIONEER_NAME_KEY, trimmed);
      localStorage.setItem('colonion.hasSetNickname', 'true');
      if (user && !user.is_anonymous) {
        localStorage.setItem(`colonion.nickname.${user.id}`, trimmed);
        localStorage.setItem(`colonion.hasSetNickname.${user.id}`, 'true');
        void supabase.from('profiles').update({ display_name: trimmed }).eq('user_id', user.id);
        void supabase.auth.updateUser({ data: { display_name: trimmed } });
        void refreshProfile();
      } else {
        sessionStorage.setItem('colonion.guestNickname', trimmed);
        sessionStorage.setItem('colonion.hasSetNickname', 'true');
      }
    } catch (e) {
      console.warn('[NicknameSetup] Failed to persist nickname:', e);
    }

    // Immediately boot Shaman Tutorial Step 1 if tutorial not completed
    if (!isTutorialCompleted) {
      setTutorialStepState('phase1_meet');
    }
  }, [user, refreshProfile, isTutorialCompleted]);

  const handleLogout = useCallback(async () => {
    try {
      g.flushSave?.();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('colonion.guestWorld');
        sessionStorage.removeItem('colonion.guestNickname');
        sessionStorage.removeItem('colonion.hasSetNickname');
        sessionStorage.removeItem('colonion.guestTutorialCompleted');
        sessionStorage.removeItem('colonion.forceTutorial');
        sessionStorage.removeItem('colonion.openingSeen');
      }
      await signOut();
      toast.success('저장 후 로그아웃되었습니다.');
      navigate('/', { replace: true });
    } catch (err) {
      console.warn('[Logout] Error during sign out:', err);
      navigate('/', { replace: true });
    }
  }, [g, signOut, navigate]);

  // 4-Context Mode State ('user' | 'base' | 'pet' | 'expedition')
  const [contextMode, setContextMode] = useState<ContextMode>('user');

  const handleSelectContextMode = (mode: ContextMode) => {
    setContextMode(mode);
    if (mode === 'user') {
      setView('user');
      setPanel('none');
    } else if (mode === 'base') {
      setView('base');
      setBaseTab('village');
      setPanel('base');
    } else if (mode === 'pet') {
      setView('base');
      setBaseTab('pets');
      setPanel('base');
    } else if (mode === 'expedition') {
      setView('expedition');
      setFieldExp(true);
      setPanel('none');
    }
  };

  useEffect(() => {
    if (view === 'expedition') {
      setContextMode('expedition');
    } else if (panel === 'base' && baseTab === 'pets') {
      setContextMode('pet');
    } else if (panel === 'base' || view === 'base') {
      setContextMode('base');
    } else if (view === 'user' && panel === 'none') {
      setContextMode('user');
    }
  }, [view, panel, baseTab]);

  // Combat VFX, Floating Numbers & Screen Shake
  const [combatVfxEvents, setCombatVfxEvents] = useState<CombatVfxEvent[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<FloatingDamage[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileVfx[]>([]);
  const { shaking, triggerShake } = useScreenShake();

  const onTap = (p: LatLng) => {
    if (auto.job) { auto.stop(); returnToCenter(); }
    if (realGps) return;
    const d = distanceM(s.pos, p);
    if (d > g.vision * 1.2) return;
    g.moveTo(p);
  };

  const tapEntity = (e: WorldEntity) => {
    const dist = distanceM(s.pos, e);
    const rangedInfo = computeRangedReach(g.weapon, s.level);
    const isRangedWeapon = e.kind === 'creature' && !!rangedInfo.category;
    const reachBonus = s.techs.includes('long_reach') ? longReachBonus(techLevel(s.techLevels, 'long_reach')) : 0;
    const effectiveReach = isRangedWeapon ? Math.max(g.reach, rangedInfo.rangeM + reachBonus) : g.reach;
    if (realGps && !gps.ready && !gps.isIndoor) { toast.warning('정확한 GPS 신호를 기다려 주세요.'); return; }
    if (realGps && gps.isIndoor && dist > effectiveReach) {
      toast.info('실내 모드에서는 원정대를 파견하여 채집하거나, 야외 이동 시 직접 채집할 수 있습니다.');
      return;
    }
    if (!realGps && dist > effectiveReach) { g.moveTo({ lat: e.lat, lng: e.lng }); return; }
    if (auto.job?.id === e.id) { auto.stop(); toast('작업을 멈췄습니다'); return; }
    if (dist > effectiveReach) { g.interact(e); return; }
    // For ranged weapon shots beyond melee reach, verify backpack ammo first before firing!
    if (e.kind === 'creature' && isRangedWeapon && dist > g.reach) {
      const ammo = findAvailableAmmo(s.backpack, g.weapon?.itemId);
      if (!ammo) {
        const ammoLabel = rangedInfo.category === 'bow' ? '화살(🏹)' : '돌멩이 탄환(🪨)이나 부싯돌';
        toast.error(`배낭에 ${ammoLabel}이(가) 없습니다!`, {
          description: '거점 제작 탭이나 모닥불에서 탄환을 만들어 배낭에 넣어 주세요 (1회 공격 시 1개 소진).',
        });
        return;
      }
      setRangedProjectile({
        id: `${e.id}-${Date.now()}`,
        from: s.pos,
        to: mobPositions[e.id] ?? { lat: e.lat, lng: e.lng },
        kind: rangedInfo.category === 'bow' ? 'arrow' : rangedInfo.category === 'spear' ? 'spear' : 'stone',
      });
      setMobPositions(prev => ({
        ...prev,
        [e.id]: {
          lat: (prev[e.id]?.lat ?? e.lat) + (s.pos.lat - (prev[e.id]?.lat ?? e.lat)) * 0.45,
          lng: (prev[e.id]?.lng ?? e.lng) + (s.pos.lng - (prev[e.id]?.lng ?? e.lng)) * 0.45,
        },
      }));
    } else {
      setActorTarget({ lat: e.lat, lng: e.lng, anchor: s.pos });
    }
    window.clearTimeout(returnTimer.current);
    auto.start(e, workKind(e).label);
  };
  const autoStep = (e: WorldEntity): 'continue' | 'stop' => {
    const w = gRef.current; const p = w.state;
    const alive = w.entities.some(x => x.id === e.id) && (e.kind === 'node' ? isNodeAvailable(e.id, e.type, p.depleted, Date.now()) : !p.depleted[e.id]);
    if (!alive) {
      window.clearTimeout(returnTimer.current);
      returnTimer.current = window.setTimeout(returnToCenter, ACTOR_IDLE_RETURN_MS);
      // 7. 신난다: 우두머리 처치나 희귀 광석 채취 완료 시
      const isRare = e.kind === 'node' && ['obsidian', 'jade', 'hematite', 'quartz', 'flint'].includes(e.type);
      const isBoss = e.kind === 'creature' && (BOSS_TYPES as readonly string[]).includes(e.type);
      if (isRare || isBoss) {
        playAction('celebrate', 2500);
      }
      return 'stop';
    }
    const rangedInfo = computeRangedReach(w.weapon, p.level);
    const isRangedWeapon = e.kind === 'creature' && !!rangedInfo.category;
    const effectiveReach = isRangedWeapon ? Math.max(w.reach, rangedInfo.rangeM) : w.reach;
    if (distanceM(p.pos, e) > effectiveReach) { toast('대상과 멀어져 작업을 멈췄습니다'); returnToCenter(); return 'stop'; }
    if (e.kind === 'node' && w.weight >= w.capacity) { toast.warning('배낭이 가득 찼습니다'); return 'stop'; }
    const isChopNode = e.kind === 'node' && (nodeDef(e.type).requires.kind === 'chop' || /tree|branch|wood/.test(e.type));
    const act: SpriteAction = e.kind === 'creature' ? 'attack' : isChopNode ? 'chop' : 'gather';
    const liveEntity = e.kind === 'creature' && mobPositionsRef.current[e.id]
      ? { ...e, lat: mobPositionsRef.current[e.id].lat, lng: mobPositionsRef.current[e.id].lng }
      : e;
    if (!w.interact(liveEntity)) { setActorTarget(null); return 'stop'; }
    if (e.kind === 'creature' && isRangedWeapon) {
      setRangedProjectile({
        id: `${e.id}-${Date.now()}`,
        from: p.pos,
        to: mobPositionsRef.current[e.id] ?? { lat: e.lat, lng: e.lng },
        kind: rangedInfo.category === 'bow' ? 'arrow' : rangedInfo.category === 'spear' ? 'spear' : 'stone',
      });
      const pScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const tScreen = { x: window.innerWidth / 2 + (playerFacing === 'left' ? -60 : 60), y: window.innerHeight / 2 - 35 };
      setProjectiles(prev => [
        ...prev.slice(-3),
        {
          id: crypto.randomUUID(),
          startX: pScreen.x,
          startY: pScreen.y - 10,
          targetX: tScreen.x,
          targetY: tScreen.y,
          kind: rangedInfo.category === 'bow' ? 'arrow' : rangedInfo.category === 'spear' ? 'spear' : 'stone',
        },
      ]);
    }
    if (e.kind === 'creature') {
      const isCrit = Math.random() < 0.28;
      const baseDmg = w.weapon ? 14 : 6;
      const dmgDealt = Math.round(isCrit ? baseDmg * 1.6 : baseDmg);
      triggerShake(isCrit ? 160 : 70);
      setBeastStrike({ id: e.id, at: Date.now() });

      const screenX = window.innerWidth / 2 + (Math.random() * 40 - 20);
      const screenY = window.innerHeight / 2 - 30;
      setDamageNumbers(prev => [
        ...prev.slice(-5),
        {
          id: crypto.randomUUID(),
          x: screenX,
          y: screenY,
          damage: dmgDealt,
          isCrit,
        },
      ]);
    }
    playAction(act, 900);
    playSample(workKind(e).sample);
    return 'continue';
  };
  const auto = useAutoAction((e) => autoStep(e));

  const [action, setAction] = useState<SpriteAction>('idle');
  const actionTimer = useRef<number>();
  const returnTimer = useRef<number>();
  const [actorTarget, setActorTarget] = useState<ActorTarget | null>(null);
  const playAction = (a: SpriteAction, ms: number) => {
    setAction(a); window.clearTimeout(actionTimer.current);
    actionTimer.current = window.setTimeout(() => setAction('idle'), ms);
  };
  const returnToCenter = () => {
    window.clearTimeout(returnTimer.current);
    setActorTarget(null);
    playAction('walk', 500);
  };
  const [playerFacing, setPlayerFacing] = useState<'right' | 'left'>('right');
  const lastPos = useRef(s.pos);
  useEffect(() => {
    const dLng = s.pos.lng - lastPos.current.lng;
    if (dLng < -0.000001) {
      setPlayerFacing('left');
    } else if (dLng > 0.000001) {
      setPlayerFacing('right');
    }
    if (lastPos.current.lat !== s.pos.lat || lastPos.current.lng !== s.pos.lng) {
      lastPos.current = s.pos;
      setAction(a => (a === 'idle' || a === 'pick_nose' || a === 'poop' ? 'walk' : a));
      window.clearTimeout(actionTimer.current);
      actionTimer.current = window.setTimeout(() => {
        // 6. 코파기: 걷다 멈췄을 때 20% 확률로 등장
        if (Math.random() < 0.20) {
          setAction('pick_nose');
          actionTimer.current = window.setTimeout(() => setAction('idle'), 2500);
        } else {
          setAction('idle');
        }
      }, 1500);
    }
  }, [s.pos]);
  useEffect(() => () => { window.clearTimeout(actionTimer.current); window.clearTimeout(returnTimer.current); }, []);

  // 5. 똥싸기 & 6. 코파기 대기 모션 제어
  const lastPoopAt = useRef<number>(0);
  useEffect(() => {
    if (action !== 'idle') return;
    const interval = window.setInterval(() => {
      setAction(current => {
        if (current !== 'idle') return current;
        const now = Date.now();
        const lastAte = s.lastAteAt ?? 0;
        const twoHours = 2 * 60 * 60 * 1000;

        // 5. 똥싸기: 음식 먹고 2시간 후에 대기할 때 가끔 (2시간 경과, 최근 배변 후 15분 이상, 40% 확률)
        if (lastAte > 0 && now - lastAte >= twoHours && now - lastPoopAt.current > 15 * 60 * 1000) {
          if (Math.random() < 0.4) {
            lastPoopAt.current = now;
            window.clearTimeout(actionTimer.current);
            actionTimer.current = window.setTimeout(() => setAction('idle'), 3500);
            toast('💩 속이 더부룩하여 볼일을 봅니다...', { duration: 3000 });
            return 'poop';
          }
        }

        // 6. 코파기: 대기할 때 20% 확률로 등장
        if (Math.random() < 0.20) {
          window.clearTimeout(actionTimer.current);
          actionTimer.current = window.setTimeout(() => setAction('idle'), 2500);
          return 'pick_nose';
        }

        return current;
      });
    }, 12000);

    return () => window.clearInterval(interval);
  }, [action, s.lastAteAt]);

  // 7. 신난다: 레벨업 시
  const prevLevel = useRef(s.level);
  useEffect(() => {
    if (s.level > prevLevel.current) {
      prevLevel.current = s.level;
      playAction('celebrate', 2500);
    }
  }, [s.level]);

  // 8. 피격: 타격 데미지 입을 때
  const hit = useHitPulse(s.hp);
  useEffect(() => {
    if (hit) {
      playAction('hurt', 500);
    }
  }, [hit]);

  // Return sprite to GPS center when the player really walks or the object leaves the radius.
  useEffect(() => {
    if (actorTarget && shouldReturnToCenter(s.pos, actorTarget, g.reach)) returnToCenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.pos, actorTarget]);

  const zone = s.terrainZones[zoneCellKey(s.pos)] ?? 'plains';
  const onSurfaceZone = (c: LatLng, z: typeof zone) => g.recordTerrainZone(zoneCellKey(c), z);
  const onSurfacePark = (c: LatLng, park: boolean) => g.recordPark(zoneCellKey(c), park);
  const actionReady = !realGps || gps.ready || gps.isIndoor;
  const gpsReadyRef = useRef(actionReady); gpsReadyRef.current = actionReady;
  // Auto pickup tech: gather one hand-gatherable node within 10m every few seconds.
  const autoRef = useRef({ g, ready: actionReady });
  autoRef.current = { g, ready: actionReady };
  const autoOn = hasAutoPickup(s.techs);
  const gathererActive = (s.tribe?.count ?? 0) > 0 && s.tribe?.classId === 'gatherer';
  useEffect(() => {
    if (!autoOn && !gathererActive) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const { g: w, ready } = autoRef.current;
      if (!ready || w.weight >= w.capacity) return;
      const p = w.state;
      const radius = gathererActive ? getTribeClass('gatherer').autoGatherRadiusM : AUTO_PICKUP_RADIUS_M;
      if (gathererActive) {
        const eggRadius = eggReachRadius(p.techs, p.techLevels);
        const nearEgg = eggSpawnsNear(p.pos, p.depleted, Date.now()).find(e => distanceM(p.pos, e) <= Math.min(radius, eggRadius));
        if (nearEgg && w.pickEgg(nearEgg)) return;
      }
      const canAutoGatherNode = (nodeType: Parameters<typeof nodeDef>[0]): boolean => {
        const d = nodeDef(nodeType);
        if (!d) return false;
        if (d.requires.kind === 'none') return true;
        // If node requires a tool (mining or chopping), player must have an equipped tool of sufficient tier
        if (!gathererActive) return false;
        const kind = d.requires.kind;
        const tools = [w.loadout.tool1, w.loadout.tool2].filter(Boolean);
        return tools.some(g => (ITEMS[g!.itemId]?.tool?.[kind] ?? 0) >= d.requires.tier);
      };

      const target = w.entities.find(e => e.kind === 'node'
        && canAutoGatherNode(e.type)
        && isNodeAvailable(e.id, e.type, p.depleted, Date.now())
        && distanceM(p.pos, e) <= radius);
      if (target) w.interact(target, { silent: true });
    }, gathererActive ? 2000 : AUTO_PICKUP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [autoOn, gathererActive]);
  const activateSkill = (id: Parameters<typeof g.useSkill>[0]) => {
    if (g.useSkill(id)) {
      playAction('attack', 900);
      playSample('strike');
      triggerShake(160);
      const playerScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      const shamanClass = s.shamanClass || s.village?.shamanClass;
      const followingPet = (s.pets ?? []).find(p => p.role === 'follow');
      const isSkull = followingPet ? (followingPet.name.includes('스컬') || followingPet.speciesId.includes('skull')) : false;

      const resolved = resolveEntitySkillVfx({
        skillId: id,
        shamanClass,
        petSpecies: followingPet?.speciesId,
        petLevel: followingPet?.level,
        isSkullDragon: isSkull,
      });

      if (resolved.isStoneBarrage) {
        // Primitive flint barrage: 3 fast stones fly in a spread towards enemy/front
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            const spreadX = (i - 1) * 32;
            setProjectiles(prev => [
              ...prev.slice(-4),
              {
                id: crypto.randomUUID(),
                startX: playerScreen.x,
                startY: playerScreen.y,
                targetX: playerScreen.x + 75 + spreadX,
                targetY: playerScreen.y - 85 - Math.abs(spreadX) * 0.4,
                kind: 'stone',
              },
            ]);
          }, i * 90);
        }
      } else if (resolved.vfxType) {
        setCombatVfxEvents(prev => [
          ...prev.slice(-3),
          {
            id: crypto.randomUUID(),
            type: resolved.vfxType!,
            x: playerScreen.x,
            y: playerScreen.y - 25,
          },
        ]);
      }
    }
  };
  const inPark = !!s.parkCells?.[zoneCellKey(s.pos)];
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const { setSanctuaries } = g;
  const nearShrines = useMemo(() => shrinesNear(s.pos, 600), [Math.round(s.pos.lat * 2000), Math.round(s.pos.lng * 2000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selShrine, setSelShrine] = useState<Shrine | null>(null);
  const [shrineWords, setShrineWords] = useState<string | null>(null);
  useEffect(() => { setSanctuaries([...landmarks.filter((l) => l.kind === 'shaman'), ...nearShrines].map((l) => ({ lat: l.lat, lng: l.lng }))); }, [landmarks, nearShrines, setSanctuaries]);
  const [selLandmark, setSelLandmark] = useState<Landmark | null>(null);
  const favs = useSurvivalFavorites();
  const activeTarget = favs.tracked
    ? { lat: favs.tracked.lat, lng: favs.tracked.lng, name: favs.tracked.name, isFav: true, id: favs.tracked.id }
    : expeditionTarget
    ? { lat: expeditionTarget.lat, lng: expeditionTarget.lng, name: '지정 목표 좌표', isFav: false, id: null }
    : null;
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [uiGuideOpen, setUiGuideOpen] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (deltaY < -35) {
      setPanel('base');
      setBaseTab('village');
    }
  };
  const mapBearing = compassOn && heading !== null ? heading : 0;
  const [shamanWords, setShamanWords] = useState<string | null>(null);
  const [dinoExpeditionOpen, setDinoExpeditionOpen] = useState(false);

  const [techTab, setTechTab] = useState<TechCategory>('general');
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 15_000); return () => clearInterval(t); }, []);
  const researchJobs = researchJobsOf(s);
  const techDone = researchJobs.some(j => isReady(j, nowTick));
  const baseDone = isReady(s.baseUpgrade, nowTick) || isReady(s.expedition ? { id: 'e', ...s.expedition } : null, nowTick);
  const noticed = useRef(new Set<string>());
  useEffect(() => {
    const fire = (key: string, title: string, body: string) => { if (noticed.current.has(key)) return; noticed.current.add(key); sendNotice(title, body, key); };
    researchJobs.filter(j => isReady(j, nowTick)).forEach(j => fire(`r${j.id}${j.readyAt}`, '연구 완료', `${TECHS.find(t => t.id === j.id)?.name ?? '기술'} 연구가 끝났어요. 기술 메뉴에서 습득하세요`));
    if (s.baseUpgrade && isReady(s.baseUpgrade, nowTick)) fire(`b${s.baseUpgrade.readyAt}`, '거점 공사 완료', '거점 메뉴에서 발전을 완료하세요');
    if (s.expedition && nowTick >= s.expedition.readyAt) fire(`e${s.expedition.readyAt}`, '원정대 귀환', '전리품과 정찰 보고서가 도착했어요');
  }, [nowTick, researchJobs, s.baseUpgrade, s.expedition]);
  const [selPeerId, setSelPeerId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [allies, setAllies] = useState<{ id: string; name: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('survival-allies-v1') ?? '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('survival-allies-v1', JSON.stringify(allies)); }, [allies]);
  const showBubble = (id: string, text: string) => {
    setBubbles(b => ({ ...b, [id]: text }));
    window.setTimeout(() => setBubbles(b => { const n = { ...b }; if (n[id] === text) delete n[id]; return n; }), 3000);
  };
  const gameSettings = useGameSettings();
  useEffect(() => { setBgmPlaying(gameSettings.bgm); return () => setBgmPlaying(false); }, [gameSettings.bgm]);
  useEffect(() => { if (hit.n > 0) { playSample('strike'); if (visibleEntities.some(e => e.kind === 'creature' && e.id === auto.job?.id)) playSample('beastAttack'); haptic(120); if (document.hidden) sendNotice('짐승의 공격!', '거점 밖에서 짐승에게 공격받고 있어요', 'beast-hit'); } }, [hit.n]); // eslint-disable-line react-hooks/exhaustive-deps
  // Beasts inside 10m (or chasing after being hit) strike the player first.
  const [aggroIds, setAggroIds] = useState<Set<string>>(() => new Set());
  const winterOn = gameSettings.winter;
  useCustomCatalog();
  const [hatched, setHatched] = useState<{ id: string; name: string; custom?: boolean; eggId?: string } | null>(null);
  const inventoryIcon = (id: ItemId) =>
    id === 'dino_egg' ? (
      <img src={eggArt(s.dinoEggs?.[0]?.id ?? 'egg')} alt="" className="pixelated h-6 w-6 object-contain" />
    ) : isCustomCulinaryItem(id) ? (
      <CulinaryDishIcon itemId={id} size={24} />
    ) : (
      <Sprite k={ITEMS[id].sprite} scale={0.75} />
    );
  const eggSpawns = useMemo(() => !g.inBase ? eggSpawnsNear(s.pos, s.depleted, Date.now()).filter(e => distanceM(s.pos, e) <= EGG_SPAWN_RADIUS_M) : [],
    [g.inBase, s.pos, s.depleted]); // eslint-disable-line react-hooks/exhaustive-deps
  const hatchDiscount = g.codexProgress?.hatchDiscountPct ?? 0;
  const readyEgg = (s.dinoEggs ?? []).find(e => eggReady(e, s.walkSteps ?? 0, hatchDiscount));
  useEffect(() => {
    if (!readyEgg || !g.inBase || hatched || (realGps && !gps.ready && !gps.isIndoor)) return;
    const baby = g.hatchEgg(readyEgg.id);
    if (baby) setHatched({ ...baby, eggId: readyEgg.id });
  }, [readyEgg?.id, g.inBase, hatched, gps.ready, gps.isIndoor]); // eslint-disable-line react-hooks/exhaustive-deps
  const [beastStrike, setBeastStrike] = useState<{ id: string; at: number } | null>(null);
  const [rangedProjectile, setRangedProjectile] = useState<{ id: string; from: LatLng; to: LatLng; kind: 'arrow' | 'stone' | 'spear' } | null>(null);
  const [mobPositions, setMobPositions] = useState<Record<string, LatLng>>({});
  const mobPositionsRef = useRef<Record<string, LatLng>>({});
  mobPositionsRef.current = mobPositions;
  const lastBeastStrike = useRef(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const w = gRef.current; const p = w.state; const t = Date.now();
      if (realGps && !gpsReadyRef.current) return;
      const curPosMap = mobPositionsRef.current;
      const nextPosMap: Record<string, LatLng> = {};
      const hostile: Extract<WorldEntity, { kind: 'creature' }>[] = [];

      for (const e of w.entities) {
        if (e.kind !== 'creature' || p.depleted[e.id]) continue;
        const curPos = curPosMap[e.id] ?? { lat: e.lat, lng: e.lng };
        const engaged = (p.damage[e.id] ?? 0) > 0;
        const dist = distanceM(p.pos, curPos);
        const isAggro = beastAggro(e.type, dist, {
          isNight: w.isNight,
          engaged,
          calm: (p.calmUntil?.[e.id] ?? 0) > t || w.inSanctuary,
        });
        if (isAggro) {
          hostile.push(e);
          // Chase toward player up to ~1.5m melee range (especially fast when hit by ranged bow/sling!)
          if (dist > 1.5) {
            const stepM = engaged ? Math.min(dist - 1.4, 3.6) : Math.min(dist - 1.5, 2.0);
            const ratio = stepM / Math.max(1, dist);
            nextPosMap[e.id] = {
              lat: curPos.lat + (p.pos.lat - curPos.lat) * ratio,
              lng: curPos.lng + (p.pos.lng - curPos.lng) * ratio,
            };
          } else {
            nextPosMap[e.id] = curPos;
          }
        } else {
          // Keep mobs firmly anchored at their original spawn coordinates on the map so they don't drift or wander
          nextPosMap[e.id] = { lat: e.lat, lng: e.lng };
        }
      }
      setMobPositions(nextPosMap);

      setAggroIds(prev => { const n = new Set(hostile.map(e => e.id)); return n.size === prev.size && [...n].every(x => prev.has(x)) ? prev : n; });
      const near = hostile
        .map(e => ({ e, d: distanceM(p.pos, nextPosMap[e.id] ?? e) }))
        .sort((a, b) => a.d - b.d)[0];
      if (!near || near.d > Math.max(w.reach, 12) || t - lastBeastStrike.current < BEAST_STRIKE_INTERVAL_MS) return;
      lastBeastStrike.current = t;
      setBeastStrike({ id: near.e.id, at: t });
      if (!document.hidden) playSample('beastAttack');
      const def = creatureDef(near.e.type);
      w.takeDamage(def.atk, true);
      toast.error(`💥 ${def.name}이(가) 공격했습니다! (-${def.atk})`, { id: 'beast-strike', duration: 1600 });
    }, 550);
    return () => window.clearInterval(id);
  }, [realGps]);
  const gRef = useRef(g); gRef.current = g;
  const [duelWith, setDuelWith] = useState<string | null>(null);
  const duelRef = useRef<string | null>(null); duelRef.current = duelWith;
  const [vassalLinks, setVassalLinks] = useState<Set<string>>(() => new Set());
  const pendingVassal = useRef(new Set<string>());
  const [vassalOffer, setVassalOffer] = useState<{ id: string; name: string } | null>(null);
  const [chatOffer, setChatOffer] = useState<{ id: string; name: string } | null>(null);
  const [chatPartners, setChatPartners] = useState<Set<string>>(() => new Set());
  const [pendingChat, setPendingChat] = useState<Set<string>>(() => new Set());
  const [chatLogs, setChatLogs] = useState<Record<string, PeerChatMessage[]>>({});
  const shareAllyLocation = (p: { id: string; name: string; lat: number; lng: number }) => {
    if (!favs.isFav(`ally-${p.id}`)) favs.toggle({ id: `ally-${p.id}`, name: `동료 ${p.name}`, lat: p.lat, lng: p.lng });
  };
  const bubbleView = (v: string) => v.startsWith('icon:')
    ? <img src={EMOTE_ICON[v.slice(5) as keyof typeof EMOTE_ICON]} alt="" className="h-8 w-8 [image-rendering:pixelated]" />
    : v;
  const peersRef = useRef<PeerPlayer[]>([]);
  const pendingAlly = useRef(new Set<string>());
  const onPeerEvent = (e: PeerEvent) => {
    const from = peersRef.current.find(p => p.id === e.from);
    if (e.type === 'emote') { showBubble(e.from, `icon:${e.emote}`); playSfx('emote'); haptic(40); }
    else if (e.type === 'chat-req') {
      setChatOffer({ id: e.from, name: e.name });
      playSfx('notify');
      haptic([80, 60, 80]);
      sendNotice('대화 신청', `${e.name}님이 대화를 신청합니다`, 'chat-req');
    } else if (e.type === 'chat-res') {
      setPendingChat(prev => { const n = new Set(prev); n.delete(e.from); return n; });
      playSfx('notify');
      if (e.accept) {
        setChatPartners(prev => new Set(prev).add(e.from));
        setSelPeerId(e.from);
        toast.success(`${e.name}님이 대화를 수락했습니다! 이제 대화를 나눌 수 있습니다.`);
      } else {
        toast(`${e.name}님이 대화 신청을 정중히 거절했습니다`);
      }
    } else if (e.type === 'chat-msg') {
      setChatPartners(prev => new Set(prev).add(e.from));
      showBubble(e.from, `💬 ${e.text}`);
      playSfx('emote');
      setChatLogs(prev => ({
        ...prev,
        [e.from]: [
          ...(prev[e.from] ?? []),
          { id: `${Date.now()}-${Math.random()}`, senderId: e.from, senderName: e.name, text: e.text, at: Date.now() },
        ].slice(-30),
      }));
    }
    else if (e.type === 'duel') {
      if (allies.some(a => a.id === e.from)) return;
      setDuelWith(e.from); playSfx('warn'); haptic([200, 100, 200]); sendNotice('전투 신청', `${e.name}님이 전투를 걸었습니다`, 'duel');
      toast.error(`${e.name}님이 전투를 걸었습니다! 공격하거나 도망치세요. ${DUEL_MAX_DISTANCE_M}m 멀어지면 전투가 끝납니다.`, { duration: 6000 });
    } else if (e.type === 'duel-end') {
      if (duelRef.current === e.from) { setDuelWith(null); toast('전투가 끝났습니다'); }
    } else if (e.type === 'vassal-req') {
      setVassalOffer({ id: e.from, name: e.name }); playSfx('notify'); haptic([80, 60, 80]);
    } else if (e.type === 'vassal-res') {
      if (!pendingVassal.current.delete(e.from)) return;
      playSfx('notify'); haptic(80);
      if (e.accept) { setVassalLinks(v => new Set(v).add(e.from)); if (from) shareAllyLocation(from); toast.success(`${e.name}님이 부하가 되었습니다`); }
      else toast(`${e.name}님이 부하 임명을 거부했습니다`);
    }
    else if (e.type === 'attack') {
      // Attacks only count inside an accepted duel with that player, in range.
      if (!from || duelRef.current !== e.from || distanceM(s.pos, from) > g.reach * 1.5) return;
      g.takeDamage(Math.min(30, e.dmg));
      haptic([100, 50, 100]);
      toast.error(`${from.name}에게 공격받았습니다!`);
    } else if (e.type === 'ally') {
      if (allies.some(x => x.id === e.from)) return;
      if (pendingAlly.current.has(e.from)) { pendingAlly.current.delete(e.from); setAllies(a => [...a, { id: e.from, name: e.name }]); if (from) shareAllyLocation(from); toast.success(`${e.name}님과 동맹을 맺었습니다`); return; }
      toast(`${e.name}님이 동맹을 제안했습니다`, { action: { label: '수락', onClick: () => {
        setAllies(a => a.some(x => x.id === e.from) ? a : [...a, { id: e.from, name: e.name }]);
        if (from) shareAllyLocation(from);
        presence.send({ type: 'ally', to: e.from, name: presence.name });
      } } });
      // Auto-complete if we already proposed to them.
    }
  };
  const presence = useSurvivalPresence(realGps ? (gps.ready || gps.isIndoor) : true, s.pos, s.level, onPeerEvent, chiefName, s.base);
  peersRef.current = presence.peers;
  const selPeer = presence.peers.find(p => p.id === selPeerId) ?? null;

  // Duel ends when the opponent leaves or is farther than DUEL_MAX_DISTANCE_M.
  useEffect(() => {
    if (!duelWith) return;
    const op = presence.peers.find(p => p.id === duelWith);
    if (op && distanceM(s.pos, op) <= DUEL_MAX_DISTANCE_M) return;
    if (op) presence.send({ type: 'duel-end', to: op.id });
    setDuelWith(null);
    toast(`상대와 ${DUEL_MAX_DISTANCE_M}m 이상 멀어져 전투가 끝났습니다`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelWith, presence.peers, s.pos]);

  // Vassal links + daily tribute (pay as vassal, collect as lord). Real GPS + signed-in only.
  useEffect(() => {
    if (!user || !realGps) return;
    let cancelled = false;
    const run = async () => {
      try {
        const { data: links, error: e0 } = await supabase.from('survival_vassals').select('vassal_id,lord_id');
        if (e0) throw e0;
        if (!cancelled) setVassalLinks(new Set((links ?? []).map(l => l.vassal_id === user.id ? l.lord_id : l.vassal_id)));
        const { data: paid, error: e1 } = await supabase.rpc('pay_survival_tribute');
        if (e1) throw e1;
        const t = paid as { item_id: string | null; lord_name: string } | null;
        if (!cancelled && t?.item_id && t.item_id in ITEMS) {
          const id = t.item_id as ItemId;
          gRef.current.adjustStorage([], [{ itemId: id, count: 1 }]);
          toast(`주인 ${t.lord_name}에게 ${ITEMS[id].name} 1개를 상납했습니다`);
        }
        const { data: got, error: e2 } = await supabase.rpc('claim_survival_tributes');
        if (e2) throw e2;
        const rows = (got ?? []).filter(r => r.item_id in ITEMS);
        if (!cancelled && rows.length) {
          gRef.current.adjustStorage(rows.map(r => ({ itemId: r.item_id as ItemId, count: r.count })));
          rows.forEach(r => toast.success(`부하 ${r.vassal_name}이(가) ${ITEMS[r.item_id as ItemId]?.name ?? r.item_id} ${r.count}개를 거점에 상납했습니다`));
          playSfx('notify'); haptic(80);
        }
      } catch (err) { console.warn('[survivalTribute]', err); }
    };
    const t0 = window.setTimeout(run, 5000);
    const iv = window.setInterval(run, 10 * 60_000);
    return () => { cancelled = true; window.clearTimeout(t0); window.clearInterval(iv); };
  }, [user?.id, realGps]);

  const acceptVassal = async (accept: boolean) => {
    const o = vassalOffer; setVassalOffer(null);
    if (!o) return;
    if (accept) {
      try {
        const { data, error } = await supabase.rpc('become_survival_vassal', { _lord: o.id, _lord_name: o.name, _vassal_name: presence.name });
        if (error || !data) throw error ?? new Error('rejected');
        setVassalLinks(v => new Set(v).add(o.id));
        const lord = presence.peers.find(p => p.id === o.id); if (lord) shareAllyLocation(lord);
        toast.success(`${o.name}님의 부하가 되었습니다. 매일 거점 물품 1개가 상납됩니다`);
      } catch (err) {
        console.warn('[survivalVassal]', err);
        toast.error('부하 등록에 실패했어요. 잠시 후 다시 시도해 주세요');
        presence.send({ type: 'vassal-res', to: o.id, name: presence.name, accept: false });
        return;
      }
    } else toast('부하 임명을 거부했습니다');
    presence.send({ type: 'vassal-res', to: o.id, name: presence.name, accept });
  };
  const attackPeer = () => {
    if (!selPeer || duelWith !== selPeer.id) return;
    const dmg = PVP_BASE_DAMAGE + (g.weapon ? ITEMS[g.weapon.itemId]?.weapon?.atk ?? 0 : 0);
    presence.send({ type: 'attack', to: selPeer.id, dmg });
    setActorTarget({ lat: selPeer.lat, lng: selPeer.lng, anchor: s.pos });
    playAction('attack', 900);
    window.clearTimeout(returnTimer.current);
    returnTimer.current = window.setTimeout(returnToCenter, 900 + ACTOR_IDLE_RETURN_MS);
    toast(`${selPeer.name}을(를) 공격했습니다 (-${dmg})`);
    setSelPeerId(null);
  };

  return (
    <ErrorBoundary fallbackTitle="선사시대 월드 시뮬레이터 (오류 방어)">
      <ContextThemeWrapper
      mode={contextMode}
      onSelectMode={handleSelectContextMode}
      hp={s.hp}
      maxHp={g.maxHp}
      hunger={s.hunger}
      weight={g.weight}
      capacity={g.capacity}
      level={s.level}
      weapon={g.weapon}
      backpack={s.backpack}
      storage={s.storage}
      baseLevel={s.base?.level ?? 1}
      palisade={s.palisade}
      pets={s.pets ?? []}
      dinoEggs={s.dinoEggs ?? []}
      walkSteps={s.walkSteps ?? 0}
      crew={crew}
      expeditionLevel={g.expeditionLevelInfo.level}
      expeditionDistanceM={(s.expeditionDistanceM ?? 0) + (s.walkSteps ?? 0) * 20}
      lastExpeditionLog={s.expeditionLogs?.[s.expeditionLogs.length - 1]?.text}
      onScanNearby={handleOpenRadar}
      onOpenPetFusion={() => {
        setBaseTab('pets');
        setPanel('base');
      }}
      onStartDinoHunt={() => setFieldExp(true)}
      onMoraleExpedition={g.rallyExpedition}
      onRecallExpedition={g.recallExpedition}
      onOpenVillageModal={(m) => {
        setBaseTab('village');
        setPanel('base');
      }}
    >
      <div className={`relative h-[100dvh] w-full overflow-hidden font-pixel ${shaking ? 'animate-combat-shake' : ''}`}>
      {view === 'expedition' && s.base && <div className="pointer-events-none fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 flex flex-col items-center gap-1">
        {fieldExp && <div className="pixel-panel pointer-events-auto max-h-[44dvh] w-full max-w-md overflow-y-auto bg-card p-1.5">{expeditionControls}</div>}
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFieldExp(v => !v)}
            className="pixel-btn flex-1 flex items-center justify-center gap-1.5 bg-primary py-2 px-2.5 text-xs text-primary-foreground font-bold shadow"
          >
            <Compass className="!h-4 !w-4 shrink-0" />
            <span>{fieldExp ? '원정 접기' : crew ? '원정 지휘' : '원정 보내기'}</span>
          </button>
          <button
            type="button"
            onClick={() => setTribeInfoModalOpen(true)}
            className="pixel-btn flex items-center gap-1.5 rounded border-2 border-primary/50 bg-card px-2.5 py-1.5 text-xs text-foreground hover:bg-accent active:scale-95 shadow-md"
          >
            <div className="flex -space-x-1 items-center">
              <span className="text-sm drop-shadow">{activeTribeClass.icon}</span>
              {crew && (s.tribe?.count ?? 1) > 1 && (
                <span className="text-[11px] drop-shadow">🏹</span>
              )}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="font-bold text-[11px] truncate max-w-[130px]">
                {crew ? `${activeTribeClass.name} (HP ${crew.hp})` : `${activeTribeClass.name} Lv.${s.tribe?.trainLevel ?? 1}`}
              </span>
              <span className="text-[9px] text-muted-foreground">
                {crew ? `원정 분대 (${s.tribe?.count ?? 3}명)` : `대기 중 · ${s.tribe?.count ?? 1}명`}
              </span>
            </div>
            <span className="text-[10px] text-primary font-bold ml-1">정보 &gt;</span>
          </button>
        </div>
      </div>}
      <StoryTutorialModal
        open={showStoryTutorial}
        onComplete={() => setShowStoryTutorial(false)}
        onSkip={() => setShowStoryTutorial(false)}
        finishLabel="콜로니온 월드 입장하기"
      />
      <NicknameSetupModal
        open={showNicknameModal}
        defaultName={chiefName}
        onConfirm={handleConfirmNickname}
      />
      <SurvivalTutorialOverlay
        open={!showNicknameModal && !isTutorialCompleted && tutorialStep !== null && tutorialStep !== 'completed'}
        step={tutorialStep ?? 'phase1_meet'}
        collectedBranches={collectedBranches}
        onSetStep={setTutorialStep}
        onEnsureStarterCamp={g.ensureStarterCamp}
        onRecruitAmbacho={g.recruitAmbacho}
        onCompleteTutorial={handleCompleteTutorial}
      />
      <AnimatePresence>{showOpening && <ColonionOpening onEnter={enterWorld} />}</AnimatePresence>
      {(() => {
        const activeMapCenter = viewFocus(view, baseSite, { pos: s.pos, base: s.base, outpost: s.outpost, crew: crew?.pos });
        return (
          <TerrainMap center={activeMapCenter} visionM={g.vision} explored={s.explored} onTap={onTap} zone={zone} onSurfaceZone={onSurfaceZone} onSurfacePark={onSurfacePark} onLandmarks={setLandmarks} bearing={compassOn && heading !== null ? heading : 0}>
            {(project, mpp) => (
              <>
                <MapFoliageOverlay
                  center={activeMapCenter}
                  playerPos={s.pos}
                  basePos={s.base}
                  project={project}
                  metersPerPx={mpp}
                />
                {crew && <ExpeditionMarker crew={crew} project={project} members={crew.members ?? s.tribe?.count ?? 1} tribeClass={activeTribeClassId} />}
                {crew && view === 'expedition' && <ExpeditionJoystick crew={crew} candidates={g.crewNearby} project={project} onManual={g.setCrewManual} onSteer={g.steerCrew} onCommand={g.commandCrew} onAct={g.crewAct} onHeal={g.healCrew} />}
                {view === 'user' && (
                  <TutorialGroundBranches
                    project={project}
                    branches={tutorialBranches}
                    onPick={handlePickTutorialBranch}
                  />
                )}
                {view === 'user' && eggSpawns.map(egg => {
                  const p = project(egg);
                  const eggZIndex = computeEntityZIndex(egg.lat, activeMapCenter.lat);
                  return (
                    <button key={egg.id} type="button" aria-label="신비한 픽셀 공룡 알" onClick={ev => { ev.stopPropagation(); g.pickEgg(egg); }}
                      className="pointer-events-auto absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-full items-center justify-center group cursor-pointer"
                      style={{ left: p.x, top: p.y, zIndex: eggZIndex }}>
                      {/* Ground circular golden glow aura matching reference image */}
                      <div aria-hidden className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-3 rounded-full bg-amber-400/50 blur-[3px] animate-pulse" />
                      {/* Sparkle stars */}
                      <span aria-hidden className="pointer-events-none absolute -top-1 -right-1 text-[11px] animate-bounce select-none">✨</span>
                      <span aria-hidden className="pointer-events-none absolute bottom-1 -left-1 text-[9px] animate-pulse select-none">✨</span>
                      <motion.img src={eggArt(egg.id)} alt="" className="pixelated h-10 w-10 object-contain drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]" animate={reducedMotion ? undefined : { y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} />
                    </button>
                  );
                })}
            {activeTarget && (() => {
              const from = project(s.pos);
              const to = project(activeTarget);
              const d = distanceM(s.pos, activeTarget);
              const distStr = d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${Math.round(d)}m`;
              return (
                <>
                  <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="#34d399"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />
                    <circle cx={to.x} cy={to.y} r="8" fill="#10b981" fillOpacity="0.25" stroke="#34d399" strokeWidth="2" />
                    <circle cx={to.x} cy={to.y} r="4" fill="#34d399" stroke="#064e3b" strokeWidth="1.5" />
                  </svg>
                  <div
                    className="pointer-events-auto absolute z-20 flex -translate-x-1/2 -translate-y-full flex-col items-center pb-1"
                    style={{ left: to.x, top: to.y }}
                  >
                    <div className="flex items-center gap-1.5 rounded border border-emerald-400 bg-[#0d1911]/95 px-2 py-1 text-white shadow-[0_4px_12px_rgba(16,185,129,0.4)] font-pixel text-xs">
                      <span>📍</span>
                      <span className="font-bold text-emerald-200 max-w-[120px] truncate">{activeTarget.name}</span>
                      <span className="rounded bg-emerald-900/80 px-1 text-[10px] text-emerald-300 font-mono font-bold">
                        {distStr}
                      </span>
                      <button
                        type="button"
                        aria-label="목표 좌표 안내 해제"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeTarget.isFav && activeTarget.id) favs.setTrackedId(null);
                          setExpeditionTarget(null);
                          toast('목표 좌표 안내를 해제했습니다');
                        }}
                        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded hover:bg-emerald-800 text-emerald-300 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-emerald-400" />
                  </div>
                </>
              );
            })()}
            {s.base && g.baseDef && (() => {
              const p = project(s.base); const r = 10 / mpp;
              return (
                <div className="pointer-events-none absolute" style={{ left: p.x, top: p.y, transform: 'translate(-50%,-50%)' }}>
                  <div className="rounded-full border-2 border-dashed border-primary/70 bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.2)]" style={{ width: r * 2, height: r * 2 }} />
                  <button
                    type="button"
                    aria-label="거점 마을 들어가기"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setBaseTab('village');
                      setPanel('base');
                    }}
                    className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  >
                    <BaseFortressOverlay baseLevel={s.base.level} hasPalisade={!!s.palisade} hasAltar={!!s.altar} />
                  </button>
                </div>
              );
            })()}
            {s.outpost && (() => {
              const p = project(s.outpost);
              const zIndex = computeEntityZIndex(s.outpost.lat, activeMapCenter.lat);
              return (
                <div className="pointer-events-none absolute flex flex-col items-center" style={{ left: p.x, top: p.y, transform: 'translate(-50%,-100%)', zIndex }}>
                  <div className="relative">
                    <div aria-hidden className="pointer-events-none absolute left-1/2 bottom-0 h-2 w-8 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground/30 blur-[2px]" />
                    <Sprite k="base-outpost" scale={1.2} />
                  </div>
                  <span className="rounded bg-background px-1 text-[10px]">전진기지</span>
                </div>
              );
            })()}
            {landmarks.filter((l) => l.kind === 'shaman' && distanceM(s.pos, l) <= g.vision + SANCTUARY_RADIUS_M).map((l) => {
              const p = project(l); const r = SANCTUARY_RADIUS_M / mpp;
              return <div key={`sanct-${l.id}`} aria-hidden className="pointer-events-none absolute rounded-full border-2 border-primary/60 bg-primary/5 shadow-[0_0_18px_hsl(var(--primary)/0.5)]" style={{ left: p.x, top: p.y, width: r * 2, height: r * 2, transform: 'translate(-50%,-50%)' }} />;
            })}
            {nearShrines.filter((sh) => distanceM(s.pos, sh) <= g.vision + SHRINE_AURA_M).map((sh) => {
              const p = project(sh); const r = SHRINE_AURA_M / mpp;
              const awake = !!s.shrines?.found.includes(sh.id);
              const shrineZIndex = computeEntityZIndex(sh.lat, activeMapCenter.lat);
              return (
                <div key={sh.id} className="absolute" style={{ left: p.x, top: p.y, transform: 'translate(-50%,-50%)', zIndex: shrineZIndex }}>
                  <div aria-hidden className={`pointer-events-none rounded-full border-[3px] border-[hsl(var(--sacred))] bg-[hsl(var(--sacred)/0.18)] shadow-[0_0_28px_hsl(var(--sacred)/0.8)] ${awake ? 'animate-pulse' : 'opacity-60'}`} style={{ width: r * 2, height: r * 2 }} />
                  <button type="button" aria-label={sh.name} onClick={(ev) => { ev.stopPropagation(); setShrineWords(null); setSelShrine(sh); }}
                    className="pointer-events-auto absolute left-1/2 top-1/2 flex w-max -translate-x-1/2 -translate-y-full flex-col items-center">
                    <div className="relative">
                      <div aria-hidden className="absolute bottom-1 left-1/2 h-3 w-20 -translate-x-1/2 rounded-full bg-foreground/30 blur-[3px]" />
                      <img src={dolmenShrine} alt="" width={96} height={85} className="relative w-28 max-w-none [image-rendering:pixelated]" />
                      <img src={melchizedekImg} alt="멜키체덱" width={26} height={54} className="absolute -bottom-3 left-1/2 w-[30px] max-w-none -translate-x-1/2 [image-rendering:pixelated] drop-shadow-[0_0_6px_hsl(var(--sacred))]" />
                    </div>
                    <span className="mt-3 whitespace-nowrap rounded bg-primary px-1 text-[10px] text-primary-foreground">{awake ? '고석 성소' : '잠든 성소'}</span>
                  </button>
                </div>
              );
            })}
            {landmarks.filter((l) => distanceM(s.pos, l) <= g.vision).map((l) => {
              const p = project(l); const info = LANDMARK_INFO[l.kind];
              const landmarkZIndex = computeEntityZIndex(l.lat, activeMapCenter.lat);
              return (
                <button key={l.id} type="button" aria-label={info.name} data-landmark={l.kind} onClick={(ev) => { ev.stopPropagation(); setShamanWords(null); setSelLandmark(l); }}
                  className="pointer-events-auto absolute flex min-h-11 min-w-11 flex-col items-center opacity-40 hover:opacity-100 transition-opacity"
                  style={{ left: p.x, top: p.y, transform: 'translate(-50%,-100%)', zIndex: landmarkZIndex }}>
                  <div className="rounded-full bg-primary/30 p-0.5 shadow-[0_0_12px_hsl(var(--primary))]"><Sprite k={info.sprite} scale={l.kind === 'shaman' || l.kind === 'trader' ? LANDMARK_FEATURE_SCALE : 1} /></div>
                  <span className="whitespace-nowrap rounded bg-primary/80 px-1 text-[10px] text-primary-foreground">{l.origin ?? info.name}</span>
                </button>
              );
            })}
            {rangedProjectile && (() => {
              const fromPt = project(rangedProjectile.from);
              const toPt = project(rangedProjectile.to);
              const dx = toPt.x - fromPt.x;
              const dy = toPt.y - fromPt.y;
              const distPx = Math.hypot(dx, dy) || 1;
              const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
              const durationSec = Math.min(0.65, Math.max(0.25, distPx / 380));

              return (
                <div key={rangedProjectile.id} className="pointer-events-none absolute inset-0 z-30">
                  <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                    <line
                      x1={fromPt.x}
                      y1={fromPt.y - 12}
                      x2={toPt.x}
                      y2={toPt.y - 12}
                      stroke={rangedProjectile.kind === 'arrow' ? '#fde047' : rangedProjectile.kind === 'spear' ? '#67e8f9' : '#cbd5e1'}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      className="opacity-40"
                    />
                  </svg>
                  <motion.div
                    aria-hidden
                    className="absolute flex items-center justify-center drop-shadow-[0_0_10px_rgba(250,204,21,0.9)]"
                    style={{
                      left: fromPt.x,
                      top: fromPt.y - 12,
                      transformOrigin: 'center center',
                    }}
                    initial={{
                      x: 0,
                      y: 0,
                      scale: 0.9,
                      opacity: 1,
                    }}
                    animate={{
                      x: dx,
                      y: dy,
                      scale: [0.9, 1.2, 1.05],
                      opacity: [1, 1, 0.9],
                    }}
                    transition={{ duration: durationSec, ease: 'easeOut' }}
                  >
                    {rangedProjectile.kind === 'spear' || rangedProjectile.kind === 'arrow' ? (
                      <img
                        src={url('item-flint-spear')}
                        alt="투창/화살"
                        className="pixelated h-8 w-8 object-contain drop-shadow-[0_0_8px_rgba(250,204,21,0.9)] filter brightness-110 select-none"
                        style={{
                          transform: `rotate(${angleDeg + 45}deg)`,
                          transformOrigin: 'center center',
                        }}
                      />
                    ) : (
                      <motion.img
                        src={url('item-flint')}
                        alt="부싯돌/돌멩이"
                        animate={{ rotate: 720 }}
                        transition={{ duration: durationSec, ease: 'linear' }}
                        className="pixelated h-6 w-6 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.85)] select-none"
                      />
                    )}
                  </motion.div>
                </div>
              );
            })()}
            {visibleEntities.map((e) => {
              const liveCoord = e.kind === 'creature' && mobPositions[e.id] ? mobPositions[e.id] : e;
              const p = project(liveCoord);
              const entityZIndex = computeEntityZIndex(liveCoord.lat, activeMapCenter.lat);
              const sprite = e.kind === 'node' ? nodeDef(e.type).sprite : creatureDef(e.type).sprite;
              const name = e.kind === 'node' ? nodeDef(e.type).name : creatureDef(e.type).name;
              const engaged = crew?.target?.id === e.id;
              const combatHit = expeditionHit?.target.id === e.id ? expeditionHit : undefined;
              const petHit = g.petHits.find(h => h.target.id === e.id && Date.now() - h.at < 1800);
              const dmg = e.kind === 'creature' ? s.damage[e.id] : engaged ? crew.damage : s.damage[e.id];
              const creature = e.kind === 'creature' ? creatureDef(e.type) : null;
              const remainingHp = creature ? Math.max(0, creature.hp - (dmg ?? 0)) : 0;
              const boss = e.kind === 'creature' && !!creatureDef(e.type).boss;
              const isHeadbutting = e.kind === 'creature' && beastStrike?.id === e.id && Date.now() - beastStrike.at < 950;
              const mePt = project(s.pos);
              const faceLeft = e.kind === 'creature' && mePt.x < p.x;
              return (
                <button key={e.id} type="button" aria-label={name} onClick={(ev) => { ev.stopPropagation(); tapEntity(e); }}
                  data-resource-id={e.id} data-lat={liveCoord.lat} data-lng={liveCoord.lng}
                  className="pointer-events-auto absolute flex min-h-11 min-w-11 flex-col items-center"
                  style={{ left: p.x, top: p.y, transform: 'translate(-50%,-100%)', zIndex: entityZIndex }}>
                  <div className="relative">
                  {creature && (creature.temper !== 'passive' || engaged || (dmg ?? 0) > 0) && <div data-creature-ring={e.id} aria-hidden className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed ${aggroIds.has(e.id) || engaged || (dmg ?? 0) > 0 ? 'border-destructive bg-destructive/10' : 'border-destructive/40'}`} style={{ width: (CREATURE_RING_RADIUS_M / mpp) * 2, height: (CREATURE_RING_RADIUS_M / mpp) * 2 }} />}
                  <div aria-hidden className="pointer-events-none absolute left-1/2 bottom-0 h-2 w-8 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground/30 blur-[2px]" /><motion.div key={`${e.id}:${combatHit?.at ?? (isHeadbutting ? beastStrike?.at : dmg ?? 0)}`} data-creature-strike={combatHit?.at ?? (isHeadbutting ? beastStrike?.at : undefined)} className={g.isNight ? '' : 'brightness-110 contrast-110 drop-shadow-[0_0_3px_hsl(var(--background))]'}
                    animate={(() => {
                      if (reducedMotion) return { x: 0, y: 0, rotate: 0, scale: 1 };
                      if (combatHit && crew) {
                        const actor = expeditionActorPoint(crew, project);
                        const dx = actor.x - p.x, dy = actor.y - p.y, len = Math.hypot(dx, dy) || 1;
                        return {
                          x: [0, (-dx / len) * 10, (dx / len) * 28, 0],
                          y: [0, (-dy / len) * 10, (dy / len) * 28, 0],
                          rotate: [0, -18, 360, 0],
                          scale: [1, 0.92, 1.22, 1],
                        };
                      }
                      // Spin & headbutt charge toward player then snap back!
                      if (isHeadbutting) {
                        const dx = mePt.x - p.x;
                        const dy = mePt.y - p.y;
                        const len = Math.hypot(dx, dy) || 1;
                        const chargeDist = Math.min(48, Math.max(24, len * 0.72));
                        const windX = (-dx / len) * 10;
                        const windY = (-dy / len) * 10;
                        const hitX = (dx / len) * chargeDist;
                        const hitY = (dy / len) * chargeDist;
                        const spinDir = dx < 0 ? -360 : 360;
                        return {
                          x: [0, windX, hitX, 0],
                          y: [0, windY - 6, hitY, 0],
                          rotate: [0, dx < 0 ? 25 : -25, spinDir, 0],
                          scale: [1, 0.9, 1.26, 1],
                        };
                      }
                      if (aggroIds.has(e.id)) {
                        const dx = mePt.x - p.x;
                        const dy = mePt.y - p.y;
                        const len = Math.hypot(dx, dy) || 1;
                        const stepX = (dx / len) * Math.min(20, len * 0.45);
                        const stepY = (dy / len) * Math.min(20, len * 0.45);
                        return {
                          x: [0, -stepX * 0.25, stepX, 0],
                          y: [0, -4, stepY, 0],
                          rotate: [0, dx < 0 ? 15 : -15, dx < 0 ? -35 : 35, 0],
                          scale: [1, 1.08, 1.15, 1],
                        };
                      }
                      if (dmg) return { x: [0, -5, 5, -3, 3, 0], y: 0, rotate: [0, -12, 12, 0], scale: 1 };
                      return { x: e.kind === 'creature' ? [0, 3, -3, 0] : 0, y: e.kind === 'creature' ? [0, -4, 0] : 0, rotate: 0, scale: 1 };
                    })()}
                    transition={combatHit || isHeadbutting ? { duration: 0.68, times: [0, 0.22, 0.58, 1], ease: 'easeInOut' } : aggroIds.has(e.id) && !reducedMotion ? { repeat: Infinity, duration: 1.05 } : dmg ? { duration: 0.35 } : { repeat: reducedMotion ? 0 : Infinity, duration: 1.4 }}>
                    <HitReactionWrapper hit={!!(combatHit || isHeadbutting || (dmg && dmg > 0))}>
                      <div className={boss ? 'scale-150 rounded-full ring-2 ring-destructive shadow-[0_0_18px_hsl(var(--destructive))]' : ''} style={{ transform: faceLeft ? 'scaleX(-1)' : undefined }}>
                        {e.kind === 'creature'
                          ? <CreatureSprite key={e.type} type={e.type} fallbackUrl={url(sprite)} width={SPRITE_META[sprite].w} height={SPRITE_META[sprite].h}
                              attacking={!!combatHit?.counterDamage || !!petHit?.counterDamage || isHeadbutting} />
                          : <Sprite k={sprite} />}
                      </div>
                    </HitReactionWrapper>
                  </motion.div>{combatHit && <CombatImpact stamp={combatHit.at} damage={combatHit.damage} />}</div>
                  {(s.calmUntil?.[e.id] ?? 0) > Date.now() && <span className="bg-primary text-[10px] text-primary-foreground">진정됨</span>}
                  {boss ? <span className="mt-2 rounded bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">우두머리</span> : null}
                  {creature && (aggroIds.has(e.id) || (dmg ?? 0) > 0) && !boss && (
                    <span className="mt-0.5 rounded bg-destructive/90 px-1 text-[9px] font-bold text-destructive-foreground">
                      {(dmg ?? 0) > 0 ? '💢 추격 중!' : '⚠️ 선공 접근'}
                    </span>
                  )}
                  {creature ? <div className="mt-1 w-20 rounded bg-background/90 px-1 text-center text-[10px]" aria-label={`${name} 체력 ${remainingHp}/${creature.hp}, 공격력 ${creature.atk}`}>
                    <div className="flex items-center gap-1"><HpBar value={remainingHp} max={creature.hp} /></div>
                    <span>{remainingHp}/{creature.hp} · 공격 {creature.atk}</span>
                  </div> : auto.job?.id === e.id ? <span className="rounded bg-background/80 px-1 text-[10px]">{auto.job.label}</span> : null}
                </button>
              );
            })}
            {expeditionHit?.killed && !visibleEntities.some(e => e.id === expeditionHit.target.id) && (() => {
              const p = project(expeditionHit.target);
              return <div className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-full" style={{ left: p.x, top: p.y }}><CombatImpact stamp={expeditionHit.at} damage={expeditionHit.damage} defeated /></div>;
            })()}
            {presence.peers.filter((pr) => distanceM(s.pos, pr) <= g.vision).map((pr) => {
              const p = project(pr);
              const ally = allies.some(a => a.id === pr.id);
              const prZIndex = computeEntityZIndex(pr.lat, activeMapCenter.lat);
              return (
                <button key={pr.id} type="button" aria-label={`${pr.name} 상호작용`} onClick={(ev) => { ev.stopPropagation(); setSelPeerId(pr.id); }}
                  className="pointer-events-auto absolute flex min-h-11 min-w-11 flex-col items-center"
                  style={{ left: p.x, top: p.y, transform: 'translate(-50%,-100%)', zIndex: prZIndex }}>
                  {bubbles[pr.id] && <span className="whitespace-nowrap rounded bg-card px-1.5 text-[11px]">{bubbleView(bubbles[pr.id])}</span>}
                  <div className="relative"><div aria-hidden className="pointer-events-none absolute left-1/2 bottom-0 h-2 w-8 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground/30 blur-[2px]" /><CharacterSprite height={PLAYER_SPRITE_HEIGHT} className="opacity-90 hue-rotate-90" /></div>
                  <span className={`rounded px-1 text-[10px] ${ally ? 'bg-primary text-primary-foreground' : 'bg-background/80'}`}>{pr.name}</span>
                </button>
              );
            })}
            {(() => {
              const p = project(s.pos); const r = g.reach / mpp;
              const playerZIndex = computeEntityZIndex(s.pos.lat, activeMapCenter.lat);
              return (
                <div className="pointer-events-none absolute" style={{ left: p.x, top: p.y, transform: 'translate(-50%,-50%)', zIndex: playerZIndex }}>
                  {g.skillEffect && Date.now() - g.skillEffect.at < 1200 && <div className="absolute left-1/2 top-1/2"><SkillEffect id={g.skillEffect.id} stamp={g.skillEffect.at} radius={r} /></div>}
                  {(s.companions ?? []).some(c => c.kind === 'wolf') && <div className="absolute left-1/2 top-1/2 translate-x-5"><Sprite k="mob-wolf" scale={0.7} /></div>}
                  <div className="rounded-full border border-primary/60" style={{ width: r * 2, height: r * 2 }} />
                  {(() => {
                    // Visual-only reach offset: subtle step towards target so character strikes without flying wildly
                    const t = actorTarget ? project(actorTarget) : p;
                    const rawDx = (t.x - p.x) * 0.7, rawDy = (t.y - p.y) * 0.7;
                    const len = Math.hypot(rawDx, rawDy) || 1;
                    const maxReach = 28;
                    const dx = actorTarget ? (len > maxReach ? (rawDx / len) * maxReach : rawDx) : 0;
                    const dy = actorTarget ? (len > maxReach ? (rawDy / len) * maxReach : rawDy) : 0;
                    const isFacingLeft = actorTarget ? rawDx < -1 : playerFacing === 'left';
                    return (
                      <div className="absolute left-1/2 top-1/2">
                        <div className="-translate-x-1/2 -translate-y-full">
                          {auto.job && (() => {
                            const tgt = g.entities.find(x => x.id === auto.job!.id);
                            const need = tgt ? (tgt.kind === 'node' ? nodeDef(tgt.type).hp : creatureDef(tgt.type).hp) : 1;
                            const pct = Math.min(100, Math.round(((s.damage[auto.job.id] ?? 0) / need) * 100));
                            return <div className="absolute -top-9 left-1/2 w-20 -translate-x-1/2 rounded bg-background/90 px-1 py-0.5 text-center text-[10px] font-bold" role="status">
                              {auto.job.label} {pct}%<div className="mt-0.5 h-1.5 w-full bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} /></div>
                            </div>;
                          })()}
                          {bubbles[presence.selfId] && <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-card px-1.5 text-[11px]">{bubbleView(bubbles[presence.selfId])}</span>}
                          <div className="relative">
                            <div aria-hidden className="pointer-events-none absolute left-1/2 bottom-0 h-2 w-8 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground/30 blur-[2px]" />
                            {/* Animated Player Character: strikes/steps forward towards target while staying rooted */}
                            <motion.div initial={false} animate={{ x: dx, y: dy }} transition={{ duration: actorTarget ? 0.22 : 0.38, ease: 'easeOut' }}>
                              <HitFlash hit={hit}>
                                <div style={{ transform: isFacingLeft ? 'scaleX(-1)' : undefined, opacity: crew ? 0.35 : 1, transition: 'opacity 0.3s' }}>
                                  <CharacterSprite action={action} level={s.level} height={PLAYER_SPRITE_HEIGHT} />
                                </div>
                              </HitFlash>
                            </motion.div>
                            {/* Escort tribes: individual classes, desynchronized animations and micro-actions */}
                            {escortReady(s.tribe, Date.now(), !!s.observedExpedition?.mercenary) && (
                              <>
                                {Array.from({ length: Math.min(5, Math.max(0, s.tribe?.count ?? 0)) }, (_, k) => {
                                  const isAmbachoSlot = k === 0 && (s.mercenary?.name === '암바초' || (s.tribe?.classCounts?.gatherer ?? 0) > 0);
                                  const classCycle: TribeClassId[] = ['gatherer', 'tank', 'ranged', 'assassin'];
                                  const escortClass: TribeClassId = isAmbachoSlot
                                    ? 'gatherer'
                                    : (s.tribe?.classId && s.tribe.classId !== 'gatherer' && k === 1
                                        ? s.tribe.classId
                                        : classCycle[k % classCycle.length]);

                                  // Independent micro-states: when player is idle, followers don't freeze in lockstep
                                  const followerAction = action === 'walk'
                                    ? 'walk'
                                    : action === 'attack'
                                      ? (k % 2 === 1 ? 'attack' : 'idle')
                                      : (k === 0 && isAmbachoSlot ? 'gather' : (k % 3 === 2 ? 'chop' : 'idle'));

                                  const speedMult = 0.92 + (k * 0.06);

                                  return (
                                    <div
                                      key={k}
                                      aria-label={k ? undefined : (isAmbachoSlot ? "동행 파밍 부족민 암바초" : "동행 부족민")}
                                      className="pointer-events-none absolute bottom-0 transition-transform duration-100"
                                      style={{
                                        left: isFacingLeft ? 34 + k * 22 : -34 - k * 22,
                                        bottom: (k % 2) * 5,
                                        transform: isFacingLeft ? 'scaleX(-1)' : undefined
                                      }}
                                    >
                                      <TribeSprite
                                        action={followerAction}
                                        height={48 - (k === 0 ? 0 : 2)}
                                        tribeClass={escortClass}
                                        frameOffset={k * 2 + 1}
                                        memberIndex={k}
                                        speedMult={speedMult}
                                      />
                                    </div>
                                  );
                                })}
                              </>
                            )}
                            {/* Companion pets: remain stably anchored alongside player with lively walk bounce */}
                            {(() => {
                              const followPets = (s.pets ?? []).filter(x => petRole(x) === 'follow');
                              const activeCompanions = followPets.length > 0
                                ? followPets
                                : ((s.pets ?? []).find(x => petRole(x) !== 'hunt') ? [(s.pets ?? []).find(x => petRole(x) !== 'hunt')!] : []);
                              return activeCompanions.map((x, i) => (
                                <motion.div
                                  key={x.uid}
                                  className="pointer-events-none absolute bottom-0"
                                  style={{
                                    left: isFacingLeft ? 38 + i * 26 : -38 - i * 26,
                                    transform: isFacingLeft ? 'scaleX(-1)' : undefined
                                  }}
                                  animate={action === 'walk' ? { y: [0, -3, 0] } : undefined}
                                  transition={{ repeat: Infinity, duration: 0.35, ease: 'easeInOut' }}
                                >
                                  <PetSprite speciesId={x.speciesId} name={x.name} height={32} />
                                </motion.div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </>
        )}
      </TerrainMap>
        );
      })()}

      {winterOn && <WinterThemeOverlay />}
      {!!s.dinoEggs?.length && s.dinoEggs[0] && <div className="pointer-events-none absolute bottom-[calc(7rem+env(safe-area-inset-bottom))] left-2 z-20 flex origin-bottom-left scale-[0.8] items-center gap-1 rounded bg-card/90 px-2 py-1 text-xs" aria-label="공룡 알 부화 진행">
        <img src={eggArt(s.dinoEggs[0]?.id ?? 'egg')} alt="" className="pixelated h-6 w-6 object-contain" />알 {s.dinoEggs.length}개 · {(() => {
          const discount = g.codexProgress?.hatchDiscountPct ?? 0;
          const valid = (s.dinoEggs ?? []).filter((x): x is CarriedEgg => !!x);
          if (!valid.length) return '';
          const sorted = [...valid].sort((a, b) => (eggNeedM(a, discount) - eggWalkedM(a, s.walkSteps ?? 0)) - (eggNeedM(b, discount) - eggWalkedM(b, s.walkSteps ?? 0)));
          const e = sorted[0];
          if (!e) return '';
          const need = eggNeedM(e, discount);
          return `${Math.min(need, eggWalkedM(e, s.walkSteps ?? 0))}/${need}m`;
        })()}
        {readyEgg && !g.inBase && <b className="text-primary"> · 거점으로!</b>}</div>}
      <DinoEggHatchModal baby={hatched} onClose={() => setHatched(null)} />
      {/* ── 1. Top-Left Compact Wooden Status Card ── */}
      <div className="absolute top-[max(0.6rem,env(safe-area-inset-top))] left-2.5 z-30 flex flex-col items-start gap-1 pointer-events-auto select-none">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusModalOpen(true)}
          className="pixelated flex items-center gap-2.5 rounded-2xl border-4 border-[#2b1d14] bg-[#9e6738] p-2 shadow-[3px_3px_0_0_#2b1d14] hover:bg-[#aa7240] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer transition-all font-pixel text-xs"
          title="족장 상태·장비·스킬 확인 (터치하여 열기)"
        >
          {/* Square carved-stone portrait */}
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border-2 border-[#2b1d14] bg-[#6e6356] flex items-center justify-center shadow-inner relative">
            <CharacterSprite height={34} action="idle" level={s.level} />
          </div>

          {/* Right Column: Lv badge + Sleek HP & Hunger bars */}
          <div className="flex flex-col gap-1.5 min-w-[105px]">
            <div className="flex items-center justify-between gap-1 leading-none">
              <span className="rounded bg-[#2b1d14] px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                Lv.{s.level}
              </span>
              <span className="text-[10px] font-bold text-amber-100 truncate max-w-[70px]">
                {chiefName || presence.name}
              </span>
            </div>

            {/* Sleek red HP pill bar */}
            <div className="flex items-center gap-1.5">
              <img src={uiHeartImg} alt="HP" width={14} height={14} className="pixelated shrink-0 drop-shadow-xs" />
              <div className="h-3 flex-1 rounded-full bg-[#2b1d14] p-[1.5px] border border-[#1a110b] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-red-400 transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.min(100, Math.max(0, (s.hp / Math.max(1, g.maxHp)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Sleek green/yellow Hunger pill bar */}
            <div className="flex items-center gap-1.5">
              <img src={uiBananaImg} alt="배고픔" width={14} height={14} className="pixelated shrink-0 drop-shadow-xs" />
              <div className="h-3 flex-1 rounded-full bg-[#2b1d14] p-[1.5px] border border-[#1a110b] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    s.hunger <= 25 ? 'bg-orange-500 animate-pulse' : 'bg-gradient-to-r from-lime-500 to-amber-300'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, s.hunger))}%` }}
                />
              </div>
            </div>

            {/* Sleek weapon durability mini bar matching reference image */}
            <div className="flex items-center gap-1.5">
              <img src={uiStoneImg} alt="돌/내구도" width={14} height={14} className="pixelated shrink-0 drop-shadow-xs" />
              <div
                className="h-2 flex-1 rounded-full bg-[#2b1d14] p-[1px] border border-[#1a110b] overflow-hidden"
                title={g.weapon ? `무기 내구도: ${g.weapon.durability ?? 50}/${g.weapon.maxDurability ?? ITEMS[g.weapon.itemId]?.durability ?? 50}` : '맨손 (공격력 기본)'}
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    !g.weapon
                      ? 'bg-stone-500'
                      : ((g.weapon.durability ?? 1) / Math.max(1, g.weapon.maxDurability ?? ITEMS[g.weapon.itemId]?.durability ?? 50)) <= 0.25
                      ? 'bg-rose-500 animate-pulse'
                      : 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-300'
                  }`}
                  style={{
                    width: `${g.weapon ? Math.min(100, Math.max(0, ((g.weapon.durability ?? 1) / Math.max(1, g.weapon.maxDurability ?? ITEMS[g.weapon.itemId]?.durability ?? 50)) * 100)) : 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Attached carved-stone mini-pill underneath */}
        <div className="flex items-center gap-1">
          {realGps && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (gps.isIndoor) gps.retry();
                else if (!gps.ready) gps.switchToIndoor();
                else gps.retry();
              }}
              className="pixelated flex items-center gap-1.5 rounded-xl border-2 border-[#2b1d14] bg-[#7a7267] px-2.5 py-0.5 text-[9px] font-bold text-amber-200 shadow-[2px_2px_0_0_#2b1d14] hover:bg-[#8e8578] active:translate-x-[1px] active:translate-y-[1px]"
              title={gps.isIndoor ? '실내 모드 · 터치하여 GPS 재시도' : gps.ready ? `GPS ±${Math.round(gps.fix?.accuracy ?? 0)}m` : 'GPS 탐색 중 · 터치하여 실내 전환'}
            >
              {gps.isIndoor ? (
                <>
                  <Home className="h-2.5 w-2.5 text-amber-300 shrink-0" />
                  <span>🏠 실내 (GPS 재시도)</span>
                </>
              ) : gps.ready ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>📡 GPS ±{Math.round(gps.fix?.accuracy ?? 0)}m</span>
                </>
              ) : (
                <>
                  <Radio className="h-2.5 w-2.5 text-amber-300 animate-spin shrink-0" />
                  <span>📡 검색중 (실내 전환)</span>
                </>
              )}
            </button>
          )}

          {s.dinoEggs?.[0] && (() => {
            const egg = s.dinoEggs[0];
            const discount = g.codexProgress?.hatchDiscountPct ?? 0;
            const walked = eggWalkedM(egg, s.walkSteps ?? 0);
            const need = eggNeedM(egg, discount);
            const pct = Math.min(100, Math.round((walked / need) * 100));
            return (
              <div
                onClick={() => { setPanel('base'); setBaseTab('pets'); }}
                className="pixelated flex items-center gap-1 rounded border-2 border-[#2b1d14] bg-[#5c544a] px-1.5 py-0.5 text-[9px] font-bold text-amber-200 shadow-[1px_1px_0_0_#2b1d14] cursor-pointer hover:bg-[#6c6358]"
                title="공룡 알 부화 진행도 · 클릭하여 펫 관리"
              >
                <span className="leading-none">🥚</span>
                <span>{pct}%</span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── 2. Top-Right Collapsible Circular Menu (v) ── */}
      <div className="absolute top-[max(0.6rem,env(safe-area-inset-top))] right-2.5 z-30 flex flex-col items-end pointer-events-auto font-pixel">
        <button
          type="button"
          onClick={() => setQuickMenuOpen(v => !v)}
          className="pixelated relative w-11 h-11 rounded-full border-3 border-[#2b1d14] bg-[#9e6738] text-[#f4e2ce] shadow-[3px_3px_0_0_#2b1d14] hover:bg-[#aa7240] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center font-bold cursor-pointer p-0 overflow-hidden"
          aria-expanded={quickMenuOpen}
          aria-label={quickMenuOpen ? '메뉴 닫기' : '간편 메뉴 열기'}
        >
          {quickMenuOpen ? (
            <ChevronUp className="h-5 w-5 text-amber-100" />
          ) : (
            <img src={uiChevronDownImg} alt="메뉴" className="w-full h-full object-contain pixelated" />
          )}
          {g.canClaimQuest && !quickMenuOpen && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border border-[#2b1d14] animate-ping" />
          )}
        </button>

        <AnimatePresence>
          {quickMenuOpen && (
            <>
              {/* Tap outside to collapse */}
              <div
                className="fixed inset-0 z-20"
                onClick={() => setQuickMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -8 }}
                transition={{ duration: 0.15 }}
                className="relative z-30 mt-2 flex flex-col items-center gap-2 rounded-lg border-2 border-[#2b1d14] bg-[#8b5a2b]/95 p-2 shadow-[4px_4px_0_0_#2b1d14] backdrop-blur-xs font-pixel"
              >
                {/* ❓ 도움 */}
                <button
                  type="button"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    setUiGuideOpen(true);
                  }}
                  className="flex flex-col items-center text-amber-100 hover:text-white group cursor-pointer"
                  title="화면 도움말"
                >
                  <div className="w-8 h-8 rounded border border-[#2b1d14] bg-[#7a7267] flex items-center justify-center shadow group-active:translate-y-[1px]">
                    <HelpCircle className="h-4 w-4 text-amber-200" />
                  </div>
                  <span className="text-[9px] font-bold mt-0.5">도움</span>
                </button>

                {/* 📖 도감 */}
                <button
                  type="button"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    setCodexModalOpen(true);
                    g.markCodexSeen();
                  }}
                  className="flex flex-col items-center text-amber-100 hover:text-white group relative cursor-pointer"
                  title="부족 대도감"
                >
                  <div className="w-8 h-8 rounded border border-[#2b1d14] bg-[#7a7267] flex items-center justify-center shadow group-active:translate-y-[1px]">
                    <BookOpen className="h-4 w-4 text-amber-200" />
                  </div>
                  <span className="text-[9px] font-bold mt-0.5">도감</span>
                  {g.codex?.hasUnseenNew && (
                    <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-amber-400" />
                  )}
                </button>

                {/* 📜 퀘스트 */}
                <button
                  type="button"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    setPanel('quests');
                  }}
                  className="flex flex-col items-center text-amber-100 hover:text-white group relative cursor-pointer"
                  title="생존 목표 및 주술사 퀘스트"
                >
                  <div className="w-8 h-8 rounded border border-[#2b1d14] bg-[#7a7267] flex items-center justify-center shadow group-active:translate-y-[1px]">
                    <FileText className="h-4 w-4 text-amber-200" />
                  </div>
                  <span className="text-[9px] font-bold mt-0.5">퀘스트</span>
                  {g.canClaimQuest && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow border border-[#2b1d14] animate-bounce">
                      !
                    </span>
                  )}
                </button>

                {/* 🧭 나침반 */}
                <button
                  type="button"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    handleOpenRadar();
                  }}
                  className="flex flex-col items-center text-amber-100 hover:text-white group cursor-pointer"
                  title="나침반 & 레이더"
                >
                  <div className="w-8 h-8 rounded border border-[#2b1d14] bg-[#7a7267] flex items-center justify-center shadow group-active:translate-y-[1px]">
                    <Compass className="h-4 w-4 text-amber-200" style={{ transform: `rotate(${compassOn && heading !== null ? -heading : 0}deg)` }} />
                  </div>
                  <span className="text-[9px] font-bold mt-0.5">나침반</span>
                </button>

                {/* ✨ 스킬 */}
                <button
                  type="button"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    setSkillTreeModalOpen(true);
                  }}
                  className="flex flex-col items-center text-amber-100 hover:text-white group cursor-pointer"
                  title="심화 스킬트리"
                >
                  <div className="w-8 h-8 rounded border border-[#2b1d14] bg-[#7a7267] flex items-center justify-center shadow group-active:translate-y-[1px]">
                    <Sparkles className="h-4 w-4 text-amber-200" />
                  </div>
                  <span className="text-[9px] font-bold mt-0.5">스킬</span>
                </button>

                {/* ⚙️ 설정 */}
                <GameMenu
                  loggedIn={!!user}
                  onExit={() => navigate(realGps ? '/' : '/play')}
                  onLogout={async () => {
                    try {
                      await signOut();
                      navigate('/login');
                    } catch {
                      toast.error('로그아웃에 실패했어요. 다시 시도해 주세요');
                    }
                  }}
                  onRestoreSave={g.reloadSaveFromBestSource}
                  onOpenSaveEditor={() => setSaveEditorOpen(true)}
                  tutorialCompleted={isTutorialCompleted}
                  onToggleTutorial={handleToggleTutorial}
                  trigger={
                    <button
                      type="button"
                      className="flex flex-col items-center text-amber-100 hover:text-white group cursor-pointer"
                      title="게임 설정"
                    >
                      <div className="w-8 h-8 rounded border border-[#2b1d14] bg-[#7a7267] flex items-center justify-center shadow group-active:translate-y-[1px]">
                        <Settings className="h-4 w-4 text-amber-200" />
                      </div>
                      <span className="text-[9px] font-bold mt-0.5">설정</span>
                    </button>
                  }
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Top HUD Auto-Save Indicator */}
      <AnimatePresence>
        {g.savedIndicator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.2 }}
            className="pixel-frame fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded bg-stone-900/95 border border-emerald-500/70 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 shadow-lg backdrop-blur pointer-events-none font-pixel"
          >
            <span>저장됨 ✓</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Target Banner */}
      {activeTarget && (() => {
        const d = distanceM(s.pos, activeTarget);
        return (
          <button
            type="button"
            onClick={handleOpenRadar}
            className="pixel-frame absolute left-1/2 top-[calc(max(0.6rem,env(safe-area-inset-top))+4.5rem)] z-20 flex max-w-[65%] -translate-x-1/2 items-center gap-1.5 rounded border border-emerald-500 bg-[#0d1911]/95 text-white py-1 px-2.5 text-xs shadow-lg font-pixel"
          >
            <Navigation className="!h-3.5 !w-3.5 shrink-0 text-emerald-400" style={{ transform: `rotate(${bearingDeg(s.pos, activeTarget) - mapBearing}deg)` }} />
            <span className="truncate text-emerald-100">{activeTarget.name}</span>
            <b className="shrink-0 text-emerald-300 font-mono">{d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${Math.round(d)}m`}</b>
          </button>
        );
      })()}

      {/* ── 3. Bottom Carved-Stone & Wood Swipe-Up Dock ── */}
      {panel === 'none' && (() => {
        const weightPct = Math.round((g.weight / Math.max(1, g.capacity)) * 100);
        const isBagHeavy = weightPct >= 85;
        return (
          <aside
            aria-label="생존 및 거점 관리 도크"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 flex flex-col rounded-2xl border-4 border-[#2b1d14] bg-[#9e9589] p-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.6)] font-pixel select-none pointer-events-auto"
          >
            {/* Top Center Handle (— ▲) */}
            <button
              type="button"
              onClick={() => {
                setPanel('base');
                setBaseTab('village');
              }}
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-0.5 rounded-t-xl border-t-2 border-x-2 border-[#2b1d14] bg-[#9e9589] text-[#2b1d14] text-[10px] font-black shadow hover:bg-[#aba296] active:translate-y-[1px] cursor-pointer"
              aria-label="통합 관리 도크 열기"
            >
              <span className="w-3.5 h-0.5 bg-[#2b1d14] rounded" />
              <span>▲</span>
            </button>

            {/* Inner warm-wood plate inlay */}
            <div className="w-full rounded-xl border-2 border-[#2b1d14] bg-[#8a572c] p-1.5 flex items-center justify-between gap-2 shadow-inner">
              {/* Left square stone slot: [⚙️ 설정/탐색] */}
              <button
                type="button"
                onClick={handleOpenRadar}
                className="pixelated w-11 h-11 shrink-0 rounded-xl border-2 border-[#2b1d14] bg-[#7a7267] text-amber-100 hover:bg-[#8e8578] active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0_0_#2b1d14] flex items-center justify-center cursor-pointer p-1"
                aria-label="주변 탐색 레이더 및 설정 열기"
                title="탐색 레이더 및 설정"
              >
                <img src={uiStoneGearImg} alt="설정" className="w-7 h-7 pixelated object-contain drop-shadow" />
              </button>

              {/* Center sunken groove progress bar: Backpack weight */}
              <div
                onClick={() => setPanel('bag')}
                className="flex-1 min-w-0 px-1 flex flex-col justify-center cursor-pointer"
                title="배낭 열기"
              >
                <div className="flex justify-between items-center text-[10px] text-amber-100/90 font-mono mb-0.5">
                  <span className="font-pixel text-[10px]">배낭</span>
                  <span className={`font-bold ${isBagHeavy ? 'text-red-300 font-extrabold animate-pulse' : 'text-amber-100'}`}>
                    {g.weight}/{g.capacity}kg ({weightPct}%)
                  </span>
                </div>
                <div className="h-5 w-full rounded-lg bg-[#2b1d14] border border-[#1a110b] p-0.5 overflow-hidden flex items-center shadow-inner">
                  <div
                    className={`h-full rounded-md transition-all duration-300 ${
                      isBagHeavy ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-amber-500 to-yellow-300'
                    }`}
                    style={{ width: `${Math.min(100, weightPct)}%` }}
                  />
                </div>
              </div>

              {/* Right 3 square wooden icon slots: [🎒 배낭], [🥚 펫], [🔥 거점] */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* [🎒 배낭] */}
                <button
                  type="button"
                  onClick={() => setPanel('bag')}
                  className="pixelated relative w-11 h-11 rounded-xl border-2 border-[#2b1d14] bg-[#71431e] text-amber-100 hover:bg-[#855127] active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0_0_#2b1d14] flex items-center justify-center cursor-pointer p-1"
                  aria-label="배낭 열기"
                  title={`배낭 (${g.weight}/${g.capacity}kg)`}
                >
                  <img src={uiBackpackImg} alt="배낭" className="w-7 h-7 pixelated object-contain drop-shadow" />
                  {isBagHeavy && (
                    <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </button>

                {/* [🥚 펫] */}
                <button
                  type="button"
                  onClick={() => {
                    setPanel('base');
                    setBaseTab('pets');
                  }}
                  className="pixelated relative w-11 h-11 rounded-xl border-2 border-[#2b1d14] bg-[#71431e] text-amber-100 hover:bg-[#855127] active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0_0_#2b1d14] flex items-center justify-center cursor-pointer p-1"
                  aria-label="펫 관리 열기"
                  title="펫 및 부화기 관리"
                >
                  <img src={uiEggImg} alt="펫" className="w-7 h-7 pixelated object-contain drop-shadow" />
                  {readyEgg && (
                    <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-bounce" />
                  )}
                </button>

                {/* [🔥 거점] */}
                <button
                  type="button"
                  onClick={() => {
                    setPanel('base');
                    setBaseTab('village');
                  }}
                  className="pixelated relative w-11 h-11 rounded-xl border-2 border-[#2b1d14] bg-[#71431e] text-amber-100 hover:bg-[#855127] active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0_0_#2b1d14] flex items-center justify-center cursor-pointer p-1"
                  aria-label="거점 마을 열기"
                  title="거점 마을"
                >
                  <img src={uiCampfireImg} alt="거점" className="w-7 h-7 pixelated object-contain drop-shadow" />
                  {s.baseUpgrade && nowTick >= s.baseUpgrade.readyAt && (
                    <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-orange-400 animate-ping" />
                  )}
                </button>
              </div>
            </div>
          </aside>
        );
      })()}

      {/* UI Guide Spotlight Overlay */}
      <UiGuideOverlay isOpen={uiGuideOpen} onClose={() => setUiGuideOpen(false)} />

      {!s.base && (
        <div className="absolute inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.25rem)] z-20 pixel-frame bg-card p-2 text-xs font-pixel">
          나뭇가지 {countOf(s.backpack, 'branch')}/{CAMP_COST[0].count}개를 모아 모닥불 거점을 세우세요.
          <Button type="button" disabled={realGps && !gps.ready && !gps.isIndoor} onClick={g.placeBase} className="pixel-btn mt-1.5 h-auto min-h-0 w-full py-1.5 px-2.5 text-xs">여기에 모닥불 세우기</Button>
        </div>
      )}

      {/* Right-Edge Collapsible Wooden Skill Drawer (3 Slots + Settings) */}
      {view === 'user' && panel === 'none' && (
        <RightSkillDrawer
          modularSkills={g.modularSkills}
          cooldowns={s.cooldowns}
          ready={actionReady}
          onUseSkill={g.useModularSkill}
          onOpenSettings={(slotIdx) => {
            if (typeof slotIdx === 'number') {
              setInitialSkillSlot(slotIdx);
            }
            setSkillSettingsModalOpen(true);
          }}
        />
      )}

      <AnimatePresence>
        {panel !== 'none' && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className={
              panel === 'base' || panel === 'bag'
                ? 'fixed inset-x-0 bottom-0 top-[max(2.5rem,env(safe-area-inset-top))] z-[1000] flex flex-col bg-background border-t-4 border-[#2b1d14] shadow-2xl'
                : 'absolute inset-x-0 bottom-0 z-[1000] flex max-h-[75dvh] flex-col border-t-4 border-foreground bg-background shadow-2xl'
            }>
            <div className="flex items-center justify-between border-b-2 border-[#2b1d14] bg-card px-2.5 py-2 font-pixel">
              {panel === 'base' || panel === 'bag' ? (
                /* 4 clean tabs: [🔥 거점] [🚩 원정대] [🥚 펫] [🎒 배낭] */
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPanel('base');
                      setBaseTab('village');
                    }}
                    className={`pixelated px-2.5 py-1 text-xs font-bold rounded border-2 border-[#2b1d14] transition-all flex items-center gap-1 cursor-pointer ${
                      panel === 'base' && (baseTab === 'village' || baseTab === 'lab' || baseTab === 'craft' || baseTab === 'storage')
                        ? 'bg-[#8b5a2b] text-amber-100 shadow-[2px_2px_0_0_#2b1d14]'
                        : 'bg-[#5c4432] text-stone-300 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span>🔥</span>
                    <span>거점</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPanel('base');
                      setBaseTab('expedition');
                    }}
                    className={`pixelated px-2.5 py-1 text-xs font-bold rounded border-2 border-[#2b1d14] transition-all flex items-center gap-1 cursor-pointer ${
                      panel === 'base' && baseTab === 'expedition'
                        ? 'bg-[#8b5a2b] text-amber-100 shadow-[2px_2px_0_0_#2b1d14]'
                        : 'bg-[#5c4432] text-stone-300 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span>🚩</span>
                    <span>원정대</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPanel('base');
                      setBaseTab('pets');
                    }}
                    className={`pixelated px-2.5 py-1 text-xs font-bold rounded border-2 border-[#2b1d14] transition-all flex items-center gap-1 cursor-pointer ${
                      panel === 'base' && baseTab === 'pets'
                        ? 'bg-[#8b5a2b] text-amber-100 shadow-[2px_2px_0_0_#2b1d14]'
                        : 'bg-[#5c4432] text-stone-300 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span>🥚</span>
                    <span>펫</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPanel('bag');
                    }}
                    className={`pixelated px-2.5 py-1 text-xs font-bold rounded border-2 border-[#2b1d14] transition-all flex items-center gap-1 cursor-pointer ${
                      panel === 'bag'
                        ? 'bg-[#8b5a2b] text-amber-100 shadow-[2px_2px_0_0_#2b1d14]'
                        : 'bg-[#5c4432] text-stone-300 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span>🎒</span>
                    <span>배낭</span>
                  </button>
                </div>
              ) : (
                <b className="text-base">
                  {panel === 'quests'
                    ? '🧙 떠돌이 주술사의 생존 목표'
                    : panel === 'favs'
                      ? '즐겨찾기'
                      : '제작 기술'}
                </b>
              )}
              <button
                type="button"
                aria-label="닫기"
                onClick={() => {
                  setPanel('none');
                  if (view === 'base') setView('user');
                }}
                className="relative z-[90] pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded border-2 border-[#2b1d14] bg-[#7a7267] text-amber-200 hover:bg-[#8e8578] active:scale-95 shadow cursor-pointer"
              >
                <X className="!h-5 !w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {panel === 'quests' && (
                <SurvivalObjectives
                  state={{ ...s, storedGear: [], stats: { gathered: s.gathered, crafted: s.crafted, kills: s.kills, deposits: s.deposits } }}
                  canClaim={g.inBase && (!realGps || gps.ready || gps.isIndoor)}
                  onClaim={g.claimQuest}
                  languageQuestAccepted={!!s.languageQuestAccepted}
                  languageLearned={!!s.languageLearned}
                  onAcceptLanguageQuest={g.acceptLanguageQuest}
                  onClaimLanguageQuest={g.claimLanguageQuest}
                  shamanQuestAcceptedIndex={s.shamanQuestAcceptedIndex}
                  onAcceptShamanQuest={g.acceptShamanQuest}
                />
              )}
              {panel === 'bag' && (
                <>
                  <InventoryMaterials
                    stacks={s.backpack}
                    gear={s.gear}
                    loadout={g.loadout}
                    location="backpack"
                    canTransfer={g.inBase}
                    ready={actionReady}
                    onTransfer={g.storeOne}
                    onTransferGear={g.storeGear}
                    onDrop={g.dropItems}
                    onDropGear={g.dropGear}
                    onUse={g.eat}
                    onEquip={g.equip}
                    onSell={g.sellItem}
                    icon={inventoryIcon}
                  />
                  <BackpackDiscard
                    backpack={s.backpack}
                    onDrop={g.dropItems}
                  />
                  <div className="space-y-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStatusModalOpen(true)}
                      className="pixel-btn flex w-full items-center justify-between py-2.5 px-3 text-xs font-bold"
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="!h-4 !w-4 text-primary" />
                        <span>상태창 · 장비 및 착용 능력치 관리</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">열기 &gt;</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCodexModalOpen(true);
                        g.markCodexSeen();
                      }}
                      className="pixel-btn flex w-full items-center justify-between py-2.5 px-3 text-xs font-bold"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="!h-4 !w-4 text-amber-500" />
                        <span>부족 대도감 · 모든 재료 및 공룡 펫 도감</span>
                      </span>
                      <span className="text-[10px] text-primary font-mono">
                        {g.codexProgress.percentage}% 달성 &gt;
                      </span>
                    </Button>
                  </div>
                </>
              )}

              {panel === 'base' && (!s.base ? <p className="text-sm">아직 거점이 없습니다.</p> : (
                <>
                  {!g.inBase && <p className="pixel-frame bg-accent p-2 text-sm">거점 반경 안에서만 제작·연구할 수 있어요.</p>}
                  {(baseTab === 'village' || baseTab === 'lab' || baseTab === 'craft' || baseTab === 'storage') && (
                    <div className="sticky top-0 z-10 -mx-3 -mt-3 grid grid-cols-4 gap-1 border-b border-border bg-background p-2 font-pixel">
                      {([['village','마을 광장'],['lab','연구·발명'],['craft','제작'],['storage','창고']] as const).map(([id, label]) => (
                        <Button key={id} type="button" variant={baseTab === id ? 'default' : 'outline'} onClick={() => setBaseTab(id)} className="pixel-btn h-auto min-h-0 py-1.5 px-1 text-xs">{label}</Button>
                      ))}
                    </div>
                  )}
                  {baseTab === 'village' && (
                    <BaseVillageView
                      village={s.village}
                      baseLevel={s.base.level}
                      playerLevel={s.level}
                      shamanLevel={s.shamanLevel ?? s.village?.shamanLevel ?? 1}
                      shamanClass={s.shamanClass ?? s.village?.shamanClass ?? null}
                      affinityState={s.affinityState}
                      classResource={s.classResource ?? s.village?.classResource ?? 100}
                      onTriggerUltimate={g.triggerClassUltimate}
                      onSelectShamanClass={g.evolveShaman}
                      expeditionDistanceM={(s.expeditionDistanceM ?? 0) + (s.walkSteps ?? 0) * 20}
                      languageLearned={!!s.languageLearned}
                      languageQuestAccepted={!!s.languageQuestAccepted}
                      shamanQuestAcceptedIndex={s.shamanQuestAcceptedIndex}
                      questState={{ ...s, storedGear: [], stats: { gathered: s.gathered, crafted: s.crafted, kills: s.kills, deposits: s.deposits } }}
                      canClaimQuest={g.inBase && (!realGps || gps.ready || gps.isIndoor) && g.canClaimQuest}
                      onClaimQuest={g.claimQuest}
                      onAcceptShamanQuest={g.acceptShamanQuest}
                      onAcceptLanguageQuest={g.acceptLanguageQuest}
                      onClaimLanguageQuest={g.claimLanguageQuest}
                      onPerformShamanRitual={g.performShamanRitual}
                      onEvolveShaman={g.evolveShaman}
                      onEvolvePetToSkullDragon={g.evolvePetToSkullDragon}
                      civilizationTechs={s.civilizationTechs ?? ['tech_fire_gathering']}
                      onResearchCivilizationTech={g.researchCivilizationTech}
                      hasAltar={!!s.altar}
                      tribe={s.tribe}
                      pets={s.pets ?? []}
                      storage={s.storage}
                      backpack={s.backpack}
                      gear={s.gear}
                      inventions={s.inventions ?? []}
                      inBase={g.inBase}
                      ready={actionReady}
                      onPlace={g.placeVillageTile}
                      onPlaceCustomBuilding={g.placeCustomVillageTile}
                      onCraftCustomGear={g.craftCustomGear}
                      onMove={g.moveVillageTile}
                      onRemove={g.removeVillageTile}
                      onGrantBranches={g.grantTutorialBranches}
                      onResearchBlueprint={g.researchVillageBlueprint}
                      onTrainShamanSkill={g.trainShamanSkill}
                      onForgeSignatureWeapon={g.forgeSignatureWeapon}
                      onCraftAmmoBundle={g.craftAmmoBundle}
                      onEnhanceWeapon={g.enhanceArmoryWeapon}
                      onInvent={g.invent}
                      freshnessPct={g.freshnessPct}
                      smokeBatches={s.smokeBatches ?? []}
                      onHarvestBubble={g.harvestVillageBubble}
                      onHarvestAllBubbles={g.harvestAllVillageBubbles}
                      onStartSmokeBatch={g.startSmokeBatch}
                      onInstantSmoke={g.instantSmoke}
                      onClaimSmokeBatch={g.claimSmokeBatch}
                      onDiscardSpoiled={g.discardSpoiledFood}
                      onCookTavernRecipe={g.cookTavernRecipe}
                      onCookShamanDish={g.cookShamanDish}
                      onClaimShamanCooking={g.claimShamanCooking}
                      permanentStats={s.permanentStats}
                      activeBuffs={s.activeBuffs}
                      cookingJobs={s.cookingJobs}
                      onEatDish={g.eat}
                      onHireTribe={g.hireMerc}
                      onSelectTribeClass={g.selectTribeClass}
                      onTrainTribe={g.trainTribe}
                      onTreatTribe={g.treatTribe}
                      onToggleEscort={g.toggleEscort}
                      onOpenBaseTab={tab => setBaseTab(tab)}
                      onOpenObjectives={() => setPanel('quests')}
                      onReplayTutorial={handleReplayTutorial}
                    />
                  )}
                  {baseTab === 'lab' && <>
                                    {s.baseUpgrade && <JobCard title={`${BASE_LEVELS[Number(s.baseUpgrade.id) as 2 | 3].name} 공사`} job={s.baseUpgrade} now={nowTick} claimLabel="발전 완료" onClaim={g.claimBaseUpgrade} />}
                  <div className="border-y border-border py-3"><b className="text-sm">연구 시설 · 발명</b><div className="mt-2"><AltarPanel altar={!!s.altar} baseLevel={s.base.level} remote={realGps} credits={s.inventionCredits} walkedMeters={Math.min(200, Math.max(0, ((s.walkSteps ?? 0) - Math.min(s.inventionWalkMark ?? 0, s.walkSteps ?? 0)) * 20))} onCredits={g.updateInventionCredits} inviteUrl={`${window.location.origin}/?invite=${encodeURIComponent(user?.id ?? "pioneer")}`} ready={actionReady} inBase={g.inBase} owned={[...s.backpack, ...s.storage]} inventions={s.inventions ?? []} onBuild={g.buildAltar} onInvent={g.invent} gear={s.gear} onUpgrade={g.upgradeGear} onReforge={g.reforgeGear} /></div></div>
                  {s.base.level < 3 && (() => {
                    const nx = BASE_LEVELS[(s.base.level + 1) as 2 | 3];
                    return (
                      <div className="pixel-frame bg-card p-2 text-xs">
                        <b className="text-sm">{nx.name}(으)로 발전</b> — {nx.unlocks}
                        <div className="my-1"><Stacks stacks={nx.cost} have={s.storage} /></div>
                        <button type="button" disabled={!g.inBase || !g.canAfford(nx.cost) || !actionReady || !!s.baseUpgrade || (s.base?.level === 1 && !s.techs.includes('hut_building'))} onClick={g.upgradeBase} className="pixel-btn h-11 w-full bg-primary text-primary-foreground disabled:opacity-40">{s.baseUpgrade ? '공사 중' : `공사 시작 (${BASE_UPGRADE_MS[(s.base.level + 1) as 2 | 3] / 3_600_000}시간)`}</button>
                      </div>
                    );
                  })()}
<button type="button" onClick={g.placeBase} className="min-h-11 text-xs text-muted-foreground underline">현재 위치로 거점 옮기기 (나뭇가지 3)</button>
                  </>}
                  {baseTab === 'craft' && <>
                  <div>
                    <b className="text-sm">제작</b>
                    {s.level >= 5 && (
                      <div className="mt-1 flex gap-1 overflow-x-auto">
                        {CRAFT_CATS.map(c => (
                          <button key={c.id} type="button" onClick={() => setCraftCat(c.id)} className={`pixel-btn min-h-11 shrink-0 px-2 text-xs ${craftCat === c.id ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>{c.label}</button>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 space-y-2">
                      {g.recipes.filter(r => s.level < 5 || craftCat === 'all' || craftCatOf(r.result) === craftCat).map((r) => {
                        const known = isRecipeUnlocked(r, s.techs);
                        const it = ITEMS[r.result];
                        if (!known) return (
                          <div key={r.id} className="flex items-center gap-2 text-xs text-muted-foreground"><Lock className="!h-4 !w-4" />??? — 「{techForRecipe(r.id)?.name}」 기술 필요</div>
                        );
                        const lvOk = (r.minLevel ?? 1) <= s.level;
                        const ok = lvOk && g.inBase && (s.base?.level ?? 0) >= r.baseLevel && g.canAfford(r.ingredients);
                        return (
                          <div key={r.id} className="pixel-frame flex items-center gap-2 bg-card p-2">
                            <Sprite k={it.sprite} />
                            <div className="flex-1 text-xs"><b className="text-sm">{it.name}</b>{r.baseLevel > 1 && ` (거점 ${r.baseLevel}단계)`}{!lvOk && ` · 족장 Lv.${r.minLevel} 필요`}{gearEffect(it) && <p className="text-primary">효과: {gearEffect(it)}</p>}<div className="mt-1"><Stacks stacks={r.ingredients} have={s.storage} /></div></div>
                            <button type="button" disabled={!ok} onClick={() => g.craft(r)} className="pixel-btn h-11 bg-primary px-3 text-primary-foreground disabled:opacity-40">제작</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!!s.inventions?.length && (
                    <div><b className="text-sm">나만의 발명 레시피</b><div className="mt-1 space-y-2">
                      {s.inventions.map(inv => {
                        const cost = Object.entries(inv.materials).filter(([, q]) => q > 0).map(([itemId, count]) => ({ itemId: itemId as ItemId, count }));
                        const ok = g.inBase && actionReady && hasAll(addStacks(s.backpack, s.storage), cost);
                        return (
                          <div key={inv.id} className="pixel-frame flex items-center gap-2 bg-card p-2">
                            <div className="flex-1 text-xs"><b className="text-sm">{inv.name}{inv.masterwork ? ' · 명품' : ''}</b>{gearEffect(ITEMS[inv.id as ItemId]) && <p className="text-primary">효과: {gearEffect(ITEMS[inv.id as ItemId])}</p>}<div className="mt-1"><Stacks stacks={cost} have={addStacks(s.backpack, s.storage)} /></div></div>
                            <button type="button" disabled={!ok} onClick={() => g.craftInvention(inv.id)} className="pixel-btn h-11 bg-primary px-3 text-primary-foreground disabled:opacity-40">제작</button>
                          </div>
                        );
                      })}
                    </div></div>
                  )}
                  </>}
                  {baseTab === 'storage' && <>
                  <div>
                    <b className="text-sm">배낭 소지품</b>
                    <div className="mt-1">
                      <InventoryMaterials
                        stacks={s.backpack}
                        gear={s.gear}
                        loadout={g.loadout}
                        location="backpack"
                        canTransfer={g.inBase}
                        ready={actionReady}
                        onTransfer={g.storeOne}
                        onTransferGear={g.storeGear}
                        onDrop={g.dropItems}
                        onDropGear={g.dropGear}
                        onUse={g.eat}
                        onEquip={g.equip}
                        onSell={g.sellItem}
                        icon={inventoryIcon}
                      />
                    </div>
                  </div>
                  <div>
                    <b className="text-sm">거점 창고 보관품</b>
                    <div className="mt-1">
                      <InventoryMaterials
                        stacks={s.storage}
                        gear={s.storedGear ?? []}
                        loadout={g.loadout}
                        location="storage"
                        canTransfer={g.inBase}
                        ready={actionReady}
                        onTransfer={g.withdraw}
                        onTransferGear={g.retrieveGear}
                        onUse={g.eat}
                        onSell={g.sellItem}
                        icon={inventoryIcon}
                      />
                    </div>
                  </div>
                  </>}
                  {baseTab === 'pets' && <PetPanel pets={s.pets ?? []} defense={s.petDefense} now={nowTick} ready={atWorkshop(s) && (!realGps || gps.ready || gps.isIndoor || !gps.fix)} onFuse={g.mergePets} onDeploy={g.togglePetDeploy} onRole={g.assignPetRole} onFeed={g.feedPet} onLock={g.togglePetLock}
                    onOpenDinoExpedition={() => setDinoExpeditionOpen(true)}
                    eggs={(s.dinoEggs ?? []).map(e => ({
                      id: e.id,
                      name: '공룡 알',
                      walked: eggWalkedM(e, s.walkSteps ?? 0),
                      need: eggNeedM(e, g.codexProgress?.hatchDiscountPct ?? 0),
                      ready: eggReady(e, s.walkSteps ?? 0, g.codexProgress?.hatchDiscountPct ?? 0),
                    }))}
                    onHatch={(id) => { const baby = g.hatchEgg(id); if (baby) setHatched({ ...baby, eggId: id }); else toast.warning('거점 안에서 알이 배낭이나 창고에 있어야 부화해요'); }} />}
                  {baseTab === 'expedition' && <>
                  {realGps && expeditionControls}
                  {(!realGps || s.expedition) && <ExpeditionPanel expedition={s.expedition} report={s.scoutReport} now={nowTick} exploredTotal={s.exploredTotal ?? s.explored.length} mark={s.expeditionMark ?? 0}
                    foodOwned={[...s.backpack, ...s.storage].filter(x => x.itemId === 'jerky' || x.itemId === 'cooked_meat').reduce((a, x) => a + x.count, 0)}
                    canSend={g.inBase && actionReady} onSend={g.startExpedition} onClaim={g.claimExpedition}
                    onPin={(t) => { favs.toggle({ id: `scout-${t.pos.lat.toFixed(5)}-${t.pos.lng.toFixed(5)}`, name: t.label, lat: t.pos.lat, lng: t.pos.lng }); toast('즐겨찾기에 표시했어요'); }} />}
                  </>}
                </>
              ))}

              {panel === 'favs' && (
                <>
                  <Button type="button" variant="outline" className="pixel-btn h-11 w-full" disabled={realGps && !gps.ready && !gps.isIndoor}
                    onClick={() => { favs.toggle({ id: `pin-${Date.now()}`, name: `내 표시 ${favs.favorites.filter((f) => f.id.startsWith('pin-')).length + 1}`, lat: s.pos.lat, lng: s.pos.lng }); toast('지금 위치를 즐겨찾기에 등록했어요'); }}>
                    <MapPin className="!h-5 !w-5" />지금 위치 등록
                  </Button>
                  <p className="text-xs text-muted-foreground">샤먼·샘터 같은 장소는 장소 창의 별을 눌러 등록하세요. '안내'를 누르면 화면 위에 방향과 거리가 계속 보여요.</p>
                  {!favs.favorites.length && <p className="text-sm text-muted-foreground">등록된 곳이 없어요.</p>}
                  {favs.favorites.map((f) => {
                    const d = distanceM(s.pos, f);
                    const on = favs.tracked?.id === f.id;
                    return (
                      <div key={f.id} className="pixel-frame flex items-center gap-2 bg-card p-2 text-xs">
                        <Navigation className="!h-5 !w-5 shrink-0 text-primary" style={{ transform: `rotate(${bearingDeg(s.pos, f) - mapBearing}deg)` }} />
                        <div className="min-w-0 flex-1"><b className="block truncate">{f.name}</b>{d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${Math.round(d)}m`}</div>
                        <Button type="button" size="sm" variant={on ? 'default' : 'outline'} className="min-h-11" onClick={() => favs.setTrackedId(on ? null : f.id)}>{on ? '안내 끄기' : '안내'}</Button>
                        <Button type="button" size="icon" variant="ghost" className="h-11 w-11" aria-label="삭제" onClick={() => favs.remove(f.id)}><X /></Button>
                      </div>
                    );
                  })}
                </>
              )}
              {panel === 'tech' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded bg-amber-950/40 border border-amber-600/40 text-xs shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📜</span>
                      <div>
                        <div className="font-bold text-amber-200">4대 주술사 심화 스킬트리</div>
                        <div className="text-[11px] text-stone-400">GPS 속도 제한 완화 & 고유 테크</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setSkillTreeModalOpen(true)}
                      className="pixel-btn h-8 px-2.5 text-xs bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold"
                    >
                      스킬창 열기
                    </Button>
                  </div>
                  <div className="sticky top-0 z-10 -mx-3 -mt-3 flex gap-1 overflow-x-auto bg-background px-3 py-2" role="tablist">
                    {TECH_CATEGORIES.map((c) => (
                      <button key={c.id} type="button" role="tab" aria-selected={techTab === c.id} onClick={() => setTechTab(c.id)}
                        className={`pixel-btn min-h-11 shrink-0 px-3 text-xs ${techTab === c.id ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>{c.label}</button>
                    ))}
                  </div>
                   {researchJobs.map(j => <JobCard key={j.id} title={`연구: ${TECHS.find(t => t.id === j.id)?.name ?? ''}${j.level ? ` Lv.${j.level}` : ''}`} job={j} now={nowTick} claimLabel="연구가 완료되었습니다 · 습득" onClaim={() => g.claimTech(j.id)} />)}
                  {(techTab === 'general' || techTab === 'craft') && <p className="text-xs text-muted-foreground">처음엔 아무것도 만들 줄 모릅니다. 자원을 모으면 깨달음을 얻고, 일부 기술은 거점에서 재료를 바쳐 연구해야 합니다.</p>}
                  {TECHS.filter((t) => (TECH_CATEGORY[t.id] ?? 'general') === techTab).map((t) => {
                    const known = s.techs.includes(t.id);
                    const ready = prerequisitesMet(t, s.techs);
                    const lv = techLevel(s.techLevels, t.id);
                    const upCost = known ? techUpgradeCost(t.id, lv) : null;
                    const researching = researchJobs.some(j => j.id === t.id);
                    return (
                      <div key={t.id} className={`pixel-frame p-2 text-xs ${known ? 'bg-primary/15' : 'bg-card'} ${!ready && !known ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-1"><b className="text-sm">{t.name}</b>{known ? <span className="ml-auto text-primary">습득 Lv.{lv}/{MAX_TECH_LEVEL}</span> : <Lock className="ml-auto !h-4 !w-4" />}</div>
                        <p>{t.desc}</p>
                        {t.requires.length > 0 && <p className="text-muted-foreground">선행: {t.requires.map((r) => TECHS.find((x) => x.id === r)?.name).join(', ')}</p>}
                        {t.bookOnly && !known && <p className="text-primary">공원 우두머리 전리품 스킬북을 읽어 습득</p>}
                        <p>제작법: {t.recipes.map(id => { const r = g.recipes.find(x => x.id === id); return r ? (ITEMS[r.result]?.name ?? r.result) : ''; }).join(', ')}</p>
                        {!known && t.inspire && <p className="mt-1">깨달음: {ITEMS[t.inspire.itemId]?.name ?? t.inspire.itemId} {Math.min(s.gathered[t.inspire.itemId] ?? 0, t.inspire.count)}/{t.inspire.count}개 채집</p>}
                        {!known && t.research && (
                          <div className="mt-1">
                            <Stacks stacks={t.research} have={s.storage} />
                            <button type="button" disabled={!ready || !g.inBase || !g.canAfford(t.research) || !actionReady || researching} onClick={() => g.research(t.id)} className="pixel-btn mt-1 h-11 w-full bg-primary text-primary-foreground disabled:opacity-40">{researching ? '연구 중' : `연구하기 (${researchDurationMs(t.research) / 3_600_000}시간)`}</button>
                          </div>
                        )}
                        {known && upCost && (
                          <div className="mt-1">
                            <Stacks stacks={upCost} have={s.storage} />
                            <button type="button" disabled={!g.inBase || !g.canAfford(upCost) || !actionReady || researching} onClick={() => g.research(t.id)} className="pixel-btn mt-1 h-11 w-full bg-primary text-primary-foreground disabled:opacity-40">{researching ? '연구 중' : `Lv.${lv + 1} 재연구 (${researchDurationMs(upCost) / 3_600_000}시간)`}</button>
                          </div>
                        )}
                        {known && !upCost && (t.research || t.bookOnly) && <p className="mt-1 text-primary">최고 레벨입니다</p>}
                      </div>
                    );
                  })}
                  {techTab === 'talk' && (
                    <div className="space-y-2 text-xs">
                      <p className="text-muted-foreground">주변 25m 안의 다른 생존자를 누르면 우우·호감 표현, 전투 신청, 동료 초대·부하 임명을 할 수 있습니다.</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {EMOTES.map((e) => <div key={e.id} className="pixel-frame bg-primary/15 p-2"><b>{e.label}</b><p>"{e.text}"</p></div>)}
                        <div className="pixel-frame bg-primary/15 p-2"><b>동맹 제안</b><p>친구로 추가하고 서로 공격하지 않음</p></div>
                      </div>
                      <p>동맹 {allies.length}명{allies.length ? `: ${allies.map(a => a.name).join(', ')}` : ''}</p>
                    </div>
                  )}
                  {techTab === 'build' && (
                    <div className="pixel-frame bg-primary/15 p-2 text-xs space-y-1.5">
                      <div className="flex items-center gap-1"><b className="text-sm">거점 건설</b>
                        <span className="ml-auto">{s.base ? `${s.base.level}단계 · 반경 ${BASE_LEVELS[s.base.level].radiusM}m` : '미건설'}</span></div>
                      <p>현재 위치에 모닥불 거점을 세웁니다. 거점 안에서는 짐승이 나타나지 않습니다.</p>
                      {s.base?.level === 1 && s.techs.includes('hut_building') && <p className="font-bold text-primary">움집 기술 습득 완료! 거점 안에서 [거점] 메뉴 → '뼈 움막으로 발전'을 눌러야 모닥불이 움막으로 바뀝니다. (창고: 통나무 12·날가죽 4·노끈 4·뼈 6)</p>}
                      <p>필요: 나뭇가지 {countOf(s.backpack, 'branch')}/{CAMP_COST[0].count}</p>
                      <button type="button" disabled={(realGps && !gps.ready && !gps.isIndoor) || countOf(s.backpack, 'branch') < CAMP_COST[0].count} onClick={g.placeBase}
                        className="pixel-btn h-11 w-full bg-primary text-primary-foreground disabled:opacity-40">{s.base ? '현재 위치로 거점 옮기기' : '여기에 거점 건설'}</button>
                    </div>
                  )}
                  {techTab === 'special' && <SkillControls known={s.techs} cooldowns={s.cooldowns} ready={actionReady} onUse={activateSkill} />}
                  {techTab === 'special' && (Object.keys(ACTIVE_SKILLS) as ActiveSkill[]).filter(id => s.techs.includes(id)).map(id => {
                    const lv = skillLevel(s.skillLevels, id); const cost = skillUpgradeCost(lv);
                    return <div key={`up-${id}`} className="flex items-center gap-2 text-xs"><span className="flex-1">{ACTIVE_SKILLS[id].name} Lv.{lv}/{MAX_SKILL_LEVEL}{cost ? ` · 강화: ${cost.map(c => `${ITEMS[c.itemId]?.name ?? c.itemId} ${c.count}`).join(' · ')}` : ''}</span>
                      <Button size="sm" variant="outline" className="h-11" disabled={!cost} onClick={() => g.upgradeSkill(id)}>{cost ? '강화' : '최고'}</Button></div>;
                  })}
                  {techTab === 'build' && <ConstructionControls known={s.techs} palisade={s.palisade} outpost={!!s.outpost} ready={actionReady} onBuild={g.construct} onMoveOutpost={g.moveOutpost} />}
                  {techTab === 'companion' && <CompanionControls known={s.techs} companions={s.companions ?? []} ready={actionReady} rescueTokens={s.rescueTokens ?? 0} onCollect={g.collectWork}
                    onRecruit={kind => g.recruit(kind, landmarks.find(l => l.kind === 'shaman' && distanceM(s.pos, l) <= 25))} onTame={g.tame}
                    wolves={g.entities.filter((e): e is Extract<WorldEntity, { kind: 'creature' }> => e.kind === 'creature' && e.type === 'wolf' && distanceM(s.pos, e) <= 25).map(e => ({ id: e.id, name: creatureDef(e.type).name, hp: creatureDef(e.type).hp - (s.damage[e.id] ?? 0) }))} />}

                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selPeer && <PeerActionMenu peer={selPeer} distance={distanceM(s.pos, selPeer)} inRange={distanceM(s.pos, selPeer) <= g.reach}
          isAlly={allies.some(a => a.id === selPeer.id)} onClose={() => setSelPeerId(null)}
          isVassalLink={vassalLinks.has(selPeer.id)} inDuel={duelWith === selPeer.id}
          canVassal={!!user && !selPeer.id.startsWith('g-')}
          myLevel={s.level}
          languageLearned={!!s.languageLearned}
          chatActive={chatPartners.has(selPeer.id)}
          chatPending={pendingChat.has(selPeer.id)}
          chatMessages={chatLogs[selPeer.id] ?? []}
          onEmote={(e) => { presence.send({ type: 'emote', to: selPeer.id, emote: e }); showBubble(presence.selfId, `icon:${e}`); playSfx('emote'); playAction('talk', 900); setSelPeerId(null); }}
          onDuel={() => { presence.send({ type: 'duel', to: selPeer.id, name: presence.name }); setDuelWith(selPeer.id); playSfx('warn'); toast.warning(`${selPeer.name}님에게 전투를 걸었습니다! ${DUEL_MAX_DISTANCE_M}m 멀어지면 끝납니다.`); }}
          onVassal={() => { pendingVassal.current.add(selPeer.id); presence.send({ type: 'vassal-req', to: selPeer.id, name: presence.name }); toast('부하 임명을 요청했습니다'); setSelPeerId(null); }}
          onAlly={() => { pendingAlly.current.add(selPeer.id); presence.send({ type: 'ally', to: selPeer.id, name: presence.name }); toast('동맹을 제안했습니다'); setSelPeerId(null); }}
          onRequestChat={() => {
            setPendingChat(prev => new Set(prev).add(selPeer.id));
            presence.send({ type: 'chat-req', to: selPeer.id, name: presence.name });
            toast.success(`${selPeer.name}님에게 대화를 신청했습니다.`);
          }}
          onSendChatMessage={(text) => {
            presence.send({ type: 'chat-msg', to: selPeer.id, name: presence.name, text });
            showBubble(presence.selfId, `💬 ${text}`);
            setChatLogs(prev => ({
              ...prev,
              [selPeer.id]: [
                ...(prev[selPeer.id] ?? []),
                { id: `${Date.now()}-${Math.random()}`, senderId: presence.selfId, senderName: presence.name, text, at: Date.now() },
              ].slice(-30),
            }));
          }}
          onAttack={attackPeer} />}
      </AnimatePresence>
      <AnimatePresence>
        {selLandmark && <LandmarkSheet landmark={selLandmark} inRange={distanceM(s.pos, selLandmark) <= g.reach && (!realGps || gps.ready || gps.isIndoor)}
          claims={s.landmarkClaims} backpack={s.backpack} words={shamanWords}
          onVisit={() => { const w = g.visitLandmark(selLandmark); if (w) { setShamanWords(w); playAction('talk', 900); } }}
          onSell={g.sellItem} onBuy={g.buyItem} onClose={() => setSelLandmark(null)}
          isFav={favs.isFav(selLandmark.id)}
          onToggleFav={() => { const was = favs.isFav(selLandmark.id); favs.toggle({ id: selLandmark.id, name: LANDMARK_INFO[selLandmark.kind].name, lat: selLandmark.lat, lng: selLandmark.lng }); toast(was ? '즐겨찾기에서 뺐어요' : '즐겨찾기에 등록했어요'); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {selShrine && <ShrineSheet shrine={selShrine} state={s.shrines ?? emptyShrineState()} pos={s.pos} backpack={s.backpack} words={shrineWords}
          inRange={distanceM(s.pos, selShrine) <= g.reach && (!realGps || gps.ready || gps.isIndoor)}
          onAwaken={() => { const w = g.awakenShrine(selShrine); if (w) { setShrineWords(w); playAction('talk', 900); } }}
          onRite={(id) => { if (g.shrineRite(selShrine, id)) playAction('gather', 900); }}
          onBless={() => { if (g.shrineBless(selShrine)) playAction('talk', 900); }}
          onClose={() => setSelShrine(null)} />}
      </AnimatePresence>
      <DamageVignette hitKey={hit.n} />
      <StatusEquipmentModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        level={s.level}
        nickname={chiefName || presence.name}
        email={user?.email}
        onLogout={handleLogout}
        gear={s.gear}
        storedGear={s.storedGear}
        loadout={g.loadout}
        activeBuffs={s.activeBuffs}
        pets={s.pets}
        permanentStats={s.permanentStats}
        onEquip={g.equip}
        onDropGear={g.dropGear}
        onStoreGear={g.storeGear}
        onRetrieveGear={g.retrieveGear}
        canStoreInBase={g.inBase}
        onOpenSaveEditor={() => {
          setStatusModalOpen(false);
          setSaveEditorOpen(true);
        }}
      />
      <AccountSaveEditorModal
        open={saveEditorOpen}
        onClose={() => setSaveEditorOpen(false)}
        level={s.level}
        xp={s.xp}
        storageCount={s.storage?.length ?? 0}
        backpackCount={s.backpack?.length ?? 0}
        onSetLevel={g.setPlayerLevel}
        onGrantPreset={g.grantPresetPackage}
        onAddItems={g.addStorageItems}
        onAddGear={g.addGearItems}
        onClearStorage={g.clearStorage}
        onRestoreBestSave={g.reloadSaveFromBestSource}
      />
      <RadarMapModal
        open={radarOpen}
        onClose={() => setRadarOpen(false)}
        pos={s.pos}
        base={s.base}
        crewPos={crew?.pos ?? null}
        expeditionCount={s.expeditionCount ?? 0}
        totalDistanceM={(s.expeditionDistanceM ?? 0) + (s.walkSteps ?? 0) * 20}
        depleted={s.depleted}
        discoveredPins={s.discoveredPins ?? []}
        favorites={favs.favorites}
        tracked={favs.tracked}
        entities={g.entities}
        landmarks={landmarks}
        explored={s.explored}
        civilizationTechs={s.civilizationTechs ?? ['tech_fire_gathering']}
        onToggleFavorite={favs.toggle}
        onRemoveFavorite={favs.remove}
        onTrack={favs.setTrackedId}
        onRefreshGps={gps.retry}
        onDispatchTo={(target, label) => {
          setExpeditionTarget(target);
          if (g.dispatchObserved(target, expeditionFocus, activeTribeClassId)) {
            setWatchExpedition(true);
            setView('expedition');
            toast.success(`🚀 ${label}(으)로 원정대를 즉시 파견했습니다!`);
          } else {
            setView('expedition');
            setFieldExp(true);
            toast(`📍 원정 목표를 ${label}(으)로 설정했습니다`);
          }
        }}
      />
      <AlertDialog open={!!chatOffer}>
        <AlertDialogContent className="font-pixel">
          <AlertDialogHeader>
            <AlertDialogTitle>상대가 대화를 신청합니다 ({chatOffer?.name})</AlertDialogTitle>
            <AlertDialogDescription>
              {chatOffer?.name}님이 부족의 언어로 대화를 나누고 싶어 합니다. 수락하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="min-h-11"
              onClick={() => {
                if (chatOffer) {
                  presence.send({ type: 'chat-res', to: chatOffer.id, name: presence.name, accept: false });
                }
                setChatOffer(null);
              }}
            >
              거절한다
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11"
              onClick={() => {
                if (chatOffer) {
                  setChatPartners(prev => new Set(prev).add(chatOffer.id));
                  presence.send({ type: 'chat-res', to: chatOffer.id, name: presence.name, accept: true });
                  setSelPeerId(chatOffer.id);
                  toast.success(`${chatOffer.name}님과의 대화방이 열렸습니다!`);
                }
                setChatOffer(null);
              }}
            >
              대화 수락
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!vassalOffer}>
        <AlertDialogContent className="font-pixel">
          <AlertDialogHeader>
            <AlertDialogTitle>{vassalOffer?.name}님이 당신을 부하로 임명하려 합니다</AlertDialogTitle>
            <AlertDialogDescription>부하가 되면 서로 위치가 공유되고, 매일 내 거점 물품 중 1개가 주인의 거점으로 상납됩니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" onClick={() => void acceptVassal(false)}>거부한다</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={() => void acceptVassal(true)}>부하가 된다</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DinoExpeditionModal
        open={dinoExpeditionOpen}
        onClose={() => setDinoExpeditionOpen(false)}
        pets={s.pets ?? []}
        storage={s.storage}
        backpack={s.backpack}
        playerLevel={s.level}
        activeBuffs={s.activeBuffs}
        onPermadeathPet={g.permadeathPet}
        onUpdatePetHp={g.updatePetHp}
        onConsumeCookedMeat={g.consumeDinoMeat}
        onRetreatWithLoot={g.settleDinoExpedition}
      />
      <CombatEffectLayer
        events={combatVfxEvents}
        damageNumbers={damageNumbers}
        projectiles={projectiles}
        onRemoveEvent={id => setCombatVfxEvents(prev => prev.filter(e => e.id !== id))}
        onRemoveDamage={id => setDamageNumbers(prev => prev.filter(d => d.id !== id))}
        onRemoveProjectile={id => setProjectiles(prev => prev.filter(p => p.id !== id))}
      />
      <OfflineReportModal
        open={offlineReportModalOpen && !showNicknameModal && isTutorialCompleted}
        onClose={() => setOfflineReportModalOpen(false)}
        elapsedMinutes={offlineElapsedMinutes}
        playerLevel={s.level}
        village={s.village}
        shamanClass={s.shamanClass ?? s.village?.shamanClass}
        onClaim={handleClaimOfflineReport}
      />
      <TribeCodexModal
        open={codexModalOpen}
        onClose={() => setCodexModalOpen(false)}
        codex={g.codex}
        save={s}
      />
      <TribalHallModal
        open={tribeInfoModalOpen}
        onClose={() => setTribeInfoModalOpen(false)}
        tribe={s.tribe}
        storage={s.storage}
        backpack={s.backpack}
        gear={s.gear}
        storedGear={s.storedGear}
        loadout={g.loadout}
        playerLevel={s.level}
        languageLearned={!!s.languageLearned}
        onHireTribe={g.hireMerc}
        onDismissTribe={g.dismissTribe}
        onSelectTribeClass={g.selectTribeClass}
        onTrainTribe={g.trainTribe}
        onTreatTribe={g.treatTribe}
        onToggleEscort={g.toggleEscort}
        onOpenExpedition={() => {
          setTribeInfoModalOpen(false);
          setPanel('base');
          setBaseTab('expedition');
        }}
      />
      <SkillTreeModal
        open={skillTreeModalOpen}
        onClose={() => setSkillTreeModalOpen(false)}
        modularSkills={g.modularSkills}
        affinityState={g.affinityState}
        onFuseModularSkill={g.fuseModularSkill}
        onEquipModularSkill={g.equipModularSkill}
        onSpecializeModularSkill={g.specializeModularSkill}
        onResetModularSpecialization={g.resetModularSpecialization}
        onUseModularSkill={g.useModularSkill}
        shamanClass={s.shamanClass ?? s.village?.shamanClass}
        playerLevel={s.level}
        classSkills={g.classSkills}
        ownedStacks={addStacks(s.storage, s.backpack)}
        onLearnSkill={g.learnClassSkill}
      />
      <SkillSettingsModal
        open={skillSettingsModalOpen}
        onClose={() => setSkillSettingsModalOpen(false)}
        modularSkills={g.modularSkills}
        initialTargetSlot={initialSkillSlot}
        onEquipSlot={g.equipModularSlot}
        onOpenSkillBench={() => setSkillTreeModalOpen(true)}
      />
    </div>
      </ContextThemeWrapper>
    </ErrorBoundary>
  );
}

// Hook order can change across modules during edits; force a full reload instead of hot patching.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
