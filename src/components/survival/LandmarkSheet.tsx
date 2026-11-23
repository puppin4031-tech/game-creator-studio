import { motion } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import { LANDMARK_DAILY_MAX, LANDMARK_INFO, TRADER_STOCK, canClaimLandmark, sellPrice, type Landmark, type LandmarkClaims } from '@/lib/survival/landmarks';
import { countOf } from '@/lib/survival/inventory';
import type { Stack } from '@/lib/survival/types';

interface Props {
  landmark: Landmark;
  inRange: boolean;
  claims?: LandmarkClaims;
  backpack: Stack[];
  words: string | null;
  onVisit: () => void;
  onSell: (id: ItemId) => void;
  onBuy: (id: ItemId) => void;
  onClose: () => void;
  isFav?: boolean;
  onToggleFav?: () => void;
}

export default function LandmarkSheet({ landmark, inRange, claims, backpack, words, onVisit, onSell, onBuy, onClose, isFav, onToggleFav }: Props) {
  const info = LANDMARK_INFO[landmark.kind];
  const used = claims?.byId[landmark.id]?.count ?? 0;
  const check = canClaimLandmark(claims, landmark.id, Date.now());
  const shells = countOf(backpack, 'shell');
  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      className="absolute inset-x-0 bottom-0 z-30 flex max-h-[75dvh] flex-col border-t-4 border-foreground bg-background">
      <div className="flex items-center justify-between border-b-2 border-foreground px-3 py-2">
        <div className="min-w-0 flex-1"><b className="text-lg">{info.name}</b>{landmark.origin && <p className="text-[11px] text-muted-foreground">옛 흔적: {landmark.origin}</p>}</div>
        {onToggleFav && <button type="button" aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기 등록'} aria-pressed={isFav} onClick={onToggleFav} className="flex h-11 w-11 items-center justify-center"><Star className={`!h-6 !w-6 ${isFav ? 'fill-primary text-primary' : ''}`} /></button>}
        <button type="button" aria-label="닫기" onClick={onClose} className="flex h-11 w-11 items-center justify-center"><X className="!h-7 !w-7" /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm">
        <p>{info.desc}</p>
        {!inRange && <p className="pixel-frame bg-accent p-2 text-xs">25m 안으로 다가가야 이용할 수 있어요.</p>}
        {landmark.kind !== 'trader' && (
          <>
            <p className="text-xs text-muted-foreground">오늘 {used}/{LANDMARK_DAILY_MAX}회 · 30분마다 다시 이용 가능</p>
            <button type="button" disabled={!inRange} onClick={onVisit} className="pixel-btn h-11 w-full bg-primary text-primary-foreground disabled:opacity-40">
              {landmark.kind === 'shaman' ? '제사장에게 묻기' : check.ok ? '얻기' : '확인하기'}
            </button>
            {words && <p className="pixel-frame whitespace-pre-line bg-card p-2 text-xs">{words}</p>}
          </>
        )}
        {landmark.kind === 'trader' && (
          <>
            <p className="text-xs">보유 조개 화폐: <b>{shells}</b></p>
            <div>
              <b className="text-sm">사기</b>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {TRADER_STOCK.map((o) => (
                  <button key={o.itemId} type="button" disabled={!inRange || shells < o.price} onClick={() => onBuy(o.itemId)}
                    className="pixel-frame min-h-11 bg-card px-2 py-1 text-left text-xs disabled:opacity-40">{ITEMS[o.itemId]?.name ?? o.itemId} · 조개 {o.price}</button>
                ))}
              </div>
            </div>
            <div>
              <b className="text-sm">팔기 (배낭)</b>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {backpack.filter((s) => sellPrice(s.itemId) > 0).map((s) => (
                  <button key={s.itemId} type="button" disabled={!inRange} onClick={() => onSell(s.itemId)}
                    className="pixel-frame min-h-11 bg-card px-2 py-1 text-left text-xs disabled:opacity-40">{ITEMS[s.itemId]?.name ?? s.itemId} ×{s.count} → 조개 {sellPrice(s.itemId)}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
