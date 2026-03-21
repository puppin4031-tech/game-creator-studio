import { ChevronUp, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloorSelectorProps {
  currentFloor: number;
  onFloorChange: (floor: number) => void;
}

export function FloorSelector({ currentFloor, onFloorChange }: FloorSelectorProps) {
  const label = currentFloor < 0 ? `B${Math.abs(currentFloor)}` : `${currentFloor}F`;

  return (
    <div className="fixed top-4 right-4 z-[1000] flex flex-col items-center gap-1 rounded-xl border border-border bg-card/90 p-1.5 backdrop-blur-lg shadow-lg">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => onFloorChange(currentFloor + 1)}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary font-bold text-sm min-w-[48px] justify-center">
        <Building2 className="h-3.5 w-3.5" />
        {label}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => onFloorChange(currentFloor - 1)}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
