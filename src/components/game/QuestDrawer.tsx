import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Compass, MapPin } from 'lucide-react';
import type { DetectedSpot } from '@/hooks/useSpotDetection';

interface QuestDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detectedSpots: DetectedSpot[];
  currentFloor: number;
}

export function QuestDrawer({ open, onOpenChange, detectedSpots, currentFloor }: QuestDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            현재 퀘스트 · {currentFloor}층
          </DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-3 overflow-y-auto">
          {detectedSpots.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">이 층에서 탐색 가능한 스팟이 없습니다</p>
          ) : (
            detectedSpots.map(ds => (
              <div
                key={ds.spot.id}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  ds.isInRange 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-border bg-secondary/30'
                }`}
              >
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${
                  ds.isInRange ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{ds.spot.name}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(ds.distance)}m</span>
                  </div>
                  {ds.spot.hint_text && (
                    <p className="text-xs text-muted-foreground mt-1">{ds.spot.hint_text}</p>
                  )}
                  {ds.isInRange && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      탐색 가능!
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
