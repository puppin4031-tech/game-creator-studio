import { Map, MapMarker, Circle } from 'react-kakao-maps-sdk';
import type { DetectedSpot } from '@/hooks/useSpotDetection';

const userDotIcon = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="7" fill="hsl(150,80%,45%)" stroke="white" stroke-width="3"/></svg>`)}`;

const spotIcon = (inRange: boolean) => {
  const fill = inRange ? '#e0952d' : '#5a6a80';
  const stroke = inRange ? 'white' : '#3a4a5a';
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/></svg>`)}`;
};

interface GameMapProps {
  userLat: number;
  userLng: number;
  detectedSpots: DetectedSpot[];
  onSpotClick: (spot: DetectedSpot) => void;
}

export function GameMap({ userLat, userLng, detectedSpots, onSpotClick }: GameMapProps) {
  return (
    <Map
      center={{ lat: userLat, lng: userLng }}
      style={{ height: '100%', width: '100%' }}
      level={2}
    >
      <MapMarker
        position={{ lat: userLat, lng: userLng }}
        image={{ src: userDotIcon, size: { width: 20, height: 20 }, options: { offset: { x: 10, y: 10 } } }}
        title="내 위치"
      />
      <Circle
        center={{ lat: userLat, lng: userLng }}
        radius={10}
        strokeWeight={1}
        strokeColor="hsl(150,80%,45%)"
        fillColor="hsl(150,80%,45%)"
        fillOpacity={0.1}
      />
      {detectedSpots.map(ds => (
        <MapMarker
          key={ds.spot.id}
          position={{ lat: ds.spot.latitude, lng: ds.spot.longitude }}
          image={{
            src: spotIcon(ds.isInRange),
            size: { width: 16, height: 16 },
            options: { offset: { x: 8, y: 8 } },
          }}
          title={`${ds.spot.name} - ${Math.round(ds.distance)}m · ${ds.spot.floor}층${ds.isInRange ? ' ● 탐색 가능' : ''}`}
          onClick={() => onSpotClick(ds)}
        />
      ))}
    </Map>
  );
}
