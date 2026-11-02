import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizePioneerName, PIONEER_ERAS, PIONEER_NAME_KEY } from "@/lib/pioneer";
import titleArt from "@/assets/colonion_title.jpg.asset.json";
import hunter from "@/assets/survival/char-hunter.png";

export { PIONEER_NAME_KEY } from "@/lib/pioneer";

/** Full-screen opening shown before entering the survival world. */
export function ColonionOpening({ onEnter, onClose }: { onEnter: (name: string) => void; onClose?: () => void }) {
  const [name, setName] = useState(() => localStorage.getItem(PIONEER_NAME_KEY) ?? "");

  const enter = () => {
    const trimmed = normalizePioneerName(name);
    if (!trimmed) return;
    localStorage.setItem(PIONEER_NAME_KEY, trimmed);
    onEnter(trimmed);
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="개척자 선택"
      className="fixed inset-0 z-[100] flex h-[100dvh] flex-col overflow-y-auto bg-colonion-night font-pixel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {onClose && <Button variant="ghost" size="icon" aria-label="선택창 닫기" onClick={onClose} className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 h-11 w-11 text-colonion-parchment"><X /></Button>}
      <div className="relative min-h-32 flex-1 overflow-hidden">
        <motion.img
          src={titleArt.url}
          alt="콜로니온: 문명의 시작 — 구석기 모닥불과 미래 도시를 잇는 GPS 신호"
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
          <h2 className="mb-2 text-center text-base text-colonion-parchment">개척자</h2>
          <Button
            onClick={enter}
            disabled={!normalizePioneerName(name)}
            aria-label={`${normalizePioneerName(name) || '개척자'} 캐릭터로 접속`}
            variant="ghost"
            className="mb-3 flex h-32 w-full flex-col gap-2 border border-colonion-wood-edge bg-colonion-wood-dark text-colonion-parchment hover:bg-colonion-wood-dark hover:ring-2 hover:ring-primary"
          >
            <img src={hunter} alt="구석기 개척자 캐릭터" className="h-20 w-20 object-contain [image-rendering:pixelated]" draggable={false} />
            <span className="max-w-full truncate text-base">{normalizePioneerName(name) || '개척자'}</span>
          </Button>
          <label htmlFor="pioneer-name" className="mb-1 block text-xs text-colonion-parchment">닉네임</label>
          <input
            id="pioneer-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            placeholder="족장 닉네임 입력"
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) enter(); }}
            className="h-12 w-full rounded border-2 border-colonion-wood-edge bg-colonion-wood-dark px-3 text-base text-colonion-parchment placeholder:text-colonion-parchment/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
