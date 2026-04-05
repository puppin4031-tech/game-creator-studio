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
  mockMove: (direction: 'north' | 'south' | 'east' | 'west') => void;
  setMockPosition: (lat: number, lng: number) => void;
}

const DEFAULT_POSITION: GeoPosition = { latitude: 37.5665, longitude: 126.9780, accuracy: null };
const MOCK_STEP = 0.0001;

// ── Config ──
const MAX_ACCURACY_M = 25;        // ignore fixes worse than 25m
const MAX_SPEED_MS = 15;          // ~54 km/h – reject teleports
const KALMAN_Q = 3;               // process noise (m)  – lower = smoother
const KALMAN_INIT_P = 100;        // initial uncertainty

// ── 1-D Kalman state per axis ──
interface KalmanAxis {
  x: number;   // estimate (degrees)
  p: number;   // uncertainty (m²)
}

function kalmanUpdate(state: KalmanAxis, measurement: number, measurementNoise: number): KalmanAxis {
  const p = state.p + KALMAN_Q * KALMAN_Q;          // predict
  const k = p / (p + measurementNoise * measurementNoise); // gain
  return {
    x: state.x + k * (measurement - state.x),
    p: (1 - k) * p,
  };
}

// metres per degree (rough, good enough for speed calc)
function degToMetres(dLat: number, dLng: number, refLat: number) {
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((refLat * Math.PI) / 180);
  return Math.sqrt((dLat * mPerDegLat) ** 2 + (dLng * mPerDegLng) ** 2);
}

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition>(DEFAULT_POSITION);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [useMock, setUseMock] = useState(false);

  const kalmanLat = useRef<KalmanAxis | null>(null);
  const kalmanLng = useRef<KalmanAxis | null>(null);
  const lastTs = useRef<number>(0);
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (useMock) return;

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setUseMock(true);
      return;
    }

    setIsTracking(true);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: rawLat, longitude: rawLng, accuracy } = pos.coords;
        const now = pos.timestamp;

        // 1️⃣ Accuracy gate
        if (accuracy > MAX_ACCURACY_M) return;

        // 2️⃣ Speed gate (reject teleports)
        if (lastPos.current && lastTs.current) {
          const dt = (now - lastTs.current) / 1000; // seconds
          if (dt > 0) {
            const dist = degToMetres(
              rawLat - lastPos.current.lat,
              rawLng - lastPos.current.lng,
              rawLat,
            );
            if (dist / dt > MAX_SPEED_MS) return; // impossibly fast
          }
        }

        // 3️⃣ Kalman filter
        if (!kalmanLat.current) {
          kalmanLat.current = { x: rawLat, p: KALMAN_INIT_P };
          kalmanLng.current = { x: rawLng, p: KALMAN_INIT_P };
        }
        kalmanLat.current = kalmanUpdate(kalmanLat.current, rawLat, accuracy);
        kalmanLng.current = kalmanUpdate(kalmanLng.current!, rawLng, accuracy);

        const smoothLat = kalmanLat.current.x;
        const smoothLng = kalmanLng.current.x;

        lastPos.current = { lat: rawLat, lng: rawLng };
        lastTs.current = now;

        setPosition({ latitude: smoothLat, longitude: smoothLng, accuracy });
        setError(null);
      },
      (err) => {
        setError(err.message);
        setUseMock(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsTracking(false);
    };
  }, [useMock]);

  const mockMove = useCallback((direction: 'north' | 'south' | 'east' | 'west') => {
    setUseMock(true);
    setPosition(prev => {
      switch (direction) {
        case 'north': return { ...prev, latitude: prev.latitude + MOCK_STEP };
        case 'south': return { ...prev, latitude: prev.latitude - MOCK_STEP };
        case 'east': return { ...prev, longitude: prev.longitude + MOCK_STEP };
        case 'west': return { ...prev, longitude: prev.longitude - MOCK_STEP };
      }
    });
  }, []);

  const setMockPosition = useCallback((lat: number, lng: number) => {
    setUseMock(true);
    setPosition({ latitude: lat, longitude: lng, accuracy: null });
  }, []);

  return { position, error, isTracking, mockMove, setMockPosition };
}
