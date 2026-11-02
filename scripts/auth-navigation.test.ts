import { test, expect } from 'bun:test';
import {
  EXPLORATION_LOGIN_URL,
  loginAudience,
  loginDestination,
  loginUrlFor,
} from '../src/lib/authNavigation';

test('exploration starts at login and returns to era setup on main page', () => {
  const url = new URL(EXPLORATION_LOGIN_URL, 'https://app.local');
  expect(url.pathname).toBe('/login');
  expect(loginDestination(url.searchParams.get('returnTo'))).toBe('/?start=1');
});

test('explicit administrator destination is retained', () => {
  expect(loginDestination('/admin')).toBe('/admin');
  expect(loginDestination('/admin/sprites')).toBe('/admin/sprites');
});

test('players without a destination land on the game, not the admin console', () => {
  expect(loginDestination(null)).toBe('/');
  expect(loginDestination('')).toBe('/');
});

test('login never redirects to an external origin or itself', () => {
  for (const path of ['https://example.com', '//example.com', '/\\example.com', '/login']) {
    expect(loginDestination(path)).toBe('/');
  }
});

test('protected routes hand the visitor back to the page they wanted', () => {
  const loginUrl = loginUrlFor('/admin/users');
  expect(loginUrl).toBe('/login?returnTo=%2Fadmin%2Fusers');
  const params = new URL(loginUrl, 'https://app.local').searchParams;
  expect(loginDestination(params.get('returnTo'))).toBe('/admin/users');
});

test('login wording follows the audience of the destination', () => {
  expect(loginAudience('/admin')).toBe('admin');
  expect(loginAudience('/admin/sprites')).toBe('admin');
  expect(loginAudience('/?start=1')).toBe('explorer');
  expect(loginAudience('/world')).toBe('explorer');
  expect(loginAudience('/play/O54Q')).toBe('player');
  expect(loginAudience('/')).toBe('player');
});
