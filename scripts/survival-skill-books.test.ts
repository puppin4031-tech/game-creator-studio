import { expect, test } from 'bun:test';
import { readSkillBook } from '../src/lib/survival/tech';
import type { ItemId } from '../src/lib/survival/items';
import type { Stack } from '../src/lib/survival/types';

const books: [ItemId, string][] = [
  ['tome_primal_strike', 'primal_strike'],
  ['tome_iron_skin', 'iron_skin'],
  ['tome_beast_mastery', 'beast_mastery'],
];

for (const [itemId, techId] of books) {
  test(`reading stored ${itemId} learns ${techId} and consumes exactly one book`, () => {
    const storage: Stack[] = [{ itemId, count: 2 }, { itemId: 'branch', count: 3 }];
    const read = readSkillBook(storage, itemId, []);
    expect(read?.tech.id).toBe(techId);
    expect(read?.remaining).toContainEqual({ itemId, count: 1 });
    expect(read?.remaining).toContainEqual({ itemId: 'branch', count: 3 });
    expect(storage[0].count).toBe(2);
  });
}

test('a book for an already learned skill is not consumed', () => {
  const storage: Stack[] = [{ itemId: 'tome_primal_strike', count: 1 }];
  expect(readSkillBook(storage, 'tome_primal_strike', ['primal_strike'])).toBeNull();
  expect(storage[0].count).toBe(1);
});

test('a missing book cannot teach a skill', () => {
  expect(readSkillBook([], 'tome_iron_skin', [])).toBeNull();
});

test('reading the last backpack book consumes it', () => {
  const read = readSkillBook([{ itemId: 'tome_beast_mastery', count: 1 }], 'tome_beast_mastery', []);
  expect(read?.tech.id).toBe('beast_mastery');
  expect(read?.remaining).toEqual([]);
});