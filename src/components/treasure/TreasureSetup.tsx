import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, MapPin, Image, HelpCircle, Puzzle, Navigation, Gem, Key, Package, X, Check } from 'lucide-react';
import { TreasureItem } from '@/hooks/useTreasureHunt';
import { QUIZ_PRESETS, TREASURE_PRESETS, SPECIAL_ITEMS } from '@/lib/quizPresets';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  treasures: TreasureItem[];
  onAdd: (item: {
    keyword: string; latitude: number; longitude: number;
    quiz_question: string; quiz_answer: string;
    challenge_type: string; puzzle_image_url?: string; puzzle_grid_size?: number;
    points?: number; treasure_subtype?: string;
  }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const PUZZLE_PRESETS = [
  { id: 'gogh', name: '별이 빛나는 밤', image_url: '/presets/gogh.jpeg' },
  { id: 'rembrandt', name: '돌아온 탕자', image_url: '/presets/rembrandt.jpg' },
  { id: 'munch', name: '절규', image_url: '/presets/munch.jpeg' },
  { id: 'creation', name: '천지창조', image_url: '/presets/creation.jpg' },
  { id: 'monet', name: '수련', image_url: '/presets/monet.jpg' },
];

const mapContainerStyle = { width: '100%', height: '200px', borderRadius: '8px' };

const pinIconUrl = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><circle cx="14" cy="14" r="10" fill="hsl(0,80%,55%)" stroke="white" stroke-width="3"/><circle cx="14" cy="14" r="4" fill="white"/></svg>`)}`;

const SUBTYPE_ICONS: Record<string, string> = {
  diamond: '💎', gold: '🥇', ruby: '❤️', sapphire: '💙', key: '🔑', chest: '📦',
};

export default function TreasureSetup({ treasures, onAdd, onRemove }: Props) {
  const [keyword, setKeyword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [challengeType, setChallengeType] = useState<'quiz' | 'puzzle' | 'treasure'>('quiz');
  const [puzzleImageUrl, setPuzzleImageUrl] = useState('');
  const [puzzleGridSize, setPuzzleGridSize] = useState<3 | 4 | 5>(3);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Treasure type state
  const [selectedTreasure, setSelectedTreasure] = useState('');
  const [treasurePoints, setTreasurePoints] = useState(15);
  const [treasureSubtype, setTreasureSubtype] = useState<string | null>(null);

  // Location picker state
  const [locMode, setLocMode] = useState<'gps' | 'map'>('map');
  const [pickedLat, setPickedLat] = useState<number | null>(null);
  const [pickedLng, setPickedLng] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.978 });

  const initMapCenter = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  const handleShowForm = () => {
    setShowForm(true);
    initMapCenter();
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setPickedLat(e.latLng.lat());
      setPickedLng(e.latLng.lng());
    }
  }, []);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('puzzle-images').upload(path, file);
    if (error) {
      toast.error('이미지 업로드 실패');
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('puzzle-images').getPublicUrl(path);
    setPuzzleImageUrl(urlData.publicUrl);
    setUploading(false);
    toast.success('이미지가 업로드되었습니다');
  };

  const handleQuizPreset = (val: string) => {
    if (val === 'custom') {
      setQuestion('');
      setAnswer('');
      return;
    }
    const idx = parseInt(val);
    const preset = QUIZ_PRESETS[idx];
    if (preset) {
      setQuestion(preset.question);
      setAnswer(preset.answer);
    }
  };

  const handleTreasurePreset = (val: string) => {
    if (val === 'custom') {
      setTreasureSubtype(null);
      setTreasurePoints(15);
      setKeyword('');
      return;
    }
    if (val === 'key') {
      const item = SPECIAL_ITEMS.key;
      setTreasureSubtype(item.subtype);
      setTreasurePoints(item.points);
      setKeyword(item.name);
      return;
    }
    if (val === 'chest') {
      const item = SPECIAL_ITEMS.chest;
      setTreasureSubtype(item.subtype);
      setTreasurePoints(item.points);
      setKeyword(item.name);
      return;
    }
    const preset = TREASURE_PRESETS.find(p => p.subtype === val);
    if (preset) {
      setTreasureSubtype(preset.subtype);
      setTreasurePoints(preset.points);
      setKeyword(preset.name);
    }
  };

  const resetForm = () => {
    setKeyword('');
    setQuestion('');
    setAnswer('');
    setPuzzleImageUrl('');
    setPickedLat(null);
    setPickedLng(null);
    setShowForm(false);
    setAdding(false);
    setSelectedTreasure('');
    setTreasureSubtype(null);
    setTreasurePoints(15);
  };

  const doAdd = async (lat: number, lng: number) => {
    const isTreasureType = challengeType === 'treasure';
    await onAdd({
      keyword: keyword.trim(),
      latitude: lat,
      longitude: lng,
      quiz_question: challengeType === 'quiz' ? question.trim()
        : challengeType === 'puzzle' ? '슬라이드 퍼즐을 완성하세요!'
        : '보물을 획득하세요!',
      quiz_answer: challengeType === 'quiz' ? answer.trim()
        : challengeType === 'puzzle' ? '__PUZZLE__'
        : '__TREASURE__',
      challenge_type: challengeType,
      puzzle_image_url: challengeType === 'puzzle' ? puzzleImageUrl : undefined,
      puzzle_grid_size: challengeType === 'puzzle' ? puzzleGridSize : undefined,
      points: isTreasureType ? treasurePoints : 15,
      treasure_subtype: isTreasureType ? (treasureSubtype || undefined) : undefined,
    });
    resetForm();
    toast.success('보물이 등록되었습니다');
  };

  const handleAdd = async () => {
    if (!keyword.trim()) {
      toast.error('키워드를 입력해주세요');
      return;
    }
    if (challengeType === 'quiz' && (!question.trim() || !answer.trim())) {
      toast.error('퀴즈 질문과 정답을 입력해주세요');
      return;
    }
    if (challengeType === 'puzzle' && !puzzleImageUrl) {
      toast.error('퍼즐 이미지를 선택해주세요');
      return;
    }

    setAdding(true);

    if (locMode === 'map') {
      if (pickedLat == null || pickedLng == null) {
        toast.error('지도에서 보물 위치를 탭해주세요');
        setAdding(false);
        return;
      }
      await doAdd(pickedLat, pickedLng);
    } else {
      if (!navigator.geolocation) {
        toast.error('GPS를 사용할 수 없습니다');
        setAdding(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => await doAdd(pos.coords.latitude, pos.coords.longitude),
        () => {
          toast.error('위치를 가져올 수 없습니다');
          setAdding(false);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const getItemIcon = (t: TreasureItem) => {
    if (t.treasure_subtype && SUBTYPE_ICONS[t.treasure_subtype]) return SUBTYPE_ICONS[t.treasure_subtype];
    if (t.challenge_type === 'puzzle') return '🧩';
    if (t.challenge_type === 'quiz') return '❓';
    return '💎';
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">💎 보물 등록 ({treasures.length}개)</p>
          {!showForm && (
            <Button size="sm" variant="outline" onClick={handleShowForm} className="gap-1">
              <Plus className="w-4 h-4" /> 추가
            </Button>
          )}
        </div>

        {showForm && (
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            {/* Challenge type selector */}
            <div>
              <label className="text-xs font-medium mb-1.5 block">챌린지 유형</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setChallengeType('quiz')}
                  className={`p-2 rounded-lg border-2 text-center transition-all text-sm ${
                    challengeType === 'quiz' ? 'border-primary bg-primary/10' : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <HelpCircle className="w-5 h-5 mx-auto mb-1" />
                  퀴즈
                </button>
                <button
                  onClick={() => setChallengeType('puzzle')}
                  className={`p-2 rounded-lg border-2 text-center transition-all text-sm ${
                    challengeType === 'puzzle' ? 'border-primary bg-primary/10' : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <Puzzle className="w-5 h-5 mx-auto mb-1" />
                  퍼즐
                </button>
                <button
                  onClick={() => setChallengeType('treasure')}
                  className={`p-2 rounded-lg border-2 text-center transition-all text-sm ${
                    challengeType === 'treasure' ? 'border-primary bg-primary/10' : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <Gem className="w-5 h-5 mx-auto mb-1" />
                  보물
                </button>
              </div>
            </div>

            {/* Quiz fields */}
            {challengeType === 'quiz' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">퀴즈 프리셋</label>
                  <Select onValueChange={handleQuizPreset}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="프리셋 선택 또는 직접 입력" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">✏️ 직접 입력</SelectItem>
                      {QUIZ_PRESETS.map((q, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {q.question}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="키워드 (예: 사과)"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  maxLength={20}
                />
                <Textarea
                  placeholder="퀴즈 질문"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  rows={2}
                />
                <Input
                  placeholder="정답"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  maxLength={50}
                />
              </div>
            )}

            {/* Puzzle fields */}
            {challengeType === 'puzzle' && (
              <div className="space-y-2">
                <Input
                  placeholder="키워드 (예: 명화)"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  maxLength={20}
                />
                <div>
                  <label className="text-xs font-medium mb-1 block">격자 크기</label>
                  <div className="flex gap-2">
                    {([3, 4, 5] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => setPuzzleGridSize(size)}
                        className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                          puzzleGridSize === size ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}
                      >
                        {size}×{size}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">프리셋</label>
                  <div className="grid grid-cols-5 gap-2">
                    {PUZZLE_PRESETS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setPuzzleImageUrl(p.image_url);
                          toast.success(`"${p.name}" 선택됨`);
                        }}
                        className={`rounded-lg border-2 overflow-hidden transition-all aspect-square ${
                          puzzleImageUrl === p.image_url ? 'border-primary ring-2 ring-primary/30' : 'border-muted'
                        }`}
                      >
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {PUZZLE_PRESETS.map(p => (
                      <span key={p.id} className="flex-1 text-[10px] text-muted-foreground text-center truncate">{p.name}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">또는 이미지 직접 업로드</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-full gap-1"
                  >
                    <Image className="w-4 h-4" />
                    {uploading ? '업로드 중...' : '이미지 선택'}
                  </Button>
                </div>
                {puzzleImageUrl && (
                  <div className="flex items-center gap-2 bg-background rounded p-2 border">
                    <img src={puzzleImageUrl} alt="퍼즐" className="w-12 h-12 rounded object-cover" />
                    <span className="text-xs text-muted-foreground flex-1 truncate">
                      {PUZZLE_PRESETS.find(p => p.image_url === puzzleImageUrl)?.name || '커스텀 이미지'}
                      {' · '}{puzzleGridSize}×{puzzleGridSize}
                    </span>
                    <button onClick={() => setPuzzleImageUrl('')} className="text-destructive text-xs">삭제</button>
                  </div>
                )}
              </div>
            )}

            {/* Treasure fields */}
            {challengeType === 'treasure' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">보물 프리셋</label>
                  <Select onValueChange={handleTreasurePreset}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="보물 종류 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">✏️ 직접 입력</SelectItem>
                      {TREASURE_PRESETS.map(t => (
                        <SelectItem key={t.subtype} value={t.subtype}>
                          {t.icon} {t.name} ({t.points}점)
                        </SelectItem>
                      ))}
                      <SelectItem value="key">🔑 열쇠 (보물상자용)</SelectItem>
                      <SelectItem value="chest">📦 보물상자 (승리 조건)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="키워드 (예: 다이아몬드)"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  maxLength={20}
                />
                <div className="flex gap-2 items-center">
                  <label className="text-xs font-medium whitespace-nowrap">점수:</label>
                  <Input
                    type="number"
                    value={treasurePoints}
                    onChange={e => setTreasurePoints(parseInt(e.target.value) || 0)}
                    className="h-8 w-24"
                    min={0}
                  />
                  <span className="text-xs text-muted-foreground">점</span>
                </div>
                {treasureSubtype === 'chest' && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                    📦 보물상자는 열쇠를 가진 플레이어만 열 수 있습니다. 먼저 여는 팀이 승리!
                  </p>
                )}
                {treasureSubtype === 'key' && (
                  <p className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                    🔑 열쇠를 찾은 플레이어만 보물상자를 열 수 있습니다.
                  </p>
                )}
              </div>
            )}

            {/* Location picker */}
            <div>
              <label className="text-xs font-medium mb-1.5 block">위치 설정</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => setLocMode('map')}
                  className={`p-2 rounded-lg border-2 text-center transition-all text-sm ${
                    locMode === 'map' ? 'border-primary bg-primary/10' : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <MapPin className="w-5 h-5 mx-auto mb-1" />
                  지도에서 선택
                </button>
                <button
                  onClick={() => setLocMode('gps')}
                  className={`p-2 rounded-lg border-2 text-center transition-all text-sm ${
                    locMode === 'gps' ? 'border-primary bg-primary/10' : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <Navigation className="w-5 h-5 mx-auto mb-1" />
                  현재 GPS 위치
                </button>
              </div>

              {locMode === 'map' && (
                <div className="space-y-1.5">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={pickedLat != null ? { lat: pickedLat, lng: pickedLng! } : mapCenter}
                    zoom={17}
                    onClick={handleMapClick}
                    options={{ zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
                  >
                    {pickedLat != null && pickedLng != null && (
                      <Marker
                        position={{ lat: pickedLat, lng: pickedLng }}
                        icon={{ url: pinIconUrl, scaledSize: new google.maps.Size(28, 28), anchor: new google.maps.Point(14, 14) }}
                      />
                    )}
                  </GoogleMap>
                  {pickedLat != null ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      위치 선택됨: {pickedLat.toFixed(6)}, {pickedLng!.toFixed(6)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">지도를 탭하여 보물 위치를 지정하세요</p>
                  )}
                </div>
              )}

              {locMode === 'gps' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> 등록 시 현재 GPS 위치가 사용됩니다
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="flex-1">취소</Button>
              <Button size="sm" onClick={handleAdd} disabled={adding} className="flex-1">
                {adding ? '등록 중...' : '등록'}
              </Button>
            </div>
          </div>
        )}

        {treasures.length > 0 && (
          <div className="space-y-1.5">
            {treasures.map((t, i) => (
              <div key={t.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5">
                  #{i + 1}
                  <span>{getItemIcon(t)}</span>
                  <strong>{t.keyword}</strong>
                  <span className="text-xs text-muted-foreground">
                    {t.points}점
                  </span>
                  {t.challenge_type === 'puzzle' && (
                    <span className="text-xs text-muted-foreground">{t.puzzle_grid_size}×{t.puzzle_grid_size}</span>
                  )}
                </span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRemove(t.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
