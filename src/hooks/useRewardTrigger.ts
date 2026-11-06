import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCredits, rewardAmount, type InventionCredits, type RewardType } from '@/lib/survival/inventionCredits';

export interface RewardProvider { prepare(type: RewardType): Promise<void>; claim(type: RewardType): Promise<InventionCredits>; }
type Local = { credits?: InventionCredits; setCredits: (c: InventionCredits) => void; walkedMeters: number };
async function call(action: string): Promise<InventionCredits> {
  const { data, error } = await supabase.functions.invoke('survival-invent', { body: { action } });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message ?? '보상을 받지 못했습니다');
  return data.credits;
}
/** Replace this adapter with an AdMob/H5 implementation later; the UI only uses the hook contract. */
const webProvider: RewardProvider = { prepare: async (type) => { if (type === 'timer') await call('timer_start'); }, claim: call };

export function useRewardTrigger(remote: boolean, local: Local) {
  const [remoteCredits, setRemoteCredits] = useState(() => normalizeCredits(undefined));
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!remote) return;
    setLoading(true);
    try { setRemoteCredits(await call('status')); } catch (e) { toast.error(e instanceof Error ? e.message : '발명권을 불러오지 못했습니다'); } finally { setLoading(false); }
  }, [remote]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!remote) return;
    const interval = setInterval(() => { void refresh(); }, 60_000);
    return () => clearInterval(interval);
  }, [remote, refresh]);
  const prepare = useCallback(async (type: RewardType) => { if (remote) await webProvider.prepare(type); }, [remote]);
  const claimReward = useCallback(async (type: RewardType) => {
    setLoading(true);
    try {
      if (remote) { setRemoteCredits(await webProvider.claim(type)); return true; }
      const cur = normalizeCredits(local.credits);
      if (type === 'invite' && cur.inviteClaimed) throw new Error('오늘 초대 보상을 이미 받았습니다');
      if (type === 'walk' && local.walkedMeters < 200) throw new Error('새 지역 200m를 탐험하세요');
      local.setCredits({ ...cur, bonus: cur.bonus + rewardAmount(type), inviteClaimed: cur.inviteClaimed || type === 'invite', walkMeters: type === 'walk' ? 0 : cur.walkMeters });
      return true;
    } catch (e) { toast.error(e instanceof Error ? e.message : '보상을 받지 못했습니다'); return false; } finally { setLoading(false); }
  }, [remote, local]);
  const credits = remote ? remoteCredits : { ...normalizeCredits(local.credits), walkMeters: local.walkedMeters };
  return { credits, setCredits: remote ? setRemoteCredits : local.setCredits, refresh, prepare, claimReward, isAdReady: true, loading };
}