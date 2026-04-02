import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTagRoom, TagRoom } from '@/hooks/useTagRoom';
import { MapPin, Plus, LogIn, Gamepad2, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Lobby() {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useTagRoom();
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [roomTitle, setRoomTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [openRooms, setOpenRooms] = useState<(TagRoom & { player_count: number })[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  // Fetch open rooms
  const fetchOpenRooms = async () => {
    setRoomsLoading(true);
    const { data: rooms } = await supabase
      .from('tag_rooms')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });

    if (rooms && rooms.length > 0) {
      // Fetch player counts for each room
      const roomIds = rooms.map(r => r.id);
      const { data: players } = await supabase
        .from('tag_players')
        .select('room_id')
        .in('room_id', roomIds);

      const countMap: Record<string, number> = {};
      players?.forEach(p => {
        countMap[p.room_id] = (countMap[p.room_id] || 0) + 1;
      });

      setOpenRooms(rooms.map(r => ({ ...r, player_count: countMap[r.id] || 0 })) as any);
    } else {
      setOpenRooms([]);
    }
    setRoomsLoading(false);
  };

  useEffect(() => {
    fetchOpenRooms();
  }, []);

  const handleCreate = async () => {
    if (!nickname.trim() || !roomTitle.trim()) {
      toast.error('닉네임과 방 제목을 입력해주세요');
      return;
    }
    setLoading(true);
    const result = await createRoom(roomTitle.trim(), nickname.trim());
    setLoading(false);
    if (result) {
      sessionStorage.setItem('tag_nickname', nickname.trim());
      sessionStorage.setItem('tag_host_id', result.hostId);
      navigate(`/play/${result.room.room_code}`);
    } else {
      toast.error('방 생성에 실패했습니다');
    }
  };

  const handleJoin = async () => {
    if (!nickname.trim() || !joinCode.trim()) {
      toast.error('닉네임과 방 코드를 입력해주세요');
      return;
    }
    setLoading(true);
    const result = await joinRoom(joinCode.trim().toUpperCase(), nickname.trim());
    setLoading(false);
    if (result && result.player) {
      sessionStorage.setItem('tag_nickname', nickname.trim());
      sessionStorage.setItem('tag_player_id', result.player.id);
      navigate(`/play/${result.room.room_code}`);
    } else {
      toast.error('방을 찾을 수 없습니다');
    }
  };

  const handleQuickJoin = async (room: TagRoom) => {
    if (!nickname.trim()) {
      toast.error('닉네임을 먼저 입력해주세요');
      return;
    }
    setLoading(true);
    const result = await joinRoom(room.room_code, nickname.trim());
    setLoading(false);
    if (result && result.player) {
      sessionStorage.setItem('tag_nickname', nickname.trim());
      sessionStorage.setItem('tag_player_id', result.player.id);
      navigate(`/play/${result.room.room_code}`);
    } else {
      toast.error('방 참여에 실패했습니다');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 pt-8 gap-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Gamepad2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">🏃 술래잡기</CardTitle>
          <p className="text-sm text-muted-foreground">GPS 기반 실시간 팀전 술래잡기</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nickname input - always visible */}
          <div>
            <label className="text-sm font-medium mb-1 block">닉네임</label>
            <Input
              placeholder="닉네임을 입력하세요"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={12}
            />
          </div>

          {mode === 'menu' && (
            <div className="flex flex-col gap-3 pt-2">
              <Button size="lg" onClick={() => setMode('create')} className="gap-2">
                <Plus className="w-5 h-5" /> 방 만들기
              </Button>
              <Button size="lg" variant="outline" onClick={() => setMode('join')} className="gap-2">
                <LogIn className="w-5 h-5" /> 코드로 참여
              </Button>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">방 제목</label>
                <Input
                  placeholder="방 제목을 입력하세요"
                  value={roomTitle}
                  onChange={e => setRoomTitle(e.target.value)}
                  maxLength={30}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setMode('menu')} className="flex-1">뒤로</Button>
                <Button onClick={handleCreate} disabled={loading} className="flex-1 gap-2">
                  <MapPin className="w-4 h-4" /> {loading ? '생성 중...' : '방 생성'}
                </Button>
              </div>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">방 코드</label>
                <Input
                  placeholder="6자리 코드 입력"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center tracking-widest text-lg font-mono"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setMode('menu')} className="flex-1">뒤로</Button>
                <Button onClick={handleJoin} disabled={loading} className="flex-1 gap-2">
                  <LogIn className="w-4 h-4" /> {loading ? '참여 중...' : '참여'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Rooms List */}
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">🎮 대기 중인 방</CardTitle>
            <Button size="icon" variant="ghost" onClick={fetchOpenRooms} className="h-8 w-8">
              <RefreshCw className={`w-4 h-4 ${roomsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {roomsLoading ? (
            <p className="text-center text-sm text-muted-foreground py-4">불러오는 중...</p>
          ) : openRooms.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">대기 중인 방이 없습니다</p>
          ) : (
            openRooms.map(room => (
              <div
                key={room.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{room.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{room.room_code}</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {room.player_count}명
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleQuickJoin(room)}
                  disabled={loading}
                  className="ml-2 shrink-0"
                >
                  참여
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
