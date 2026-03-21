import { useMemo } from 'react';
import { haversineDistance } from '@/lib/haversine';
import type { Tables } from '@/integrations/supabase/types';

const DETECTION_RADIUS = 10; // meters

export interface DetectedSpot {
  spot: Tables<'spots'>;
  distance: number;
  isInRange: boolean;
}

export function useSpotDetection(
  spots: Tables<'spots'>[] | undefined,
  userLat: number | null,
  userLng: number | null,
  currentFloor: number
): DetectedSpot[] {
  return useMemo(() => {
    if (!spots || userLat === null || userLng === null) return [];

    return spots
      .filter(s => s.is_active && s.floor === currentFloor)
      .map(spot => {
        const distance = haversineDistance(userLat, userLng, spot.latitude, spot.longitude);
        return {
          spot,
          distance,
          isInRange: distance <= DETECTION_RADIUS,
        };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [spots, userLat, userLng, currentFloor]);
}
