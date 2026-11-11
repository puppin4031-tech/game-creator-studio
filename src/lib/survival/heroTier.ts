/** Hero appearance tiers by player level; Lv.1-4 keeps the original look. */
export const HERO_TIERS = [
  { minLevel: 8, key: 'hunter:lv8', label: '플레이어 Lv.8+' },
  { minLevel: 5, key: 'hunter:lv5', label: '플레이어 Lv.5~7' },
  { minLevel: 1, key: 'hunter', label: '플레이어 Lv.1~4' },
] as const;

export function heroSpriteKey(level = 1): string {
  return (HERO_TIERS.find(t => level >= t.minLevel) ?? HERO_TIERS[2]).key;
}
