import { useEffect, useState } from 'react';
import { useSpriteAnimations, type SpriteAction } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';
import { heroSpriteKey } from '@/lib/survival/heroTier';
import idle from '@/assets/survival/tribe-idle.png';
import walk1 from '@/assets/survival/tribe-walk1.png';
import walk2 from '@/assets/survival/tribe-walk2.png';
import attack from '@/assets/survival/tribe-attack.png';
import gather from '@/assets/survival/tribe-gather.png';

const WALK_FRAMES = [walk1, idle, walk2, idle];
const ATTACK_FRAMES = [walk1, attack, walk2, attack];
const GATHER_FRAMES = [gather, walk1, gather, walk2];
const CHOP_FRAMES = [attack, walk1, attack, idle];

export default function CharacterSprite({
  height = 64,
  action = 'idle',
  level = 1,
  className = '',
}: {
  height?: number;
  action?: SpriteAction;
  level?: number;
  className?: string;
}) {
  const tierKey = heroSpriteKey(level);
  const isCustomTier = tierKey !== 'hunter';
  const { data: baseRemote, isLoading: baseLoading } = useSpriteAnimations('hunter');
  const { data: tierRemote, isLoading: tierLoading } = useSpriteAnimations(isCustomTier ? tierKey : 'hunter');
  const [frame, setFrame] = useState(0);

  // Exact action priority: tier action -> base hunter action -> intelligent action fallbacks -> idle -> walk
  const anim =
    tierRemote?.[action] ??
    baseRemote?.[action] ??
    (action === 'chop' ? (tierRemote?.attack ?? baseRemote?.attack ?? tierRemote?.gather ?? baseRemote?.gather) : undefined) ??
    (action === 'gather' ? (tierRemote?.chop ?? baseRemote?.chop ?? tierRemote?.walk ?? baseRemote?.walk) : undefined) ??
    tierRemote?.idle ??
    baseRemote?.idle ??
    tierRemote?.walk ??
    baseRemote?.walk ??
    tierRemote?.gather ??
    baseRemote?.gather ??
    tierRemote?.attack ??
    baseRemote?.attack;

  // Scale ratio configured from /admin/sprite studio
  const currentScale = tierRemote?.scale ?? baseRemote?.scale ?? 1.0;
  const scaledHeight = Math.round(height * currentScale);

  // Dynamic 4-frame animation loop for local fallback (never freeze on dead static pixel drawing)
  useEffect(() => {
    const interval =
      action === 'attack' ? 140 :
      action === 'chop' ? 180 :
      action === 'gather' ? 170 :
      action === 'walk' ? 190 : 250;
    const timer = window.setInterval(() => setFrame(f => (f + 1) % 4), interval);
    return () => window.clearInterval(timer);
  }, [action]);

  const activeFrame = frame % 4;
  const localSrc =
    action === 'attack' ? ATTACK_FRAMES[activeFrame] :
    action === 'chop' ? CHOP_FRAMES[activeFrame] :
    action === 'gather' ? GATHER_FRAMES[activeFrame] :
    action === 'idle' ? idle :
    WALK_FRAMES[activeFrame];

  // Hero tier visual aura / differentiation
  const heroTierFilter =
    level >= 8 ? 'contrast(1.15) brightness(1.08) drop-shadow(0 0 2px rgba(234,179,8,0.7))' :
    level >= 5 ? 'contrast(1.1) brightness(1.05) drop-shadow(0 0 1px rgba(56,189,248,0.6))' :
    'contrast(1.05) brightness(1.02)';

  const fallback = (
    <img
      src={localSrc}
      alt="Hunter"
      className={`pixelated object-contain shrink-0 transition-transform duration-75 ${className}`}
      style={{
        height: scaledHeight,
        filter: heroTierFilter,
      }}
    />
  );

  return (
    <div
      className={`flex shrink-0 items-end justify-center ${className}`}
      data-character-sprite={action}
    >
      {anim ? (
        <SpriteAnimator
          url={anim.url}
          frames={anim.frame_count}
          fps={anim.fps}
          height={scaledHeight}
          fallback={fallback}
          once={
            action === 'gather' ||
            action === 'attack' ||
            action === 'chop' ||
            action === 'celebrate' ||
            action === 'poop' ||
            action === 'pick_nose' ||
            action === 'hurt'
          }
        />
      ) : (baseLoading || tierLoading) ? (
        <div aria-hidden style={{ width: Math.round(scaledHeight * 0.85), height: scaledHeight }} />
      ) : (
        fallback
      )}
    </div>
  );
}
