import { TagRoom, TagPlayer } from '@/hooks/useTagRoom';

interface Props {
  room: TagRoom;
  players: TagPlayer[];
}

export function Team1Score({ room, players }: Props) {
  const team1 = players.filter(p => p.team === 1);
  const team1Alive = team1.filter(p => !p.is_caught).length;

  return (
    <div className="bg-blue-500/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-xl text-base font-bold whitespace-nowrap">
      {room.team1_name}: {team1Alive}/{team1.length}
    </div>
  );
}

export function Team2Score({ room, players }: Props) {
  const team2 = players.filter(p => p.team === 2);
  const team2Alive = team2.filter(p => !p.is_caught).length;

  return (
    <div className="bg-red-500/20 text-red-700 dark:text-red-300 px-4 py-2 rounded-xl text-base font-bold whitespace-nowrap">
      {room.team2_name}: {team2Alive}/{team2.length}
    </div>
  );
}

export default function TeamScoreboard({ room, players }: Props) {
  return (
    <div className="flex gap-2">
      <Team1Score room={room} players={players} />
      <Team2Score room={room} players={players} />
    </div>
  );
}
