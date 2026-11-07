import idleSheet from '@/assets/survival/hunter-idle.png.asset.json';
import { useSpriteAnimations, type SpriteAction } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';

/** All character surfaces share the current idle sheet, including guests and failed remote loads. */
export default function CharacterSprite({ height = 64, action = 'idle', className = '' }: {
  height?: number;
  action?: SpriteAction;
  className?: string;
}) {
  const { data: animations } = useSpriteAnimations('hunter');
  const idle = <SpriteAnimator url={idleSheet.url} frames={4} fps={5} height={height} />;
  const animation = animations?.[action] ?? (action === 'chop' ? animations?.attack : undefined) ?? animations?.idle;
  return (
    <div className={`flex shrink-0 items-end justify-center ${className}`} data-character-sprite={action}>
      {animation ? (
        <SpriteAnimator
          url={animation.url}
          frames={animation.frame_count}
          fps={animation.fps}
          height={height}
          once={action === 'gather' || action === 'attack' || action === 'chop'}
          fallback={idle}
        />
      ) : idle}
    </div>
  );
}