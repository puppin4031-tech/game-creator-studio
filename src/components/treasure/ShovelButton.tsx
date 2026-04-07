import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NearestTreasure } from '@/hooks/useTreasureHunt';
import { toast } from 'sonner';
import { Shovel } from 'lucide-react';

interface Props {
  nearest: NearestTreasure | null;
  onDigSuccess: (treasure: NearestTreasure) => void;
  disabled?: boolean;
}

export default function ShovelButton({ nearest, onDigSuccess, disabled }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDig = () => {
    if (!nearest || nearest.distance > 10) {
      toast('근처에 보물이 없습니다', { description: '더 가까이 이동해보세요!' });
      setDialogOpen(false);
      return;
    }
    setDialogOpen(false);
    onDigSuccess(nearest);
  };

  return (
    <>
      <Button
        size="icon"
        variant="default"
        className="h-20 w-20 rounded-full shadow-lg bg-amber-600 hover:bg-amber-700 text-white"
        onClick={() => setDialogOpen(true)}
        disabled={disabled}
      >
        <Shovel className="w-9 h-9" />
      </Button>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🪓 주변을 탐색하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삽을 사용하여 주변에 숨겨진 보물을 탐색합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>뒤로가기</AlertDialogCancel>
            <AlertDialogAction onClick={handleDig}>탐색</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
