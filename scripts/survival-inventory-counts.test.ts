import { describe, expect, test } from 'bun:test';
import { countOf, removeStacks, transferStack, validStackCount } from '../src/lib/survival/inventory';

describe('backpack material quantities', () => {
  test('15 branches allow direct quantities 1 through 15 only', () => {
    for (let count = 1; count <= 15; count++) expect(validStackCount(count, 15)).toBe(true);
    for (const count of [0, -1, 16, 1.5, NaN, Infinity]) expect(validStackCount(count, 15)).toBe(false);
  });
  test('moving 7 of 15 branches preserves 8 in the backpack and adds 7 to storage', () => {
    const result = transferStack([{ itemId: 'branch', count: 15 }], [{ itemId: 'branch', count: 2 }], 'branch', 7);
    expect(result).not.toBeNull();
    if (!result) throw new Error('Transfer failed');
    expect(countOf(result.source, 'branch')).toBe(8);
    expect(countOf(result.destination, 'branch')).toBe(9);
    expect(transferStack(result.source, result.destination, 'branch', 9)).toBeNull();
  });
  test('discarding a requested amount removes only that amount', () => {
    const result = removeStacks([{ itemId: 'branch', count: 15 }], [{ itemId: 'branch', count: 4 }]);
    expect(result).toEqual([{ itemId: 'branch', count: 11 }]);
  });
});