/** Deterministic 0..1 hash so expedition results never change after reload. */
export function hash01(seed: number, i: number): number {
  let h = (seed ^ (i * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
