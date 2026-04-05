import { useRef, useCallback, useEffect, useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { TagRoom, TagPlayer } from '@/hooks/useTagRoom';
import { useTreasureHunt } from '@/hooks/useTreasureHunt';
import ProximityGlow from './ProximityGlow';
import TreasureReveal from './TreasureReveal';
import TreasureQuizPopup from './TreasureQuizPopup';
import TreasureHUD from './TreasureHUD';
import GameTimer from '@/components/tag-game/GameTimer';
import ChatDrawer from '@/components/tag-game/ChatDrawer';
import { Team1Score, Team2Score } from '@/components/tag-game/TeamScoreboard';
import { Ping } from '@/components/tag-game/PingOverlay';
import PingOverlay from '@/components/tag-game/PingOverlay';
import { Button } from '@/components/ui/button';
import { Radio } from 'lucide-react';
import { TagMessage } from '@/hooks/useTagRoom';
import { playPingSound } from '@/lib/pingSound';
import { supabase } from '@/integrations/supabase/client';

const containerStyle = { width: '100%', height: '100%' };

interface Props {
  room: TagRoom;
  players: TagPlayer[];
  messages: TagMessage[];
  currentPlayerId: string;
  myTeam: number | null;
  position: { latitude: number; longitude: number };
  nickname: string;
  isHost: boolean;
  onEndGame: () => void;
  onSendMessage: (msg: string, channel: string) => void;
}

export default function TreasureGameMap({
  room, players, messages, currentPlayerId, myTeam, position, nickname, isHost, onEndGame, onSendMessage,
}: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  // Pings
  const [pings, setPings] = useState<Ping[]>([]);
  const [pingCooldown, setPingCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    treasures, nearest, proximityLevel, myFoundTreasures, cooldownLeft,
    attemptAnswer,
  } = useTreasureHunt(room.id, currentPlayerId, position.latitude, position.longitude);

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

  // Center map on my position
  useEffect(() => {
    if (mapRef.current && position.latitude && position.longitude) {
      mapRef.current.panTo({ lat: position.latitude, lng: position.longitude });
    }
  }, [position.latitude, position.longitude]);

  // Ping broadcast
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    const channel = supabase.channel(`pings_treasure_${room.id}`);
    channel.on('broadcast', { event: 'ping' }, ({ payload }) => {
      if (payload.team === myTeam) {
        setPings(prev => [...prev, payload as Ping]);
        playPingSound();
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room?.id, room?.status, myTeam]);

  const PING_COOLDOWN = 10;
  const sendPing = useCallback(() => {
    if (!room || !myTeam || pingCooldown > 0) return;
    const ping: Ping = {
      id: crypto.randomUUID(),
      lat: position.latitude,
      lng: position.longitude,
      team: myTeam,
      nickname,
      timestamp: Date.now(),
    };
    setPings(prev => [...prev, ping]);
    playPingSound();
    supabase.channel(`pings_treasure_${room.id}`).send({
      type: 'broadcast', event: 'ping', payload: ping,
    });
    setPingCooldown(PING_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setPingCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [room?.id, myTeam, nickname, position.latitude, position.longitude, pingCooldown]);

  const handlePingExpire = useCallback((id: string) => {
    setPings(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleAttempt = () => setQuizOpen(true);

  const handleQuizSubmit = async (answer: string) => {
    if (!nearest) return { success: false };
    return attemptAnswer(nearest.id, answer);
  };

  const center = { lat: position.latitude || 37.5665, lng: position.longitude || 126.978 };

  return (
    <div className="h-screen w-screen relative text-[1.3em]">
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={18} onLoad={onLoad}
        options={{ disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy' }}
      >
        {/* My marker */}
        {position.latitude !== 0 && (
          <Marker
            position={{ lat: position.latitude, lng: position.longitude }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 3,
            }}
          />
        )}

        {/* Team markers */}
        {players.filter(p => p.id !== currentPlayerId && p.team === myTeam && p.latitude).map(p => (
          <Marker
            key={p.id}
            position={{ lat: p.latitude, lng: p.longitude }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: '#94a3b8',
              fillOpacity: 0.8,
              strokeColor: '#fff',
              strokeWeight: 2,
            }}
            title={p.nickname}
          />
        ))}

        {/* Ping overlays */}
        <PingOverlay pings={pings} onExpire={handlePingExpire} map={mapRef.current} />
      </GoogleMap>

      {/* Proximity glow overlay */}
      <ProximityGlow level={proximityLevel} />

      {/* Treasure reveal (5m) */}
      {proximityLevel === 'close' && nearest && (
        <TreasureReveal
          treasure={nearest}
          cooldownLeft={cooldownLeft}
          onAttempt={handleAttempt}
        />
      )}

      {/* Quiz popup */}
      {nearest && (
        <TreasureQuizPopup
          open={quizOpen}
          onOpenChange={setQuizOpen}
          treasure={nearest}
          onQuizSubmit={handleQuizSubmit}
          onPuzzleSolve={async () => {
            if (!nearest) return { success: false };
            // Puzzle solved → claim the treasure
            const { data, error } = await supabase
              .from('treasure_items')
              .update({ found_by: currentPlayerId, found_at: new Date().toISOString() })
              .eq('id', nearest.id)
              .is('found_by', null)
              .select()
              .single();
            if (error || !data) return { success: false, alreadyFound: true };
            return { success: true };
          }}
        />
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-b shadow-sm">
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            방 코드: {room.room_code}
          </span>
          <TreasureHUD myFound={myFoundTreasures} total={treasures.length} />
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <Team1Score room={room} players={players} />
          <GameTimer room={room} isHost={isHost} onEndGame={onEndGame} />
          <Team2Score room={room} players={players} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-6 left-3 right-3 z-50 flex items-end justify-between">
        <Button
          size="icon"
          variant="secondary"
          className="h-20 w-20 rounded-full shadow-lg"
          onClick={sendPing}
          disabled={pingCooldown > 0}
        >
          {pingCooldown > 0 ? (
            <span className="text-xl font-bold">{pingCooldown}</span>
          ) : (
            <Radio className="w-9 h-9" />
          )}
        </Button>

        <ChatDrawer
          room={room}
          messages={messages}
          currentNickname={nickname}
          currentTeam={myTeam}
          isHost={isHost}
          onSend={onSendMessage}
        />
      </div>
    </div>
  );
}
