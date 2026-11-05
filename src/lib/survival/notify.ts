import { getSettings, saveSettings } from './gameSettings';

/** Browser notifications for long-running events (research, expedition, base danger). */
export const notifySupported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function enableNotifications(): Promise<boolean> {
  if (!notifySupported()) return false;
  try {
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    const ok = perm === 'granted';
    saveSettings({ notify: ok });
    return ok;
  } catch { return false; }
}

export function sendNotice(title: string, body: string, tag?: string) {
  if (!getSettings().notify || !notifySupported() || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, tag, icon: '/favicon.ico' }); } catch { /* mobile requires SW; ignore */ }
}
