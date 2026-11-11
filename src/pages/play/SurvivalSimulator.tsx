// @refresh reset
// Custom GPS/world hook changes must remount this screen instead of reusing stale hook queues.
import { useEffect, useMemo, useRef, useState } from 'react';
import { SkillControls, ConstructionControls, CompanionControls, SkillEffect } from '@/components/survival/SurvivalAbilities';
import CharacterSprite from '@/components/survival/CharacterSprite';
import WinterThemeOverlay from '@/components/WinterThemeOverlay';
import { Snowflake } from 'lucide-react';
import DinoEggHatchModal, { EGG_ART } from '@/components/survival/DinoEggHatchModal';
import { EGG_SPAWN_RADIUS_M, eggNeedM, eggReady, eggSpawnsNear, eggWalkedM } from '@/lib/survival/dinoEggs';
import { useCustomCatalog } from '@/hooks/useCustomCatalog';
import CreatureSprite from '@/components/survival/CreatureSprite';
import ExpeditionSystem, { ExpeditionMarker } from '@/components/survival/ExpeditionSystem';
import { CombatImpact, CREATURE_RING_RADIUS_M, expeditionActorPoint, freshCombatHit, useExpeditionCombatSound, useMovementSound } from '@/components/survival/ExpeditionCombat';
import type { ExpeditionFocus } from '@/lib/survival/expedition';
import BackpackDiscard from '@/components/survival/BackpackDiscard';
import { BaseFortressOverlay } from '@/components/survival/BaseFortressOverlay';
import PetSprite from '@/components/survival/PetSprite';
import ExpeditionJoystick from '@/components/survival/ExpeditionJoystick';
import BaseNpcs from '@/components/survival/BaseNpcs';
import escortArt from '@/assets/survival/tribe-idle.png';
import { escortReady } from '@/lib/survival/mercenaries';
import { petRole } from '@/lib/survival/pets';
import { AltarPanel } from '@/components/survival/AltarPanel';
import { EquipmentSlots } from '@/components/survival/EquipmentSlots';
import { addStacks, hasAll } from "@/lib/survival/inventory";
import { SkillQuickBar } from '@/components/survival/SkillQuickBar';
import { useAutoAction } from '@/hooks/useAutoAction';
import { BEAST_STRIKE_INTERVAL_MS, beastAggro } from '@/lib/survival/combat';
import { ACTIVE_SKILLS, type ActiveSkill } from '@/lib/survival/abilities';
import { MAX_SKILL_LEVEL, skillLevel, skillUpgradeCost } from '@/lib/survival/skillLevels';
import { type SpriteAction } from '@/hooks/useSpriteAnimations';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Backpack, Flame, Lightbulb, LocateFixed, X, Lock, ListChecks, Compass, ChevronUp, Star, MapPin, Navigation } from 'lucide-react';
import { bearingDeg, useSurvivalFavorites } from '@/hooks/useSurvivalFavorites';
import { useDeviceHeading } from '@/hooks/useDeviceHeading';
import { useSurvivalGps } from '@/hooks/useSurvivalGps';
import { Button } from '@/components/ui/button';
import { ColonionOpening, PIONEER_NAME_KEY } from '@/components/survival/ColonionOpening';
import SurvivalObjectives from '@/components/survival/SurvivalObjectives';
import { toast } from 'sonner';
import TerrainMap from '@/components/survival/TerrainMap';
import { useSurvivalWorld } from '@/hooks/useSurvivalWorld';
import { TERRAIN_ZONE_LABEL, zoneCellKey } from '@/lib/survival/terrainZone';
import { gearEffect, ITEMS, type ItemId } from '@/lib/survival/items';
import { nodeDef, creatureDef } from '@/lib/survival/entities';
import { SPRITE_META, type SpriteKey } from '@/lib/survival/spriteMeta';
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
import PeerActionMenu from '@/components/survival/PeerActionMenu';
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
import { MAX_TECH_LEVEL, techLevel, techUpgradeCost } from '@/lib/survival/techLevels';
import BasePetsOverlay from '@/components/survival/BasePetsOverlay';
import PetPanel from '@/components/survival/PetPanel';
import { atMainBase } from '@/lib/survival/abilities';

