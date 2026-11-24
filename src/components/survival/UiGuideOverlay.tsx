import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UiGuideOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UiGuideOverlay({ isOpen, onClose }: UiGuideOverlayProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[1300] flex flex-col justify-between bg-black/70 p-4 backdrop-blur-xs cursor-pointer select-none font-pixel pointer-events-auto"
        aria-label="화면 조작 가이드 오버레이"
      >
        {/* Top Section */}
        <div className="pt-[max(0.75rem,env(safe-area-inset-top))] flex justify-between items-start gap-4">
          {/* Top-Left Bubble: Points to Top-Left Status Card */}
          <motion.div
            initial={{ scale: 0.8, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="relative max-w-[210px] rounded border-2 border-[#2b1d14] bg-[#e7d8b8] p-2.5 text-[#2b1d14] shadow-[3px_3px_0_0_#2b1d14]"
          >
            {/* Arrow pointing UP */}
            <div className="absolute -top-2 left-6 h-0 w-0 border-x-6 border-x-transparent border-b-8 border-b-[#2b1d14]" />
            <div className="absolute -top-[6px] left-6 h-0 w-0 border-x-6 border-x-transparent border-b-8 border-b-[#e7d8b8]" />
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#5c3a1e] mb-0.5">
              <span>👤 족장 상태카드</span>
            </div>
            <p className="text-[11px] leading-tight text-[#3d2716]">
              터치해서 족장 상태·장비·스킬 확인
            </p>
          </motion.div>

          {/* Top-Right Bubble: Points to Top-Right Collapsible Menu */}
          <motion.div
            initial={{ scale: 0.8, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative max-w-[200px] rounded border-2 border-[#2b1d14] bg-[#e7d8b8] p-2.5 text-[#2b1d14] shadow-[3px_3px_0_0_#2b1d14] text-right"
          >
            {/* Arrow pointing UP */}
            <div className="absolute -top-2 right-6 h-0 w-0 border-x-6 border-x-transparent border-b-8 border-b-[#2b1d14]" />
            <div className="absolute -top-[6px] right-6 h-0 w-0 border-x-6 border-x-transparent border-b-8 border-b-[#e7d8b8]" />
            <div className="flex items-center justify-end gap-1.5 font-bold text-xs text-[#5c3a1e] mb-0.5">
              <span>📜 통합 간편 메뉴</span>
            </div>
            <p className="text-[11px] leading-tight text-[#3d2716]">
              도감·퀘스트·설정 메뉴 열기
            </p>
          </motion.div>
        </div>

        {/* Center Dismiss Prompt */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full border-2 border-[#8b5a2b] bg-[#2b1d14]/90 px-4 py-1.5 text-xs text-amber-200 shadow-md animate-pulse">
            👆 아무 곳이나 터치하면 닫힙니다
          </div>
        </div>

        {/* Bottom Section: Points to Bottom Dock */}
        <div className="pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+4.25rem))] flex justify-center">
          <motion.div
            initial={{ scale: 0.8, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative max-w-xs rounded border-2 border-[#2b1d14] bg-[#e7d8b8] p-2.5 text-center text-[#2b1d14] shadow-[3px_3px_0_0_#2b1d14]"
          >
            {/* Arrow pointing DOWN */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-0 w-0 border-x-6 border-x-transparent border-t-8 border-t-[#2b1d14]" />
            <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 h-0 w-0 border-x-6 border-x-transparent border-t-8 border-t-[#e7d8b8]" />
            <div className="flex items-center justify-center gap-1.5 font-bold text-xs text-[#5c3a1e] mb-0.5">
              <span>🏕️ 거점 & 배낭 관리 도크</span>
            </div>
            <p className="text-[11px] leading-tight text-[#3d2716]">
              위로 밀거나 아이콘을 눌러 거점·원정·펫 관리
            </p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
