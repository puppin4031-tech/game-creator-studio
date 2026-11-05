import { useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ITEMS } from '@/lib/survival/items';
import { MATERIAL_PHYSICS, MAX_SLOTS, checkInvention, type InventionCategory, type InventionInput } from '@/lib/survival/invention';
import { ALTAR_COST, fallbackInventionName, type InventedItem } from '@/lib/survival/inventedItems';
import type { Stack } from '@/lib/survival/types';

const CATS: { id: InventionCategory; label: string; effect: string }[] = [
  { id: 'weapon', label: '무기', effect: '공격력' },
  { id: 'tool', label: '도구', effect: '벌목·채광 힘' },
  { id: 'building', label: '보호구', effect: '방어력' },
  { id: 'relic', label: '부적', effect: '전리품·경험치' },
];
const REASON: Record<string, string> = {
  empty: '재료를 올려 주세요', too_many_slots: `재료는 ${MAX_SLOTS}종까지`, bad_qty: '수량이 너무 많아요',
  unknown_material: '발명에 쓸 수 없는 재료예요', implausible: '자연의 이치에 맞지 않아 형태가 잡히지 않아요', no_binding: '부품을 묶을 끈·송진·가죽이 필요해요',
};

interface Props {
  altar: boolean; ready: boolean; inBase: boolean; owned: Stack[]; inventions: InventedItem[];
  onBuild: () => void; onInvent: (input: InventionInput, naming: { name: string; desc: string }) => InventedItem | null;
}

export function AltarPanel({ altar, ready, inBase, owned, inventions, onBuild, onInvent }: Props) {
  const [cat, setCat] = useState<InventionCategory>('weapon');
  const [mats, setMats] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const have = (id: string) => owned.filter(s => s.itemId === id).reduce((n, s) => n + s.count, 0);
  const usable = Object.keys(MATERIAL_PHYSICS).filter(id => have(id) > 0);
  const input: InventionInput = { category: cat, materials: mats };
  const check = useMemo(() => checkInvention(input), [cat, mats]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = (id: string) => ITEMS[id as keyof typeof ITEMS]?.name ?? id;

  if (!altar) return <div className="space-y-2 text-sm">
    <p>본거지에 제단을 세우면 자연 재료를 조합해 새 무기·도구·보호구·부적을 발명할 수 있어요.</p>
    <p className="text-xs text-muted-foreground">재료: {ALTAR_COST.map(c => `${name(c.itemId)} ${c.count}`).join(' · ')}</p>
    <Button className="h-11 w-full" disabled={!ready || !inBase} onClick={onBuild}>제단 세우기</Button>
  </div>;

  const step = (id: string, d: number) => setMats(m => {
    const n = Math.max(0, Math.min(have(id), 20, (m[id] ?? 0) + d));
    const next = { ...m, [id]: n }; if (!n) delete next[id]; return next;
  });
  const run = async () => {
    if (check.ok === false) return;
    setBusy(true);
    let naming = { name: fallbackInventionName(cat, mats), desc: '제단에서 태어난 발명품.' };
    try {
      const { data, error } = await supabase.functions.invoke('survival-invent', { body: { category: cat, materials: mats, power: check.power } });
      if (error) throw error;
      if (data?.name) naming = { name: data.name, desc: data.desc || naming.desc };
    } catch {
      toast.warning('AI 이름짓기에 실패해 기본 이름으로 만들었어요');
    } finally {
      const made = onInvent(input, naming);
      if (made) setMats({});
      setBusy(false);
    }
  };

  return <div className="space-y-3 text-sm">
    <div className="grid grid-cols-4 gap-1">{CATS.map(c => <Button key={c.id} size="sm" variant={cat === c.id ? 'default' : 'outline'} className="h-11" onClick={() => setCat(c.id)}>{c.label}</Button>)}</div>
    <div className="space-y-1">{usable.length ? usable.map(id => <div key={id} className="flex items-center gap-2">
      <span className="flex-1">{name(id)} <span className="text-xs text-muted-foreground">({have(id)})</span></span>
      <Button size="sm" variant="outline" className="h-11 w-11" onClick={() => step(id, -1)}>-</Button>
      <b className="w-6 text-center">{mats[id] ?? 0}</b>
      <Button size="sm" variant="outline" className="h-11 w-11" onClick={() => step(id, 1)}>+</Button>
    </div>) : <p className="text-muted-foreground">발명에 쓸 자연 재료가 없어요.</p>}</div>
    <div className="pixel-frame bg-card p-2 text-xs" role="status">
      {check.ok ? <>예상 {CATS.find(c => c.id === cat)!.effect} <b>{check.power}</b> · 개연성 {check.score}/10</> : REASON[check.reason] ?? '조합 불가'}
    </div>
    <Button className="h-11 w-full" disabled={!ready || !inBase || !check.ok || busy} onClick={run}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}제단에 바쳐 발명하기</Button>
    {!!inventions.length && <div className="space-y-1 border-t border-border pt-2">
      <b>발명 기록</b>
      {inventions.map(inv => <div key={inv.id} className="flex items-center gap-2 text-xs">
        <span className="flex-1"><b>{inv.name}</b> · {inv.desc}</span>
        <Button size="sm" variant="outline" className="h-11" disabled={!ready || !inBase || busy} onClick={() => onInvent({ category: inv.category, materials: inv.materials }, inv)}>다시 만들기</Button>
      </div>)}
    </div>}
  </div>;
}
