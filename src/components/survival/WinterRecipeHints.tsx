import { ArrowRight } from 'lucide-react';
import { ITEMS, type ItemId } from '@/lib/survival/items';

const icons = import.meta.glob('../../assets/survival/item-*.png', { eager: true, import: 'default' }) as Record<string, string>;
const icon = (id: ItemId) => icons[`../../assets/survival/${ITEMS[id].sprite}.png`];

const HINTS: { title: string; mats: ItemId[]; category: string }[] = [
  { title: '얼음 썰매', mats: ['frost_shard', 'bone', 'branch'], category: '도구' },
  { title: '겨울 방한 털옷', mats: ['frost_pelt', 'bone', 'branch'], category: '방어구' },
];

/** Picture hints for the winter inventions so kids can match collected items at the altar. */
export function WinterRecipeHints({ have }: { have: (id: string) => number }) {
  return (
    <div className="space-y-2 rounded border border-border bg-muted/40 p-2" aria-label="겨울 발명 힌트">
      <p className="text-xs font-bold">겨울 발명 힌트</p>
      {HINTS.map(h => (
        <div key={h.title} className="flex items-center gap-1.5">
          {h.mats.map(id => (
            <div key={id} className={`flex w-12 flex-col items-center text-[10px] ${have(id) ? '' : 'opacity-40'}`} title={ITEMS[id].name}>
              <img src={icon(id)} alt={ITEMS[id].name} className="pixelated h-8 w-8" />
              <span className="truncate">{ITEMS[id].name.split(' ')[0]}</span>
            </div>
          ))}
          <ArrowRight className="!h-4 !w-4 shrink-0 text-muted-foreground" />
          <div className="text-xs"><b>{h.title}</b><div className="text-muted-foreground">{h.category} 탭</div></div>
        </div>
      ))}
    </div>
  );
}
