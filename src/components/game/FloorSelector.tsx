import { ChevronUp, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloorSelectorProps {
  currentFloor: number;
  onFloorChange: (floor: number) => void;
}

export function FloorSelector({ currentFloor, onFloorChange }: FloorSelectorProps) {
  const label = currentFloor < 0 ? `B${Math.abs(currentFloor)}` : `${currentFloor}F`;

  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card/90 p-2 backdrop-blur-lg shadow-lg">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 text-muted-foreground hover:text-foreground"
        onClick={() => onFloorChange(currentFloor + 1)}
      >
        <ChevronUp className="!h-5 !w-5" />
      </Button>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-base min-w-[56px] justify-center">
        <Building2 className="!h-4 !w-4" />
        {label}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 text-muted-foreground hover:text-foreground"
        onClick={() => onFloorChange(currentFloor - 1)}
      >
        <ChevronDown className="!h-5 !w-5" />
      </Button>
    </div>
  );
}
