import { test, expect } from 'bun:test';
import { EXPLORATION_LOGIN_URL, loginDestination } from '../src/lib/authNavigation';

test('exploration starts at login and returns to era setup on main page', () => {
  const url = new URL(EXPLORATION_LOGIN_URL, 'https://app.local');
  expect(url.pathname).toBe('/login');
  expect(loginDestination(url.searchParams.get('returnTo'))).toBe('/?start=1');
});
test('administrator login retains its destination', () => {
  expect(loginDestination(null)).toBe('/admin');
});
test('login never redirects to an external origin or itself', () => {
  for (const path of ['https://example.com', '//example.com', '/\\example.com', '/login']) {
    expect(loginDestination(path)).toBe('/admin');
  }
});