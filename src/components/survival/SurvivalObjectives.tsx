import { Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QUESTS, type QuestState } from '@/lib/survival/quests';
import { ITEMS } from '@/lib/survival/items';

export default function SurvivalObjectives({ state, canClaim, onClaim }: { state: QuestState; canClaim: boolean; onClaim: () => void }) {
  return <div className="space-y-3">
    {QUESTS.map((quest, index) => {
      const completed = index < state.questIndex;
      const active = index === state.questIndex;
      const progress = quest.progress(state);
      const ready = progress.cur >= progress.max;
      return <div key={quest.id} className={`border-b border-border pb-3 ${active || completed ? '' : 'text-muted-foreground'}`}>
        <div className="flex items-center gap-2 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center">{completed ? <Check className="h-5 w-5 text-primary" /> : active ? index + 1 : <Lock className="h-4 w-4" />}</span><b className="flex-1">{quest.title}</b><span>{completed ? '완료' : `${progress.cur}/${progress.max}`}</span></div>
        {active && <div className="mt-2 space-y-2 text-xs">
          <p>{quest.hint}</p>
          <div className="h-2 overflow-hidden rounded-sm bg-muted"><div className="h-full bg-primary" style={{ width: `${progress.cur / progress.max * 100}%` }} /></div>
          <p className="text-muted-foreground">보상: 경험치 {quest.reward.xp}{quest.reward.stacks.map(stack => ` · ${ITEMS[stack.itemId].name} ×${stack.count}`).join('')}</p>
          <Button className="min-h-11 w-full" disabled={!ready || !canClaim} onClick={onClaim}>{ready && !canClaim ? '거점에서 보상 받기' : '보상 받기'}</Button>
        </div>}
      </div>;
    })}
  </div>;
}