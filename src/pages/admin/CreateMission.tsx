import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const newMarkerIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:hsl(35,90%,55%);border:3px solid white;box-shadow:0 0 10px hsl(35,90%,55%,0.5);"></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function CreateMission() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);
  const [clickedPos, setClickedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [floor, setFloor] = useState(1);
  const [quizContent, setQuizContent] = useState('');
  const [qrInfo, setQrInfo] = useState('');

  const { data: region } = useQuery({
    queryKey: ['my-region', profile?.assigned_region],
    queryFn: async () => {
      if (!profile?.assigned_region) return null;
      const { data } = await supabase.from('regions').select('*').eq('id', profile.assigned_region).single();
      return data;
    },
    enabled: !!profile?.assigned_region,
  });

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !region) return;
    const bounds: L.LatLngBoundsExpression = [
      [region.bounds_south, region.bounds_west],
      [region.bounds_north, region.bounds_east],
    ];
    const map = L.map(containerRef.current).setView([region.center_lat, region.center_lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    map.setMaxBounds(bounds);
    map.fitBounds(bounds);
    L.rectangle(bounds, { color: 'hsl(150,80%,45%)', weight: 2, fillOpacity: 0.05, dashArray: '8 4' }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      setClickedPos({ lat: e.latlng.lat, lng: e.latlng.lng });
      setShowModal(true);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [region]);

  // Update click marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clickMarkerRef.current) {
      clickMarkerRef.current.remove();
      clickMarkerRef.current = null;
    }
    if (clickedPos) {
      clickMarkerRef.current = L.marker([clickedPos.lat, clickedPos.lng], { icon: newMarkerIcon }).addTo(map);
    }
  }, [clickedPos]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!clickedPos || !user || !profile?.assigned_region) throw new Error('Missing data');
      const { error } = await supabase.from('missions').insert({
        region_id: profile.assigned_region,
        creator_id: user.id,
        title,
        description: description || null,
        latitude: clickedPos.lat,
        longitude: clickedPos.lng,
        floor,
        quiz_content: quizContent || null,
        qr_code_info: qrInfo || null,
        status: '작성중',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-region-missions'] });
      setShowModal(false);
      resetForm();
      toast({ title: '미션 생성', description: '새 미션이 생성되었습니다.' });
    },
    onError: (err: any) => {
      toast({ title: '오류', description: err.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFloor(1);
    setQuizContent('');
    setQrInfo('');
    setClickedPos(null);
  };

  if (!profile?.assigned_region || !region) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
        <Card><CardContent className="py-8 text-center text-muted-foreground">배정된 지역이 없습니다.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3rem)] relative">
      <div className="absolute top-3 left-3 z-[1000] bg-card/90 backdrop-blur rounded-lg px-3 py-1.5 border border-border flex items-center gap-2">
        <PlusCircle className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">지도를 클릭하여 미션 추가</span>
      </div>

      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      <Dialog open={showModal} onOpenChange={open => { if (!open) { setShowModal(false); setClickedPos(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              새 미션 / 오브제 추가
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>미션 제목 *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 비밀의 문" />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>층수</Label>
                <Input type="number" value={floor} onChange={e => setFloor(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>좌표</Label>
                <Input disabled value={clickedPos ? `${clickedPos.lat.toFixed(5)}, ${clickedPos.lng.toFixed(5)}` : ''} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>퀴즈 내용</Label>
              <Textarea value={quizContent} onChange={e => setQuizContent(e.target.value)} rows={2} placeholder="예: 이 건물의 설립연도는?" />
            </div>
            <div className="space-y-2">
              <Label>QR코드 / AR 마커 정보</Label>
              <Input value={qrInfo} onChange={e => setQrInfo(e.target.value)} placeholder="QR 데이터 또는 마커 ID" />
            </div>
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!title.trim()}>
              미션 생성
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
