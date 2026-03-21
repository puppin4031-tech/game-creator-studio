import { useEffect, useRef } from 'react';
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

interface GameMapProps {
  userLat: number;
  userLng: number;
  detectedSpots: DetectedSpot[];
  onSpotClick: (spot: DetectedSpot) => void;
}

export function GameMap({ userLat, userLng, detectedSpots, onSpotClick }: GameMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const spotMarkersRef = useRef<L.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([userLat, userLng], 18);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update user position
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setView([userLat, userLng], map.getZoom());

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    } else {
      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
        .addTo(map)
        .bindPopup('내 위치');
    }

    if (userCircleRef.current) {
      userCircleRef.current.setLatLng([userLat, userLng]);
    } else {
      userCircleRef.current = L.circle([userLat, userLng], {
        radius: 10,
        color: 'hsl(150,80%,45%)',
        fillColor: 'hsl(150,80%,45%)',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(map);
    }
  }, [userLat, userLng]);

  // Update spot markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    spotMarkersRef.current.forEach(m => m.remove());
    spotMarkersRef.current = [];

    detectedSpots.forEach(ds => {
      const marker = L.marker([ds.spot.latitude, ds.spot.longitude], {
        icon: spotIcon(ds.isInRange),
      })
        .addTo(map)
        .bindPopup(`<div class="text-sm"><strong>${ds.spot.name}</strong><br/>${Math.round(ds.distance)}m · ${ds.spot.floor}층${ds.isInRange ? '<span style="color:green;margin-left:4px;">● 탐색 가능</span>' : ''}</div>`)
        .on('click', () => onSpotClick(ds));
      spotMarkersRef.current.push(marker);
    });
  }, [detectedSpots, onSpotClick]);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}
