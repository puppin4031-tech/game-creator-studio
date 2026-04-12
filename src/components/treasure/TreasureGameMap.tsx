import { useRef, useCallback, useEffect, useState } from 'react';
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { TagRoom, TagPlayer } from '@/hooks/useTagRoom';
import { useTreasureHunt, NearestTreasure } from '@/hooks/useTreasureHunt';
import ProximityGlow from './ProximityGlow';
import TreasureQuizPopup from './TreasureQuizPopup';
import TreasureHUD from './TreasureHUD';
import ShovelButton from './ShovelButton';
import TreasureInventoryDrawer from './TreasureInventoryDrawer';
import ChestVictoryOverlay from './ChestVictoryOverlay';
import GameTimer from '@/components/tag-game/GameTimer';
import ChatDrawer from '@/components/tag-game/ChatDrawer';
import { Ping } from '@/components/tag-game/PingOverlay';
import PingOverlay from '@/components/tag-game/PingOverlay';
import { Button } from '@/components/ui/button';
import { Radio } from 'lucide-react';
import AddressSearchBar from './AddressSearchBar';
import { TagMessage } from '@/hooks/useTagRoom';
import { playPingSound } from '@/lib/pingSound';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SUBTYPE_ICONS: Record<string, string> = {
  diamond: '💎', gold: '🥇', ruby: '❤️', sapphire: '💙', key: '🔑', chest: '📦',
};

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
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [activeTreasure, setActiveTreasure] = useState<NearestTreasure | null>(null);
  const [chestDialogOpen, setChestDialogOpen] = useState(false);
  const [gemDialogOpen, setGemDialogOpen] = useState(false);
  const [victoryOverlay, setVictoryOverlay] = useState(false);
  const [pings, setPings] = useState<Ping[]>([]);
  const [pingCooldown, setPingCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    treasures, nearest, proximityLevel, myFoundTreasures, cooldownLeft,
    hasKey, teamScores, attemptAnswer, claimTreasure, attemptChest,
  } = useTreasureHunt(room.id, currentPlayerId, position.latitude, position.longitude, players);

  useEffect(() => {
    if (mapRef.current && position.latitude && position.longitude) {
      mapRef.current.panTo(new kakao.maps.LatLng(position.latitude, position.longitude));
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

  const handleDigSuccess = (treasure: NearestTreasure) => {
    setActiveTreasure(treasure);
    if (treasure.challenge_type === 'treasure') {
      if (treasure.treasure_subtype === 'chest') {
        setChestDialogOpen(true);
      } else {
        setGemDialogOpen(true);
      }
    } else {
      setQuizOpen(true);
    }
  };

  const handleGemClaim = async () => {
    if (!activeTreasure) return;
    const result = await claimTreasure(activeTreasure.id);
    setGemDialogOpen(false);
    if (result.success) {
      const icon = activeTreasure.treasure_subtype ? SUBTYPE_ICONS[activeTreasure.treasure_subtype] || '💎' : '💎';
      toast.success(`${icon} ${activeTreasure.keyword}을(를) 획득했습니다! (+${activeTreasure.points}점)`);
    } else if (result.alreadyFound) {
      toast.error('이미 다른 플레이어가 획득했습니다!');
    }
  };

  const handleChestOpen = async () => {
    if (!activeTreasure) return;
    const result = await attemptChest(activeTreasure.id);
    setChestDialogOpen(false);
    if (result.noKey) {
      toast.error('🔑 열쇠가 필요합니다! 먼저 열쇠를 찾으세요.');
    } else if (result.success) {
      setVictoryOverlay(true);
    } else if (result.alreadyFound) {
      toast.error('이미 다른 팀이 열었습니다!');
    }
  };

  const myTeamName = myTeam === 1 ? room.team1_name : room.team2_name;

  const handleQuizSubmit = async (answer: string) => {
    if (!activeTreasure) return { success: false };
    return attemptAnswer(activeTreasure.id, answer);
  };

  const center = { lat: position.latitude || 37.5665, lng: position.longitude || 126.978 };

  return (
    <div className="h-screen w-screen relative text-[1.3em]">
      <Map
        center={center}
        style={{ width: '100%', height: '100%' }}
        level={2}
        onCreate={(map) => { mapRef.current = map; }}
      >
        {position.latitude !== 0 && (
          <CustomOverlayMap position={{ lat: position.latitude, lng: position.longitude }} zIndex={10}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              backgroundColor: '#3b82f6', border: '3px solid white',
              transform: 'translate(-50%, -50%)',
            }} />
          </CustomOverlayMap>
        )}

        {players.filter(p => p.id !== currentPlayerId && p.team === myTeam && p.latitude).map(p => (
          <CustomOverlayMap key={p.id} position={{ lat: p.latitude, lng: p.longitude }} zIndex={5}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              backgroundColor: '#94a3b8', border: '2px solid white', opacity: 0.8,
              transform: 'translate(-50%, -50%)',
            }} title={p.nickname} />
          </CustomOverlayMap>
        ))}

        <PingOverlay pings={pings} onExpire={handlePingExpire} />
      </Map>

      <ProximityGlow level={proximityLevel} />

      {activeTreasure && (
        <TreasureQuizPopup
          open={quizOpen}
          onOpenChange={setQuizOpen}
          treasure={activeTreasure}
          onQuizSubmit={handleQuizSubmit}
          onPuzzleSolve={async () => {
            if (!activeTreasure) return { success: false };
            const { data, error } = await supabase
              .from('treasure_items')
              .update({ found_by: currentPlayerId, found_at: new Date().toISOString() })
              .eq('id', activeTreasure.id)
              .is('found_by', null)
              .select()
              .single();
            if (error || !data) return { success: false, alreadyFound: true };
            return { success: true };
          }}
        />
      )}

      <AlertDialog open={gemDialogOpen} onOpenChange={setGemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl">
              {activeTreasure?.treasure_subtype ? SUBTYPE_ICONS[activeTreasure.treasure_subtype] || '💎' : '💎'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <strong>{activeTreasure?.keyword}</strong>을(를) 발견했습니다!
              <br />
              <span className="text-lg font-bold text-primary">+{activeTreasure?.points}점</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleGemClaim}>획득하기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={chestDialogOpen} onOpenChange={setChestDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl">📦 보물상자</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              보물상자를 발견했습니다!
              <br />
              {hasKey ? (
                <span className="text-emerald-600 font-bold">🔑 열쇠를 보유하고 있습니다. 상자를 여시겠습니까?</span>
              ) : (
                <span className="text-destructive font-bold">🔒 열쇠가 없습니다. 먼저 열쇠를 찾아야 합니다!</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            {hasKey && (
              <AlertDialogAction onClick={handleChestOpen}>상자 열기</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="absolute top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-b shadow-sm">
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            방 코드: {room.room_code}
          </span>
          {hasKey && <span className="text-xs bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">🔑 열쇠 보유</span>}
          <AddressSearchBar onSelect={(lat, lng) => {
            if (mapRef.current) {
              mapRef.current.panTo(new kakao.maps.LatLng(lat, lng));
            }
          }} />
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <TreasureHUD
            teamScores={teamScores}
            team1Name={room.team1_name}
            team2Name={room.team2_name}
            hasKey={hasKey}
          />
          <GameTimer room={room} isHost={isHost} onEndGame={onEndGame} />
        </div>
      </div>

      <div className="absolute bottom-6 left-3 right-3 z-50 flex items-end justify-between">
        <div className="flex flex-col gap-2 items-center">
          <TreasureInventoryDrawer foundTreasures={myFoundTreasures} hasKey={hasKey} />
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

        <ShovelButton
          nearest={nearest}
          onDigSuccess={handleDigSuccess}
          disabled={cooldownLeft > 0}
        />

        <ChatDrawer
          room={room}
          messages={messages}
          currentNickname={nickname}
          currentTeam={myTeam}
          isHost={isHost}
          onSend={onSendMessage}
        />
      </div>

      {victoryOverlay && (
        <ChestVictoryOverlay
          winnerTeam={myTeamName}
          onComplete={onEndGame}
        />
      )}
    </div>
  );
}
