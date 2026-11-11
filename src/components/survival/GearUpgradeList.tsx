import { Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEMS } from '@/lib/survival/items';
import { MAX_PLUS, upgradeCost } from '@/lib/survival/upgrade';
import type { GearInstance } from '@/lib/survival/types';

interface Props { gear: GearInstance[]; have: (id: string) => number; busy: boolean; onUpgrade: (uid: string) => void }

/** Altar reinforcement for weapons, armor, tools and charms already owned. */
export function GearUpgradeList({ gear, have, busy, onUpgrade }: Props) {
  const list = gear.filter(g => { const d = ITEMS[g.itemId]; return d && (d.weapon || d.armor || d.tool || d.trinket); });
  if (!list.length) return null;
  return (
    <div className="space-y-2 border-t border-border pt-2">
      <b className="flex items-center gap-1"><Hammer className="!h-4 !w-4" />장비 강화 (단계당 능력치 +15%)</b>
      {list.map(g => {
        const cost = upgradeCost(g);
        const ok = !!cost && cost.every(c => have(c.itemId) >= c.count);
        return (
          <div key={g.uid} className="flex items-center gap-2 text-xs">
            <div className="min-w-0 flex-1">
              <b>{ITEMS[g.itemId].name}{g.plus ? ` +${g.plus}` : ''}</b>
              <p className="text-muted-foreground">{cost ? cost.map(c => `${ITEMS[c.itemId].name} ${have(c.itemId)}/${c.count}`).join(' · ') : `최대 +${MAX_PLUS}`}</p>
            </div>
            <Button size="sm" className="h-11" disabled={busy || !ok} onClick={() => onUpgrade(g.uid)}>강화</Button>
          </div>
        );
      })}
    </div>
  );
}
