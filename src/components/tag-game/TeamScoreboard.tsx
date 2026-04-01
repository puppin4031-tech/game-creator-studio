import { TagRoom, TagPlayer } from '@/hooks/useTagRoom';

interface Props {
  room: TagRoom;
  players: TagPlayer[];
}

export default function TeamScoreboard({ room, players }: Props) {
  const team1 = players.filter(p => p.team === 1);
  const team2 = players.filter(p => p.team === 2);
  const team1Alive = team1.filter(p => !p.is_caught).length;
  const team2Alive = team2.filter(p => !p.is_caught).length;

  return (
    <div className="flex gap-2 text-sm font-medium">
      <div className="bg-blue-500/20 text-blue-700 px-4 py-1.5 rounded-full">
        {room.team1_name}: {team1Alive}/{team1.length}
      </div>
      <div className="bg-red-500/20 text-red-700 px-4 py-1.5 rounded-full">
        {room.team2_name}: {team2Alive}/{team2.length}
      </div>
    </div>
  );
}
