import { useMemo, useState } from 'react';
import { GoogleMap, Marker, Circle } from '@react-google-maps/api';
import { TagRoom, TagPlayer } from '@/hooks/useTagRoom';
import { haversineDistance } from '@/lib/haversine';
import { GeoPosition } from '@/hooks/useGeolocation';
import PingOverlay, { Ping } from './PingOverlay';

interface Props {
  room: TagRoom;
  players: TagPlayer[];
  currentPlayerId: string;
  myTeam: number | null;
  position: GeoPosition;
  pings: Ping[];
  onPingExpire: (id: string) => void;
}

const mapContainerStyle = { width: '100%', height: '100%' };

const TEAM_COLORS: Record<number, string> = {
  1: '#3B82F6', // blue
  2: '#EF4444', // red
};

export default function TagGameMap({ room, players, currentPlayerId, myTeam, position, pings, onPingExpire }: Props) {
  const center = useMemo(() => ({
    lat: position.latitude,
    lng: position.longitude,
  }), [position.latitude, position.longitude]);

  const visiblePlayers = useMemo(() => {
    return players.filter(p => {
      if (p.id === currentPlayerId) return true;
      if (p.team === myTeam) return true;
      // Enemy team: only show within 1km
      const dist = haversineDistance(
        position.latitude, position.longitude,
        p.latitude, p.longitude
      );
      return dist <= 1000;
    });
  }, [players, currentPlayerId, myTeam, position.latitude, position.longitude]);

  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={16}
      onLoad={setMapRef}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
      }}
    >
      {/* 1km radius circle around current player */}
      <Circle
        center={center}
        radius={1000}
        options={{
          fillColor: TEAM_COLORS[myTeam || 1],
          fillOpacity: 0.05,
          strokeColor: TEAM_COLORS[myTeam || 1],
          strokeOpacity: 0.3,
          strokeWeight: 1,
        }}
      />

      {visiblePlayers.map(p => {
        const isMe = p.id === currentPlayerId;
        const color = TEAM_COLORS[p.team || 1] || '#888';

        return (
          <Marker
            key={p.id}
            position={{ lat: p.latitude, lng: p.longitude }}
            label={{
              text: isMe ? '★' : p.nickname.charAt(0),
              color: '#fff',
              fontSize: isMe ? '14px' : '11px',
              fontWeight: 'bold',
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: p.is_caught ? '#888' : color,
              fillOpacity: p.is_caught ? 0.4 : 1,
              strokeColor: isMe ? '#fff' : 'transparent',
              strokeWeight: isMe ? 3 : 0,
              scale: isMe ? 14 : 10,
            }}
            title={`${p.nickname}${p.is_caught ? ' (잡힘)' : ''}`}
          />
        );
      })}

      {/* Debug test circle */}
      <Circle
        center={center}
        radius={200}
        options={{
          fillColor: '#FF0000',
          fillOpacity: 0.5,
          strokeColor: '#FF0000',
          strokeOpacity: 1,
          strokeWeight: 3,
          zIndex: 200,
        }}
      />

      {/* Pings */}
      <PingOverlay pings={pings} onExpire={onPingExpire} map={mapRef} />
    </GoogleMap>
  );
}
