import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MapContainer, TileLayer, Marker, Popup, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const missionIcon = (status: string) => L.divIcon({
  html: `<div style="width:12px;height:12px;border-radius:50%;background:${
    status === '승인완료' ? 'hsl(150,80%,45%)' :
    status === '승인대기' ? 'hsl(35,90%,55%)' :
    status === '반려' ? 'hsl(0,75%,55%)' : 'hsl(220,15%,40%)'
  };border:2px solid white;"></div>`,
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export default function GlobalMapView() {
  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('*');
      return data || [];
    },
  });

  const { data: missions } = useQuery({
    queryKey: ['all-missions'],
    queryFn: async () => {
      const { data } = await supabase.from('missions').select('*');
      return data || [];
    },
  });

  return (
    <div className="h-[calc(100vh-3rem)]">
      <MapContainer center={[37.5665, 126.978]} zoom={11} className="h-full w-full" zoomControl={true}>
        <TileLayer
          attribution='&copy; OSM'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {regions?.map(r => (
          <Rectangle
            key={r.id}
            bounds={[[r.bounds_south, r.bounds_west], [r.bounds_north, r.bounds_east]]}
            pathOptions={{ color: 'hsl(150,80%,45%)', weight: 2, fillOpacity: 0.1 }}
          >
            <Popup><strong>{r.name}</strong><br />{r.description}</Popup>
          </Rectangle>
        ))}
        {missions?.map(m => (
          <Marker key={m.id} position={[m.latitude, m.longitude]} icon={missionIcon(m.status)}>
            <Popup>
              <div className="text-sm">
                <strong>{m.title}</strong><br />
                상태: {m.status}<br />
                {m.floor}층
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
