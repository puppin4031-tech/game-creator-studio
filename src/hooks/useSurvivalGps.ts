import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { acceptGpsFix, smoothGpsFix, shouldReanchor, GPS_JUMP_LOCK_MS, GPS_STALE_MS, GPS_MAX_SPEED_MPS, type GpsFix } from '@/lib/survival/gps';
import type { LatLng } from '@/lib/survival/types';

export interface SurvivalGpsReturn {
  fix: GpsFix | null;
  ready: boolean;
  isIndoor: boolean;
  error: string | null;
  retry: () => void;
  switchToIndoor: () => void;
}

export function useSurvivalGps(
  enabled: boolean,
  onPosition: (pos: LatLng) => void,
  fallbackPos?: LatLng | null,
  maxSpeedKmh?: number
): SurvivalGpsReturn {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isIndoor, setIsIndoor] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [attempt, setAttempt] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const fallbackRef = useRef<LatLng | null | undefined>(fallbackPos);
  fallbackRef.current = fallbackPos;

  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  const maxSpeedKmhRef = useRef<number | undefined>(maxSpeedKmh);
  maxSpeedKmhRef.current = maxSpeedKmh;

  const gotFirstFix = useRef(false);
  const wasIndoorRef = useRef(false);

  const switchToIndoor = useCallback(() => {
    setIsIndoor(true);
    setError(null);
    if (fallbackRef.current) {
      onPositionRef.current(fallbackRef.current);
    }
  }, []);

  const retry = useCallback(() => {
    setAttempt(x => x + 1);
    toast.info('GPS 위치 신호를 다시 요청합니다...');
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const intervalMs = now < lockedUntil ? 1000 : 5000;
    const timer = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, now < lockedUntil]);

  useEffect(() => {
    if (!enabled) return;

    gotFirstFix.current = false;
    setError(null);

    // If geolocation API is missing on device, immediately fall back to Indoor Mode
    if (!navigator.geolocation) {
      setIsIndoor(true);
      if (fallbackRef.current) {
        onPositionRef.current(fallbackRef.current);
      }
      return;
    }

    // Graceful indoor fallback timer: if no GPS fix within 6 seconds, activate Indoor Mode automatically
    const indoorGraceTimer = setTimeout(() => {
      if (!gotFirstFix.current) {
        setIsIndoor(true);
        if (fallbackRef.current) {
          onPositionRef.current(fallbackRef.current);
        }
      }
    }, 6000);

    let lastRaw: GpsFix | null = null;
    let lastFiltered: GpsFix | null = null;
    let variance = 100;
    let rejects = 0;

    const watch = navigator.geolocation.watchPosition(
      p => {
        clearTimeout(indoorGraceTimer);
        const candidate: GpsFix = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          timestamp: p.timestamp,
        };

        const speedKmh = maxSpeedKmhRef.current ?? 13;
        const maxSpeedMps = Math.max(GPS_MAX_SPEED_MPS, (speedKmh * 1000) / 3600);

        if (!acceptGpsFix(candidate, lastRaw, maxSpeedMps)) {
          if (candidate.accuracy <= 25) rejects += 1;
          if (lastRaw && shouldReanchor(rejects, candidate)) {
            rejects = 0;
            lastRaw = candidate;
            lastFiltered = candidate;
            variance = Math.max(1, candidate.accuracy ** 2);
            setLockedUntil(Date.now() + GPS_JUMP_LOCK_MS);
            setFix(candidate);
            setNow(Date.now());
            setError(null);
            setIsIndoor(false);
            onPositionRef.current(candidate);
            return;
          }
          // Do not hard-block indoors on moderate accuracy
          if (candidate.accuracy > 40) {
            setIsIndoor(true);
            if (fallbackRef.current) onPositionRef.current(fallbackRef.current);
          }
          return;
        }

        rejects = 0;
        const filtered = smoothGpsFix(candidate, lastFiltered, variance);
        lastRaw = candidate;
        lastFiltered = filtered.fix;
        variance = filtered.variance;

        gotFirstFix.current = true;
        setFix(filtered.fix);
        setNow(Date.now());
        setError(null);

        if (wasIndoorRef.current) {
          toast.success(`GPS 신호 연결됨 (오차 ±${Math.round(filtered.fix.accuracy)}m)`);
          wasIndoorRef.current = false;
        }
        setIsIndoor(false);
        onPositionRef.current(filtered.fix);
      },
      e => {
        clearTimeout(indoorGraceTimer);
        // On error (permission denied, timeout, unavailable), switch gracefully to Indoor Mode without blocking
        setIsIndoor(true);
        wasIndoorRef.current = true;
        setError(null);
        if (fallbackRef.current) {
          onPositionRef.current(fallbackRef.current);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );

    return () => {
      clearTimeout(indoorGraceTimer);
      navigator.geolocation.clearWatch(watch);
    };
  }, [enabled, attempt]);

  const locked = now < lockedUntil;
  const ready = enabled && !!fix && !error && !locked && now - fix.timestamp <= GPS_STALE_MS;
  const lockMessage = locked ? `급격한 이동 감지 · ${Math.ceil((lockedUntil - now) / 1000)}초 후 활동할 수 있습니다.` : null;

  return {
    fix,
    ready,
    isIndoor,
    error: error ?? lockMessage ?? (fix && !ready && enabled && !isIndoor ? 'GPS 신호가 오래되었습니다. 위치를 다시 확인합니다.' : null),
    retry,
    switchToIndoor,
  };
}

if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());
