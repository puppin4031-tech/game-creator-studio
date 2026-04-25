import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Map, MapMarker, Circle, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuth } from '@/contexts/AuthContext';
import { MockControls } from '@/components/game/MockControls';
import { GameMenu } from '@/components/game/GameMenu';
import { haversineDistance } from '@/lib/haversine';
import { Pickaxe, Package, ArrowLeft, Sparkles, Gem, X, Hammer, Compass } from 'lucide-react';
import SpawnMarker from '@/components/world/SpawnMarker';
import { TREASURE_ICON_MAP } from '@/lib/treasureIcons';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import CraftingDrawer from '@/components/world/CraftingDrawer';
import { useDeviceHeading } from '@/hooks/useDeviceHeading';

const COLLECT_RADIUS_M = 20;
const FETCH_RADIUS_M = 500;
const REFETCH_INTERVAL = 10_000;

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

// ITEM_ICONS removed — use TREASURE_ICON_MAP from treasureIcons.ts

// RARITY_GLOW & spawnMarkerImage moved to SpawnMarker component

interface SpawnWithDist {
  id: string;
  item_type: string;
  item_icon: string;
  rarity: string;
  lat: number;
  lng: number;
  distance: number;
  inRange: boolean;
}

export default function WorldMap() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { position, mockMove, isSimulated, setMockStep } = useGeolocation();
  const [selectedSpawn, setSelectedSpawn] = useState<SpawnWithDist | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [compassActive, setCompassActive] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('world_onboarding_done');
  });

  const { heading, requestPermission, permissionGranted } = useDeviceHeading(compassActive);

  // Accumulated angle to avoid 360→0 wrap-around spin
  const accumulatedAngle = useRef(0);
  const smoothedAngle = useRef(0);
  const prevHeading = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const [mapRotation, setMapRotation] = useState(0);

  useEffect(() => {
    if (!compassActive || heading === null) {
      accumulatedAngle.current = 0;
      smoothedAngle.current = 0;
      prevHeading.current = null;
      setMapRotation(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    if (prevHeading.current === null) {
      accumulatedAngle.current = -heading;
      smoothedAngle.current = -heading;
    } else {
      let diff = heading - prevHeading.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      accumulatedAngle.current -= diff;
    }
    prevHeading.current = heading;

    const SMOOTHING = 0.12;
    const animate = () => {
      const delta = accumulatedAngle.current - smoothedAngle.current;
      if (Math.abs(delta) < 0.05) {
        smoothedAngle.current = accumulatedAngle.current;
      } else {
        smoothedAngle.current += delta * SMOOTHING;
      }
      setMapRotation(Math.round(smoothedAngle.current * 100) / 100);
      rafRef.current = requestAnimationFrame(animate);
    };

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [compassActive, heading]);

  // Fetch nearby spawns via RPC
  const { data: rawSpawns = [] } = useQuery({
    queryKey: ['global_spawns', position.latitude.toFixed(3), position.longitude.toFixed(3)],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_nearby_spawns', {
        _lat: position.latitude,
        _lng: position.longitude,
        _radius_m: FETCH_RADIUS_M,
      });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  const { data: userStats } = useQuery({
    queryKey: ['user_stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['user_inventory', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('user_inventory').select('*').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const spawns: SpawnWithDist[] = rawSpawns.map((s: any) => {
    let lat = 0, lng = 0;
    if (s.location) {
      if (typeof s.location === 'object' && s.location.coordinates) {
        [lng, lat] = s.location.coordinates;
      } else if (typeof s.location === 'string') {
        const m = s.location.match(/POINT\(([^ ]+) ([^)]+)\)/);
        if (m) { lng = parseFloat(m[1]); lat = parseFloat(m[2]); }
      }
    }
    const distance = haversineDistance(position.latitude, position.longitude, lat, lng);
    return { id: s.id, item_type: s.item_type, item_icon: s.item_icon, rarity: s.rarity, lat, lng, distance, inRange: distance <= COLLECT_RADIUS_M };
  });

  const nearbyCount = spawns.filter(s => s.inRange).length;

  useEffect(() => {
    if (selectedSpawn) {
      const updated = spawns.find(s => s.id === selectedSpawn.id);
      if (!updated) setSelectedSpawn(null);
      else if (!updated.inRange) setSelectedSpawn(null);
      else setSelectedSpawn(updated);
    }
  }, [spawns]);

  const handleCollect = useCallback(async () => {
    if (!selectedSpawn || !user || collecting) return;
    setCollecting(true);
    try {
      await supabase.from('global_spawns').update({
        last_collected_by: user.id,
        last_collected_at: new Date().toISOString(),
      }).eq('id', selectedSpawn.id);

      await supabase.from('user_inventory').insert({
        user_id: user.id,
        item_name: selectedSpawn.item_type,
        item_icon: selectedSpawn.item_icon,
        item_type: 'material',
        quantity: 1,
      });

      if (userStats) {
        const xpGain = selectedSpawn.rarity === 'legendary' ? 25 : selectedSpawn.rarity === 'epic' ? 15 : selectedSpawn.rarity === 'rare' ? 10 : selectedSpawn.rarity === 'uncommon' ? 5 : 3;
        await supabase.from('user_stats').update({
          current_xp: (userStats.current_xp || 0) + xpGain,
        }).eq('user_id', user.id);
      }

      toast.success(`${selectedSpawn.item_type} 획득!`, {
        duration: 2000,
        icon: TREASURE_ICON_MAP[selectedSpawn.item_type]
          ? <img src={TREASURE_ICON_MAP[selectedSpawn.item_type]} alt="" className="w-6 h-6 object-contain" />
          : undefined,
      });

      setSelectedSpawn(null);
      queryClient.invalidateQueries({ queryKey: ['global_spawns'] });
      queryClient.invalidateQueries({ queryKey: ['user_inventory'] });
      queryClient.invalidateQueries({ queryKey: ['user_stats'] });
    } catch (e) {
      toast.error('수집 실패');
    } finally {
      setCollecting(false);
    }
  }, [selectedSpawn, user, collecting, userStats, inventoryItems, queryClient]);

  const totalMaterials = inventoryItems.filter(i => i.item_type === 'material').reduce((sum, i) => sum + (i.quantity || 1), 0);

  const center = { lat: position.latitude, lng: position.longitude };

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background">
      {/* Floating spawn animation */}
      <style>{`
        @keyframes spawn-float {
          0%, 100% { transform: translate(-50%, -100%) translateY(0px); }
          50% { transform: translate(-50%, -100%) translateY(-5px); }
        }
        @keyframes spawn-glow-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
      {/* Kakao Map - rotated via CSS when compass active */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '150vmax',
          height: '150vmax',
          transform: `translate(-50%, -50%) rotate(${mapRotation}deg)`,
        }}
      >
        <Map
          center={center}
          style={{ width: '100%', height: '100%' }}
          level={2}
          draggable={!compassActive}
          zoomable={!compassActive}
        >
          {/* User radius circles */}
          <Circle
            center={center}
            radius={COLLECT_RADIUS_M}
            strokeWeight={1}
            strokeColor="#22c55e"
            strokeOpacity={0.4}
            fillColor="#22c55e"
            fillOpacity={0.08}
          />
          <Circle
            center={center}
            radius={FETCH_RADIUS_M}
            strokeWeight={0.5}
            strokeColor="#3b82f6"
            strokeOpacity={0.2}
            fillColor="#3b82f6"
            fillOpacity={0.03}
          />

          {/* User marker - arrow when compass, dot otherwise */}
          <CustomOverlayMap position={center} zIndex={10}>
            {compassActive && heading !== null ? (
              <div style={{ transform: `rotate(${heading}deg)`, transformOrigin: 'center center' }}>
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <defs>
                    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.3"/>
                    </filter>
                  </defs>
                  <g filter="url(#s)">
                    <polygon points="24,6 34,38 24,32 14,38" fill="#4ade80" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  </g>
                </svg>
              </div>
            ) : (
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                backgroundColor: '#22c55e', border: '3px solid white',
                transform: 'translate(-50%, -50%)',
              }} />
            )}
          </CustomOverlayMap>

          {/* Spawn markers */}
          {spawns.map(s => (
            <SpawnMarker key={s.id} spawn={s} onSelect={setSelectedSpawn} />
          ))}
        </Map>
      </div>

      {/* ===== TOP-LEFT HUD ===== */}
      <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-4 z-[1000] flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-card/90 backdrop-blur rounded-full px-3 py-2 border border-border text-xs">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /></Link>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-muted-foreground">
            {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
          </span>
          {position.accuracy != null && (
            <span className={`font-medium ${position.accuracy <= 10 ? 'text-green-500' : position.accuracy <= 25 ? 'text-yellow-500' : 'text-destructive'}`}>
              ±{position.accuracy.toFixed(1)}m
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 bg-card/90 backdrop-blur rounded-full px-3 py-2 border border-border text-xs">
          <span className="flex items-center gap-1 text-yellow-400">
            <Sparkles size={12} /> Lv.{userStats?.level ?? 1}
          </span>
          <span className="text-muted-foreground">XP {userStats?.current_xp ?? 0}</span>
          <span className="flex items-center gap-1 text-blue-400">
            <Package size={12} /> {totalMaterials}
          </span>
          <span className="flex items-center gap-1 text-green-400">
            <Gem size={12} /> {nearbyCount} 근처
          </span>
        </div>
      </div>

      {/* ===== TOP-RIGHT HUD ===== */}
      <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] right-4 z-[1100] flex items-center gap-2">
        <Link to="/play">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3 py-1 text-xs font-bold shadow-lg gap-1">
            🎮 GPS 게임
          </Button>
        </Link>
        <GameMenu />
      </div>

      {/* ===== COLLECTION POPUP ===== */}
      <AnimatePresence>
        {selectedSpawn && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[calc(10rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[1200]"
          >
            <div className="bg-card/95 backdrop-blur-lg border border-border rounded-2xl p-4 shadow-2xl min-w-[220px]">
              <button onClick={() => setSelectedSpawn(null)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <img src={TREASURE_ICON_MAP[selectedSpawn.item_type] || TREASURE_ICON_MAP['diamond']} alt={selectedSpawn.item_type} className="w-10 h-10 object-contain" />
                <div>
                  <div className="font-bold text-foreground capitalize">{selectedSpawn.item_type}</div>
                  <div className="text-xs capitalize" style={{ color: RARITY_COLORS[selectedSpawn.rarity] }}>
                    {selectedSpawn.rarity} · {Math.round(selectedSpawn.distance)}m
                  </div>
                </div>
              </div>
              <Button
                onClick={handleCollect}
                disabled={collecting}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                size="sm"
              >
                {collecting ? '수집 중...' : '⛏️ 채집하기'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== BOTTOM HUD ===== */}
      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-0 right-0 z-[1000] flex flex-col items-center gap-3 pointer-events-none">
        <div className="w-full flex items-end justify-between px-4 pointer-events-auto">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCrafting(true)}
              className="h-12 w-12 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
              size="icon"
            >
              <Hammer size={22} />
            </Button>
            <Button
              onClick={async () => {
                if (!compassActive) {
                  const ok = await requestPermission();
                  if (ok) setCompassActive(true);
                  else toast.error('방향 센서 권한이 필요합니다');
                } else {
                  setCompassActive(false);
                }
              }}
              className={`h-12 w-12 rounded-full shadow-lg ${
                compassActive
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-card/90 hover:bg-card text-muted-foreground border border-border'
              }`}
              size="icon"
            >
              <Compass size={22} />
            </Button>
          </div>
        </div>
      </div>

      {/* Crafting drawer */}
      <CraftingDrawer open={showCrafting} onOpenChange={setShowCrafting} />

      {/* ===== ONBOARDING OVERLAY ===== */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999]"
            onClick={() => {
              setShowOnboarding(false);
              localStorage.setItem('world_onboarding_done', '1');
            }}
          >
            <div className="absolute inset-0 bg-black/70" />
            <div className="absolute top-[calc(3.5rem+env(safe-area-inset-top))] left-4 z-10">
              <div className="rounded-full px-3 py-2 ring-2 ring-emerald-400/80 shadow-[0_0_20px_4px_rgba(34,197,94,0.35)]">
                <div className="flex items-center gap-3 text-xs text-white">
                  <span className="flex items-center gap-1">⭐ 레벨 & XP</span>
                  <span className="flex items-center gap-1">📦 보유 원석</span>
                  <span className="flex items-center gap-1">💎 근처 아이템</span>
                </div>
              </div>
              <p className="text-xs text-emerald-300 mt-2 ml-1 font-medium drop-shadow-lg">
                내 탐험 현황을 확인하세요
              </p>
            </div>
            <div className="absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-4 z-10">
              <div className="rounded-full px-3 py-1.5 ring-2 ring-blue-400/80 shadow-[0_0_20px_4px_rgba(59,130,246,0.35)]">
                <span className="text-xs font-bold text-white">🎮 GPS 게임</span>
              </div>
              <p className="text-xs text-blue-300 mt-2 text-right font-medium drop-shadow-lg">
                술래잡기 & 보물찾기
              </p>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center max-w-[280px]">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                <div className="text-4xl">🗺️</div>
                <h2 className="text-lg font-bold text-white">오픈 월드에 오신 걸 환영해요!</h2>
                <div className="space-y-2 text-sm text-white/80">
                  <p>🚶 <span className="text-white font-medium">주변을 걸으며</span> 원석을 찾으세요</p>
                  <p>📍 <span className="text-white font-medium">20m 이내</span>로 접근하면 채집 가능</p>
                  <p>⚒️ 원석을 모아 <span className="text-white font-medium">장신구를 세공</span>하세요</p>
                </div>
              </motion.div>
            </div>
            <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-4 z-10">
              <div className="h-12 w-12 rounded-full ring-2 ring-amber-400/80 shadow-[0_0_20px_4px_rgba(245,158,11,0.4)] flex items-center justify-center">
                <Hammer size={22} className="text-amber-300" />
              </div>
              <p className="text-xs text-amber-300 mt-2 font-medium drop-shadow-lg">
                세공 & 조합
              </p>
            </div>
            <div className="absolute top-[calc(50%+80px)] left-1/2 -translate-x-1/2 z-10">
              <div className="w-16 h-16 rounded-full border-2 border-emerald-400/60 bg-emerald-400/10 mx-auto shadow-[0_0_15px_2px_rgba(34,197,94,0.3)]" />
              <p className="text-xs text-emerald-300 mt-1.5 text-center font-medium drop-shadow-lg">
                수집 범위 (20m)
              </p>
            </div>
            <div className="absolute bottom-[calc(2rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-10">
              <button className="text-xs text-white/60 hover:text-white transition-colors px-4 py-2 rounded-full border border-white/20 backdrop-blur-sm">
                화면을 탭하여 시작하기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
