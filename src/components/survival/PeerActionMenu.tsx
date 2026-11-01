import { motion } from 'framer-motion';
import { MessageCircle, Swords, Handshake, X } from 'lucide-react';
import { EMOTES, type EmoteId } from '@/lib/survival/presence';
import type { PeerPlayer } from '@/hooks/useSurvivalPresence';

interface Props {
  peer: PeerPlayer;
  distance: number;
  inRange: boolean;
  isAlly: boolean;
  onEmote: (e: EmoteId) => void;
  onAttack: () => void;
  onAlly: () => void;
  onClose: () => void;
}

export default function PeerActionMenu({ peer, distance, inRange, isAlly, onEmote, onAttack, onAlly, onClose }: Props) {
  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      className="absolute inset-x-0 bottom-0 z-30 border-t-4 border-foreground bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mb-2 flex items-center">
        <b className="text-base">{peer.name}</b><span className="ml-2 text-xs text-muted-foreground">Lv.{peer.level} · {Math.round(distance)}m{isAlly ? ' · 동맹' : ''}</span>
        <button type="button" aria-label="닫기" onClick={onClose} className="ml-auto flex h-11 w-11 items-center justify-center"><X className="!h-7 !w-7" /></button>
      </div>
      {!inRange && <p className="mb-2 text-xs text-destructive">25m 안으로 다가가야 상호작용할 수 있습니다.</p>}
      <p className="mb-1 flex items-center gap-1 text-xs"><MessageCircle className="!h-4 !w-4" />대화하기</p>
      <div className="mb-2 grid grid-cols-4 gap-1.5">
        {EMOTES.map((e) => (
          <button key={e.id} type="button" disabled={!inRange} onClick={() => onEmote(e.id)} className="pixel-btn min-h-11 bg-card text-xs disabled:opacity-40">{e.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" disabled={!inRange || isAlly} onClick={onAlly} className="pixel-btn flex min-h-11 items-center justify-center gap-1 bg-card text-sm disabled:opacity-40"><Handshake className="!h-5 !w-5" />동맹 제안</button>
        <button type="button" disabled={!inRange || isAlly} onClick={onAttack} className="pixel-btn flex min-h-11 items-center justify-center gap-1 bg-destructive text-sm text-destructive-foreground disabled:opacity-40"><Swords className="!h-5 !w-5" />공격하기</button>
      </div>
    </motion.div>
  );
}
