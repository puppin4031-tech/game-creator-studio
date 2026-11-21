import { useEffect, useState } from 'react';
import { useSpriteAnimations, type SpriteAction } from '@/hooks/useSpriteAnimations';
import SpriteAnimator from './SpriteAnimator';
import { getTribeClass, type TribeClassId } from '@/data/tribeClasses';
import idle from '@/assets/survival/tribe-idle.png';
import walk1 from '@/assets/survival/tribe-walk1.png';
import walk2 from '@/assets/survival/tribe-walk2.png';
import attack from '@/assets/survival/tribe-attack.png';
import gather from '@/assets/survival/tribe-gather.png';

const WALK_FRAMES = [walk1, idle, walk2, idle];
const RAPID_ATTACK_FRAMES = [walk1, attack, walk2, attack];
const GATHER_FRAMES = [gather, walk1, gather, walk2];
const CHOP_FRAMES = [attack, walk1, attack, idle];

const MEMBER_VARIATION_FILTERS = [
  '', // Slot 0 (Ambacho / default)
  'hue-rotate(-12deg) saturate(1.18) brightness(1.02)', // Slot 1: warm bronze warrior
  'hue-rotate(24deg) saturate(1.12) brightness(0.98)',   // Slot 2: jungle scout
  'brightness(0.92) contrast(1.14) saturate(1.08)',     // Slot 3: shadow stalker
  'sepia(0.22) saturate(1.25) brightness(1.04)',        // Slot 4: sun-baked desert
  'hue-rotate(42deg) saturate(1.15) brightness(1.0)',   // Slot 5: emerald hunter
];

