import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GoogleMap, Rectangle, Marker, InfoWindow } from '@react-google-maps/api';

const containerStyle = { width: '100%', height: '100%' };
const center = { lat: 37.5665, lng: 126.978 };

const missionIconUrl = (status: string) => {
  const color = status === '승인완료' ? '26b34a' : status === '승인대기' ? 'e0952d' : status === '반려' ? 'dc3545' : '7b8da6';
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"><circle cx="7" cy="7" r="5" fill="#${color}" stroke="white" stroke-width="2"/></svg>`)}`;
};

export default function GlobalMapView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [infoSpot, setInfoSpot] = useState<any>(null);
  const [selectedThemeId, setSelectedThemeId] = useState('');

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => { const { data } = await supabase.from('regions').select('*'); return data || []; },
  });

  const { data: missions } = useQuery({
    queryKey: ['all-missions'],
    queryFn: async () => { const { data } = await supabase.from('missions').select('*'); return data || []; },
  });

  const { data: spots } = useQuery({
    queryKey: ['all-spots'],
    queryFn: async () => { const { data } = await supabase.from('spots').select('*'); return data || []; },
  });

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => { const { data } = await supabase.from('themes').select('*'); return data || []; },
  });

  const updateThemeMutation = useMutation({
    mutationFn: async ({ spotId, themeId }: { spotId: string; themeId: string }) => {
      const { error } = await supabase.from('spots').update({ theme_id: themeId }).eq('id', spotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-spots'] });
      toast({ title: '테마 설정 완료' });
    },
    onError: (e: any) => {
      toast({ title: '테마 설정 실패', description: e.message, variant: 'destructive' });
    },
  });

  const themeMap = new Map((themes || []).map(t => [t.id, t]));

  const handleSpotClick = useCallback((spot: any) => {
    if (spot.theme_id) {
      navigate(`/admin/exodus/spots?spotId=${spot.id}`);
    } else {
      setInfoSpot(spot);
      setSelectedThemeId('');
    }
  }, [navigate]);

  const handleThemeSave = () => {
    if (!selectedThemeId || !infoSpot) {
      toast({ title: '테마를 선택해주세요', variant: 'destructive' });
      return;
    }
    updateThemeMutation.mutate(
      { spotId: infoSpot.id, themeId: selectedThemeId },
      { onSuccess: () => { setInfoSpot(null); navigate(`/admin/exodus/spots?spotId=${infoSpot.id}`); } }
    );
  };

  return (
    <div className="h-[calc(100vh-3rem)]">
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={11}>
        {/* Region rectangles */}
        {(regions || []).map(r => (
          <Rectangle
            key={r.id}
            bounds={{ north: r.bounds_north, south: r.bounds_south, east: r.bounds_east, west: r.bounds_west }}
            options={{ strokeColor: 'hsl(150,80%,45%)', strokeWeight: 2, fillOpacity: 0.1, fillColor: 'hsl(150,80%,45%)', clickable: false }}
          />
        ))}

        {/* Mission markers */}
        {(missions || []).map(m => (
          <Marker
            key={m.id}
            position={{ lat: m.latitude, lng: m.longitude }}
            icon={{ url: missionIconUrl(m.status), scaledSize: new google.maps.Size(14, 14), anchor: new google.maps.Point(7, 7) }}
            title={`${m.title} (${m.status})`}
          />
        ))}

        {/* Spot rectangles */}
        {(spots || []).filter(s => s.bounds_north != null).map(spot => {
          const theme = spot.theme_id ? themeMap.get(spot.theme_id) : null;
          const color = theme?.color_primary || '#7b8da6';
          return (
            <Rectangle
              key={spot.id}
              bounds={{ north: spot.bounds_north!, south: spot.bounds_south!, east: spot.bounds_east!, west: spot.bounds_west! }}
              options={{ strokeColor: color, strokeWeight: 2, fillOpacity: 0.2, fillColor: color, clickable: true }}
              onClick={() => handleSpotClick(spot)}
            />
          );
        })}

        {/* Theme picker InfoWindow */}
        {infoSpot && (
          <InfoWindow
            position={{ lat: infoSpot.latitude, lng: infoSpot.longitude }}
            onCloseClick={() => setInfoSpot(null)}
          >
            <div style={{ minWidth: 200 }}>
              <strong style={{ fontSize: 14 }}>{infoSpot.name}</strong>
              <p style={{ color: '#888', fontSize: 12, margin: '4px 0 8px' }}>테마를 선택해주세요</p>
              <select
                value={selectedThemeId}
                onChange={e => setSelectedThemeId(e.target.value)}
                style={{ width: '100%', padding: 6, border: '1px solid #ccc', borderRadius: 4, marginBottom: 8 }}
              >
                <option value="">테마 선택...</option>
                {(themes || []).filter(t => t.is_active).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                ))}
              </select>
              <button
                onClick={handleThemeSave}
                style={{ width: '100%', padding: '6px 12px', background: '#d4a843', color: '#0f1d32', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
              >
                설정 후 관리 페이지로 이동
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
