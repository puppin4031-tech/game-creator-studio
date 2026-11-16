import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSettings, setBgmPlaying } from '@/lib/survival/gameSettings';
import scene1Img from '@/assets/survival/tutorial-1.jpg';
import scene2Img from '@/assets/survival/tutorial-2.jpg';
import scene3Img from '@/assets/survival/tutorial-3.jpg';
import scene4Img from '@/assets/survival/tutorial-4.jpg';
import scene5Img from '@/assets/survival/tutorial-5.jpg';

export const STORY_TUTORIAL_SEEN_KEY = 'colonion.storyTutorialSeen.v1';

export interface StorySlide {
  step: number;
  title: string;
  image: string;
  lines: string[];
}

/**
 * 1~5 오프닝 스토리 튜토리얼 (요청에 따라 1번과 2번 이미지·스토리를 서로 교체하여
 * 1번: 용맹한 쿵쿵카 부족 -> 2번: 밥만 축내고 똥만 싼다고 쫓겨나는 가우가 -> 3~5번 순서로 구성)
 */
export const STORY_TUTORIAL_SLIDES: StorySlide[] = [
  {
    step: 1,
    title: "1. 세상에 두려울 것 없는 전사들, '쿵쿵카' 부족",
    image: scene1Img,
    lines: [
      "거대한 맘모스와 흉폭한 공룡마저 맨손으로 때려잡는 전사들의 무리, '쿵쿵카' 부족.",
      '그들은 세상에 두려울 것이 없는, 누구보다 강하고 용맹한 자들이었습니다.',
    ],
  },
  {
    step: 2,
    title: "2. 매몰차게 쫓겨난 꼬마 원시인 '가우가'",
    image: scene2Img,
    lines: [
      "하지만 오직 힘의 논리만이 지배하는 그곳에서, '가우가'는 너무나도 작고 하찮았습니다.",
      '매일 밥만 축내고 똥만 싼다는 억울한(?) 이유로, 가우가는 결국 쿵쿵카 부족에서 매몰차게 쫓겨나고 맙니다.',
    ],
  },
  {
    step: 3,
    title: "3. 어두운 숲속의 기묘한 '하얀 잎사귀'",
    image: scene3Img,
    lines: [
      '척박하고 어두운 숲속을 홀로 헤매던 가우가.',
      "지독한 굶주림에 쓰러지기 직전, 그는 뭐라도 먹고 죽자는 심정으로 미친 듯이 땅을 파헤쳐 '하얀 잎사귀'를 맺은 기묘한 식물을 캐냅니다.",
    ],
  },
  {
    step: 4,
    title: "4. 차원을 넘어 '당신'과 연결된 시선!",
    image: scene4Img,
    lines: [
      '신비한 빛을 내뿜는 잎사귀와 딱딱한 뿌리를 와작 베어 문 그 순간... 찌릿!',
      "가우가의 시선이 차원을 넘어 화면 밖의 '당신'과 마주쳐버렸습니다.",
      '이제 가우가는 당신과 연결되어, 이 세상에 없던 지식을 깨우치고 스스로 살아남는 법을 배워나갈 것입니다.',
    ],
  },
  {
    step: 5,
    title: '5. 가우가와 요란한 동료들의 대환장 생존기!',
    image: scene5Img,
    lines: [
      '어딘가 나사가 빠진 원주민들과 모자란 공룡 동료들이 함께하는 대환장 생존기!',
      '과연 가우가와 이 요란한 녀석들은 무사히 원시 시대를 살아갈 수 있을까요?',
    ],
  },
];

