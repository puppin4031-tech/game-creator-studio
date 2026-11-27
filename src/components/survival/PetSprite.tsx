import { useSpriteAnimations } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';
import { resolvePetSpriteKeys } from '@/data/spriteRegistry';
import eggImg from '@/assets/survival/item-dino-egg.png';

/**
 * Renders a dinosaur pet sprite using custom animations uploaded via Admin -> Sprites (`pet:${speciesId}`),
 * or falls back to the canonical species key via `resolvePetSpriteKeys` from `src/data/spriteRegistry.ts`.
 */
export default function PetSprite({
  speciesId,
  name,
  height = 36,
  attacking = false,
  className = '',
}: {
  speciesId: string;
  name?: string;
  height?: number;
  attacking?: boolean;
  className?: string;
}) {
  const { primaryKey, canonicalKey } = resolvePetSpriteKeys(speciesId);
  const { data: primaryData, isLoading: primaryLoading } = useSpriteAnimations(primaryKey);
  const { data: canonicalData, isLoading: canonicalLoading } = useSpriteAnimations(canonicalKey);

  const data =
    primaryData && (primaryData.idle || primaryData.attack || primaryData.walk)
      ? primaryData
      : canonicalData;
  const isLoading = primaryLoading || canonicalLoading;

  const customScale = data?.scale ?? primaryData?.scale ?? canonicalData?.scale ?? 1;
  const scaledHeight = Math.round(height * customScale);

  const anim = attacking
    ? data?.attack ?? data?.walk ?? data?.idle
    : data?.walk ?? data?.idle ?? data?.attack;

  const fallback = (
    <img
      src={eggImg}
      alt={name ?? speciesId}
      style={{ height: scaledHeight, width: 'auto' }}
      className={`pixelated select-none ${className}`}
    />
  );

  if (anim?.url) {
    const isSingleFrame = (anim.frame_count ?? 1) <= 1;
    const bounceStyle = isSingleFrame
      ? {
          animation: attacking
            ? 'mobSingleAttack 0.35s ease-in-out infinite alternate'
            : 'mobSingleIdle 1.1s ease-in-out infinite alternate',
        }
      : undefined;

    return (
      <div className="inline-flex items-center justify-center" style={bounceStyle}>
        <SpriteAnimator
          url={anim.url}
          frames={anim.frame_count}
          fps={anim.fps}
          height={scaledHeight}
          className={className}
          fallback={fallback}
        />
      </div>
    );
  }

  if (isLoading) {
    return <div style={{ width: scaledHeight, height: scaledHeight }} className={`inline-block ${className}`} />;
  }

  return fallback;
}
