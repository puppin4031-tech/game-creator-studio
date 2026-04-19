import { CustomOverlayMap } from 'react-kakao-maps-sdk';

interface Props {
  position: { lat: number; lng: number };
  compassActive: boolean;
  heading: number | null;
  color?: string;
  zIndex?: number;
}

/**
 * Shared user marker. When compass is active and heading is available,
 * shows a pointing arrow that rotates with heading. Otherwise shows a
 * simple colored dot. Color customizable per game (team colors, etc.).
 */
export default function UserArrowMarker({
  position,
  compassActive,
  heading,
  color = '#22c55e',
  zIndex = 10,
}: Props) {
  return (
    <CustomOverlayMap position={position} zIndex={zIndex}>
      {compassActive && heading !== null ? (
        <div style={{ transform: `rotate(${heading}deg)`, transformOrigin: 'center center' }}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <defs>
              <filter id={`arrow-shadow-${color.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
              </filter>
            </defs>
            <g filter={`url(#arrow-shadow-${color.replace('#', '')})`}>
              <polygon
                points="24,6 34,38 24,32 14,38"
                fill={color}
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>
      ) : (
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: color,
            border: '3px solid white',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        />
      )}
    </CustomOverlayMap>
  );
}
