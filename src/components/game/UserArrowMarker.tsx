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
 *
 * 모든 CustomOverlayMap은 xAnchor/yAnchor=0.5로 정확히 GPS 좌표 중앙에 정렬.
 * 내부 children은 더 이상 translate(-50%, -50%)를 쓰지 않는다 (이중 정렬 방지).
 */
export default function UserArrowMarker({
  position,
  compassActive,
  heading,
  color = '#22c55e',
  zIndex = 10,
}: Props) {
  const filterId = `arrow-shadow-${color.replace('#', '')}`;

  return (
    <CustomOverlayMap position={position} zIndex={zIndex} xAnchor={0.5} yAnchor={0.5}>
      {compassActive && heading !== null ? (
        <div
          style={{
            width: 48,
            height: 48,
            transform: `rotate(${heading}deg)`,
            transformOrigin: 'center center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48">
            <defs>
              <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.3" />
              </filter>
            </defs>
            <g filter={`url(#${filterId})`}>
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
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        />
      )}
    </CustomOverlayMap>
  );
}
