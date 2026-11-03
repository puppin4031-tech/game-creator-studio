import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  url: string;
  frames: number;
  fps: number;
  height?: number;
  playing?: boolean;
  /** Play one full cycle then hold the last frame (for one-shot actions like gather/attack). */
  once?: boolean;
  /** Static image shown until the sheet is decoded, or if it fails to load. */
  fallback?: ReactNode;
}

// Cache of decoded sheet aspect ratios so switching actions never shows an empty frame.
const loaded = new Map<string, number>();

export function preloadSpriteSheet(url: string, frames: number): Promise<void> {
  if (loaded.has(url)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { loaded.set(url, img.naturalWidth / frames / img.naturalHeight || 1); resolve(); };
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Plays a horizontal sprite-sheet strip (equal-width frames, left to right). */
export default function SpriteAnimator({ url, frames, fps, height = 64, playing = true, once = false, fallback }: Props) {
  const [frame, setFrame] = useState(0);
  const [ratio, setRatio] = useState<number | null>(() => loaded.get(url) ?? null);

  useEffect(() => {
    let alive = true;
    if (loaded.has(url)) { setRatio(loaded.get(url)!); return; }
    setRatio(null);
    preloadSpriteSheet(url, frames).then(() => { if (alive) setRatio(loaded.get(url) ?? null); });
    return () => { alive = false; };
  }, [url, frames]);

  useEffect(() => {
    setFrame(0);
    if (!playing || frames < 2) return;
    const id = window.setInterval(() => setFrame(f => {
      const next = f + 1;
      if (once && next >= frames) { window.clearInterval(id); return frames - 1; }
      return next % frames;
    }), 1000 / fps);
    return () => window.clearInterval(id);
  }, [frames, fps, playing, url, once]);

  if (ratio === null) return <>{fallback ?? null}</>;
  const width = height * ratio;
  return (
    <div
      aria-hidden
      className="pixelated select-none"
      style={{
        width, height,
        backgroundImage: `url(${url})`,
        backgroundSize: `${width * frames}px ${height}px`,
        backgroundPosition: `${-frame * width}px 0`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
}
