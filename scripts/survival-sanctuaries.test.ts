import { expect, test } from 'bun:test';
import { FIRST_AWAKEN_SACRED, NETWORK_LINK_SACRED, RITES, SHRINES, SHRINE_BLESS_COOLDOWN_MS, canBless, discoverShrine, emptyShrineState, recordBlessing } from '../src/lib/survival/sanctuaries';

test('any sanctuary can be awakened first, later ones link the network', () => {
  const a = discoverShrine(emptyShrineState(), SHRINES[10].id)!;
  expect(a.first).toBe(true);
  expect(a.state.sacred).toBe(FIRST_AWAKEN_SACRED);
  const b = discoverShrine(a.state, SHRINES[3].id)!;
  expect(b.first).toBe(false);
  expect(b.state.sacred).toBe(FIRST_AWAKEN_SACRED + NETWORK_LINK_SACRED);
  expect(discoverShrine(b.state, SHRINES[3].id)).toBeNull();
});

test('altar blessing refills every 12 hours', () => {
  const st = recordBlessing(emptyShrineState(), 'x', 0);
  expect(canBless(st, 'x', SHRINE_BLESS_COOLDOWN_MS - 1).ok).toBe(false);
  expect(canBless(st, 'x', SHRINE_BLESS_COOLDOWN_MS).ok).toBe(true);
});

test('rites cost rare materials', () => {
  expect(RITES.every((r) => r.cost.length > 0 && r.sacred > 0)).toBe(true);
});
