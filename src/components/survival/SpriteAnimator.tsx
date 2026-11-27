import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  url: string;
  frames: number;
  fps: number;
  height?: number;
  playing?: boolean;
  /** Play one full cycle then hold the last frame (for one-shot actions like gather/attack). */
  once?: boolean;
  /** Render high-resolution illustrated/WebP sprites smoothly instead of nearest-neighbor point sampling. */
  smooth?: boolean;
  /** Static image shown until the first sheet is decoded, or if it fails to load. */
  fallback?: ReactNode;
}

// Cache of decoded sheet aspect ratios so switching actions never shows an empty frame.
const loaded = new Map<string, number>();
const inflight = new Map<string, Promise<void>>();

export function preloadSpriteSheet(url: string, frames: number): Promise<void> {
  if (!url || loaded.has(url)) return Promise.resolve();
  const existing = inflight.get(url);
  if (existing) return existing;

  const p = new Promise<void>(resolve => {
    const img = new Image();
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        inflight.delete(url);
        resolve();
      }
    };
    const timer = setTimeout(finish, 15000);
    img.onload = () => {
      clearTimeout(timer);
      const ratio = img.naturalWidth / Math.max(1, frames) / Math.max(1, img.naturalHeight) || 1;
      loaded.set(url, ratio);
      if (img.decode) {
        img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish();
    };
    img.src = url;
  });

  inflight.set(url, p);
  return p;
}

interface Shown {
  url: string;
  frames: number;
  ratio: number;
}

/** Plays a horizontal sprite-sheet strip. Keeps the previous sheet visible until the next one is decoded. */
export default function SpriteAnimator({
  url,
  frames,
  fps,
  height = 64,
  playing = true,
  once = false,
  smooth = false,
  fallback,
}: Props) {
  const [frame, setFrame] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [shown, setShown] = useState<Shown | null>(() => {
    const ratio = loaded.get(url);
    return ratio ? { url, frames, ratio } : null;
  });

  useEffect(() => {
    let alive = true;
    setHasError(false);
    const swap = () => {
      const r = loaded.get(url);
      if (alive && r) {
        setShown({ url, frames, ratio: r });
        setFrame(0);
      } else if (alive && !r) {
        setHasError(true);
      }
    };
    if (loaded.has(url)) {
      swap();
    } else {
      preloadSpriteSheet(url, frames)
        .then(swap)
        .catch(() => {
          if (alive) setHasError(true);
        });
    }
    return () => {
      alive = false;
    };
  }, [url, frames]);

  useEffect(() => {
    if (!shown) return;
    setFrame(0);
    const n = shown.frames;
    if (!playing || n < 2) return;
    const id = window.setInterval(() => {
      setFrame(f => {
        const next = f + 1;
        if (once && next >= n) {
          window.clearInterval(id);
          return n - 1;
        }
        return next % n;
      });
    }, 1000 / fps);
    return () => window.clearInterval(id);
  }, [shown, fps, playing, once]);

  if (hasError) return <>{fallback ?? null}</>;
  if (!shown) return <div aria-hidden style={{ width: Math.round(height * 0.85), height }} />;

  const width = Math.max(1, Math.round(height * shown.ratio));
  const f = Math.min(frame, shown.frames - 1);
  return (
    <div
      aria-hidden
      className={smooth ? 'select-none' : 'pixelated select-none'}
      style={{
        width,
        height,
        backgroundImage: `url(${shown.url})`,
        backgroundSize: `${width * shown.frames}px ${height}px`,
        backgroundPosition: `${-f * width}px 0`,
        backgroundRepeat: 'no-repeat',
        imageRendering: smooth ? 'auto' : 'pixelated',
      }}
    />
  );
}
