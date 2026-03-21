import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
  const spotLayerRef = useRef<L.LayerGroup | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { data: spots } = useQuery({
    queryKey: ['all-spots'],
    queryFn: async () => {
      const { data } = await supabase.from('spots').select('*');
      return data || [];
    },
  });

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const { data } = await supabase.from('themes').select('*');
      return data || [];
    },
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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([37.5665, 126.978], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM',
    }).addTo(map);
    spotLayerRef.current = L.layerGroup().addTo(map);
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

  // Draw spot rectangles
  useEffect(() => {
    const map = mapRef.current;
    const layer = spotLayerRef.current;
    if (!map || !layer || !spots) return;

    layer.clearLayers();
    const themeMap = new Map((themes || []).map(t => [t.id, t]));

    spots.forEach(spot => {
      if (spot.bounds_north == null || spot.bounds_south == null || spot.bounds_east == null || spot.bounds_west == null) return;

      const theme = spot.theme_id ? themeMap.get(spot.theme_id) : null;
      const color = theme?.color_primary || '#7b8da6';

      const rect = L.rectangle(
        [[spot.bounds_south, spot.bounds_west], [spot.bounds_north, spot.bounds_east]],
        { color, weight: 2, fillOpacity: 0.2 }
      );

      rect.bindTooltip(spot.name, { permanent: false, direction: 'center' });

      rect.on('click', () => {
        if (spot.theme_id) {
          // Has theme → go to spot management
          navigate(`/admin/exodus/spots?spotId=${spot.id}`);
        } else {
          // No theme → show theme picker popup
          const themeOptions = (themes || [])
            .filter(t => t.is_active)
            .map(t => `<option value="${t.id}">${t.name} (${t.category})</option>`)
            .join('');

          const popupContent = document.createElement('div');
          popupContent.innerHTML = `
            <div style="min-width:200px;">
              <strong style="font-size:14px;">${spot.name}</strong>
              <p style="color:#888;font-size:12px;margin:4px 0 8px;">테마를 선택해주세요</p>
              <select id="theme-select-${spot.id}" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;margin-bottom:8px;">
                <option value="">테마 선택...</option>
                ${themeOptions}
              </select>
              <button id="theme-save-${spot.id}" style="width:100%;padding:6px 12px;background:#d4a843;color:#0f1d32;border:none;border-radius:4px;font-weight:600;cursor:pointer;">
                설정 후 관리 페이지로 이동
              </button>
            </div>
          `;

          const popup = rect.bindPopup(popupContent, { maxWidth: 260 }).openPopup();

          setTimeout(() => {
            const btn = document.getElementById(`theme-save-${spot.id}`);
            btn?.addEventListener('click', () => {
              const select = document.getElementById(`theme-select-${spot.id}`) as HTMLSelectElement;
              const themeId = select?.value;
              if (!themeId) {
                toast({ title: '테마를 선택해주세요', variant: 'destructive' });
                return;
              }
              updateThemeMutation.mutate(
                { spotId: spot.id, themeId },
                { onSuccess: () => {
                  map.closePopup();
                  navigate(`/admin/exodus/spots?spotId=${spot.id}`);
                }}
              );
            });
          }, 50);
        }
      });

      rect.addTo(layer);
    });
  }, [spots, themes, navigate, updateThemeMutation]);

  return (
    <div className="h-[calc(100vh-3rem)]">
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
