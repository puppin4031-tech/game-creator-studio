import { useSpriteAnimations, type SpriteAction } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';

export default function CharacterSprite({
  height = 64,
  action = 'idle',
  className = '',
}: {
  height?: number;
  action?: SpriteAction;
  level?: number;
  className?: string;
}) {
  const { data: remote } = useSpriteAnimations('hunter');
  const anim = remote?.[action] ?? remote?.idle;

  return (
    <div className={`flex shrink-0 items-end justify-center ${className}`} data-character-sprite={action}>
      {anim ? (
        <SpriteAnimator
          key={`${anim.action}-${anim.url}`}
          url={anim.url}
          frames={anim.frame_count}
          fps={anim.fps}
          height={height}
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
        <div
          className="flex items-center justify-center rounded-lg bg-primary/20 border border-primary/40 text-xs font-bold text-primary select-none drop-shadow"
          style={{ width: Math.round(height * 0.72), height }}
        >
          {action === 'poop'
            ? '💩'
            : action === 'pick_nose'
            ? '👃'
            : action === 'celebrate'
            ? '🎉'
            : action === 'attack'
            ? '⚔️'
            : action === 'chop'
            ? '🪓'
            : action === 'gather'
            ? '⛏️'
            : action === 'walk'
            ? '🚶'
            : action === 'hurt'
            ? '💥'
            : '🧍'}
        </div>
      )}
    </div>
  );
}
