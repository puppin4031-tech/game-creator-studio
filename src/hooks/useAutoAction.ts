import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorldEntity } from '@/lib/survival/types';

export const AUTO_ACTION_INTERVAL_MS = 950;
export interface AutoJob { id: string; label: string }

/**
 * Repeats one interaction automatically until the target is finished,
 * the player cancels, moves out of reach, or `shouldStop` says so.
 * Completed hits are kept; stopping never rolls back progress.
 */
export function useAutoAction(step: (e: WorldEntity) => 'continue' | 'stop') {
  const [job, setJob] = useState<AutoJob | null>(null);
  const timer = useRef<number>();
  const stepRef = useRef(step); stepRef.current = step;
  const stop = useCallback(() => { window.clearInterval(timer.current); timer.current = undefined; setJob(null); }, []);
  const start = useCallback((e: WorldEntity, label: string) => {
    window.clearInterval(timer.current);
    setJob({ id: e.id, label });
    if (stepRef.current(e) === 'stop') { setJob(null); return; }
    timer.current = window.setInterval(() => { if (stepRef.current(e) === 'stop') stop(); }, AUTO_ACTION_INTERVAL_MS);
  }, [stop]);
  useEffect(() => () => window.clearInterval(timer.current), []);
  return { job, start, stop };
}
