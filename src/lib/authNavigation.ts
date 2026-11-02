// Exploration flow: login -> era/name setup on "/" -> /world
export const EXPLORATION_LOGIN_URL = '/login?returnTo=%2F%3Fstart%3D1';

// Players land on the game start; admins keep an explicit /admin return target.
const FALLBACK_DESTINATION = '/';

export type LoginAudience = 'admin' | 'explorer' | 'player';

export function loginDestination(returnTo: string | null): string {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//') || /[\\\r\n]/.test(returnTo)) {
    return FALLBACK_DESTINATION;
  }
  const url = new URL(returnTo, 'https://app.local');
  if (url.origin !== 'https://app.local' || url.pathname === '/login') return FALLBACK_DESTINATION;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function loginUrlFor(pathnameWithSearch: string): string {
  return `/login?returnTo=${encodeURIComponent(pathnameWithSearch)}`;
}

export function loginAudience(destination: string): LoginAudience {
  if (destination === '/admin' || destination.startsWith('/admin/')) return 'admin';
  if (destination === '/?start=1' || destination.startsWith('/world') || destination.startsWith('/play/survival')) {
    return 'explorer';
  }
  return 'player';
}
