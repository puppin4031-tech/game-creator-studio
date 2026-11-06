import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { ITEMS } from '@/lib/survival/items';
import { GEAR_SLOTS, slotUnlocked, type GearSlot, type Loadout } from '@/lib/survival/equipment';
import type { GearInstance } from '@/lib/survival/types';

interface Props { gear: GearInstance[]; loadout: Loadout; level: number; onEquip: (slot: GearSlot, uid: string | null) => void; icon: (g: GearInstance) => ReactNode }

const stat = (g: GearInstance) => {
  const d = ITEMS[g.itemId];
  if (d.weapon) return `공격 ${d.weapon.atk}`;
  if (d.armor) return `방어 ${d.armor.def}`;
  if (d.tool) return `${d.tool.chop ? '벌목' : ''}${d.tool.chop && d.tool.mine ? '·' : ''}${d.tool.mine ? `채굴 ${d.tool.mine}` : ''}`;
  return d.desc;
};

/** Worn slots (one item each, level-gated) plus carried spare gear. */
export function EquipmentSlots({ gear, loadout, level, onEquip, icon }: Props) {
  const worn = new Set(Object.values(loadout).filter(Boolean).map(g => g!.uid));
  const spare = gear.filter(g => !worn.has(g.uid));
  return (
    <div className="space-y-2">
      <b className="text-sm">착용 장비</b>
      <div className="grid grid-cols-2 gap-1.5">
        {GEAR_SLOTS.map(slot => {
          const open = slotUnlocked(slot, level);
          const g = loadout[slot.id];
          return (
            <div key={slot.id} className={`pixel-frame flex min-h-14 items-center gap-1.5 p-1.5 text-xs ${open ? 'bg-card' : 'bg-muted text-muted-foreground'}`}>
              {!open ? <><Lock className="!h-4 !w-4" />{slot.label} · Lv.{slot.unlockLevel} 해금</> : g ? (
                <>
                  {icon(g)}
                  <div className="min-w-0 flex-1"><p className="text-[10px] text-muted-foreground">{slot.label}</p><b className="block truncate">{ITEMS[g.itemId].name}</b><span>{stat(g)}</span></div>
                  <button type="button" className="min-h-11 px-1 underline" onClick={() => onEquip(slot.id, null)}>벗기</button>
                </>
              ) : <span>{slot.label} · 비어 있음</span>}
            </div>
          );
        })}
      </div>
      {!!spare.length && (
        <div className="space-y-1">
          <b className="text-sm">배낭 속 장비</b>
          {spare.map(g => {
            const slots = GEAR_SLOTS.filter(s => s.category === ITEMS[g.itemId].category && slotUnlocked(s, level));
            return (
              <div key={g.uid} className="pixel-frame flex items-center gap-1.5 bg-card p-1.5 text-xs">
                {icon(g)}
                <div className="min-w-0 flex-1"><b className="block truncate">{ITEMS[g.itemId].name}</b><span className="text-muted-foreground">{stat(g)}</span></div>
                {slots.length ? slots.map(s => (
                  <button key={s.id} type="button" className="pixel-btn min-h-11 bg-primary px-2 text-primary-foreground" onClick={() => onEquip(s.id, g.uid)}>{slots.length > 1 ? s.label.replace('채집 ', '') : '착용'}</button>
                )) : <span className="text-muted-foreground">슬롯 잠김</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
