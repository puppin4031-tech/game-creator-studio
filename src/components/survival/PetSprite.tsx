import { useSpriteAnimations } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';
import { BABY_ART, EGG_ART } from './DinoEggHatchModal';

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
  const { data } = useSpriteAnimations(`pet:${speciesId}`);
  const scale = data?.scale ?? 1;
  const scaledHeight = Math.round(height * scale);
  const sheet = attacking ? data?.attack ?? data?.idle : data?.idle;

  return sheet ? (
    <SpriteAnimator
      url={sheet.url}
      frames={sheet.frame_count}
      fps={sheet.fps}
      height={scaledHeight}
    />
  ) : (
    <img
      src={BABY_ART[speciesId] ?? EGG_ART}
      alt={name}
      width={scaledHeight}
      height={scaledHeight}
      style={{ width: scaledHeight, height: scaledHeight }}
      className="pixelated object-contain"
    />
  );
}
