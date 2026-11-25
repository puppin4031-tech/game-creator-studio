import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, MessageSquare, Send, X } from 'lucide-react';
import type { EmoteId } from '@/lib/survival/presence';
import type { PeerPlayer } from '@/hooks/useSurvivalPresence';
import { EMOTE_ICON } from './emoteIcons';

export interface PeerChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  at: number;
}

interface Props {
  peer: PeerPlayer;
  distance: number;
  inRange: boolean;
  isAlly: boolean;
  isVassalLink: boolean;
  inDuel: boolean;
  canVassal: boolean;
  myLevel?: number;
  languageLearned?: boolean;
  chatActive?: boolean;
  chatPending?: boolean;
  chatMessages?: PeerChatMessage[];
  onEmote: (e: EmoteId) => void;
  onDuel: () => void;
  onAttack: () => void;
  onAlly: () => void;
  onVassal: () => void;
  onRequestChat?: () => void;
  onSendChatMessage?: (text: string) => void;
  onClose: () => void;
}

type Confirm = null | 'duel' | 'ally-menu' | 'vassal' | 'chat-req' | 'chat-room';

const PRIMITIVE_QUICK_WORDS = [
  '안녕… 나… 친구!',
  '고기… 같이… 사냥하자!',
  '모닥불… 따뜻해… 이리 와!',
  '큰 공룡… 조심해!',
];

