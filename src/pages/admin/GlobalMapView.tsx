import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Map, Rectangle, MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk';

const center = { lat: 37.5665, lng: 126.978 };

const missionMarkerImage = (status: string) => {
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

  const themeMap = new window.Map((themes || []).map(t => [t.id, t]));

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
      <Map center={center} style={{ width: '100%', height: '100%' }} level={8}>
        {(regions || []).map(r => (
          <Rectangle
            key={r.id}
            bounds={{
              sw: { lat: r.bounds_south, lng: r.bounds_west },
              ne: { lat: r.bounds_north, lng: r.bounds_east },
            }}
            strokeWeight={2}
            strokeColor="hsl(150,80%,45%)"
            fillColor="hsl(150,80%,45%)"
            fillOpacity={0.1}
          />
        ))}

        {(missions || []).map(m => (
          <MapMarker
            key={m.id}
            position={{ lat: m.latitude, lng: m.longitude }}
            image={{ src: missionMarkerImage(m.status), size: { width: 14, height: 14 }, options: { offset: { x: 7, y: 7 } } }}
            title={`${m.title} (${m.status})`}
          />
        ))}

        {(spots || []).filter(s => s.bounds_north != null).map(spot => {
          const theme = spot.theme_id ? themeMap.get(spot.theme_id) : null;
          const color = theme?.color_primary || '#7b8da6';
          return (
            <Rectangle
              key={spot.id}
              bounds={{
                sw: { lat: spot.bounds_south!, lng: spot.bounds_west! },
                ne: { lat: spot.bounds_north!, lng: spot.bounds_east! },
              }}
              strokeWeight={2}
              strokeColor={color}
              fillColor={color}
              fillOpacity={0.2}
              onClick={() => handleSpotClick(spot)}
            />
          );
        })}

        {infoSpot && (
          <CustomOverlayMap position={{ lat: infoSpot.latitude, lng: infoSpot.longitude }} zIndex={50}>
            <div style={{ minWidth: 200, background: 'white', borderRadius: 8, padding: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 14 }}>{infoSpot.name}</strong>
                <button onClick={() => setInfoSpot(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
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
                style={{ width: '100%', padding: '6px 12px', background: 'hsl(35 90% 50%)', color: 'hsl(220 20% 10%)', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
              >
                설정 후 관리 페이지로 이동
              </button>
            </div>
          </CustomOverlayMap>
        )}
      </Map>
    </div>
  );
}
