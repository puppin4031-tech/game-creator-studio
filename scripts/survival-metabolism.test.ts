import { describe, expect, test } from 'bun:test';
import { advanceSurvivalVitals } from '../src/lib/survival/metabolism';

const minute = 60_000;

describe('gentler survival depletion', () => {
  test('active exploration consumes only 2.5 hunger in ten minutes', () => {
    let state = { hp: 100, hunger: 100, lastTickAt: 0 };
    for (let i = 1; i <= 10; i++) state = advanceSurvivalVitals(state, i * minute);
    expect(state.hunger).toBe(97.5);
    expect(state.hp).toBe(100);
  });
  test('starvation costs only 0.5 HP per minute', () => {
    expect(advanceSurvivalVitals({ hp: 100, hunger: 0, lastTickAt: 0 }, minute).hp).toBe(99.5);
  });
  test('a day away applies at most five minutes and never replays the backlog', () => {
    const resumedAt = 24 * 60 * minute;
    const state = advanceSurvivalVitals({ hp: 100, hunger: 20, lastTickAt: 0 }, resumedAt);
    expect(state.hunger).toBe(18.75);
    expect(state.lastTickAt).toBe(resumedAt);
    expect(advanceSurvivalVitals(state, resumedAt + 5000)).toBe(state);
  });
  test('offline starvation is capped at 2.5 HP', () => {
    expect(advanceSurvivalVitals({ hp: 100, hunger: 0, lastTickAt: 0 }, 24 * 60 * minute).hp).toBe(97.5);
  });
  test('starvation only starts on ticks where hunger reaches zero', () => {
    const state = advanceSurvivalVitals({ hp: 100, hunger: 0.75, lastTickAt: 0 }, 4 * minute);
    expect(state.hunger).toBe(0);
    expect(state.hp).toBe(99);
  });
  test('natural and location healing retain their existing rates', () => {
    expect(advanceSurvivalVitals({ hp: 50, hunger: 100, lastTickAt: 0 }, minute).hp).toBe(51);
    expect(advanceSurvivalVitals({ hp: 50, hunger: 100, lastTickAt: 0 }, minute, 3).hp).toBe(54);
  });
  test('partial minute is retained and HP stays within bounds', () => {
    const state = advanceSurvivalVitals({ hp: 1, hunger: 0, lastTickAt: 0 }, minute + 5000);
    expect(state.lastTickAt).toBe(minute);
    expect(state.hp).toBe(1);
    expect(advanceSurvivalVitals({ hp: 99, hunger: 100, lastTickAt: 0 }, minute, 3).hp).toBe(100);
  });
});