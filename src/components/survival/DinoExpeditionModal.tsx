import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Drumstick, Flag, Skull, Swords, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { petStats, PET_DEFENSE, type OwnedPet } from '@/lib/survival/pets';
import { petById } from '@/lib/survival/dinoEggs';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import { addStacks, countOf } from '@/lib/survival/inventory';
import { playSample, playSfx, haptic } from '@/lib/survival/gameSettings';
import type { Stack } from '@/lib/survival/types';
import PetSprite from './PetSprite';
import { HpBar } from './HitFeedback';
import boarImg from '@/assets/survival/mob-boar.png';
import wolfImg from '@/assets/survival/mob-wolf.png';
import raptorImg from '@/assets/survival/mob-raptor.png';
import mammothImg from '@/assets/survival/mob-mammoth.png';
import oakImg from '@/assets/survival/node-oak.png';
import quartzImg from '@/assets/survival/node-quartz.png';
import eggImg from '@/assets/survival/item-dino-egg.png';

export const DINO_ROAR_COOLDOWN_MS = 10_000;
export const DINO_ROAR_DURATION_MS = 4_000;
export const DINO_MEAT_HEAL_AMOUNT = 35;

export interface DinoEncounter {
  id: string;
  kind: 'node' | 'beast';
  name: string;
  spriteUrl: string;
  hp: number;
  maxHp: number;
  atk: number;
  xPct: number; // 100 (right edge) -> 38 (contact line)
  loot: Stack[];
}

interface FloatingDmg {
  id: string;
  xPct: number;
  yPct: number;
  text: string;
  tone: 'ally' | 'enemy' | 'loot' | 'death';
}

interface Props {
  open: boolean;
  onClose: () => void;
  pets: OwnedPet[];
  storage: Stack[];
  backpack: Stack[];
  playerLevel?: number;
  /** Permanently deletes a fallen pet from the player's save when its HP hits 0 */
  onPermadeathPet: (uid: string) => void;
  /** Syncs surviving pet HP back to the world save */
  onUpdatePetHp: (uid: string, hp: number) => void;
  /** Consumes 1 cooked_meat from storage/backpack to heal all deployed dinos */
  onConsumeCookedMeat: () => boolean;
  /** Deposits all collected expedition loot into base storage on safe retreat */
  onRetreatWithLoot: (loot: Stack[], distanceM: number) => void;
}

