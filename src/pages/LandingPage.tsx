import { AnimatePresence, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Globe, Users, Gamepad2, Church, Building2, GraduationCap, Gem, Swords, MapPin, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EXPLORATION_LOGIN_URL } from "@/lib/authNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { ColonionOpening } from "@/components/survival/ColonionOpening";
import { hasSeenStoryTutorial, StoryTutorialModal } from "@/components/survival/StoryTutorial";
import { getSettings, setBgmPlaying } from "@/lib/survival/gameSettings";
import titleArt from "@/assets/colonion-opening.webp.asset.json";
import { enterGuestSession } from '@/lib/guestEntry';
import { lovable } from "@/integrations/lovable/index";

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const features = [
  {
    icon: Gem,
    title: "오픈 월드 수집 & 세공",
    description:
      "지도 곳곳에 숨겨진 원석을 수집하고, 나만의 주얼리(장신구)로 세공하세요. 특별한 능력치를 가진 아이템을 만들어보세요.",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-400",
  },
  {
    icon: Swords,
    title: "실시간 GPS 술래잡기 & 보물찾기",
    description: "팀원들과 실시간으로 위치를 공유하며 뛰고, 찾고, 경쟁하세요. 전략과 체력이 모두 필요한 협동 모드!",
    gradient: "from-emerald-500/20 to-cyan-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: MapPin,
    title: "AR 방탈출 (Exodus)",
    description: "출애굽기 테마를 바탕으로 한 몰입형 AR 퀴즈 및 퍼즐. 실제 장소를 탐험하며 미션을 해결하세요.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-400",
  },
];

