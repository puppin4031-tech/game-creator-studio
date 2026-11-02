import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Play } from "lucide-react";
import titleArt from "@/assets/colonion_title.jpg.asset.json";

const ERAS = [
  { id: "stone", label: "구석기", open: true },
  { id: "bronze", label: "청동기", open: false },
  { id: "industry", label: "산업화", open: false },
  { id: "modern", label: "현대문명", open: false },
] as const;

export const PIONEER_NAME_KEY = "colonion.pioneerName";

/** Full-screen opening shown before entering the survival world. */
export function ColonionOpening({ onEnter }: { onEnter: (name: string) => void }) {
  const [name, setName] = useState(() => localStorage.getItem(PIONEER_NAME_KEY) ?? "");

  const enter = () => {
    const trimmed = name.trim().slice(0, 16);
    if (trimmed) localStorage.setItem(PIONEER_NAME_KEY, trimmed);
    onEnter(trimmed);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col bg-colonion-night font-pixel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative flex-1 overflow-hidden">
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
          {ERAS.map((era) => (
            <div
              key={era.id}
              className={`flex flex-1 items-center justify-center gap-1 rounded-t-md border-2 border-b-0 border-colonion-wood-edge px-1 py-2 text-xs ${
                era.open ? "bg-colonion-wood text-colonion-parchment" : "bg-colonion-wood-dark text-colonion-parchment/50"
              }`}
            >
              {!era.open && <Lock className="!h-3 !w-3" />}
              {era.label}
            </div>
          ))}
        </div>
        <div className="rounded-b-md border-2 border-colonion-wood-edge bg-colonion-wood p-4 shadow-2xl">
          <p className="mb-3 text-center text-sm text-colonion-parchment">개척자 등록</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            placeholder="족장 닉네임 입력"
            className="mb-3 h-12 w-full rounded border-2 border-colonion-wood-edge bg-colonion-wood-dark px-3 text-base text-colonion-parchment placeholder:text-colonion-parchment/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={enter}
            className="flex h-14 w-full items-center justify-center gap-2 rounded border-2 border-colonion-wood-edge bg-gradient-to-b from-primary to-colonion-ember text-base font-bold text-colonion-night shadow-lg active:translate-y-0.5"
          >
            GPS 연결 및 구석기 시대로 진입 <Play className="!h-5 !w-5 fill-current" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
