import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MockControlsProps {
  onMove: (direction: 'north' | 'south' | 'east' | 'west') => void;
}

export function MockControls({ onMove }: MockControlsProps) {
  return (
    <div className="fixed bottom-24 right-3 z-[1000] grid grid-cols-3 gap-0.5 opacity-50 hover:opacity-100 transition-opacity">
      <div />
      <Button variant="outline" size="icon" className="h-7 w-7 bg-card/80" onClick={() => onMove('north')}>
        <ArrowUp className="h-3 w-3" />
      </Button>
      <div />
      <Button variant="outline" size="icon" className="h-7 w-7 bg-card/80" onClick={() => onMove('west')}>
        <ArrowLeft className="h-3 w-3" />
      </Button>
      <div className="h-7 w-7" />
      <Button variant="outline" size="icon" className="h-7 w-7 bg-card/80" onClick={() => onMove('east')}>
        <ArrowRight className="h-3 w-3" />
      </Button>
      <div />
      <Button variant="outline" size="icon" className="h-7 w-7 bg-card/80" onClick={() => onMove('south')}>
        <ArrowDown className="h-3 w-3" />
      </Button>
      <div />
    </div>
  );
}