const audiences = [
  { icon: Church, label: "교회 수련회", desc: "야외에서 함께 뛰며 팀워크와 신앙을 키워요" },
  { icon: Building2, label: "기업 팀빌딩", desc: "색다른 야외 활동으로 조직의 결속력 강화" },
  { icon: GraduationCap, label: "학교 체험학습", desc: "교실 밖에서 배우는 탐험형 교육 프로그램" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const [showSetup, setShowSetup] = useState(false);
  const [entering, setEntering] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void> | void) | null>(null);

  const runWithTutorialFirst = (action: () => Promise<void> | void) => {
    if (getSettings().bgm) {
      setBgmPlaying(true);
    }
    if (!hasSeenStoryTutorial()) {
      setPendingAction(() => action);
      setTutorialOpen(true);
      return;
    }
    void action();
  };

  useEffect(() => {
    if (getSettings().bgm) {
      setBgmPlaying(true);
    }
  }, []);

  // Step 2 opens automatically after login (or guest entry) returns to "/?start=1".
  useEffect(() => {
    if (params.get("start") === "1" && !isLoading) {
      void startExploration();
      params.delete("start");
      setParams(params, { replace: true });
    }
  }, [params, setParams, user, isLoading]);

  const startExploration = async () => {
    if (isLoading || entering) return;
    setEntering(true);
    try {
      try {
        localStorage.removeItem('survival-guest-world-v1');
        localStorage.removeItem('survival-guest-world-v1_backup');
        localStorage.removeItem('survival-guest-gps-world-v1');
        localStorage.removeItem('survival-guest-gps-world-v1_backup');
        localStorage.removeItem('colonion.tutorialStep.guest');
        localStorage.removeItem('colonion_last_active_at');
      } catch { /* ignore */ }
      sessionStorage.setItem('colonion.forceFreshGame', '1');
      sessionStorage.setItem('colonion.forceTutorial', '1');
      sessionStorage.removeItem('colonion.guestTutorialCompleted');
      await enterGuestSession();
      navigate('/play/survival');
    } catch {
      toast.error('간편 입장 연결이 지연됩니다. 기기 체험판으로 시작합니다.');
      sessionStorage.setItem('colonion.forceFreshGame', '1');
      sessionStorage.setItem('colonion.forceTutorial', '1');
      sessionStorage.removeItem('colonion.guestTutorialCompleted');
      navigate('/play/survival');
    } finally { setEntering(false); }
  };

  const guestWorld = async () => {
    if (entering) return;
    setEntering(true);
    try {
      try {
        localStorage.removeItem('survival-guest-world-v1');
        localStorage.removeItem('survival-guest-world-v1_backup');
        localStorage.removeItem('survival-guest-gps-world-v1');
        localStorage.removeItem('survival-guest-gps-world-v1_backup');
        localStorage.removeItem('colonion.tutorialStep.guest');
        localStorage.removeItem('colonion_last_active_at');
      } catch { /* ignore */ }
      sessionStorage.setItem('colonion.forceFreshGame', '1');
      sessionStorage.setItem('colonion.forceTutorial', '1');
      sessionStorage.removeItem('colonion.guestTutorialCompleted');
      await enterGuestSession();
      navigate('/world');
    }
    catch { toast.error('비회원 입장이 지연돼요. 잠시 후 다시 시도해 주세요.'); }
    finally { setEntering(false); }
  };

  const loginGoogle = async () => {
    try {
      const back = `${window.location.origin}/login?returnTo=${encodeURIComponent('/world')}`;
      const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: back });
      if (r.error) toast.error('Google 로그인에 실패했어요. 다시 시도해 주세요.');
    } catch { toast.error('Google 로그인에 실패했어요. 연결을 확인해 주세요.'); }
  };

  const enterWorld = (name: string) => {
    if (name) toast.success(`${name} 족장님, 구석기 시대에 오신 것을 환영합니다`);
    if (!user) {
      // Guest trial: real-GPS play with a device-only save.
      toast.info("체험판으로 시작해요. 로그인하면 진행 상황이 다른 기기에도 저장돼요.", {
        action: { label: "로그인", onClick: () => navigate(EXPLORATION_LOGIN_URL) },
      });
      navigate("/play/survival");
      return;
    }
    navigate("/world"); // browser back returns to "/"
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <StoryTutorialModal
        open={tutorialOpen}
        onComplete={() => {
          setTutorialOpen(false);
          const next = pendingAction;
          setPendingAction(null);
          if (next) void next();
          else navigate('/world');
        }}
        onSkip={() => {
          setTutorialOpen(false);
          const next = pendingAction;
          setPendingAction(null);
          if (next) void next();
          else navigate('/world');
        }}
      />
      <AnimatePresence>{showSetup && <ColonionOpening onEnter={enterWorld} onClose={() => setShowSetup(false)} />}</AnimatePresence>

      {/* Colonion opening hero */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-colonion-night font-pixel">
        <div className="relative flex-1">
          <motion.img
            src={titleArt.url}
            alt="COLONION — 화산과 고대 마을을 바라보는 개척자"
            className="absolute inset-0 h-full w-full object-contain [image-rendering:pixelated]"
            initial={{ scale: 1.12, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2.4, ease: "easeOut" }}
          />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-colonion-night to-transparent" />
        </div>
        <motion.div
          className="relative z-10 mx-auto w-full max-w-md px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <p className="mb-4 text-sm text-colonion-parchment">GPS기반 문명개척 무료게임</p>
          {user ? (
            <Button
              onClick={() => { if (getSettings().bgm) setBgmPlaying(true); navigate('/world'); }}
              disabled={isLoading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded border-2 border-colonion-wood-edge bg-gradient-to-b from-primary to-colonion-ember text-base font-bold text-colonion-night shadow-lg active:translate-y-0.5"
            >
              문명 개척 시작하기 <Play className="!h-5 !w-5 fill-current" />
            </Button>
          ) : (
            <div className="pixel-panel space-y-2 p-3">
              <p className="text-xs text-colonion-parchment">로그인 · 회원가입</p>
              <Button onClick={() => runWithTutorialFirst(loginGoogle)} disabled={isLoading || entering} className="h-12 w-full rounded border-2 border-colonion-wood-edge font-bold">Google로 계속하기</Button>
              <Button onClick={() => { if (getSettings().bgm) setBgmPlaying(true); void guestWorld(); }} disabled={isLoading || entering} variant="secondary" className="h-12 w-full rounded border-2 border-colonion-wood-edge font-bold">{entering ? '입장 중…' : '비회원으로 바로 입장하기'}</Button>
              <Button onClick={() => runWithTutorialFirst(() => navigate('/login?returnTo=%2Fworld'))} variant="outline" className="h-12 w-full rounded border-2 border-colonion-wood-edge font-bold">기존 이메일 계정으로 로그인</Button>
            </div>
          )}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">세 가지 핵심 모드</h2>
            <p className="text-muted-foreground text-lg">현실 세계가 곧 게임 필드가 됩니다</p>
          </AnimatedSection>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 0.15}>
                <div
                  className={`relative group h-full rounded-2xl border border-border/60 bg-gradient-to-br ${f.gradient} backdrop-blur-sm p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5`}
                >
                  <div
                    className={`w-14 h-14 rounded-xl bg-background/80 border border-border/60 flex items-center justify-center mb-6 ${f.iconColor}`}
                  >
                    <f.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{f.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">누구와 함께하나요?</h2>
            <p className="text-muted-foreground text-lg">단체 야외 활동에 최적화된 플랫폼</p>
          </AnimatedSection>

          <div className="grid gap-6 sm:grid-cols-3">
            {audiences.map((a, i) => (
              <AnimatedSection key={a.label} delay={i * 0.12}>
                <div className="text-center p-8 rounded-2xl border border-border/40 bg-card hover:bg-card/80 transition-colors">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <a.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{a.label}</h3>
                  <p className="text-muted-foreground text-sm">{a.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 GPS Real-Time Action. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/play" className="hover:text-foreground transition-colors">
              게임 로비
            </Link>
            <Link to="/admin" className="hover:text-foreground transition-colors">
              관리자 로그인
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
