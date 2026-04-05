import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, MapPin, Image, HelpCircle, Puzzle } from 'lucide-react';
import { TreasureItem } from '@/hooks/useTreasureHunt';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  treasures: TreasureItem[];
  onAdd: (item: {
    keyword: string; latitude: number; longitude: number;
    quiz_question: string; quiz_answer: string;
    challenge_type: string; puzzle_image_url?: string; puzzle_grid_size?: number;
  }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  puzzlePresets: PuzzlePreset[];
}

export interface PuzzlePreset {
  id: string;
  name: string;
  image_url: string;
  grid_size: number;
}

export default function TreasureSetup({ treasures, onAdd, onRemove, puzzlePresets }: Props) {
  const [keyword, setKeyword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [challengeType, setChallengeType] = useState<'quiz' | 'puzzle'>('quiz');
  const [puzzleImageUrl, setPuzzleImageUrl] = useState('');
  const [puzzleGridSize, setPuzzleGridSize] = useState<3 | 4>(3);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

    if (!navigator.geolocation) {
      toast.error('GPS를 사용할 수 없습니다');
      return;
    }

    setAdding(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await onAdd({
          keyword: keyword.trim(),
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          quiz_question: challengeType === 'quiz' ? question.trim() : '슬라이드 퍼즐을 완성하세요!',
          quiz_answer: challengeType === 'quiz' ? answer.trim() : '__PUZZLE__',
          challenge_type: challengeType,
          puzzle_image_url: challengeType === 'puzzle' ? puzzleImageUrl : undefined,
          puzzle_grid_size: challengeType === 'puzzle' ? puzzleGridSize : undefined,
        });
        setKeyword('');
        setQuestion('');
        setAnswer('');
        setPuzzleImageUrl('');
        setShowForm(false);
        setAdding(false);
        toast.success('보물이 등록되었습니다');
      },
      () => {
        toast.error('위치를 가져올 수 없습니다');
        setAdding(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const selectPreset = (preset: PuzzlePreset) => {
    setPuzzleImageUrl(preset.image_url);
    setPuzzleGridSize(preset.grid_size as 3 | 4);
    toast.success(`프리셋 "${preset.name}" 선택됨`);
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">💎 보물 등록 ({treasures.length}개)</p>
          {!showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1">
              <Plus className="w-4 h-4" /> 추가
            </Button>
          )}
        </div>

        {showForm && (
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <Input
              placeholder="키워드 (예: 사과)"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              maxLength={20}
            />

            {/* Challenge type selector */}
            <div>
              <label className="text-xs font-medium mb-1.5 block">챌린지 유형</label>
              <div className="grid grid-cols-2 gap-2">
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
                  슬라이드 퍼즐
                </button>
              </div>
            </div>

            {/* Quiz fields */}
            {challengeType === 'quiz' && (
              <>
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
              </>
            )}

            {/* Puzzle fields */}
            {challengeType === 'puzzle' && (
              <div className="space-y-2">
                {/* Grid size */}
                <div>
                  <label className="text-xs font-medium mb-1 block">격자 크기</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPuzzleGridSize(3)}
                      className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                        puzzleGridSize === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      3×3
                    </button>
                    <button
                      onClick={() => setPuzzleGridSize(4)}
                      className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                        puzzleGridSize === 4 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      4×4
                    </button>
                  </div>
                </div>

                {/* Presets */}
                {puzzlePresets.length > 0 && (
                  <div>
                    <label className="text-xs font-medium mb-1 block">프리셋</label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {puzzlePresets.map(p => (
                        <button
                          key={p.id}
                          onClick={() => selectPreset(p)}
                          className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                            puzzleImageUrl === p.image_url ? 'border-primary ring-2 ring-primary/30' : 'border-muted'
                          }`}
                        >
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image upload */}
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

                {/* Preview */}
                {puzzleImageUrl && (
                  <div className="flex items-center gap-2 bg-background rounded p-2 border">
                    <img src={puzzleImageUrl} alt="퍼즐" className="w-12 h-12 rounded object-cover" />
                    <span className="text-xs text-muted-foreground flex-1 truncate">이미지 선택됨</span>
                    <button onClick={() => setPuzzleImageUrl('')} className="text-destructive text-xs">삭제</button>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> 현재 위치에 보물이 등록됩니다
            </p>
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
                  {t.challenge_type === 'puzzle' ? <Puzzle className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
                  <strong>{t.keyword}</strong>
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
