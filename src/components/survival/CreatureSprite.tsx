import { useSpriteAnimations } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';
import { getBuiltinMobSprite } from '@/utils/mobSpriteFactory';
import { resolveMobSpriteKeys } from '@/data/spriteRegistry';

/**
 * Unified Creature & Boss (`우두머리`) Sprite Renderer
 *
 * - Normalizes any creature type (`wolf`, `mob-wolf`, `boss_direwolf`, `boss_mammoth`)
 *   via `resolveMobSpriteKeys` from `src/data/spriteRegistry.ts`.
 * - Checks the specific custom key first (`mob:boss_direwolf`), then automatically falls back
 *   to the base species custom key (`mob:wolf`) if the boss doesn't have a separate upload,
 *   and finally falls back to the built-in 4-frame procedural sprite sheet (`getBuiltinMobSprite`).
 * - NEVER renders an unclipped `<img />` of a multi-frame sprite sheet! All rendering goes through
 *   the single-frame clipped `SpriteAnimator`.
 */
export default function CreatureSprite({
  type,
  fallbackUrl,
  width = 48,
  height = 48,
  attacking = false,
  className = '',
}: {
  type: string;
  fallbackUrl?: string;
  width?: number;
  height?: number;
  attacking?: boolean;
  className?: string;
}) {
  const { canonicalKey, speciesId, fallbackKey, fallbackSpeciesId } = resolveMobSpriteKeys(type);

  const { data: primaryData } = useSpriteAnimations(canonicalKey);
  const { data: baseSpeciesData } = useSpriteAnimations(fallbackKey || canonicalKey);

  // Prefer custom DB/local sprite on canonical key (e.g. mob:boss_direwolf),
  // otherwise use custom DB/local sprite on base species (e.g. mob:wolf)
  const hasPrimaryCustom = !!(primaryData?.idle?.url || primaryData?.attack?.url || primaryData?.walk?.url);
  const activeData = hasPrimaryCustom ? primaryData : (fallbackKey ? baseSpeciesData : primaryData);

  const customScale = activeData?.scale ?? primaryData?.scale ?? 1;
  const scaledHeight = Math.round(height * customScale);

  const customAnim = attacking
    ? activeData?.attack ?? activeData?.idle ?? activeData?.walk
    : activeData?.idle ?? activeData?.walk ?? activeData?.attack;

  // Built-in 4-frame procedural pixel-art animation fallback
  const builtinAnim = getBuiltinMobSprite(speciesId || fallbackSpeciesId || 'boar', attacking ? 'attack' : 'idle');

  // Built-in fallback is ALSO a 4-frame SpriteAnimator (never a raw unclipped <img>!)
  const clippedBuiltinFallback = builtinAnim ? (
    <SpriteAnimator
      url={builtinAnim.url}
      frames={builtinAnim.frames}
      fps={builtinAnim.fps}
      height={scaledHeight}
      className={className}
    />
  ) : fallbackUrl ? (
    <SpriteAnimator
      url={fallbackUrl}
      frames={1}
      fps={6}
      height={scaledHeight}
      className={className}
    />
  ) : null;

  // 1. Custom Admin / Supabase / IndexedDB Sprite Animation
  if (customAnim?.url) {
    const isSingleFrame = (customAnim.frame_count ?? 1) <= 1;
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
          url={customAnim.url}
          frames={customAnim.frame_count}
          fps={customAnim.fps}
          height={scaledHeight}
          className={className}
          fallback={clippedBuiltinFallback}
        />
      </div>
    );
  }

  // 2. Built-in 4-Frame Procedural Pixel-Art Sprite Sheet (always 1-frame clipped)
  if (clippedBuiltinFallback) {
    return (
      <div className="inline-flex items-center justify-center">
        {clippedBuiltinFallback}
      </div>
    );
  }

  return null;
}
