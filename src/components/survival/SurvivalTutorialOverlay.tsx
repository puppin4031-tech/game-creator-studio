import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import shamanArt from '@/assets/survival/npc-shaman.png';
import mercArt from '@/assets/survival/npc-mercenary.png';
import TribeSprite from './TribeSprite';
import { toast } from 'sonner';
import type { LatLng } from '@/lib/survival/types';

export const TUTORIAL_COMPLETED_KEY = 'colonion.tutorialCompleted.v2';

export interface TutorialGroundBranch {
  id: string;
  lat: number;
  lng: number;
}

export function generateTutorialGroundBranches(center: LatLng): TutorialGroundBranch[] {
  // Spread ~2-4 meters around the player
  const dLat = 0.000028;
  const dLng = 0.000032;
  return [
    { id: 'tut-branch-1', lat: center.lat + dLat, lng: center.lng + dLng * 0.3 },
    { id: 'tut-branch-2', lat: center.lat - dLat * 0.7, lng: center.lng + dLng * 0.9 },
    { id: 'tut-branch-3', lat: center.lat - dLat * 0.6, lng: center.lng - dLng * 0.8 },
  ];
}

const TOUR_SLIDES = [
  {
    title: '거점 · 모닥불 & 이전',
    icon: '🔥',
    text: '여기가 자네의 성역일세. 나뭇가지 3개만 있으면 언제든 원하는 명당으로 거점을 통째로 옮길 수 있지.',
  },
  {
    title: '창고 · 배낭',
    icon: '🎒',
    text: '거점에 들어오면 배낭 짐이 창고로 옮겨지지. 암바초와 부족민, 짐승은 창고 식량을 매시간 먹는다네.',
  },
  {
    title: '제작공방',
    icon: '🔨',
    text: '배운 기술로 도구·무기·방어구를 만드는 곳이네. 연구할수록 만들 수 있는 게 늘어나지.',
  },
  {
    title: '고대 제단 (발명)',
    icon: '🔮',
    text: '재료를 올리면 새 장비를 빚어낸다네. 높은 등급 재료일수록 더 강해지지.',
  },
  {
    title: '원정대',
    icon: '🧭',
    text: '부족민을 밖으로 보내 자원을 긁어오게. 다만 부족민 힘은 자네의 6분의 1이라네. 직접 걷는 자가 진짜 강자지.',
  },
  {
    title: '공룡 알 & 펫',
    icon: '🦕',
    text: '알은 자네 발걸음으로 깨어나고, 같은 짐승 둘을 합치면 더 강해진다네. 과일과 날고기를 먹이게.',
  },
];

export type TutorialStep =
  | 'phase1_intro'
  | 'phase1_gather'
  | 'phase1_explain'
  | 'phase2_huhakacha'
  | 'phase2_ambacho_enter'
  | 'phase2_ambacho_talk'
  | 'phase2_celebration'
  | 'phase3_tour_intro'
  | 'phase3_tour'
  | 'completed';

interface Props {
  open: boolean;
  step: TutorialStep;
  collectedBranches: number;
  onSetStep: (step: TutorialStep) => void;
  onEnsureStarterCamp: () => void;
  onRecruitAmbacho: () => void;
  onCompleteTutorial: () => void;
}

