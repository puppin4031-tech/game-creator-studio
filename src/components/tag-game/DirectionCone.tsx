import { useMemo } from 'react';
import { OverlayView } from '@react-google-maps/api';

interface Props {
  position: { lat: number; lng: number };
  heading: number;
  color: string;
}

export default function DirectionCone({ position, heading, color }: Props) {
  const style = useMemo(() => ({
    transform: `rotate(${heading}deg)`,
    transformOrigin: 'center bottom',
    transition: 'transform 0.15s linear',
  }), [heading]);

  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={() => ({ x: -40, y: -70 })}
    >
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
    </OverlayView>
  );
}
