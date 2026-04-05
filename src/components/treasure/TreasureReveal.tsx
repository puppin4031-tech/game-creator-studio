import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NearestTreasure } from '@/hooks/useTreasureHunt';

interface Props {
  treasure: NearestTreasure;
  cooldownLeft: number;
  onAttempt: () => void;
}

export default function TreasureReveal({ treasure, cooldownLeft, onAttempt }: Props) {
  const disabled = cooldownLeft > 0;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col items-center justify-center">
      {/* Particle ring */}
      <div className="relative w-40 h-40 pointer-events-auto">
        {/* Rotating particles */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full animate-treasure-orbit"
            style={{
              background: `hsl(${40 + i * 15}, 90%, 60%)`,
              top: '50%',
              left: '50%',
              animationDelay: `${i * -0.4}s`,
              filter: 'blur(1px)',
            }}
          />
        ))}

        {/* Treasure object */}
        <button
          onClick={disabled ? undefined : onAttempt}
          disabled={disabled}
          className="absolute inset-0 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
        >
          <div
            className={`text-7xl transition-all duration-300 ${disabled ? 'opacity-40 grayscale' : 'animate-treasure-float'}`}
            style={{
              filter: disabled ? 'grayscale(1) brightness(0.5)' : 'drop-shadow(0 0 20px rgba(234, 179, 8, 0.8)) drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
            }}
          >
            💎
          </div>
        </button>
      </div>

      {/* Button area */}
      <div className="mt-4 pointer-events-auto">
        <Button
          size="lg"
          onClick={onAttempt}
          disabled={disabled}
          className="text-lg px-8 py-6 shadow-2xl gap-2"
          style={{
            boxShadow: disabled ? undefined : '0 0 30px rgba(234, 179, 8, 0.4)',
          }}
        >
          {disabled ? (
            <span>⏳ 재시도까지 {cooldownLeft}초</span>
          ) : (
            <span>✨ 보물찾기 시도</span>
          )}
        </Button>
      </div>

      {/* Distance hint */}
      <p className="mt-2 text-sm text-muted-foreground bg-background/80 px-3 py-1 rounded-full pointer-events-none">
        {treasure.distance.toFixed(1)}m 거리
      </p>
    </div>
  );
}
