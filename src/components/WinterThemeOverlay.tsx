import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

const FLAKES = 45;

/** Visual-only winter layer: cool tint + pixel snow canvas. Never intercepts input. */
export default function WinterThemeOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || reduced) return;
    let w = 0, h = 0;
    const resize = () => { w = canvas.width = canvas.clientWidth; h = canvas.height = canvas.clientHeight; };
    resize();
    window.addEventListener('resize', resize);
    const flakes = Array.from({ length: FLAKES }, () => ({
      x: Math.random() * w, y: Math.random() * h, s: Math.random() < 0.5 ? 2 : 3,
      v: 12 + Math.random() * 18, phase: Math.random() * Math.PI * 2,
    }));
    const color = getComputedStyle(document.documentElement).getPropertyValue('--snow').trim() || '0 0% 100%';
    let raf = 0, last = performance.now();
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (t - last) / 1000);
      if (dt < 1 / 30) return; // ~30fps cap for battery
      last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `hsl(${color} / 0.9)`;
      for (const f of flakes) {
        f.y += f.v * dt; f.phase += dt;
        if (f.y > h) { f.y = -3; f.x = Math.random() * w; }
        ctx.fillRect(Math.round(f.x + Math.sin(f.phase) * 6), Math.round(f.y), f.s, f.s);
      }
    };
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis); };
  }, [reduced]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5]">
      <div className="absolute inset-0 bg-winter-tint/10 mix-blend-color" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
