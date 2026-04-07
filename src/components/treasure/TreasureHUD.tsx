import { TeamScores } from '@/hooks/useTreasureHunt';

interface Props {
  teamScores: TeamScores;
  team1Name: string;
  team2Name: string;
  hasKey: boolean;
}

export default function TreasureHUD({ teamScores, team1Name, team2Name, hasKey }: Props) {
  return (
    <div className="flex items-center gap-2 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full shadow text-sm">
      <span className="text-blue-500 font-bold">{team1Name}: {teamScores.team1}점</span>
      <span className="text-muted-foreground">|</span>
      <span className="text-red-500 font-bold">{team2Name}: {teamScores.team2}점</span>
      {hasKey && <span title="열쇠 보유">🔑</span>}
    </div>
  );
}
