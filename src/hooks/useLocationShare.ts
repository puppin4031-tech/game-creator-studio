import { useEffect, useRef } from 'react';
import { useGeolocation } from './useGeolocation';

interface UseLocationShareOptions {
  playerId: string | null;
  updatePosition: (playerId: string, lat: number, lng: number) => Promise<void>;
  isActive: boolean;
  intervalMs?: number;
}

export function useLocationShare({ playerId, updatePosition, isActive, intervalMs = 5000 }: UseLocationShareOptions) {
  const { position, error, isSimulated, mockMove, setMockStep } = useGeolocation();
  const lastUpdate = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!playerId || !isActive) return;

    const interval = setInterval(() => {
      const { latitude, longitude } = position;
      if (
        !lastUpdate.current ||
        lastUpdate.current.lat !== latitude ||
        lastUpdate.current.lng !== longitude
      ) {
        lastUpdate.current = { lat: latitude, lng: longitude };
        updatePosition(playerId, latitude, longitude);
      }
    }, intervalMs);

    // Send immediately
    updatePosition(playerId, position.latitude, position.longitude);

    return () => clearInterval(interval);
  }, [playerId, isActive, position.latitude, position.longitude, intervalMs]);

  return { position, geoError: error, isSimulated, mockMove, setMockStep };
}
