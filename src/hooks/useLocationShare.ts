import { useEffect, useRef } from 'react';
import { useGeolocation } from './useGeolocation';
import { haversineDistance } from '@/lib/haversine';

interface UseLocationShareOptions {
  playerId: string | null;
  updatePosition: (playerId: string, lat: number, lng: number) => Promise<void>;
  isActive: boolean;
  /** Min distance (meters) before sending an update on movement. Default 2m. */
  moveThresholdM?: number;
  /** Heartbeat interval (ms) — re-send even if not moving. Default 5000ms. */
  heartbeatMs?: number;
  /** Fast-sync window after activation (ms). Default 5000ms. */
  fastSyncMs?: number;
  /** Fast-sync interval during the window (ms). Default 1000ms. */
  fastSyncIntervalMs?: number;
}

/**
 * Smart location sharing:
 *  - Sends immediately when user moves > moveThresholdM (default 2m)
 *  - Sends a heartbeat every heartbeatMs (default 5s) so others know we're alive
 *  - During the first fastSyncMs after activation (default 5s), forces sync every
 *    fastSyncIntervalMs (default 1s) so all players see accurate positions ASAP
 */
export function useLocationShare({
  playerId,
  updatePosition,
  isActive,
  moveThresholdM = 2,
  heartbeatMs = 5000,
  fastSyncMs = 5000,
  fastSyncIntervalMs = 1000,
}: UseLocationShareOptions) {
  const { position, error, isSimulated, mockMove, setMockStep } = useGeolocation();

  const lastSentAt = useRef<number>(0);
  const lastSentPos = useRef<{ lat: number; lng: number } | null>(null);
  const activatedAt = useRef<number | null>(null);

  // Track activation timestamp
  useEffect(() => {
    if (isActive && playerId) {
      activatedAt.current = Date.now();
      lastSentAt.current = 0;
      lastSentPos.current = null;
    } else {
      activatedAt.current = null;
    }
  }, [isActive, playerId]);

  // Movement-triggered send (immediate when GPS updates)
  useEffect(() => {
    if (!playerId || !isActive) return;
    const { latitude, longitude } = position;
    if (latitude === 0 && longitude === 0) return;

    const now = Date.now();
    const moved = lastSentPos.current
      ? haversineDistance(lastSentPos.current.lat, lastSentPos.current.lng, latitude, longitude)
      : Infinity;

    if (moved >= moveThresholdM) {
      lastSentPos.current = { lat: latitude, lng: longitude };
      lastSentAt.current = now;
      updatePosition(playerId, latitude, longitude);
    }
  }, [playerId, isActive, position.latitude, position.longitude, moveThresholdM]);

  // Heartbeat + fast-sync interval
  useEffect(() => {
    if (!playerId || !isActive) return;

    // Send once immediately on activation
    const { latitude, longitude } = position;
    if (latitude !== 0 || longitude !== 0) {
      lastSentPos.current = { lat: latitude, lng: longitude };
      lastSentAt.current = Date.now();
      updatePosition(playerId, latitude, longitude);
    }

    const interval = setInterval(() => {
      const { latitude: lat, longitude: lng } = position;
      if (lat === 0 && lng === 0) return;

      const now = Date.now();
      const sinceStart = activatedAt.current ? now - activatedAt.current : Infinity;
      const sinceLast = now - lastSentAt.current;

      const inFastSync = sinceStart < fastSyncMs;
      const threshold = inFastSync ? fastSyncIntervalMs : heartbeatMs;

      if (sinceLast >= threshold) {
        lastSentPos.current = { lat, lng };
        lastSentAt.current = now;
        updatePosition(playerId, lat, lng);
      }
    }, 1000);

    return () => clearInterval(interval);
    // We intentionally exclude position so the interval isn't recreated each GPS tick.
    // The interval reads `position` via closure on each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, isActive]);

  return { position, geoError: error, isSimulated, mockMove, setMockStep };
}
