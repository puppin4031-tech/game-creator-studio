import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { preloadSpriteSheet } from '@/components/survival/SpriteAnimator';

export const SPRITE_ACTIONS = ['idle', 'walk', 'gather', 'attack', 'talk'] as const;
export type SpriteAction = (typeof SPRITE_ACTIONS)[number];
export const SPRITE_ACTION_LABELS: Record<SpriteAction, string> = { idle: '대기', walk: '걷기', gather: '채집', attack: '공격', talk: '대화' };
export const SPRITE_BUCKET = 'survival-sprites';

export interface SpriteAnimation {
  id: string;
  character_key: string;
  action: SpriteAction;
  image_path: string;
  frame_count: number;
  fps: number;
  url: string;
}

export function useSpriteAnimations(characterKey = 'hunter') {
  return useQuery({
    queryKey: ['sprite-animations', characterKey],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Partial<Record<SpriteAction, SpriteAnimation>>> => {
      const { data, error } = await supabase.from('survival_sprite_animations').select('*').eq('character_key', characterKey);
      if (error) throw error;
      if (!data?.length) return {};
      const { data: signed, error: signErr } = await supabase.storage.from(SPRITE_BUCKET).createSignedUrls(data.map(d => d.image_path), 60 * 60 * 24);
      if (signErr) throw signErr;
      const out: Partial<Record<SpriteAction, SpriteAnimation>> = {};
      data.forEach((row, i) => {
        const url = signed?.[i]?.signedUrl;
        if (url) out[row.action as SpriteAction] = { ...(row as Omit<SpriteAnimation, 'url'>), action: row.action as SpriteAction, url };
      });
      // Warm every action sheet so switching idle/gather/attack never flashes empty.
      await Promise.all(Object.values(out).map(a => a && preloadSpriteSheet(a.url, a.frame_count)));
      return out;
    },
  });
}
