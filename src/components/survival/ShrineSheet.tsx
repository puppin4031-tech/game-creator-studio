import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { ContextualHelpButton } from './ContextualHelpButton';
import melchizedek from '@/assets/survival/melchizedek.png';
import { ITEMS } from '@/lib/survival/items';
import { countOf } from '@/lib/survival/inventory';
import { MELCHIZEDEK_WORDS, RITES, SHRINES, canBless, nearestUnfound, type Shrine, type ShrineState } from '@/lib/survival/sanctuaries';
import type { LatLng, Stack } from '@/lib/survival/types';

interface Props {
  shrine: Shrine;
  state: ShrineState;
  pos: LatLng;
  inRange: boolean;
  backpack: Stack[];
  words: string | null;
  onAwaken: () => void;
  onRite: (riteId: string) => void;
  onBless: () => void;
  onClose: () => void;
}

const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`);

export default function ShrineSheet({ shrine, state, pos, inRange, backpack, words, onAwaken, onRite, onBless, onClose }: Props) {
  const awakened = state.found.includes(shrine.id);
  const bless = canBless(state, shrine.id, Date.now());
  const next = nearestUnfound(pos, state);
  const line = words ?? (awakened ? MELCHIZEDEK_WORDS[shrine.id.length % MELCHIZEDEK_WORDS.length] : '…낯선 이여, 이 돌들은 아직 잠들어 있다. 손을 얹어 깨워 보겠는가?');
  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      className="absolute inset-x-0 bottom-0 z-30 flex max-h-[80dvh] flex-col border-t-4 border-primary bg-background">
      <div className="flex items-center justify-between border-b-2 border-foreground px-3 py-2">
        <div className="min-w-0 flex-1"><b className="text-lg">{shrine.name}</b>
          <p className="text-[11px] text-muted-foreground">성소 네트워크 {state.found.length}/{SHRINES.length} · 신성력 {state.sacred}</p></div>
        <div className="flex items-center gap-1.5">
          <ContextualHelpButton
            title="고대 거석 성소"
            bullets={[
              "실제 위치에 다가가 성소를 깨우면 성소 네트워크가 연결됩니다.",
              "정기적으로 제단의 축복을 받아 생명의 떡과 정화의 이슬을 얻으세요.",
              "고대의 제사를 올려 부족의 신성력을 높이고 고대 가호를 받으세요."
            ]}
          />
          <button type="button" aria-label="닫기" onClick={onClose} className="flex h-11 w-11 items-center justify-center"><X className="!h-7 !w-7" /></button>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm">
        <div className="flex items-end gap-2">
          <img src={melchizedek} alt="멜키체덱" width={48} height={100} className="h-24 w-auto shrink-0 [image-rendering:pixelated]" />
          <div className="pixel-frame flex-1 whitespace-pre-line bg-accent p-2 text-xs"><b className="block text-primary">멜키체덱 · 살렘의 사제</b>{line}</div>
        </div>
        {!inRange && <p className="pixel-frame bg-muted p-2 text-xs">제단 가까이 다가가야 이용할 수 있어요.</p>}
        {!awakened ? (
          <button type="button" disabled={!inRange} onClick={onAwaken} className="pixel-btn flex min-h-11 w-full items-center justify-center gap-2 bg-primary text-primary-foreground disabled:opacity-50">
            <Sparkles className="!h-5 !w-5" /> 성소 깨우기
          </button>
        ) : (
          <>
            <button type="button" disabled={!inRange || !bless.ok} onClick={onBless} className="pixel-btn min-h-11 w-full bg-primary text-primary-foreground disabled:opacity-50">
              {bless.ok ? '제단의 축복 받기 (생명의 떡 · 정화의 이슬)' : `제단이 다시 차오르는 중 · ${Math.ceil((bless as { waitMs: number }).waitMs / 3_600_000)}시간`}
            </button>
            <div className="space-y-2">
              <b className="text-xs">고대의 제사</b>
              {RITES.map((r) => {
                const ok = r.cost.every((c) => countOf(backpack, c.itemId) >= c.count);
                return (
                  <div key={r.id} className="pixel-frame flex items-center gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{r.name} <span className="text-primary">+{r.sacred}</span></p>
                      <p className="text-[11px] text-muted-foreground">{r.cost.map((c) => `${ITEMS[c.itemId]?.name ?? c.itemId} ${countOf(backpack, c.itemId)}/${c.count}`).join(' · ')}{r.reward ? ` → ${r.reward.map((x) => `${ITEMS[x.itemId]?.name ?? x.itemId}×${x.count}`).join(', ')}` : ''}</p>
                    </div>
                    <button type="button" disabled={!inRange || !ok} onClick={() => onRite(r.id)} className="pixel-btn min-h-11 shrink-0 px-3 disabled:opacity-50">바치기</button>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {next && <p className="text-[11px] text-muted-foreground">공명: 아직 잠든 가장 가까운 성소까지 약 {km(next.distanceM)}</p>}
      </div>
    </motion.div>
  );
}
