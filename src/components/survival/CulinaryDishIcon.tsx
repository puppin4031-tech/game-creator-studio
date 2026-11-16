import type { ItemId } from '@/lib/survival/items';

interface Props {
  itemId: ItemId | string;
  size?: number;
  className?: string;
}

/**
 * Custom 16x16 crisp pixel-art SVGs for primitive culinary dishes, smoked foods,
 * spoiled green-mold food, and aromatic spices.
 */
export function isCustomCulinaryItem(itemId: string): boolean {
  return (
    itemId === 'bone_stew' ||
    itemId === 'spice_roast' ||
    itemId === 'sweet_fruit_skewers' ||
    itemId === 'dino_tail_steak' ||
    itemId === 'dried_fruit' ||
    itemId === 'spoiled_food' ||
    itemId === 'wild_spice' ||
    itemId === 'rock_salt' ||
    itemId === 'pepper_berry' ||
    itemId === 'arrow' ||
    itemId === 'sling_stone'
  );
}

export default function CulinaryDishIcon({ itemId, size = 28, className = '' }: Props) {
  const s = { width: size, height: size };

  switch (itemId) {
    case 'bone_stew':
      return (
        <svg viewBox="0 0 16 16" style={s} shapeRendering="crispEdges" className={`pixelated select-none ${className}`} aria-label="진한 뼈 고기 스튜">
          {/* Steam */}
          <rect x="5" y="1" width="1" height="2" fill="#e7e5e4" />
          <rect x="8" y="0" width="1" height="2" fill="#e7e5e4" />
          <rect x="11" y="1" width="1" height="2" fill="#e7e5e4" />
          {/* Bone sticking out */}
          <rect x="10" y="3" width="3" height="2" fill="#fafaf9" />
          <rect x="12" y="2" width="2" height="2" fill="#e7e5e4" />
          {/* Rich stew broth & herbs */}
          <rect x="3" y="5" width="10" height="2" fill="#ea580c" />
          <rect x="4" y="5" width="2" height="1" fill="#22c55e" />
          <rect x="7" y="6" width="2" height="1" fill="#fde047" />
          {/* Clay pot body */}
          <rect x="2" y="7" width="12" height="6" fill="#78350f" />
          <rect x="3" y="8" width="10" height="4" fill="#92400e" />
          <rect x="4" y="13" width="8" height="2" fill="#451a03" />
        </svg>
      );

    case 'spice_roast':
      return (
        <svg viewBox="0 0 16 16" style={s} shapeRendering="crispEdges" className={`pixelated select-none ${className}`} aria-label="향신료 통고기 구이">
          {/* Bone ends */}
          <rect x="1" y="7" width="3" height="2" fill="#f5f5f4" />
          <rect x="12" y="7" width="3" height="2" fill="#f5f5f4" />
          {/* Glazed roast meat */}
          <rect x="4" y="4" width="8" height="8" fill="#9a3412" />
          <rect x="5" y="5" width="6" height="6" fill="#c2410c" />
          {/* Highlight & spice speckles */}
          <rect x="6" y="5" width="3" height="1" fill="#fdba74" />
          <rect x="5" y="8" width="1" height="1" fill="#22c55e" />
          <rect x="8" y="7" width="1" height="1" fill="#fde047" />
          <rect x="9" y="9" width="1" height="1" fill="#22c55e" />
        </svg>
      );

    case 'sweet_fruit_skewers':
      return (
        <svg viewBox="0 0 16 16" style={s} shapeRendering="crispEdges" className={`pixelated select-none ${className}`} aria-label="달콤 과일 구이 꼬치">
          {/* Skewer stick */}
          <rect x="2" y="12" width="2" height="2" fill="#a16207" />
          <rect x="4" y="10" width="2" height="2" fill="#a16207" />
          <rect x="12" y="2" width="2" height="2" fill="#a16207" />
          {/* Roasted Apple (Red) */}
          <rect x="4" y="8" width="4" height="4" fill="#dc2626" />
          <rect x="5" y="9" width="2" height="1" fill="#fca5a5" />
          {/* Roasted Pear (Golden) */}
          <rect x="7" y="5" width="4" height="4" fill="#eab308" />
          <rect x="8" y="6" width="2" height="1" fill="#fef08a" />
          {/* Berry & Herb top */}
          <rect x="10" y="3" width="3" height="3" fill="#9333ea" />
          <rect x="6" y="7" width="1" height="1" fill="#22c55e" />
        </svg>
      );

    case 'dino_tail_steak':
      return (
        <svg viewBox="0 0 16 16" style={s} shapeRendering="crispEdges" className={`pixelated select-none ${className}`} aria-label="우두머리 스테이크 정식">
          {/* Golden aura */}
          <rect x="7" y="1" width="2" height="1" fill="#facc15" />
          {/* Sizzling T-bone / Dino Steak */}
          <rect x="2" y="4" width="12" height="9" fill="#7f1d1d" />
          <rect x="3" y="5" width="10" height="7" fill="#b91c1c" />
          {/* White bone center ring */}
          <rect x="6" y="7" width="3" height="3" fill="#fafaf9" />
          <rect x="7" y="8" width="1" height="1" fill="#d6d3d1" />
          {/* Grill marks & red pepper */}
          <rect x="4" y="6" width="2" height="1" fill="#450a0a" />
          <rect x="10" y="9" width="2" height="1" fill="#450a0a" />
          <rect x="10" y="6" width="1" height="1" fill="#22c55e" />
          <rect x="4" y="10" width="1" height="1" fill="#fde047" />
        </svg>
      );

    case 'dried_fruit':
      return (
        <svg viewBox="0 0 16 16" style={s} shapeRendering="crispEdges" className={`pixelated select-none ${className}`} aria-label="말린 과일">
          <rect x="3" y="5" width="4" height="5" fill="#b45309" />
          <rect x="4" y="6" width="2" height="3" fill="#d97706" />
          <rect x="8" y="6" width="5" height="5" fill="#92400e" />
          <rect x="9" y="7" width="3" height="3" fill="#f59e0b" />
          <rect x="6" y="9" width="4" height="4" fill="#78350f" />
        </svg>
      );

    case 'spoiled_food':
      return (
        <svg viewBox="0 0 16 16" style={s} shapeRendering="crispEdges" className={`pixelated select-none ${className}`} aria-label="상한 음식">
          {/* Toxic green stink fumes */}
          <rect x="5" y="1" width="1" height="2" fill="#84cc16" />
          <rect x="9" y="2" width="1" height="2" fill="#4ade80" />
          <rect x="11" y="1" width="1" height="2" fill="#84cc16" />
          {/* Moldy green-brown lump */}
          <rect x="3" y="6" width="10" height="7" fill="#3f6212" />
          <rect x="4" y="7" width="8" height="5" fill="#4d7c0f" />
          <rect x="5" y="8" width="3" height="2" fill="#84cc16" />
          <rect x="9" y="9" width="2" height="2" fill="#65a30d" />
          <rect x="6" y="11" width="2" height="1" fill="#365314" />
        </svg>
      );

    case 'wild_spice':
      return (
        <svg viewBox="0 0 16 16" style={s} shapeRendering="crispEdges" className={`pixelated select-none ${className}`} aria-label="야생 향신초">
          <rect x="7" y="9" width="2" height="5" fill="#854d0e" />
          <rect x="4" y="5" width="3" height="4" fill="#16a34a" />
          <rect x="9" y="5" width="3" height="4" fill="#15803d" />
          <rect x="6" y="3" width="4" height="5" fill="#22c55e" />
          <rect x="7" y="4" width="2" height="2" fill="#86efac" />
        </svg>
      );

    case 'rock_salt':
      return (
        <svg viewBox="0 0 16 16" style={s} shapeRendering="crispEdges" className={`pixelated select-none ${className}`} aria-label="암염 결정">
          <rect x="4" y="6" width="8" height="7" fill="#e2e8f0" />
          <rect x="5" y="4" width="6" height="8" fill="#f8fafc" />
          <rect x="6" y="5" width="2" height="3" fill="#fda4af" />
          <rect x="9" y="8" width="2" height="2" fill="#cbd5e1" />
        </svg>
      );

    case 'pepper_berry':
      return (
        <svg viewBox="0 0 16 16" style={s} shapeRendering="crispEdges" className={`pixelated select-none ${className}`} aria-label="매운 후추열매">
          <rect x="7" y="2" width="2" height="3" fill="#15803d" />
          <rect x="4" y="5" width="3" height="3" fill="#dc2626" />
          <rect x="9" y="5" width="3" height="3" fill="#b91c1c" />
          <rect x="6" y="8" width="4" height="4" fill="#ef4444" />
          <rect x="7" y="9" width="1" height="1" fill="#fef08a" />
        </svg>
      );

    case 'arrow':
      return (
        <svg viewBox="0 0 16 16" style={s} shapeRendering="crispEdges" className={`pixelated select-none ${className}`} aria-label="화살">
          {/* Flint arrowhead */}
          <rect x="11" y="2" width="3" height="3" fill="#94a3b8" />
          <rect x="12" y="1" width="3" height="2" fill="#e2e8f0" />
          {/* Wooden shaft */}
          <rect x="4" y="10" width="2" height="2" fill="#a16207" />
          <rect x="6" y="8" width="2" height="2" fill="#a16207" />
          <rect x="8" y="6" width="2" height="2" fill="#a16207" />
          <rect x="10" y="4" width="2" height="2" fill="#a16207" />
          {/* Feather fletching */}
          <rect x="2" y="12" width="2" height="2" fill="#f8fafc" />
          <rect x="1" y="13" width="2" height="2" fill="#ef4444" />
        </svg>
      );

    case 'sling_stone':
      return (
        <svg viewBox="0 0 16 16" style={s} shapeRendering="crispEdges" className={`pixelated select-none ${className}`} aria-label="돌멩이 탄환">
          <rect x="3" y="7" width="5" height="5" fill="#64748b" />
          <rect x="4" y="8" width="3" height="3" fill="#94a3b8" />
          <rect x="5" y="8" width="1" height="1" fill="#e2e8f0" />
          <rect x="8" y="5" width="5" height="5" fill="#475569" />
          <rect x="9" y="6" width="3" height="3" fill="#94a3b8" />
          <rect x="6" y="10" width="4" height="4" fill="#64748b" />
        </svg>
      );

    default:
      return null;
  }
}
