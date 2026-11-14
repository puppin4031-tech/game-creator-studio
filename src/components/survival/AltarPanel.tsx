import { useMemo, useState } from 'react';
import { Flame, Loader2, Minus, Plus, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { ITEMS, gearEffect } from '@/lib/survival/items';
import { MATERIAL_PHYSICS, MATERIAL_TIER, ANVIL_SLOTS, MAX_SLOTS, physicsSignal, masterworkChance, type InventionCategory, type InventionInput } from '@/lib/survival/invention';
import { ALTAR_COST, fallbackInventionName, type InventedItem } from '@/lib/survival/inventedItems';
import { normalizeCredits, settleCredits, type InventionCredits } from '@/lib/survival/inventionCredits';
import { useRewardTrigger } from '@/hooks/useRewardTrigger';
import { useAuth } from '@/contexts/AuthContext';
import { usesRemoteInventions } from '@/lib/survival/inventionAccess';
import { RewardChargeModal } from './RewardChargeModal';
import { WinterRecipeHints } from './WinterRecipeHints';
import { GearUpgradeList } from './GearUpgradeList';
import { ReforgePanel } from './ReforgePanel';
import { gearBasePower, gearCategory } from '@/lib/survival/inventedItems';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { matchBlueprint } from '@/lib/survival/blueprints';
import type { GearInstance } from '@/lib/survival/types';
import type { Stack } from '@/lib/survival/types';

const CATS: { id: InventionCategory; label: string; effect: string }[] = [
  { id: 'weapon', label: '무기', effect: '공격력' }, { id: 'tool', label: '도구', effect: '벌목·채광 힘' },
  { id: 'building', label: '방어구', effect: '방어력' }, { id: 'relic', label: '부적', effect: '전리품·경험치' },
];
interface Props {
  altar: boolean; baseLevel: number; ready: boolean; inBase: boolean; owned: Stack[]; inventions: InventedItem[]; remote: boolean;
  credits?: InventionCredits; walkedMeters: number; inviteUrl: string; onCredits: (c: InventionCredits) => void;
  onBuild: () => void; onInvent: (input: InventionInput, naming: { name: string; desc: string; masterwork?: boolean; ranged?: boolean }) => InventedItem | null;
  gear?: GearInstance[]; onUpgrade?: (uid: string) => void;
  onReforge?: (uid: string, catalysts: Record<string, number>, naming: { name: string; desc: string; analysis?: string; masterwork?: boolean }) => InventedItem | null;
}
export function AltarPanel({ altar, baseLevel, ready, inBase, owned, inventions, remote: realGps, credits, walkedMeters, inviteUrl, onCredits, onBuild, onInvent, gear = [], onUpgrade, onReforge }: Props) {
  const { user, isLoading: authLoading } = useAuth();
  const remote = usesRemoteInventions(realGps, user?.id);
  const [cat, setCat] = useState<InventionCategory>('weapon');
  const [mats, setMats] = useState<Record<string, number>>({});
  const [heat, setHeat] = useState(false), [sacred, setSacred] = useState(false);
  const [busy, setBusy] = useState(false), [charge, setCharge] = useState(false), [hint, setHint] = useState(false);
  const reward = useRewardTrigger(remote, { credits, setCredits: onCredits, walkedMeters });
  const have = (id: string) => owned.filter(s => s.itemId === id).reduce((n, s) => n + s.count, 0);
  const usable = Object.keys(MATERIAL_PHYSICS).filter(id => have(id) > 0);
  const input: InventionInput = { category: cat, materials: mats, heat: altar && heat, sacred: altar && sacred };
  const signal = useMemo(() => physicsSignal(input, altar), [cat, mats, heat, sacred, altar]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = (id: string) => ITEMS[id as keyof typeof ITEMS]?.name ?? id;
  const slots = altar ? MAX_SLOTS : ANVIL_SLOTS;
  const selected = Object.keys(mats);
  const step = (id: string, d: number) => setMats(m => {
    if (d > 0 && !m[id] && Object.keys(m).length >= slots) return m;
    const n = Math.max(0, Math.min(have(id), 20, (m[id] ?? 0) + d));
    const next = { ...m, [id]: n }; if (!n) delete next[id]; return next;
  });
  const run = async () => {
    if (!signal.result.ok || busy || authLoading || !ready || !inBase) return;
    if (reward.credits.freeLeft + reward.credits.bonus === 0) { setCharge(true); return; }
    setBusy(true);
    try {
      let naming = { name: fallbackInventionName(cat, mats), desc: '돌모루에서 태어난 발명품.', masterwork: Math.random() < masterworkChance(altar) };
      if (remote) {
        const { data, error } = await supabase.functions.invoke('survival-invent', { body: { action: 'invent', altar, ...input } });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.message ?? '발명 판정 실패');
        reward.setCredits(data.credits);
        if (!data.accepted) { toast('계시가 기각되었습니다. 발명권 유지 · 시행착오 파편 +1'); return; }
        naming = { name: data.name, desc: data.desc, masterwork: data.masterwork };
      }
      const bp = matchBlueprint(cat, mats);
      const finalNaming = bp ? { ...naming, name: bp.name, desc: bp.desc, ranged: bp.ranged } : naming;
      const made = onInvent(input, finalNaming);
      if (made) {
        if (!remote) { const next = settleCredits(normalizeCredits(credits), true); if (next) onCredits(next); }
        setMats({});
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : '계시에 실패했습니다. 발명권은 유지됩니다'); }
    finally { setBusy(false); }
  };
  const reforge = async (uid: string, catalysts: Record<string, number>) => {
    const g = gear.find(x => x.uid === uid); const def = g && ITEMS[g.itemId]; const category = gearCategory(def);
    if (!onReforge || !g || !def || !category || busy || !ready || !inBase) return false;
    if (reward.credits.freeLeft + reward.credits.bonus === 0) { setCharge(true); return false; }
    setBusy(true);
    try {
      const main = Object.entries(catalysts).sort((a, b) => b[1] - a[1])[0]?.[0];
      let naming: { name: string; desc: string; analysis?: string; masterwork?: boolean } = { name: `${name(main ?? 'stone')} ${def.name}`.slice(0, 16), desc: `${def.name}을(를) 다시 벼린 장비.`, masterwork: Math.random() < masterworkChance(true) };
      if (remote) {
        const { data, error } = await supabase.functions.invoke('survival-invent', { body: { action: 'reforge', category, materials: catalysts, baseName: def.name.slice(0, 24), baseDesc: (def.desc ?? '').slice(0, 120), basePower: Math.min(60, gearBasePower(def)) } });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.message ?? '재련 판정 실패');
        reward.setCredits(data.credits);
        if (!data.accepted) { toast('현자가 재련을 거절했습니다. 발명권 유지 · 시행착오 파편 +1', { description: data.analysis || data.desc }); return false; }
        naming = { name: data.name, desc: data.desc, analysis: data.analysis, masterwork: data.masterwork };
      }
      const made = onReforge(uid, catalysts, naming);
      if (made) { if (naming.analysis) toast(`현자의 분석: ${naming.analysis}`); if (!remote) { const next = settleCredits(normalizeCredits(credits), true); if (next) onCredits(next); } }
      return !!made;
    } catch (e) { toast.error(e instanceof Error ? e.message : '재련에 실패했습니다. 발명권은 유지됩니다'); return false; }
    finally { setBusy(false); }
  };
  const openHint = async () => {
    if (busy || authLoading) return; setBusy(true);
    try {
      if (remote) { const { data, error } = await supabase.functions.invoke('survival-invent', { body: { action: 'hint' } }); if (error || !data?.ok) throw new Error(data?.message ?? '힌트를 열지 못했습니다'); reward.setCredits(data.credits); }
      else { const cur = normalizeCredits(credits); if (cur.fragments < 3) return; onCredits({ ...cur, fragments: cur.fragments - 3 }); }
      setHint(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : '힌트를 열지 못했습니다'); } finally { setBusy(false); }
  };
  return <div className="space-y-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><b>{altar ? '고대 제단' : '기초 돌모루'} · {slots}슬롯</b><Popover><PopoverTrigger asChild><Button size="icon" variant="ghost" className="h-11 w-11" aria-label="제단 안내"><Info className="!h-5 !w-5" /></Button></PopoverTrigger><PopoverContent className="w-72 space-y-1 text-xs"><b>제단 안내</b><p>1. 만들 종류(무기·도구·방어구·부적)를 먼저 고르세요. 종류에 맞는 이름과 능력치가 나옵니다.</p><p>2. 아래 조합 예시대로 넣으면 그 이름 그대로 만들어집니다. 수량을 더 넣으면 능력치가 조금 오릅니다.</p><p>3. 불꽃 색: 회색 연기 = 불가능, 주황 = 만들 수 있음, 파랑 = 재료 궁합이 좋아 효율이 높음.</p><p>4. 경도 = 단단함(공격·채굴), 탄성 = 질김(방어·내구), 예리함 = 날카로움(무기), 가연성 = 불에 타는 정도.</p><p>5. 재료 등급 T1~T4: 높은 등급 재료(가죽·모피 T3, 흑요석·옥·우두머리 털가죽 T4)를 많이 쓸수록 능력치가 최대 30% 더 오릅니다.</p><p>6. 명품: 가끔 나오는 고급품으로 능력치가 더 높습니다.</p><p>7. 제단이 있으면 아래 강화로 기존 장비를 +5까지 올릴 수 있습니다 (단계당 +15%).</p></PopoverContent></Popover><span className="flex items-center gap-1" aria-label="발명권"><Zap className="!h-4 !w-4 text-accent" />{reward.credits.freeLeft}/5 {reward.credits.bonus > 0 && `+${reward.credits.bonus}`}</span></div>
    {!altar && <div className="space-y-2 border-b border-border pb-3 text-xs"><p>개인 제단 · 4슬롯 · 고열 제련 · 신성 부여 · 명품 확률 3배</p><p>재료: {ALTAR_COST.map(c => `${name(c.itemId)} ${c.count}`).join(' · ')}</p><Button className="h-11 w-full" disabled={baseLevel < 2 || !ready || !inBase || !ALTAR_COST.every(c => have(c.itemId) >= c.count)} onClick={onBuild}>{baseLevel < 2 ? '뼈 움막 완공 후 제단 건설' : '개인 제단 건설'}</Button></div>}
    <WinterRecipeHints have={have} category={cat} />
    <div className="grid grid-cols-4 gap-1">{CATS.map(c => <Button key={c.id} size="sm" variant={cat === c.id ? 'default' : 'outline'} disabled={!altar && !['tool','weapon'].includes(c.id) || busy} className="h-11 px-1" onClick={() => setCat(c.id)}>{c.label}</Button>)}</div>
    <div className="grid grid-cols-4 gap-2">{Array.from({length:4},(_,i) => <div key={i} className={`flex h-16 items-center justify-center border border-border text-center text-xs ${i >= slots ? 'bg-muted text-muted-foreground' : 'bg-card'}`}>{i >= slots ? '제단 해금' : selected[i] ? `${name(selected[i])} ×${mats[selected[i]]}` : '빈 슬롯'}</div>)}</div>
    <div className="flex flex-wrap gap-4 text-xs"><label className="flex min-h-11 items-center gap-2"><Flame className="!h-4 !w-4" />고열 제련<Switch checked={heat} disabled={!altar || busy} onCheckedChange={setHeat} /></label><label className="flex min-h-11 items-center gap-2"><Zap className="!h-4 !w-4" />신성 부여<Switch checked={sacred} disabled={!altar || busy} onCheckedChange={setSacred} /></label></div>
    <div className="max-h-48 space-y-1 overflow-y-auto overscroll-contain">{usable.map(id => <div key={id} className="flex items-center gap-2"><span className="min-w-0 flex-1"><span className="mr-1 rounded bg-muted px-1 text-[10px] font-bold">T{MATERIAL_TIER[id] ?? 1}</span>{name(id)} <span className="text-xs text-muted-foreground">({have(id)})</span></span><Button aria-label={`${name(id)} 빼기`} size="icon" variant="outline" className="h-11 w-11" disabled={busy || !mats[id]} onClick={() => step(id,-1)}><Minus /></Button><b className="w-6 text-center">{mats[id] ?? 0}</b><Button aria-label={`${name(id)} 올리기`} size="icon" variant="outline" className="h-11 w-11" disabled={busy || (selected.length >= slots && !mats[id]) || mats[id] >= have(id)} onClick={() => step(id,1)}><Plus /></Button></div>)}</div>
    <div className={`space-y-2 border border-border p-3 text-xs signal-${signal.kind}`} role="status"><b className="flex items-center gap-2"><Flame className="!h-6 !w-6" />{signal.kind === 'smoke' ? '회색 연기 · 불가능' : signal.kind === 'sacred' ? '푸른 신성 불꽃 · 고효율 시너지' : '주황 불꽃 · 실험 가능'}</b><p className="whitespace-pre-line leading-relaxed">{signal.advice}</p><p>경도 {signal.hardness} · 탄성 {signal.elasticity} · 가연성 {signal.flammability} · 예리함 {signal.sharpness} · 수량 {signal.total}</p>{signal.result.ok && <p className="font-bold">예상 결과: {matchBlueprint(cat, mats)?.name ?? fallbackInventionName(cat, mats)} · {CATS.find(c => c.id === cat)?.effect} {cat === 'building' ? `+${Math.max(1, Math.round(signal.result.power / 3))}` : cat === 'weapon' ? `+${Math.round(signal.result.power)}` : cat === 'tool' ? `+${(1 + signal.result.power).toFixed(1)}` : `+${Math.round(signal.result.power * 100)}%`}</p>}</div>
    <Button className="min-h-11 h-auto w-full whitespace-normal py-2" disabled={!ready || !inBase || busy || authLoading || reward.loading || (!signal.result.ok && reward.credits.freeLeft + reward.credits.bonus > 0)} onClick={reward.credits.freeLeft + reward.credits.bonus === 0 ? () => setCharge(true) : run}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}{reward.credits.freeLeft + reward.credits.bonus === 0 ? '광고/미션 수행하고 발명권 충전' : '계시를 받아 발명하기'}</Button>
    <Button variant="outline" className="min-h-11 w-full text-xs" disabled={reward.credits.fragments < 3 || busy} onClick={openHint}>시행착오 파편 {reward.credits.fragments}/3 · 레시피 힌트</Button>
    {hint && <p className="text-xs">확정 조합: 부싯돌 3 + 노끈 1 → 기초 도구. 고대 제단: 옥 2 + 수정 1 → 부적.</p>}
    {!!inventions.length && <div className="space-y-2 border-t border-border pt-2"><b>발명 기록</b>{inventions.map(inv => <div key={inv.id} className="text-xs"><b>{inv.name}{inv.masterwork ? ' · 명품(능력치 상승)' : ''}</b>{inv.reforgedFrom ? ` · ${name(inv.reforgedFrom)} 재련` : ''} · {inv.desc}{inv.analysis && <p className="text-muted-foreground">분석: {inv.analysis}</p>}{gearEffect(ITEMS[inv.id as keyof typeof ITEMS]) && <p className="text-primary">효과: {gearEffect(ITEMS[inv.id as keyof typeof ITEMS])}</p>}<p className="text-muted-foreground">{Object.entries(inv.materials).map(([id,q]) => `${name(id)} ${q}`).join(' + ')}</p></div>)}</div>}
    {altar && onReforge && <ReforgePanel gear={gear} have={have} busy={busy || !ready || !inBase || authLoading} canPay={reward.credits.freeLeft + reward.credits.bonus > 0} onReforge={reforge} />}
    {altar && onUpgrade && <GearUpgradeList gear={gear} have={have} busy={busy || !ready || !inBase} onUpgrade={onUpgrade} />}
    <RewardChargeModal open={charge} onOpenChange={setCharge} credits={reward.credits} loading={reward.loading} prepare={reward.prepare} claim={reward.claimReward} inviteUrl={inviteUrl} />
  </div>;
}
