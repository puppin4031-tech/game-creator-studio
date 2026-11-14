import { useMemo, useState } from 'react';
import { Anvil, Loader2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEMS } from '@/lib/survival/items';
import { MATERIAL_PHYSICS, REFORGE_SLOTS, physicsSignal, reforgePower } from '@/lib/survival/invention';
import { gearBasePower, gearCategory } from '@/lib/survival/inventedItems';
import type { GearInstance } from '@/lib/survival/types';

interface Props {
  gear: GearInstance[]; have: (id: string) => number; busy: boolean; canPay: boolean;
  onReforge: (uid: string, catalysts: Record<string, number>) => Promise<boolean>;
}
const name = (id: string) => ITEMS[id as keyof typeof ITEMS]?.name ?? id;

/** Altar reforging: pick one owned gear piece, add up to three catalysts, and let the AI forge a new item. */
export function ReforgePanel({ gear, have, busy, canPay, onReforge }: Props) {
  const list = gear.filter(g => gearCategory(ITEMS[g.itemId]));
  const [uid, setUid] = useState<string | null>(null);
  const [mats, setMats] = useState<Record<string, number>>({});
  const picked = list.find(g => g.uid === uid) ?? null;
  const def = picked ? ITEMS[picked.itemId] : undefined;
  const category = gearCategory(def);
  const signal = useMemo(() => category ? physicsSignal({ category, materials: mats, heat: true, sacred: true }, true) : null, [category, mats]);
  if (!list.length) return null;
  const usable = Object.keys(MATERIAL_PHYSICS).filter(id => have(id) > 0);
  const selected = Object.keys(mats);
  const step = (id: string, d: number) => setMats(m => {
    if (d > 0 && !m[id] && Object.keys(m).length >= REFORGE_SLOTS) return m;
    const n = Math.max(0, Math.min(have(id), 20, (m[id] ?? 0) + d));
    const next = { ...m, [id]: n }; if (!n) delete next[id]; return next;
  });
  const base = gearBasePower(def);
  const next = category && signal?.result.ok ? reforgePower(category, base, signal.result.power) : null;
  const unit = (v: number) => category === 'building' ? `방어 ${Math.max(1, Math.round(v / 3))}` : category === 'weapon' ? `공격 ${Math.round(v)}` : category === 'tool' ? `채취력 ${(1 + v).toFixed(1)}` : `전리품 +${Math.round(v * 100)}%`;
  const run = async () => { if (!picked) return; if (await onReforge(picked.uid, mats)) { setMats({}); setUid(null); } };
  return (
    <div className="space-y-2 border-t border-border pt-2 text-xs">
      <b className="flex items-center gap-1 text-sm"><Anvil className="!h-4 !w-4" />장비 재련 · 새 장비로 다시 만들기</b>
      <p className="text-muted-foreground">기존 장비 1개 + 촉매 최대 {REFORGE_SLOTS}종을 제단에 올리면, 현자가 경도·탄성·예리함과 쓰임새를 분석해 새 장비로 바꿉니다. 강화 단계와 착용 상태는 그대로 이어집니다.</p>
      <div className="flex flex-wrap gap-1">{list.map(g => <Button key={g.uid} size="sm" variant={uid === g.uid ? 'default' : 'outline'} className="h-11" disabled={busy} onClick={() => { setUid(g.uid); setMats({}); }}>{ITEMS[g.itemId].name}{g.plus ? ` +${g.plus}` : ''}</Button>)}</div>
      {picked && signal && <>
        <div className="max-h-40 space-y-1 overflow-y-auto overscroll-contain">{usable.map(id => <div key={id} className="flex items-center gap-2"><span className="min-w-0 flex-1">{name(id)} <span className="text-muted-foreground">({have(id)})</span></span><Button aria-label={`${name(id)} 빼기`} size="icon" variant="outline" className="h-11 w-11" disabled={busy || !mats[id]} onClick={() => step(id, -1)}><Minus /></Button><b className="w-6 text-center">{mats[id] ?? 0}</b><Button aria-label={`${name(id)} 올리기`} size="icon" variant="outline" className="h-11 w-11" disabled={busy || (selected.length >= REFORGE_SLOTS && !mats[id]) || mats[id] >= have(id)} onClick={() => step(id, 1)}><Plus /></Button></div>)}</div>
        <div className={`space-y-1 border border-border p-2 signal-${signal.kind}`} role="status">
          <p className="whitespace-pre-line leading-relaxed">{selected.length ? signal.advice : '촉매를 1종 이상 올려 주세요.'}</p>
          <p>촉매 경도 {signal.hardness} · 탄성 {signal.elasticity} · 예리함 {signal.sharpness}</p>
          <p className="font-bold">{def?.name}: {unit(base)}{next != null ? ` → 재련 후 ${unit(next)}` : ''}</p>
        </div>
        <Button className="min-h-11 h-auto w-full whitespace-normal py-2" disabled={busy || !signal.result.ok || !canPay} onClick={run}>{busy ? <Loader2 className="animate-spin" /> : <Anvil />}{canPay ? '현자에게 재련 맡기기 (발명권 1)' : '발명권이 없습니다'}</Button>
      </>}
    </div>
  );
}
