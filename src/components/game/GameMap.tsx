import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DetectedSpot } from '@/hooks/useSpotDetection';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const userIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:hsl(150,80%,45%);border:3px solid white;box-shadow:0 0 12px hsl(150,80%,45%,0.6);"></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const spotIcon = (inRange: boolean) => L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:${inRange ? 'hsl(35,90%,55%)' : 'hsl(220,15%,40%)'};border:2px solid ${inRange ? 'white' : 'hsl(220,15%,30%)'};box-shadow:0 0 ${inRange ? '10px hsl(35,90%,55%,0.6)' : '4px rgba(0,0,0,0.3)'};"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapFollower({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng, map]);
  return null;
}

interface GameMapProps {
  userLat: number;
  userLng: number;
  detectedSpots: DetectedSpot[];
  onSpotClick: (spot: DetectedSpot) => void;
}

export function GameMap({ userLat, userLng, detectedSpots, onSpotClick }: GameMapProps) {
  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={18}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapFollower lat={userLat} lng={userLng} />
      
      {/* User position */}
      <Marker position={[userLat, userLng]} icon={userIcon}>
        <Popup>내 위치</Popup>
      </Marker>
      <Circle
        center={[userLat, userLng]}
        radius={10}
        pathOptions={{ color: 'hsl(150,80%,45%)', fillColor: 'hsl(150,80%,45%)', fillOpacity: 0.1, weight: 1 }}
      />

      {/* Spots */}
      {detectedSpots.map(ds => (
        <Marker
          key={ds.spot.id}
          position={[ds.spot.latitude, ds.spot.longitude]}
          icon={spotIcon(ds.isInRange)}
          eventHandlers={{ click: () => onSpotClick(ds) }}
        >
          <Popup>
            <div className="text-sm">
              <strong>{ds.spot.name}</strong>
              <br />
              {Math.round(ds.distance)}m · {ds.spot.floor}층
              {ds.isInRange && <span className="ml-1 text-green-500">● 탐색 가능</span>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
