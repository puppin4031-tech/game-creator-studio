import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  url: string;
  frames: number;
  fps: number;
  height?: number;
  playing?: boolean;
  /** Play one full cycle then hold the last frame (for one-shot actions like gather/attack). */
  once?: boolean;
  /** Static image shown until the first sheet is decoded, or if it fails to load. */
  fallback?: ReactNode;
}

// Cache of decoded sheet aspect ratios so switching actions never shows an empty frame.
const loaded = new Map<string, number>();

export function preloadSpriteSheet(url: string, frames: number): Promise<void> {
  if (loaded.has(url)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const done = () => { loaded.set(url, img.naturalWidth / frames / img.naturalHeight || 1); resolve(); };
      // decode() guarantees the bitmap is ready before we swap, avoiding a blank paint.
      if (img.decode) img.decode().then(done, done); else done();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

interface Shown { url: string; frames: number; ratio: number }

/** Plays a horizontal sprite-sheet strip. Keeps the previous sheet visible until the next one is decoded. */
export default function SpriteAnimator({ url, frames, fps, height = 64, playing = true, once = false, fallback }: Props) {
  const [frame, setFrame] = useState(0);
  const [shown, setShown] = useState<Shown | null>(() => (loaded.has(url) ? { url, frames, ratio: loaded.get(url)! } : null));

  useEffect(() => {
    let alive = true;
    const swap = () => { const r = loaded.get(url); if (alive && r) { setShown({ url, frames, ratio: r }); setFrame(0); } };
    if (loaded.has(url)) swap(); else preloadSpriteSheet(url, frames).then(swap);
    return () => { alive = false; };
  }, [url, frames]);

  useEffect(() => {
    if (!shown) return;
    setFrame(0);
    const n = shown.frames;
    if (!playing || n < 2) return;
    const id = window.setInterval(() => setFrame(f => {
      const next = f + 1;
      if (once && next >= n) { window.clearInterval(id); return n - 1; }
      return next % n;
    }), 1000 / fps);
    return () => window.clearInterval(id);
  }, [shown, fps, playing, once]);

  if (!shown) return <>{fallback ?? null}</>;
  const width = height * shown.ratio;
  const f = Math.min(frame, shown.frames - 1);
  return (
    <div
      aria-hidden
      className="pixelated select-none"
      style={{
        width, height,
        backgroundImage: `url(${shown.url})`,
        backgroundSize: `${width * shown.frames}px ${height}px`,
        backgroundPosition: `${-f * width}px 0`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
}
