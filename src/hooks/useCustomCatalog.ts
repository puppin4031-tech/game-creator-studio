import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { petFromRow, registerCustomPets } from '@/lib/survival/dinoEggs';
import { registerCustomMobs } from '@/lib/survival/customMobs';

export const CUSTOM_CATALOG_KEY = ['survival-custom-catalog'];

/** Loads admin-made pets and mobs and registers them into the game rules. */
export function useCustomCatalog() {
  return useQuery({
    queryKey: CUSTOM_CATALOG_KEY,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [pets, mobs] = await Promise.all([
        supabase.from('survival_custom_pets').select('*').order('updated_at'),
        supabase.from('survival_custom_mobs').select('*').order('updated_at'),
      ]);
      if (pets.error) throw pets.error;
      if (mobs.error) throw mobs.error;
      registerCustomPets(pets.data.filter(p => p.is_active).map(petFromRow));
      registerCustomMobs(mobs.data);
      return { pets: pets.data, mobs: mobs.data };
    },
  });
}
