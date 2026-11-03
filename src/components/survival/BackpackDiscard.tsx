import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';

/** Backpack discard picker: check items, choose counts, then drop them. */
export default function BackpackDiscard({ backpack, onDrop }: { backpack: Stack[]; onDrop: (drops: Stack[]) => void }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Partial<Record<ItemId, number>>>({});

  const held = (id: ItemId) => backpack.find(b => b.itemId === id)?.count ?? 0;
  const setCount = (id: ItemId, n: number) => setPicked(p => ({ ...p, [id]: Math.max(1, Math.min(held(id), n)) }));
  const toggle = (id: ItemId) => setPicked(p => {
    const next = { ...p };
    if (next[id]) delete next[id]; else next[id] = 1;
    return next;
  });
  const drops = (Object.entries(picked) as [ItemId, number][]).filter(([id, n]) => n > 0 && held(id) > 0).map(([itemId, count]) => ({ itemId, count: Math.min(count, held(itemId)) }));
  const kg = drops.reduce((w, d) => w + ITEMS[d.itemId].weight * d.count, 0);
  const total = drops.reduce((n, d) => n + d.count, 0);

  if (!backpack.length) return null;
  if (!open) return <Button variant="outline" className="h-11 w-full" onClick={() => setOpen(true)}><Trash2 />물건 버리기</Button>;

  return (
    <div className="pixel-frame space-y-2 bg-card p-2">
      <b className="text-sm">버릴 물건을 고르세요</b>
      <ul className="space-y-1">
        {backpack.map(s => {
          const on = !!picked[s.itemId];
          const n = picked[s.itemId] ?? 0;
          return (
            <li key={s.itemId} className="flex min-h-11 items-center gap-2 text-xs">
              <label className="flex flex-1 items-center gap-2">
                <Checkbox checked={on} onCheckedChange={() => toggle(s.itemId)} className="h-5 w-5" />
                <span>{ITEMS[s.itemId].name} <span className="text-muted-foreground">(보유 {s.count})</span></span>
              </label>
              {on && (
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-11 w-11" aria-label="하나 줄이기" onClick={() => setCount(s.itemId, n - 1)}><Minus /></Button>
                  <b className="w-6 text-center">{n}</b>
                  <Button size="icon" variant="outline" className="h-11 w-11" aria-label="하나 늘리기" onClick={() => setCount(s.itemId, n + 1)}><Plus /></Button>
                  <Button variant="outline" className="h-11 px-2 text-xs" onClick={() => setCount(s.itemId, s.count)}>최대</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2">
        <Button variant="outline" className="h-11 flex-1" onClick={() => { setOpen(false); setPicked({}); }}>취소</Button>
        <Button variant="destructive" className="h-11 flex-1" disabled={!total}
          onClick={() => { onDrop(drops); setPicked({}); setOpen(false); }}>
          {total ? `${total}개 버리기 (-${Math.round(kg * 10) / 10}kg)` : '버리기'}
        </Button>
      </div>
    </div>
  );
}
