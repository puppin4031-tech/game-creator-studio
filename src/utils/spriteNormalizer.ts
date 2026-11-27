/**
 * Client-Side Sprite Normalizer Engine
 * 
 * Automatically transforms raw sprite-sheets into standardized, pixel-crisp horizontal strips:
 * 1. Optional chroma-key background removal (hot pink #FF00FF, pure white #FFFFFF, or auto-detected corner color).
 * 2. Smart auto-slicing via transparent vertical-gap projection with equal-N division fallback.
 * 3. Individual frame trimming (removes dead padding).
 * 4. Proportional scaling to target cell dimensions without distortion.
 * 5. Horizontal centering + bottom baseline (foot) alignment so characters never jitter vertically.
 * 6. Pixel-art preservation (imageSmoothingEnabled = false) and repack to exact horizontal strip PNG.
 */

export interface NormalizerOptions {
  /** Target frame count (defaults to 4) */
  frameCount: number;
  /** Target cell width (defaults to 48 for characters, 64 for mobs) */
  cellWidth: number;
  /** Target cell height (defaults to 48 for characters, 64 for mobs) */
  cellHeight: number;
  /** Enable background removal / chroma-key (default: true) */
  removeBackground: boolean;
  /** Background detection mode: 'auto' | 'hot_pink' | 'white' | 'custom' */
  bgMode: 'auto' | 'hot_pink' | 'white' | 'custom';
  /** Custom background hex or rgb if bgMode === 'custom' */
  customBgColor?: string;
  /** Chroma key tolerance 0-100 (default: 25) */
  tolerance: number;
  /** Bottom baseline padding in pixels (default: 2) */
  baselinePadding: number;
}

export interface NormalizerResult {
  /** Normalized PNG Blob ready for Supabase storage upload */
  blob: Blob;
  /** Object URL for live browser preview */
  previewUrl: string;
  /** Confirmed frame count */
  frameCount: number;
  /** Total strip width (cellWidth * frameCount) */
  totalWidth: number;
  /** Total strip height (cellHeight) */
  totalHeight: number;
  /** Target cell width */
  cellWidth: number;
  /** Target cell height */
  cellHeight: number;
  /** Bounding box of each detected source frame */
  detectedFrames: Array<{ minX: number; minY: number; maxX: number; maxY: number }>;
}

