import { useEffect, useState } from 'react';
import { getTreasureIconSrc } from '@/lib/treasureIcons';

interface Props {
  winnerTeam: string;
  onComplete: () => void;
}

export default function ChestVictoryOverlay({ winnerTeam, onComplete }: Props) {
  const [phase, setPhase] = useState<'shake' | 'open' | 'burst' | 'result'>('shake');

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('open'), 1200),
      setTimeout(() => setPhase('burst'), 2200),
      setTimeout(() => setPhase('result'), 3400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: phase === 'shake'
            ? 'rgba(0,0,0,0.5)'
            : phase === 'open'
            ? 'rgba(0,0,0,0.7)'
            : 'radial-gradient(circle, rgba(234,179,8,0.3) 0%, rgba(0,0,0,0.85) 70%)',
        }}
      />

      {/* Particles */}
      {(phase === 'burst' || phase === 'result') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => {
            const angle = (i / 30) * 360;
            const dist = 120 + Math.random() * 200;
            const size = 6 + Math.random() * 12;
            const hue = 30 + Math.random() * 40;
            const delay = Math.random() * 0.3;
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  background: `hsl(${hue}, 90%, ${55 + Math.random() * 20}%)`,
                  top: '50%',
                  left: '50%',
                  opacity: 0,
                  animation: `chest-particle 1.5s ${delay}s ease-out forwards`,
                  ['--tx' as string]: `${Math.cos((angle * Math.PI) / 180) * dist}px`,
                  ['--ty' as string]: `${Math.sin((angle * Math.PI) / 180) * dist}px`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Chest icon */}
      <div className="relative z-10 flex flex-col items-center">
        {phase !== 'result' && (
          <div
            className="text-[100px] leading-none select-none"
            style={{
              animation:
                phase === 'shake'
                  ? 'chest-shake 0.15s ease-in-out infinite alternate'
                  : phase === 'open'
                  ? 'chest-open 1s ease-out forwards'
                  : 'chest-shrink 0.4s ease-in forwards',
              filter: 'drop-shadow(0 0 40px rgba(234,179,8,0.8))',
            }}
          >
            <img src={getTreasureIconSrc('treasure', 'chest')} alt="보물상자" className="w-24 h-24 object-contain" />
          </div>
        )}

        {/* Light burst */}
        {phase === 'open' && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 0,
              height: 0,
              background: 'radial-gradient(circle, rgba(255,215,0,0.6) 0%, transparent 70%)',
              animation: 'chest-light-burst 1s 0.5s ease-out forwards',
            }}
          />
        )}

        {/* Result */}
        {phase === 'result' && (
          <div className="flex flex-col items-center animate-scale-in">
            <div className="text-[80px] mb-4 animate-bounce">🏆</div>
            <div
              className="text-center bg-background/90 backdrop-blur-lg rounded-2xl px-8 py-6 shadow-2xl border border-amber-400/30"
              style={{ boxShadow: '0 0 60px rgba(234,179,8,0.3)' }}
            >
              <p className="text-sm text-muted-foreground mb-1">보물상자를 열었습니다!</p>
              <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600">
                {winnerTeam}
              </p>
              <p className="text-xl font-bold mt-1">🎉 승리! 🎉</p>
              <button
                onClick={onComplete}
                className="mt-5 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                결과 보기
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes chest-shake {
          0% { transform: rotate(-3deg) scale(1); }
          50% { transform: rotate(3deg) scale(1.02); }
          100% { transform: rotate(-3deg) scale(1); }
        }
        @keyframes chest-open {
          0% { transform: scale(1); }
          30% { transform: scale(1.3); }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0.6; }
        }
        @keyframes chest-shrink {
          0% { transform: scale(1.5); opacity: 0.6; }
          100% { transform: scale(0); opacity: 0; }
        }
        @keyframes chest-light-burst {
          0% { width: 0; height: 0; opacity: 0; }
          50% { width: 500px; height: 500px; opacity: 1; }
          100% { width: 800px; height: 800px; opacity: 0; }
        }
        @keyframes chest-particle {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          60% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
