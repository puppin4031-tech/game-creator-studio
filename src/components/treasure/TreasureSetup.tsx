import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { TreasureItem } from '@/hooks/useTreasureHunt';
import { toast } from 'sonner';

interface Props {
  treasures: TreasureItem[];
  onAdd: (item: { keyword: string; latitude: number; longitude: number; quiz_question: string; quiz_answer: string }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export default function TreasureSetup({ treasures, onAdd, onRemove }: Props) {
  const [keyword, setKeyword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async () => {
    if (!keyword.trim() || !question.trim() || !answer.trim()) {
      toast.error('모든 필드를 입력해주세요');
      return;
    }

    // Use current GPS position
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
          quiz_question: question.trim(),
          quiz_answer: answer.trim(),
        });
        setKeyword('');
        setQuestion('');
        setAnswer('');
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
          <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
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
                <span>#{i + 1} <strong>{t.keyword}</strong></span>
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
