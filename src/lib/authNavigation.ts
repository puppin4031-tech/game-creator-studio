// Exploration flow: login -> era/name setup on "/" -> /world
export const EXPLORATION_LOGIN_URL = '/login?returnTo=%2F%3Fstart%3D1';

export function loginDestination(returnTo: string | null): string {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//') || /[\\\r\n]/.test(returnTo)) return '/admin';
  const url = new URL(returnTo, 'https://app.local');
  if (url.origin !== 'https://app.local' || url.pathname === '/login') return '/admin';
  return `${url.pathname}${url.search}${url.hash}`;
}
