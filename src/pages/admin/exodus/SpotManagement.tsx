import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, MapPin, Palette } from 'lucide-react';
import { GoogleMap, Rectangle } from '@react-google-maps/api';
import SpotDetail from '@/components/admin/exodus/SpotDetail';

interface Spot {
  id: string; name: string; description: string | null;
  bounds_north: number | null; bounds_south: number | null;
  bounds_east: number | null; bounds_west: number | null;
  creator_id: string | null; theme_id: string | null;
  is_active: boolean; latitude: number; longitude: number;
}

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 37.5665, lng: 126.978 };

export default function SpotManagement() {
  const { user, isMainAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapRef = useRef<google.maps.Map | null>(null);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingBounds, setPendingBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(false);

  // Drawing state
  const drawStartRef = useRef<google.maps.LatLng | null>(null);
  const drawRectRef = useRef<google.maps.Rectangle | null>(null);

  const fetchSpots = useCallback(async () => {
    const { data, error } = await supabase.from('spots').select('*');
    if (error) { toast({ title: '스팟 로드 실패', description: error.message, variant: 'destructive' }); return; }
    setSpots((data as Spot[]) || []);
  }, []);

  useEffect(() => { fetchSpots(); }, [fetchSpots]);

  // Auto-select spot from URL
  useEffect(() => {
    const spotId = searchParams.get('spotId');
    if (spotId && spots.length > 0 && !selectedSpot) {
      const target = spots.find(s => s.id === spotId);
      if (target) { setSelectedSpot(target); setSearchParams({}, { replace: true }); }
    }
  }, [spots, searchParams, selectedSpot, setSearchParams]);

  // Drawing handlers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isDrawing) return;

    const mouseDownListener = map.addListener('mousedown', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      drawStartRef.current = e.latLng;
      map.setOptions({ draggable: false });
    });

    const mouseMoveListener = map.addListener('mousemove', (e: google.maps.MapMouseEvent) => {
      if (!drawStartRef.current || !e.latLng) return;
      const bounds = {
        north: Math.max(drawStartRef.current.lat(), e.latLng.lat()),
        south: Math.min(drawStartRef.current.lat(), e.latLng.lat()),
        east: Math.max(drawStartRef.current.lng(), e.latLng.lng()),
        west: Math.min(drawStartRef.current.lng(), e.latLng.lng()),
      };
      if (drawRectRef.current) {
        drawRectRef.current.setBounds(bounds);
      } else {
        drawRectRef.current = new google.maps.Rectangle({
          bounds,
          map,
          strokeColor: '#d4a843',
          strokeWeight: 2,
          fillOpacity: 0.25,
          fillColor: '#d4a843',
          clickable: false,
        });
      }
    });

    const mouseUpListener = map.addListener('mouseup', (e: google.maps.MapMouseEvent) => {
      map.setOptions({ draggable: true });
      if (!drawStartRef.current || !e.latLng) return;
      const bounds = {
        north: Math.max(drawStartRef.current.lat(), e.latLng.lat()),
        south: Math.min(drawStartRef.current.lat(), e.latLng.lat()),
        east: Math.max(drawStartRef.current.lng(), e.latLng.lng()),
        west: Math.min(drawStartRef.current.lng(), e.latLng.lng()),
      };
      drawStartRef.current = null;

      if (Math.abs(bounds.north - bounds.south) < 0.0001 || Math.abs(bounds.east - bounds.west) < 0.0001) {
        if (drawRectRef.current) { drawRectRef.current.setMap(null); drawRectRef.current = null; }
        return;
      }

      setPendingBounds(bounds);
      setShowForm(true);
      setIsDrawing(false);
    });

    return () => {
      google.maps.event.removeListener(mouseDownListener);
      google.maps.event.removeListener(mouseMoveListener);
      google.maps.event.removeListener(mouseUpListener);
    };
  }, [isDrawing]);

  const handleSaveSpot = async () => {
    if (!pendingBounds || !formName.trim() || !user) return;
    setLoading(true);
    const centerLat = (pendingBounds.north + pendingBounds.south) / 2;
    const centerLng = (pendingBounds.east + pendingBounds.west) / 2;

    const { error } = await supabase.from('spots').insert({
      name: formName.trim(), description: formDesc.trim() || null,
      latitude: centerLat, longitude: centerLng,
      bounds_north: pendingBounds.north, bounds_south: pendingBounds.south,
      bounds_east: pendingBounds.east, bounds_west: pendingBounds.west,
      creator_id: user.id,
    });

    setLoading(false);
    if (error) { toast({ title: '저장 실패', description: error.message, variant: 'destructive' }); }
    else { toast({ title: '스팟 생성 완료' }); resetForm(); fetchSpots(); }
  };

  const handleDeleteSpot = async (spotId: string) => {
    if (!confirm('이 스팟을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('spots').delete().eq('id', spotId);
    if (error) { toast({ title: '삭제 실패', description: error.message, variant: 'destructive' }); }
    else { toast({ title: '스팟 삭제 완료' }); if (selectedSpot?.id === spotId) setSelectedSpot(null); fetchSpots(); }
  };

  const resetForm = () => {
    setShowForm(false); setPendingBounds(null); setFormName(''); setFormDesc('');
    if (drawRectRef.current) { drawRectRef.current.setMap(null); drawRectRef.current = null; }
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    if (drawRectRef.current) { drawRectRef.current.setMap(null); drawRectRef.current = null; }
    drawStartRef.current = null;
  };

  const focusSpot = (spot: Spot) => {
    if (!mapRef.current) return;
    if (spot.bounds_north != null && spot.bounds_south != null && spot.bounds_east != null && spot.bounds_west != null) {
      mapRef.current.fitBounds({ north: spot.bounds_north, south: spot.bounds_south, east: spot.bounds_east, west: spot.bounds_west }, 40);
    } else {
      mapRef.current.setCenter({ lat: spot.latitude, lng: spot.longitude });
      mapRef.current.setZoom(17);
    }
  };

  if (selectedSpot) {
    return <SpotDetail spot={selectedSpot} onBack={() => { setSelectedSpot(null); fetchSpots(); }} isMainAdmin={isMainAdmin} userId={user?.id || ''} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🗺️ 스팟 관리</h1>
          <p className="text-[15px] text-muted-foreground mt-1">지도에서 사각형을 드래그하여 스팟을 생성하세요</p>
        </div>
        <div className="flex gap-2">
          {isDrawing ? (
            <Button variant="outline" onClick={cancelDrawing} className="border-destructive text-destructive hover:bg-destructive/10">취소</Button>
          ) : (
            <Button onClick={() => setIsDrawing(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="w-4 h-4 mr-1" /> 스팟 생성
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 relative">
          <GoogleMap
            mapContainerStyle={{ ...containerStyle, cursor: isDrawing ? 'crosshair' : 'grab' }}
            center={defaultCenter}
            zoom={13}
            onLoad={map => { mapRef.current = map; }}
          >
            {spots.filter(s => s.bounds_north != null).map(spot => {
              const canEdit = isMainAdmin || spot.creator_id === user?.id;
              return (
                <Rectangle
                  key={spot.id}
                  bounds={{ north: spot.bounds_north!, south: spot.bounds_south!, east: spot.bounds_east!, west: spot.bounds_west! }}
                  options={{ strokeColor: canEdit ? '#d4a843' : '#7b8da6', strokeWeight: 2, fillOpacity: 0.15, fillColor: canEdit ? '#d4a843' : '#7b8da6' }}
                  onClick={() => { if (canEdit) setSelectedSpot(spot); }}
                />
              );
            })}
          </GoogleMap>

          {isDrawing && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow-lg z-10">
              지도에서 드래그하여 사각형 영역을 그리세요
            </div>
          )}

          {showForm && (
            <div className="absolute bottom-4 left-4 right-4 bg-card border border-border rounded-xl p-4 z-10 shadow-2xl">
              <h3 className="text-lg font-bold text-foreground mb-3">새 스팟 정보</h3>
              <Input placeholder="스팟 이름" value={formName} onChange={e => setFormName(e.target.value)} className="mb-2" />
              <Textarea placeholder="설명 (선택)" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="mb-3 resize-none" rows={2} />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={resetForm} className="text-muted-foreground">취소</Button>
                <Button onClick={handleSaveSpot} disabled={!formName.trim() || loading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {loading ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="w-72 border-l border-border bg-card overflow-y-auto">
          <div className="p-3 border-b border-border">
            <h2 className="text-[15px] font-semibold text-foreground">스팟 목록 ({spots.length})</h2>
          </div>
          {spots.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">아직 스팟이 없습니다</div>
          ) : (
            <div className="divide-y divide-border">
              {spots.map(spot => {
                const canEdit = isMainAdmin || spot.creator_id === user?.id;
                return (
                  <div key={spot.id} className="p-3 hover:bg-secondary transition-colors cursor-pointer" onClick={() => focusSpot(spot)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">{spot.name}</span>
                        </div>
                        {spot.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{spot.description}</p>}
                        <div className="flex gap-1 mt-1">
                          {spot.theme_id && <Badge className="text-[10px] bg-accent/20 text-accent border-0">테마</Badge>}
                          {!spot.is_active && <Badge className="text-[10px] bg-destructive/20 text-destructive border-0">비활성</Badge>}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={e => { e.stopPropagation(); setSelectedSpot(spot); }} className="p-1 text-muted-foreground hover:text-accent transition-colors" title="상세/테마 설정">
                            <Palette className="w-4 h-4" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDeleteSpot(spot.id); }} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="삭제">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
