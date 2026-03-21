import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const statusColors: Record<string, string> = {
  '작성중': 'hsl(220,15%,40%)',
  '승인대기': 'hsl(35,90%,55%)',
  '승인완료': 'hsl(150,80%,45%)',
  '반려': 'hsl(0,75%,55%)',
};

export default function SubRegionMap() {
  const { profile } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const { data: region } = useQuery({
    queryKey: ['my-region', profile?.assigned_region],
    queryFn: async () => {
      if (!profile?.assigned_region) return null;
      const { data } = await supabase.from('regions').select('*').eq('id', profile.assigned_region).single();
      return data;
    },
    enabled: !!profile?.assigned_region,
  });

  const { data: missions = [] } = useQuery({
    queryKey: ['my-region-missions', profile?.assigned_region],
    queryFn: async () => {
      if (!profile?.assigned_region) return [];
      const { data } = await supabase.from('missions').select('*').eq('region_id', profile.assigned_region);
      return data || [];
    },
    enabled: !!profile?.assigned_region,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !region) return;
    const bounds: L.LatLngBoundsExpression = [
      [region.bounds_south, region.bounds_west],
      [region.bounds_north, region.bounds_east],
    ];
    const map = L.map(containerRef.current, { zoomControl: true }).setView([region.center_lat, region.center_lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    map.setMaxBounds(bounds);
    map.fitBounds(bounds);
    L.rectangle(bounds, { color: 'hsl(150,80%,45%)', weight: 2, fillOpacity: 0.05, dashArray: '8 4' }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [region]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    missions.forEach(m => {
      L.marker([m.latitude, m.longitude], {
        icon: L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${statusColors[m.status] || 'gray'};border:2px solid white;"></div>`,
          className: '',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(map).bindPopup(`<div class="text-sm"><strong>${m.title}</strong><br/>상태: ${m.status}<br/>${m.floor}층</div>`);
    });
  }, [missions]);

  if (!profile?.assigned_region) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
        <Card className="bg-card border-border max-w-sm">
          <CardContent className="py-8 text-center text-muted-foreground">
            배정된 지역이 없습니다. 메인 관리자에게 문의하세요.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3rem)] relative">
      {region && (
        <div className="absolute top-3 left-3 z-[1000] bg-card/90 backdrop-blur rounded-lg px-3 py-1.5 border border-border">
          <span className="text-sm font-bold text-primary">{region.name}</span>
        </div>
      )}
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
        {Object.entries(statusColors).map(([status, color]) => (
          <Badge key={status} variant="outline" className="bg-card/80 backdrop-blur text-xs">
            <div className="w-2 h-2 rounded-full mr-1" style={{ background: color }} />
            {status}
          </Badge>
        ))}
      </div>
    </div>
  );
}
