import { useEffect, useState } from 'react';
import { Flame, Volume2, Zap } from 'lucide-react';
import { ACTIVE_SKILLS, type ActiveSkill } from '@/lib/survival/abilities';
import { skillCooldownMs, skillLevel } from '@/lib/survival/skillLevels';

const icons = { stone_barrage: Zap, roar: Volume2, ember_scatter: Flame };

/** Bottom-right thumb slots for learned attack skills with cooldown sweep. */
export function SkillQuickBar({ known, cooldowns, levels, ready, onUse }: { known: string[]; cooldowns?: Record<string, number>; levels?: Record<string, number>; ready: boolean; onUse: (id: ActiveSkill) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const ids = (Object.keys(ACTIVE_SKILLS) as ActiveSkill[]).filter(id => known.includes(id));
  if (!ids.length) return null;
  return <div className="absolute bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+3.5rem)] right-2 z-20 flex flex-col gap-2">
    {ids.map(id => {
      const Icon = icons[id]; const lv = skillLevel(levels, id);
      const left = Math.max(0, (cooldowns?.[id] ?? 0) - now);
      const frac = Math.min(1, left / skillCooldownMs(id, lv));
      return <button key={id} type="button" aria-label={`${ACTIVE_SKILLS[id].name} Lv.${lv}`} disabled={!ready || left > 0} onClick={() => onUse(id)}
        className="pixel-btn relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-card disabled:opacity-80">
        <Icon className="!h-7 !w-7 text-primary" />
        {left > 0 && <div aria-hidden className="absolute inset-0 bg-foreground/50" style={{ clipPath: `inset(${(1 - frac) * 100}% 0 0 0)` }} />}
        {left > 0 && <span className="absolute text-xs font-bold text-background">{Math.ceil(left / 1000)}</span>}
        <span className="absolute bottom-0 right-1 text-[9px] font-bold">Lv{lv}</span>
      </button>;
    })}
  </div>;
}
