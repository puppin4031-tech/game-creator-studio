import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, RotateCcw, Search } from 'lucide-react';

export const DEFAULT_ZOOM = 17.5;

interface Props {
  onZoomBy: (delta: number) => void;
  onReset: () => void;
}

/** Magnifier button that opens zoom in / out / reset controls. */
export default function MapZoomControl({ onZoomBy, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const btn = 'pixel-btn flex h-11 w-11 items-center justify-center bg-card';
  return (
    <div className="absolute bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+2rem)] right-2 z-20 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="pixel-frame flex flex-col gap-2 bg-card p-1.5">
            <button type="button" aria-label="확대" className={btn} onClick={() => onZoomBy(0.8)}><Plus className="!h-6 !w-6" /></button>
            <button type="button" aria-label="축소" className={btn} onClick={() => onZoomBy(-0.8)}><Minus className="!h-6 !w-6" /></button>
            <button type="button" aria-label="기본 배율로" className={btn} onClick={onReset}><RotateCcw className="!h-6 !w-6" /></button>
          </motion.div>
        )}
      </AnimatePresence>
      <button type="button" aria-label="지도 배율 조절" aria-expanded={open} onClick={() => setOpen(o => !o)}
        className={`${btn} ${open ? '!bg-primary text-primary-foreground' : ''}`}>
        <Search className="!h-6 !w-6" />
      </button>
    </div>
  );
}
