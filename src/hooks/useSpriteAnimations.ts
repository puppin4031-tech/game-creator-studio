import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { preloadSpriteSheet } from '@/components/survival/SpriteAnimator';

/** 9 core actions for user character */
export const CHARACTER_ACTIONS = [
  'idle',        // 1. 기본
  'walk',        // 2. 걷기
  'attack',      // 3. 공격
  'chop',        // 4. 벌목·도끼질 (장작패기 / 나무 베기)
  'gather',      // 5. 채집·채광 (곡괭이 / 손 채집)
  'poop',        // 6. 똥싸기 (음식 섭취 2시간 후 대기 시 가끔)
  'pick_nose',   // 7. 코파기 (대기 시 20% 확률)
  'celebrate',   // 8. 신난다 (업적 달성, 우두머리 처치, 희귀 광석 채취)
  'hurt',        // 9. 피격 (공격받을 때)
] as const;

export type CharacterAction = (typeof CHARACTER_ACTIONS)[number];

export const SPRITE_ACTIONS = [
  ...CHARACTER_ACTIONS,
  'talk',
] as const;
export type SpriteAction = (typeof SPRITE_ACTIONS)[number];

export const SPRITE_ACTION_LABELS: Record<SpriteAction, string> = {
  idle: '1. 기본 (대기)',
  walk: '2. 걷기',
  attack: '3. 공격',
  chop: '4. 벌목 · 도끼질 (장작패기)',
  gather: '5. 채집 · 채광',
  poop: '6. 똥싸기 (음식 섭취 2시간 후 대기 시 가끔)',
  pick_nose: '7. 코파기 (대기 시 20% 확률)',
  celebrate: '8. 신난다 (달성·우두머리·희귀 광석)',
  hurt: '9. 피격 (공격받을 때)',
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

// Memory Cache to provide instant zero-delay render
const MEMORY_CACHE = new Map<string, SpriteAnimationsData>();

function getLocalCachedAnimations(characterKey: string): SpriteAnimationsData | undefined {
  if (MEMORY_CACHE.has(characterKey)) return MEMORY_CACHE.get(characterKey);
  try {
    const raw = localStorage.getItem(`survival_anim_cache_${characterKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        MEMORY_CACHE.set(characterKey, parsed);
        return parsed;
      }
    }
  } catch {}
  return undefined;
}

function setLocalCachedAnimations(characterKey: string, data: SpriteAnimationsData) {
  MEMORY_CACHE.set(characterKey, data);
  try {
    localStorage.setItem(`survival_anim_cache_${characterKey}`, JSON.stringify(data));
  } catch {}
}

export function useSpriteAnimations(characterKey = 'hunter') {
  return useQuery({
    queryKey: ['sprite-animations', characterKey],
    staleTime: 10 * 60 * 1000, // 10 minutes cache to avoid redundant flashing / fetching
    refetchOnWindowFocus: false, // Prevent flickering when switching mobile apps or tabs
    initialData: () => getLocalCachedAnimations(characterKey),
    queryFn: async (): Promise<SpriteAnimationsData> => {
      let cachedScale = 1.0;
      try {
        const raw = localStorage.getItem(`survival_scale_${characterKey}`);
        if (raw) cachedScale = parseFloat(raw) || 1.0;
      } catch {}

      try {
        const { data, error } = await supabase
          .from('survival_sprite_animations')
          .select('*')
          .eq('character_key', characterKey);

        if (error || !data?.length) {
          const fallbackData = getLocalCachedAnimations(characterKey) ?? { _scale: cachedScale, scale: cachedScale };
          return fallbackData;
        }

        // Check scale configuration row
        const scaleRow = data.find(d => d.action === 'scale');
        const scale = scaleRow?.fps ? scaleRow.fps / 100 : cachedScale;
        try {
          localStorage.setItem(`survival_scale_${characterKey}`, String(scale));
        } catch {}

        const animRows = data.filter(d => d.action !== 'scale');
        if (!animRows.length) {
          const out = { _scale: scale, scale };
          setLocalCachedAnimations(characterKey, out);
          return out;
        }

        // Attempt signed URLs with fallback to public URLs (crucial for mobile guests & public buckets)
        let signedMap = new Map<string, string>();
        try {
          const { data: signed } = await supabase.storage
            .from(SPRITE_BUCKET)
            .createSignedUrls(animRows.map(d => d.image_path), 60 * 60 * 24);
          if (signed) {
            signed.forEach((s, idx) => {
              if (s?.signedUrl) signedMap.set(animRows[idx].image_path, s.signedUrl);
            });
          }
        } catch {
          // Ignore signed URL error and fall back to public URLs
        }

        const out: SpriteAnimationsData = { _scale: scale, scale };
        animRows.forEach(row => {
          let url = signedMap.get(row.image_path);
          if (!url) {
            const { data: pub } = supabase.storage.from(SPRITE_BUCKET).getPublicUrl(row.image_path);
            url = pub?.publicUrl;
          }
          if (url) {
            out[row.action as SpriteAction] = {
              ...(row as Omit<SpriteAnimation, 'url'>),
              action: row.action as SpriteAction,
              url,
            };
          }
        });

        // Warm every action sheet so switching actions never flashes empty
        await Promise.all(
          Object.entries(out).map(([k, a]) => {
            if (k !== '_scale' && k !== 'scale' && a && typeof a === 'object' && 'url' in a) {
              return preloadSpriteSheet((a as SpriteAnimation).url, (a as SpriteAnimation).frame_count);
            }
            return Promise.resolve();
          })
        );
        setLocalCachedAnimations(characterKey, out);
        return out;
      } catch (err) {
        console.warn(`[useSpriteAnimations] failed to load for ${characterKey}:`, err);
        return getLocalCachedAnimations(characterKey) ?? { _scale: cachedScale, scale: cachedScale };
      }
    },
  });
}

/** Preload all core player & tribe sprites in parallel at boot */
export function preloadCoreSprites() {
  const coreKeys = ['hunter', 'tribe:gatherer', 'tribe:tank', 'tribe:assassin', 'tribe'];
  coreKeys.forEach(async key => {
    try {
      const cached = getLocalCachedAnimations(key);
      if (cached) {
        Object.values(cached).forEach(v => {
          if (v && typeof v === 'object' && 'url' in v && 'frame_count' in v) {
            preloadSpriteSheet((v as SpriteAnimation).url, (v as SpriteAnimation).frame_count);
          }
        });
      }
    } catch {}
  });
}
