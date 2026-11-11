import { ArrowRight } from 'lucide-react';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import { BLUEPRINTS } from '@/lib/survival/blueprints';
import type { InventionCategory } from '@/lib/survival/invention';

const icons = import.meta.glob('../../assets/survival/item-*.png', { eager: true, import: 'default' }) as Record<string, string>;
const icon = (id: string) => icons[`../../assets/survival/${ITEMS[id as ItemId]?.sprite}.png`];

/** Picture hints of exact working combinations for the selected category. */
export function WinterRecipeHints({ have, category }: { have: (id: string) => number; category: InventionCategory }) {
  const list = BLUEPRINTS.filter(b => b.category === category);
  return (
    <div className="space-y-2 rounded border border-border bg-muted/40 p-2" aria-label="조합 예시">
      <p className="text-xs font-bold">조합 예시 (그대로 넣으면 이 이름으로 완성)</p>
      {list.map(h => (
        <div key={h.name} className="flex items-center gap-1.5">
          {Object.entries(h.materials).map(([id, q]) => (
            <div key={id} className={`flex w-12 flex-col items-center text-[10px] ${have(id) >= q ? '' : 'opacity-40'}`} title={ITEMS[id as ItemId]?.name}>
              <img src={icon(id)} alt={ITEMS[id as ItemId]?.name} className="pixelated h-8 w-8" />
              <span className="truncate">{ITEMS[id as ItemId]?.name.split(' ')[0]} {q}</span>
            </div>
          ))}
          <ArrowRight className="!h-4 !w-4 shrink-0 text-muted-foreground" />
          <div className="text-xs"><b>{h.name}</b><div className="text-muted-foreground">{h.group}</div></div>
        </div>
      ))}
    </div>
  );
}