const START: LatLng = { lat: 37.748, lng: 126.7496 };
const spriteUrls = import.meta.glob('../../assets/survival/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const url = (k: SpriteKey) => spriteUrls[`../../assets/survival/${k}.png`];

const PLAYER_SCALE = 1.2;
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
const STRIKE_NODES = new Set<string>(['flint_rock', 'branch_pile', 'oak_tree', 'pine_tree', 'hematite_rock', 'quartz_vein', 'obsidian_rock', 'jade_rock']);

function Sprite({ k, scale = 1, className = '' }: { k: SpriteKey; scale?: number; className?: string }) {
  const m = SPRITE_META[k];
  if (k === 'char-hunter') return <CharacterSprite height={m.h * scale} className={className} />;
  return <img src={url(k)} height={m.h * scale} style={{ height: m.h * scale, width: 'auto' }} alt="" draggable={false} className={`pixelated select-none ${className}`} />;
}

function Stacks({ stacks, onUse, have }: { stacks: Stack[]; onUse?: (id: ItemId) => void; have?: Stack[] }) {
  if (!stacks.length) return <p className="text-sm text-muted-foreground">비어 있음</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {stacks.map((s) => {
        const it = ITEMS[s.itemId];
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
    <Button type="button" variant="outline" onClick={onClick} className="pixel-btn relative flex h-14 min-h-14 w-14 flex-col items-center justify-center gap-0 bg-card px-0 text-[10px]">
      <Icon className="!h-6 !w-6" />{label}{dot && <RedDot />}
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
  // Opening now lives on the main page ("/"); the world starts immediately.
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
  const [gpsReady, setGpsReady] = useState(false);
  const g = useSurvivalWorld(START, { enabled: !realGps || gpsReady, saveKey: realGps ? 'survival-gps-world-v1' : 'survival-world-v1', cloudSync: realGps, indoor: realGps });
  const gps = useSurvivalGps(realGps, g.moveTo);
  useEffect(() => setGpsReady(gps.ready), [gps.ready]);
  const { state: s } = g;
  const [expeditionTarget, setExpeditionTarget] = useState<LatLng | null>(null);
  const [watchExpedition, setWatchExpedition] = useState(true);
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
  const canDispatch = !!s.base && (!realGps || !gps.ready || g.inBase);
  const expeditionControls = <ExpeditionSystem crew={crew} logs={s.expeditionLogs ?? []} target={expeditionTarget} home={s.base} auto={!!s.expeditionAuto} pocket={g.pocketMode} outdoor={g.outdoorMoving && (g.pocketMode || (!!crew && distanceM(s.pos, crew.pos) <= 40))} watching={watchExpedition} gpsReady={gps.ready} canSend={canDispatch}
    focus={crew?.focus ?? expeditionFocus} onFocus={setExpeditionFocus}
    onSend={() => { if (g.dispatchObserved(expeditionDestination, expeditionFocus)) { setWatchExpedition(true); setPanel('none'); } }}
    onAuto={() => { g.toggleExpeditionAuto(expeditionDestination, expeditionFocus); setWatchExpedition(true); }} onPocket={g.togglePocket} onMorale={g.rallyExpedition} onReturn={g.recallExpedition} onWatch={() => setWatchExpedition(v => !v)} />;
  const [panel, setPanel] = useState<Panel>('none');
  const [craftCat, setCraftCat] = useState<CraftCat>('all');
  const [baseTab, setBaseTab] = useState<'lab' | 'craft' | 'storage' | 'expedition' | 'pets'>('lab');

  const onTap = (p: LatLng) => {
    if (auto.job) { auto.stop(); returnToCenter(); }
    if (realGps) { setExpeditionTarget(p); return; }
    const d = distanceM(s.pos, p);
    if (d > g.vision * 1.2) { toast('안개 속으로는 한 걸음씩 나아가세요'); return; }
    g.moveTo(p);
  };

  const tapEntity = (e: WorldEntity) => {
    if (realGps && !gps.ready) { toast.warning('정확한 GPS 신호를 기다려 주세요.'); return; }
    if (!realGps && distanceM(s.pos, e) > g.reach) { g.moveTo({ lat: e.lat, lng: e.lng }); return; }
    if (auto.job?.id === e.id) { auto.stop(); toast('작업을 멈췄습니다'); return; }
    if (distanceM(s.pos, e) > g.reach) { g.interact(e); return; }
    // Walk beside the object, then repeat the action automatically until done.
    setActorTarget({ lat: e.lat, lng: e.lng, anchor: s.pos });
    window.clearTimeout(returnTimer.current);
    auto.start(e, workKind(e).label);
  };
  const autoStep = (e: WorldEntity): 'continue' | 'stop' => {
    const w = gRef.current; const p = w.state;
    const alive = w.entities.some(x => x.id === e.id) && (e.kind === 'node' ? isNodeAvailable(e.id, e.type, p.depleted, Date.now()) : !p.depleted[e.id]);
    if (!alive) { window.clearTimeout(returnTimer.current); returnTimer.current = window.setTimeout(returnToCenter, ACTOR_IDLE_RETURN_MS); return 'stop'; }
    if (distanceM(p.pos, e) > w.reach) { toast('대상과 멀어져 작업을 멈췄습니다'); returnToCenter(); return 'stop'; }
    if (e.kind === 'node' && w.weight >= w.capacity) { toast.warning('배낭이 가득 찼습니다'); return 'stop'; }
    const act: SpriteAction = e.kind === 'creature' ? 'attack' : STRIKE_NODES.has(e.type) ? 'chop' : 'gather';
    if (!w.interact(e)) { setActorTarget(null); return 'stop'; }
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
  const lastPos = useRef(s.pos);
  useEffect(() => {
    if (lastPos.current.lat !== s.pos.lat || lastPos.current.lng !== s.pos.lng) { lastPos.current = s.pos; setAction(a => (a === 'idle' ? 'walk' : a)); window.clearTimeout(actionTimer.current); actionTimer.current = window.setTimeout(() => setAction('idle'), 1500); }
  }, [s.pos]);
  useEffect(() => () => { window.clearTimeout(actionTimer.current); window.clearTimeout(returnTimer.current); }, []);
  // Return sprite to GPS center when the player really walks or the object leaves the radius.
  useEffect(() => {
    if (actorTarget && shouldReturnToCenter(s.pos, actorTarget, g.reach)) returnToCenter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.pos, actorTarget]);

  const zone = s.terrainZones[zoneCellKey(s.pos)] ?? 'plains';
  const onSurfaceZone = (c: LatLng, z: typeof zone) => g.recordTerrainZone(zoneCellKey(c), z);
  const onSurfacePark = (c: LatLng, park: boolean) => g.recordPark(zoneCellKey(c), park);
  const actionReady = !realGps || gps.ready;
  const gpsReadyRef = useRef(actionReady); gpsReadyRef.current = actionReady;
  // Auto pickup tech: gather one hand-gatherable node within 10m every few seconds.
  const autoRef = useRef({ g, ready: actionReady });
  autoRef.current = { g, ready: actionReady };
  const autoOn = hasAutoPickup(s.techs);
  useEffect(() => {
    if (!autoOn) return;
    const id = window.setInterval(() => {
      const { g: w, ready } = autoRef.current;
      if (!ready || w.weight >= w.capacity) return;
      const p = w.state;
      const target = w.entities.find(e => e.kind === 'node' && !STRIKE_NODES.has(e.type)
        && isNodeAvailable(e.id, e.type, p.depleted, Date.now()) && distanceM(p.pos, e) <= AUTO_PICKUP_RADIUS_M);
      if (target) w.interact(target);
    }, AUTO_PICKUP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [autoOn]);
  const activateSkill = (id: Parameters<typeof g.useSkill>[0]) => { if (g.useSkill(id)) { playAction('attack', 900); playSample('strike'); } };
  const inPark = !!s.parkCells?.[zoneCellKey(s.pos)];
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const { setSanctuaries } = g;
  const nearShrines = useMemo(() => shrinesNear(s.pos, 600), [Math.round(s.pos.lat * 2000), Math.round(s.pos.lng * 2000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selShrine, setSelShrine] = useState<Shrine | null>(null);
  const [shrineWords, setShrineWords] = useState<string | null>(null);
  useEffect(() => { setSanctuaries([...landmarks.filter((l) => l.kind === 'shaman'), ...nearShrines].map((l) => ({ lat: l.lat, lng: l.lng }))); }, [landmarks, nearShrines, setSanctuaries]);
  const [selLandmark, setSelLandmark] = useState<Landmark | null>(null);
  const favs = useSurvivalFavorites();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const mapBearing = compassOn && heading !== null ? heading : 0;
  const [shamanWords, setShamanWords] = useState<string | null>(null);

  const hit = useHitPulse(s.hp);
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
  const { user, signOut } = useAuth();
  const gameSettings = useGameSettings();
  useEffect(() => { setBgmPlaying(gameSettings.bgm); return () => setBgmPlaying(false); }, [gameSettings.bgm]);
  useEffect(() => { if (hit.n > 0) { playSample('strike'); if (visibleEntities.some(e => e.kind === 'creature' && e.id === auto.job?.id)) playSample('beastAttack'); haptic(120); if (document.hidden) sendNotice('짐승의 공격!', '거점 밖에서 짐승에게 공격받고 있어요', 'beast-hit'); } }, [hit.n]); // eslint-disable-line react-hooks/exhaustive-deps
  // Beasts inside 10m (or chasing after being hit) strike the player first.
  const [aggroIds, setAggroIds] = useState<Set<string>>(() => new Set());
  const winterOn = gameSettings.winter;
  useCustomCatalog();
  const [hatched, setHatched] = useState<{ id: string; name: string; custom?: boolean } | null>(null);
  const eggSpawns = useMemo(() => realGps && !g.inBase ? eggSpawnsNear(s.pos, s.depleted, Date.now()).filter(e => distanceM(s.pos, e) <= EGG_SPAWN_RADIUS_M) : [],
    [realGps, g.inBase, s.pos, s.depleted]); // eslint-disable-line react-hooks/exhaustive-deps
  const readyEgg = (s.dinoEggs ?? []).find(e => eggReady(e, s.walkSteps ?? 0));
  useEffect(() => {
    if (!readyEgg || !g.inBase || hatched || (realGps && !gps.ready)) return;
    const baby = g.hatchEgg(readyEgg.id);
    if (baby) setHatched(baby);
  }, [readyEgg?.id, g.inBase, hatched, gps.ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const [beastStrike, setBeastStrike] = useState<{ id: string; at: number } | null>(null);
  const lastBeastStrike = useRef(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const w = gRef.current; const p = w.state; const t = Date.now();
      if (realGps && !gpsReadyRef.current) return;
      const hostile = w.entities.filter(e => e.kind === 'creature' && !p.depleted[e.id] && beastAggro(e.type, distanceM(p.pos, e), { isNight: w.isNight, engaged: (p.damage[e.id] ?? 0) > 0, calm: (p.calmUntil?.[e.id] ?? 0) > t || w.inSanctuary }));
      setAggroIds(prev => { const n = new Set(hostile.map(e => e.id)); return n.size === prev.size && [...n].every(x => prev.has(x)) ? prev : n; });
      const near = hostile.sort((a, b) => distanceM(p.pos, a) - distanceM(p.pos, b))[0];
      if (!near || near.kind !== 'creature' || t - lastBeastStrike.current < BEAST_STRIKE_INTERVAL_MS) return;
      lastBeastStrike.current = t;
      setBeastStrike({ id: near.id, at: t });
      if (!document.hidden) playSample('beastAttack');
      const def = creatureDef(near.type);
      w.takeDamage(def.atk, true);
      toast.error(`${def.name}이(가) 먼저 공격했습니다! 공격하거나 도망치세요`);
    }, 500);
    return () => window.clearInterval(id);
  }, [realGps]);
  const gRef = useRef(g); gRef.current = g;
  const [duelWith, setDuelWith] = useState<string | null>(null);
  const duelRef = useRef<string | null>(null); duelRef.current = duelWith;
  const [vassalLinks, setVassalLinks] = useState<Set<string>>(() => new Set());
  const pendingVassal = useRef(new Set<string>());
  const [vassalOffer, setVassalOffer] = useState<{ id: string; name: string } | null>(null);
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
  const presence = useSurvivalPresence(realGps ? gps.ready : true, s.pos, s.level, onPeerEvent, chiefName, s.base);
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
          rows.forEach(r => toast.success(`부하 ${r.vassal_name}이(가) ${ITEMS[r.item_id as ItemId].name} ${r.count}개를 거점에 상납했습니다`));
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
    const dmg = PVP_BASE_DAMAGE + (g.weapon ? ITEMS[g.weapon.itemId].weapon?.atk ?? 0 : 0);
    presence.send({ type: 'attack', to: selPeer.id, dmg });
    setActorTarget({ lat: selPeer.lat, lng: selPeer.lng, anchor: s.pos });
    playAction('attack', 900);
    window.clearTimeout(returnTimer.current);
    returnTimer.current = window.setTimeout(returnToCenter, 900 + ACTOR_IDLE_RETURN_MS);
    toast(`${selPeer.name}을(를) 공격했습니다 (-${dmg})`);
    setSelPeerId(null);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden font-pixel">
      <AnimatePresence>{showOpening && <ColonionOpening onEnter={enterWorld} />}</AnimatePresence>
      {<TerrainMap center={watchExpedition && crew ? crew.pos : s.pos} visionM={g.vision} explored={s.explored} onTap={onTap} zone={zone} onSurfaceZone={onSurfaceZone} onSurfacePark={onSurfacePark} onLandmarks={setLandmarks} bearing={compassOn && heading !== null ? heading : 0}>
        {(project, mpp) => (
          <>
            {crew && <ExpeditionMarker crew={crew} project={project} members={s.tribe?.count ?? 1} />}
            {crew && <ExpeditionJoystick crew={crew} candidates={g.crewNearby} project={project} onManual={g.setCrewManual} onSteer={g.steerCrew} onCommand={g.commandCrew} />}
            {s.base && g.baseDef && <BasePetsOverlay base={s.base} radius={g.baseDef.radiusM + (s.palisade ? 15 : 0)} pets={s.pets ?? []} hits={g.petHits} project={project} />}
            {eggSpawns.map(egg => { const p = project(egg); return (
              <button key={egg.id} type="button" aria-label="신비한 픽셀 공룡 알" onClick={ev => { ev.stopPropagation(); g.pickEgg(egg); }}
                className="pointer-events-auto absolute z-10 flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-full items-center justify-center" style={{ left: p.x, top: p.y }}>
                <motion.img src={EGG_ART} alt="" className="pixelated h-10 w-10 drop-shadow-[0_0_8px_hsl(var(--accent))]" animate={reducedMotion ? undefined : { y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} />
              </button>); })}
            {expeditionTarget && (() => { const p = project(expeditionTarget); return <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded bg-primary px-2 py-1 text-xs text-primary-foreground" style={{ left: p.x, top: p.y }}>원정 목표</div>; })()}
            {s.base && g.baseDef && (() => {
              const p = project(s.base); const r = (g.baseDef.radiusM + (s.palisade ? 15 : 0)) / mpp;
              return (
                <div className="pointer-events-none absolute" style={{ left: p.x, top: p.y, transform: 'translate(-50%,-50%)' }}>
                  <div className="rounded-full border-2 border-dashed border-primary/70 bg-primary/10" style={{ width: r * 2, height: r * 2 }} />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><BaseFortressOverlay baseLevel={s.base.level} hasPalisade={!!s.palisade} hasAltar={!!s.altar} /></div>
                  {!s.tribe?.escort && !s.observedExpedition?.mercenary && Array.from({ length: Math.min(6, s.tribe?.count ?? 0) }, (_, k) => { const a = (k / Math.min(6, s.tribe!.count)) * Math.PI * 2; return <motion.img key={k} src={escortArt} alt="" aria-hidden className="pixelated pointer-events-none absolute left-1/2 top-1/2 h-10 w-auto" style={{ marginLeft: Math.cos(a) * 70 - 14, marginTop: Math.sin(a) * 40 - 20 }} animate={reducedMotion ? undefined : { x: [0, k % 2 ? 8 : -8, 0] }} transition={{ repeat: Infinity, duration: 4 + k }} />; })}<div className="absolute left-1/2 top-1/2 h-20 w-64 -translate-x-1/2 -translate-y-1/2"><BaseNpcs shamanMet={!!s.shamanMet} tribe={s.tribe} storage={s.storage} backpack={s.backpack} now={Date.now()} onMeet={g.meetShaman} onHire={g.hireMerc} onTrain={g.trainTribe} onTreat={g.treatTribe} onEscort={g.toggleEscort} expeditionBusy={!!s.observedExpedition?.mercenary} /></div>
                </div>
              );
            })()}
            {s.outpost && (() => { const p = project(s.outpost); return <div className="pointer-events-none absolute flex flex-col items-center" style={{ left: p.x, top: p.y, transform: 'translate(-50%,-100%)' }}><div className="relative"><div aria-hidden className="pointer-events-none absolute left-1/2 bottom-0 h-2 w-8 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground/30 blur-[2px]" /><Sprite k="base-outpost" scale={1.2} /></div><span className="rounded bg-background px-1 text-[10px]">전진기지</span></div>; })()}
            {landmarks.filter((l) => l.kind === 'shaman' && distanceM(s.pos, l) <= g.vision + SANCTUARY_RADIUS_M).map((l) => {
              const p = project(l); const r = SANCTUARY_RADIUS_M / mpp;
              return <div key={`sanct-${l.id}`} aria-hidden className="pointer-events-none absolute rounded-full border-2 border-primary/60 bg-primary/5 shadow-[0_0_18px_hsl(var(--primary)/0.5)]" style={{ left: p.x, top: p.y, width: r * 2, height: r * 2, transform: 'translate(-50%,-50%)' }} />;
            })}
            {nearShrines.filter((sh) => distanceM(s.pos, sh) <= g.vision + SHRINE_AURA_M).map((sh) => {
              const p = project(sh); const r = SHRINE_AURA_M / mpp;
              const awake = !!s.shrines?.found.includes(sh.id);
              return (
                <div key={sh.id} className="absolute" style={{ left: p.x, top: p.y, transform: 'translate(-50%,-50%)' }}>
                  <div aria-hidden className={`pointer-events-none rounded-full border-[3px] border-[hsl(var(--sacred))] bg-[hsl(var(--sacred)/0.18)] shadow-[0_0_28px_hsl(var(--sacred)/0.8)] ${awake ? 'animate-pulse' : 'opacity-60'}`} style={{ width: r * 2, height: r * 2 }} />
                  <button type="button" aria-label={sh.name} onClick={(ev) => { ev.stopPropagation(); setShrineWords(null); setSelShrine(sh); }}
                    className="pointer-events-auto absolute left-1/2 top-1/2 flex w-max -translate-x-1/2 -translate-y-[85%] flex-col items-center">
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
              return (
                <button key={l.id} type="button" aria-label={info.name} data-landmark={l.kind} onClick={(ev) => { ev.stopPropagation(); setShamanWords(null); setSelLandmark(l); }}
                  className="pointer-events-auto absolute flex min-h-11 min-w-11 flex-col items-center"
                  style={{ left: p.x, top: p.y, transform: 'translate(-50%,-100%)' }}>
                  <div className="rounded-full bg-primary/30 p-0.5 shadow-[0_0_12px_hsl(var(--primary))]"><Sprite k={info.sprite} scale={l.kind === 'shaman' || l.kind === 'trader' ? LANDMARK_FEATURE_SCALE : 1} /></div>
                  <span className="whitespace-nowrap rounded bg-primary px-1 text-[10px] text-primary-foreground">{info.name}</span>
                </button>
              );
            })}
            {visibleEntities.map((e) => {
              const p = project(e);
              const sprite = e.kind === 'node' ? nodeDef(e.type).sprite : creatureDef(e.type).sprite;
              const name = e.kind === 'node' ? nodeDef(e.type).name : creatureDef(e.type).name;
              const engaged = crew?.target?.id === e.id;
              const combatHit = expeditionHit?.target.id === e.id ? expeditionHit : undefined;
              const petHit = g.petHits.find(h => h.target.id === e.id && Date.now() - h.at < 1800);
              const dmg = e.kind === 'creature' ? s.damage[e.id] : engaged ? crew.damage : s.damage[e.id];
              const creature = e.kind === 'creature' ? creatureDef(e.type) : null;
              const remainingHp = creature ? Math.max(0, creature.hp - (dmg ?? 0)) : 0;
              const boss = e.kind === 'creature' && !!creatureDef(e.type).boss;
              return (
                <button key={e.id} type="button" aria-label={name} onClick={(ev) => { ev.stopPropagation(); tapEntity(e); }}
                  data-resource-id={e.id} data-lat={e.lat} data-lng={e.lng}
                  className="pointer-events-auto absolute flex min-h-11 min-w-11 flex-col items-center"
                  style={{ left: p.x, top: p.y, transform: 'translate(-50%,-100%)' }}>
                  <div className="relative">
                  {creature && (creature.temper !== 'passive' || engaged) && <div data-creature-ring={e.id} aria-hidden className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed ${aggroIds.has(e.id) || engaged ? 'border-destructive bg-destructive/10' : 'border-destructive/40'}`} style={{ width: (CREATURE_RING_RADIUS_M / mpp) * 2, height: (CREATURE_RING_RADIUS_M / mpp) * 2 }} />}
                  <div aria-hidden className="pointer-events-none absolute left-1/2 bottom-0 h-2 w-8 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground/30 blur-[2px]" /><motion.div key={`${e.id}:${combatHit?.at ?? dmg ?? 0}`} data-creature-strike={combatHit?.at} className={g.isNight ? '' : 'brightness-110 contrast-110 drop-shadow-[0_0_3px_hsl(var(--background))]'}
                    animate={(() => {
                      if (reducedMotion) return { x: 0, y: 0 };
                      if (combatHit && crew) {
                        const actor = expeditionActorPoint(crew, project);
                        const dx = actor.x - p.x, dy = actor.y - p.y, len = Math.hypot(dx, dy) || 1;
                        return { x: [0, -dx / len * 8, dx / len * 22, 0], y: [0, -dy / len * 8, dy / len * 22, 0] };
                      }
                      if (aggroIds.has(e.id)) { const me = project(s.pos); return { x: [0, (me.x - p.x) * 0.35, 0], y: [0, (me.y - p.y) * 0.35, 0] }; }
                      if (dmg) return { x: [0, -4, 4, -3, 3, 0], y: 0 };
                      return { x: 0, y: e.kind === 'creature' ? [0, -3, 0] : 0 };
                    })()}
                    transition={combatHit ? { duration: 0.7, times: [0, 0.25, 0.65, 1] } : aggroIds.has(e.id) && !reducedMotion ? { repeat: Infinity, duration: 1.2 } : dmg ? { duration: 0.35 } : { repeat: reducedMotion ? 0 : Infinity, duration: 0.8 }}>
                    <div className={boss ? 'scale-150 rounded-full ring-2 ring-destructive shadow-[0_0_18px_hsl(var(--destructive))]' : ''}>{e.kind === 'creature'
                      ? <CreatureSprite key={e.type} type={e.type} fallbackUrl={url(sprite)} width={SPRITE_META[sprite].w} height={SPRITE_META[sprite].h}
                          attacking={!!combatHit?.counterDamage || !!petHit?.counterDamage || (beastStrike?.id === e.id && Date.now() - beastStrike.at < 1000)} />
                      : <Sprite k={sprite} />}</div>
                  </motion.div>{combatHit && <CombatImpact stamp={combatHit.at} damage={combatHit.damage} />}</div>
                  {(s.calmUntil?.[e.id] ?? 0) > Date.now() && <span className="bg-primary text-[10px] text-primary-foreground">진정됨</span>}
                  {boss ? <span className="mt-2 rounded bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">우두머리</span> : null}
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
              return (
                <button key={pr.id} type="button" aria-label={`${pr.name} 상호작용`} onClick={(ev) => { ev.stopPropagation(); setSelPeerId(pr.id); }}
                  className="pointer-events-auto absolute flex min-h-11 min-w-11 flex-col items-center transition-[left,top] duration-1000 ease-linear"
                  style={{ left: p.x, top: p.y, transform: 'translate(-50%,-100%)' }}>
                  {bubbles[pr.id] && <span className="whitespace-nowrap rounded bg-card px-1.5 text-[11px]">{bubbleView(bubbles[pr.id])}</span>}
                  <div className="relative"><div aria-hidden className="pointer-events-none absolute left-1/2 bottom-0 h-2 w-8 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground/30 blur-[2px]" /><Sprite k="char-hunter" className="opacity-90 hue-rotate-90" /></div>
                  <span className={`rounded px-1 text-[10px] ${ally ? 'bg-primary text-primary-foreground' : 'bg-background/80'}`}>{pr.name}</span>
                </button>
              );
            })}
            {(() => {
              const p = project(s.pos); const r = g.reach / mpp;
              return (
                <div className="pointer-events-none absolute" style={{ left: p.x, top: p.y, transform: 'translate(-50%,-50%)' }}>
                  {g.skillEffect && Date.now() - g.skillEffect.at < 1200 && <div className="absolute left-1/2 top-1/2"><SkillEffect id={g.skillEffect.id} stamp={g.skillEffect.at} radius={r} /></div>}
                  {(s.companions ?? []).some(c => c.kind === 'wolf') && <div className="absolute left-1/2 top-1/2 translate-x-5"><Sprite k="mob-wolf" scale={0.7} /></div>}
                  <div className="rounded-full border border-primary/60" style={{ width: r * 2, height: r * 2 }} />
                  {(() => {
                    // Visual-only offset: stop slightly short of the object so the sprite stands beside it.
                    const t = actorTarget ? project(actorTarget) : p;
                    const dx = (t.x - p.x) * 0.85, dy = (t.y - p.y) * 0.85;
                    return (
                      <motion.div className="absolute left-1/2 top-1/2" initial={false} animate={{ x: dx, y: dy }} transition={{ duration: actorTarget ? 0.25 : 0.5, ease: 'easeOut' }}>
                        <div className="-translate-x-1/2 -translate-y-[85%]">
                          {auto.job && (() => {
                            const tgt = g.entities.find(x => x.id === auto.job!.id);
                            const need = tgt ? (tgt.kind === 'node' ? nodeDef(tgt.type).hp : creatureDef(tgt.type).hp) : 1;
                            const pct = Math.min(100, Math.round(((s.damage[auto.job.id] ?? 0) / need) * 100));
                            return <div className="absolute -top-9 left-1/2 w-20 -translate-x-1/2 rounded bg-background/90 px-1 py-0.5 text-center text-[10px] font-bold" role="status">
                              {auto.job.label} {pct}%<div className="mt-0.5 h-1.5 w-full bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${pct}%` }} /></div>
                            </div>;
                          })()}
                          {bubbles[presence.selfId] && <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-card px-1.5 text-[11px]">{bubbleView(bubbles[presence.selfId])}</span>}
                          <div className="relative"><div aria-hidden className="pointer-events-none absolute left-1/2 bottom-0 h-2 w-8 -translate-x-1/2 translate-y-1/2 rounded-full bg-foreground/30 blur-[2px]" /><HitFlash hit={hit}><div style={{ transform: dx < -1 ? 'scaleX(-1)' : undefined, opacity: crew ? 0.35 : 1, transition: 'opacity 0.3s' }}><CharacterSprite action={action} level={s.level} height={Math.round(SPRITE_META['char-hunter'].h * PLAYER_SCALE)} /></div></HitFlash>{escortReady(s.tribe, Date.now(), !!s.observedExpedition?.mercenary) && <>{Array.from({ length: Math.min(5, s.tribe?.count ?? 1) }, (_, k) => <img key={k} src={escortArt} alt={k ? "" : "동행 부족민"} className="pixelated pointer-events-none absolute bottom-0 h-12 w-auto" style={{ left: -36 - k * 22, bottom: (k % 2) * 6, transform: dx < -1 ? 'scaleX(-1)' : undefined }} />)}</>}{(s.pets ?? []).filter(x => petRole(x) === 'follow').map((x, i) => <div key={x.uid} className="pointer-events-none absolute bottom-0" style={{ left: 40 + i * 26, transform: dx < -1 ? 'scaleX(-1)' : undefined }}><PetSprite speciesId={x.speciesId} name={x.name} height={30} /></div>)}</div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>
              );
            })()}
          </>
        )}
      </TerrainMap>}

      {winterOn && <WinterThemeOverlay />}
      {!!s.dinoEggs?.length && <div className="pointer-events-none absolute bottom-[calc(7rem+env(safe-area-inset-bottom))] left-2 z-20 flex items-center gap-1 rounded bg-card/90 px-2 py-1 text-xs" aria-label="공룡 알 부화 진행">
        <img src={EGG_ART} alt="" className="pixelated h-6 w-6" />알 {s.dinoEggs.length}개 · {(() => { const e = [...s.dinoEggs].sort((a, b) => (eggNeedM(a) - eggWalkedM(a, s.walkSteps ?? 0)) - (eggNeedM(b) - eggWalkedM(b, s.walkSteps ?? 0)))[0]; return `${Math.min(eggNeedM(e), eggWalkedM(e, s.walkSteps ?? 0))}/${eggNeedM(e)}m`; })()}
        {readyEgg && !g.inBase && <b className="text-primary"> · 거점으로!</b>}</div>}
      <DinoEggHatchModal baby={hatched} onClose={() => setHatched(null)} />
      {/* Top HUD */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-background/80 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
        <GameMenu loggedIn={!!user} onExit={() => navigate(realGps ? '/' : '/play')}
          onLogout={async () => { try { await signOut(); navigate('/login'); } catch { toast.error('로그아웃에 실패했어요. 다시 시도해 주세요'); } }} />
        <div className="flex-1 space-y-1 text-xs">
          <div className="flex items-center gap-1">체력<HpBar value={s.hp} max={g.maxHp} />{s.hp}/{g.maxHp}</div>
          <div className="flex items-center gap-1">허기<div className="h-2.5 flex-1 border border-foreground bg-muted"><div className="h-full bg-primary" style={{ width: `${s.hunger}%` }} /></div>{s.hunger}</div>
        </div>
        <div className="text-right text-[11px] leading-tight">
          <div>{g.isNight ? '밤' : '낮'} · {TERRAIN_ZONE_LABEL[zone]}{inPark ? ' · 공원(짐승 多)' : ''}{g.inSanctuary ? ' · 성소(안전)' : ''} · 시야 {g.vision}m</div>
          <div className="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1 font-bold text-primary"><Snowflake className="!h-3 !w-3" />혹한기 구석기 시즌: 동토의 개척자</div>
          <div>배낭 {g.weight}/{g.capacity}kg</div>
          <div aria-label="성장 진행도">족장 {presence.name} · Lv.{s.level} · XP {s.xp}/{g.nextLevelXp}</div>
        </div>
      </div>

      {/* Compass toggle: north-up vs heading-up */}
      <button type="button" aria-label={compassOn ? '북쪽 고정으로 전환' : '방향 따라가기 켜기'} aria-pressed={compassOn} onClick={toggleCompass}
        className={`pixel-btn absolute right-2 top-[calc(max(0.5rem,env(safe-area-inset-top))+4.25rem)] z-20 flex h-11 w-11 items-center justify-center ${compassOn ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
        <Compass className="!h-6 !w-6" style={{ transform: `rotate(${compassOn && heading !== null ? -heading : 0}deg)` }} />
      </button>

      {realGps && <div className="absolute left-2 right-16 top-[calc(4.5rem+env(safe-area-inset-top))] z-20 flex items-center gap-1.5">
        <span className="min-w-0 truncate rounded bg-background/80 px-2 py-1 text-[10px]" role="status">{!gps.ready ? '실내 원정 가능 · 야외 GPS 대기' : `GPS ±${Math.round(gps.fix?.accuracy ?? 0)}m`}</span>
        {!gps.ready && <Button variant="outline" size="sm" className="h-9 shrink-0 px-2 text-xs" onClick={gps.retry}>재시도</Button>}
      </div>}

      {favs.tracked && (() => {
        const d = distanceM(s.pos, favs.tracked);
        return (
          <button type="button" onClick={() => setPanel('favs')} className="pixel-frame absolute left-1/2 top-[calc(6.75rem+env(safe-area-inset-top))] z-20 flex max-w-[60%] -translate-x-1/2 items-center gap-1.5 bg-card px-2 py-1 text-xs">
            <Navigation className="!h-5 !w-5 shrink-0 text-primary" style={{ transform: `rotate(${bearingDeg(s.pos, favs.tracked) - mapBearing}deg)` }} />
            <span className="truncate">{favs.tracked.name}</span><b className="shrink-0">{d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${Math.round(d)}m`}</b>
          </button>
        );
      })()}

      {/* Right drawer: survival actions */}
      <div className="absolute right-2 top-[calc(7.5rem+env(safe-area-inset-top))] z-20 flex flex-col items-end gap-2">
        <Button type="button" variant="outline" aria-expanded={rightOpen} aria-label={rightOpen ? '생존 메뉴 접기' : '생존 메뉴 펼치기'} onClick={() => setRightOpen((v) => !v)} className={`pixel-btn relative h-11 w-11 p-0 ${rightOpen ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
          {rightOpen ? <ChevronUp className="!h-6 !w-6" /> : <Backpack className="!h-6 !w-6" />}{!rightOpen && baseDone && <RedDot />}
        </Button>
        <AnimatePresence>
          {rightOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-2">
              <MenuBtn icon={Backpack} label="배낭" onClick={() => setPanel('bag')} />
              <MenuBtn icon={Flame} label="거점" dot={baseDone} onClick={() => setPanel('base')} />
              {realGps && <MenuBtn icon={LocateFixed} label="GPS 갱신" onClick={gps.retry} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Left drawer: skills & exploration */}
      <div className="absolute left-2 top-[calc(7.5rem+env(safe-area-inset-top))] z-20 flex flex-col items-start gap-2">
        <Button type="button" variant="outline" aria-expanded={leftOpen} aria-label={leftOpen ? '기술 메뉴 접기' : '기술 메뉴 펼치기'} onClick={() => setLeftOpen((v) => !v)} className={`pixel-btn relative h-11 w-11 p-0 ${leftOpen ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
          {leftOpen ? <ChevronUp className="!h-6 !w-6" /> : <Lightbulb className="!h-6 !w-6" />}{!leftOpen && techDone && <RedDot />}
        </Button>
        <AnimatePresence>
          {leftOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col gap-2">
              <MenuBtn icon={Lightbulb} label="기술" dot={techDone} onClick={() => setPanel('tech')} />
              <MenuBtn icon={ListChecks} label="생존 목표" onClick={() => setPanel('quests')} />
              <MenuBtn icon={Star} label="즐겨찾기" onClick={() => setPanel('favs')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!s.base && (
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 pixel-frame bg-card p-3 text-sm">
          나뭇가지 {countOf(s.backpack, 'branch')}/{CAMP_COST[0].count}개를 모아 모닥불 거점을 세우세요.
          <Button type="button" disabled={realGps && !gps.ready} onClick={g.placeBase} className="pixel-btn mt-2 h-11 w-full">여기에 모닥불 세우기</Button>
        </div>
      )}

      {!realGps && <SkillQuickBar known={s.techs} cooldowns={s.cooldowns} levels={s.skillLevels} ready={actionReady} onUse={(id) => activateSkill(id)} />}
      {!realGps && s.base && <button type="button" onClick={() => setPanel('quests')} className="pixel-frame absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-2 z-20 flex min-h-11 max-w-[60%] items-center gap-2 bg-card px-2.5 py-1.5 text-left text-xs">
        <ListChecks className="!h-4 !w-4 shrink-0" />
        <span className="min-w-0 truncate">{g.quest?.title ?? '모든 목표 완료'}</span>
        <span className="shrink-0 text-primary">{g.canClaimQuest ? '보상!' : g.questProgress ? `${g.questProgress.cur}/${g.questProgress.max}` : '완료'}</span>
      </button>}

      <AnimatePresence>
        {panel !== 'none' && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="absolute inset-x-0 bottom-0 z-30 flex max-h-[75dvh] flex-col border-t-4 border-foreground bg-background">
            <div className="flex items-center justify-between border-b-2 border-foreground px-3 py-2">
              <b className="text-lg">{panel === 'bag' ? '배낭' : panel === 'base' ? (g.baseDef?.name ?? '거점') : panel === 'quests' ? '생존 목표' : panel === 'favs' ? '즐겨찾기' : '제작 기술'}</b>
              <button type="button" aria-label="닫기" onClick={() => setPanel('none')} className="flex h-11 w-11 items-center justify-center"><X className="!h-7 !w-7" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {panel === 'quests' && <SurvivalObjectives state={{ ...s, storedGear: [], stats: { gathered: s.gathered, crafted: s.crafted, kills: s.kills, deposits: s.deposits } }} canClaim={g.inBase && (!realGps || gps.ready)} onClaim={g.claimQuest} />}
              {panel === 'bag' && (
                <>
                  <p className="text-xs text-muted-foreground">음식은 눌러서 먹을 수 있어요.</p>
                  <Stacks stacks={s.backpack} onUse={g.eat} />
                  {!!s.backpack.filter(st => st.itemId !== 'shell').length && <div className="flex flex-wrap gap-1">{s.backpack.filter(st => st.itemId !== 'shell').map(st => <Button key={st.itemId} variant="outline" size="sm" className="min-h-11 text-xs" disabled={!g.inBase || !actionReady} onClick={() => g.storeOne(st.itemId)}>{ITEMS[st.itemId].name} 1개 창고에 넣기</Button>)}</div>}
                  <EquipmentSlots gear={s.gear} loadout={g.loadout} level={s.level} onEquip={g.equip} icon={(x) => <Sprite k={ITEMS[x.itemId].sprite} scale={0.75} />} />
                  <BackpackDiscard backpack={s.backpack} onDrop={g.dropItems} />
                </>
              )}

              {panel === 'base' && (!s.base ? <p className="text-sm">아직 거점이 없습니다.</p> : (
                <>
                  {!g.inBase && <p className="pixel-frame bg-accent p-2 text-sm">거점 반경 안에서만 제작·연구할 수 있어요.</p>}
                  <div className="sticky top-0 z-10 -mx-3 -mt-3 grid grid-cols-5 gap-1 border-b border-border bg-background p-2">
                    {([['lab','연구·발명'],['craft','제작'],['storage','창고'],['expedition','원정'],['pets','펫']] as const).map(([id, label]) => (
                      <Button key={id} type="button" variant={baseTab === id ? 'default' : 'outline'} onClick={() => setBaseTab(id)} className="pixel-btn min-h-11 px-1 text-xs">{label}{id === 'expedition' && s.expedition && nowTick >= s.expedition.readyAt ? ' •' : ''}</Button>
                    ))}
                  </div>
                  {baseTab === 'lab' && <>
                                    {s.baseUpgrade && <JobCard title={`${BASE_LEVELS[Number(s.baseUpgrade.id) as 2 | 3].name} 공사`} job={s.baseUpgrade} now={nowTick} claimLabel="발전 완료" onClaim={g.claimBaseUpgrade} />}
                  <div className="border-y border-border py-3"><b className="text-sm">연구 시설 · 발명</b><div className="mt-2"><AltarPanel altar={!!s.altar} baseLevel={s.base.level} remote={realGps} credits={s.inventionCredits} walkedMeters={Math.min(200, Math.max(0, ((s.walkSteps ?? 0) - Math.min(s.inventionWalkMark ?? 0, s.walkSteps ?? 0)) * 20))} onCredits={g.updateInventionCredits} inviteUrl={`${window.location.origin}/?invite=${encodeURIComponent(user?.id ?? "pioneer")}`} ready={actionReady} inBase={g.inBase} owned={[...s.backpack, ...s.storage]} inventions={s.inventions ?? []} onBuild={g.buildAltar} onInvent={g.invent} gear={s.gear} onUpgrade={g.upgradeGear} /></div></div>
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
                  {!!s.backpack.filter(st => st.itemId !== 'shell').length && <div className="flex flex-wrap gap-1">{s.backpack.filter(st => st.itemId !== 'shell').map(st => <Button key={st.itemId} variant="outline" size="sm" className="min-h-11 text-xs" disabled={!g.inBase || !actionReady} onClick={() => g.storeOne(st.itemId)}>{ITEMS[st.itemId].name} 1개 창고에 넣기</Button>)}</div>}
                  <div><b className="text-sm">창고</b><div className="mt-1"><Stacks stacks={s.storage} onUse={g.eat} /></div><div className="mt-2 flex flex-wrap gap-1">{s.storage.map(st => <Button key={st.itemId} variant="outline" size="sm" className="min-h-11 text-xs" disabled={!g.inBase || !actionReady} onClick={() => g.withdraw(st.itemId)}>{ITEMS[st.itemId].name} 1개 꺼내기</Button>)}</div></div>
                  </>}
                  {baseTab === 'pets' && <PetPanel pets={s.pets ?? []} defense={s.petDefense} now={nowTick} ready={atMainBase(s) && (!realGps || gps.ready || !gps.fix)} onFuse={g.mergePets} onDeploy={g.togglePetDeploy} onRole={g.assignPetRole} onLock={g.togglePetLock}
                    eggs={(s.dinoEggs ?? []).map(e => ({ id: e.id, name: '공룡 알', walked: eggWalkedM(e, s.walkSteps ?? 0), need: eggNeedM(e), ready: eggReady(e, s.walkSteps ?? 0) }))}
                    onHatch={(id) => { const baby = g.hatchEgg(id); if (baby) setHatched(baby); else toast.warning('거점 안에서 알이 배낭이나 창고에 있어야 부화해요'); }} />}
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
                  <Button type="button" variant="outline" className="pixel-btn h-11 w-full" disabled={realGps && !gps.ready}
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
                        <p>제작법: {t.recipes.map(id => { const r = g.recipes.find(x => x.id === id); return r ? ITEMS[r.result].name : ''; }).join(', ')}</p>
                        {!known && t.inspire && <p className="mt-1">깨달음: {ITEMS[t.inspire.itemId].name} {Math.min(s.gathered[t.inspire.itemId] ?? 0, t.inspire.count)}/{t.inspire.count}개 채집</p>}
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
                      <button type="button" disabled={(realGps && !gps.ready) || countOf(s.backpack, 'branch') < CAMP_COST[0].count} onClick={g.placeBase}
                        className="pixel-btn h-11 w-full bg-primary text-primary-foreground disabled:opacity-40">{s.base ? '현재 위치로 거점 옮기기' : '여기에 거점 건설'}</button>
                    </div>
                  )}
                  {techTab === 'special' && <SkillControls known={s.techs} cooldowns={s.cooldowns} ready={actionReady} onUse={activateSkill} />}
                  {techTab === 'special' && (Object.keys(ACTIVE_SKILLS) as ActiveSkill[]).filter(id => s.techs.includes(id)).map(id => {
                    const lv = skillLevel(s.skillLevels, id); const cost = skillUpgradeCost(lv);
                    return <div key={`up-${id}`} className="flex items-center gap-2 text-xs"><span className="flex-1">{ACTIVE_SKILLS[id].name} Lv.{lv}/{MAX_SKILL_LEVEL}{cost ? ` · 강화: ${cost.map(c => `${ITEMS[c.itemId].name} ${c.count}`).join(' · ')}` : ''}</span>
                      <Button size="sm" variant="outline" className="h-11" disabled={!cost} onClick={() => g.upgradeSkill(id)}>{cost ? '강화' : '최고'}</Button></div>;
                  })}
                  {techTab === 'build' && <ConstructionControls known={s.techs} palisade={s.palisade} outpost={!!s.outpost} ready={actionReady} onBuild={g.construct} />}
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
          onEmote={(e) => { presence.send({ type: 'emote', to: selPeer.id, emote: e }); showBubble(presence.selfId, `icon:${e}`); playSfx('emote'); playAction('talk', 900); setSelPeerId(null); }}
          onDuel={() => { presence.send({ type: 'duel', to: selPeer.id, name: presence.name }); setDuelWith(selPeer.id); playSfx('warn'); toast.warning(`${selPeer.name}님에게 전투를 걸었습니다! ${DUEL_MAX_DISTANCE_M}m 멀어지면 끝납니다.`); }}
          onVassal={() => { pendingVassal.current.add(selPeer.id); presence.send({ type: 'vassal-req', to: selPeer.id, name: presence.name }); toast('부하 임명을 요청했습니다'); setSelPeerId(null); }}
          onAlly={() => { pendingAlly.current.add(selPeer.id); presence.send({ type: 'ally', to: selPeer.id, name: presence.name }); toast('동맹을 제안했습니다'); setSelPeerId(null); }}
          onAttack={attackPeer} />}
      </AnimatePresence>
      <AnimatePresence>
        {selLandmark && <LandmarkSheet landmark={selLandmark} inRange={distanceM(s.pos, selLandmark) <= g.reach && (!realGps || gps.ready)}
          claims={s.landmarkClaims} backpack={s.backpack} words={shamanWords}
          onVisit={() => { const w = g.visitLandmark(selLandmark); if (w) { setShamanWords(w); playAction('talk', 900); } }}
          onSell={g.sellItem} onBuy={g.buyItem} onClose={() => setSelLandmark(null)}
          isFav={favs.isFav(selLandmark.id)}
          onToggleFav={() => { const was = favs.isFav(selLandmark.id); favs.toggle({ id: selLandmark.id, name: LANDMARK_INFO[selLandmark.kind].name, lat: selLandmark.lat, lng: selLandmark.lng }); toast(was ? '즐겨찾기에서 뺐어요' : '즐겨찾기에 등록했어요'); }} />}
      </AnimatePresence>
      <AnimatePresence>
        {selShrine && <ShrineSheet shrine={selShrine} state={s.shrines ?? emptyShrineState()} pos={s.pos} backpack={s.backpack} words={shrineWords}
          inRange={distanceM(s.pos, selShrine) <= g.reach && (!realGps || gps.ready)}
          onAwaken={() => { const w = g.awakenShrine(selShrine); if (w) { setShrineWords(w); playAction('talk', 900); } }}
          onRite={(id) => { if (g.shrineRite(selShrine, id)) playAction('gather', 900); }}
          onBless={() => { if (g.shrineBless(selShrine)) playAction('talk', 900); }}
          onClose={() => setSelShrine(null)} />}
      </AnimatePresence>
      <DamageVignette hitKey={hit.n} />
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
    </div>
  );
}

// Hook order can change across modules during edits; force a full reload instead of hot patching.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
