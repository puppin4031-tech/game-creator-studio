import { useState, useEffect, useCallback, useRef } from 'react';

export function useDeviceHeading(active: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const hasAbsolute = useRef(false);

  const requestPermission = useCallback(async () => {
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
    setPermissionGranted(true);
    return true;
  }, []);

  useEffect(() => {
    if (!active || !permissionGranted) return;

    let lastUpdate = 0;
    const THROTTLE_MS = 80;

    const handleOrientation = (e: DeviceOrientationEvent, isAbsolute: boolean) => {
      // If we already have absolute events, ignore non-absolute ones
      if (!isAbsolute && hasAbsolute.current) return;
      if (isAbsolute) hasAbsolute.current = true;

      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return;
      lastUpdate = now;

      const compassHeading = (e as any).webkitCompassHeading;
      if (typeof compassHeading === 'number') {
        setHeading(compassHeading);
      } else if (e.alpha !== null) {
        setHeading((360 - e.alpha!) % 360);
      }
    };

    const absoluteHandler = (e: DeviceOrientationEvent) => handleOrientation(e, true);
    const fallbackHandler = (e: DeviceOrientationEvent) => handleOrientation(e, false);

    window.addEventListener('deviceorientationabsolute' as any, absoluteHandler, true);
    window.addEventListener('deviceorientation', fallbackHandler, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute' as any, absoluteHandler, true);
      window.removeEventListener('deviceorientation', fallbackHandler, true);
      hasAbsolute.current = false;
    };
  }, [active, permissionGranted]);

  useEffect(() => {
    if (!active) setHeading(null);
  }, [active]);

  return { heading, requestPermission, permissionGranted };
}
