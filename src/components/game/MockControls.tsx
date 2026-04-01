import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MockControlsProps {
  onMove: (direction: 'north' | 'south' | 'east' | 'west') => void;
}

export function MockControls({ onMove }: MockControlsProps) {
  return (
    <div className="grid grid-cols-3 gap-1 opacity-50 hover:opacity-100 transition-opacity">
      <div />
      <Button variant="outline" size="icon" className="h-9 w-9 bg-card/80" onClick={() => onMove('north')}>
        <ArrowUp className="!h-4 !w-4" />
      </Button>
      <div />
      <Button variant="outline" size="icon" className="h-9 w-9 bg-card/80" onClick={() => onMove('west')}>
        <ArrowLeft className="!h-4 !w-4" />
      </Button>
      <div className="h-9 w-9" />
      <Button variant="outline" size="icon" className="h-9 w-9 bg-card/80" onClick={() => onMove('east')}>
        <ArrowRight className="!h-4 !w-4" />
      </Button>
      <div />
      <Button variant="outline" size="icon" className="h-9 w-9 bg-card/80" onClick={() => onMove('south')}>
        <ArrowDown className="!h-4 !w-4" />
      </Button>
      <div />
    </div>
  );
}
