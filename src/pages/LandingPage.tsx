import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Globe, Users, Gamepad2, Church, Building2, GraduationCap, Gem, Swords, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
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
    description: "지도 곳곳에 숨겨진 원석을 수집하고, 나만의 주얼리(장신구)로 세공하세요. 특별한 능력치를 가진 아이템을 만들어보세요.",
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

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,25%,8%)] via-[hsl(150,30%,12%)] to-[hsl(220,25%,8%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-[hsl(150,80%,35%)] opacity-[0.08] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-[hsl(35,90%,50%)] opacity-[0.06] blur-[100px]" />

        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[hsl(150,80%,35%,0.3)] bg-[hsl(150,80%,35%,0.1)] text-[hsl(150,80%,70%)] text-sm font-medium mb-8">
              <Globe className="w-4 h-4" />
              GPS 기반 리얼타임 게임 플랫폼
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-white mb-6"
          >
            일상이 게임이 되는 순간,
            <br />
            <span className="bg-gradient-to-r from-[hsl(150,80%,55%)] to-[hsl(35,90%,60%)] bg-clip-text text-transparent">
              GPS 리얼타임 액션
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg sm:text-xl text-[hsl(220,10%,65%)] mb-10 leading-relaxed"
          >
            야외에서 직접 걷고 뛰며 즐기는
            <br className="sm:hidden" /> 거대한 오픈 월드 탐험
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button
              onClick={() => navigate("/world")}
              size="lg"
              className="h-14 px-10 text-lg font-bold rounded-2xl bg-gradient-to-r from-[hsl(150,80%,40%)] to-[hsl(150,70%,45%)] hover:from-[hsl(150,80%,45%)] hover:to-[hsl(150,70%,50%)] text-white shadow-[0_0_40px_hsl(150,80%,35%,0.3)] hover:shadow-[0_0_60px_hsl(150,80%,35%,0.5)] transition-all duration-300"
            >
              🗺️ 지금 바로 탐험 시작하기
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="mt-16 flex justify-center"
          >
            <div className="w-6 h-10 rounded-full border-2 border-[hsl(220,10%,40%)] flex items-start justify-center p-1.5">
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="w-1.5 h-1.5 rounded-full bg-[hsl(150,80%,55%)]"
              />
            </div>
          </motion.div>
        </div>
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
                <div className={`relative group h-full rounded-2xl border border-border/60 bg-gradient-to-br ${f.gradient} backdrop-blur-sm p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5`}>
                  <div className={`w-14 h-14 rounded-xl bg-background/80 border border-border/60 flex items-center justify-center mb-6 ${f.iconColor}`}>
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
            <Link to="/play" className="hover:text-foreground transition-colors">게임 로비</Link>
            <Link to="/admin" className="hover:text-foreground transition-colors">관리자 로그인</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
