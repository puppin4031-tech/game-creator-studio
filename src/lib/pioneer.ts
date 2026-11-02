export const PIONEER_NAME_KEY = 'colonion.pioneerName';

export const PIONEER_ERAS = [
  { id: 'stone', label: '구석기', available: true },
  { id: 'neolithic', label: '신석기', available: false },
  { id: 'bronze', label: '청동기', available: false },
  { id: 'modern', label: '현대문명', available: false },
] as const;

export function normalizePioneerName(name: string): string {
  return name.trim().slice(0, 16);
}