export const DEFAULT_NORMALIZER_OPTIONS: NormalizerOptions = {
  frameCount: 4,
  cellWidth: 48,
  cellHeight: 48,
  removeBackground: true,
  bgMode: 'auto',
  tolerance: 25,
  baselinePadding: 2,
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

/**
 * Normalizes an uploaded sprite sheet into an exact standardized strip PNG.
 */
export async function normalizeSpriteSheet(
  source: File | Blob | string,
  options: Partial<NormalizerOptions> = {}
): Promise<NormalizerResult> {
  const opts: NormalizerOptions = { ...DEFAULT_NORMALIZER_OPTIONS, ...options };
  const frameCount = Math.max(1, Math.min(32, opts.frameCount || 4));
  const cellWidth = Math.max(16, opts.cellWidth || 48);
  const cellHeight = Math.max(16, opts.cellHeight || 48);

  // 1. Load image onto canvas
  const img = await loadImage(source);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) throw new Error('2D Canvas context unavailable');

  srcCtx.drawImage(img, 0, 0);
  const imgData = srcCtx.getImageData(0, 0, srcW, srcH);
  const data = imgData.data;

  // 2. Chroma Key / Background Removal
  if (opts.removeBackground) {
    let targetBg: [number, number, number] = [255, 0, 255]; // default hot pink
    if (opts.bgMode === 'hot_pink') {
      targetBg = [255, 0, 255];
    } else if (opts.bgMode === 'white') {
      targetBg = [255, 255, 255];
    } else if (opts.bgMode === 'custom' && opts.customBgColor) {
      targetBg = hexToRgb(opts.customBgColor);
    } else {
      // Auto: inspect top-left corner pixel (0, 0)
      const r = data[0];
      const g = data[1];
      const b = data[2];
      const a = data[3];
      // If top-left has solid color, use it as chroma key background
      if (a > 100) {
        targetBg = [r, g, b];
      }
    }

    const maxDist = (opts.tolerance / 100) * 441.67; // max euclidean distance in RGB is sqrt(255^2 * 3) = 441.67
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a > 10) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = Math.hypot(r - targetBg[0], g - targetBg[1], b - targetBg[2]);
        // Also check common AI magenta (#FF00FF) so slight edge compression artifacts are caught
        const magentaDist = opts.bgMode !== 'white' ? Math.hypot(r - 255, g - 0, b - 255) : dist;
        if (Math.min(dist, magentaDist) <= maxDist) {
          data[i + 3] = 0; // Make transparent
        }
      }
    }

    // 2b. 1px Magenta / Purple Edge Spill & Fringe Cleanup Pass:
    // Soften or remove remaining magenta/purple halo pixels (`R > 150 && B > 150 && G < 100`)
    // bordering transparent pixels so pixel trees and mobs do not have pink outlines.
    const alphaSnap = new Uint8ClampedArray(srcW * srcH);
    for (let idx = 0; idx < srcW * srcH; idx++) {
      alphaSnap[idx] = data[idx * 4 + 3];
    }

    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) {
        const idx = y * srcW + x;
        if (alphaSnap[idx] === 0) continue;

        const p = idx * 4;
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];

        const isMagentaSpill =
          r > 150 &&
          b > 150 &&
          g < 100 &&
          r - g > 55 &&
          b - g > 55;

        if (!isMagentaSpill) continue;

        let nearTransparent = false;
        for (let dy = -1; dy <= 1 && !nearTransparent; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= srcW || ny < 0 || ny >= srcH || alphaSnap[ny * srcW + nx] < 32) {
              nearTransparent = true;
              break;
            }
          }
        }

        if (nearTransparent) {
          const spillStrength = Math.min(r - g, b - g);
          if (spillStrength > 105) {
            data[p + 3] = 0;
          } else {
            // Neutralize purple cast toward green/luma and soften edge alpha
            const neutral = Math.max(g, Math.round(g * 1.15));
            data[p] = neutral;
            data[p + 2] = neutral;
            data[p + 3] = Math.round(alphaSnap[idx] * 0.45);
          }
        }
      }
    }

    srcCtx.putImageData(imgData, 0, 0);
  }

  // 3. Smart Slicing & Per-Frame Auto-Trim
  // Calculate vertical alpha projection across all X columns
  const colHasContent = new Uint8Array(srcW);
  for (let x = 0; x < srcW; x++) {
    for (let y = 0; y < srcH; y++) {
      const idx = (y * srcW + x) * 4;
      if (data[idx + 3] > 15) {
        colHasContent[x] = 1;
        break;
      }
    }
  }

  // Find contiguous content runs
  const contentRuns: Array<{ start: number; end: number }> = [];
  let inRun = false;
  let runStart = 0;
  for (let x = 0; x < srcW; x++) {
    if (colHasContent[x] === 1) {
      if (!inRun) {
        inRun = true;
        runStart = x;
      }
    } else {
      if (inRun) {
        inRun = false;
        contentRuns.push({ start: runStart, end: x - 1 });
      }
    }
  }
  if (inRun) {
    contentRuns.push({ start: runStart, end: srcW - 1 });
  }

  // Determine frame slices
  const frameSlices: Array<{ startX: number; endX: number }> = [];
  if (contentRuns.length === frameCount) {
    // Exact match: use detected content runs!
    for (const run of contentRuns) {
      frameSlices.push({ startX: run.start, endX: run.end });
    }
  } else {
    // Fallback: divide strip into N equal slices
    const sliceWidth = srcW / frameCount;
    for (let i = 0; i < frameCount; i++) {
      frameSlices.push({
        startX: Math.floor(i * sliceWidth),
        endX: Math.min(srcW - 1, Math.floor((i + 1) * sliceWidth) - 1),
      });
    }
  }

  // Compute tight bounding box for each slice
  const detectedFrames: Array<{ minX: number; minY: number; maxX: number; maxY: number }> = [];
  for (const slice of frameSlices) {
    let minX = slice.endX;
    let maxX = slice.startX;
    let minY = srcH - 1;
    let maxY = 0;
    let hasPixels = false;

    for (let y = 0; y < srcH; y++) {
      for (let x = slice.startX; x <= slice.endX; x++) {
        const idx = (y * srcW + x) * 4;
        if (data[idx + 3] > 15) {
          hasPixels = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!hasPixels) {
      // Empty slice: fallback to slice center box
      const cx = Math.floor((slice.startX + slice.endX) / 2);
      const cy = Math.floor(srcH / 2);
      detectedFrames.push({
        minX: Math.max(0, cx - 10),
        minY: Math.max(0, cy - 10),
        maxX: Math.min(srcW - 1, cx + 10),
        maxY: Math.min(srcH - 1, cy + 10),
      });
    } else {
      detectedFrames.push({ minX, minY, maxX, maxY });
    }
  }

  // 4. Output Canvas Repacking
  const totalWidth = cellWidth * frameCount;
  const totalHeight = cellHeight;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = totalWidth;
  outCanvas.height = totalHeight;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Output 2D Canvas context unavailable');

  // Pixel-art preservation: crisp nearest-neighbor rendering
  outCtx.imageSmoothingEnabled = false;

  const maxContentW = cellWidth - 4; // 2px margin on left and right
  const maxContentH = cellHeight - opts.baselinePadding - 2; // leave baseline padding at bottom + 2px top margin

  for (let i = 0; i < frameCount; i++) {
    const box = detectedFrames[i];
    const cropW = Math.max(1, box.maxX - box.minX + 1);
    const cropH = Math.max(1, box.maxY - box.minY + 1);

    // Scale proportionally to fit inside available cell space without distortion
    const scale = Math.min(maxContentW / cropW, maxContentH / cropH, 1.0);
    const drawW = Math.max(1, Math.round(cropW * scale));
    const drawH = Math.max(1, Math.round(cropH * scale));

    // Horizontal centering within current cell
    const cellOffsetX = i * cellWidth;
    const destX = cellOffsetX + Math.round((cellWidth - drawW) / 2);

    // Bottom baseline (feet) alignment so character stands firmly without jumping
    const destY = cellHeight - opts.baselinePadding - drawH;

    outCtx.drawImage(
      srcCanvas,
      box.minX,
      box.minY,
      cropW,
      cropH,
      destX,
      destY,
      drawW,
      drawH
    );
  }

  // 5. Export to PNG Blob and Object URL
  const blob = await new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob(b => {
      if (b) resolve(b);
      else reject(new Error('Failed to create normalized sprite PNG blob'));
    }, 'image/png');
  });

  const previewUrl = URL.createObjectURL(blob);

  return {
    blob,
    previewUrl,
    frameCount,
    totalWidth,
    totalHeight,
    cellWidth,
    cellHeight,
    detectedFrames,
  };
}

function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for normalization'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}
