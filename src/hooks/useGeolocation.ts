import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface UseGeolocationReturn {
  position: GeoPosition;
  error: string | null;
  isTracking: boolean;
  isSimulated: boolean;
  mockMove: (direction: 'north' | 'south' | 'east' | 'west') => void;
  setMockPosition: (lat: number, lng: number) => void;
  setMockStep: (step: number) => void;
}

// Default to 파주교회 spot area
const DEFAULT_POSITION: GeoPosition = { latitude: 37.7480, longitude: 126.7496, accuracy: 5 };
const DEFAULT_MOCK_STEP = 0.0001; // ~11m

// ── Config ──
const MAX_ACCURACY_M = 25;
const MAX_SPEED_MS = 15;
const KALMAN_Q = 3;
const KALMAN_INIT_P = 100;
const GEO_TIMEOUT_MS = 5000; // if no GPS fix in 5s, switch to sim

interface KalmanAxis {
  x: number;
  p: number;
}

function kalmanUpdate(state: KalmanAxis, measurement: number, measurementNoise: number): KalmanAxis {
  const p = state.p + KALMAN_Q * KALMAN_Q;
  const k = p / (p + measurementNoise * measurementNoise);
  return {
    x: state.x + k * (measurement - state.x),
    p: (1 - k) * p,
  };
}

function degToMetres(dLat: number, dLng: number, refLat: number) {
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((refLat * Math.PI) / 180);
  return Math.sqrt((dLat * mPerDegLat) ** 2 + (dLng * mPerDegLng) ** 2);
}

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition>(DEFAULT_POSITION);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [mockStep, setMockStep] = useState(DEFAULT_MOCK_STEP);

  const kalmanLat = useRef<KalmanAxis | null>(null);
  const kalmanLng = useRef<KalmanAxis | null>(null);
  const lastTs = useRef<number>(0);
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);
  const gotFirstFix = useRef(false);

  useEffect(() => {
    if (useMock) {
      setIsSimulated(true);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported – using simulation');
      setUseMock(true);
      setIsSimulated(true);
      return;
    }

    setIsTracking(true);

    // Auto-fallback timer: if no GPS fix within timeout, switch to simulation
    const fallbackTimer = setTimeout(() => {
      if (!gotFirstFix.current) {
        console.log('[GPS] No fix within timeout, switching to simulation mode');
        setError('GPS unavailable – simulation mode active');
        setUseMock(true);
        setIsSimulated(true);
      }
    }, GEO_TIMEOUT_MS);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        gotFirstFix.current = true;
        clearTimeout(fallbackTimer);

        const { latitude: rawLat, longitude: rawLng, accuracy } = pos.coords;
        const now = pos.timestamp;

        if (accuracy > MAX_ACCURACY_M) return;

        if (lastPos.current && lastTs.current) {
          const dt = (now - lastTs.current) / 1000;
          if (dt > 0) {
            const dist = degToMetres(
              rawLat - lastPos.current.lat,
              rawLng - lastPos.current.lng,
              rawLat,
            );
            if (dist / dt > MAX_SPEED_MS) return;
          }
        }

        if (!kalmanLat.current) {
          kalmanLat.current = { x: rawLat, p: KALMAN_INIT_P };
          kalmanLng.current = { x: rawLng, p: KALMAN_INIT_P };
        }
        kalmanLat.current = kalmanUpdate(kalmanLat.current, rawLat, accuracy);
        kalmanLng.current = kalmanUpdate(kalmanLng.current!, rawLng, accuracy);

        lastPos.current = { lat: rawLat, lng: rawLng };
        lastTs.current = now;

        setPosition({ latitude: kalmanLat.current.x, longitude: kalmanLng.current.x, accuracy });
        setError(null);
        setIsSimulated(false);
      },
      (err) => {
        clearTimeout(fallbackTimer);
        setError(err.message + ' – simulation mode active');
        setUseMock(true);
        setIsSimulated(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );

    return () => {
      clearTimeout(fallbackTimer);
      navigator.geolocation.clearWatch(watchId);
      setIsTracking(false);
    };
  }, [useMock]);

  const mockMove = useCallback((direction: 'north' | 'south' | 'east' | 'west') => {
    if (!useMock) {
      setUseMock(true);
      setIsSimulated(true);
    }
    setPosition(prev => {
      switch (direction) {
        case 'north': return { ...prev, latitude: prev.latitude + mockStep };
        case 'south': return { ...prev, latitude: prev.latitude - mockStep };
        case 'east': return { ...prev, longitude: prev.longitude + mockStep };
        case 'west': return { ...prev, longitude: prev.longitude - mockStep };
      }
    });
  }, [useMock, mockStep]);

  const setMockPosition = useCallback((lat: number, lng: number) => {
    setUseMock(true);
    setIsSimulated(true);
    setPosition({ latitude: lat, longitude: lng, accuracy: 5 });
  }, []);

  return { position, error, isTracking, isSimulated, mockMove, setMockPosition, setMockStep };
}