const ENCOUNTER_TEMPLATES: Omit<DinoEncounter, 'id' | 'xPct'>[] = [
  {
    kind: 'node',
    name: '고대 참나무 군락',
    spriteUrl: oakImg,
    hp: 30,
    maxHp: 30,
    atk: 0,
    loot: [
      { itemId: 'log', count: 2 },
      { itemId: 'branch', count: 3 },
    ],
  },
  {
    kind: 'beast',
    name: '성난 멧돼지',
    spriteUrl: boarImg,
    hp: 48,
    maxHp: 48,
    atk: 9,
    loot: [
      { itemId: 'raw_meat', count: 2 },
      { itemId: 'hide', count: 1 },
      { itemId: 'bone', count: 1 },
    ],
  },
  {
    kind: 'node',
    name: '반짝이는 석영 광맥',
    spriteUrl: quartzImg,
    hp: 40,
    maxHp: 40,
    atk: 0,
    loot: [
      { itemId: 'flint', count: 3 },
      { itemId: 'quartz', count: 1 },
    ],
  },
  {
    kind: 'beast',
    name: '굶주린 회색 늑대',
    spriteUrl: wolfImg,
    hp: 62,
    maxHp: 62,
    atk: 12,
    loot: [
      { itemId: 'raw_meat', count: 2 },
      { itemId: 'fur', count: 1 },
      { itemId: 'bone', count: 2 },
    ],
  },
  {
    kind: 'node',
    name: '야생 공룡 둥지 (알 스팟)',
    spriteUrl: eggImg,
    hp: 35,
    maxHp: 35,
    atk: 0,
    loot: [
      { itemId: 'dino_egg', count: 1 },
      { itemId: 'bone', count: 2 },
    ],
  },
  {
    kind: 'beast',
    name: '사나운 랩터',
    spriteUrl: raptorImg,
    hp: 88,
    maxHp: 88,
    atk: 16,
    loot: [
      { itemId: 'raw_meat', count: 3 },
      { itemId: 'hide', count: 2 },
      { itemId: 'bone', count: 3 },
    ],
  },
  {
    kind: 'beast',
    name: '우두머리 눈보라 매머드',
    spriteUrl: mammothImg,
    hp: 150,
    maxHp: 150,
    atk: 22,
    loot: [
      { itemId: 'raw_meat', count: 5 },
      { itemId: 'frost_pelt', count: 1 },
      { itemId: 'tusk', count: 2 },
    ],
  },
  {
    kind: 'node',
    name: '청동기 구리 광맥',
    spriteUrl: quartzImg,
    hp: 55,
    maxHp: 55,
    atk: 0,
    loot: [
      { itemId: 'copper_ore', count: 2 },
      { itemId: 'tin_ore', count: 1 },
    ],
  },
  {
    kind: 'node',
    name: '천연 역청 웅덩이',
    spriteUrl: oakImg,
    hp: 40,
    maxHp: 40,
    atk: 0,
    loot: [
      { itemId: 'bitumen', count: 2 },
      { itemId: 'flint', count: 2 },
    ],
  },
  {
    kind: 'node',
    name: '신비한 사금·은광맥',
    spriteUrl: quartzImg,
    hp: 65,
    maxHp: 65,
    atk: 0,
    loot: [
      { itemId: 'silver_ore', count: 1 },
      { itemId: 'gold_ore', count: 1 },
    ],
  },
  {
    kind: 'node',
    name: '자철석·석탄 지층',
    spriteUrl: quartzImg,
    hp: 75,
    maxHp: 75,
    atk: 0,
    loot: [
      { itemId: 'magnetite', count: 2 },
      { itemId: 'coal', count: 3 },
    ],
  },
  {
    kind: 'node',
    name: '화산 유황 분출구',
    spriteUrl: oakImg,
    hp: 60,
    maxHp: 60,
    atk: 0,
    loot: [
      { itemId: 'sulfur', count: 2 },
      { itemId: 'limestone', count: 2 },
    ],
  },
  {
    kind: 'node',
    name: '미지의 운석 낙하구',
    spriteUrl: quartzImg,
    hp: 110,
    maxHp: 110,
    atk: 0,
    loot: [
      { itemId: 'meteor_shard', count: 1 },
      { itemId: 'mercury', count: 1 },
    ],
  },
];

// 4-frame keyframe offsets so any pet sprite displays a lively 4-frame walk & 4-frame attack motion
const WALK_4FRAME_OFFSETS = [
  { dx: 0, dy: 0, rot: -3, scaleX: 1, scaleY: 1 },
  { dx: 2, dy: -4, rot: 0, scaleX: 1.04, scaleY: 0.96 },
  { dx: 0, dy: 0, rot: 3, scaleX: 1, scaleY: 1 },
  { dx: -2, dy: -3, rot: 0, scaleX: 0.97, scaleY: 1.04 },
];

const ATTACK_4FRAME_OFFSETS = [
  { dx: -6, dy: 0, rot: -10, scaleX: 0.94, scaleY: 1.05 },
  { dx: 18, dy: -8, rot: 16, scaleX: 1.18, scaleY: 0.92 },
  { dx: 24, dy: -2, rot: 8, scaleX: 1.12, scaleY: 1.04 },
  { dx: 0, dy: 0, rot: 0, scaleX: 1, scaleY: 1 },
];

