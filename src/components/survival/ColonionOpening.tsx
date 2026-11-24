import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizePioneerName, PIONEER_ERAS, PIONEER_NAME_KEY } from "@/lib/pioneer";
import titleArt from "@/assets/colonion-opening.webp.asset.json";
import CharacterSprite from "@/components/survival/CharacterSprite";

export { PIONEER_NAME_KEY } from "@/lib/pioneer";

/** Full-screen opening shown before entering the survival world. */
export function ColonionOpening({ onEnter, onClose }: { onEnter: (name: string) => void; onClose?: () => void }) {
  // A saved nickname is fixed; only first-time players type one.
  const [savedName] = useState(() => normalizePioneerName(localStorage.getItem(PIONEER_NAME_KEY) ?? ""));
  const [name, setName] = useState(savedName);
  const finalName = normalizePioneerName(name);

  const enter = () => {
    if (!finalName) return;
    if (!savedName) localStorage.setItem(PIONEER_NAME_KEY, finalName);
    onEnter(finalName);
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="개척자 선택"
      className="fixed inset-0 z-[1400] flex h-[100dvh] flex-col overflow-y-auto bg-colonion-night font-pixel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {onClose && <Button variant="ghost" size="icon" aria-label="선택창 닫기" onClick={onClose} className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 h-11 w-11 text-colonion-parchment"><X /></Button>}
      <div className="relative min-h-32 flex-1 overflow-hidden">
        <motion.img
          src={titleArt.url}
          alt="COLONION — 화산과 고대 마을을 바라보는 개척자"
          className="absolute inset-0 h-full w-full object-contain [image-rendering:pixelated]"
          initial={{ scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.4, ease: "easeOut" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-colonion-night to-transparent" />
      </div>

      <motion.div
        className="mx-auto w-full max-w-md px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <div className="flex gap-1">
          {PIONEER_ERAS.map((era) => (
            <Button
              key={era.id}
              variant="ghost"
              disabled={!era.available}
              aria-pressed={era.available}
              title={era.available ? era.label : `${era.label} — 준비 중`}
              className={`h-11 min-w-0 flex-1 gap-1 rounded-b-none border-2 border-b-0 border-colonion-wood-edge px-1 text-xs ${
                era.available ? "bg-colonion-wood text-colonion-parchment" : "bg-colonion-wood-dark text-colonion-parchment/50"
              }`}
            >
              {!era.available && <Lock className="!h-3 !w-3" />}
              {era.label}
            </Button>
          ))}
        </div>
        <div className="rounded-b-md border-2 border-colonion-wood-edge bg-colonion-wood p-4 shadow-2xl">
          <div className="mb-3">
            <span className="mb-1 block text-xs text-colonion-parchment/70">닉네임</span>
            {savedName ? (
              <p className="flex h-12 items-center justify-center rounded border-2 border-colonion-wood-edge bg-colonion-wood-dark px-3 text-lg text-colonion-parchment">{savedName}</p>
            ) : (
              <input
                id="pioneer-name"
                aria-label="닉네임"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                placeholder="족장 닉네임 입력"
                onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) enter(); }}
                className="h-12 w-full rounded border-2 border-colonion-wood-edge bg-colonion-wood-dark px-3 text-base text-colonion-parchment placeholder:text-colonion-parchment/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>
          <span className="mb-1 block text-xs text-colonion-parchment/70">캐릭터</span>
          <Button
            onClick={enter}
            disabled={!finalName}
            aria-label={`${finalName || '개척자'} 캐릭터로 접속`}
            variant="ghost"
            className="flex h-36 w-full flex-col gap-2 border border-colonion-wood-edge bg-colonion-wood-dark text-colonion-parchment hover:bg-colonion-wood-dark hover:ring-2 hover:ring-primary"
          >
            <div className="flex h-24 items-end justify-center">
              <CharacterSprite height={96} />
            </div>
            <span className="text-xs text-colonion-parchment/70">눌러서 접속</span>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
