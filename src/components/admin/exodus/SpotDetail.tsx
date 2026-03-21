import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Puzzle, BookOpen, Sparkles } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Spot {
  id: string;
  name: string;
  description: string | null;
  bounds_north: number | null;
  bounds_south: number | null;
  bounds_east: number | null;
  bounds_west: number | null;
  creator_id: string | null;
  theme_id: string | null;
  is_active: boolean;
  latitude: number;
  longitude: number;
}

interface Theme {
  id: string;
  name: string;
  category: string;
  color_primary: string | null;
}

interface ThemeElement {
  id: string;
  title: string;
  element_type: string;
  icon: string | null;
  description: string | null;
  theme_id: string;
}

interface SpotElement {
  id: string;
  spot_id: string;
  theme_element_id: string;
  latitude: number;
  longitude: number;
  creator_id: string;
}

interface Props {
  spot: Spot;
  onBack: () => void;
  isMainAdmin: boolean;
  userId: string;
}

const elementTypeIcons: Record<string, typeof Package> = {
  item: Package,
  quiz: Puzzle,
  puzzle: Puzzle,
  story: BookOpen,
};

const elementTypeLabels: Record<string, string> = {
  item: '아이템',
  quiz: '퀴즈',
  puzzle: '퍼즐',
  story: '스토리',
};

