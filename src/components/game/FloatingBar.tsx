import { Backpack, Compass, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingBarProps {
  onInventory: () => void;
  onQuest: () => void;
  onExplore: () => void;
  canExplore: boolean;
}

export function FloatingBar({ onInventory, onQuest, onExplore, canExplore }: FloatingBarProps) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card/90 p-3 backdrop-blur-lg shadow-lg">
      <Button
        variant="ghost"
        size="sm"
        className="flex flex-col items-center gap-1.5 h-auto py-3 px-6 text-muted-foreground hover:text-foreground"
        onClick={onInventory}
      >
        <Backpack className="!h-7 !w-7" />
        <span className="text-sm">가방</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="flex flex-col items-center gap-1.5 h-auto py-3 px-6 text-muted-foreground hover:text-foreground"
        onClick={onQuest}
      >
        <Compass className="!h-7 !w-7" />
        <span className="text-sm">퀘스트</span>
      </Button>
      <Button
        size="sm"
        className={`flex flex-col items-center gap-1.5 h-auto py-3 px-6 ${canExplore ? 'animate-pulse-glow bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        onClick={onExplore}
        disabled={!canExplore}
      >
        <ScanSearch className="!h-7 !w-7" />
        <span className="text-sm">탐색</span>
      </Button>
    </div>
  );
}