export default function DinoExpeditionModal({
  open,
  onClose,
  pets,
  storage,
  backpack,
  playerLevel = 1,
  onPermadeathPet,
  onUpdatePetHp,
  onConsumeCookedMeat,
  onRetreatWithLoot,
}: Props) {
  const [stage, setStage] = useState<'select' | 'confirm' | 'running' | 'wiped' | 'retreated'>('select');
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [distanceM, setDistanceM] = useState(0);
  const [scrollPx, setScrollPx] = useState(0);
  const [frame4, setFrame4] = useState(0);
  const [roarUntil, setRoarUntil] = useState(0);
  const [roarReadyAt, setRoarReadyAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [collectedLoot, setCollectedLoot] = useState<Stack[]>([]);
  const [encounter, setEncounter] = useState<DinoEncounter | null>(null);
  const [fallenNames, setFallenNames] = useState<string[]>([]);
  const [floats, setFloats] = useState<FloatingDmg[]>([]);
  const [combatLogs, setCombatLogs] = useState<string[]>([]);

  const nextSpawnDistRef = useRef(18);
  const lastDinoStrikeRef = useRef(0);
  const lastEnemyStrikeRef = useRef(0);

  const ownedFoodPool = useMemo(() => addStacks(storage, backpack), [storage, backpack]);
  const cookedMeatCount = useMemo(
    () => countOf(ownedFoodPool, 'cooked_meat'),
    [ownedFoodPool]
  );

  // Reset state when modal opens
  useEffect(() => {
    if (!open) return;
    setStage('select');
    setSelectedUids(pets.slice(0, 3).map(p => p.uid));
    setDistanceM(0);
    setScrollPx(0);
    setCollectedLoot([]);
    setEncounter(null);
    setFallenNames([]);
    setFloats([]);
    setCombatLogs([]);
    nextSpawnDistRef.current = 15;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePets = useMemo(
    () => selectedUids.map(uid => pets.find(p => p.uid === uid)).filter((p): p is OwnedPet => !!p),
    [selectedUids, pets]
  );

  const toggleSelect = (uid: string) => {
    setSelectedUids(prev => {
      if (prev.includes(uid)) return prev.filter(id => id !== uid);
      if (prev.length >= 3) return prev;
      return [...prev, uid];
    });
  };

  const pushFloat = (xPct: number, yPct: number, text: string, tone: FloatingDmg['tone']) => {
    const id = `${Date.now()}-${Math.random()}`;
    setFloats(prev => [...prev.slice(-10), { id, xPct, yPct, text, tone }]);
    window.setTimeout(() => {
      setFloats(prev => prev.filter(f => f.id !== id));
    }, 950);
  };

  const pushLog = (msg: string) => {
    setCombatLogs(prev => [msg, ...prev].slice(0, 12));
  };

  // 4-frame animation clock (cycles 0 -> 1 -> 2 -> 3)
  useEffect(() => {
    if (!open || stage !== 'running') return;
    const isRoar = Date.now() < roarUntil;
    const iv = window.setInterval(() => {
      setFrame4(f => (f + 1) % 4);
      setNow(Date.now());
    }, isRoar ? 110 : 190);
    return () => window.clearInterval(iv);
  }, [open, stage, roarUntil]);

  // Main Side-Scrolling Expedition & Combat Loop (`DinoExpeditionCanvas` engine)
  const stateRef = useRef({
    activePets,
    encounter,
    distanceM,
    roarUntil,
    collectedLoot,
  });
  stateRef.current = { activePets, encounter, distanceM, roarUntil, collectedLoot };

  useEffect(() => {
    if (!open || stage !== 'running') return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      const { activePets: squad, encounter: enc, distanceM: dist, roarUntil: rUntil } = stateRef.current;

      // Check if all deployed dinos have perished -> Permadeath Wipeout!
      if (squad.length === 0) {
        setCollectedLoot([]);
        setStage('wiped');
        playSfx('warn');
        return;
      }

      const roarActive = t < rUntil;
      const engagedInCombat = enc && enc.xPct <= 44;

      if (!engagedInCombat) {
        // Walk forward rightwards across the parallax forest
        const speedMult = roarActive ? 1.5 : 1;
        setScrollPx(px => px + 10 * speedMult);
        const nextDist = +(dist + 0.65 * speedMult).toFixed(1);
        setDistanceM(nextDist);

        if (enc) {
          // Move approaching encounter from right (100%) toward contact line (42%)
          setEncounter(prev => (prev ? { ...prev, xPct: Math.max(42, prev.xPct - 4.5) } : null));
        } else if (nextDist >= nextSpawnDistRef.current) {
          // Spawn a new wild resource node or hostile beast from off-screen right
          const maxAllowed = playerLevel >= 30 ? ENCOUNTER_TEMPLATES.length : playerLevel >= 20 ? 11 : playerLevel >= 11 ? 9 : 6;
          const tierCap = Math.min(maxAllowed, nextDist < 50 ? 4 : nextDist < 110 ? Math.min(6, maxAllowed) : maxAllowed);
          const tpl = ENCOUNTER_TEMPLATES[Math.floor(Math.random() * Math.max(4, tierCap))];
          const distScale = 1 + Math.floor(nextDist / 60) * 0.2;
          const scaledHp = Math.round(tpl.hp * distScale);
          const scaledAtk = Math.round(tpl.atk * distScale);
          nextSpawnDistRef.current = nextDist + 16 + Math.floor(Math.random() * 10);
          setEncounter({
            ...tpl,
            id: `enc-${t}`,
            hp: scaledHp,
            maxHp: scaledHp,
            atk: scaledAtk,
            xPct: 96,
          });
          pushLog(
            tpl.kind === 'beast'
              ? `⚠️ 전방 ${Math.round(nextDist)}m에서 「${tpl.name}」(HP ${scaledHp} · 공격 ${scaledAtk}) 출현!`
              : `🌿 전방 ${Math.round(nextDist)}m에서 「${tpl.name}」 발견!`
          );
        }
        return;
      }

      // Engaged in combat or harvesting at contact line!
      const dinoInterval = roarActive ? 420 : 840; // 2x attack speed during Wild Roar!
      if (t - lastDinoStrikeRef.current >= dinoInterval) {
        lastDinoStrikeRef.current = t;
        const totalAtk = squad.reduce((sum, p) => sum + Math.round(petStats(p.level).attack), 0);
        const dmg = Math.max(4, totalAtk + Math.floor(Math.random() * 5));
        const nextHp = Math.max(0, enc.hp - dmg);
        playSample(enc.kind === 'beast' ? 'strike' : 'chop');
        pushFloat(enc.xPct, 36, `-${dmg}${roarActive ? '⚡' : ''}`, 'enemy');

        if (nextHp <= 0) {
          // Encounter defeated / harvested!
          setCollectedLoot(prev => addStacks(prev, enc.loot));
          const lootStr = enc.loot.map(l => `${ITEMS[l.itemId]?.name ?? l.itemId} +${l.count}`).join(', ');
          pushFloat(enc.xPct, 24, `🎁 ${lootStr}`, 'loot');
          pushLog(`✨ ${enc.name} 돌파! 전리품 획득: ${lootStr}`);
          setEncounter(null);
          return;
        } else {
          setEncounter(prev => (prev ? { ...prev, hp: nextHp } : null));
        }
      }

      // Enemy beast counter-attacks the lead dinosaur!
      if (enc.kind === 'beast' && enc.atk > 0 && t - lastEnemyStrikeRef.current >= 1250) {
        lastEnemyStrikeRef.current = t;
        const frontDino = squad[0];
        if (!frontDino) return;
        const frontMaxHp = petStats(frontDino.level).maxHp;
        const enemyDmg = Math.max(2, enc.atk - PET_DEFENSE);
        const nextPetHp = Math.max(0, frontDino.hp - enemyDmg);
        playSample('beastAttack');
        haptic(80);
        pushFloat(24, 42, `-${enemyDmg}`, 'ally');

        if (nextPetHp > 0 && nextPetHp <= frontMaxHp * 0.2) {
          playSfx('warn');
          haptic([120, 60, 120]);
        }

        if (nextPetHp <= 0) {
          // PERMADEATH: This dino's HP reached 0 and is permanently deleted!
          const petName = petById(frontDino.speciesId)?.name ?? frontDino.name;
          pushFloat(24, 25, `💀 ${petName} 영구 소멸!`, 'death');
          pushLog(`💀 [영구 소멸] ${petName}(Lv.${frontDino.level})이(가) 쓰러져 영원히 소멸했습니다!`);
          setFallenNames(prev => [...prev, `${petName} (Lv.${frontDino.level})`]);
          setSelectedUids(prev => prev.filter(id => id !== frontDino.uid));
          onPermadeathPet(frontDino.uid);
        } else {
          onUpdatePetHp(frontDino.uid, nextPetHp);
        }
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [open, stage, onPermadeathPet, onUpdatePetHp]);

  if (!open) return null;

  const isRoarActive = now < roarUntil;
  const roarCooldownSec = Math.max(0, Math.ceil((roarReadyAt - now) / 1000));
  const engaged = !!(encounter && encounter.xPct <= 44);
  const animOffsets = engaged ? ATTACK_4FRAME_OFFSETS[frame4] : WALK_4FRAME_OFFSETS[frame4];

  const handleMeatHeal = () => {
    if (stage !== 'running' || activePets.length === 0) return;
    const allFull = activePets.every(p => p.hp >= petStats(p.level).maxHp);
    if (allFull) return;
    if (!onConsumeCookedMeat()) return;
    activePets.forEach((p, idx) => {
      const maxHp = petStats(p.level).maxHp;
      const healed = Math.min(maxHp, p.hp + DINO_MEAT_HEAL_AMOUNT);
      onUpdatePetHp(p.uid, healed);
      pushFloat(18 + idx * 8, 38, `+${DINO_MEAT_HEAL_AMOUNT}🍖`, 'loot');
    });
    pushLog(`🍖 구운 고기를 먹여 출전 공룡들의 체력을 +${DINO_MEAT_HEAL_AMOUNT} 회복했습니다!`);
  };

  const handleWildRoar = () => {
    const t = Date.now();
    if (stage !== 'running' || t < roarReadyAt) return;
    setRoarUntil(t + DINO_ROAR_DURATION_MS);
    setRoarReadyAt(t + DINO_ROAR_COOLDOWN_MS);
    playSfx('fanfare');
    haptic([60, 40, 100]);
    pushFloat(26, 28, '⚡ 야성의 포효! 공속 2배!', 'loot');
    pushLog('⚡ 야성의 포효 발동! 4초간 공룡 공격 속도가 2배로 증가합니다!');
  };

  const handleRetreat = () => {
    onRetreatWithLoot(collectedLoot, Math.round(distanceM));
    setStage('retreated');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="공룡 탐험대 펫 사냥 내보내기"
      data-dino-expedition-modal
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* Fullscreen Top Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🦖</span>
          <div>
            <b className="text-sm">횡스크롤 공룡 탐험대 · 야생 사냥 원정</b>
            <p className="text-[10px] text-muted-foreground">
              공룡 최대 3마리 출전 · 야생 자원/맹수 교전 · 위기 시 즉시 후퇴 필수!
            </p>
          </div>
        </div>
        {stage !== 'running' && (
          <button
            type="button"
            aria-label="공룡 탐험대 닫기"
            onClick={onClose}
            className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
          >
            <X className="!h-4 !w-4" />
          </button>
        )}
      </div>

      {/* STAGE 1: Squad Selection (up to 3 Dino Pets) */}
      {stage === 'select' && (
        <div className="flex-1 space-y-3 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Permadeath Warning Banner */}
          <div
            role="alert"
            className="pixel-frame flex items-start gap-2.5 border-2 border-destructive bg-destructive/15 p-3 text-destructive"
          >
            <AlertTriangle className="!h-5 !w-5 shrink-0" />
            <div className="space-y-0.5 leading-snug">
              <b className="text-xs">
                ⚠️ 경고: 사냥 중 체력이 0이 된 공룡은 영구 소멸합니다! 위기 시 반드시 [후퇴] 버튼을 누르세요.
              </b>
              <p className="text-[11px] opacity-90">
                탐험 중 획득한 나무·광석·고기·공룡 알은 [🏳️ 즉시 후퇴]를 눌러 귀환해야 창고에 안전하게 보관됩니다. 3마리가 모두 쓰러지면 전리품도 모두 소실됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <b className="text-sm">출전할 공룡 펫 선택 ({selectedUids.length} / 3마리)</b>
            <span className="text-[11px] text-muted-foreground">
              보유 구운 고기: <b className="text-primary">{cookedMeatCount}개</b>
            </span>
          </div>

          {!pets.length ? (
            <div className="pixel-frame bg-card p-6 text-center text-muted-foreground">
              아직 보유한 공룡 펫이 없습니다. 월드에서 공룡 알을 주워 걸어서 부화시켜 보세요!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pets.map(p => {
                const selected = selectedUids.includes(p.uid);
                const stats = petStats(p.level);
                const pName = petById(p.speciesId)?.name ?? p.name;
                return (
                  <button
                    key={p.uid}
                    type="button"
                    data-select-dino={p.uid}
                    onClick={() => toggleSelect(p.uid)}
                    className={`pixel-frame flex items-center gap-3 p-2.5 text-left transition-colors ${
                      selected ? 'border-primary bg-primary/15 ring-2 ring-primary' : 'bg-card'
                    }`}
                  >
                    <PetSprite speciesId={p.speciesId} name={pName} height={48} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <b className="truncate text-sm">
                          {pName} <span className="text-primary">Lv.{p.level}</span>
                        </b>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            selected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {selected ? `출전 #${selectedUids.indexOf(p.uid) + 1}` : '대기'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HpBar value={p.hp} max={stats.maxHp} />
                        <span className="text-[10px]">
                          HP {p.hp}/{stats.maxHp}
                        </span>
                      </div>
                      <span className="block text-[10px] text-muted-foreground">
                        공격력 {Math.round(stats.attack)} · 방어력 {PET_DEFENSE}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="button"
              disabled={selectedUids.length === 0}
              onClick={() => setStage('confirm')}
              className="pixel-btn min-h-12 w-full bg-primary text-sm font-bold text-primary-foreground"
            >
              🦖 공룡 {selectedUids.length}마리 사냥 출정 준비
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 2: Red Permadeath Confirmation Dialog */}
      {stage === 'confirm' && (
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="pixel-frame w-full max-w-md space-y-4 bg-card p-4">
            <div className="flex items-center justify-center gap-3 py-2">
              {activePets.map(p => (
                <div key={p.uid} className="flex flex-col items-center gap-1">
                  <PetSprite
                    speciesId={p.speciesId}
                    name={petById(p.speciesId)?.name ?? p.name}
                    height={56}
                  />
                  <b className="text-xs">
                    {petById(p.speciesId)?.name ?? p.name} Lv.{p.level}
                  </b>
                  <span className="text-[10px] text-muted-foreground">
                    HP {p.hp}/{petStats(p.level).maxHp}
                  </span>
                </div>
              ))}
            </div>

            {/* Required Red Permadeath Warning Box */}
            <div
              role="alert"
              data-permadeath-warning
              className="rounded border-2 border-red-600 bg-red-950/35 p-3 text-red-500 shadow-[0_0_16px_rgba(220,38,38,0.3)]"
            >
              <p className="text-xs font-extrabold leading-relaxed">
                ⚠️ 경고: 사냥 중 체력이 0이 된 공룡은 영구 소멸합니다! 위기 시 반드시 [후퇴] 버튼을 누르세요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStage('select')}
                className="pixel-btn min-h-11 text-xs"
              >
                편성 다시 하기
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setStage('running');
                  pushLog('🦖 공룡 탐험대가 원시림으로 출정했습니다!');
                }}
                className="pixel-btn min-h-11 bg-destructive text-xs font-extrabold text-destructive-foreground"
              >
                위험을 감수하고 출정!
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: Side-Scrolling `DinoExpeditionCanvas` + Compact Tactical Bar */}
      {stage === 'running' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Distance & Loot Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border bg-card px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary px-2 py-0.5 text-xs font-extrabold text-primary-foreground">
                전진 거리: {Math.floor(distanceM)}m
              </span>
              {isRoarActive && (
                <span className="animate-pulse rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold text-black">
                  ⚡ 야성의 포효 (공속 2배!)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <b>획득 전리품:</b>
              {!collectedLoot.length ? (
                <span className="text-muted-foreground">탐색 중…</span>
              ) : (
                <span className="font-bold text-primary">
                  {collectedLoot
                    .map(s => `${ITEMS[s.itemId]?.name ?? s.itemId}×${s.count}`)
                    .join(' · ')}
                </span>
              )}
            </div>
          </div>

          {/* Horizontal Parallax Side-Scrolling Canvas (`DinoExpeditionCanvas`) */}
          <div
            data-dino-expedition-canvas
            className="relative h-64 w-full shrink-0 overflow-hidden border-b-4 border-foreground bg-gradient-to-b from-[#1a3322] via-[#274c32] to-[#3d6838] select-none"
          >
            {/* Far Parallax Forest Canopy Layer */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-3 flex whitespace-nowrap text-3xl opacity-35"
              style={{ transform: `translateX(-${(scrollPx * 0.35) % 320}px)` }}
            >
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} className="mx-5">
                  🌲🌳🌴🌲🌳
                </span>
              ))}
            </div>

            {/* Mid Parallax Bushes & Rocks Layer */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-14 flex whitespace-nowrap text-xl opacity-65"
              style={{ transform: `translateX(-${(scrollPx * 0.7) % 280}px)` }}
            >
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} className="mx-6">
                  🌿🪨🌱🌺🌿
                </span>
              ))}
            </div>

            {/* Scrolling Ground Track */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-14 border-t-4 border-[#2b421c] bg-[#5c4328]"
            >
              <div
                className="flex h-full items-center whitespace-nowrap text-xs opacity-55"
                style={{ transform: `translateX(-${scrollPx % 160}px)` }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <span key={i} className="mx-4">
                    ▪ ▫ ▪ 🌿 ▫ ▪
                  </span>
                ))}
              </div>
            </div>

            {/* Dino Squad Marching Rightwards (up to 3 Dinos with 4-Frame Walk/Attack Animation) */}
            <div className="absolute bottom-11 left-5 z-20 flex items-end gap-2.5">
              {[...activePets].reverse().map((p, idx) => {
                const isLead = p.uid === activePets[0]?.uid;
                const stats = petStats(p.level);
                const pName = petById(p.speciesId)?.name ?? p.name;
                const frameOffset = isLead
                  ? animOffsets
                  : WALK_4FRAME_OFFSETS[(frame4 + idx) % 4];
                const isDangerHp = p.hp > 0 && p.hp <= stats.maxHp * 0.2;
                return (
                  <div
                    key={p.uid}
                    data-expedition-dino={p.uid}
                    data-dino-frame={frame4 + 1}
                    className="flex flex-col items-center"
                  >
                    <div
                      className={`mb-1 w-16 rounded px-1 py-0.5 text-center text-[9px] text-white transition-colors ${
                        isDangerHp
                          ? 'animate-pulse border-2 border-red-500 bg-red-950/90 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                          : 'bg-black/75'
                      }`}
                    >
                      <div className="truncate font-bold">
                        {isDangerHp && '⚠️ '}
                        {pName}
                      </div>
                      <HpBar value={p.hp} max={stats.maxHp} />
                      <span className={isDangerHp ? 'font-extrabold text-red-400' : ''}>
                        {p.hp}/{stats.maxHp}
                      </span>
                    </div>
                    <div
                      className={`transition-transform duration-150 ${
                        isRoarActive ? 'drop-shadow-[0_0_10px_#facc15]' : ''
                      }`}
                      style={{
                        transform: `translate(${frameOffset.dx}px, ${frameOffset.dy}px) rotate(${frameOffset.rot}deg) scale(${frameOffset.scaleX}, ${frameOffset.scaleY})`,
                      }}
                    >
                      <PetSprite
                        speciesId={p.speciesId}
                        name={pName}
                        height={isLead ? 58 : 48}
                        attacking={engaged}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Approaching Wild Resource Node or Hostile Beast on the Right */}
            {encounter && (
              <div
                data-dino-encounter={encounter.kind}
                className="absolute bottom-11 z-20 flex -translate-x-1/2 flex-col items-center transition-[left] duration-150 ease-linear"
                style={{ left: `${encounter.xPct}%` }}
              >
                <div className="mb-1 w-24 rounded bg-black/80 px-1.5 py-0.5 text-center text-[10px] text-white">
                  <b className="block truncate text-amber-300">{encounter.name}</b>
                  <HpBar value={encounter.hp} max={encounter.maxHp} />
                  <span>
                    {encounter.hp}/{encounter.maxHp}
                    {encounter.atk > 0 ? ` · 공격 ${encounter.atk}` : ' · 자원'}
                  </span>
                </div>
                <div
                  className="transition-transform duration-150"
                  style={{
                    transform:
                      engaged && encounter.kind === 'beast'
                        ? `translateX(${frame4 % 2 === 0 ? -12 : 4}px) scaleX(-1)`
                        : 'scaleX(-1)',
                  }}
                >
                  <img
                    src={encounter.spriteUrl}
                    alt={encounter.name}
                    className="pixelated h-16 w-16 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                  />
                </div>
              </div>
            )}

            {/* Clash Impact Spark Effect when Engaged */}
            {engaged && (
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-20 left-[38%] z-30 animate-ping text-amber-300"
              >
                <Swords className="!h-7 !w-7" />
              </div>
            )}

            {/* Floating Damage & Loot Numbers */}
            <AnimatePresence>
              {floats.map(f => (
                <motion.span
                  key={f.id}
                  initial={{ opacity: 1, y: 0, scale: 0.9 }}
                  animate={{ opacity: 0, y: -28, scale: 1.15 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.85 }}
                  className={`pointer-events-none absolute z-40 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-extrabold shadow ${
                    f.tone === 'enemy'
                      ? 'bg-amber-400 text-black'
                      : f.tone === 'ally'
                        ? 'bg-destructive text-destructive-foreground'
                        : f.tone === 'death'
                          ? 'bg-black text-red-500 ring-2 ring-red-500'
                          : 'bg-emerald-600 text-white'
                  }`}
                  style={{ left: `${f.xPct}%`, top: `${f.yPct}%` }}
                >
                  {f.text}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {/* Live Combat & Permadeath Log Area */}
          <div className="flex-1 space-y-1.5 overflow-y-auto bg-card/60 p-3">
            <div className="flex items-center justify-between">
              <b className="text-xs">📜 실시간 탐험 기록</b>
              {fallenNames.length > 0 && (
                <span className="text-[11px] font-bold text-destructive">
                  💀 영구 소멸: {fallenNames.join(', ')}
                </span>
              )}
            </div>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              {combatLogs.map((log, i) => (
                <li
                  key={i}
                  className={
                    log.includes('영구 소멸')
                      ? 'font-bold text-destructive'
                      : log.includes('전리품')
                        ? 'font-bold text-primary'
                        : ''
                  }
                >
                  {log}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom 3 Compact Tactical Controls */}
          <div
            role="group"
            aria-label="공룡 탐험 전술 컨트롤"
            className="grid grid-cols-3 gap-1.5 border-t-4 border-foreground bg-card p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <Button
              type="button"
              onClick={handleMeatHeal}
              disabled={
                cookedMeatCount < 1 ||
                activePets.every(p => p.hp >= petStats(p.level).maxHp)
              }
              className="pixel-btn flex h-auto min-h-11 flex-col items-center justify-center gap-0.5 bg-emerald-700 py-1.5 px-2 text-xs font-bold text-white hover:bg-emerald-600"
            >
              <span className="flex items-center gap-1">
                <Drumstick className="!h-4 !w-4" />
                🍖 고기 회복
              </span>
              <span className="text-[10px] opacity-90">구운고기 ({cookedMeatCount}개)</span>
            </Button>

            <Button
              type="button"
              onClick={handleWildRoar}
              disabled={roarCooldownSec > 0}
              className="pixel-btn flex h-auto min-h-11 flex-col items-center justify-center gap-0.5 bg-amber-500 py-1.5 px-2 text-xs font-bold text-black hover:bg-amber-400"
            >
              <span className="flex items-center gap-1">
                <Zap className="!h-4 !w-4" />
                ⚡ 야성의 포효
              </span>
              <span className="text-[10px]">
                {isRoarActive
                  ? '폭주 중! (공속 2배)'
                  : roarCooldownSec > 0
                    ? `쿨타임 ${roarCooldownSec}초`
                    : '4초간 공속 2배'}
              </span>
            </Button>

            <Button
              type="button"
              onClick={handleRetreat}
              className="pixel-btn flex h-auto min-h-11 flex-col items-center justify-center gap-0.5 bg-primary py-1.5 px-2 text-xs font-extrabold text-primary-foreground"
            >
              <span className="flex items-center gap-1">
                <Flag className="!h-4 !w-4" />
                🏳️ 즉시 후퇴
              </span>
              <span className="text-[10px] opacity-90">전리품 챙겨 귀환</span>
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 4A: Safe Retreat Summary */}
      {stage === 'retreated' && (
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="pixel-frame w-full max-w-md space-y-3 bg-card p-4 text-center">
            <b className="block text-base text-primary">
              🏳️ 공룡 탐험대 무사 귀환! ({Math.floor(distanceM)}m 탐사)
            </b>
            <p className="text-xs text-muted-foreground">
              위기 상황에서 침착하게 후퇴하여 공룡들을 지키고 전리품을 거점 창고로 가져왔습니다!
            </p>
            <div className="pixel-box bg-background p-3 text-xs">
              <b className="block text-primary">📦 창고 입고 전리품</b>
              {!collectedLoot.length ? (
                <p className="mt-1 text-muted-foreground">획득한 전리품 없음</p>
              ) : (
                <p className="mt-1 font-bold">
                  {collectedLoot
                    .map(s => `${ITEMS[s.itemId]?.name ?? s.itemId} ×${s.count}`)
                    .join(' · ')}
                </p>
              )}
            </div>
            {fallenNames.length > 0 && (
              <p className="text-xs font-bold text-destructive">
                💀 사냥 중 영구 소멸한 공룡: {fallenNames.join(', ')}
              </p>
            )}
            <Button
              type="button"
              onClick={onClose}
              className="pixel-btn min-h-11 w-full bg-primary text-xs font-bold text-primary-foreground"
            >
              거점으로 돌아가기
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 4B: Total Wipeout (All 3 Dinos Dead -> All Loot Lost) */}
      {stage === 'wiped' && (
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="pixel-frame w-full max-w-md space-y-3 border-destructive bg-card p-4 text-center">
            <Skull className="mx-auto !h-10 !w-10 text-destructive" />
            <b className="block text-base text-destructive">
              💀 탐험대 전멸… 모든 공룡이 영구 소멸했습니다
            </b>
            <p className="text-xs text-muted-foreground">
              출전한 공룡이 모두 쓰러져 영구 삭제되었으며, 이번 탐험에서 모은 전리품도 모두 잃었습니다.
            </p>
            {fallenNames.length > 0 && (
              <div className="pixel-box bg-destructive/15 p-2 text-xs font-bold text-destructive">
                소멸 명단: {fallenNames.join(', ')}
              </div>
            )}
            <Button
              type="button"
              variant="destructive"
              onClick={onClose}
              className="pixel-btn min-h-11 w-full text-xs font-bold"
            >
              거점으로 복귀
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
