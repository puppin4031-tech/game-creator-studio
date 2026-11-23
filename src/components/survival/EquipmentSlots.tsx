import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { ITEMS } from '@/lib/survival/items';
import { GEAR_SLOTS, slotUnlocked, type GearSlot, type Loadout } from '@/lib/survival/equipment';
import { gearMult } from '@/lib/survival/upgrade';
import type { GearInstance } from '@/lib/survival/types';

interface Props { gear: GearInstance[]; loadout: Loadout; level: number; onEquip: (slot: GearSlot, uid: string | null) => void; icon: (g: GearInstance) => ReactNode }

const pct = (v: number) => (v > 0 && v < 1 ? `${Math.round(v * 100)}%` : `${v}`);

const stat = (g: GearInstance) => {
  const d = ITEMS[g.itemId]; const m = gearMult(g);
  if (!d) return '알 수 없는 장비';
  if (d.weapon) return `공격력 +${Math.round(d.weapon.atk * m)}${d.weapon.ranged ? ' · 원거리' : ''}`;
  if (d.armor) return `방어력 +${Math.round(d.armor.def * m)}`;
  if (d.tool) return `채집 속도 +${Math.round(d.tool.power * m * 10) / 10}${d.tool.chop ? ` · 벌목 ${d.tool.chop}단계` : ''}${d.tool.mine ? ` · 채굴 ${d.tool.mine}단계` : ''}`;
  if (d.trinket) return `전리품 +${pct(d.trinket.lootBonus)} · 경험치 +${pct(d.trinket.xpBonus)}`;
  return d.desc;
};

/** Sum of worn gear stats for the stat panel. */
function totals(loadout: Loadout) {
  const t = { atk: 0, def: 0, gather: 0, loot: 0, xp: 0 };
  for (const g of Object.values(loadout)) {
    if (!g) continue;
    const d = ITEMS[g.itemId]; const m = gearMult(g);
    if (!d) continue;
    t.atk += Math.round((d.weapon?.atk ?? 0) * m);
    t.def += Math.round((d.armor?.def ?? 0) * m);
    t.gather = Math.max(t.gather, Math.round((d.tool?.power ?? 0) * m * 10) / 10);
    t.loot += d.trinket?.lootBonus ?? 0;
    t.xp += d.trinket?.xpBonus ?? 0;
  }
  return t;
}

/** Worn slots (one item each, level-gated) plus carried spare gear. */
export function EquipmentSlots({ gear, loadout, level, onEquip, icon }: Props) {
  const worn = new Set(Object.values(loadout).filter(Boolean).map(g => g!.uid));
  const spare = gear.filter(g => !worn.has(g.uid));
  const t = totals(loadout);
  const rows: [string, string][] = [
    ['공격력', `+${t.atk}`], ['방어력', `+${t.def}`], ['채집 속도', `+${t.gather}`],
    ['특수 효과', t.loot || t.xp ? `전리품 +${pct(t.loot)} · 경험치 +${pct(t.xp)}` : '없음'],
  ];
  return (
    <div className="space-y-2">
      <b className="text-sm">장비 능력치</b>
      <div className="pixel-frame grid grid-cols-2 gap-x-3 gap-y-1 bg-card p-2 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className={`flex justify-between gap-1 ${k === '특수 효과' ? 'col-span-2' : ''}`}><span className="text-muted-foreground">{k}</span><b>{v}</b></div>
        ))}
      </div>
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
                  <div className="min-w-0 flex-1"><p className="text-[10px] text-muted-foreground">{slot.label}</p><b className="block truncate">{ITEMS[g.itemId]?.name ?? g.itemId}{g.plus ? ` +${g.plus}` : ''}</b><span>{stat(g)}</span></div>
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
            const def = ITEMS[g.itemId];
            const slots = GEAR_SLOTS.filter(s => s.category === def?.category && slotUnlocked(s, level));
            return (
              <div key={g.uid} className="pixel-frame flex items-center gap-1.5 bg-card p-1.5 text-xs">
                {icon(g)}
                <div className="min-w-0 flex-1"><b className="block truncate">{def?.name ?? g.itemId}{g.plus ? ` +${g.plus}` : ''}</b><span className="text-muted-foreground">{stat(g)}</span></div>
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
