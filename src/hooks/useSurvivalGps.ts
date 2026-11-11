import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { acceptGpsFix, smoothGpsFix, shouldReanchor, GPS_JUMP_LOCK_MS, GPS_STALE_MS, type GpsFix } from '@/lib/survival/gps';
import type { LatLng } from '@/lib/survival/types';

export function useSurvivalGps(enabled: boolean, onPosition: (pos: LatLng) => void) {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [attempt, setAttempt] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const retry = useCallback(() => setAttempt(x => x + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    setFix(null); setError(null);
    if (!navigator.geolocation) { setError('이 기기는 GPS 위치 기능을 지원하지 않습니다.'); return; }
    let lastRaw: GpsFix | null = null;
    let lastFiltered: GpsFix | null = null;
    let variance = 100;
    let rejects = 0;
    const watch = navigator.geolocation.watchPosition(p => {
      const candidate: GpsFix = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, timestamp: p.timestamp };
      if (!acceptGpsFix(candidate, lastRaw)) {
        if (candidate.accuracy <= 25) rejects += 1;
        if (lastRaw && shouldReanchor(rejects, candidate)) {
          // Re-anchor at the new place but lock interactions so a spoofed jump yields nothing immediately.
          rejects = 0; lastRaw = candidate; lastFiltered = candidate; variance = Math.max(1, candidate.accuracy ** 2);
          setLockedUntil(Date.now() + GPS_JUMP_LOCK_MS);
          setFix(candidate); setNow(Date.now()); setError(null); onPosition(candidate);
          return;
        }
        setError(candidate.accuracy > 25 ? `GPS 오차 ±${Math.round(candidate.accuracy)}m · 더 정확한 신호를 기다립니다.` : '급격한 위치 변화 감지 · GPS를 다시 확인합니다.');
        return;
      }
      rejects = 0;
      const filtered = smoothGpsFix(candidate, lastFiltered, variance);
      lastRaw = candidate; lastFiltered = filtered.fix; variance = filtered.variance;
      setFix(filtered.fix); setNow(Date.now()); setError(null); onPosition(filtered.fix);
    }, e => {
      const message = e.code === 1 ? '위치 권한이 꺼져 있습니다. 브라우저 설정에서 위치를 허용해 주세요.' : 'GPS 신호를 가져오지 못했습니다. 야외에서 다시 시도해 주세요.';
      setError(message); toast.error(message);
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [enabled, attempt, onPosition]);
  const locked = now < lockedUntil;
  const ready = enabled && !!fix && !error && !locked && now - fix.timestamp <= GPS_STALE_MS;
  const lockMessage = locked ? `급격한 이동 감지 · ${Math.ceil((lockedUntil - now) / 1000)}초 후 활동할 수 있습니다.` : null;
  return { fix, ready, error: error ?? lockMessage ?? (fix && !ready && enabled ? 'GPS 신호가 오래되었습니다. 위치를 다시 확인합니다.' : null), retry };
}
// Hook order can change across modules during edits; force a full reload instead of hot patching.
if (import.meta.hot) import.meta.hot.decline();
