import { useState, useEffect, useCallback } from 'react';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface UseGeolocationReturn {
  position: GeoPosition | null;
  error: string | null;
  isTracking: boolean;
  mockMove: (direction: 'north' | 'south' | 'east' | 'west') => void;
  setMockPosition: (lat: number, lng: number) => void;
}

const MOCK_STEP = 0.0001; // ~11 meters

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    if (useMock) return;

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      // Fall back to mock position (Seoul)
      setPosition({ latitude: 37.5665, longitude: 126.9780, accuracy: null });
      setUseMock(true);
      return;
    }

    setIsTracking(true);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        setError(err.message);
        // Fall back to mock
        if (!position) {
          setPosition({ latitude: 37.5665, longitude: 126.9780, accuracy: null });
          setUseMock(true);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsTracking(false);
    };
  }, [useMock]);

  const mockMove = useCallback((direction: 'north' | 'south' | 'east' | 'west') => {
    setUseMock(true);
    setPosition(prev => {
      const base = prev || { latitude: 37.5665, longitude: 126.9780, accuracy: null };
      switch (direction) {
        case 'north': return { ...base, latitude: base.latitude + MOCK_STEP };
        case 'south': return { ...base, latitude: base.latitude - MOCK_STEP };
        case 'east': return { ...base, longitude: base.longitude + MOCK_STEP };
        case 'west': return { ...base, longitude: base.longitude - MOCK_STEP };
      }
    });
  }, []);

  const setMockPosition = useCallback((lat: number, lng: number) => {
    setUseMock(true);
    setPosition({ latitude: lat, longitude: lng, accuracy: null });
  }, []);

  return { position, error, isTracking, mockMove, setMockPosition };
}
