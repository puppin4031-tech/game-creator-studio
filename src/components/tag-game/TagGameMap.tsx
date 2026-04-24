import { useMemo } from 'react';
import { Map, Circle, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { TagRoom, TagPlayer } from '@/hooks/useTagRoom';
import { GeoPosition } from '@/hooks/useGeolocation';
import PingOverlay, { Ping } from './PingOverlay';
import CompassMapWrapper from '@/components/game/CompassMapWrapper';
import UserArrowMarker from '@/components/game/UserArrowMarker';

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

export default function TagGameMap({
  room, players, currentPlayerId, myTeam, position,
  pings, onPingExpire, heading, isCompassActive,
}: Props) {
  const center = useMemo(() => ({
    lat: position.latitude,
    lng: position.longitude,
  }), [position.latitude, position.longitude]);

  const visiblePlayers = useMemo(() => {
    return players.filter(p => {
      if (p.id === currentPlayerId) return false; // 본인 제외
      return p.team === myTeam; // 같은 팀만 표시
    });
  }, [players, currentPlayerId, myTeam]);

  const myColor = TEAM_COLORS[myTeam || 1];

  return (
    <CompassMapWrapper compassActive={isCompassActive} heading={heading}>
      <Map
        center={center}
        style={{ width: '100%', height: '100%' }}
        level={2}
      >
        <Circle
          center={center}
          radius={1000}
          fillColor={myColor}
          fillOpacity={0.05}
          strokeColor={myColor}
          strokeOpacity={0.3}
          strokeWeight={1}
        />

        {/* Other players */}
        {visiblePlayers.map(p => {
          const color = TEAM_COLORS[p.team || 1] || '#888';
          return (
            <CustomOverlayMap key={p.id} position={{ lat: p.latitude, lng: p.longitude }} zIndex={8}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translate(-50%, -50%)' }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: p.is_caught ? '#888' : color,
                  opacity: p.is_caught ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 'bold',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}>
                  {p.nickname.charAt(0)}
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

        {/* Self - arrow when compass, dot otherwise */}
        <UserArrowMarker
          position={center}
          compassActive={isCompassActive}
          heading={heading}
          color={myColor}
          zIndex={20}
        />

        <PingOverlay pings={pings} onExpire={onPingExpire} />
      </Map>
    </CompassMapWrapper>
  );
}
