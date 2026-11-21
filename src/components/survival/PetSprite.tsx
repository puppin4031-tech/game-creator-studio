import { useSpriteAnimations } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';
import { BABY_ART, EGG_ART } from './DinoEggHatchModal';
import { fusionSpecies } from '@/lib/survival/pets';

export default function PetSprite({
  speciesId,
  name,
  height = 48,
  attacking = false,
}: {
  speciesId: string;
  name: string;
  height?: number;
  attacking?: boolean;
}) {
  const canonicalId = fusionSpecies(speciesId);
  const { data: primaryData, isLoading: primaryLoading } = useSpriteAnimations(`pet:${speciesId}`);
  const { data: canonicalData, isLoading: canonicalLoading } = useSpriteAnimations(`pet:${canonicalId}`);
  const data = (primaryData?.idle || primaryData?.attack || primaryData?.walk) ? primaryData : canonicalData;
  const scale = data?.scale ?? primaryData?.scale ?? 1;
  const scaledHeight = Math.round(height * scale);
  const sheet = attacking
    ? (data?.attack ?? data?.idle ?? data?.walk)
    : (data?.idle ?? data?.walk ?? data?.attack);

  const fallback = (
    <img
      src={BABY_ART[speciesId] ?? BABY_ART[canonicalId] ?? EGG_ART}
      alt={name}
      width={scaledHeight}
      height={scaledHeight}
      style={{ width: scaledHeight, height: scaledHeight }}
      className="pixelated object-contain"
    />
  );

  return sheet ? (
    <SpriteAnimator
      url={sheet.url}
      frames={sheet.frame_count}
      fps={sheet.fps}
      height={scaledHeight}
      fallback={fallback}
    />
  ) : (primaryLoading || canonicalLoading) ? (
    <div aria-hidden style={{ width: scaledHeight, height: scaledHeight }} />
  ) : (
    fallback
  );
}
