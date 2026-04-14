import { CustomOverlayMap } from 'react-kakao-maps-sdk';
import { TREASURE_ICON_MAP } from '@/lib/treasureIcons';
import diamondImg from '@/assets/treasure/diamond.png';

const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(156,163,175,0.4)',
  uncommon: 'rgba(34,197,94,0.5)',
  rare: 'rgba(59,130,246,0.5)',
  epic: 'rgba(168,85,247,0.6)',
  legendary: 'rgba(245,158,11,0.7)',
};

export interface SpawnData {
  id: string;
  lat: number;
  lng: number;
  item_type: string;
  item_icon: string;
  rarity: string;
  inRange: boolean;
  distance: number;
}

interface SpawnMarkerProps {
  spawn: SpawnData;
  onSelect: (spawn: SpawnData) => void;
}

export default function SpawnMarker({ spawn, onSelect }: SpawnMarkerProps) {
  const iconSrc = TREASURE_ICON_MAP[spawn.item_type] ?? diamondImg;
  const glowColor = RARITY_GLOW[spawn.rarity] || RARITY_GLOW.common;
  const size = spawn.inRange ? 40 : 28;

  return (
    <CustomOverlayMap
      position={{ lat: spawn.lat, lng: spawn.lng }}
      zIndex={spawn.inRange ? 9 : 7}
    >
      <div
        onClick={() => { if (spawn.inRange) onSelect(spawn); }}
        style={{
          cursor: spawn.inRange ? 'pointer' : 'default',
          animation: spawn.inRange
            ? 'spawn-float 2s ease-in-out infinite'
            : 'spawn-float 3s ease-in-out infinite',
          filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))',
        }}
      >
        {/* Glow ring behind icon */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: size + 12, height: size + 12,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          animation: 'spawn-glow-pulse 2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <img
          src={iconSrc}
          alt={spawn.item_type}
          style={{
            width: size, height: size, objectFit: 'contain',
            position: 'relative', zIndex: 1,
          }}
        />
      </div>
    </CustomOverlayMap>
  );
}
