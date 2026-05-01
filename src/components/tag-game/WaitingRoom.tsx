import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TagRoom, TagPlayer } from '@/hooks/useTagRoom';
import { ArrowLeft, Copy, Play, Users, Settings, Crown, Trash2, ArrowRight, Undo2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import TreasureSetup from '@/components/treasure/TreasureSetup';
import { useTreasureHunt } from '@/hooks/useTreasureHunt';

interface Props {
  room: TagRoom;
  players: TagPlayer[];
  isHost: boolean;
  currentPlayerId: string;
  onAssignTeam: (playerId: string, team: number | null) => void;
  onUpdateTeamNames: (team1: string, team2: string) => void;
  onUpdateTimer: (seconds: number) => void;
  onStartGame: () => void;
  onLeave: () => void;
  onDeleteRoom?: () => void;
}

type PendingMap = Record<string, number | null>;

export default function WaitingRoom({
  room, players, isHost, currentPlayerId,
  onAssignTeam, onUpdateTeamNames, onUpdateTimer, onStartGame, onLeave, onDeleteRoom,
}: Props) {
  const [team1Name, setTeam1Name] = useState(room.team1_name);
  const [team2Name, setTeam2Name] = useState(room.team2_name);
  const [timerMin, setTimerMin] = useState(Math.floor(room.timer_seconds / 60));
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Optimistic update state
  const [pending, setPending] = useState<PendingMap>({});

  const isTreasure = room.game_mode === 'treasure';
  const { treasures, addTreasure, removeTreasure } = useTreasureHunt(
    isTreasure ? room.id : undefined, currentPlayerId, 0, 0
  );

  // Clean up pending entries when server caught up
  useEffect(() => {
    setPending(prev => {
      let changed = false;
      const next: PendingMap = { ...prev };
      players.forEach(p => {
        if (p.id in next && next[p.id] === p.team) {
          delete next[p.id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [players]);

  const handleAssign = (playerId: string, team: number | null) => {
    setPending(prev => ({ ...prev, [playerId]: team }));
    onAssignTeam(playerId, team);
  };

  // Apply pending overrides
  const effective = players.map(p => ({
    ...p,
    team: p.id in pending ? pending[p.id] : p.team,
  }));

  const team1Players = effective.filter(p => p.team === 1);
  const team2Players = effective.filter(p => p.team === 2);
  const unassigned = effective.filter(p => p.team === null);

  const allAssigned = unassigned.length === 0 && effective.length >= 2;

  const copyCode = () => {
    navigator.clipboard.writeText(room.room_code);
    toast.success('방 코드가 복사되었습니다');
  };

  const PUBLISHED_ORIGIN = 'https://gpspinggo.lovable.app';
  const getShareOrigin = () => {
    const origin = window.location.origin;
    try {
      const host = new URL(origin).hostname;
      // 게시된 공개 도메인(gpspinggo.lovable.app)이나 사용자 커스텀 도메인이 아니라면
      // 외부인이 Lovable 로그인 화면을 보지 않도록 published URL로 강제 치환
      const isPublished = host === 'gpspinggo.lovable.app';
      const isLovableInternal =
        host.endsWith('.lovable.app') ||
        host.endsWith('.lovable.dev') ||
        host.endsWith('.sandbox.lovable.dev') ||
        host === 'localhost' ||
        host.startsWith('127.0.0.1');
      if (!isPublished && isLovableInternal) return PUBLISHED_ORIGIN;
    } catch {
      // ignore
    }
    return origin;
  };

  const shareLink = async () => {
    const url = `${getShareOrigin()}/play/${room.room_code}`;
    const shareData = {
      title: '함께 플레이하기',
      text: `${room.title} 방에 참여하세요! (코드: ${room.room_code})`,
      url,
    };
    try {
      if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
    } catch (e) {
      // 공유 취소되었거나 실패 → 클립보드 폴백
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('초대 링크가 복사되었습니다');
    } catch {
      toast.error('링크 복사에 실패했습니다');
    }
  };

  const saveSettings = () => {
    onUpdateTeamNames(team1Name, team2Name);
    onUpdateTimer(timerMin * 60);
    setShowSettings(false);
    toast.success('설정이 저장되었습니다');
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24 overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" onClick={onLeave}>
          <ArrowLeft className="!w-5 !h-5 mr-1" /> 뒤로가기
        </Button>
        {isHost && onDeleteRoom && (
          confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-destructive">삭제할까요?</span>
              <Button variant="destructive" size="sm" onClick={onDeleteRoom}>확인</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>취소</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1" /> 방 삭제
            </Button>
          )
        )}
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold">{room.title}</h1>
        {isTreasure && <Badge className="mt-1">💎 보물찾기</Badge>}
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant="outline" className="text-lg font-mono tracking-widest px-4 py-1">
            {room.room_code}
          </Badge>
          <Button size="icon" variant="ghost" onClick={copyCode} title="코드 복사">
            <Copy className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={shareLink} title="초대 링크 공유">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          <Users className="w-4 h-4 inline mr-1" />{effective.length}명 참가 중
        </p>
      </div>

      {/* Treasure setup (host only, treasure mode) */}
      {isHost && isTreasure && (
        <TreasureSetup treasures={treasures} onAdd={addTreasure} onRemove={removeTreasure} />
      )}

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
          onAssign={handleAssign}
          pending={pending}
          color="bg-blue-500/10 border-blue-500/30"
          textColor="text-blue-600"
        />
        <TeamCard
          name={room.team2_name}
          team={2}
          players={team2Players}
          isHost={isHost}
          currentPlayerId={currentPlayerId}
          onAssign={handleAssign}
          pending={pending}
          color="bg-red-500/10 border-red-500/30"
          textColor="text-red-600"
        />
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">팀 미배정</p>
            <div className="flex flex-col gap-2">
              {unassigned.map(p => {
                const isPending = p.id in pending;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 min-h-[44px]">
                    <Badge variant="secondary" className="text-sm py-1.5">
                      {p.is_host && <Crown className="w-3 h-3 mr-1" />}
                      {p.nickname}
                    </Badge>
                    {isHost && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleAssign(p.id, 1)}
                          className="min-w-[44px] min-h-[44px] font-bold bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20"
                        >
                          1팀
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleAssign(p.id, 2)}
                          className="min-w-[44px] min-h-[44px] font-bold bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20"
                        >
                          2팀
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
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

function TeamCard({ name, team, players, isHost, currentPlayerId, onAssign, pending, color, textColor }: {
  name: string; team: number; players: TagPlayer[]; isHost: boolean;
  currentPlayerId: string; onAssign: (id: string, t: number | null) => void;
  pending: PendingMap;
  color: string; textColor: string;
}) {
  const otherTeam = team === 1 ? 2 : 1;
  return (
    <Card className={`border ${color}`}>
      <CardContent className="p-3">
        <p className={`text-sm font-bold ${textColor} mb-2`}>{name} ({players.length})</p>
        <div className="space-y-2">
          {players.map(p => {
            const isPending = p.id in pending;
            return (
              <div key={p.id} className="flex items-center justify-between gap-1 min-h-[44px]">
                <span className={`text-xs truncate ${p.id === currentPlayerId ? 'font-bold' : ''}`}>
                  {p.is_host && <Crown className="w-3 h-3 inline mr-1" />}
                  {p.nickname}
                </span>
                {isHost && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => onAssign(p.id, null)}
                      title="미배정으로 되돌리기"
                      aria-label="미배정으로 되돌리기"
                      className="min-w-[44px] min-h-[44px] h-11 w-11 p-0"
                    >
                      <Undo2 className="!w-4 !h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => onAssign(p.id, otherTeam)}
                      aria-label={`${otherTeam}팀으로 이동`}
                      className="min-w-[44px] min-h-[44px] h-11 px-2 text-xs gap-1 font-bold"
                    >
                      <ArrowRight className="!w-3 !h-3" />{otherTeam}팀
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {players.length === 0 && <p className="text-xs text-muted-foreground">아직 없음</p>}
        </div>
      </CardContent>
    </Card>
  );
}
