import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([37.5665, 126.978], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regions) return;
    regions.forEach(r => {
      L.rectangle(
        [[r.bounds_south, r.bounds_west], [r.bounds_north, r.bounds_east]],
        { color: 'hsl(150,80%,45%)', weight: 2, fillOpacity: 0.1 }
      ).addTo(map).bindPopup(`<strong>${r.name}</strong><br/>${r.description || ''}`);
    });
  }, [regions]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !missions) return;
    missions.forEach(m => {
      L.marker([m.latitude, m.longitude], { icon: missionIcon(m.status) })
        .addTo(map)
        .bindPopup(`<div class="text-sm"><strong>${m.title}</strong><br/>상태: ${m.status}<br/>${m.floor}층</div>`);
    });
  }, [missions]);

  return (
    <div className="h-[calc(100vh-3rem)]">
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
