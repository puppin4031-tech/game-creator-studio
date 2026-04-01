import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTagRoom } from '@/hooks/useTagRoom';
import { useLocationShare } from '@/hooks/useLocationShare';
import WaitingRoom from '@/components/tag-game/WaitingRoom';
import TagGameMap from '@/components/tag-game/TagGameMap';
import GameTimer from '@/components/tag-game/GameTimer';
import TeamScoreboard from '@/components/tag-game/TeamScoreboard';
import ChatDrawer from '@/components/tag-game/ChatDrawer';
import { Ping } from '@/components/tag-game/PingOverlay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Radio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export default function GameRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const nickname = sessionStorage.getItem('tag_nickname') || '';
  const hostId = sessionStorage.getItem('tag_host_id') || '';

  const {
    room, players, messages, loading,
    assignTeam, updateTeamNames, updateTimer,
    startGame, endGame, sendMessage, updatePosition, setRoom, fetchRoom,
  } = useTagRoom(roomCode);

  // Find my player
  const myPlayer = useMemo(
    () => players.find(p => p.nickname === nickname),
    [players, nickname]
  );

  const isHost = myPlayer?.is_host || false;
  const playerId = myPlayer?.id || null;
  const myTeam = myPlayer?.team || null;

  // Pings state
  const [pings, setPings] = useState<Ping[]>([]);
  const [pingCooldown, setPingCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePingExpire = useCallback((id: string) => {
    setPings(prev => prev.filter(p => p.id !== id));
  }, []);

  // Location sharing during game
  const { position } = useLocationShare({
    playerId,
    updatePosition,
    isActive: room?.status === 'playing',
  });

  // Broadcast channel for pings
  useEffect(() => {
    if (!room || room.status !== 'playing') return;

    const channel = supabase.channel(`pings_${room.id}`);
    channel.on('broadcast', { event: 'ping' }, ({ payload }) => {
      if (payload.team === myTeam) {
        setPings(prev => [...prev, payload as Ping]);
      }
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room?.id, room?.status, myTeam]);

  const sendPing = useCallback(() => {
    if (!room || !myTeam) return;
    const ping: Ping = {
      id: crypto.randomUUID(),
      lat: position.latitude,
      lng: position.longitude,
      team: myTeam,
      timestamp: Date.now(),
    };
    // Show locally too
    setPings(prev => [...prev, ping]);
    supabase.channel(`pings_${room.id}`).send({
      type: 'broadcast',
      event: 'ping',
      payload: ping,
    });
  }, [room?.id, myTeam, position.latitude, position.longitude]);

  // Redirect if no nickname
  useEffect(() => {
    if (!nickname) navigate('/play');
  }, [nickname]);

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // WAITING STATE
  if (room.status === 'waiting') {
    return (
      <WaitingRoom
        room={room}
        players={players}
        isHost={isHost}
        currentPlayerId={playerId || ''}
        onAssignTeam={(pid, team) => assignTeam(pid, team)}
        onUpdateTeamNames={(t1, t2) => updateTeamNames(room.id, t1, t2)}
        onUpdateTimer={(s) => updateTimer(room.id, s)}
        onStartGame={() => startGame(room.id)}
      />
    );
  }

  // ENDED STATE
  if (room.status === 'ended') {
    const team1 = players.filter(p => p.team === 1);
    const team2 = players.filter(p => p.team === 2);
    const team1Alive = team1.filter(p => !p.is_caught).length;
    const team2Alive = team2.filter(p => !p.is_caught).length;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-bold">게임 종료!</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-500/10 rounded-lg p-3">
                <p className="font-bold text-blue-600">{room.team1_name}</p>
                <p className="text-2xl font-mono">{team1Alive}/{team1.length}</p>
                <p className="text-xs text-muted-foreground">생존</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3">
                <p className="font-bold text-red-600">{room.team2_name}</p>
                <p className="text-2xl font-mono">{team2Alive}/{team2.length}</p>
                <p className="text-xs text-muted-foreground">생존</p>
              </div>
            </div>
            <Button onClick={() => navigate('/play')} className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" /> 로비로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PLAYING STATE
  return (
    <div className="h-screen w-screen relative">
      {/* Map */}
      <TagGameMap
        room={room}
        players={players}
        currentPlayerId={playerId || ''}
        myTeam={myTeam}
        position={position}
        pings={pings}
        onPingExpire={handlePingExpire}
      />

      {/* Top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <GameTimer room={room} isHost={isHost} onEndGame={() => endGame(room.id)} />
        <TeamScoreboard room={room} players={players} />
      </div>

      {/* Ping button */}
      <div className="absolute bottom-6 left-4 z-10">
        <Button
          size="icon"
          variant="secondary"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={sendPing}
          title="내 위치 신호 보내기"
        >
          <Radio className="w-5 h-5" />
        </Button>
      </div>

      {/* Chat button */}
      <div className="absolute bottom-6 right-4 z-10">
        <ChatDrawer
          room={room}
          messages={messages}
          currentNickname={nickname}
          currentTeam={myTeam}
          isHost={isHost}
          onSend={(msg, channel) => sendMessage(room.id, nickname, msg, channel)}
        />
      </div>
    </div>
  );
}
