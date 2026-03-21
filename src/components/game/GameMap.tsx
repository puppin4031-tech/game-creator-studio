import { useCallback } from 'react';
import { GoogleMap, Marker, Circle } from '@react-google-maps/api';
import type { DetectedSpot } from '@/hooks/useSpotDetection';

const containerStyle = { height: '100%', width: '100%' };

const userIconUrl = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="7" fill="hsl(150,80%,45%)" stroke="white" stroke-width="3"/></svg>`)}`;

const spotIconUrl = (inRange: boolean) => {
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
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={{ lat: userLat, lng: userLng }}
      zoom={18}
      options={{ zoomControl: false, mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
    >
      <Marker
        position={{ lat: userLat, lng: userLng }}
        icon={{ url: userIconUrl, scaledSize: new google.maps.Size(20, 20), anchor: new google.maps.Point(10, 10) }}
        title="내 위치"
      />
      <Circle
        center={{ lat: userLat, lng: userLng }}
        radius={10}
        options={{ strokeColor: 'hsl(150,80%,45%)', fillColor: 'hsl(150,80%,45%)', fillOpacity: 0.1, strokeWeight: 1 }}
      />
      {detectedSpots.map(ds => (
        <Marker
          key={ds.spot.id}
          position={{ lat: ds.spot.latitude, lng: ds.spot.longitude }}
          icon={{ url: spotIconUrl(ds.isInRange), scaledSize: new google.maps.Size(16, 16), anchor: new google.maps.Point(8, 8) }}
          title={`${ds.spot.name} - ${Math.round(ds.distance)}m · ${ds.spot.floor}층${ds.isInRange ? ' ● 탐색 가능' : ''}`}
          onClick={() => onSpotClick(ds)}
        />
      ))}
    </GoogleMap>
  );
}
