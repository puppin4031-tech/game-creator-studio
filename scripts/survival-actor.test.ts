import { describe, expect, test } from 'bun:test';
import { shouldReturnToCenter } from '../src/lib/survival/actorPos';

const anchor = { lat: 37.75, lng: 126.78 };
const mLat = 1 / 111_320;

describe('actor visual return', () => {
  test('stays at object while GPS unchanged and inside 25m', () => {
    expect(shouldReturnToCenter(anchor, { lat: anchor.lat + 10 * mLat, lng: anchor.lng, anchor }, 25)).toBe(false);
  });
  test('returns when real GPS moves 3m or more', () => {
    const pos = { lat: anchor.lat + 4 * mLat, lng: anchor.lng };
    expect(shouldReturnToCenter(pos, { lat: anchor.lat + 10 * mLat, lng: anchor.lng, anchor }, 25)).toBe(true);
  });
  test('returns when object leaves 25m radius', () => {
    expect(shouldReturnToCenter(anchor, { lat: anchor.lat + 30 * mLat, lng: anchor.lng, anchor }, 25)).toBe(true);
  });
});
