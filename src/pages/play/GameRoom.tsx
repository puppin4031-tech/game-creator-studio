import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTagRoom } from '@/hooks/useTagRoom';
import { useLocationShare } from '@/hooks/useLocationShare';
import { useDeviceHeading } from '@/hooks/useDeviceHeading';
import WaitingRoom from '@/components/tag-game/WaitingRoom';
import TagGameMap from '@/components/tag-game/TagGameMap';
import TreasureGameMap from '@/components/treasure/TreasureGameMap';
import GameTimer from '@/components/tag-game/GameTimer';
import { Team1Score, Team2Score } from '@/components/tag-game/TeamScoreboard';
import ChatDrawer from '@/components/tag-game/ChatDrawer';
import { Ping } from '@/components/tag-game/PingOverlay';
import { playPingSound } from '@/lib/pingSound';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Radio, Compass } from 'lucide-react';
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
    startGame, endGame, deleteRoom, sendMessage, updatePosition, setRoom, fetchRoom,
  } = useTagRoom(roomCode);

  const myPlayer = useMemo(
    () => players.find(p => p.nickname === nickname),
    [players, nickname]
  );

  const isHost = myPlayer?.is_host || false;
  const playerId = myPlayer?.id || null;
  const myTeam = myPlayer?.team || null;

  // Compass
  const [compassActive, setCompassActive] = useState(false);
  const { heading, requestPermission, permissionGranted } = useDeviceHeading(compassActive);

  const toggleCompass = useCallback(async () => {
    if (!compassActive && !permissionGranted) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    setCompassActive(prev => !prev);
  }, [compassActive, permissionGranted, requestPermission]);

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

  // Broadcast channel for signals
  useEffect(() => {
    if (!room || room.status !== 'playing') return;

    const channel = supabase.channel(`pings_${room.id}`);
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
    supabase.channel(`pings_${room.id}`).send({
      type: 'broadcast',
      event: 'ping',
      payload: ping,
    });

    setPingCooldown(PING_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setPingCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [room?.id, myTeam, nickname, position.latitude, position.longitude, pingCooldown]);

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
        onLeave={() => navigate('/play')}
        onDeleteRoom={isHost ? async () => {
          const ok = await deleteRoom(room.id);
          if (ok) {
            sessionStorage.removeItem('tag_room_code');
            sessionStorage.removeItem('tag_player_id');
            sessionStorage.removeItem('tag_host_id');
            navigate('/play');
          }
        } : undefined}
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
                <p className="text-sm text-muted-foreground">생존</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3">
                <p className="font-bold text-red-600">{room.team2_name}</p>
                <p className="text-2xl font-mono">{team2Alive}/{team2.length}</p>
                <p className="text-sm text-muted-foreground">생존</p>
              </div>
            </div>
            <Button onClick={() => {
              sessionStorage.removeItem('tag_room_code');
              sessionStorage.removeItem('tag_player_id');
              sessionStorage.removeItem('tag_host_id');
              navigate('/play');
            }} className="w-full gap-2 text-base h-12">
              <ArrowLeft className="w-5 h-5" /> 로비로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PLAYING STATE
  return (
    <div className="h-screen w-screen relative text-[1.3em]">
      {/* Map */}
      <TagGameMap
        room={room}
        players={players}
        currentPlayerId={playerId || ''}
        myTeam={myTeam}
        position={position}
        pings={pings}
        onPingExpire={handlePingExpire}
        heading={heading}
        isCompassActive={compassActive}
      />

      {/* Top navigation bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-background/85 backdrop-blur-md border-b shadow-sm">
        <div className="flex items-center justify-center gap-1 pt-1">
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            방 코드: {room.room_code}
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <Team1Score room={room} players={players} />
          <GameTimer room={room} isHost={isHost} onEndGame={() => endGame(room.id)} />
          <Team2Score room={room} players={players} />
        </div>
      </div>

      {/* Bottom bar - signal, compass, chat */}
      <div className="absolute bottom-6 left-3 right-3 z-10 flex items-end justify-between">
        {/* Signal button */}
        <Button
          size="icon"
          variant="secondary"
          className="h-20 w-20 rounded-full shadow-lg relative"
          onClick={sendPing}
          disabled={pingCooldown > 0}
          title="내 위치 신호 보내기"
        >
          {pingCooldown > 0 ? (
            <span className="text-xl font-bold">{pingCooldown}</span>
          ) : (
            <Radio className="w-9 h-9" />
          )}
        </Button>

        {/* Compass button */}
        <Button
          size="icon"
          variant={compassActive ? 'default' : 'secondary'}
          className="h-20 w-20 rounded-full shadow-lg"
          onClick={toggleCompass}
          title="나침반 모드"
        >
          <Compass className="w-9 h-9" />
        </Button>

        {/* Chat button */}
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
