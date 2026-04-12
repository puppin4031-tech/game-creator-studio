import { useMemo } from 'react';
import { CustomOverlayMap } from 'react-kakao-maps-sdk';

interface Props {
  position: { lat: number; lng: number };
  heading: number;
  color: string;
}

export default function DirectionCone({ position, heading, color }: Props) {
  const style = useMemo(() => ({
    transform: `translate(-40px, -70px) rotate(${heading}deg)`,
    transformOrigin: 'center bottom',
    transition: 'transform 0.15s linear',
  }), [heading]);

  return (
    <CustomOverlayMap position={position} zIndex={5}>
      <div style={style}>
        <svg width="80" height="70" viewBox="0 0 80 70">
          <path
            d="M40 70 L12 8 A42 42 0 0 1 68 8 Z"
            fill={color}
            fillOpacity={0.25}
            stroke={color}
            strokeOpacity={0.5}
            strokeWidth={1.5}
          />
        </svg>
      </div>
    </CustomOverlayMap>
  );
}
