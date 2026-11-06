import { useEffect, useState } from 'react';
import { Copy, Footprints, Loader2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { REWARD_TIMER_MS, type InventionCredits, type RewardType } from '@/lib/survival/inventionCredits';

export function RewardChargeModal({ open, onOpenChange, credits, loading, prepare, claim, inviteUrl }: { open: boolean; onOpenChange: (v: boolean) => void; credits: InventionCredits; loading: boolean; prepare: (t: RewardType) => Promise<void>; claim: (t: RewardType) => Promise<boolean>; inviteUrl: string }) {
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!open) setStarted(null); }, [open]);
  useEffect(() => { if (!started) return; const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, [started]);
  const pct = started ? Math.min(100, ((now - started) / REWARD_TIMER_MS) * 100) : 0;
  const startTimer = async () => { try { await prepare('timer'); setStarted(Date.now()); setNow(Date.now()); } catch { toast.error('가이드를 시작하지 못했습니다'); } };
  const finish = async (type: RewardType) => { if (await claim(type)) { toast.success(`발명권 +${type === 'timer' ? 1 : 3}`); setStarted(null); onOpenChange(false); } };
  const copy = async () => {
    try {
      if (navigator.share) {
        try { await navigator.share({ title: '콜로니온', text: '내 거점에 함께 개척하러 와요!', url: inviteUrl }); }
        catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return; await navigator.clipboard.writeText(inviteUrl); }
      } else await navigator.clipboard.writeText(inviteUrl);
      await finish('invite');
    } catch { toast.error('초대 링크를 공유하지 못했습니다'); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="font-pixel max-h-[85dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
    <DialogHeader><DialogTitle>발명권 충전</DialogTitle><DialogDescription>하나를 골라 바로 발명권을 받으세요.</DialogDescription></DialogHeader>
    <section className="pixel-frame space-y-2 bg-card p-3 text-sm"><b className="flex items-center gap-2"><Timer className="!h-5 !w-5" />15초 개척 가이드 · +1</b>
      {started && <p className="min-h-16 text-xs leading-relaxed">{pct < 33 ? '거점 밖에서 얻은 재료는 돌아오면 창고에 보관됩니다. 노끈은 여러 부품을 단단하게 묶어 줍니다.' : pct < 66 ? '돌모루에서는 부싯돌과 노끈을 조합해 기초 도구를 만듭니다. 회색 연기는 불가능한 조합입니다.' : '뼈 움막을 완공하고 개인 제단을 세우세요. 4종 재료와 고열 제련·신성 부여가 열리고 명품 확률이 3배가 됩니다.'}</p>}
      {started ? <><Progress value={pct} /><Button className="h-11 w-full" disabled={pct < 100 || loading} onClick={() => finish('timer')}>{loading && <Loader2 className="animate-spin" />}{pct < 100 ? `${Math.ceil((100 - pct) * .15)}초 남음` : '발명권 받기'}</Button></> : <Button className="h-11 w-full" onClick={startTimer}>시청 시작</Button>}</section>
    <section className="pixel-frame space-y-2 bg-card p-3 text-sm"><b>야외 개척 미션 · +3</b><p className="text-xs text-muted-foreground">초대 링크는 하루 1회, 새 지역 탐험은 200m마다 받을 수 있어요. 시속 13km 이하로 걷거나 뛴 거리만 인정돼요.</p>
      <Button variant="outline" className="h-11 w-full" disabled={credits.inviteClaimed || loading} onClick={copy}><Copy />내 거점 초대 링크 공유</Button>
      <Progress value={Math.min(100, credits.walkMeters / 2)} /><Button variant="outline" className="h-11 w-full" disabled={credits.walkMeters < 200 || loading} onClick={() => finish('walk')}><Footprints />200m 탐험 보상 ({credits.walkMeters}/200m)</Button></section>
  </DialogContent></Dialog>;
}