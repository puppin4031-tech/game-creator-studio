import { useState } from 'react';
import { LoaderCircle, RefreshCw, Route, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ITEMS, ITEM_IDS, type ItemId } from '@/lib/survival/items';
import { NODES, type NodeType } from '@/lib/survival/entities';
import { TECHS } from '@/lib/survival/tech';
import { plannerInputSchema, type PlannerInput } from '@/lib/survival/plannerInput';
import { useSurvivalPlanner } from '@/hooks/useSurvivalPlanner';

export default function SurvivalPlanner({ snapshot, onClose }: { snapshot: PlannerInput; onClose: () => void }) {
  const [input, setInput] = useState(snapshot);
  const [validation, setValidation] = useState('');
  const ai = useSurvivalPlanner();
  const update = <K extends keyof PlannerInput>(key: K, value: PlannerInput[K]) => setInput(p => ({ ...p, [key]: value }));
  const setCount = (kind: 'inventory' | 'storage', itemId: string, count: number) => update(kind, [...input[kind].filter(x => x.itemId !== itemId), ...(count > 0 ? [{ itemId, count }] : [])]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = plannerInputSchema.safeParse(input);
    if (!parsed.success) { setValidation('체력·허기는 0~100으로 입력하고 생존 목표를 작성해 주세요.'); return; }
    setValidation(''); void ai.generate(parsed.data);
  };
  return (
    <section role="dialog" aria-modal="true" aria-labelledby="survival-plan-title" className="absolute inset-0 z-40 flex flex-col bg-background pt-[env(safe-area-inset-top)]">
      <header className="flex shrink-0 items-center justify-between border-b-2 border-foreground px-3 py-2">
        <h2 id="survival-plan-title" className="flex items-center gap-2 text-lg font-bold"><Route className="!h-6 !w-6" />생존 계획</h2>
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="생존 계획 닫기" onClick={() => { ai.stop(); onClose(); }}><X /></Button>
      </header>
      <form onSubmit={submit} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Lovable AI</span>
          <Button type="button" variant="outline" className="min-h-11" disabled={ai.loading} onClick={() => { setInput({ ...snapshot, goal: input.goal }); setValidation(''); }}><RefreshCw />현재 상태 불러오기</Button>
        </div>
        <fieldset disabled={ai.loading} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(['health', 'hunger'] as const).map(key => <label key={key} className="space-y-1 text-sm">{key === 'health' ? '체력 (0~100)' : '허기 (100 = 배부름)'}<Input className="h-11 text-base" type="number" min={0} max={100} value={input[key]} onChange={e => update(key, Number(e.target.value))} /></label>)}
          </div>
          <label className="block space-y-1 text-sm">생존 목표<Textarea required maxLength={500} className="text-base" value={input.goal} placeholder="예: 주먹도끼를 만들고 오늘 먹을 음식 확보" onChange={e => update('goal', e.target.value)} /></label>
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">보유 아이템 · 배낭 / 창고</summary>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_4rem_4rem] gap-2 text-xs text-muted-foreground"><span>아이템</span><span>배낭</span><span>창고</span></div>
              {ITEM_IDS.map(id => <div key={id} className="grid grid-cols-[1fr_4rem_4rem] items-center gap-2 text-sm"><span>{ITEMS[id].name}</span>{(['inventory', 'storage'] as const).map(kind => <Input key={kind} aria-label={`${ITEMS[id].name} ${kind === 'inventory' ? '배낭' : '창고'} 수량`} className="h-11 px-2 text-base" type="number" min={0} max={9999} value={input[kind].find(x => x.itemId === id)?.count ?? 0} onChange={e => setCount(kind, id, Number(e.target.value))} />)}</div>)}
            </div>
          </details>
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">배운 기술 ({input.learnedSkills.length})</summary>
            <div className="grid grid-cols-2 gap-2">{TECHS.map(t => <label key={t.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-primary" checked={input.learnedSkills.includes(t.id)} onChange={e => update('learnedSkills', e.target.checked ? [...input.learnedSkills, t.id] : input.learnedSkills.filter(id => id !== t.id))} />{t.name}</label>)}</div>
          </details>
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">주변 자원 ({input.nearbyResources.length}종류)</summary>
            <div className="space-y-2">{(Object.keys(NODES) as NodeType[]).map(type => {
              const resource = input.nearbyResources.find(r => r.type === type);
              return <div key={type} className="flex flex-wrap items-center gap-2"><label className="flex min-h-11 flex-1 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-primary" checked={!!resource} onChange={e => update('nearbyResources', e.target.checked ? [...input.nearbyResources, { type, count: 1, distanceM: 25 }] : input.nearbyResources.filter(r => r.type !== type))} />{NODES[type].name}</label>{resource && <label className="flex items-center gap-1 text-xs"><Input aria-label={`${NODES[type].name} 거리`} className="h-11 w-20 text-base" type="number" min={0} max={10000} value={resource.distanceM} onChange={e => update('nearbyResources', input.nearbyResources.map(r => r.type === type ? { ...r, distanceM: Number(e.target.value) } : r))} />m</label>}</div>;
            })}</div>
          </details>
          <details>
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">거점 · 장비 · 누적 채집</summary>
            <div className="space-y-3 text-sm">
              <label className="block">거점 단계<Input aria-label="거점 단계" type="number" min={0} max={3} className="h-11 text-base" value={input.baseLevel} onChange={e => update('baseLevel', Number(e.target.value))} /></label>
              <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={input.inBase} onChange={e => update('inBase', e.target.checked)} />거점 안에 있음</label>
              <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={input.isNight} onChange={e => update('isNight', e.target.checked)} />밤</label>
              <p>장비: {input.gear.map(id => ITEMS[id as ItemId]?.name).join(', ') || '없음'}</p>
              {TECHS.filter(t => t.inspire).map(t => {
                const id = t.inspire?.itemId;
                return id ? <label key={t.id} className="flex items-center justify-between gap-2">{ITEMS[id].name} 누적 채집<Input aria-label={`${ITEMS[id].name} 누적 채집`} type="number" min={0} max={1000000} className="h-11 w-24 text-base" value={input.gathered[id] ?? 0} onChange={e => update('gathered', { ...input.gathered, [id]: Number(e.target.value) })} /></label> : null;
              })}
            </div>
          </details>
        </fieldset>
        <p className="text-xs text-muted-foreground">계획 생성 시 워크스페이스 AI 크레딧이 사용됩니다.</p>
        {(validation || ai.error) && <p role="alert" className="break-words text-sm text-destructive">{validation || ai.error}</p>}
        <div className="flex gap-2">
          <Button type="submit" className="min-h-11 flex-1" disabled={ai.loading}>{ai.loading ? <LoaderCircle className="animate-spin" /> : <Route />}{ai.loading ? '계획 생성 중' : '계획 생성'}</Button>
          {ai.loading && <Button type="button" variant="outline" className="min-h-11" onClick={ai.stop}><Square />중단</Button>}
        </div>
        {ai.plan && <section aria-label="AI 생존 계획 결과" className="border-t-2 border-foreground pt-4"><h3 className="mb-2 font-bold">채집·제작 계획</h3><div className="whitespace-pre-wrap break-words text-sm leading-7">{ai.plan}</div></section>}
      </form>
    </section>
  );
}