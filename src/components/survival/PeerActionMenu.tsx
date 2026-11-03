import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { EmoteId } from '@/lib/survival/presence';
import type { PeerPlayer } from '@/hooks/useSurvivalPresence';
import { EMOTE_ICON } from './emoteIcons';

interface Props {
  peer: PeerPlayer;
  distance: number;
  inRange: boolean;
  isAlly: boolean;
  isVassalLink: boolean;
  inDuel: boolean;
  canVassal: boolean;
  onEmote: (e: EmoteId) => void;
  onDuel: () => void;
  onAttack: () => void;
  onAlly: () => void;
  onVassal: () => void;
  onClose: () => void;
}

type Confirm = null | 'duel' | 'ally-menu' | 'vassal';

export default function PeerActionMenu({ peer, distance, inRange, isAlly, isVassalLink, inDuel, canVassal, onEmote, onDuel, onAttack, onAlly, onVassal, onClose }: Props) {
  const [confirm, setConfirm] = useState<Confirm>(null);
  const Btn = ({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={onClick} className="pixel-btn flex min-h-[72px] flex-col items-center justify-center gap-1 bg-card text-xs disabled:opacity-40">
      <img src={icon} alt="" className="h-9 w-9 [image-rendering:pixelated]" />{label}
    </button>
  );
  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      className="absolute inset-x-0 bottom-0 z-30 border-t-4 border-foreground bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mb-2 flex items-center">
        <b className="text-base">{peer.name}</b><span className="ml-2 text-xs text-muted-foreground">Lv.{peer.level} · {Math.round(distance)}m{isAlly ? ' · 동료' : ''}{inDuel ? ' · 전투 중' : ''}</span>
        <button type="button" aria-label="닫기" onClick={onClose} className="ml-auto flex h-11 w-11 items-center justify-center"><X className="!h-7 !w-7" /></button>
      </div>
      {!inRange && <p className="mb-2 text-xs text-destructive">가까이 다가가야 상호작용할 수 있습니다.</p>}

      {confirm === null && (inDuel ? (
        <button type="button" disabled={!inRange} onClick={onAttack} className="pixel-btn min-h-14 w-full bg-destructive text-base text-destructive-foreground disabled:opacity-40">공격하기</button>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          <Btn icon={EMOTE_ICON.hello} label="우우" disabled={!inRange} onClick={() => onEmote('hello')} />
          <Btn icon={EMOTE_ICON.love} label="호감" disabled={!inRange} onClick={() => onEmote('love')} />
          <Btn icon={EMOTE_ICON.duel} label="전투" disabled={!inRange || isAlly} onClick={() => setConfirm('duel')} />
          <Btn icon={EMOTE_ICON.ally} label="동맹" disabled={!inRange} onClick={() => setConfirm('ally-menu')} />
        </div>
      ))}

      {confirm === 'duel' && (
        <div className="space-y-2">
          <p className="text-sm">{peer.name}님에게 전투를 신청하시겠습니까?</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => { setConfirm(null); onDuel(); }} className="pixel-btn min-h-11 bg-destructive text-destructive-foreground">네</button>
            <button type="button" onClick={() => setConfirm(null)} className="pixel-btn min-h-11 bg-card">아니요</button>
          </div>
        </div>
      )}

      {confirm === 'ally-menu' && (
        <div className="space-y-1.5">
          <button type="button" disabled={isAlly} onClick={() => { setConfirm(null); onAlly(); }} className="pixel-btn min-h-12 w-full bg-card text-sm disabled:opacity-40">
            동료로 초대 <span className="block text-[11px] text-muted-foreground">서로 위치 공유 · 즐겨찾기에 추가</span>
          </button>
          <button type="button" disabled={!canVassal || isVassalLink} onClick={() => setConfirm('vassal')} className="pixel-btn min-h-12 w-full bg-card text-sm disabled:opacity-40">
            부하로 임명 <span className="block text-[11px] text-muted-foreground">{canVassal ? '매일 상대 거점 물품 1개를 상납받음' : '둘 다 로그인해야 가능'}</span>
          </button>
          <button type="button" onClick={() => setConfirm(null)} className="pixel-btn min-h-11 w-full bg-muted text-sm">뒤로</button>
        </div>
      )}

      {confirm === 'vassal' && (
        <div className="space-y-2">
          <p className="text-sm">{peer.name}님을 부하로 임명하시겠습니까?</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => { setConfirm(null); onVassal(); }} className="pixel-btn min-h-11 bg-primary text-primary-foreground">예</button>
            <button type="button" onClick={() => setConfirm(null)} className="pixel-btn min-h-11 bg-card">아니요</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
