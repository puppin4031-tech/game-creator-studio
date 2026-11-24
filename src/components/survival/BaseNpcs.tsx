import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import shamanArt from '@/assets/survival/npc-shaman.png';
import mercArt from '@/assets/survival/npc-mercenary.png';
import { tribeHireCost, tribeTrainCost, tribeInjured, tribeRatio, TRIBE_MAX, TRIBE_TREAT_COST, type TribeState } from '@/lib/survival/mercenaries';
import { DEFAULT_TRIBE_CLASS, getTribeClass, TRIBE_CLASS_LIST, type TribeClassId } from '@/data/tribeClasses';
import TribeSprite from './TribeSprite';
import { ITEMS } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';

interface DialogueStep {
  who: 'shaman' | 'huhakacha' | 'ambacho' | 'hero';
  title?: string;
  name: string;
  text: string;
}

const NEW_TUTORIAL_STEPS: DialogueStep[] = [
  // Step 1: 떠돌이 주술사의 첫 안내 & 나뭇가지 3개 지급
  {
    who: 'shaman',
    name: '떠돌이 주술사',
    text: '안녕하신가? 뼈가 시려 모닥불 곁에 잠시 머물던 늙은 주술사라네. 자네 앞 땅바닥에 땔감으로 쓸 마른 [나뭇가지 3개]를 놓아두었네.',
  },
  {
    who: 'hero',
    name: '나 (가우가)',
    text: '우우우…! (눈앞의 나뭇가지 3개를 재빠르게 주워 배낭에 챙겼다.)',
  },
  {
    who: 'shaman',
    name: '떠돌이 주술사',
    text: '자네가 거점을 옮기고 싶다면 그 나뭇가지 3개를 원하는 장소에서 거점으로 만들수있네 그러면 이 거점은 그곳으로 이동할게야.',
  },
  // Step 2: 용병 교관 '후하카차' 등장 & 파밍 부족민 '암바초' 영입
  {
    who: 'huhakacha',
    name: "용병 교관 '후하카차'",
    text: '아! 이거 새로운 얼굴들이군 반갑네, 나는 용병들을 이끌고 훈련시키는 \'후하카차\'라고 한다.',
  },
  {
    who: 'huhakacha',
    name: "용병 교관 '후하카차'",
    text: '자네가 거점에 혼자 있을때, 누군가 주변에서 대신 사냥을 하고 채집을 해준다면 너무 좋겠지? 내가 마침 자네에게 딱 필요한 친구를 소개시켜 주겠네.',
  },
  {
    who: 'ambacho',
    name: "파밍 부족민 '암바초'",
    text: '충성충성! 족장님! 저 암바초라고 함다! 뭐든 시켜만 주십쇼! 돌멩이든 나뭇가지든 다 주워오겠슴다!',
  },
  {
    who: 'huhakacha',
    name: "용병 교관 '후하카차'",
    text: '암바초 라는 친구라네. 이친구는 지능이 조금 딸리지만 누구보다 충성된 친구지. 자, 앞으로 잘 부탁하네,',
  },
];

const NPC_OFFSET_KEY = 'colonion.baseNpcOffsets.v1';
const TALK = ['자네가 걸을수록 알 속 생명이 꿈틀대지.', '제단에 좋은 재료를 올리면 내가 쓸 만한 걸 판별해 주겠네.', '부족민과 짐승들은 창고 식량을 먹고 산다네. 창고를 비우지 말게.'];
/** Shaman's interface tour, one panel per stop. */
const TOUR = [
  { title: '거점 · 모닥불 & 이전', text: '여기가 자네의 성역일세. 나뭇가지 3개만 있으면 언제든 원하는 명당으로 거점을 통째로 옮길 수 있지.' },
  { title: '창고 · 배낭', text: '거점에 들어오면 배낭 짐이 창고로 옮겨지지. 암바초와 부족민, 짐승은 창고 식량을 매시간 먹는다네.' },
  { title: '제작', text: '배운 기술로 도구·무기·방어구를 만드는 곳이네. 연구할수록 만들 수 있는 게 늘어나지.' },
  { title: '제단 (발명)', text: '재료를 올리면 새 장비를 빚어낸다네. 높은 등급 재료일수록 더 강해지지.' },
  { title: '원정', text: '부족민을 밖으로 보내 자원을 긁어오게. 다만 부족민 힘은 자네의 6분의 1이라네. 직접 걷는 자가 진짜 강자지.' },
  { title: '펫 · 공룡 알', text: '알은 자네 발걸음으로 깨어나고, 같은 짐승 둘을 합치면 더 강해진다네. 과일과 날고기를 먹이게.' },
];
const label = (c: Stack[]) => c.map(x => `${ITEMS[x.itemId]?.name ?? x.itemId} ${x.count}`).join(' · ');
const have = (c: Stack[], a: Stack[] = [], b: Stack[] = []) => c.every(x => [...(a ?? []), ...(b ?? [])].filter(y => y.itemId === x.itemId).reduce((n, y) => n + y.count, 0) >= x.count);

