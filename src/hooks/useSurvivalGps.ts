import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { acceptGpsFix, smoothGpsFix, GPS_STALE_MS, type GpsFix } from '@/lib/survival/gps';
import type { LatLng } from '@/lib/survival/types';

export function useSurvivalGps(enabled: boolean, onPosition: (pos: LatLng) => void) {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [attempt, setAttempt] = useState(0);
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
    const watch = navigator.geolocation.watchPosition(p => {
      const candidate: GpsFix = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, timestamp: p.timestamp };
      if (!acceptGpsFix(candidate, lastRaw)) {
        setError(candidate.accuracy > 25 ? `GPS 오차 ±${Math.round(candidate.accuracy)}m · 더 정확한 신호를 기다립니다.` : '급격한 위치 변화 감지 · GPS를 다시 확인합니다.');
        return;
      }
      const filtered = smoothGpsFix(candidate, lastFiltered, variance);
      lastRaw = candidate; lastFiltered = filtered.fix; variance = filtered.variance;
      setFix(filtered.fix); setNow(Date.now()); setError(null); onPosition(filtered.fix);
    }, e => {
      const message = e.code === 1 ? '위치 권한이 꺼져 있습니다. 브라우저 설정에서 위치를 허용해 주세요.' : 'GPS 신호를 가져오지 못했습니다. 야외에서 다시 시도해 주세요.';
      setError(message); toast.error(message);
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [enabled, attempt, onPosition]);
  const ready = enabled && !!fix && !error && now - fix.timestamp <= GPS_STALE_MS;
  return { fix, ready, error: error ?? (fix && !ready && enabled ? 'GPS 신호가 오래되었습니다. 위치를 다시 확인합니다.' : null), retry };
}