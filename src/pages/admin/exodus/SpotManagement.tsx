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
import { Map, Rectangle } from 'react-kakao-maps-sdk';
import SpotDetail from '@/components/admin/exodus/SpotDetail';

interface Spot {
  id: string; name: string; description: string | null;
  bounds_north: number | null; bounds_south: number | null;
  bounds_east: number | null; bounds_west: number | null;
  creator_id: string | null; theme_id: string | null;
  is_active: boolean; latitude: number; longitude: number;
}

const defaultCenter = { lat: 37.5665, lng: 126.978 };

export default function SpotManagement() {
  const { user, isMainAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const mapRef = useRef<kakao.maps.Map | null>(null);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingBounds, setPendingBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(false);

  // Drawing state
  const drawStartRef = useRef<{ lat: number; lng: number } | null>(null);
  const drawRectRef = useRef<kakao.maps.Rectangle | null>(null);

  const fetchSpots = useCallback(async () => {
    const { data, error } = await supabase.from('spots').select('*');
    if (error) { toast({ title: '스팟 로드 실패', description: error.message, variant: 'destructive' }); return; }
    setSpots((data as Spot[]) || []);
  }, []);

  useEffect(() => { fetchSpots(); }, [fetchSpots]);

  useEffect(() => {
    const spotId = searchParams.get('spotId');
    if (spotId && spots.length > 0 && !selectedSpot) {
      const target = spots.find(s => s.id === spotId);
      if (target) { setSelectedSpot(target); setSearchParams({}, { replace: true }); }
    }
  }, [spots, searchParams, selectedSpot, setSearchParams]);

  // Drawing handlers using kakao.maps events
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isDrawing) return;

    const listeners: any[] = [];

    listeners.push(kakao.maps.event.addListener(map, 'mousedown', (e: kakao.maps.event.MouseEvent) => {
      const latlng = e.latLng;
      drawStartRef.current = { lat: latlng.getLat(), lng: latlng.getLng() };
      map.setDraggable(false);
    }));

    listeners.push(kakao.maps.event.addListener(map, 'mousemove', (e: kakao.maps.event.MouseEvent) => {
      if (!drawStartRef.current) return;
      const latlng = e.latLng;
      const bounds = new kakao.maps.LatLngBounds(
        new kakao.maps.LatLng(
          Math.min(drawStartRef.current.lat, latlng.getLat()),
          Math.min(drawStartRef.current.lng, latlng.getLng())
        ),
        new kakao.maps.LatLng(
          Math.max(drawStartRef.current.lat, latlng.getLat()),
          Math.max(drawStartRef.current.lng, latlng.getLng())
        )
      );
      if (drawRectRef.current) {
        drawRectRef.current.setBounds(bounds);
      } else {
        drawRectRef.current = new kakao.maps.Rectangle({
          bounds,
          strokeWeight: 2,
          strokeColor: '#d4a843',
          fillColor: '#d4a843',
          fillOpacity: 0.25,
        });
        drawRectRef.current.setMap(map);
      }
    }));

    listeners.push(kakao.maps.event.addListener(map, 'mouseup', (e: kakao.maps.event.MouseEvent) => {
      map.setDraggable(true);
      if (!drawStartRef.current) return;
      const latlng = e.latLng;
      const bounds = {
        north: Math.max(drawStartRef.current.lat, latlng.getLat()),
        south: Math.min(drawStartRef.current.lat, latlng.getLat()),
        east: Math.max(drawStartRef.current.lng, latlng.getLng()),
        west: Math.min(drawStartRef.current.lng, latlng.getLng()),
      };
      drawStartRef.current = null;

      if (Math.abs(bounds.north - bounds.south) < 0.0001 || Math.abs(bounds.east - bounds.west) < 0.0001) {
        if (drawRectRef.current) { drawRectRef.current.setMap(null); drawRectRef.current = null; }
        return;
      }

      setPendingBounds(bounds);
      setShowForm(true);
      setIsDrawing(false);
    }));

    return () => {
      listeners.forEach(l => kakao.maps.event.removeListener(l));
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
      const bounds = new kakao.maps.LatLngBounds(
        new kakao.maps.LatLng(spot.bounds_south, spot.bounds_west),
        new kakao.maps.LatLng(spot.bounds_north, spot.bounds_east)
      );
      mapRef.current.setBounds(bounds);
    } else {
      mapRef.current.setCenter(new kakao.maps.LatLng(spot.latitude, spot.longitude));
      mapRef.current.setLevel(3);
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
          <Map
            center={defaultCenter}
            style={{ width: '100%', height: '100%', cursor: isDrawing ? 'crosshair' : 'grab' }}
            level={9}
            onCreate={map => { mapRef.current = map; }}
          >
            {spots.filter(s => s.bounds_north != null).map(spot => {
              const canEdit = isMainAdmin || spot.creator_id === user?.id;
              return (
                <Rectangle
                  key={spot.id}
                  bounds={{
                    sw: { lat: spot.bounds_south!, lng: spot.bounds_west! },
                    ne: { lat: spot.bounds_north!, lng: spot.bounds_east! },
                  }}
                  strokeWeight={2}
                  strokeColor={canEdit ? '#d4a843' : '#7b8da6'}
                  fillColor={canEdit ? '#d4a843' : '#7b8da6'}
                  fillOpacity={0.15}
                  onClick={() => { if (canEdit) setSelectedSpot(spot); }}
                />
              );
            })}
          </Map>

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
