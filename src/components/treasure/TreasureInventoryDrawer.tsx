import { TreasureItem } from '@/hooks/useTreasureHunt';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Backpack } from 'lucide-react';
import { getTreasureIconSrc } from '@/lib/treasureIcons';

interface Props {
  foundTreasures: TreasureItem[];
  hasKey: boolean;
}

export default function TreasureInventoryDrawer({ foundTreasures, hasKey }: Props) {
  const totalPoints = foundTreasures.reduce((sum, t) => sum + t.points, 0);

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="h-12 w-12 rounded-full shadow-lg relative"
        >
          <Backpack className="w-5 h-5" />
          {foundTreasures.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {foundTreasures.length}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            🎒 내 보물 가방
            <span className="text-sm font-normal text-muted-foreground ml-auto">
              합계: <span className="font-bold text-primary">{totalPoints}점</span>
            </span>
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          {hasKey && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
              <img src={getTreasureIconSrc('treasure', 'key')} alt="열쇠" className="w-8 h-8 object-contain" />
              <div>
                <p className="text-sm font-bold">열쇠 보유 중</p>
                <p className="text-xs text-muted-foreground">보물상자를 열 수 있습니다!</p>
              </div>
            </div>
          )}

          {foundTreasures.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-3xl mb-2">🪹</p>
              <p className="text-sm">아직 발견한 보물이 없습니다</p>
              <p className="text-xs">삽을 사용하여 주변을 탐색해보세요!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {foundTreasures.map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 bg-muted/50 rounded-lg p-3 border"
                >
                  <img
                    src={getTreasureIconSrc(t.challenge_type, t.treasure_subtype)}
                    alt={t.keyword}
                    className="w-8 h-8 object-contain"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.keyword}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.challenge_type === 'quiz' ? '퀴즈' : t.challenge_type === 'puzzle' ? '퍼즐' : '보물'}
                      {t.found_at && ` · ${new Date(t.found_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary whitespace-nowrap">+{t.points}점</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
