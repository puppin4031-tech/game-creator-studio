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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-2 rounded-2xl border border-border bg-card/90 p-2 backdrop-blur-lg shadow-lg">
      <Button
        variant="ghost"
        size="sm"
        className="flex flex-col items-center gap-1 h-auto py-2 px-4 text-muted-foreground hover:text-foreground"
        onClick={onInventory}
      >
        <Backpack className="h-5 w-5" />
        <span className="text-[10px]">가방</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="flex flex-col items-center gap-1 h-auto py-2 px-4 text-muted-foreground hover:text-foreground"
        onClick={onQuest}
      >
        <Compass className="h-5 w-5" />
        <span className="text-[10px]">퀘스트</span>
      </Button>
      <Button
        size="sm"
        className={`flex flex-col items-center gap-1 h-auto py-2 px-4 ${canExplore ? 'animate-pulse-glow bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        onClick={onExplore}
        disabled={!canExplore}
      >
        <ScanSearch className="h-5 w-5" />
        <span className="text-[10px]">탐색</span>
      </Button>
    </div>
  );
}
