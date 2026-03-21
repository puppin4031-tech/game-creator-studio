import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, MapPin, Eye, Palette } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import SpotDetail from '@/components/admin/exodus/SpotDetail';

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

export default function SpotManagement() {
  const { user, isMainAdmin } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const rectanglesRef = useRef<Map<string, L.Rectangle>>(new Map());
  const drawStartRef = useRef<L.LatLng | null>(null);
  const drawRectRef = useRef<L.Rectangle | null>(null);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingBounds, setPendingBounds] = useState<L.LatLngBounds | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch spots
  const fetchSpots = useCallback(async () => {
    const { data, error } = await supabase.from('spots').select('*');
    if (error) {
      toast({ title: '스팟 로드 실패', description: error.message, variant: 'destructive' });
      return;
    }
    setSpots((data as Spot[]) || []);
  }, []);

  useEffect(() => { fetchSpots(); }, [fetchSpots]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([37.5665, 126.978], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Draw rectangles for spots
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear old rectangles
    rectanglesRef.current.forEach(r => r.remove());
    rectanglesRef.current.clear();

    spots.forEach(spot => {
      if (spot.bounds_north == null || spot.bounds_south == null || spot.bounds_east == null || spot.bounds_west == null) return;
      const bounds = L.latLngBounds(
        [spot.bounds_south, spot.bounds_west],
        [spot.bounds_north, spot.bounds_east]
      );
      const canEdit = isMainAdmin || spot.creator_id === user?.id;
      const rect = L.rectangle(bounds, {
        color: canEdit ? '#d4a843' : '#7b8da6',
        weight: 2,
        fillOpacity: 0.15,
      }).addTo(map);

      rect.bindTooltip(spot.name, { permanent: false, direction: 'center' });
      rect.on('click', () => {
        if (canEdit) setSelectedSpot(spot);
      });
      rectanglesRef.current.set(spot.id, rect);
    });
  }, [spots, isMainAdmin, user?.id]);

  // Drawing handlers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      if (!isDrawing) return;
      drawStartRef.current = e.latlng;
      map.dragging.disable();
    };
    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (!isDrawing || !drawStartRef.current) return;
      const bounds = L.latLngBounds(drawStartRef.current, e.latlng);
      if (drawRectRef.current) {
        drawRectRef.current.setBounds(bounds);
      } else {
        drawRectRef.current = L.rectangle(bounds, {
          color: '#d4a843', weight: 2, fillOpacity: 0.25, dashArray: '6 4',
        }).addTo(map);
      }
    };
    const onMouseUp = (e: L.LeafletMouseEvent) => {
      if (!isDrawing || !drawStartRef.current) return;
      map.dragging.enable();
      const bounds = L.latLngBounds(drawStartRef.current, e.latlng);
      drawStartRef.current = null;

      // Minimum size check
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      if (Math.abs(ne.lat - sw.lat) < 0.0001 || Math.abs(ne.lng - sw.lng) < 0.0001) {
        if (drawRectRef.current) { drawRectRef.current.remove(); drawRectRef.current = null; }
        return;
      }

      setPendingBounds(bounds);
      setShowForm(true);
      setIsDrawing(false);
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
    };
  }, [isDrawing]);

  const handleSaveSpot = async () => {
    if (!pendingBounds || !formName.trim() || !user) return;
    setLoading(true);
    const ne = pendingBounds.getNorthEast();
    const sw = pendingBounds.getSouthWest();
    const center = pendingBounds.getCenter();

    const { error } = await supabase.from('spots').insert({
      name: formName.trim(),
      description: formDesc.trim() || null,
      latitude: center.lat,
      longitude: center.lng,
      bounds_north: ne.lat,
      bounds_south: sw.lat,
      bounds_east: ne.lng,
      bounds_west: sw.lng,
      creator_id: user.id,
    });

    setLoading(false);
    if (error) {
      toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '스팟 생성 완료' });
      resetForm();
      fetchSpots();
    }
  };

  const handleDeleteSpot = async (spotId: string) => {
    if (!confirm('이 스팟을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('spots').delete().eq('id', spotId);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '스팟 삭제 완료' });
      if (selectedSpot?.id === spotId) setSelectedSpot(null);
      fetchSpots();
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setPendingBounds(null);
    setFormName('');
    setFormDesc('');
    if (drawRectRef.current) { drawRectRef.current.remove(); drawRectRef.current = null; }
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    if (drawRectRef.current) { drawRectRef.current.remove(); drawRectRef.current = null; }
    drawStartRef.current = null;
  };

  const focusSpot = (spot: Spot) => {
    if (!mapInstance.current) return;
    if (spot.bounds_north != null && spot.bounds_south != null && spot.bounds_east != null && spot.bounds_west != null) {
      const bounds = L.latLngBounds(
        [spot.bounds_south, spot.bounds_west],
        [spot.bounds_north, spot.bounds_east]
      );
      mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
    } else {
      mapInstance.current.setView([spot.latitude, spot.longitude], 17);
    }
  };

  // If a spot is selected for detail view
  if (selectedSpot) {
    return (
      <SpotDetail
        spot={selectedSpot}
        onBack={() => { setSelectedSpot(null); fetchSpots(); }}
        isMainAdmin={isMainAdmin}
        userId={user?.id || ''}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1e2d4a]">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e0d0]">🗺️ 스팟 관리</h1>
          <p className="text-[15px] text-[#7b8da6] mt-1">지도에서 사각형을 드래그하여 스팟을 생성하세요</p>
        </div>
        <div className="flex gap-2">
          {isDrawing ? (
            <Button variant="outline" onClick={cancelDrawing} className="border-red-500 text-red-400 hover:bg-red-500/10">
              취소
            </Button>
          ) : (
            <Button onClick={() => setIsDrawing(true)} className="bg-[#d4a843] hover:bg-[#c49a3a] text-[#0f1d32]">
              <Plus className="w-4 h-4 mr-1" /> 스팟 생성
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 relative">
          <div
            ref={mapRef}
            className="w-full h-full"
            style={{ cursor: isDrawing ? 'crosshair' : 'grab' }}
          />
          {isDrawing && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#d4a843] text-[#0f1d32] px-4 py-2 rounded-lg text-sm font-semibold shadow-lg z-[1000]">
              지도에서 드래그하여 사각형 영역을 그리세요
            </div>
          )}

          {/* Create form overlay */}
          {showForm && (
            <div className="absolute bottom-4 left-4 right-4 bg-[#0f1d32] border border-[#1e2d4a] rounded-xl p-4 z-[1000] shadow-2xl">
              <h3 className="text-lg font-bold text-[#e8e0d0] mb-3">새 스팟 정보</h3>
              <Input
                placeholder="스팟 이름"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="mb-2 bg-[#162340] border-[#1e2d4a] text-[#e8e0d0]"
              />
              <Textarea
                placeholder="설명 (선택)"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                className="mb-3 bg-[#162340] border-[#1e2d4a] text-[#e8e0d0] resize-none"
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={resetForm} className="text-[#7b8da6]">취소</Button>
                <Button onClick={handleSaveSpot} disabled={!formName.trim() || loading} className="bg-[#d4a843] hover:bg-[#c49a3a] text-[#0f1d32]">
                  {loading ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Spot list sidebar */}
        <div className="w-72 border-l border-[#1e2d4a] bg-[#0a1628] overflow-y-auto">
          <div className="p-3 border-b border-[#1e2d4a]">
            <h2 className="text-[15px] font-semibold text-[#e8e0d0]">스팟 목록 ({spots.length})</h2>
          </div>
          {spots.length === 0 ? (
            <div className="p-4 text-center text-[#7b8da6] text-sm">
              아직 스팟이 없습니다
            </div>
          ) : (
            <div className="divide-y divide-[#1e2d4a]">
              {spots.map(spot => {
                const canEdit = isMainAdmin || spot.creator_id === user?.id;
                return (
                  <div
                    key={spot.id}
                    className="p-3 hover:bg-[#162340] transition-colors cursor-pointer"
                    onClick={() => focusSpot(spot)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#d4a843] shrink-0" />
                          <span className="text-sm font-medium text-[#e8e0d0] truncate">{spot.name}</span>
                        </div>
                        {spot.description && (
                          <p className="text-xs text-[#7b8da6] mt-0.5 truncate">{spot.description}</p>
                        )}
                        <div className="flex gap-1 mt-1">
                          {spot.theme_id && <Badge className="text-[10px] bg-[#d4a843]/20 text-[#d4a843] border-0">테마</Badge>}
                          {!spot.is_active && <Badge className="text-[10px] bg-red-500/20 text-red-400 border-0">비활성</Badge>}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedSpot(spot); }}
                            className="p-1 text-[#7b8da6] hover:text-[#d4a843] transition-colors"
                            title="상세/테마 설정"
                          >
                            <Palette className="w-4 h-4" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteSpot(spot.id); }}
                            className="p-1 text-[#7b8da6] hover:text-red-400 transition-colors"
                            title="삭제"
                          >
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
