import { useEffect, useState } from 'react';
import { Circle } from '@react-google-maps/api';

export interface Ping {
  id: string;
  lat: number;
  lng: number;
  team: number;
  timestamp: number;
}

const PING_DURATION = 4000; // 4 seconds total
const PING_INTERVAL = 200;

const TEAM_COLORS: Record<number, string> = {
  1: '#3B82F6',
  2: '#EF4444',
};

interface Props {
  pings: Ping[];
  onExpire: (id: string) => void;
}

function PingCircle({ ping, onExpire }: { ping: Ping; onExpire: () => void }) {
  const [opacity, setOpacity] = useState(0.6);
  const [radius, setRadius] = useState(30);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, PING_INTERVAL);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      onExpire();
    }, PING_DURATION);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const elapsed = tick * PING_INTERVAL;
    const progress = elapsed / PING_DURATION;

    // Pulsing effect: oscillate between visible and invisible
    const pulsePhase = Math.sin(tick * 0.8) * 0.5 + 0.5;
    
    // Fade out over time
    const fadeOut = Math.max(0, 1 - progress);
    
    setOpacity(pulsePhase * fadeOut * 0.6);
    setRadius(30 + pulsePhase * 60 * fadeOut);
  }, [tick]);

  const color = TEAM_COLORS[ping.team] || '#EF4444';

  return (
    <>
      {/* Outer pulse ring */}
      <Circle
        center={{ lat: ping.lat, lng: ping.lng }}
        radius={radius * 2}
        options={{
          fillColor: color,
          fillOpacity: opacity * 0.3,
          strokeColor: color,
          strokeOpacity: opacity * 0.5,
          strokeWeight: 2,
          clickable: false,
        }}
      />
      {/* Inner solid circle */}
      <Circle
        center={{ lat: ping.lat, lng: ping.lng }}
        radius={radius}
        options={{
          fillColor: color,
          fillOpacity: opacity,
          strokeColor: color,
          strokeOpacity: opacity * 1.2,
          strokeWeight: 2,
          clickable: false,
        }}
      />
    </>
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
