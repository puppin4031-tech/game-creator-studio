import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface ContextualHelpButtonProps {
  title: string;
  bullets: [string, string, string];
  className?: string;
}

export function ContextualHelpButton({ title, bullets, className = '' }: ContextualHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        aria-label={`${title} 도움말`}
        className={`pixelated flex h-7 w-7 items-center justify-center rounded border-2 border-[#2b1d14] bg-[#7a7267] text-amber-200 shadow-[2px_2px_0_0_#2b1d14] hover:bg-[#8e8578] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0 ${className}`}
      >
        <span className="font-pixel text-xs font-bold leading-none">?</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="pixelated w-full max-w-sm border-4 border-[#2b1d14] bg-[#e7d8b8] p-4 text-[#2b1d14] shadow-[6px_6px_0_0_#2b1d14] relative font-pixel"
            style={{
              backgroundImage: 'radial-gradient(#dfcfab 15%, transparent 16%)',
              backgroundSize: '12px 12px',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-[#2b1d14] pb-2 mb-3">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="h-5 w-5 text-[#8b5a2b]" />
                <h3 className="font-bold text-sm tracking-wide text-[#3d2716]">
                  {title} 안내
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-6 w-6 items-center justify-center border-2 border-[#2b1d14] bg-[#cbb892] hover:bg-[#bda67c] text-[#2b1d14]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 3 Bullets */}
            <ul className="space-y-2 text-xs leading-relaxed text-[#3d2b1f]">
              {bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#8b5a2b] font-bold shrink-0 mt-0.5">▪</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            {/* Footer Button */}
            <div className="mt-4 pt-2 border-t border-[#2b1d14]/40 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="pixelated border-2 border-[#2b1d14] bg-[#8b5a2b] px-3 py-1 text-xs font-bold text-amber-100 shadow-[2px_2px_0_0_#2b1d14] hover:bg-[#9d6732] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