export default function PeerActionMenu({
  peer,
  distance,
  inRange,
  isAlly,
  isVassalLink,
  inDuel,
  canVassal,
  myLevel = 1,
  languageLearned = false,
  chatActive = false,
  chatPending = false,
  chatMessages = [],
  onEmote,
  onDuel,
  onAttack,
  onAlly,
  onVassal,
  onRequestChat,
  onSendChatMessage,
  onClose,
}: Props) {
  const [confirm, setConfirm] = useState<Confirm>(chatActive ? 'chat-room' : null);
  const [draft, setDraft] = useState('');

  // Before Level 5 (or before learning language): only 우우(hello), 하트(love), 전투(duel) are unlocked!
  const canSpeak = myLevel >= 5 && (languageLearned || myLevel >= 5);

  const Btn = ({
    icon,
    label,
    onClick,
    disabled,
  }: {
    icon: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="pixel-btn flex min-h-[72px] flex-col items-center justify-center gap-1 bg-card text-xs disabled:opacity-40"
    >
      <img src={icon} alt="" className="h-9 w-9 [image-rendering:pixelated]" />
      {label}
    </button>
  );

  const handleSend = () => {
    const clean = draft.trim();
    if (!clean || !onSendChatMessage) return;
    onSendChatMessage(clean);
    setDraft('');
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-x-0 bottom-0 z-[1100] max-h-[80dvh] overflow-y-auto border-t-4 border-foreground bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] font-pixel"
    >
      <div className="mb-2 flex items-center">
        <b className="text-base">{peer.name}</b>
        <span className="ml-2 text-xs text-muted-foreground">
          Lv.{peer.level} · {Math.round(distance)}m{isAlly ? ' · 동료' : ''}
          {inDuel ? ' · 전투 중' : ''}
          {chatActive ? ' · 대화 중' : ''}
        </span>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="ml-auto flex h-11 w-11 items-center justify-center"
        >
          <X className="!h-7 !w-7" />
        </button>
      </div>
      {!inRange && (
        <p className="mb-2 text-xs text-destructive">가까이 다가가야 상호작용할 수 있습니다.</p>
      )}
      {!canSpeak && (
        <p className="mb-2 rounded border border-border bg-accent/15 px-2 py-1 text-[11px] text-muted-foreground">
          🔒 Lv.5 주술사 「언어 학습」 전까지는 <b>우우</b>, <b>하트(호감)</b>, <b>전투</b> 표시만 할 수 있습니다.
        </p>
      )}

      {confirm === null &&
        (inDuel ? (
          <button
            type="button"
            disabled={!inRange}
            onClick={onAttack}
            className="pixel-btn min-h-14 w-full bg-destructive text-base text-destructive-foreground disabled:opacity-40"
          >
            공격하기
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className={`grid ${canSpeak ? 'grid-cols-5' : 'grid-cols-3'} gap-1.5`}>
              <Btn
                icon={EMOTE_ICON.hello}
                label="우우"
                disabled={!inRange}
                onClick={() => onEmote('hello')}
              />
              <Btn
                icon={EMOTE_ICON.love}
                label="하트(호감)"
                disabled={!inRange}
                onClick={() => onEmote('love')}
              />
              <Btn
                icon={EMOTE_ICON.duel}
                label="전투"
                disabled={!inRange || isAlly}
                onClick={() => setConfirm('duel')}
              />
              {canSpeak && (
                <button
                  type="button"
                  disabled={!inRange}
                  onClick={() => setConfirm(chatActive ? 'chat-room' : 'chat-req')}
                  className="pixel-btn flex min-h-[72px] flex-col items-center justify-center gap-1 bg-primary/15 text-xs font-bold text-primary disabled:opacity-40"
                >
                  <MessageSquare className="h-8 w-8" />
                  {chatActive ? '대화방' : chatPending ? '신청 중' : '대화'}
                </button>
              )}
              {canSpeak && (
                <Btn
                  icon={EMOTE_ICON.ally}
                  label="동맹"
                  disabled={!inRange}
                  onClick={() => setConfirm('ally-menu')}
                />
              )}
            </div>
            {!canSpeak && (
              <div className="flex items-center justify-center gap-1.5 rounded border border-dashed border-border bg-muted/40 py-2 text-xs text-muted-foreground">
                <Lock className="!h-3.5 !w-3.5" />
                <span>대화 · 동맹 제안은 Lv.5 언어 학습 후 열립니다</span>
              </div>
            )}
          </div>
        ))}

      {confirm === 'chat-req' && (
        <div className="space-y-2" data-chat-confirm>
          <p className="text-sm font-bold">{peer.name}님에게 대화를 신청하시겠습니까?</p>
          <p className="text-xs text-muted-foreground">
            상대방이 수락하면 부족의 언어로 실시간 대화를 나눌 수 있습니다.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onRequestChat?.();
                setConfirm('chat-room');
              }}
              className="pixel-btn min-h-11 bg-primary font-bold text-primary-foreground"
            >
              대화를 신청합니다
            </button>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="pixel-btn min-h-11 bg-card"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {confirm === 'chat-room' && (
        <div className="space-y-2" data-chat-room>
          <div className="flex items-center justify-between border-b border-border pb-1 text-xs">
            <b className="text-primary">🗣️ {peer.name}님과의 부족 대화</b>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="text-[11px] text-muted-foreground underline"
            >
              메뉴로
            </button>
          </div>

          {!chatActive ? (
            <div className="pixel-box bg-accent/15 p-3 text-center text-xs">
              <p className="font-bold">상대방의 대화 수락을 기다리고 있습니다…</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                상대 화면에 「상대가 대화를 신청합니다」 알림이 표시되었습니다.
              </p>
            </div>
          ) : (
            <>
              <div className="pixel-box max-h-36 space-y-1.5 overflow-y-auto bg-card p-2 text-xs">
                {!chatMessages.length ? (
                  <p className="text-center text-muted-foreground">
                    배운 말로 첫 인사를 건네 보세요!
                  </p>
                ) : (
                  chatMessages.map(m => (
                    <div key={m.id} className="leading-snug">
                      <b className="text-primary">{m.senderName}: </b>
                      <span>{m.text}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Quick primitive phrases */}
              <div className="flex flex-wrap gap-1">
                {PRIMITIVE_QUICK_WORDS.map(phrase => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => onSendChatMessage?.(phrase)}
                    className="pixel-btn bg-card py-1 px-2 text-[10px]"
                  >
                    "{phrase}"
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder="부족의 언어로 말을 건네세요..."
                  maxLength={80}
                  className="pixel-box flex-1 bg-background px-2.5 py-1.5 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  className="pixel-btn flex items-center gap-1 bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  <Send className="!h-3.5 !w-3.5" />
                  전송
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {confirm === 'duel' && (
        <div className="space-y-2">
          <p className="text-sm">{peer.name}님에게 전투를 신청하시겠습니까?</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setConfirm(null);
                onDuel();
              }}
              className="pixel-btn min-h-11 bg-destructive text-destructive-foreground"
            >
              네
            </button>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="pixel-btn min-h-11 bg-card"
            >
              아니요
            </button>
          </div>
        </div>
      )}

      {confirm === 'ally-menu' && (
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={isAlly}
            onClick={() => {
              setConfirm(null);
              onAlly();
            }}
            className="pixel-btn min-h-12 w-full bg-card text-sm disabled:opacity-40"
          >
            동료로 초대{' '}
            <span className="block text-[11px] text-muted-foreground">
              서로 위치 공유 · 즐겨찾기에 추가
            </span>
          </button>
          <button
            type="button"
            disabled={!canVassal || isVassalLink}
            onClick={() => setConfirm('vassal')}
            className="pixel-btn min-h-12 w-full bg-card text-sm disabled:opacity-40"
          >
            부하로 임명{' '}
            <span className="block text-[11px] text-muted-foreground">
              {canVassal ? '매일 상대 거점 물품 1개를 상납받음' : '둘 다 로그인해야 가능'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setConfirm(null)}
            className="pixel-btn min-h-11 w-full bg-muted text-sm"
          >
            뒤로
          </button>
        </div>
      )}

      {confirm === 'vassal' && (
        <div className="space-y-2">
          <p className="text-sm">{peer.name}님을 부하로 임명하시겠습니까?</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setConfirm(null);
                onVassal();
              }}
              className="pixel-btn min-h-11 bg-primary text-primary-foreground"
            >
              예
            </button>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="pixel-btn min-h-11 bg-card"
            >
              아니요
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
