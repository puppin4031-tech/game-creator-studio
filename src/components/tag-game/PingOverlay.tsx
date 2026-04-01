import { useEffect, useRef, useCallback } from 'react';

export interface Ping {
  id: string;
  lat: number;
  lng: number;
  team: number;
  nickname: string;
  timestamp: number;
}

const PING_DURATION = 4000;
const PING_INTERVAL = 50;

const TEAM_COLORS: Record<number, string> = {
  1: '#3B82F6',
  2: '#EF4444',
};

interface Props {
  pings: Ping[];
  onExpire: (id: string) => void;
  map: google.maps.Map | null;
}

function usePingCircle(ping: Ping, map: google.maps.Map | null, onExpire: () => void) {
  const outerRef = useRef<google.maps.Circle | null>(null);
  const innerRef = useRef<google.maps.Circle | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!map) return;

    const color = TEAM_COLORS[ping.team] || '#EF4444';
    const center = { lat: ping.lat, lng: ping.lng };

    const outer = new google.maps.Circle({
      map,
      center,
      radius: 200,
      fillColor: color,
      fillOpacity: 0.2,
      strokeColor: color,
      strokeOpacity: 0.3,
      strokeWeight: 2,
      clickable: false,
      zIndex: 100,
    });

    const inner = new google.maps.Circle({
      map,
      center,
      radius: 100,
      fillColor: color,
      fillOpacity: 0.5,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      clickable: false,
      zIndex: 101,
    });

    outerRef.current = outer;
    innerRef.current = inner;
    startRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const progress = elapsed / PING_DURATION;

      if (progress >= 1) {
        outer.setMap(null);
        inner.setMap(null);
        onExpire();
        return;
      }

      const pulsePhase = Math.sin(elapsed * 0.005) * 0.5 + 0.5;
      const fadeOut = Math.max(0, 1 - progress);

      const outerRadius = 150 + pulsePhase * 250 * fadeOut;
      const innerRadius = 80 + pulsePhase * 120 * fadeOut;
      const outerOpacity = pulsePhase * fadeOut * 0.25;
      const innerOpacity = pulsePhase * fadeOut * 0.5;

      outer.setRadius(outerRadius);
      outer.setOptions({
        fillOpacity: outerOpacity,
        strokeOpacity: outerOpacity * 1.5,
      });

      inner.setRadius(innerRadius);
      inner.setOptions({
        fillOpacity: innerOpacity,
        strokeOpacity: Math.min(innerOpacity * 1.5, 1),
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      outer.setMap(null);
      inner.setMap(null);
    };
  }, [map, ping.id]);
}

function PingCircle({ ping, map, onExpire }: { ping: Ping; map: google.maps.Map | null; onExpire: () => void }) {
  usePingCircle(ping, map, onExpire);
  return null;
}

export default function PingOverlay({ pings, onExpire, map }: Props) {
  return (
    <>
      {pings.map(ping => (
        <PingCircle key={ping.id} ping={ping} map={map} onExpire={() => onExpire(ping.id)} />
      ))}
    </>
  );
}