export default function TribeSprite({
  action = 'walk',
  height = 48,
  tribeClass,
  showBadge = true,
  frameOffset = 0,
  memberIndex,
  speedMult = 1,
  customFilter,
  className = '',
  facing = 1,
}: {
  action?: SpriteAction;
  height?: number;
  /** Deprecated: hit/dodge reactions removed; tribe uses only walk and action motions. */
  reaction?: 'hurt' | 'dodge' | null;
  tribeClass?: TribeClassId;
  showBadge?: boolean;
  frameOffset?: number;
  memberIndex?: number;
  speedMult?: number;
  customFilter?: string;
  className?: string;
  facing?: 1 | -1;
}) {
  const classKey = tribeClass ? `tribe:${tribeClass}` : 'tribe';
  const { data: classSheets, isLoading: classLoading } = useSpriteAnimations(classKey);
  const { data: baseSheets, isLoading: baseLoading } = useSpriteAnimations('tribe');
  const cls = tribeClass ? getTribeClass(tribeClass) : null;
  const [frame, setFrame] = useState(frameOffset);

  // Normalize action: preserve 'idle' so gathering/idling doesn't forcibly jump to walk
  const normalizedAction: 'idle' | 'walk' | 'attack' | 'gather' | 'chop' =
    action === 'idle'
      ? 'idle'
      : action === 'attack'
        ? 'attack'
        : action === 'chop'
          ? 'chop'
          : action === 'gather'
            ? 'gather'
            : 'walk';

  useEffect(() => {
    const baseInterval =
      normalizedAction === 'attack' && cls?.id === 'assassin'
        ? 90
        : cls?.frameIntervalMs ?? 200;
    // Desynchronize step intervals by member index and speedMult so members don't move in robotic lockstep
    const desyncOffset = memberIndex !== undefined ? (((memberIndex + 1) * 31) % 50) - 25 : 0;
    const interval = Math.max(70, Math.round((baseInterval + desyncOffset) / (speedMult || 1)));
    const timer = window.setInterval(() => setFrame(f => (f + 1) % 4), interval);
    return () => window.clearInterval(timer);
  }, [normalizedAction, cls?.id, cls?.frameIntervalMs, memberIndex, speedMult]);

  const activeFrame = (frame + frameOffset) % 4;

  const src =
    normalizedAction === 'attack'
      ? cls?.id === 'assassin'
        ? RAPID_ATTACK_FRAMES[activeFrame]
        : RAPID_ATTACK_FRAMES[activeFrame % 2 === 0 ? 1 : 0]
      : normalizedAction === 'chop'
        ? CHOP_FRAMES[activeFrame]
        : normalizedAction === 'gather'
          ? GATHER_FRAMES[activeFrame]
          : normalizedAction === 'idle'
            ? idle
            : WALK_FRAMES[activeFrame];

  const rapidOffset =
    normalizedAction === 'attack' && cls?.id === 'assassin'
      ? frame % 2 === 1
        ? 3
        : -2
      : 0;
  const adminScale = classSheets?.scale ?? baseSheets?.scale ?? 1.0;
  const scaledHeight = Math.round(
    (cls?.id === 'tank' ? height * 1.08 : height) * adminScale
  );

  // Exact Class-specific Sprite Priority (e.g. tribe:gatherer for Ambacho)
  // 1. Direct action match
  // 2. Intelligent semantic fallback (idle -> walk -> gather; chop -> chop -> attack; gather -> gather -> walk)
  const customClassSheet =
    (normalizedAction === 'idle' ? (classSheets?.idle ?? classSheets?.walk ?? classSheets?.gather) : undefined) ??
    classSheets?.[normalizedAction] ??
    (normalizedAction === 'chop' ? (classSheets?.chop ?? classSheets?.attack) : undefined) ??
    (normalizedAction === 'gather' ? (classSheets?.gather ?? classSheets?.walk ?? classSheets?.attack) : undefined) ??
    classSheets?.walk ??
    classSheets?.idle ??
    classSheets?.gather;

  const fallbackAdminSheet =
    (normalizedAction === 'idle' ? (baseSheets?.idle ?? baseSheets?.walk) : undefined) ??
    baseSheets?.[normalizedAction] ??
    (normalizedAction === 'chop' ? (baseSheets?.chop ?? baseSheets?.attack) : undefined) ??
    (normalizedAction === 'gather' ? (baseSheets?.gather ?? baseSheets?.attack) : undefined) ??
    baseSheets?.walk ??
    baseSheets?.idle;

  const sheet = customClassSheet ?? fallbackAdminSheet;
  const hasCustomClassArt = !!customClassSheet;

  const memberFilter = memberIndex !== undefined ? MEMBER_VARIATION_FILTERS[memberIndex % MEMBER_VARIATION_FILTERS.length] : '';
  const combinedFilter = [cls?.spriteFilter, memberFilter, customFilter].filter(Boolean).join(' ');

  const fallback = (
    <img
      src={src}
      alt=""
      className="pixelated w-auto object-contain transition-transform duration-75"
      style={{
        height: scaledHeight,
        filter: combinedFilter || undefined,
        transform: rapidOffset ? `translateX(${rapidOffset}px)` : undefined,
      }}
    />
  );

  return (
    <span
      data-tribe-sprite={normalizedAction}
      data-tribe-class={tribeClass ?? 'default'}
      className={`relative inline-flex shrink-0 items-end ${className}`}
    >
      <span
        style={{
          filter: !hasCustomClassArt && sheet ? combinedFilter || undefined : (memberFilter || customFilter || undefined),
          transform: facing === -1 ? 'scaleX(-1)' : undefined,
        }}
      >
        {sheet ? (
          <SpriteAnimator
            url={sheet.url}
            frames={sheet.frame_count}
            fps={
              cls?.id === 'assassin' && normalizedAction === 'attack'
                ? sheet.fps * 2
                : sheet.fps
            }
            height={scaledHeight}
            fallback={fallback}
          />
        ) : (classLoading || baseLoading) ? (
          <span aria-hidden className="inline-block" style={{ width: Math.round(scaledHeight * 0.85), height: scaledHeight }} />
        ) : (
          fallback
        )}
      </span>
      {cls && showBadge && (
        <span
          aria-hidden
          title={`${cls.name} (${cls.weaponName})`}
          className={`pointer-events-none absolute -right-1 bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[8px] leading-none shadow-sm ${cls.badgeClass}`}
        >
          {cls.weaponIcon}
        </span>
      )}
    </span>
  );
}