export function SurvivalTutorialOverlay({
  open,
  step,
  collectedBranches,
  onSetStep,
  onEnsureStarterCamp,
  onRecruitAmbacho,
  onCompleteTutorial,
}: Props) {
  const [tourIndex, setTourIndex] = useState(0);

  // During phase1_intro, automatically plant starter campfire
  useEffect(() => {
    if (step === 'phase1_intro') {
      onEnsureStarterCamp();
    }
  }, [step, onEnsureStarterCamp]);

  // When 3 branches collected, transition from gather to explain
  useEffect(() => {
    if (step === 'phase1_gather' && collectedBranches >= 3) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      toast.success('🌿 나뭇가지 3개를 모두 주웠습니다! 주술사의 이야기를 들어보세요.');
      onSetStep('phase1_explain');
    }
  }, [step, collectedBranches, onSetStep]);

  if (!open) return null;

  // Floating top guide during branch gathering on the map
  if (step === 'phase1_gather') {
    return (
      <aside aria-label="튜토리얼 진행 안내" className="pointer-events-none fixed top-4 inset-x-2 z-40 flex justify-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto pixel-box bg-background/95 p-3 shadow-2xl border-2 border-emerald-500 flex items-center gap-3 max-w-sm w-full"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-950/40 border border-emerald-500">
            <span className="text-xl animate-bounce">🌿</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xs text-emerald-400">떠돌이 주술사의 선물</p>
            <p className="text-[11px] text-foreground leading-tight">
              발밑 땅바닥의 <b>나뭇가지 3개</b>를 터치하여 주우세요!
            </p>
          </div>
          <div className="rounded bg-emerald-900/60 border border-emerald-500 px-2 py-1 text-xs font-bold text-emerald-300">
            {collectedBranches} / 3
          </div>
        </motion.div>
      </aside>
    );
  }

  const isModalOpen = step !== 'phase1_gather' && step !== 'completed';

  const pixelBtn =
    'w-full rounded-none border-2 border-foreground py-2 px-3 text-xs font-bold shadow-[2px_2px_0_0_hsl(var(--foreground)/0.6)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-transform';

  return (
    <Dialog open={isModalOpen} onOpenChange={() => {}}>
      <DialogContent
        className="pixel-panel max-h-[90dvh] max-w-sm overflow-hidden p-4"
        onClick={e => e.stopPropagation()}
        onPointerDownOutside={e => e.preventDefault()}
      >
        <DialogDescription className="sr-only">콜로니온 생존 튜토리얼</DialogDescription>

        {/* Phase 1: Intro */}
        {step === 'phase1_intro' && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-primary">
                <span>🔮</span>
                <span>떠돌이 주술사의 선물</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-end gap-3 pt-2">
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={shamanArt}
                alt="떠돌이 주술사"
                className="pixelated h-28 w-auto shrink-0 drop-shadow-md"
              />
              <div className="pixel-box flex-1 bg-background/90 p-3 text-xs leading-relaxed border border-border">
                <p className="font-bold text-amber-400 mb-1">떠돌이 주술사</p>
                <p className="text-foreground">
                  "기억을 잃고 낯선 시대에 떨어진 개척자여... 일단 이 자리에 <b>임시 모닥불</b>을 피웠네."
                </p>
              </div>
            </div>

            <div className="rounded bg-amber-950/20 border border-amber-600/40 p-2.5 text-[11px] text-amber-200">
              💡 주술사가 눈앞 땅바닥에 <b>[나뭇가지 3개]</b>를 놓아두었습니다. 맵에서 직접 터치하여 주워 보세요!
            </div>

            <Button
              className={`${pixelBtn} bg-emerald-600 hover:bg-emerald-500 text-white`}
              onClick={() => onSetStep('phase1_gather')}
            >
              🌿 발밑 나뭇가지 3개 줍기 시작
            </Button>
          </div>
        )}

        {/* Phase 1: Base Relocation Explanation */}
        {step === 'phase1_explain' && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-emerald-400">
                <span>🌿</span>
                <span>나뭇가지 3개 획득 완료!</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-end gap-3 pt-2">
              <img
                src={shamanArt}
                alt="떠돌이 주술사"
                className="pixelated h-28 w-auto shrink-0 drop-shadow-md"
              />
              <div className="pixel-box flex-1 bg-background/90 p-3 text-xs leading-relaxed border border-border">
                <p className="font-bold text-amber-400 mb-1">떠돌이 주술사</p>
                <p className="text-foreground">
                  "자네가 거점을 옮기고 싶다면 그 <b>나뭇가지 3개</b>를 원하는 장소에서 거점으로 만들 수 있네. 그러면 이 거점은 그곳으로 이동할 게야."
                </p>
              </div>
            </div>

            <div className="rounded bg-primary/10 border border-primary/30 p-2 text-[11px] text-muted-foreground">
              ⛺ <b>거점 이전 기능</b>: 언제든 마음에 드는 명당에서 나뭇가지 3개로 거점(모닥불)을 즉시 이전할 수 있습니다.
            </div>

            <Button
              className={`${pixelBtn} bg-primary text-primary-foreground`}
              onClick={() => onSetStep('phase2_huhakacha')}
            >
              다음 이야기 ➡️
            </Button>
          </div>
        )}

        {/* Phase 2: Huhakacha Walk-in */}
        {step === 'phase2_huhakacha' && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-amber-400">
                <span>🛡️</span>
                <span>용병 교관 '후하카차'의 등장</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-end gap-3 pt-2">
              <motion.img
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                src={mercArt}
                alt="후하카차"
                className="pixelated h-28 w-auto shrink-0 drop-shadow-md"
              />
              <div className="pixel-box flex-1 bg-background/90 p-3 text-xs leading-relaxed border border-border">
                <p className="font-bold text-amber-500 mb-1">용병 교관 '후하카차'</p>
                <p className="text-foreground">
                  "아! 이거 새로운 얼굴들이군 반갑네, 나는 용병들을 이끌고 훈련시키는 <b>'후하카차'</b>라고 한다."
                </p>
                <p className="text-foreground mt-2">
                  "자네가 거점에 혼자 있을 때, 누군가 주변에서 대신 사냥을 하고 채집을 해준다면 너무 좋겠지? 내가 마침 자네에게 딱 필요한 친구를 소개시켜 주겠네."
                </p>
              </div>
            </div>

            <Button
              className={`${pixelBtn} bg-amber-600 hover:bg-amber-500 text-white`}
              onClick={() => onSetStep('phase2_ambacho_enter')}
            >
              친구 소개받기 ➡️
            </Button>
          </div>
        )}

        {/* Phase 2: Ambacho Enters */}
        {step === 'phase2_ambacho_enter' && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-emerald-400">
                <span>🎒</span>
                <span>표범무늬 부족민 '암바초'</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-end gap-3 pt-2">
              <motion.div
                initial={{ scale: 0.5, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="flex flex-col items-center justify-center rounded border-2 border-emerald-500 bg-emerald-950/30 p-2 shrink-0"
              >
                <TribeSprite action="walk" tribeClass="gatherer" height={68} />
                <span className="mt-1 text-[10px] font-bold text-emerald-400">암바초</span>
              </motion.div>

              <div className="pixel-box flex-1 bg-background/90 p-3 text-xs leading-relaxed border border-border">
                <p className="font-bold text-amber-500 mb-1">용병 교관 '후하카차'</p>
                <p className="text-foreground">
                  "<b>암바초</b>라는 친구라네. 이 친구는 지능이 조금 딸리지만 누구보다 충성된 친구지. 자, 앞으로 잘 부탁하네."
                </p>
              </div>
            </div>

            <Button
              className={`${pixelBtn} bg-emerald-600 hover:bg-emerald-500 text-white`}
              onClick={() => onSetStep('phase2_ambacho_talk')}
            >
              암바초의 인사 듣기 ➡️
            </Button>
          </div>
        )}

        {/* Phase 2: Ambacho Greets */}
        {step === 'phase2_ambacho_talk' && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-emerald-400">
                <span>🫡</span>
                <span>암바초의 충성 맹세</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-end gap-3 pt-2">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="flex flex-col items-center justify-center rounded border-2 border-emerald-500 bg-emerald-950/40 p-2 shrink-0"
              >
                <TribeSprite action="gather" tribeClass="gatherer" height={72} />
                <span className="mt-1 text-[10px] font-bold text-emerald-400 animate-pulse">충성!</span>
              </motion.div>

              <div className="pixel-box flex-1 bg-background/90 p-3 text-xs leading-relaxed border border-border">
                <p className="font-bold text-emerald-400 mb-1">파밍 부족민 '암바초'</p>
                <p className="text-foreground text-sm font-bold">
                  "충성충성! 족장님! 저 암바초라고 함다! 뭐든 시켜만 주십쇼! 돌멩이든 나뭇가지든 다 주워오겠슴다!"
                </p>
              </div>
            </div>

            <Button
              className={`${pixelBtn} bg-emerald-600 hover:bg-emerald-500 text-white`}
              onClick={() => onSetStep('phase2_celebration')}
            >
              🎉 암바초를 부족민으로 영입하기
            </Button>
          </div>
        )}

        {/* Phase 2: Celebration Popup */}
        {step === 'phase2_celebration' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-4 text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <span className="text-3xl">🎉</span>
            </div>

            <DialogHeader>
              <DialogTitle className="text-base font-black text-emerald-400">
                파밍 부족민 '암바초' 정식 합류!
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                지능은 조금 모자라지만 누구보다 충성된 든든한 파밍 일꾼
              </p>
            </DialogHeader>

            <div className="pixel-box bg-background/90 p-3 text-xs space-y-2 text-left border border-emerald-600/50">
              <div className="flex items-center gap-3">
                <TribeSprite action="walk" tribeClass="gatherer" height={52} />
                <div className="space-y-0.5 text-[11px]">
                  <p className="font-bold text-emerald-400">🎒 자동 채집 & 운반</p>
                  <p className="text-muted-foreground">거점 주변을 돌며 나뭇가지·돌멩이를 자동으로 주워 창고에 채웁니다.</p>
                </div>
              </div>
              <div className="border-t border-border/50 pt-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">이동속도</span>
                <span className="font-bold text-emerald-400">+40%</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">배낭 용량</span>
                <span className="font-bold text-emerald-400">+30%</span>
              </div>
            </div>

            <Button
              className={`${pixelBtn} bg-emerald-600 hover:bg-emerald-500 text-white text-sm py-2.5`}
              onClick={() => {
                onRecruitAmbacho();
                onSetStep('phase3_tour_intro');
              }}
            >
              암바초와 함께 생존 시작! 🚀
            </Button>
          </motion.div>
        )}

        {/* Phase 3: Tour Intro */}
        {step === 'phase3_tour_intro' && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-primary">
                <span>🔮</span>
                <span>거점 기본 시설 둘러보기</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-end gap-3 pt-2">
              <img
                src={shamanArt}
                alt="떠돌이 주술사"
                className="pixelated h-28 w-auto shrink-0 drop-shadow-md"
              />
              <div className="pixel-box flex-1 bg-background/90 p-3 text-xs leading-relaxed border border-border">
                <p className="font-bold text-amber-400 mb-1">떠돌이 주술사</p>
                <p className="text-foreground">
                  "암바초가 든든하게 일손을 돕기 시작했으니, 이제 거점의 기본 시설들을 둘러보세나."
                </p>
              </div>
            </div>

            <Button
              className={`${pixelBtn} bg-primary text-primary-foreground`}
              onClick={() => {
                setTourIndex(0);
                onSetStep('phase3_tour');
              }}
            >
              시설 안내 보기 (1/6) ➡️
            </Button>
          </div>
        )}

        {/* Phase 3: Tour 6 Steps */}
        {step === 'phase3_tour' && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-primary">
                  <span>{TOUR_SLIDES[tourIndex].icon}</span>
                  <span>{TOUR_SLIDES[tourIndex].title}</span>
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {tourIndex + 1} / {TOUR_SLIDES.length}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-end gap-3 pt-2">
              <img
                src={shamanArt}
                alt="떠돌이 주술사"
                className="pixelated h-24 w-auto shrink-0 drop-shadow-md"
              />
              <div className="pixel-box flex-1 bg-background/90 p-3 text-xs leading-relaxed border border-border min-h-[90px] flex items-center">
                <p className="text-foreground leading-relaxed">
                  {TOUR_SLIDES[tourIndex].text}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {tourIndex > 0 && (
                <Button
                  variant="outline"
                  className="w-1/3 rounded-none border-2 border-foreground py-2 text-xs"
                  onClick={() => setTourIndex(i => Math.max(0, i - 1))}
                >
                  이전
                </Button>
              )}
              <Button
                className={`${pixelBtn} flex-1 ${
                  tourIndex === TOUR_SLIDES.length - 1
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}
                onClick={() => {
                  if (tourIndex < TOUR_SLIDES.length - 1) {
                    setTourIndex(i => i + 1);
                  } else {
                    onCompleteTutorial();
                  }
                }}
              >
                {tourIndex < TOUR_SLIDES.length - 1 ? '다음 안내' : '🎉 튜토리얼 완료하기'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Component rendered inside TerrainMap's project function */
export function TutorialGroundBranches({
  project,
  branches,
  onPick,
}: {
  project: (pos: LatLng) => { x: number; y: number };
  branches: TutorialGroundBranch[];
  onPick: (branchId: string) => void;
}) {
  if (!branches.length) return null;

  return (
    <>
      {branches.map((branch) => {
        const p = project(branch);
        return (
          <button
            key={branch.id}
            type="button"
            aria-label="튜토리얼 나뭇가지 줍기"
            onClick={(ev) => {
              ev.stopPropagation();
              onPick(branch.id);
            }}
            className="pointer-events-auto absolute z-30 flex min-h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center cursor-pointer group"
            style={{ left: p.x, top: p.y }}
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute -inset-3 rounded-full bg-emerald-400/40 animate-ping duration-1000" />
              <span className="relative text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:scale-125 transition-transform">
                🌿
              </span>
            </div>
            <span className="mt-1 whitespace-nowrap rounded border-2 border-emerald-400 bg-background/95 px-1.5 py-0.5 text-[10px] font-black text-emerald-400 shadow-md group-hover:bg-emerald-950">
              나뭇가지 [터치]
            </span>
          </button>
        );
      })}
    </>
  );
}
