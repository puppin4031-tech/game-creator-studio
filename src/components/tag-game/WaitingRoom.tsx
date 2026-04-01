import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TagRoom, TagPlayer } from '@/hooks/useTagRoom';
import { Copy, Play, Users, Settings, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  room: TagRoom;
  players: TagPlayer[];
  isHost: boolean;
  currentPlayerId: string;
  onAssignTeam: (playerId: string, team: number) => void;
  onUpdateTeamNames: (team1: string, team2: string) => void;
  onUpdateTimer: (seconds: number) => void;
  onStartGame: () => void;
}

export default function WaitingRoom({
  room, players, isHost, currentPlayerId,
  onAssignTeam, onUpdateTeamNames, onUpdateTimer, onStartGame,
}: Props) {
  const [team1Name, setTeam1Name] = useState(room.team1_name);
  const [team2Name, setTeam2Name] = useState(room.team2_name);
  const [timerMin, setTimerMin] = useState(Math.floor(room.timer_seconds / 60));
  const [showSettings, setShowSettings] = useState(false);

  const team1Players = players.filter(p => p.team === 1);
  const team2Players = players.filter(p => p.team === 2);
  const unassigned = players.filter(p => p.team === null);

  const allAssigned = unassigned.length === 0 && players.length >= 2;

  const copyCode = () => {
    navigator.clipboard.writeText(room.room_code);
    toast.success('방 코드가 복사되었습니다');
  };

  const saveSettings = () => {
    onUpdateTeamNames(team1Name, team2Name);
    onUpdateTimer(timerMin * 60);
    setShowSettings(false);
    toast.success('설정이 저장되었습니다');
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold">{room.title}</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant="outline" className="text-lg font-mono tracking-widest px-4 py-1">
            {room.room_code}
          </Badge>
          <Button size="icon" variant="ghost" onClick={copyCode}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          <Users className="w-4 h-4 inline mr-1" />{players.length}명 참가 중
        </p>
      </div>

      {/* Settings (host only) */}
      {isHost && (
        <div className="mb-4">
          {!showSettings ? (
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="w-full gap-2">
              <Settings className="w-4 h-4" /> 게임 설정
            </Button>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">팀 1 이름</label>
                    <Input value={team1Name} onChange={e => setTeam1Name(e.target.value)} maxLength={10} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">팀 2 이름</label>
                    <Input value={team2Name} onChange={e => setTeam2Name(e.target.value)} maxLength={10} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">타이머 (분)</label>
                  <Input type="number" min={1} max={120} value={timerMin} onChange={e => setTimerMin(Number(e.target.value))} />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)} className="flex-1">취소</Button>
                  <Button size="sm" onClick={saveSettings} className="flex-1">저장</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Teams */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <TeamCard
          name={room.team1_name}
          team={1}
          players={team1Players}
          isHost={isHost}
          currentPlayerId={currentPlayerId}
          onAssign={onAssignTeam}
          color="bg-blue-500/10 border-blue-500/30"
          textColor="text-blue-600"
        />
        <TeamCard
          name={room.team2_name}
          team={2}
          players={team2Players}
          isHost={isHost}
          currentPlayerId={currentPlayerId}
          onAssign={onAssignTeam}
          color="bg-red-500/10 border-red-500/30"
          textColor="text-red-600"
        />
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">팀 미배정</p>
            <div className="flex flex-wrap gap-2">
              {unassigned.map(p => (
                <div key={p.id} className="flex items-center gap-1">
                  <Badge variant="secondary">
                    {p.is_host && <Crown className="w-3 h-3 mr-1" />}
                    {p.nickname}
                  </Badge>
                  {isHost && (
                    <div className="flex gap-1">
                      <button onClick={() => onAssignTeam(p.id, 1)} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600 hover:bg-blue-500/30">1</button>
                      <button onClick={() => onAssignTeam(p.id, 2)} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-600 hover:bg-red-500/30">2</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start button */}
      {isHost && (
        <Button
          size="lg"
          className="w-full gap-2"
          disabled={!allAssigned}
          onClick={onStartGame}
        >
          <Play className="w-5 h-5" />
          {allAssigned ? '게임 시작!' : '모든 참가자를 팀에 배정해주세요'}
        </Button>
      )}

      {!isHost && (
        <p className="text-center text-sm text-muted-foreground mt-4">방장이 게임을 시작할 때까지 기다려주세요...</p>
      )}
    </div>
  );
}

function TeamCard({ name, team, players, isHost, currentPlayerId, onAssign, color, textColor }: {
  name: string; team: number; players: TagPlayer[]; isHost: boolean;
  currentPlayerId: string; onAssign: (id: string, t: number) => void;
  color: string; textColor: string;
}) {
  return (
    <Card className={`border ${color}`}>
      <CardContent className="p-3">
        <p className={`text-sm font-bold ${textColor} mb-2`}>{name} ({players.length})</p>
        <div className="space-y-1">
          {players.map(p => (
            <div key={p.id} className="flex items-center justify-between text-xs">
              <span className={p.id === currentPlayerId ? 'font-bold' : ''}>
                {p.is_host && <Crown className="w-3 h-3 inline mr-1" />}
                {p.nickname}
              </span>
              {isHost && !p.is_host && (
                <button
                  onClick={() => onAssign(p.id, team === 1 ? 2 : 1)}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  →{team === 1 ? '2' : '1'}
                </button>
              )}
            </div>
          ))}
          {players.length === 0 && <p className="text-xs text-muted-foreground">아직 없음</p>}
        </div>
      </CardContent>
    </Card>
  );
}
