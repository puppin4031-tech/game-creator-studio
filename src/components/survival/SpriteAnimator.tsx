import { useEffect, useState, type ReactNode } from 'react';
import { getSpriteBlobUrlFromLocalDb } from '@/utils/spriteStorage';

interface Props {
  url: string;
  frames?: number;
  fps?: number;
  height?: number;
  className?: string;
  loop?: boolean;
  /** Keep smooth interpolation for high-res illustrations (e.g. foliage props) instead of pixelated nearest-neighbor */
  smooth?: boolean;
  /** Disable auto-detecting 4-frame strips from aspect ratio (only for intentionally ultra-wide single-frame banners) */
  disableStripAutoDetect?: boolean;
  fallback?: ReactNode;
}

// Global in-memory decoded image cache so action transitions never flicker or re-fetch
const IMAGE_DIMENSION_CACHE = new Map<string, { w: number; h: number }>();
const RESOLVED_URL_CACHE = new Map<string, string>();
const FAILED_URL_SET = new Set<string>();

/**
 * Resolves `local://characterKey:action` URLs from IndexedDB into Blob Object URLs.
 */
export async function resolveSpriteUrl(url: string): Promise<string> {
  if (!url) return url;
  if (RESOLVED_URL_CACHE.has(url)) return RESOLVED_URL_CACHE.get(url)!;

  if (url.startsWith('local://')) {
    const raw = url.replace('local://', '');
    const lastColon = raw.lastIndexOf(':');
    if (lastColon > 0) {
      const charKey = raw.slice(0, lastColon);
      const act = raw.slice(lastColon + 1);
      const blobUrl = await getSpriteBlobUrlFromLocalDb(charKey, act);
      if (blobUrl) {
        RESOLVED_URL_CACHE.set(url, blobUrl);
        return blobUrl;
      }
    }
    throw new Error(`Unresolved local sprite URL: ${url}`);
  }
  return url;
}

export function preloadSpriteSheet(url: string): Promise<{ w: number; h: number; resolvedUrl: string }> {
  return resolveSpriteUrl(url).then(resolvedUrl => {
    const cached = IMAGE_DIMENSION_CACHE.get(resolvedUrl);
    if (cached) return { ...cached, resolvedUrl };

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const dims = {
          w: img.naturalWidth || 40,
          h: img.naturalHeight || 48,
        };
        IMAGE_DIMENSION_CACHE.set(resolvedUrl, dims);
        IMAGE_DIMENSION_CACHE.set(url, dims);
        resolve({ ...dims, resolvedUrl });
      };
      img.onerror = (err) => {
        FAILED_URL_SET.add(url);
        reject(err);
      };
      img.src = resolvedUrl;
    });
  });
}

/**
 * Given an image's natural width/height and a declared frame count,
 * determines the true frame count so a 4-frame horizontal sprite sheet
 * is NEVER accidentally rendered as 4 identical clones side-by-side when `frames` was saved as 1.
 */
export function resolveEffectiveFrameCount(
  declaredFrames: number,
  naturalW: number,
  naturalH: number,
  disableAutoDetect = false
): number {
  const safeDeclared = Math.max(1, Math.round(declaredFrames || 1));
  if (safeDeclared > 1 || disableAutoDetect || naturalH <= 0) {
    return safeDeclared;
  }
  const aspect = naturalW / naturalH;
  // Standard 4-frame horizontal strips have aspect ratio ~3.0 to 4.8 (e.g., 4x square or 4x 5:6 cells)
  if (aspect >= 2.85 && aspect <= 5.2) {
    return 4;
  }
  if (aspect >= 5.3) {
    return Math.max(4, Math.round(aspect));
  }
  return 1;
}

/**
 * Renders a horizontal sprite sheet (N equal-width frames in a single row)
 * at a given display height, advancing frames at `fps`.
 *
 * CRITICAL GUARANTEE:
 * - Never renders a multi-frame horizontal strip unclipped.
 * - Strictly clips the viewport (`overflow: hidden`) to 1 single frame width (`singleFrameWidth`),
 *   using CSS `background-size: ${singleFrameWidth * effectiveFrames}px ${height}px`
 *   and `background-position: ${-currentFrame * singleFrameWidth}px 0px`.
 * - Double-buffered: keeps displaying the previous valid sheet until the new sheet finishes decoding.
 */
