import { describe, expect, test } from 'bun:test';
import { inventedSprite } from '../src/lib/survival/inventedItems';
import { sageAdvice } from '../src/lib/survival/invention';
describe('invented gear icons and advice', () => {
  test('weapon uses a weapon icon, not a material', () => expect(inventedSprite({ category: 'weapon', materials: { bone: 3, cordage: 1 } })).toBe('item-bone-dagger'));
  test('armor uses an armor icon', () => expect(inventedSprite({ category: 'building', materials: { hide: 3, cordage: 1 } })).toBe('item-hide-armor'));
  test('charm uses a charm icon', () => expect(inventedSprite({ category: 'relic', materials: { jade: 2, quartz: 1 } })).toBe('item-jade-amulet'));
  test('tool uses a tool icon', () => expect(inventedSprite({ category: 'tool', materials: { obsidian: 2, cordage: 1 } })).toBe('item-obsidian-pickaxe'));
  test('weak weapon advice names real materials', () => expect(sageAdvice('weapon', 'implausible', false, false, true, ['branch'])).toContain('흑요석'));
});
