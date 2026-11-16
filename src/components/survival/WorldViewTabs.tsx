import { Compass, Flame, User } from 'lucide-react';
import type { BaseSite, WorldView } from '@/lib/survival/worldView';

const TABS: { id: WorldView; label: string; icon: typeof User }[] = [
  { id: 'user', label: '유저', icon: User },
  { id: 'base', label: '거점', icon: Flame },
  { id: 'expedition', label: '원정대', icon: Compass },
];

interface Props {
  view: WorldView; onView: (v: WorldView) => void;
  site: BaseSite; onSite: (s: BaseSite) => void;
  hasBase: boolean; hasOutpost: boolean; crewActive: boolean;
}

/** Segmented view switcher shown under the top HUD. */
export default function WorldViewTabs({ view, onView, site, onSite, hasBase, hasOutpost, crewActive }: Props) {
  return (
    <div className="absolute inset-x-2 top-[calc(max(0.5rem,env(safe-area-inset-top))+4.25rem)] z-20 mr-12 flex flex-col gap-1">
      <div role="tablist" aria-label="시점 전환" className="pixel-frame grid grid-cols-3 bg-card/95 p-0.5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const disabled = id === 'base' && !hasBase;
          const on = view === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={on} disabled={disabled} onClick={() => onView(id)}
              className={`relative flex min-h-9 items-center justify-center gap-1 text-xs disabled:opacity-40 ${on ? 'bg-primary text-primary-foreground' : ''}`}>
              <Icon className="!h-4 !w-4" />{label}
              {id === 'expedition' && crewActive && !on && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />}
            </button>
          );
        })}
      </div>
      {view === 'base' && hasOutpost && (
        <div role="tablist" aria-label="거점 선택" className="flex gap-1 self-start">
          {(['main', 'outpost'] as const).map(id => (
            <button key={id} type="button" role="tab" aria-selected={site === id} onClick={() => onSite(id)}
              className={`pixel-btn min-h-8 px-2.5 text-[11px] ${site === id ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>{id === 'main' ? '본진' : '전진기지'}</button>
          ))}
        </div>
      )}
    </div>
  );
}
