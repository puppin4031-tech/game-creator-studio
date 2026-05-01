import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTagRoom } from '@/hooks/useTagRoom';
import { useLocationShare } from '@/hooks/useLocationShare';
import { useDeviceHeading } from '@/hooks/useDeviceHeading';
import { useTreasureHunt, TeamScores } from '@/hooks/useTreasureHunt';
import WaitingRoom from '@/components/tag-game/WaitingRoom';
import TagGameMap from '@/components/tag-game/TagGameMap';
import TreasureGameMap from '@/components/treasure/TreasureGameMap';
import GameTimer from '@/components/tag-game/GameTimer';
import { Team1Score, Team2Score } from '@/components/tag-game/TeamScoreboard';
import ChatDrawer from '@/components/tag-game/ChatDrawer';
import { Ping } from '@/components/tag-game/PingOverlay';
import { playPingSound } from '@/lib/pingSound';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Trophy, Radio, Compass, LogIn } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { TagRoom, TagPlayer } from '@/hooks/useTagRoom';

import { getTreasureIconSrc } from '@/lib/treasureIcons';

function TreasureEndScreen({ roomId, players, room }: { roomId: string; players: TagPlayer[]; room: TagRoom }) {
  const { treasures, teamScores, teamWithKey } = useTreasureHunt(roomId, null, 0, 0, players);
  const playerTeamMap = new Map(players.map(p => [p.id, p.team]));
  const playerNameMap = new Map(players.map(p => [p.id, p.nickname]));

  const winner = teamScores.team1 > teamScores.team2 ? room.team1_name
    : teamScores.team2 > teamScores.team1 ? room.team2_name
    : '무승부';

  const foundTreasures = treasures.filter(t => t.found_by);
  const team1Items = foundTreasures.filter(t => playerTeamMap.get(t.found_by!) === 1);
  const team2Items = foundTreasures.filter(t => playerTeamMap.get(t.found_by!) === 2);

  const chestOpener = treasures.find(t => t.treasure_subtype === 'chest' && t.found_by);
  const chestOpenerTeam = chestOpener ? playerTeamMap.get(chestOpener.found_by!) : null;

  const getIconSrc = (t: { treasure_subtype: string | null; challenge_type: string }) => {
    return getTreasureIconSrc(t.challenge_type, t.treasure_subtype);
  };

  const renderTeamItems = (items: typeof foundTreasures) => {
    if (items.length === 0) return <p className="text-xs text-muted-foreground py-2">획득한 보물 없음</p>;
    return (
      <div className="space-y-1 mt-2">
        {items.map(t => (
          <div key={t.id} className="flex items-center gap-2 text-sm bg-background/60 rounded px-2 py-1.5">
            <img src={getIconSrc(t)} alt="" className="w-6 h-6 object-contain" />
            <span className="flex-1 truncate text-xs">{t.keyword}</span>
            <span className="text-xs text-muted-foreground">{playerNameMap.get(t.found_by!) || '?'}</span>
            <span className="text-xs font-bold text-primary">+{t.points}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Victory banner */}
      {chestOpenerTeam && (
        <div className="text-center bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex justify-center gap-2">
            <img src={getTreasureIconSrc('treasure', 'chest')} alt="상자" className="w-8 h-8 object-contain" />
            <img src={getTreasureIconSrc('treasure', 'key')} alt="열쇠" className="w-8 h-8 object-contain" />
          </div>
          <p className="text-sm font-bold">
            {playerNameMap.get(chestOpener!.found_by!) || '?'}님이 보물상자를 열었습니다!
          </p>
        </div>
      )}

      {winner !== '무승부' ? (
        <p className="text-xl font-black text-center text-primary">🏆 {winner} 승리!</p>
      ) : (
        <p className="text-xl font-black text-center">🤝 무승부!</p>
      )}

      {/* Key holder */}
      {teamWithKey && (
        <p className="text-xs text-center text-muted-foreground">
          <img src={getTreasureIconSrc('treasure', 'key')} alt="열쇠" className="w-4 h-4 inline object-contain mr-1" />열쇠 보유: {teamWithKey === 1 ? room.team1_name : room.team2_name}
        </p>
      )}

      {/* Team 1 */}
      <div className="rounded-xl border-2 border-blue-300 dark:border-blue-700 overflow-hidden">
        <div className="bg-blue-500/10 px-4 py-3 flex items-center justify-between">
          <p className="font-bold text-blue-600 dark:text-blue-400">{room.team1_name}</p>
          <p className="text-2xl font-mono font-black">{teamScores.team1}<span className="text-sm font-normal ml-1">점</span></p>
        </div>
        <div className="px-3 pb-3">
          {renderTeamItems(team1Items)}
        </div>
      </div>

      {/* Team 2 */}
      <div className="rounded-xl border-2 border-red-300 dark:border-red-700 overflow-hidden">
        <div className="bg-red-500/10 px-4 py-3 flex items-center justify-between">
          <p className="font-bold text-red-600 dark:text-red-400">{room.team2_name}</p>
          <p className="text-2xl font-mono font-black">{teamScores.team2}<span className="text-sm font-normal ml-1">점</span></p>
        </div>
        <div className="px-3 pb-3">
          {renderTeamItems(team2Items)}
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted rounded-lg p-2">
          <p className="text-lg font-bold">{treasures.length}</p>
          <p className="text-[10px] text-muted-foreground">전체 보물</p>
        </div>
        <div className="bg-muted rounded-lg p-2">
          <p className="text-lg font-bold">{foundTreasures.length}</p>
          <p className="text-[10px] text-muted-foreground">발견됨</p>
        </div>
        <div className="bg-muted rounded-lg p-2">
          <p className="text-lg font-bold">{treasures.length - foundTreasures.length}</p>
          <p className="text-[10px] text-muted-foreground">미발견</p>
        </div>
      </div>
    </div>
  );
}

export default function GameRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  // 닉네임은 sessionStorage에서 읽되, 없으면 입력 카드를 통해 받는다 (링크 직접 진입 지원)
  const [nickname, setNickname] = useState<string>(sessionStorage.getItem('tag_nickname') || '');
  const [joinNicknameInput, setJoinNicknameInput] = useState<string>('');
  const [joining, setJoining] = useState(false);
  const hostId = sessionStorage.getItem('tag_host_id') || '';

  const {
    room, players, messages, loading,
    assignTeam, updateTeamNames, updateTimer,
    startGame, endGame, deleteRoom, sendMessage, updatePosition, setRoom, fetchRoom,
    rejoinRoom,
  } = useTagRoom(roomCode);

  const myPlayer = useMemo(
    () => players.find(p => p.nickname === nickname),
    [players, nickname]
  );

  const isHost = myPlayer?.is_host || false;
  const playerId = myPlayer?.id || null;
  const myTeam = myPlayer?.team ?? null;

  // Pending state for start/end (immediate UX feedback before realtime echoes back)
  const [statusPending, setStatusPending] = useState<null | 'starting' | 'ending'>(null);

  // Clear pending state once room status updates via realtime
  useEffect(() => {
    if (!room) return;
    if (statusPending === 'starting' && room.status === 'playing') setStatusPending(null);
    if (statusPending === 'ending' && room.status === 'ended') setStatusPending(null);
  }, [room?.status, statusPending]);

  const handleStartGame = useCallback(async () => {
    if (!room || statusPending) return;
    setStatusPending('starting');
    try {
      await startGame(room.id);
    } catch {
      setStatusPending(null);
    }
  }, [room?.id, statusPending, startGame]);

  const handleEndGame = useCallback(async () => {
    if (!room || statusPending) return;
    setStatusPending('ending');
    try {
      await endGame(room.id);
    } catch {
      setStatusPending(null);
    }
  }, [room?.id, statusPending, endGame]);

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
  const { position, isSimulated } = useLocationShare({
    playerId,
    updatePosition,
    isActive: room?.status === 'playing',
  });

  // 팀 정보를 ref로 동기화 (broadcast 콜백에서 stale closure 방지)
  const myTeamRef = useRef<number | null>(null);
  useEffect(() => { myTeamRef.current = myTeam; }, [myTeam]);

  // Broadcast channel for signals — 송신/수신 채널 공유 (ref)
  const pingChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!room || room.status !== 'playing') return;

    const channel = supabase.channel(`pings_${room.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'ping' }, ({ payload }) => {
        const p = payload as Ping;
        console.log('[Ping] received', p);
        // 같은 팀에게만 표시 (정책 유지)
        if (p.team === myTeamRef.current) {
          setPings(prev => (prev.some(x => x.id === p.id) ? prev : [...prev, p]));
          playPingSound();
        }
      })
      .subscribe((status) => {
        console.log('[Ping] channel status', status);
        if (status === 'SUBSCRIBED') {
          pingChannelRef.current = channel;
        }
      });

    return () => {
      pingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [room?.id, room?.status]);

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

    // 발신자 본인에게는 즉시 표시
    setPings(prev => [...prev, ping]);
    playPingSound();

    // 구독된 채널을 재사용해서 broadcast (새 채널 만들지 않음)
    const ch = pingChannelRef.current;
    if (ch) {
      ch.send({ type: 'broadcast', event: 'ping', payload: ping })
        .then((r) => console.log('[Ping] sent', r))
        .catch((e) => console.warn('[Ping] send error', e));
    } else {
      console.warn('[Ping] channel not subscribed yet');
    }

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

  // 링크로 직접 진입했고 닉네임이 없을 때 → 닉네임 입력 카드 표시
  const needsNicknameInput = !nickname && !!roomCode && !!room;

  const handleJoinByLink = useCallback(async () => {
    const nick = joinNicknameInput.trim();
    if (!nick) {
      toast.error('닉네임을 입력해주세요');
      return;
    }
    if (!roomCode) return;
    setJoining(true);
    const result = await rejoinRoom(roomCode.toUpperCase(), nick);
    setJoining(false);
    if (result && result.player) {
      sessionStorage.setItem('tag_nickname', nick);
      sessionStorage.setItem('tag_player_id', result.player.id);
      sessionStorage.setItem('tag_room_code', result.room.room_code);
      if (result.player.is_host) {
        sessionStorage.setItem('tag_host_id', result.room.host_id);
      }
      setNickname(nick);
      toast.success('참여했습니다');
    } else {
      toast.error('방을 찾을 수 없습니다');
    }
  }, [joinNicknameInput, roomCode, rejoinRoom]);

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 닉네임이 없으면 (링크로 직접 진입) 닉네임 입력 카드를 보여준다
  if (needsNicknameInput) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{room.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              방 코드 <span className="font-mono">{room.room_code}</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="text-sm font-medium block">닉네임을 입력하고 참여하세요</label>
            <Input
              placeholder="닉네임"
              value={joinNicknameInput}
              onChange={(e) => setJoinNicknameInput(e.target.value)}
              maxLength={12}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoinByLink(); }}
            />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/play')} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1" /> 로비로
              </Button>
              <Button onClick={handleJoinByLink} disabled={joining} className="flex-1 gap-2">
                <LogIn className="w-4 h-4" /> {joining ? '참여 중...' : '참여하기'}
              </Button>
            </div>
          </CardContent>
        </Card>
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
        onStartGame={handleStartGame}
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

    const isTreasureMode = room.game_mode === 'treasure';

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-bold">게임 종료!</h2>
            {isTreasureMode ? (
              <TreasureEndScreen roomId={room.id} players={players} room={room} />
            ) : (
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
            )}
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

  // PLAYING STATE — Treasure Hunt mode
  if (room.game_mode === 'treasure') {
    return (
      <div className="relative">
        <TreasureGameMap
          room={room}
          players={players}
          messages={messages}
          currentPlayerId={playerId || ''}
          myTeam={myTeam}
          position={position}
          nickname={nickname}
          isHost={isHost}
          heading={heading}
          isCompassActive={compassActive}
          onEndGame={handleEndGame}
          onSendMessage={(msg, channel) => sendMessage(room.id, nickname, msg, channel)}
        />
        {/* Compass toggle — WorldMap-style */}
        <div className="absolute bottom-[calc(7rem+env(safe-area-inset-bottom))] right-3 z-[1300]">
          <Button
            size="icon"
            onClick={toggleCompass}
            className={`h-12 w-12 rounded-full shadow-lg ${
              compassActive
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-card/90 hover:bg-card text-muted-foreground border border-border'
            }`}
            title="나침반 모드"
          >
            <Compass className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // PLAYING STATE — Tag mode
  return (
    <div className="h-[100dvh] w-full relative text-[1.3em] overflow-hidden">
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
          <GameTimer room={room} isHost={isHost} onEndGame={handleEndGame} />
          <Team2Score room={room} players={players} />
        </div>
      </div>

      {/* Right-side vertical action stack: signal, compass, chat */}
      <div
        className="absolute z-[1300] flex flex-col gap-3 text-base items-end"
        style={{
          top: 'calc(5.5rem + env(safe-area-inset-top))',
          right: 'calc(0.75rem + env(safe-area-inset-right))',
        }}
      >
        {/* Signal button */}
        <Button
          size="icon"
          variant="secondary"
          className="h-16 w-16 sm:h-[5.5rem] sm:w-[5.5rem] md:h-24 md:w-24 rounded-full shadow-lg relative"
          onClick={sendPing}
          disabled={pingCooldown > 0}
          title="내 위치 신호 보내기"
        >
          {pingCooldown > 0 ? (
            <span className="text-xl font-bold">{pingCooldown}</span>
          ) : (
            <Radio className="!w-6 !h-6 sm:!w-9 sm:!h-9 md:!w-10 md:!h-10" />
          )}
        </Button>

        {/* Compass button */}
        <Button
          size="icon"
          variant={compassActive ? 'default' : 'secondary'}
          className="h-16 w-16 sm:h-[5.5rem] sm:w-[5.5rem] md:h-24 md:w-24 rounded-full shadow-lg"
          onClick={toggleCompass}
          title="나침반 모드"
        >
          <Compass className="!w-6 !h-6 sm:!w-9 sm:!h-9 md:!w-10 md:!h-10" />
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
