import { useState, useEffect, useCallback, useRef } from 'react';

// Low-pass filter for smooth heading transitions
function lerpAngle(current: number, target: number, alpha: number): number {
  let diff = target - current;
  // Normalize to [-180, 180]
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return (current + diff * alpha + 360) % 360;
}

export function useDeviceHeading(active: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const hasAbsolute = useRef(false);
  const smoothedHeading = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const rawHeading = useRef<number | null>(null);

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

    const ALPHA = 0.15; // Low-pass filter strength (lower = smoother, more lag)

    const handleOrientation = (e: DeviceOrientationEvent, isAbsolute: boolean) => {
      if (!isAbsolute && hasAbsolute.current) return;
      if (isAbsolute) hasAbsolute.current = true;

      const compassHeading = (e as any).webkitCompassHeading;
      if (typeof compassHeading === 'number') {
        rawHeading.current = compassHeading;
      } else if (e.alpha !== null) {
        rawHeading.current = (360 - e.alpha!) % 360;
      }
    };

    // Animation loop for smooth interpolation
    const animate = () => {
      if (rawHeading.current !== null) {
        if (smoothedHeading.current === null) {
          smoothedHeading.current = rawHeading.current;
        } else {
          smoothedHeading.current = lerpAngle(smoothedHeading.current, rawHeading.current, ALPHA);
        }
        setHeading(Math.round(smoothedHeading.current * 10) / 10);
      }
      rafId.current = requestAnimationFrame(animate);
    };

    const absoluteHandler = (e: DeviceOrientationEvent) => handleOrientation(e, true);
    const fallbackHandler = (e: DeviceOrientationEvent) => handleOrientation(e, false);

    window.addEventListener('deviceorientationabsolute' as any, absoluteHandler, true);
    window.addEventListener('deviceorientation', fallbackHandler, true);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('deviceorientationabsolute' as any, absoluteHandler, true);
      window.removeEventListener('deviceorientation', fallbackHandler, true);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      hasAbsolute.current = false;
      smoothedHeading.current = null;
      rawHeading.current = null;
    };
  }, [active, permissionGranted]);

  useEffect(() => {
    if (!active) {
      setHeading(null);
      smoothedHeading.current = null;
      rawHeading.current = null;
    }
  }, [active]);

  return { heading, requestPermission, permissionGranted };
}
