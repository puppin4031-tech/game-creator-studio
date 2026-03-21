import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Puzzle, BookOpen, Sparkles } from 'lucide-react';
import { GoogleMap, Rectangle, Marker } from '@react-google-maps/api';

interface Spot {
  id: string; name: string; description: string | null;
  bounds_north: number | null; bounds_south: number | null;
  bounds_east: number | null; bounds_west: number | null;
  creator_id: string | null; theme_id: string | null;
  is_active: boolean; latitude: number; longitude: number;
}

interface Theme { id: string; name: string; category: string; color_primary: string | null; }
interface ThemeElement { id: string; title: string; element_type: string; icon: string | null; description: string | null; theme_id: string; }
interface SpotElement { id: string; spot_id: string; theme_element_id: string; latitude: number; longitude: number; creator_id: string; }

interface Props { spot: Spot; onBack: () => void; isMainAdmin: boolean; userId: string; }

const elementTypeIcons: Record<string, typeof Package> = { item: Package, quiz: Puzzle, puzzle: Puzzle, story: BookOpen };
const elementTypeLabels: Record<string, string> = { item: '아이템', quiz: '퀴즈', puzzle: '퍼즐', story: '스토리' };
const containerStyle = { width: '100%', height: '100%' };

export default function SpotDetail({ spot, onBack, isMainAdmin, userId }: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(spot.theme_id);
  const [themeElements, setThemeElements] = useState<ThemeElement[]>([]);
  const [spotElements, setSpotElements] = useState<SpotElement[]>([]);
  const [placingElement, setPlacingElement] = useState<ThemeElement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('themes').select('id,name,category,color_primary').eq('is_active', true)
      .then(({ data }) => setThemes(data || []));
  }, []);

  useEffect(() => {
    if (!selectedThemeId) { setThemeElements([]); return; }
    supabase.from('theme_elements').select('*').eq('theme_id', selectedThemeId)
      .then(({ data }) => setThemeElements((data as ThemeElement[]) || []));
  }, [selectedThemeId]);

  const fetchSpotElements = useCallback(async () => {
    const { data } = await supabase.from('spot_elements').select('*').eq('spot_id', spot.id);
    setSpotElements((data as SpotElement[]) || []);
  }, [spot.id]);

  useEffect(() => { fetchSpotElements(); }, [fetchSpotElements]);

  const saveTheme = async (themeId: string | null) => {
    setSelectedThemeId(themeId);
    await supabase.from('spots').update({ theme_id: themeId }).eq('id', spot.id);
  };

  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!placingElement || !e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (spot.bounds_north != null) {
      if (lat > spot.bounds_north || lat < spot.bounds_south! || lng > spot.bounds_east! || lng < spot.bounds_west!) {
        toast({ title: '스팟 경계 안에만 배치할 수 있습니다', variant: 'destructive' });
        return;
      }
    }

    setLoading(true);
    const { error } = await supabase.from('spot_elements').insert({
      spot_id: spot.id, theme_element_id: placingElement.id, latitude: lat, longitude: lng, creator_id: userId,
    });
    setLoading(false);

    if (error) { toast({ title: '배치 실패', description: error.message, variant: 'destructive' }); }
    else { toast({ title: `"${placingElement.title}" 배치 완료` }); setPlacingElement(null); fetchSpotElements(); }
  }, [placingElement, spot, userId, fetchSpotElements]);

  const handleMarkerDragEnd = useCallback(async (se: SpotElement, e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (spot.bounds_north != null) {
      if (lat > spot.bounds_north || lat < spot.bounds_south! || lng > spot.bounds_east! || lng < spot.bounds_west!) {
        toast({ title: '스팟 경계를 벗어났습니다', variant: 'destructive' });
        fetchSpotElements(); // reset position
        return;
      }
    }
    await supabase.from('spot_elements').update({ latitude: lat, longitude: lng }).eq('id', se.id);
    fetchSpotElements();
  }, [spot, fetchSpotElements]);

  const handleMarkerRightClick = useCallback(async (se: SpotElement) => {
    const te = themeElements.find(t => t.id === se.theme_element_id);
    if (!confirm(`"${te?.title || '요소'}" 요소를 제거하시겠습니까?`)) return;
    await supabase.from('spot_elements').delete().eq('id', se.id);
    fetchSpotElements();
  }, [themeElements, fetchSpotElements]);

  const makeMarkerIcon = (te: ThemeElement | undefined) => {
    const typeLabel = te ? (elementTypeLabels[te.element_type] || te.element_type) : '';
    const label = te ? te.title : '요소';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="28">
      <rect width="120" height="28" rx="6" fill="#d4a843"/>
      <text x="60" y="18" text-anchor="middle" fill="#0f1d32" font-size="11" font-weight="600">${typeLabel}: ${label}</text>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{spot.name}</h1>
          {spot.description && <p className="text-sm text-muted-foreground">{spot.description}</p>}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 relative">
          <GoogleMap
            mapContainerStyle={{ ...containerStyle, cursor: placingElement ? 'crosshair' : 'grab' }}
            center={{ lat: spot.latitude, lng: spot.longitude }}
            zoom={17}
            onLoad={map => {
              mapRef.current = map;
              if (spot.bounds_north != null) {
                map.fitBounds({ north: spot.bounds_north, south: spot.bounds_south!, east: spot.bounds_east!, west: spot.bounds_west! }, 30);
              }
            }}
            onClick={handleMapClick}
          >
            {spot.bounds_north != null && (
              <Rectangle
                bounds={{ north: spot.bounds_north, south: spot.bounds_south!, east: spot.bounds_east!, west: spot.bounds_west! }}
                options={{ strokeColor: '#d4a843', strokeWeight: 2, fillOpacity: 0.1, fillColor: '#d4a843', clickable: false }}
              />
            )}
            {spotElements.map(se => {
              const te = themeElements.find(t => t.id === se.theme_element_id);
              return (
                <Marker
                  key={se.id}
                  position={{ lat: se.latitude, lng: se.longitude }}
                  draggable
                  icon={{ url: makeMarkerIcon(te), scaledSize: new google.maps.Size(120, 28), anchor: new google.maps.Point(60, 14) }}
                  onDragEnd={e => handleMarkerDragEnd(se, e)}
                  onRightClick={() => handleMarkerRightClick(se)}
                />
              );
            })}
          </GoogleMap>

          {placingElement && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-lg z-10 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              "{placingElement.title}" 배치할 위치를 클릭하세요
              <Button size="sm" variant="ghost" onClick={() => setPlacingElement(null)} className="ml-2">취소</Button>
            </div>
          )}
        </div>

        <div className="w-80 border-l border-border bg-card overflow-y-auto">
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">테마 선택</h3>
            <select
              value={selectedThemeId || ''}
              onChange={e => saveTheme(e.target.value || null)}
              className="w-full bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-sm"
            >
              <option value="">테마 없음</option>
              {themes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
            </select>
          </div>

          {selectedThemeId && (
            <div className="p-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2">테마 요소 배치</h3>
              {themeElements.length === 0 ? (
                <p className="text-xs text-muted-foreground">이 테마에 등록된 요소가 없습니다</p>
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
                          isPlacing ? 'bg-accent text-accent-foreground font-semibold' : 'bg-secondary text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate flex-1">{te.title}</span>
                        <Badge className="text-[10px] border-0 bg-background/30 text-muted-foreground">
                          {elementTypeLabels[te.element_type] || te.element_type}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="p-3">
            <h3 className="text-sm font-semibold text-foreground mb-2">배치된 요소 ({spotElements.length})</h3>
            {spotElements.length === 0 ? (
              <p className="text-xs text-muted-foreground">배치된 요소가 없습니다. 위에서 요소를 선택 후 지도를 클릭하세요.</p>
            ) : (
              <div className="space-y-1.5">
                {spotElements.map(se => {
                  const te = themeElements.find(t => t.id === se.theme_element_id);
                  return (
                    <div key={se.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-secondary rounded-lg text-sm">
                      <span className="text-foreground truncate">{te?.title || '알 수 없음'}</span>
                      <button
                        onClick={async () => { await supabase.from('spot_elements').delete().eq('id', se.id); fetchSpotElements(); }}
                        className="text-muted-foreground hover:text-destructive text-xs shrink-0"
                      >제거</button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-3">💡 마커를 드래그하여 위치 변경, 우클릭으로 제거</p>
          </div>
        </div>
      </div>
    </div>
  );
}
