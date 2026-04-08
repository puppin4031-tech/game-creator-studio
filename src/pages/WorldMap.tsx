import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GoogleMap, Marker, Circle } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuth } from '@/contexts/AuthContext';
import { MockControls } from '@/components/game/MockControls';
import { GameMenu } from '@/components/game/GameMenu';
import { haversineDistance } from '@/lib/haversine';
import { Pickaxe, Package, ArrowLeft, Sparkles, Gem, X, Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import CraftingDrawer from '@/components/world/CraftingDrawer';

const COLLECT_RADIUS_M = 20;
const FETCH_RADIUS_M = 500;
const REFETCH_INTERVAL = 10_000;

const containerStyle = { height: '100%', width: '100%' };

const userIconUrl = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="8" fill="#22c55e" stroke="white" stroke-width="3"/></svg>`)}`;

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

const ITEM_ICONS: Record<string, string> = {
  ruby: '❤️', sapphire: '💙', emerald: '💚', diamond: '💎',
  gold: '🥇', silver: '🥈', copper: '🟤', alloy: '⚙️',
  opal: '🤍', amethyst: '💜', topaz: '🧡', pearl: '🫧', tin: '🪨',
};

function spawnIconUrl(rarity: string, inRange: boolean) {
  const color = RARITY_COLORS[rarity] || '#9ca3af';
  const ring = inRange ? 'white' : '#1f2937';
  const size = inRange ? 20 : 14;
  const r = size / 2 - 2;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="${color}" stroke="${ring}" stroke-width="2"/></svg>`
  )}`;
}

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
  const mapRef = useRef<google.maps.Map | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('world_onboarding_done');
  });

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

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ['user_stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch inventory count
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['user_inventory', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('user_inventory').select('*').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Enrich spawns with distance
  const spawns: SpawnWithDist[] = rawSpawns.map((s: any) => {
    // location comes as GeoJSON or WKT; parse lng/lat
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

  // Auto-deselect if moved out of range
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
      // Mark spawn as collected
      await supabase.from('global_spawns').update({
        last_collected_by: user.id,
        last_collected_at: new Date().toISOString(),
      }).eq('id', selectedSpawn.id);

      // Add to inventory
      // Check if user already has this item type
      const existing = inventoryItems.find(i => i.item_name === selectedSpawn.item_type && i.item_type === 'material');
      if (existing) {
        // Can't update via RLS, insert new row instead
        await supabase.from('user_inventory').insert({
          user_id: user.id,
          item_name: selectedSpawn.item_type,
          item_icon: selectedSpawn.item_icon,
          item_type: 'material',
          quantity: 1,
        });
      } else {
        await supabase.from('user_inventory').insert({
          user_id: user.id,
          item_name: selectedSpawn.item_type,
          item_icon: selectedSpawn.item_icon,
          item_type: 'material',
          quantity: 1,
        });
      }

      // Award XP
      if (userStats) {
        const xpGain = selectedSpawn.rarity === 'legendary' ? 25 : selectedSpawn.rarity === 'epic' ? 15 : selectedSpawn.rarity === 'rare' ? 10 : selectedSpawn.rarity === 'uncommon' ? 5 : 3;
        await supabase.from('user_stats').update({
          current_xp: (userStats.current_xp || 0) + xpGain,
        }).eq('user_id', user.id);
      }

      const icon = ITEM_ICONS[selectedSpawn.item_type] || '✨';
      toast.success(`${icon} ${selectedSpawn.item_type} 획득!`, { duration: 2000 });

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

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background">
      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: position.latitude, lng: position.longitude }}
        zoom={18}
        options={{
          zoomControl: false, mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#8892b0' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d44' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f0f23' }] },
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        }}
        onLoad={(map) => { mapRef.current = map; }}
      >
        {/* User marker */}
        <Marker
          position={{ lat: position.latitude, lng: position.longitude }}
          icon={{ url: userIconUrl, scaledSize: new google.maps.Size(24, 24), anchor: new google.maps.Point(12, 12) }}
        />
        {/* User radius */}
        <Circle
          center={{ lat: position.latitude, lng: position.longitude }}
          radius={COLLECT_RADIUS_M}
          options={{ strokeColor: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.08, strokeWeight: 1, strokeOpacity: 0.4 }}
        />
        <Circle
          center={{ lat: position.latitude, lng: position.longitude }}
          radius={FETCH_RADIUS_M}
          options={{ strokeColor: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.03, strokeWeight: 0.5, strokeOpacity: 0.2 }}
        />
        {/* Spawn markers */}
        {spawns.map(s => (
          <Marker
            key={s.id}
            position={{ lat: s.lat, lng: s.lng }}
            icon={{
              url: spawnIconUrl(s.rarity, s.inRange),
              scaledSize: new google.maps.Size(s.inRange ? 20 : 14, s.inRange ? 20 : 14),
              anchor: new google.maps.Point(s.inRange ? 10 : 7, s.inRange ? 10 : 7),
            }}
            title={`${ITEM_ICONS[s.item_type] || '✨'} ${s.item_type} (${Math.round(s.distance)}m)`}
            onClick={() => { if (s.inRange) setSelectedSpawn(s); }}
          />
        ))}
      </GoogleMap>

      {/* ===== TOP-LEFT HUD ===== */}
      <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-4 z-[1000] flex flex-col gap-2">
        {/* Back + coords */}
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
        {/* Stats bar */}
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
                <span className="text-3xl">{ITEM_ICONS[selectedSpawn.item_type] || '✨'}</span>
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
        {/* Crafting button + Mock controls */}
        <div className="w-full flex items-end justify-between px-4 pointer-events-auto">
          <Button
            onClick={() => setShowCrafting(true)}
            className="h-12 w-12 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
            size="icon"
          >
            <Hammer size={22} />
          </Button>
          <MockControls
            onMove={mockMove}
            isSimulated={isSimulated}
            position={position}
            onStepChange={setMockStep}
          />
        </div>
      </div>

      {/* Crafting drawer */}
      <CraftingDrawer open={showCrafting} onOpenChange={setShowCrafting} />
    </div>
  );
}