interface Props {
  shamanMet: boolean;
  tribe: TribeState | undefined;
  storage: Stack[];
  backpack: Stack[];
  now: number;
  onMeet: () => void;
  onHire: (classId?: TribeClassId) => boolean;
  onSelectClass?: (classId: TribeClassId) => void;
  onTrain: () => boolean;
  onTreat: () => boolean;
  onEscort: () => void;
  expeditionBusy: boolean;
  onGrantBranches?: () => void;
  onRecruitAmbacho?: () => void;
}

export default function BaseNpcs({
  shamanMet,
  tribe,
  storage,
  backpack,
  now,
  onMeet,
  onHire,
  onSelectClass,
  onTrain,
  onTreat,
  onEscort,
  expeditionBusy,
  onGrantBranches,
  onRecruitAmbacho,
}: Props) {
  const [open, setOpen] = useState<'shaman' | 'merc' | null>(shamanMet ? null : 'shaman');
  const [step, setStep] = useState(0);
  const [tour, setTour] = useState<number | null>(null);
  const [pickedClass, setPickedClass] = useState<TribeClassId>(tribe?.classId ?? DEFAULT_TRIBE_CLASS);
  const activeClassId = tribe?.classId ?? pickedClass;
  const activeClass = getTribeClass(activeClassId);
  const count = tribe?.count ?? 0;
  const injured = tribeInjured(tribe, now);
  const hireCost = tribeHireCost(count);
  const trainCost = tribeTrainCost(tribe?.trainLevel ?? 0);

  const curTutorialStep = NEW_TUTORIAL_STEPS[step] ?? NEW_TUTORIAL_STEPS[0];
  const line = shamanMet
    ? { who: 'shaman' as const, name: '떠돌이 주술사', text: TALK[Math.floor(now / 60000) % TALK.length] }
    : curTutorialStep;

  const next = () => {
    if (tour !== null) {
      if (tour < TOUR.length - 1) {
        setTour(tour + 1);
      } else {
        setTour(null);
        setOpen(null);
      }
      return;
    }
    if (shamanMet) {
      setOpen(null);
      return;
    }

    // Trigger branch delivery on step 0 transition
    if (step === 0) {
      onGrantBranches?.();
    }
    // Recruit Ambacho on step 5 transition (when Huhakacha concludes introducing Ambacho)
    if (step === 5) {
      onRecruitAmbacho?.();
    }

    if (step < NEW_TUTORIAL_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onRecruitAmbacho?.();
      onMeet();
      setTour(0);
    }
  };
  const chooseClass = (cid: TribeClassId) => {
    setPickedClass(cid);
    onSelectClass?.(cid);
  };
  const npcBtn = 'pointer-events-auto absolute bottom-0 flex min-h-9 min-w-9 flex-col items-center';
  const pixelBtn = 'w-full rounded-none border-2 border-foreground py-1.5 px-2.5 text-xs shadow-[2px_2px_0_0_hsl(var(--foreground)/0.6)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none';
  const dragged = useRef(false);
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>(() => {
    try { return JSON.parse(localStorage.getItem(NPC_OFFSET_KEY) ?? '{}'); } catch { return {}; }
  });
  const saveOffset = (id: string, dx: number, dy: number) => setOffsets(prev => {
    const cur = prev[id] ?? { x: 0, y: 0 };
    const next = { ...prev, [id]: { x: Math.round(cur.x + dx), y: Math.round(cur.y + dy) } };
    try { localStorage.setItem(NPC_OFFSET_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  const dragProps = (id: string) => ({
    drag: true as const, dragMomentum: false, dragSnapToOrigin: false,
    onDragStart: () => { dragged.current = true; },
    onDragEnd: (_: unknown, info: { offset: { x: number; y: number } }) => { saveOffset(id, info.offset.x, info.offset.y); setTimeout(() => { dragged.current = false; }, 50); },
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
  });
  const tap = (k: 'shaman' | 'merc') => (e: React.MouseEvent) => { e.stopPropagation(); if (!dragged.current) setOpen(k); };
  return <>
    <motion.button key={`s-${offsets.shaman?.x}-${offsets.shaman?.y}`} type="button" aria-label="떠돌이 주술사 (끌어서 이동)" {...dragProps('shaman')} onClick={tap('shaman')} className={`${npcBtn} touch-none`} style={{ left: 58 + (offsets.shaman?.x ?? 0), bottom: -(offsets.shaman?.y ?? 0) }}>
      {!shamanMet && <span className="animate-bounce bg-primary px-1 text-[10px] font-bold text-primary-foreground">!</span>}
      <img src={shamanArt} alt="떠돌이 주술사" className="pixelated h-16 w-auto" draggable={false} />
      <span className="mt-0.5 whitespace-nowrap rounded bg-background/90 px-1 text-[10px] font-bold border border-foreground/50 shadow-sm">떠돌이 주술사</span>
    </motion.button>
    <motion.button key={`m-${offsets.merc?.x}-${offsets.merc?.y}`} type="button" aria-label="부족회관 (끌어서 이동)" {...dragProps('merc')} onClick={tap('merc')} className={`${npcBtn} touch-none`} style={{ right: 58 - (offsets.merc?.x ?? 0), bottom: -(offsets.merc?.y ?? 0) }}>
      <span className={`px-1 text-[10px] ${injured ? 'bg-destructive text-destructive-foreground' : 'bg-accent text-accent-foreground'}`}>{injured ? '부상' : `${count}/${TRIBE_MAX}`}</span>
      <img src={mercArt} alt="부족회관" className={`pixelated h-16 w-auto ${injured ? 'opacity-40' : ''}`} draggable={false} />
      <span className="mt-0.5 whitespace-nowrap rounded bg-background/90 px-1 text-[10px] font-bold border border-foreground/50 shadow-sm">부족회관</span>
    </motion.button>
    <Dialog open={open !== null} onOpenChange={o => { if (!o) { setOpen(null); setTour(null); } }}>
      <DialogContent className="pixel-panel max-h-[85dvh] max-w-sm overflow-y-auto" onClick={e => e.stopPropagation()}>
        {open === 'shaman' ? <>
          <DialogHeader>
            <DialogTitle>
              {tour !== null
                ? `안내 ${tour + 1}/${TOUR.length} · ${TOUR[tour].title}`
                : line.name}
            </DialogTitle>
            <DialogDescription className="sr-only">튜토리얼 및 주술사 대화</DialogDescription>
          </DialogHeader>
          <div className="flex items-end gap-3">
            {tour === null && line.who === 'ambacho' ? (
              <div className="flex h-28 w-20 flex-col items-center justify-center rounded border-2 border-emerald-600 bg-emerald-950/20">
                <TribeSprite action="walk" tribeClass="gatherer" height={60} />
                <span className="mt-1 text-[10px] font-bold text-emerald-500">암바초</span>
              </div>
            ) : tour === null && line.who === 'huhakacha' ? (
              <div className="flex h-28 w-20 flex-col items-center justify-center rounded border-2 border-amber-600 bg-amber-950/20">
                <img src={mercArt} alt="후하카차" className="pixelated h-20 w-auto" />
                <span className="mt-1 text-[10px] font-bold text-amber-500">후하카차</span>
              </div>
            ) : (
              <img
                src={shamanArt}
                alt={line.name}
                className={`pixelated h-28 w-auto ${tour === null && line.who === 'hero' ? 'opacity-40' : ''}`}
              />
            )}
            <p className="pixel-box flex-1 bg-background p-3 text-sm leading-relaxed">
              {tour !== null ? TOUR[tour].text : line.text}
            </p>
          </div>
          <Button className={pixelBtn} onClick={next}>
            {tour !== null
              ? tour < TOUR.length - 1
                ? '다음 안내'
                : '안내 끝'
              : !shamanMet && step < NEW_TUTORIAL_STEPS.length - 1
                ? '다음'
                : !shamanMet
                  ? '거점 둘러보기 안내'
                  : '알겠어요'}
          </Button>
          {shamanMet && tour === null && <Button variant="outline" className={pixelBtn} onClick={() => setTour(0)}>거점 둘러보기 (안내)</Button>}
        </> : <>
          <DialogHeader><DialogTitle>부족회관 · {count}/{TRIBE_MAX}명</DialogTitle><DialogDescription>"먹을 것만 넉넉하면 부족을 위해 영구히 충성을 바치겠소."</DialogDescription></DialogHeader>
          <div className="flex items-start gap-2.5">
            <div className="flex flex-col items-center">
              <TribeSprite action="walk" tribeClass={activeClassId} height={52} />
              <span className="mt-0.5 text-[10px] font-bold">{activeClass.name}</span>
            </div>
            <div className="flex-1 space-y-1 text-xs">
              <p>부족민 기본 힘: 내 능력의 <b>{Math.round(tribeRatio(tribe) * 100)}%</b>{tribe?.starving ? ' (굶주림)' : ''}</p>
              <p className="font-bold text-primary">{activeClass.icon} {activeClass.name}: {activeClass.perkSummary}</p>
              <p className="text-muted-foreground">부족민은 한번 영입되면 해당 부족의 고유 전투·생존 특성을 영구히 유지합니다.</p>
              {injured && <p className="text-destructive">부상 중 · {Math.ceil((tribe!.injuredUntil! - now) / 60000)}분 남음</p>}
            </div>
          </div>
          <div className="space-y-1">
            <b className="text-xs">부족 용병단 현황 (영입 시 영구 확정)</b>
            <div className="pixel-box bg-background p-2 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TribeSprite action="idle" tribeClass="tank" height={28} />
                  <div>
                    <div className="font-bold">🛡️ 거인 부족 (탱커)</div>
                    <div className="text-[10px] text-muted-foreground">HP +80% · 방어 +5 · 성벽 방어 피해 -35%</div>
                  </div>
                </div>
                <span className="font-bold text-primary">{tribe?.classCounts?.tank ?? 0}명</span>
              </div>
              {(tribe?.classCounts?.gatherer ?? 0) > 0 && (
                <div className="flex items-center justify-between border-t border-border/50 pt-1.5">
                  <div className="flex items-center gap-1.5">
                    <TribeSprite action="idle" tribeClass="gatherer" height={28} />
                    <div>
                      <div className="font-bold">🎒 파밍 부족 (암바초)</div>
                      <div className="text-[10px] text-muted-foreground">이동속도 +40% · 자동 채집 · 배낭 +30%</div>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600">{tribe?.classCounts?.gatherer}명</span>
                </div>
              )}
            </div>
          </div>
          {injured && <Button className={pixelBtn} variant="destructive" disabled={!have(TRIBE_TREAT_COST, storage, backpack)} onClick={onTreat}>응급 치료 ({label(TRIBE_TREAT_COST)})</Button>}
          <div className="pixel-box space-y-1 bg-background p-2 text-xs"><b>새 부족민 영입 (🛡️ 거인 부족)</b><p>{hireCost ? label(hireCost) : '가득 찼어요 (최대 10명)'}</p></div>
          <Button className={pixelBtn} disabled={!hireCost || !have(hireCost, storage, backpack)} onClick={() => onHire('tank')}>{count + 1}번째 거인 부족 영입</Button>
          {count > 0 && <>
            <div className="pixel-box space-y-1 bg-background p-2 text-xs"><b>걷기 동행 {tribe?.escort ? '· 켜짐' : ''}</b><p>함께 걸으면 채집 속도 +30%, 맹수 기습 방어 (거인 부족 피해 감소 적용).{expeditionBusy ? ' (원정 중에는 동행 불가)' : ''}</p></div>
            <Button variant={tribe?.escort ? 'secondary' : 'default'} className={pixelBtn} disabled={injured} onClick={onEscort}>{tribe?.escort ? '동행 멈추기' : '함께 걷기'}</Button>
            <div className="pixel-box space-y-1 bg-background p-2 text-xs"><b>부족민 훈련 {tribe?.trainLevel ?? 0}/5</b><p>{trainCost ? label(trainCost) : '최고 단계'}</p></div>
            <Button variant="outline" className={pixelBtn} disabled={!trainCost || !have(trainCost, storage, backpack)} onClick={onTrain}>훈련하기 (능력 +3%)</Button>
          </>}
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
