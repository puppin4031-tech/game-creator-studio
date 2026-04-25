import { useEffect, useRef } from 'react';
import { CustomOverlayMap } from 'react-kakao-maps-sdk';

export interface Ping {
  id: string;
  lat: number;
  lng: number;
  team: number;
  nickname: string;
  timestamp: number;
}

const PING_DURATION = 4000;

const TEAM_COLORS: Record<number, string> = {
  1: '#3B82F6',
  2: '#EF4444',
};

interface Props {
  pings: Ping[];
  onExpire: (id: string) => void;
  map?: any;
}

function PingCircle({ ping, onExpire }: { ping: Ping; onExpire: () => void }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const color = TEAM_COLORS[ping.team] || '#EF4444';

    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const progress = elapsed / PING_DURATION;

      if (progress >= 1) {
        onExpire();
        return;
      }

      const pulsePhase = Math.sin(elapsed * 0.005) * 0.5 + 0.5;
      const fadeOut = Math.max(0, 1 - progress);
      const outerSize = 150 + pulsePhase * 250 * fadeOut;

      if (outerRef.current) {
        outerRef.current.style.width = `${outerSize}px`;
        outerRef.current.style.height = `${outerSize}px`;
        outerRef.current.style.opacity = String(fadeOut);
        outerRef.current.style.borderColor = color;
        outerRef.current.style.backgroundColor = color;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [ping.id]);

  const color = TEAM_COLORS[ping.team] || '#EF4444';

  // xAnchor/yAnchor=0.5 → 컨테이너 div의 중앙이 정확한 좌표에 위치
  return (
    <CustomOverlayMap
      position={{ lat: ping.lat, lng: ping.lng }}
      xAnchor={0.5}
      yAnchor={0.5}
      zIndex={100}
    >
      <div style={{ position: 'relative', width: 0, height: 0, pointerEvents: 'none' }}>
        {/* 펄스 원 — 항상 중앙에서 확장 */}
        <div
          ref={outerRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 150,
            height: 150,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            backgroundColor: color,
            opacity: 0.3,
            transform: 'translate(-50%, -50%)',
          }}
        />
        {/* 닉네임 라벨 — 중앙 상단 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: -28,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            color,
            fontSize: 12,
            fontWeight: 'bold',
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          }}
        >
          📡 {ping.nickname}의 신호
        </div>
      </div>
    </CustomOverlayMap>
  );
}

export default function PingOverlay({ pings, onExpire }: Props) {
  return (
    <>
      {pings.map(ping => (
        <PingCircle key={ping.id} ping={ping} onExpire={() => onExpire(ping.id)} />
      ))}
    </>
  );
}
