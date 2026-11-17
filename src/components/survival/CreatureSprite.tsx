import { useSpriteAnimations } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';

/** Creature renderer: admin-uploaded idle/attack sheets keyed by creature type with custom scale ratio, falling back to the static pixel sprite. */
export default function CreatureSprite({
  type,
  fallbackUrl,
  width,
  height,
  attacking = false,
}: {
  type: string;
  fallbackUrl: string;
  width: number;
  height: number;
  attacking?: boolean;
}) {
  const { data } = useSpriteAnimations(`mob:${type}`);
  const scale = data?.scale ?? 1;
  const scaledWidth = Math.round(width * scale);
  const scaledHeight = Math.round(height * scale);

  const img = (
    <img
      src={fallbackUrl}
      width={scaledWidth}
      height={scaledHeight}
      alt=""
      draggable={false}
      className="pixelated select-none"
      style={{ width: scaledWidth, height: scaledHeight }}
    />
  );
  const anim = (attacking ? data?.attack : undefined) ?? data?.idle;
  if (!anim) return img;
  return (
    <div data-creature-sprite={attacking && data?.attack ? 'attack' : 'idle'}>
      <SpriteAnimator
        key={anim.action}
        url={anim.url}
        frames={anim.frame_count}
        fps={anim.fps}
        height={scaledHeight}
        once={anim.action === 'attack'}
        fallback={img}
      />
    </div>
  );
}
