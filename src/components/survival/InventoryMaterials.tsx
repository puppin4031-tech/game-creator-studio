import { useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, BookOpen, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';

interface InventoryMaterialsProps {
  stacks: Stack[];
  location: 'backpack' | 'storage';
  canTransfer: boolean;
  ready: boolean;
  onTransfer: (id: ItemId) => void;
  onUse: (id: ItemId) => void;
  icon: (id: ItemId) => ReactNode;
}

/** Keep material lists compact; actions belong to the selected item's dialog. */
export default function InventoryMaterials({ stacks, location, canTransfer, ready, onTransfer, onUse, icon }: InventoryMaterialsProps) {
  const [selected, setSelected] = useState<ItemId | null>(null);
  const stack = stacks.find(s => s.itemId === selected);
  const item = stack ? ITEMS[stack.itemId] : undefined;
  const inBag = location === 'backpack';
  const transferLabel = inBag ? '1개 창고에 넣기' : '1개 배낭으로 옮기기';
  const act = (action: (id: ItemId) => void) => {
    if (!stack) return;
    action(stack.itemId);
    setSelected(null);
  };

  return <>
    {stacks.length ? <div className="flex flex-wrap gap-1.5">
      {stacks.map(s => <Button key={s.itemId} type="button" variant="outline" onClick={() => setSelected(s.itemId)}
        className="pixel-frame h-auto min-h-11 max-w-full gap-1 bg-card px-1.5 py-1 text-xs">
        {icon(s.itemId)}<span className="whitespace-normal text-left">{ITEMS[s.itemId].name}</span><b className="shrink-0">×{s.count}</b>
      </Button>)}
    </div> : <p className="text-sm text-muted-foreground">비어 있음</p>}
    <Dialog open={!!stack && !!item} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="pixel-panel max-h-[85dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto">
        {stack && item && <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">{icon(stack.itemId)}{item.name}</DialogTitle>
            <DialogDescription>{inBag ? '배낭' : '창고'} · {stack.count}개</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {stack.itemId !== 'shell' && <Button type="button" variant="outline" className="pixel-btn min-h-11 whitespace-normal" disabled={!canTransfer || !ready} onClick={() => act(onTransfer)}>
              {inBag ? <ArrowDownToLine /> : <ArrowUpFromLine />}{transferLabel}
            </Button>}
            {(item.food || item.heal || item.book) && <Button type="button" className="pixel-btn min-h-11" disabled={!ready || (!inBag && !canTransfer)} onClick={() => act(onUse)}>
              {item.book ? <BookOpen /> : <Utensils />}{item.book ? '기술서 읽기' : item.food ? '1개 먹기' : '1개 사용하기'}
            </Button>}
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}