export default function SpotDetail({ spot, onBack, isMainAdmin, userId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(spot.theme_id);
  const [themeElements, setThemeElements] = useState<ThemeElement[]>([]);
  const [spotElements, setSpotElements] = useState<SpotElement[]>([]);
  const [placingElement, setPlacingElement] = useState<ThemeElement | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch themes
  useEffect(() => {
    supabase.from('themes').select('id,name,category,color_primary').eq('is_active', true)
      .then(({ data }) => setThemes(data || []));
  }, []);

  // Fetch theme elements when theme changes
  useEffect(() => {
    if (!selectedThemeId) { setThemeElements([]); return; }
    supabase.from('theme_elements').select('*').eq('theme_id', selectedThemeId)
      .then(({ data }) => setThemeElements((data as ThemeElement[]) || []));
  }, [selectedThemeId]);

  // Fetch placed elements
  const fetchSpotElements = useCallback(async () => {
    const { data } = await supabase.from('spot_elements').select('*').eq('spot_id', spot.id);
    setSpotElements((data as SpotElement[]) || []);
  }, [spot.id]);

  useEffect(() => { fetchSpotElements(); }, [fetchSpotElements]);

  // Save theme to spot
  const saveTheme = async (themeId: string | null) => {
    setSelectedThemeId(themeId);
    await supabase.from('spots').update({ theme_id: themeId }).eq('id', spot.id);
  };

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const center: L.LatLngExpression = [spot.latitude, spot.longitude];
    const map = L.map(mapRef.current).setView(center, 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    // Draw spot boundary
    if (spot.bounds_north != null) {
      const bounds = L.latLngBounds(
        [spot.bounds_south!, spot.bounds_west!],
        [spot.bounds_north!, spot.bounds_east!]
      );
      L.rectangle(bounds, {
        color: '#d4a843', weight: 2, fillOpacity: 0.1, dashArray: '6 4',
      }).addTo(map);
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, [spot]);

  // Draw element markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    spotElements.forEach(se => {
      const te = themeElements.find(t => t.id === se.theme_element_id);
      const label = te ? te.title : '요소';
      const typeLabel = te ? (elementTypeLabels[te.element_type] || te.element_type) : '';

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#d4a843;color:#0f1d32;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${typeLabel}: ${label}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([se.latitude, se.longitude], { icon, draggable: true }).addTo(map);

      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        // Bounds check
        if (spot.bounds_north != null) {
          if (pos.lat > spot.bounds_north || pos.lat < spot.bounds_south! ||
              pos.lng > spot.bounds_east! || pos.lng < spot.bounds_west!) {
            toast({ title: '스팟 경계를 벗어났습니다', variant: 'destructive' });
            marker.setLatLng([se.latitude, se.longitude]);
            return;
          }
        }
        await supabase.from('spot_elements').update({ latitude: pos.lat, longitude: pos.lng }).eq('id', se.id);
        fetchSpotElements();
      });

      marker.on('contextmenu', async () => {
        if (!confirm(`"${label}" 요소를 제거하시겠습니까?`)) return;
        await supabase.from('spot_elements').delete().eq('id', se.id);
        fetchSpotElements();
      });

      markersRef.current.set(se.id, marker);
    });
  }, [spotElements, themeElements, spot]);

  // Place element on map click
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !placingElement) return;

    const handler = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      // Bounds check
      if (spot.bounds_north != null) {
        if (lat > spot.bounds_north || lat < spot.bounds_south! ||
            lng > spot.bounds_east! || lng < spot.bounds_west!) {
          toast({ title: '스팟 경계 안에만 배치할 수 있습니다', variant: 'destructive' });
          return;
        }
      }

      setLoading(true);
      const { error } = await supabase.from('spot_elements').insert({
        spot_id: spot.id,
        theme_element_id: placingElement.id,
        latitude: lat,
        longitude: lng,
        creator_id: userId,
      });
      setLoading(false);

      if (error) {
        toast({ title: '배치 실패', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: `"${placingElement.title}" 배치 완료` });
        setPlacingElement(null);
        fetchSpotElements();
      }
    };

    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [placingElement, spot, userId, fetchSpotElements]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#1e2d4a]">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-[#7b8da6] hover:text-[#e8e0d0]">
          <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
        </Button>
        <div>
          <h1 className="text-xl font-bold text-[#e8e0d0]">{spot.name}</h1>
          {spot.description && <p className="text-sm text-[#7b8da6]">{spot.description}</p>}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" style={{ cursor: placingElement ? 'crosshair' : 'grab' }} />
          {placingElement && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#d4a843] text-[#0f1d32] px-4 py-2 rounded-lg text-sm font-semibold shadow-lg z-[1000] flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              "{placingElement.title}" 배치할 위치를 클릭하세요
              <Button size="sm" variant="ghost" onClick={() => setPlacingElement(null)} className="ml-2 text-[#0f1d32] hover:bg-[#c49a3a]">
                취소
              </Button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-80 border-l border-[#1e2d4a] bg-[#0a1628] overflow-y-auto">
          {/* Theme selector */}
          <div className="p-3 border-b border-[#1e2d4a]">
            <h3 className="text-sm font-semibold text-[#e8e0d0] mb-2">테마 선택</h3>
            <select
              value={selectedThemeId || ''}
              onChange={e => saveTheme(e.target.value || null)}
              className="w-full bg-[#162340] border border-[#1e2d4a] text-[#e8e0d0] rounded-md px-3 py-2 text-sm"
            >
              <option value="">테마 없음</option>
              {themes.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
            </select>
          </div>

          {/* Theme elements to place */}
          {selectedThemeId && (
            <div className="p-3 border-b border-[#1e2d4a]">
              <h3 className="text-sm font-semibold text-[#e8e0d0] mb-2">테마 요소 배치</h3>
              {themeElements.length === 0 ? (
                <p className="text-xs text-[#7b8da6]">이 테마에 등록된 요소가 없습니다</p>
              ) : (
                <div className="space-y-1.5">
                  {themeElements.map(te => {
                    const Icon = elementTypeIcons[te.element_type] || Package;
                    const isPlacing = placingElement?.id === te.id;
                    return (
                      <button
                        key={te.id}
                        onClick={() => setPlacingElement(isPlacing ? null : te)}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isPlacing
                            ? 'bg-[#d4a843] text-[#0f1d32] font-semibold'
                            : 'bg-[#162340] text-[#e8e0d0] hover:bg-[#1e2d4a]'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate flex-1">{te.title}</span>
                        <Badge className="text-[10px] border-0 bg-[#0f1d32]/30 text-[#7b8da6]">
                          {elementTypeLabels[te.element_type] || te.element_type}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Placed elements list */}
          <div className="p-3">
            <h3 className="text-sm font-semibold text-[#e8e0d0] mb-2">
              배치된 요소 ({spotElements.length})
            </h3>
            {spotElements.length === 0 ? (
              <p className="text-xs text-[#7b8da6]">배치된 요소가 없습니다. 위에서 요소를 선택 후 지도를 클릭하세요.</p>
            ) : (
              <div className="space-y-1.5">
                {spotElements.map(se => {
                  const te = themeElements.find(t => t.id === se.theme_element_id);
                  return (
                    <div key={se.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-[#162340] rounded-lg text-sm">
                      <span className="text-[#e8e0d0] truncate">{te?.title || '알 수 없음'}</span>
                      <button
                        onClick={async () => {
                          await supabase.from('spot_elements').delete().eq('id', se.id);
                          fetchSpotElements();
                        }}
                        className="text-[#7b8da6] hover:text-red-400 text-xs shrink-0"
                      >
                        제거
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-[#7b8da6] mt-3">💡 마커를 드래그하여 위치 변경, 우클릭으로 제거</p>
          </div>
        </div>
      </div>
    </div>
  );
}
