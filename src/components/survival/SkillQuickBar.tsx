import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Flame, Volume2, Zap } from 'lucide-react';
import { ACTIVE_SKILLS, type ActiveSkill } from '@/lib/survival/abilities';
import { skillCooldownMs, skillLevel } from '@/lib/survival/skillLevels';

const icons = { stone_barrage: Zap, roar: Volume2, ember_scatter: Flame };

/** Bottom-right thumb slots for learned attack skills with cooldown sweep. */
export function SkillQuickBar({ known, cooldowns, levels, ready, onUse }: { known: string[]; cooldowns?: Record<string, number>; levels?: Record<string, number>; ready: boolean; onUse: (id: ActiveSkill) => void }) {
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState(true);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const ids = (Object.keys(ACTIVE_SKILLS) as ActiveSkill[]).filter(id => known.includes(id));
  if (!ids.length) return null;
  return <div className="absolute right-2 top-[58%] z-20 -translate-y-1/2 flex flex-col items-center gap-1">
    <button type="button" aria-label={open ? '스킬 접기' : '스킬 펼치기'} onClick={() => setOpen(v => !v)} className="pixel-btn flex items-center justify-center gap-0.5 bg-card py-1.5 px-2.5 text-xs font-bold">{open ? <ChevronUp className="!h-4 !w-4" /> : <><Zap className="!h-4 !w-4 text-primary" /><ChevronDown className="!h-4 !w-4" /></>}</button>
    {open && ids.map(id => {
      const Icon = icons[id]; const lv = skillLevel(levels, id);
      const left = Math.max(0, (cooldowns?.[id] ?? 0) - now);
      const frac = Math.min(1, left / skillCooldownMs(id, lv));
      return <button key={id} type="button" aria-label={`${ACTIVE_SKILLS[id].name} Lv.${lv}`} disabled={!ready || left > 0} onClick={() => onUse(id)}
        className="pixel-btn relative flex items-center justify-center overflow-hidden rounded-full bg-card py-1.5 px-2.5 text-xs disabled:opacity-80">
        <Icon className="!h-4 !w-4 text-primary" />
        {left > 0 && <div aria-hidden className="absolute inset-0 bg-foreground/50" style={{ clipPath: `inset(${(1 - frac) * 100}% 0 0 0)` }} />}
        {left > 0 && <span className="absolute text-[10px] font-bold text-background">{Math.ceil(left / 1000)}</span>}
        <span className="ml-0.5 text-[9px] font-bold">Lv{lv}</span>
      </button>;
    })}
  </div>;
}
