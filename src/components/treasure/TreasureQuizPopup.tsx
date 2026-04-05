import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NearestTreasure } from '@/hooks/useTreasureHunt';
import SlidingPuzzle from './SlidingPuzzle';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treasure: NearestTreasure;
  onQuizSubmit: (answer: string) => Promise<{ success: boolean; alreadyFound?: boolean }>;
  onPuzzleSolve: () => Promise<{ success: boolean; alreadyFound?: boolean }>;
}

export default function TreasureQuizPopup({ open, onOpenChange, treasure, onQuizSubmit, onPuzzleSolve }: Props) {
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'idle' | 'correct' | 'wrong' | 'taken'>('idle');
  const [submitting, setSubmitting] = useState(false);

  const isPuzzle = treasure.challenge_type === 'puzzle';

  const handleQuizSubmit = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    const res = await onQuizSubmit(answer.trim());
    setSubmitting(false);

    if (res.success) {
      setResult('correct');
    } else if (res.alreadyFound) {
      setResult('taken');
    } else {
      setResult('wrong');
      setTimeout(() => {
        onOpenChange(false);
        setResult('idle');
        setAnswer('');
      }, 1500);
    }
  };

  const handlePuzzleSolve = async () => {
    setSubmitting(true);
    const res = await onPuzzleSolve();
    setSubmitting(false);
    if (res.success) {
      setResult('correct');
    } else if (res.alreadyFound) {
      setResult('taken');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setResult('idle');
    setAnswer('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={isPuzzle ? 'max-w-sm p-4' : 'max-w-sm'}>
        <DialogHeader>
          <DialogTitle className="text-center">
            {result === 'correct' ? '🎉 성공!' : result === 'taken' ? '😢 아쉽게도...' : isPuzzle ? '🧩 슬라이드 퍼즐' : '❓ 퀴즈'}
          </DialogTitle>
        </DialogHeader>

        {result === 'correct' && (
          <div className="text-center space-y-3 py-4">
            <div className="text-5xl animate-treasure-float">💎</div>
            <p className="text-lg font-bold">키워드 발견!</p>
            <p className="text-2xl font-mono font-bold text-primary">"{treasure.keyword}"</p>
            <Button onClick={handleClose} className="w-full mt-4">확인</Button>
          </div>
        )}

        {result === 'taken' && (
          <div className="text-center space-y-3 py-4">
            <p className="text-muted-foreground">다른 플레이어가 먼저 찾았습니다!</p>
            <Button onClick={handleClose} className="w-full">확인</Button>
          </div>
        )}

        {result === 'wrong' && (
          <div className="text-center space-y-3 py-4">
            <div className="text-5xl">❌</div>
            <p className="text-lg font-bold text-destructive">틀렸습니다!</p>
            <p className="text-sm text-muted-foreground">15초 후 재시도할 수 있습니다</p>
          </div>
        )}

        {result === 'idle' && isPuzzle && treasure.puzzle_image_url && (
          <div className="space-y-3">
            <SlidingPuzzle
              imageUrl={treasure.puzzle_image_url}
              gridSize={(treasure.puzzle_grid_size || 3) as 3 | 4}
              onSolve={handlePuzzleSolve}
            />
            <Button variant="ghost" onClick={handleClose} className="w-full">취소</Button>
          </div>
        )}

        {result === 'idle' && !isPuzzle && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium text-center">{treasure.quiz_question}</p>
            </div>
            <Input
              placeholder="정답을 입력하세요"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuizSubmit()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose} className="flex-1">취소</Button>
              <Button onClick={handleQuizSubmit} disabled={!answer.trim() || submitting} className="flex-1">
                {submitting ? '확인 중...' : '정답 제출'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
