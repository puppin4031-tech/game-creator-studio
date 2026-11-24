import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CharacterSprite from './CharacterSprite';

interface Props {
  open: boolean;
  defaultName?: string;
  onConfirm: (nickname: string) => void;
}

export default function NicknameSetupModal({ open, defaultName = '', onConfirm }: Props) {
  const [nickname, setNickname] = useState(() => {
    const trimmed = defaultName.trim();
    return /^원시인\d*$/i.test(trimmed) ? '' : trimmed;
  });
  const [error, setError] = useState<string | null>(null);

  const trimmed = nickname.trim();
  const isValid = trimmed.length >= 2 && trimmed.length <= 12;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (trimmed.length < 2) {
      setError('이름은 최소 2글자 이상 입력해주세요.');
      return;
    }
    if (trimmed.length > 12) {
      setError('이름은 최대 12글자까지 입력할 수 있습니다.');
      return;
    }
    if (/^원시인\d*$/i.test(trimmed)) {
      setError('기본 호칭 외에 나만의 특별한 이름을 정해주세요.');
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="pixel-panel max-w-sm p-5 border-4 border-[#2b1d14] !bg-[#8a572c] font-pixel !text-amber-100 shadow-[4px_4px_0_0_#1a110b] [image-rendering:pixelated] [&>button]:hidden"
        onClick={e => e.stopPropagation()}
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogDescription className="sr-only">족장 이름 설정</DialogDescription>
        
        <DialogHeader className="text-center space-y-1">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#2b1d14] bg-[#9e6738] shadow-sm">
            <span className="text-2xl drop-shadow">👑</span>
          </div>
          <DialogTitle className="text-base font-black !text-amber-200 tracking-wide drop-shadow-sm">
            족장님의 이름을 정해주세요
          </DialogTitle>
          <p className="text-[11px] !text-amber-100/90 leading-snug">
            콜로니온 세계에서 부족을 이끌 족장님의 영원한 이름입니다.
          </p>
        </DialogHeader>

        {/* Character Portrait Preview */}
        <div className="my-2 flex justify-center">
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 border-[#2b1d14] bg-[#6e6356] shadow-inner relative overflow-hidden">
            <CharacterSprite action="idle" height={52} />
            <span className="absolute bottom-1 text-[9px] font-bold text-amber-300/90 font-mono">
              LV.1
            </span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px] px-1 text-amber-200 font-bold">
              <span>족장 호칭</span>
              <span className={`font-mono text-[10px] ${trimmed.length > 12 ? 'text-red-300 font-bold' : 'text-amber-300/80'}`}>
                {trimmed.length}/12자
              </span>
            </div>

            <input
              type="text"
              autoFocus
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) setError(null);
              }}
              placeholder="예: 불꽃주먹, 아라한, 단군"
              maxLength={14}
              className="w-full h-11 rounded-lg border-2 border-[#2b1d14] bg-[#2b1d14]/70 px-3 py-2 text-sm font-bold text-amber-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
            />

            {error && (
              <p className="text-[10px] text-red-300 font-bold px-1 animate-pulse">
                ⚠️ {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!isValid}
            className="w-full h-12 rounded-lg border-2 border-[#2b1d14] bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 disabled:opacity-50 text-stone-950 font-black text-sm shadow-[2px_2px_0_0_#2b1d14] active:translate-y-0.5 cursor-pointer"
          >
            시작하기 🚀
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
