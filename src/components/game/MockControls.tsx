import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Navigation, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface MockControlsProps {
  onMove: (direction: 'north' | 'south' | 'east' | 'west') => void;
  isSimulated?: boolean;
  position?: { latitude: number; longitude: number };
  onStepChange?: (step: number) => void;
}

const STEPS = [
  { label: '1m', value: 0.00001 },
  { label: '5m', value: 0.00005 },
  { label: '11m', value: 0.0001 },
  { label: '50m', value: 0.0005 },
  { label: '100m', value: 0.001 },
];

export function MockControls({ onMove, isSimulated, position, onStepChange }: MockControlsProps) {
  const [stepIdx, setStepIdx] = useState(2); // default 11m
  const [collapsed, setCollapsed] = useState(false);

  const changeStep = (delta: number) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, stepIdx + delta));
    setStepIdx(next);
    onStepChange?.(STEPS[next].value);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 border border-border/60 text-xs text-muted-foreground backdrop-blur-sm shadow-lg"
      >
        <Navigation className="w-3.5 h-3.5 text-primary" />
        SIM
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card/90 border border-border/60 backdrop-blur-sm shadow-lg">
      {/* Header */}
      <button
        onClick={() => setCollapsed(true)}
        className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider"
      >
        <Navigation className="w-3 h-3 text-primary" />
        {isSimulated ? 'GPS 시뮬레이션' : 'Mock 이동'}
      </button>

      {/* D-pad */}
      <div className="grid grid-cols-3 gap-1">
        <div />
        <Button variant="outline" size="icon" className="h-9 w-9 bg-background/80" onClick={() => onMove('north')}>
          <ArrowUp className="!h-4 !w-4" />
        </Button>
        <div />
        <Button variant="outline" size="icon" className="h-9 w-9 bg-background/80" onClick={() => onMove('west')}>
          <ArrowLeft className="!h-4 !w-4" />
        </Button>
        <div className="h-9 w-9 flex items-center justify-center text-[10px] text-muted-foreground font-mono">
          {STEPS[stepIdx].label}
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9 bg-background/80" onClick={() => onMove('east')}>
          <ArrowRight className="!h-4 !w-4" />
        </Button>
        <div />
        <Button variant="outline" size="icon" className="h-9 w-9 bg-background/80" onClick={() => onMove('south')}>
          <ArrowDown className="!h-4 !w-4" />
        </Button>
        <div />
      </div>

      {/* Step control */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => changeStep(-1)} disabled={stepIdx === 0}>
          <Minus className="!h-3 !w-3" />
        </Button>
        <span className="text-[10px] text-muted-foreground">이동거리</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => changeStep(1)} disabled={stepIdx === STEPS.length - 1}>
          <Plus className="!h-3 !w-3" />
        </Button>
      </div>

      {/* Coordinates */}
      {position && (
        <div className="text-[9px] text-muted-foreground/70 font-mono text-center leading-tight">
          {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
        </div>
      )}
    </div>
  );
}
