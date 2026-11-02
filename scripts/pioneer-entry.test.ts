import { expect, test } from 'bun:test';
import { normalizePioneerName, PIONEER_ERAS, PIONEER_NAME_KEY } from '../src/lib/pioneer';

test('existing pioneer names remain compatible with game name storage', () => {
  expect(PIONEER_NAME_KEY).toBe('colonion.pioneerName');
  expect(normalizePioneerName(' 김은택 ')).toBe('김은택');
});

test('empty names cannot enter and names retain the existing 16 character limit', () => {
  expect(normalizePioneerName('   ')).toBe('');
  expect(normalizePioneerName('abcdefghijklmnopq')).toBe('abcdefghijklmnop');
});

test('character entry keeps unsupported eras locked without starting a different world', () => {
  expect(PIONEER_ERAS.find(era => era.id === 'neolithic')?.available).toBe(false);
  expect(PIONEER_ERAS.filter(era => era.available).map(era => era.id)).toEqual(['stone']);
});