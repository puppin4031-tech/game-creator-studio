import { Package } from 'lucide-react';

interface ItemAcquiredToastProps {
  itemName: string;
  visible: boolean;
}

export function ItemAcquiredToast({ itemName, visible }: ItemAcquiredToastProps) {
  if (!visible) return null;

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[3000] flex flex-col items-center gap-3 animate-item-acquire">
      <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center shadow-2xl border-4 border-white">
        <Package className="h-10 w-10 text-accent-foreground" />
      </div>
      <div className="bg-card/95 backdrop-blur px-4 py-2 rounded-full border border-accent/50 shadow-lg">
        <span className="text-sm font-bold text-accent">{itemName} 획득!</span>
      </div>
      {/* Particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-accent animate-float-up"
          style={{
            left: `${40 + Math.random() * 20}%`,
            top: `${30 + Math.random() * 20}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
