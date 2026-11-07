import { expect, test } from 'bun:test';
import { savedAltar } from '../supabase/functions/survival-invent/facility-state';
import { usesRemoteInventions } from '../src/lib/survival/inventionAccess';
import { checkFacility } from '../src/lib/survival/invention';

test('legacy level 1 altar keeps four-slot invention access', () => {
  const legacy = { altar: true, base: { level: 1 } };
  expect(savedAltar(legacy)).toBe(true);
  expect(checkFacility({ category: 'weapon', materials: { flint: 3, cordage: 1, bone: 1, resin: 1 } }, savedAltar(legacy)).ok).toBe(true);
});

test('an unbuilt altar cannot gain altar access from base level', () => {
  const save = { altar: false, base: { level: 2 } };
  expect(savedAltar(save)).toBe(false);
  expect(savedAltar(undefined)).toBe(false);
});

test('GPS guests use local inventions without authenticated credit polling', () => {
  expect(usesRemoteInventions(true, null)).toBe(false);
  expect(usesRemoteInventions(true, undefined)).toBe(false);
});

test('signed-in GPS uses the server ledger; simulator stays local', () => {
  expect(usesRemoteInventions(true, 'player-id')).toBe(true);
  expect(usesRemoteInventions(false, 'player-id')).toBe(false);
});