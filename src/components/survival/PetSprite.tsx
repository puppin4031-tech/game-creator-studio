import { useSpriteAnimations } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';
import { BABY_ART, EGG_ART } from './DinoEggHatchModal';

export default function PetSprite({ speciesId, name, height = 48, attacking = false }: { speciesId: string; name: string; height?: number; attacking?: boolean }) {
  const { data } = useSpriteAnimations(`pet:${speciesId}`);
  const sheet = attacking ? data?.attack ?? data?.idle : data?.idle;
  return sheet ? <SpriteAnimator url={sheet.url} frames={sheet.frame_count} fps={sheet.fps} height={height} />
    : <img src={BABY_ART[speciesId] ?? EGG_ART} alt={name} width={height} height={height} className="pixelated object-contain" />;
}