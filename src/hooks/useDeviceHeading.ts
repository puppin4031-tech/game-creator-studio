import { useState, useEffect, useCallback } from 'react';

export function useDeviceHeading(active: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestPermission = useCallback(async () => {
    // iOS 13+ requires explicit permission
    const DeviceOrientationEvt = DeviceOrientationEvent as any;
    if (typeof DeviceOrientationEvt.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvt.requestPermission();
        if (result === 'granted') {
          setPermissionGranted(true);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }
    // Android / non-iOS – no permission needed
    setPermissionGranted(true);
    return true;
  }, []);

  useEffect(() => {
    if (!active || !permissionGranted) return;

    let lastUpdate = 0;
    const THROTTLE_MS = 100;

    const handler = (e: DeviceOrientationEvent) => {
      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return;
      lastUpdate = now;

      // webkitCompassHeading for iOS, alpha for Android
      const compassHeading = (e as any).webkitCompassHeading;
      if (typeof compassHeading === 'number') {
        setHeading(compassHeading);
      } else if (e.alpha !== null) {
        // alpha is counterclockwise from north on Android; convert
        setHeading((360 - e.alpha) % 360);
      }
    };

    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, [active, permissionGranted]);

  useEffect(() => {
    if (!active) setHeading(null);
  }, [active]);

  return { heading, requestPermission, permissionGranted };
}
