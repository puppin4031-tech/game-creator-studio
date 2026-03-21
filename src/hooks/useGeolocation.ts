import { useState, useEffect, useCallback } from 'react';

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

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition>(DEFAULT_POSITION);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [useMock, setUseMock] = useState(false);

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
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        setError(err.message);
        setUseMock(true);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
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
