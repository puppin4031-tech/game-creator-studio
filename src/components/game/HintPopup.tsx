import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QrCode } from 'lucide-react';

interface HintPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  hint: string;
  floor: number;
}

export function HintPopup({ open, onOpenChange, title, hint, floor }: HintPopupProps) {
  const floorLabel = floor < 0 ? `B${Math.abs(floor)}` : `${floor}층`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-primary/30 bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <QrCode className="h-5 w-5" />
            QR 힌트 — {floorLabel}
          </DialogTitle>
          <DialogDescription className="text-foreground font-medium">{title}</DialogDescription>
        </DialogHeader>
        <div className="p-4 rounded-lg bg-secondary/50 border border-border">
          <p className="text-sm leading-relaxed">{hint}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
