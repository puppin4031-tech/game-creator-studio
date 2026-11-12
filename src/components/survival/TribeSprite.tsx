import { useEffect, useState } from 'react';
import { useSpriteAnimations, type SpriteAction } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';
import idle from '@/assets/survival/tribe-idle.png';
import walk1 from '@/assets/survival/tribe-walk1.png';
import walk2 from '@/assets/survival/tribe-walk2.png';
import attack from '@/assets/survival/tribe-attack.png';
import gather from '@/assets/survival/tribe-gather.png';
import hurt from '@/assets/survival/tribe-hurt.png';
import dodge from '@/assets/survival/tribe-dodge.png';

export default function TribeSprite({ action = 'idle', height = 48, reaction }: { action?: SpriteAction; height?: number; reaction?: 'hurt' | 'dodge' | null }) {
  const { data: sheets } = useSpriteAnimations('tribe');
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (action !== 'walk') return;
    const timer = window.setInterval(() => setFrame(f => 1 - f), 280);
    return () => window.clearInterval(timer);
  }, [action]);
  const src = reaction === 'hurt' ? hurt : reaction === 'dodge' ? dodge : action === 'walk' ? (frame ? walk2 : walk1) : action === 'attack' ? attack : action === 'gather' || action === 'chop' ? gather : idle;
  const fallback = <img src={src} alt="" className="pixelated w-auto object-contain" style={{ height }} />;
  const key: SpriteAction = action === 'chop' ? 'gather' : action;
  // Fall back to the bundled art for this action rather than the idle sheet, so walking/gathering never freezes.
  const sheet = sheets?.[key] ?? (sheets && !['walk', 'gather', 'attack'].includes(key) ? sheets.idle : undefined);
  return <span data-tribe-sprite={reaction ?? action} className="inline-flex shrink-0 items-end">
    {!reaction && sheet ? <SpriteAnimator url={sheet.url} frames={sheet.frame_count} fps={sheet.fps} height={height} fallback={fallback} /> : fallback}
  </span>;
}