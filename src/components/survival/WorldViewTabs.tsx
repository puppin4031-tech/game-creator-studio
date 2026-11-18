import { Compass, Flame, PawPrint, User } from 'lucide-react';
import type { BaseSite } from '@/lib/survival/worldView';
import type { ContextMode } from './ContextThemeWrapper';

export interface ContextTabItem {
  id: ContextMode;
  label: string;
  icon: typeof User;
  activeColor: string;
}

const TABS: ContextTabItem[] = [
  { id: 'user', label: '유저', icon: User, activeColor: 'bg-amber-600 text-white' },
  { id: 'base', label: '거점', icon: Flame, activeColor: 'bg-orange-600 text-white' },
  { id: 'pet', label: '펫', icon: PawPrint, activeColor: 'bg-emerald-600 text-white' },
  { id: 'expedition', label: '원정대', icon: Compass, activeColor: 'bg-sky-600 text-white' },
];

interface Props {
  contextMode: ContextMode;
  onContextMode: (mode: ContextMode) => void;
  site: BaseSite;
  onSite: (s: BaseSite) => void;
  hasBase: boolean;
  hasOutpost: boolean;
  crewActive: boolean;
  hasExpeditionUnlocked?: boolean;
}

/** 4-Context Segmented View Switcher under the Top HUD */
export default function WorldViewTabs({
  contextMode,
  onContextMode,
  site,
  onSite,
  hasBase,
  hasOutpost,
  crewActive,
  hasExpeditionUnlocked = true,
}: Props) {
  const visibleTabs = TABS.filter(tab => tab.id !== 'expedition' || hasExpeditionUnlocked);

  return (
    <div className="absolute left-2 top-[calc(max(0.5rem,env(safe-area-inset-top))+4.5rem)] z-25 flex w-auto max-w-[260px] flex-col gap-1">
      <div role="tablist" aria-label="컨텍스트 전환" className="pixel-frame grid grid-cols-4 bg-card/95 p-0.5 shadow-md border border-border">
        {visibleTabs.map(({ id, label, icon: Icon, activeColor }) => {
          const disabled = id === 'base' && !hasBase;
          const on = contextMode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={disabled}
              onClick={() => onContextMode(id)}
              className={`relative flex items-center justify-center gap-0.5 py-1 px-1 text-[11px] font-bold transition-all disabled:opacity-40 ${
                on ? `${activeColor} shadow-sm scale-102` : 'hover:bg-accent/40'
              }`}
            >
              <Icon className="!h-3.5 !w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
              {id === 'expedition' && crewActive && !on && (
                <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-destructive animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {contextMode === 'base' && hasOutpost && (
        <div role="tablist" aria-label="거점 선택" className="flex gap-1 self-start">
          {(['main', 'outpost'] as const).map(id => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={site === id}
              onClick={() => onSite(id)}
              className={`pixel-btn min-h-7 px-2 text-[10px] ${
                site === id ? 'bg-orange-600 text-white font-bold' : 'bg-card'
              }`}
            >
              {id === 'main' ? '본진' : '전진기지'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
