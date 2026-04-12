import { useMemo, useState } from 'react';
import { Map, Circle, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { TagRoom, TagPlayer } from '@/hooks/useTagRoom';
import { haversineDistance } from '@/lib/haversine';
import { GeoPosition } from '@/hooks/useGeolocation';
import PingOverlay, { Ping } from './PingOverlay';
import DirectionCone from './DirectionCone';

interface Props {
  room: TagRoom;
  players: TagPlayer[];
  currentPlayerId: string;
  myTeam: number | null;
  position: GeoPosition;
  pings: Ping[];
  onPingExpire: (id: string) => void;
  heading: number | null;
  isCompassActive: boolean;
}

const TEAM_COLORS: Record<number, string> = {
  1: '#3B82F6',
  2: '#EF4444',
};

export default function TagGameMap({ room, players, currentPlayerId, myTeam, position, pings, onPingExpire, heading, isCompassActive }: Props) {
  const center = useMemo(() => ({
    lat: position.latitude,
    lng: position.longitude,
  }), [position.latitude, position.longitude]);

  const visiblePlayers = useMemo(() => {
    return players.filter(p => {
      if (p.id === currentPlayerId) return true;
      if (p.team === myTeam) return true;
      const dist = haversineDistance(
        position.latitude, position.longitude,
        p.latitude, p.longitude
      );
      return dist <= 1000;
    });
  }, [players, currentPlayerId, myTeam, position.latitude, position.longitude]);

  return (
    <Map
      center={center}
      style={{ width: '100%', height: '100%' }}
      level={5}
    >
      <Circle
        center={center}
        radius={1000}
        fillColor={TEAM_COLORS[myTeam || 1]}
        fillOpacity={0.05}
        strokeColor={TEAM_COLORS[myTeam || 1]}
        strokeOpacity={0.3}
        strokeWeight={1}
      />

      {visiblePlayers.map(p => {
        const isMe = p.id === currentPlayerId;
        const color = TEAM_COLORS[p.team || 1] || '#888';

        return (
          <CustomOverlayMap key={p.id} position={{ lat: p.latitude, lng: p.longitude }} zIndex={isMe ? 20 : 10}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translate(-50%, -50%)' }}>
              <div style={{
                width: isMe ? 32 : 24,
                height: isMe ? 32 : 24,
                borderRadius: '50%',
                backgroundColor: p.is_caught ? '#888' : color,
                opacity: p.is_caught ? 0.4 : 1,
                border: isMe ? '3px solid white' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: isMe ? 16 : 13,
                fontWeight: 'bold',
              }}>
                {isMe ? '★' : p.nickname.charAt(0)}
              </div>
              <span style={{
                fontSize: 10,
                color: '#fff',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                marginTop: 2,
              }}>
                {p.nickname}{p.is_caught ? ' (잡힘)' : ''}
              </span>
            </div>
          </CustomOverlayMap>
        );
      })}

      {isCompassActive && heading !== null && (
        <DirectionCone
          position={center}
          heading={heading}
          color={TEAM_COLORS[myTeam || 1]}
        />
      )}

      <PingOverlay pings={pings} onExpire={onPingExpire} />
    </Map>
  );
}
