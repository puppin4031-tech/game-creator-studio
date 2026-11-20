import { useSpriteAnimations, type SpriteAction } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';
import { heroSpriteKey } from '@/lib/survival/heroTier';
import charHunterImg from '@/assets/survival/char-hunter.png';

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
  const { data: tierRemote } = useSpriteAnimations(tierKey);
  const { data: baseRemote } = useSpriteAnimations('hunter');

  // Exact action priority: tier action -> base hunter action -> tier idle -> base hunter idle
  const anim =
    tierRemote?.[action] ??
    baseRemote?.[action] ??
    tierRemote?.idle ??
    baseRemote?.idle;

  // Scale ratio configured from /admin/sprite studio
  const currentScale = tierRemote?.scale ?? baseRemote?.scale ?? 1.0;
  const scaledHeight = Math.round(height * currentScale);

  // Fallback to high-quality authentic Hunter sprite (NOT tribe mercenary)
  const fallback = (
    <img
      src={charHunterImg}
      alt="Hunter"
      className={`pixelated object-contain shrink-0 ${className}`}
      style={{ height: scaledHeight }}
    />
  );

  return (
    <div
      className={`flex shrink-0 items-end justify-center ${className}`}
      data-character-sprite={action}
    >
      {anim ? (
        <SpriteAnimator
          key={`${anim.action}-${anim.url}`}
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
      ) : (
        fallback
      )}
    </div>
  );
}