export function hasSeenStoryTutorial(): boolean {
  try {
    return localStorage.getItem(STORY_TUTORIAL_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markStoryTutorialSeen(): void {
  try {
    localStorage.setItem(STORY_TUTORIAL_SEEN_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

interface ModalProps {
  open: boolean;
  onComplete: () => void;
  onSkip?: () => void;
  finishLabel?: string;
}

/**
 * Full-screen 5-step visual novel tutorial shown when a player starts the game for the first time,
 * or replayed from the GuideBook ('게임 소개').
 */
export function StoryTutorialModal({
  open,
  onComplete,
  onSkip,
  finishLabel = '원시 세계로 출발하기',
}: ModalProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (getSettings().bgm) {
      setBgmPlaying(true);
    }
  }, [open, index]);

  if (!open) return null;

  const slide = STORY_TUTORIAL_SLIDES[index];
  const isLast = index === STORY_TUTORIAL_SLIDES.length - 1;

  const finish = () => {
    markStoryTutorialSeen();
    setIndex(0);
    onComplete();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="콜로니온 오프닝 스토리 튜토리얼"
      data-story-tutorial
      className="fixed inset-0 z-[120] flex h-[100dvh] w-full flex-col bg-black font-pixel text-white select-none"
    >
      {/* Top Progress Bar & Skip Button */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-white/15 bg-black/90 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-1.5">
          <Sparkles className="!h-4 !w-4 text-amber-400" />
          <b className="text-xs text-amber-300">
            콜로니온 프롤로그 ({index + 1} / {STORY_TUTORIAL_SLIDES.length})
          </b>
        </div>
        <div className="flex items-center gap-1.5">
          {STORY_TUTORIAL_SLIDES.map((s, idx) => (
            <button
              key={s.step}
              type="button"
              aria-label={`${s.step}장 보기`}
              onClick={() => setIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === index ? 'w-6 bg-amber-400' : idx < index ? 'w-2.5 bg-amber-400/60' : 'w-2.5 bg-white/25'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            markStoryTutorialSeen();
            setIndex(0);
            (onSkip ?? onComplete)();
          }}
          className="pixel-btn flex items-center gap-1 border-white/40 bg-zinc-900 py-1 px-2 text-[11px] text-zinc-200 hover:bg-zinc-800"
        >
          <span>건너뛰기</span>
          <X className="!h-3.5 !w-3.5" />
        </button>
      </div>

      {/* Main Illustration Area */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-950 p-2"
        onClick={() => {
          if (!isLast) setIndex(i => i + 1);
        }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={slide.step}
            src={slide.image}
            alt={slide.title}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="max-h-full w-full max-w-2xl rounded border-2 border-amber-500/40 object-contain shadow-[0_0_30px_rgba(0,0,0,0.9)]"
          />
        </AnimatePresence>
      </div>

      {/* Bottom Story Caption Box */}
      <div className="border-t-4 border-amber-500/70 bg-zinc-950/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
              {slide.title}
            </span>
            <span className="text-[11px] text-zinc-400">
              STEP {slide.step} / {STORY_TUTORIAL_SLIDES.length}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={slide.step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="min-h-[5.25rem] space-y-1.5 rounded border-2 border-zinc-700 bg-zinc-900/90 p-3 text-xs sm:text-sm leading-relaxed text-zinc-100"
            >
              {slide.lines.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={index === 0}
              onClick={() => setIndex(i => Math.max(0, i - 1))}
              className="pixel-btn h-11 gap-1 border-zinc-600 bg-zinc-900 px-3 text-xs text-white hover:bg-zinc-800 disabled:opacity-30"
            >
              <ChevronLeft className="!h-4 !w-4" />
              이전 장면
            </Button>

            {!isLast ? (
              <Button
                type="button"
                onClick={() => setIndex(i => i + 1)}
                className="pixel-btn h-11 flex-1 gap-1 bg-amber-500 text-sm font-bold text-black hover:bg-amber-400"
              >
                <span>다음 이야기 ({index + 1}/5)</span>
                <ChevronRight className="!h-4 !w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={finish}
                className="pixel-btn h-11 flex-1 gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-sm font-extrabold text-black hover:from-amber-300 hover:to-orange-400"
              >
                <Play className="!h-4 !w-4 fill-current" />
                <span>{finishLabel}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
