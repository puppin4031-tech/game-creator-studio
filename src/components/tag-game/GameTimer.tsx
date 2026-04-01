import { useState, useEffect } from 'react';
import { TagRoom } from '@/hooks/useTagRoom';
import { Clock, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  room: TagRoom;
  isHost: boolean;
  onEndGame: () => void;
}

export default function GameTimer({ room, isHost, onEndGame }: Props) {
  const [remaining, setRemaining] = useState(room.timer_seconds);

  useEffect(() => {
    if (room.status !== 'playing' || !room.started_at) return;

    const update = () => {
      const elapsed = Math.floor((Date.now() - new Date(room.started_at!).getTime()) / 1000);
      const left = Math.max(0, room.timer_seconds - elapsed);
      setRemaining(left);
      if (left === 0 && isHost) {
        onEndGame();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [room.started_at, room.timer_seconds, room.status, isHost]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        <span className="font-mono text-3xl font-bold tabular-nums">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>
      {isHost && (
        <Button size="sm" variant="destructive" onClick={onEndGame} className="h-9 gap-1 text-sm">
          <Square className="w-3.5 h-3.5" /> 종료
        </Button>
      )}
    </div>
  );
}
