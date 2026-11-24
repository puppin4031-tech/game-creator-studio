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
  const { user, isLoading, signIn, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const [showSetup, setShowSetup] = useState(false);
  const [entering, setEntering] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void> | void) | null>(null);

  // Inline Email/Password Login State
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setLoginError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await signIn(emailInput.trim(), passwordInput);
      if (res.error) {
        setLoginError(res.error);
        toast.error('로그인 실패: ' + res.error);
      } else {
        toast.success('로그인에 성공했습니다.');
        if (getSettings().bgm) setBgmPlaying(true);
        navigate('/world');
      }
    } catch (err: any) {
      setLoginError(err?.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

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
          {user && !user.is_anonymous ? (
            <div className="space-y-2">
              <Button
                onClick={() => { if (getSettings().bgm) setBgmPlaying(true); navigate('/world'); }}
                disabled={isLoading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded border-2 border-colonion-wood-edge bg-gradient-to-b from-primary to-colonion-ember text-base font-bold text-colonion-night shadow-lg active:translate-y-0.5"
              >
                문명 개척 시작하기 <Play className="!h-5 !w-5 fill-current" />
              </Button>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  toast.info('로그아웃되었습니다.');
                }}
                className="text-xs text-amber-200/80 hover:text-amber-100 underline tracking-wide py-1"
              >
                다른 계정으로 로그인 / 로그아웃
              </button>
            </div>
          ) : (
            <div className="pixel-panel space-y-2.5 p-3.5 border-2 border-colonion-wood-edge !bg-[#1a110b]/95 text-stone-100 font-pixel shadow-xl">
              <p className="text-xs !text-amber-300 font-bold tracking-wide">로그인 · 회원가입</p>

              {/* 1. Google OAuth */}
              <Button
                type="button"
                onClick={() => runWithTutorialFirst(loginGoogle)}
                disabled={isLoading || entering || isLoggingIn}
                className="h-11 w-full rounded border-2 border-colonion-wood-edge bg-white hover:bg-stone-100 text-stone-900 font-bold flex items-center justify-center gap-2 shadow-sm text-xs"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>구글 이메일로 로그인</span>
              </Button>

              {/* 2. Existing Email/Password (Collapsible Form) */}
              <div className="space-y-1.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmailLogin(prev => !prev)}
                  disabled={isLoading || entering || isLoggingIn}
                  className="h-11 w-full rounded border-2 border-colonion-wood-edge bg-stone-900/90 hover:bg-stone-800 text-stone-200 font-bold flex items-center justify-between px-3 text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <span>✉️</span>
                    <span>기존 이메일 로그인</span>
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {showEmailLogin ? '▲ 접기' : '▼ 펼치기'}
                  </span>
                </Button>

                {showEmailLogin && (
                  <form onSubmit={handleEmailLogin} className="space-y-2 pt-1 pb-1 px-1 bg-stone-950/80 rounded-md border border-stone-800 p-2.5 text-left">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => { setEmailInput(e.target.value); setLoginError(null); }}
                      placeholder="이메일 주소"
                      disabled={isLoggingIn}
                      className="w-full px-3 py-2 text-xs rounded border border-stone-700 bg-stone-900 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={e => { setPasswordInput(e.target.value); setLoginError(null); }}
                      placeholder="비밀번호"
                      disabled={isLoggingIn}
                      className="w-full px-3 py-2 text-xs rounded border border-stone-700 bg-stone-900 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />

                    {loginError && (
                      <p className="text-[11px] text-rose-400 bg-rose-950/50 p-1.5 rounded border border-rose-900/50 leading-tight">
                        {loginError}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="submit"
                        disabled={isLoggingIn}
                        className="flex-1 h-9 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                      >
                        {isLoggingIn ? '로그인 중...' : '로그인'}
                      </Button>
                      <Link
                        to="/login?returnTo=%2Fworld"
                        className="text-[10px] text-amber-300 hover:underline px-1 py-1"
                      >
                        회원가입
                      </Link>
                    </div>
                  </form>
                )}
              </div>

              {/* 3. Guest Trial Mode */}
              <Button
                type="button"
                onClick={() => { if (getSettings().bgm) setBgmPlaying(true); void guestWorld(); }}
                disabled={isLoading || entering || isLoggingIn}
                variant="secondary"
                className="h-11 w-full rounded border-2 border-colonion-wood-edge bg-amber-800/90 hover:bg-amber-700 text-amber-100 font-bold text-xs"
              >
                {entering ? '입장 중…' : '🎮 비회원 로그인 (체험 모드)'}
              </Button>
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
