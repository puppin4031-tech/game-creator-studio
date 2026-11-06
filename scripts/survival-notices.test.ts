import { expect, test } from 'bun:test';
import { autoNotices, tagOf } from '../src/lib/survival/notices';

test('commit subjects map to tags', () => {
  expect(tagOf('Fix auto-gather loop')).toBe('fix');
  expect(tagOf('무게 50% 감소')).toBe('balance');
  expect(tagOf('Add guide book')).toBe('feature');
});

test('auto notices group by day and skip hand-written days', () => {
  const out = autoNotices([
    { day: '2026-11-07', subject: 'Add A' },
    { day: '2026-11-07', subject: 'Fix B' },
    { day: '2026-11-06', subject: 'Add C' },
  ], new Set(['2026-11-06']));
  expect(out).toHaveLength(1);
  expect(out[0].id).toBe('2026-11-07');
  expect(out[0].items.map((i) => i.tag)).toEqual(['feature', 'fix']);
});