export default function SpriteAnimator({
  url,
  frames = 4,
  fps = 8,
  height = 48,
  className = '',
  loop = true,
  smooth = false,
  disableStripAutoDetect = false,
  fallback = null,
}: Props) {
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(() => FAILED_URL_SET.has(url));

  const [activeSheet, setActiveSheet] = useState<{
    url: string;
    frames: number;
    fps: number;
    dims: { w: number; h: number };
  } | null>(() => {
    const resolved = RESOLVED_URL_CACHE.get(url) ?? (url && !url.startsWith('local://') ? url : null);
    if (!resolved) return null;
    const d = IMAGE_DIMENSION_CACHE.get(resolved) ?? IMAGE_DIMENSION_CACHE.get(url);
    return d ? { url: resolved, frames: Math.max(1, frames), fps, dims: d } : null;
  });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setFailed(false);

    const syncResolved = RESOLVED_URL_CACHE.get(url) ?? (!url.startsWith('local://') ? url : null);
    const cached = syncResolved
      ? IMAGE_DIMENSION_CACHE.get(syncResolved) ?? IMAGE_DIMENSION_CACHE.get(url)
      : null;

    if (cached && syncResolved) {
      setActiveSheet(prev => {
        if (prev?.url !== syncResolved) setFrame(0);
        return { url: syncResolved, frames: Math.max(1, frames), fps, dims: cached };
      });
      return;
    }

    preloadSpriteSheet(url)
      .then(({ w, h, resolvedUrl }) => {
        if (cancelled) return;
        setActiveSheet(prev => {
          if (prev?.url !== resolvedUrl) setFrame(0);
          return { url: resolvedUrl, frames: Math.max(1, frames), fps, dims: { w, h } };
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url, frames, fps]);

  const shown = activeSheet;
  const effectiveFrames = shown
    ? resolveEffectiveFrameCount(shown.frames, shown.dims.w, shown.dims.h, disableStripAutoDetect)
    : Math.max(1, frames);
  const activeFps = shown?.fps ?? fps;

  useEffect(() => {
    if (effectiveFrames <= 1 || activeFps <= 0) {
      setFrame(0);
      return;
    }
    const iv = window.setInterval(() => {
      setFrame(f => {
        if (f + 1 >= effectiveFrames) return loop ? 0 : effectiveFrames - 1;
        return f + 1;
      });
    }, Math.max(30, Math.round(1000 / activeFps)));
    return () => window.clearInterval(iv);
  }, [effectiveFrames, activeFps, loop, shown?.url]);

  if (failed && !shown) return <>{fallback}</>;

  // Even before preloadSpriteSheet finishes decoding natural dimensions, if we have a synchronous URL
  // we can render a 1:1 square clipped single-frame box immediately so there is never an empty flash or 4-wide strip!
  if (!shown) {
    if (url && !url.startsWith('local://')) {
      const initFrames = Math.max(1, frames || 1);
      const initW = Math.round(height);
      const f = frame % initFrames;
      return (
        <div
          aria-hidden
          data-sprite-animator="clipped-pending"
          data-frame-count={initFrames}
          className={`${smooth ? '' : 'pixelated'} inline-block shrink-0 select-none overflow-hidden ${className}`}
          style={{
            width: initW,
            height,
            backgroundImage: `url("${url}")`,
            backgroundSize: `${initW * initFrames}px ${height}px`,
            backgroundPosition: `${-f * initW}px 0px`,
            backgroundRepeat: 'no-repeat',
            imageRendering: smooth ? 'auto' : 'pixelated',
          }}
        />
      );
    }
    return fallback ? <>{fallback}</> : <div style={{ width: Math.round(height * 0.85), height }} className={`inline-block select-none ${className}`} />;
  }

  const singleFrameNaturalW = shown.dims.w / effectiveFrames;
  const singleFrameRatio = Math.max(0.35, Math.min(2.2, singleFrameNaturalW / Math.max(1, shown.dims.h)));
  const singleFrameWidth = Math.max(8, Math.round(height * singleFrameRatio));
  const f = frame % effectiveFrames;

  return (
    <div
      aria-hidden
      data-sprite-animator="clipped"
      data-frame-count={effectiveFrames}
      data-current-frame={f}
      className={`${smooth ? '' : 'pixelated'} inline-block shrink-0 select-none overflow-hidden ${
        effectiveFrames === 1 ? 'animate-pulse-subtle' : ''
      } ${className}`}
      style={{
        width: singleFrameWidth,
        height,
        maxWidth: singleFrameWidth,
        backgroundImage: `url("${shown.url}")`,
        backgroundSize: `${singleFrameWidth * effectiveFrames}px ${height}px`,
        backgroundPosition: `${-f * singleFrameWidth}px 0px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: smooth ? 'auto' : 'pixelated',
      }}
    />
  );
}
