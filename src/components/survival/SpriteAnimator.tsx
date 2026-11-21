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
  return new Promise(resolve => {
    const img = new Image();
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    // 3.5s timeout safety for mobile networks so failing image never stalls the app
    const timer = setTimeout(finish, 3500);
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      clearTimeout(timer);
      const done = () => {
        loaded.set(url, img.naturalWidth / frames / img.naturalHeight || 1);
        finish();
      };
      if (img.decode) {
        img.decode().then(done).catch(done);
      } else {
        done();
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish();
    };
    img.src = url;
  });
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

  if (hasError || !shown) return <>{fallback ?? null}</>;

  const width = height * shown.ratio;
  const f = Math.min(frame, shown.frames - 1);
  return (
    <div
      aria-hidden
      className="pixelated select-none"
      style={{
        width,
        height,
        backgroundImage: `url(${shown.url})`,
        backgroundSize: `${width * shown.frames}px ${height}px`,
        backgroundPosition: `${-f * width}px 0`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
}
