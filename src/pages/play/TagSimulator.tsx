import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Circle, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { MockControls } from '@/components/game/MockControls';
import PingOverlay, { Ping } from '@/components/tag-game/PingOverlay';
import { haversineDistance } from '@/lib/haversine';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Radio, Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import { playPingSound } from '@/lib/pingSound';

const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.978;
const STEP = 0.0001;

interface MockPlayer {
  id: string;
  nickname: string;
  team: number;
  latitude: number;
  longitude: number;
  is_caught: boolean;
}

function generatePlayers(centerLat: number, centerLng: number): MockPlayer[] {
  const names1 = ['경찰A', '경찰B', '경찰C'];
  const names2 = ['도둑A', '도둑B', '도둑C'];
  return [
    ...names1.map((n, i) => ({
      id: `t1-${i}`,
      nickname: n,
      team: 1,
      latitude: centerLat + (Math.random() - 0.5) * 0.003,
      longitude: centerLng + (Math.random() - 0.5) * 0.003,
      is_caught: false,
    })),
    ...names2.map((n, i) => ({
      id: `t2-${i}`,
      nickname: n,
      team: 2,
      latitude: centerLat + (Math.random() - 0.5) * 0.003,
      longitude: centerLng + (Math.random() - 0.5) * 0.003,
      is_caught: false,
    })),
  ];
}

const TEAM_COLORS: Record<number, string> = { 1: '#3B82F6', 2: '#EF4444' };

export default function TagSimulator() {
  const navigate = useNavigate();
  const [myPos, setMyPos] = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [step, setStep] = useState(STEP);
  const [myTeam] = useState(1);
  const [players, setPlayers] = useState<MockPlayer[]>(() => generatePlayers(DEFAULT_LAT, DEFAULT_LNG));
  const [pings, setPings] = useState<Ping[]>([]);
  const [pingCooldown, setPingCooldown] = useState(0);
  const [timer, setTimer] = useState(300);
  const [score, setScore] = useState({ team1: 0, team2: 0 });
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const iv = setInterval(() => {
      setPlayers(prev => prev.map(p => {
        if (p.is_caught) return p;
        return {
          ...p,
          latitude: p.latitude + (Math.random() - 0.5) * 0.0002,
          longitude: p.longitude + (Math.random() - 0.5) * 0.0002,
        };
      }));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (timer <= 0) return;
    const iv = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  }, [timer]);

  const handleMove = useCallback((dir: 'north' | 'south' | 'east' | 'west') => {
    setMyPos(prev => ({
      latitude: prev.latitude + (dir === 'north' ? step : dir === 'south' ? -step : 0),
      longitude: prev.longitude + (dir === 'east' ? step : dir === 'west' ? -step : 0),
    }));
  }, [step]);

  const catchableEnemy = players.find(p =>
    p.team !== myTeam && !p.is_caught &&
    haversineDistance(myPos.latitude, myPos.longitude, p.latitude, p.longitude) <= 10
  );

  const handleCatch = () => {
    if (!catchableEnemy) return;
    setPlayers(prev => prev.map(p =>
      p.id === catchableEnemy.id ? { ...p, is_caught: true } : p
    ));
    setScore(prev => ({ ...prev, team1: prev.team1 + 1 }));
    toast.success(`${catchableEnemy.nickname}을(를) 잡았습니다! 🎉`);
  };

  const sendPing = useCallback(() => {
    if (pingCooldown > 0) return;
    const ping: Ping = {
      id: crypto.randomUUID(),
      lat: myPos.latitude,
      lng: myPos.longitude,
      team: myTeam,
      nickname: '나',
      timestamp: Date.now(),
    };
    setPings(prev => [...prev, ping]);
    playPingSound();
    setPingCooldown(10);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setPingCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [myPos, myTeam, pingCooldown]);

  const handlePingExpire = useCallback((id: string) => {
    setPings(prev => prev.filter(p => p.id !== id));
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const center = { lat: myPos.latitude, lng: myPos.longitude };

  const visiblePlayers = players.filter(p => {
    if (p.team === myTeam) return true;
    return haversineDistance(myPos.latitude, myPos.longitude, p.latitude, p.longitude) <= 1000;
  });

  return (
    <div className="h-screen w-screen relative">
      <div className="absolute top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-b shadow-sm">
        <div className="flex items-center justify-between px-3 py-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/play')} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> 로비
          </Button>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="text-blue-500">경찰: {score.team1}</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-red-500">도둑: {score.team2}</span>
          </div>
          <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{formatTime(timer)}</span>
        </div>
      </div>

      <Map center={center} style={{ width: '100%', height: '100%' }} level={5}>
        <Circle
          center={center}
          radius={1000}
          fillColor={TEAM_COLORS[myTeam]}
          fillOpacity={0.05}
          strokeColor={TEAM_COLORS[myTeam]}
          strokeOpacity={0.3}
          strokeWeight={1}
        />

        <CustomOverlayMap position={center} zIndex={20}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translate(-50%, -50%)' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              backgroundColor: TEAM_COLORS[myTeam], border: '3px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 16, fontWeight: 'bold',
            }}>★</div>
            <span style={{ fontSize: 10, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)', marginTop: 2 }}>나</span>
          </div>
        </CustomOverlayMap>

        {visiblePlayers.map(p => {
          const color = TEAM_COLORS[p.team] || '#888';
          return (
            <CustomOverlayMap key={p.id} position={{ lat: p.latitude, lng: p.longitude }} zIndex={10}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translate(-50%, -50%)' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: p.is_caught ? '#888' : color,
                  opacity: p.is_caught ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 'bold',
                }}>{p.nickname.charAt(0)}</div>
                <span style={{ fontSize: 10, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)', marginTop: 2 }}>
                  {p.nickname}{p.is_caught ? ' (잡힘)' : ''}
                </span>
              </div>
            </CustomOverlayMap>
          );
        })}

        <PingOverlay pings={pings} onExpire={handlePingExpire} />
      </Map>

      <div className="absolute bottom-6 left-3 right-3 z-50 flex items-end justify-between">
        <div className="flex flex-col gap-2 items-center">
          <Button
            size="icon"
            variant="secondary"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={sendPing}
            disabled={pingCooldown > 0}
          >
            {pingCooldown > 0 ? (
              <span className="text-base font-bold">{pingCooldown}</span>
            ) : (
              <Radio className="w-5 h-5" />
            )}
          </Button>
        </div>

        {catchableEnemy && (
          <Button
            size="lg"
            className="h-16 px-8 rounded-full shadow-lg bg-red-600 hover:bg-red-700 text-white text-lg font-bold animate-pulse"
            onClick={handleCatch}
          >
            <Crosshair className="w-6 h-6 mr-2" /> 잡기!
          </Button>
        )}
      </div>
    </div>
  );
}
