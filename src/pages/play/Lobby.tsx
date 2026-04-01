import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTagRoom } from '@/hooks/useTagRoom';
import { MapPin, Plus, LogIn, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Lobby() {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useTagRoom();
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [roomTitle, setRoomTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
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
                <LogIn className="w-5 h-5" /> 방 참여하기
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
    </div>
  );
}
