import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Map, Rectangle, MapMarker } from 'react-kakao-maps-sdk';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const statusColors: Record<string, string> = {
  '작성중': '#5a6a80',
  '승인대기': '#e0952d',
  '승인완료': '#26b34a',
  '반려': '#dc3545',
};

const missionMarkerImage = (status: string) => {
  const color = statusColors[status]?.replace('#', '') || '888888';
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="7" cy="7" r="5" fill="#${color}" stroke="white" stroke-width="2"/></svg>`)}`;
};

export default function SubRegionMap() {
  const { profile } = useAuth();

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
        <div className="absolute top-3 left-3 z-10 bg-card/90 backdrop-blur rounded-lg px-3 py-1.5 border border-border">
          <span className="text-sm font-bold text-primary">{region.name}</span>
        </div>
      )}
      {region && (
        <Map
          center={{ lat: region.center_lat, lng: region.center_lng }}
          style={{ width: '100%', height: '100%' }}
          level={4}
        >
          <Rectangle
            bounds={{
              sw: { lat: region.bounds_south, lng: region.bounds_west },
              ne: { lat: region.bounds_north, lng: region.bounds_east },
            }}
            strokeWeight={2}
            strokeColor="hsl(150,80%,45%)"
            fillOpacity={0.05}
            strokeOpacity={1}
          />
          {missions.map(m => (
            <MapMarker
              key={m.id}
              position={{ lat: m.latitude, lng: m.longitude }}
              image={{ src: missionMarkerImage(m.status), size: { width: 14, height: 14 }, options: { offset: { x: 7, y: 7 } } }}
              title={`${m.title} (${m.status}) ${m.floor}층`}
            />
          ))}
        </Map>
      )}
      <div className="absolute bottom-3 left-3 z-10 flex gap-2">
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
