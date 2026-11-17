import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { preloadSpriteSheet } from '@/components/survival/SpriteAnimator';

/** 8 core actions for user character */
export const CHARACTER_ACTIONS = [
  'idle',        // 1. 기본
  'walk',        // 2. 걷기
  'attack',      // 3. 공격
  'gather',      // 4. 채집
  'poop',        // 5. 똥싸기 (음식 섭취 2시간 후 대기 시 가끔)
  'pick_nose',   // 6. 코파기 (대기 시 20% 확률)
  'celebrate',   // 7. 신난다 (업적 달성, 우두머리 처치, 희귀 광석 채취)
  'hurt',        // 8. 피격 (공격받을 때)
] as const;

export type CharacterAction = (typeof CHARACTER_ACTIONS)[number];

export const SPRITE_ACTIONS = [
  ...CHARACTER_ACTIONS,
  'chop',
  'talk',
] as const;
export type SpriteAction = (typeof SPRITE_ACTIONS)[number];

export const SPRITE_ACTION_LABELS: Record<SpriteAction, string> = {
  idle: '1. 기본 (대기)',
  walk: '2. 걷기',
  attack: '3. 공격',
  gather: '4. 채집',
  poop: '5. 똥싸기 (음식 섭취 2시간 후 대기 시 가끔)',
  pick_nose: '6. 코파기 (대기 시 20% 확률)',
  celebrate: '7. 신난다 (달성·우두머리·희귀 광석)',
  hurt: '8. 피격 (공격받을 때)',
  chop: '찍기',
  talk: '대화',
};

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

export type SpriteAnimationsData = Partial<Record<SpriteAction, SpriteAnimation>> & {
  _scale?: number;
  scale?: number;
};

export function useSpriteAnimations(characterKey = 'hunter') {
  return useQuery({
    queryKey: ['sprite-animations', characterKey],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SpriteAnimationsData> => {
      let cachedScale = 1.0;
      try {
        const raw = localStorage.getItem(`survival_scale_${characterKey}`);
        if (raw) cachedScale = parseFloat(raw) || 1.0;
      } catch {}

      const { data, error } = await supabase
        .from('survival_sprite_animations')
        .select('*')
        .eq('character_key', characterKey);

      if (error) throw error;
      if (!data?.length) return { _scale: cachedScale, scale: cachedScale };

      // Check scale configuration row
      const scaleRow = data.find(d => d.action === 'scale');
      const scale = scaleRow?.fps ? scaleRow.fps / 100 : cachedScale;
      try {
        localStorage.setItem(`survival_scale_${characterKey}`, String(scale));
      } catch {}

      const animRows = data.filter(d => d.action !== 'scale');
      if (!animRows.length) return { _scale: scale, scale };

      const { data: signed, error: signErr } = await supabase.storage
        .from(SPRITE_BUCKET)
        .createSignedUrls(animRows.map(d => d.image_path), 60 * 60 * 24);
      if (signErr) throw signErr;

      const out: SpriteAnimationsData = { _scale: scale, scale };
      animRows.forEach((row, i) => {
        const url = signed?.[i]?.signedUrl;
        if (url) {
          out[row.action as SpriteAction] = {
            ...(row as Omit<SpriteAnimation, 'url'>),
            action: row.action as SpriteAction,
            url,
          };
        }
      });

      // Warm every action sheet so switching actions never flashes empty.
      await Promise.all(
        Object.entries(out).map(([k, a]) => {
          if (k !== '_scale' && k !== 'scale' && a && typeof a === 'object' && 'url' in a) {
            return preloadSpriteSheet((a as SpriteAnimation).url, (a as SpriteAnimation).frame_count);
          }
          return Promise.resolve();
        })
      );
      return out;
    },
  });
}
