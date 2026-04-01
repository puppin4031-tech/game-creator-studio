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
    <div className="flex items-center gap-3 bg-background/90 backdrop-blur rounded-full px-4 py-2 shadow-lg border">
      <Clock className="w-4 h-4 text-primary" />
      <span className="font-mono text-lg font-bold tabular-nums">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      {isHost && (
        <Button size="sm" variant="destructive" onClick={onEndGame} className="h-7 gap-1">
          <Square className="w-3 h-3" /> 종료
        </Button>
      )}
    </div>
  );
}
