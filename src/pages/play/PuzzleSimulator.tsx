import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SlidingPuzzle from '@/components/treasure/SlidingPuzzle';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const PRESETS = [
  { id: 'gogh', name: '별이 빛나는 밤', image_url: '/presets/gogh.jpeg' },
  { id: 'rembrandt', name: '돌아온 탕자', image_url: '/presets/rembrandt.jpg' },
  { id: 'munch', name: '절규', image_url: '/presets/munch.jpeg' },
  { id: 'creation', name: '천지창조', image_url: '/presets/creation.jpg' },
];

const GRID_SIZES = [3, 4, 5] as const;

export default function PuzzleSimulator() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(PRESETS[0].image_url);
  const [gridSize, setGridSize] = useState<3 | 4 | 5>(3);
  const [key, setKey] = useState(0);
  const [playing, setPlaying] = useState(false);

  const handleSolve = () => {
    toast.success('🎉 퍼즐 완성!');
    setTimeout(() => setPlaying(false), 1000);
  };

  const handleTimeout = () => {
    toast.error('⏱ 시간 초과!');
    setTimeout(() => setPlaying(false), 1000);
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/play')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">🧩 퍼즐 시뮬레이터</h1>
      </div>

      {!playing ? (
        <div className="space-y-4">
          {/* Image selection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">이미지 선택</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedImage(p.image_url)}
                    className={`rounded-lg border-2 overflow-hidden aspect-square transition-all ${
                      selectedImage === p.image_url ? 'border-primary ring-2 ring-primary/30' : 'border-muted'
                    }`}
                  >
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {PRESETS.map(p => (
                  <span key={p.id} className="flex-1 text-[10px] text-muted-foreground text-center truncate">{p.name}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Grid size */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">격자 크기</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {GRID_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => setGridSize(size)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      gridSize === size ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview & Start */}
          <div className="text-center space-y-3">
            <img src={selectedImage} alt="미리보기" className="w-48 h-48 object-cover rounded-xl mx-auto border-2 border-border shadow-md" />
            <Button onClick={() => { setKey(k => k + 1); setPlaying(true); }} className="w-full" size="lg">
              🧩 퍼즐 시작 (30초)
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <SlidingPuzzle
            key={key}
            imageUrl={selectedImage}
            gridSize={gridSize}
            onSolve={handleSolve}
            timeLimit={30}
            onTimeout={handleTimeout}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPlaying(false)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
            </Button>
            <Button variant="outline" onClick={() => setKey(k => k + 1)} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-1" /> 다시하기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
