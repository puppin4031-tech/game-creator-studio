import { useSpriteAnimations } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';
import { getBuiltinMobSprite } from '@/utils/mobSpriteFactory';

/** Creature renderer: admin-uploaded idle/attack sheets keyed by creature type with custom scale ratio, falling back to the built-in 4-frame animated mob sprite, and finally to the static pixel sprite. */
export default function CreatureSprite({
  type,
  fallbackUrl,
  width,
  height,
  attacking = false,
}: {
  type: string;
  fallbackUrl?: string;
  width: number;
  height: number;
  attacking?: boolean;
}) {
  const { data } = useSpriteAnimations(`mob:${type}`);
  const scale = data?.scale ?? 1;
  const scaledWidth = Math.round(width * scale);
  const scaledHeight = Math.round(height * scale);

  // 1. Check custom uploaded sprite first
  const customAnim = (attacking ? data?.attack : undefined) ?? data?.idle;

  // 2. Fall back to built-in 4-frame sprite generator
  let builtinAnim = null;
  try {
    builtinAnim = getBuiltinMobSprite(type, attacking ? 'attack' : 'idle');
  } catch {
    builtinAnim = null;
  }

  const effectiveFallbackUrl = fallbackUrl || builtinAnim?.url;

  const img = effectiveFallbackUrl ? (
    <img
      src={effectiveFallbackUrl}
      width={scaledWidth}
      height={scaledHeight}
      alt=""
      draggable={false}
      className="pixelated select-none"
      style={{ width: scaledWidth, height: scaledHeight }}
    />
  ) : null;

  if (customAnim) {
    return (
      <div data-creature-sprite={attacking && data?.attack ? 'attack' : 'idle'}>
        <SpriteAnimator
          key={customAnim.action}
          url={customAnim.url}
          frames={customAnim.frame_count}
          fps={customAnim.fps}
          height={scaledHeight}
          once={customAnim.action === 'attack'}
          fallback={img}
        />
      </div>
    );
  }

  if (builtinAnim) {
    return (
      <div data-creature-sprite={builtinAnim.action}>
        <SpriteAnimator
          key={`builtin-${type}-${builtinAnim.action}`}
          url={builtinAnim.url}
          frames={builtinAnim.frames}
          fps={builtinAnim.fps}
          height={scaledHeight}
          once={builtinAnim.action === 'attack'}
          fallback={img}
        />
      </div>
    );
  }

  return img;
}
