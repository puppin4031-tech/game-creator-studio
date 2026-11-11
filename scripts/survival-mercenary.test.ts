import { describe, expect, it } from 'bun:test';
import { hireMercenary, mercActive, MERC_CONTRACT_MS } from '../src/lib/survival/mercenaries';
describe('mercenary contract', () => {
  it('lasts exactly 24 hours', () => {
    const m = hireMercenary(1000);
    expect(mercActive(m, 1000 + MERC_CONTRACT_MS - 1)).toBe(true);
    expect(mercActive(m, 1000 + MERC_CONTRACT_MS)).toBe(false);
  });
});
