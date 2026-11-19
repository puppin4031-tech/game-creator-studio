import { useSpriteAnimations, type SpriteAction } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';
import TribeSprite from './TribeSprite';
import { heroSpriteKey } from '@/lib/survival/heroTier';

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

  const anim =
    tierRemote?.[action] ??
    tierRemote?.idle ??
    baseRemote?.[action] ??
    baseRemote?.idle;

  // Fallback to high-quality bundled TribeSprite when remote sheet is not yet loaded or missing
  const fallback = (
    <TribeSprite
      action={action}
      height={height}
      className={className}
      showBadge={false}
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
          height={height}
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
