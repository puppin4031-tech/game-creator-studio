import { useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, BookOpen, Trash2, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validStackCount } from '@/lib/survival/inventory';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';

interface InventoryMaterialsProps {
  stacks: Stack[];
  location: 'backpack' | 'storage';
  canTransfer: boolean;
  ready: boolean;
  onTransfer: (id: ItemId, count?: number) => void;
  onDrop?: (drops: Stack[]) => void;
  onUse: (id: ItemId) => void;
  icon: (id: ItemId) => ReactNode;
}

/** Keep material lists compact; actions belong to the selected item's dialog. */
export default function InventoryMaterials({ stacks, location, canTransfer, ready, onTransfer, onDrop, onUse, icon }: InventoryMaterialsProps) {
  const [selected, setSelected] = useState<ItemId | null>(null);
  const [transferCount, setTransferCount] = useState('1');
  const [dropCount, setDropCount] = useState('1');
  const stack = stacks.find(s => s.itemId === selected);
  const item = stack ? ITEMS[stack.itemId] : undefined;
  const inBag = location === 'backpack';
  const transferLabel = inBag ? '창고로 옮기기' : '1개 배낭으로 옮기기';
  const transferValid = !!stack && validStackCount(Number(transferCount), stack.count);
  const dropValid = !!stack && validStackCount(Number(dropCount), stack.count);
  const act = (action: (id: ItemId) => void) => {
    if (!stack) return;
    action(stack.itemId);
    setSelected(null);
  };

  return <>
    {stacks.length ? <div className="flex flex-wrap gap-1.5">
      {stacks.map(s => <Button key={s.itemId} type="button" variant="outline" onClick={() => { setSelected(s.itemId); setTransferCount('1'); setDropCount('1'); }}
        className="pixel-frame h-auto min-h-11 max-w-full gap-1 bg-card px-1.5 py-1 text-xs">
        {icon(s.itemId)}<span className="whitespace-normal text-left">{ITEMS[s.itemId].name}</span><b className="shrink-0">×{s.count}</b>
      </Button>)}
    </div> : <p className="text-sm text-muted-foreground">비어 있음</p>}
    <Dialog open={!!stack && !!item} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="pixel-panel max-h-[85dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto bg-background">
        {stack && item && <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">{icon(stack.itemId)}{item.name}</DialogTitle>
            <DialogDescription>{inBag ? '배낭' : '창고'} · 총수량 {stack.count}개</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {stack.itemId !== 'shell' && (!inBag || canTransfer) && <section className="space-y-2 border-b border-border pb-3">
              {inBag && <>
                <div className="flex items-center justify-between text-sm"><b>창고로 옮기기</b><span className="text-muted-foreground">총 {stack.count}개</span></div>
                <label className="flex items-center gap-3 text-sm">옮길 개수
                  <Input aria-label="옮길 개수" type="number" inputMode="numeric" min={1} max={stack.count} step={1} value={transferCount} onChange={e => setTransferCount(e.target.value)} className="h-11 min-w-0 flex-1" />
                </label>
                {!transferValid && <p className="text-xs text-destructive">1~{stack.count} 사이의 정수를 입력하세요.</p>}
              </>}
              <Button type="button" variant="outline" className="pixel-btn min-h-11 w-full whitespace-normal" disabled={!canTransfer || !ready || (inBag && !transferValid)} onClick={() => act(id => onTransfer(id, inBag ? Number(transferCount) : 1))}>
                {inBag ? <ArrowDownToLine /> : <ArrowUpFromLine />}{transferLabel}
              </Button>
            </section>}
            {inBag && onDrop && <section className="space-y-2 border-b border-border pb-3">
              <div className="flex items-center justify-between text-sm"><b>버리기</b><span className="text-muted-foreground">총 {stack.count}개</span></div>
              <label className="flex items-center gap-3 text-sm">버릴 개수
                <Input aria-label="버릴 개수" type="number" inputMode="numeric" min={1} max={stack.count} step={1} value={dropCount} onChange={e => setDropCount(e.target.value)} className="h-11 min-w-0 flex-1" />
              </label>
              {!dropValid && <p className="text-xs text-destructive">1~{stack.count} 사이의 정수를 입력하세요.</p>}
              <Button type="button" variant="destructive" className="pixel-btn min-h-11 w-full" disabled={!dropValid} onClick={() => act(id => onDrop([{ itemId: id, count: Number(dropCount) }]))}><Trash2 />버리기</Button>
            </section>}
            {(item.food || item.heal || item.book) && <Button type="button" className="pixel-btn min-h-11" disabled={!ready || (!inBag && !canTransfer)} onClick={() => act(onUse)}>
              {item.book ? <BookOpen /> : <Utensils />}{item.book ? '기술서 읽기' : item.food ? '1개 먹기' : '1개 사용하기'}
            </Button>}
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}