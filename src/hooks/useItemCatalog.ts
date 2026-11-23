import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ITEMS, type ItemCategory, type Rarity } from '@/lib/survival/items';
import { SPRITE_BUCKET } from '@/hooks/useSpriteAnimations';

export interface CatalogItem {
  itemId: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: Rarity;
  weight: number;
  /** Bundled sprite key for built-in items. */
  spriteKey?: string;
  imagePath: string | null;
  imageUrl: string | null;
  isCustom: boolean;
  /** Row exists in the admin catalog (override or custom). */
  edited: boolean;
}

const bundled = import.meta.glob('../assets/survival/*.png', { eager: true, import: 'default' }) as Record<string, string>;
export const bundledSpriteUrl = (k?: string) => (k ? bundled[`../assets/survival/${k}.png`] ?? null : null);

/** Built-in items from code merged with admin overrides and admin-created items. New code items appear automatically. */
export function useItemCatalog() {
  return useQuery({
    queryKey: ['survival-item-catalog'],
    queryFn: async (): Promise<CatalogItem[]> => {
      const { data, error } = await supabase.from('survival_item_catalog').select('*');
      if (error) throw error;
      const rows = new Map((data ?? []).map((r) => [r.item_id, r]));
      const paths = (data ?? []).map((r) => r.image_path).filter((p): p is string => !!p);
      const signed = new Map<string, string>();
      if (paths.length) {
        const { data: s, error: e } = await supabase.storage.from(SPRITE_BUCKET).createSignedUrls(paths, 3600);
        if (e) throw e;
        s?.forEach((x) => { if (x.path && x.signedUrl) signed.set(x.path, x.signedUrl); });
      }
      const out: CatalogItem[] = Object.entries(ITEMS).map(([id, it]) => {
        const r = rows.get(id);
        let signedUrl = (r?.image_path && signed.get(r.image_path)) || null;
        if (signedUrl && r?.updated_at) {
          signedUrl = signedUrl.includes('?') ? `${signedUrl}&v=${new Date(r.updated_at).getTime()}` : `${signedUrl}?v=${new Date(r.updated_at).getTime()}`;
        }
        return {
          itemId: id, name: r?.name ?? it.name, description: r?.description ?? it.desc,
          category: (r?.category as ItemCategory) ?? it.category, rarity: (r?.rarity as Rarity) ?? it.rarity,
          weight: r?.weight ?? it.weight, spriteKey: it.sprite, imagePath: r?.image_path ?? null,
          imageUrl: signedUrl || bundledSpriteUrl(it.sprite), isCustom: false, edited: !!r,
        };
      });
      for (const r of data ?? []) {
        if (r.item_id in ITEMS) continue;
        let signedUrl = r.image_path ? signed.get(r.image_path) ?? null : null;
        if (signedUrl && r.updated_at) {
          signedUrl = signedUrl.includes('?') ? `${signedUrl}&v=${new Date(r.updated_at).getTime()}` : `${signedUrl}?v=${new Date(r.updated_at).getTime()}`;
        }
        out.push({ itemId: r.item_id, name: r.name, description: r.description, category: r.category as ItemCategory,
          rarity: r.rarity as Rarity, weight: r.weight, imagePath: r.image_path,
          imageUrl: signedUrl, isCustom: true, edited: true });
      }
      return out;
    },
  });
}
