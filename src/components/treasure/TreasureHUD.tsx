import { TreasureItem } from '@/hooks/useTreasureHunt';

interface Props {
  myFound: TreasureItem[];
  total: number;
}

export default function TreasureHUD({ myFound, total }: Props) {
  return (
    <div className="flex items-center gap-2 bg-background/90 backdrop-blur px-3 py-1.5 rounded-full shadow text-sm">
      <span>🔑</span>
      <span className="font-bold">{myFound.length}/{total}</span>
      {myFound.length > 0 && (
        <span className="text-xs text-muted-foreground truncate max-w-[140px]">
          {myFound.map(t => t.keyword).join(', ')}
        </span>
      )}
    </div>
  );
}
