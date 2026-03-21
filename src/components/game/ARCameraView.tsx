import { useEffect } from 'react';
import { X, QrCode, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/hooks/useCamera';
import type { DetectedSpot } from '@/hooks/useSpotDetection';

interface ARCameraViewProps {
  nearbySpots: DetectedSpot[];
  onClose: () => void;
  onCollectItem: (spot: DetectedSpot) => void;
  onQRScan: () => void;
}

export function ARCameraView({ nearbySpots, onClose, onCollectItem, onQRScan }: ARCameraViewProps) {
  const { videoRef, isActive, error, startCamera, stopCamera } = useCamera();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return (
    <div className="fixed inset-0 z-[2000] bg-black">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* AR Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scan lines effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent animate-pulse" />

        {/* Floating AR items */}
        {nearbySpots.filter(s => s.isInRange).map((ds, i) => (
          <div
            key={ds.spot.id}
            className="absolute pointer-events-auto animate-item-acquire"
            style={{
              top: `${25 + i * 20}%`,
              left: `${30 + (i % 3) * 20}%`,
            }}
          >
            <div className="flex flex-col items-center gap-1 animate-bounce">
              <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center border-2 border-white shadow-lg">
                <Package className="h-7 w-7 text-accent-foreground" />
              </div>
              <span className="text-xs font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">
                {ds.spot.item_name}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start z-10">
        <Button
          variant="outline"
          size="icon"
          className="bg-black/50 border-white/20 text-white rounded-full"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="bg-black/50 border-white/20 text-white rounded-full gap-1"
          onClick={onQRScan}
        >
          <QrCode className="h-4 w-4" />
          QR 스캔
        </Button>
      </div>

      {/* Bottom collect buttons */}
      <div className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-3 z-10">
        {error && (
          <div className="text-sm text-white bg-destructive/80 px-3 py-1 rounded-full">
            {error} — 시뮬레이션 모드
          </div>
        )}
        {nearbySpots.filter(s => s.isInRange).map(ds => (
          <Button
            key={ds.spot.id}
            className="bg-accent text-accent-foreground font-bold rounded-full px-6 shadow-lg"
            onClick={() => onCollectItem(ds)}
          >
            <Package className="h-4 w-4 mr-2" />
            {ds.spot.item_name} 획득!
          </Button>
        ))}
        {nearbySpots.filter(s => s.isInRange).length === 0 && (
          <p className="text-white/60 text-sm">범위 내에 아이템이 없습니다</p>
        )}
      </div>
    </div>
  );
}
