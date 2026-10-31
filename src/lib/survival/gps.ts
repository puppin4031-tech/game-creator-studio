import { distanceM } from './geo';
import type { LatLng } from './types';

export interface GpsFix extends LatLng { accuracy: number; timestamp: number }
export const GPS_MAX_ACCURACY_M = 25;
export const GPS_MAX_SPEED_MPS = 15;
export const GPS_STALE_MS = 15000;

export function acceptGpsFix(fix: GpsFix, previous: GpsFix | null): boolean {
  if (![fix.lat, fix.lng, fix.accuracy, fix.timestamp].every(Number.isFinite) || Math.abs(fix.lat) > 90 || Math.abs(fix.lng) > 180 || fix.accuracy < 0 || fix.accuracy > GPS_MAX_ACCURACY_M) return false;
  if (!previous) return true;
  const seconds = (fix.timestamp - previous.timestamp) / 1000;
  return seconds > 0 && distanceM(previous, fix) / seconds <= GPS_MAX_SPEED_MPS;
}

/** Filter in metre space: degrees cannot share the GPS accuracy covariance. */
export function smoothGpsFix(fix: GpsFix, previous: GpsFix | null, variance = 100): { fix: GpsFix; variance: number } {
  if (!previous) return { fix, variance: Math.max(1, fix.accuracy ** 2) };
  const predictedVariance = variance + 9;
  const gain = predictedVariance / (predictedVariance + Math.max(1, fix.accuracy ** 2));
  return { fix: { ...fix, lat: previous.lat + gain * (fix.lat - previous.lat), lng: previous.lng + gain * (fix.lng - previous.lng) }, variance: (1 - gain) * predictedVariance };
}