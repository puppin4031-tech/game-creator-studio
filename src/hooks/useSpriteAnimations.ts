import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { preloadSpriteSheet } from '@/components/survival/SpriteAnimator';
import { enterGuestSession } from '@/lib/guestEntry';

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
const CACHE_KEY_PREFIX = 'survival_anim_signed_v2_';
const LEGACY_CACHE_PREFIX = 'survival_anim_cache_';
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours max cache age (signed URLs are valid for 24h)

function hasValidSignedUrls(data: SpriteAnimationsData): boolean {
  let hasAnySheet = false;
  for (const [k, val] of Object.entries(data)) {
    if (k === '_scale' || k === 'scale') continue;
    if (val && typeof val === 'object' && 'url' in val) {
      hasAnySheet = true;
      const u = String((val as SpriteAnimation).url || '');
      // Private bucket URLs must be signed (/object/sign/); reject stale /object/public/ cache entries
      if (!u || u.includes('/object/public/')) return false;
    }
  }
  return hasAnySheet;
}

function getLocalCachedAnimations(characterKey: string): SpriteAnimationsData | undefined {
  if (MEMORY_CACHE.has(characterKey)) return MEMORY_CACHE.get(characterKey);
  try {
    // Purge legacy broken cache key if present
    localStorage.removeItem(`${LEGACY_CACHE_PREFIX}${characterKey}`);
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${characterKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (!parsed._cachedAt || Date.now() - parsed._cachedAt > CACHE_MAX_AGE_MS) {
          localStorage.removeItem(`${CACHE_KEY_PREFIX}${characterKey}`);
          return undefined;
        }
        const cleanData = (parsed.data ?? parsed) as SpriteAnimationsData;
        if (!hasValidSignedUrls(cleanData)) {
          localStorage.removeItem(`${CACHE_KEY_PREFIX}${characterKey}`);
          return undefined;
        }
        MEMORY_CACHE.set(characterKey, cleanData);
        return cleanData;
      }
    }
  } catch {}
  return undefined;
}

function setLocalCachedAnimations(characterKey: string, data: SpriteAnimationsData) {
  if (!hasValidSignedUrls(data)) return;
  MEMORY_CACHE.set(characterKey, data);
  try {
    const envelope = {
      _cachedAt: Date.now(),
      data,
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${characterKey}`, JSON.stringify(envelope));
  } catch {}
}

async function fetchSpriteAnimationsForKey(characterKey: string): Promise<SpriteAnimationsData> {
  let cachedScale = 1.0;
  try {
    const raw = localStorage.getItem(`survival_scale_${characterKey}`);
    if (raw) cachedScale = parseFloat(raw) || 1.0;
  } catch {}

  try {
    // Ensure auth session (user or anonymous guest) exists so private storage bucket can issue signed URLs
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      try {
        await enterGuestSession();
      } catch {}
    }

    const { data, error } = await supabase
      .from('survival_sprite_animations')
      .select('*')
      .eq('character_key', characterKey);

    if (error || !data?.length) {
      return getLocalCachedAnimations(characterKey) ?? { _scale: cachedScale, scale: cachedScale };
    }

    // Check scale configuration row
    const scaleRow = data.find(d => d.action === 'scale');
    const scale = scaleRow?.fps ? scaleRow.fps / 100 : cachedScale;
    try {
      localStorage.setItem(`survival_scale_${characterKey}`, String(scale));
    } catch {}

    const animRows = data.filter(d => d.action !== 'scale');
    if (!animRows.length) {
      return { _scale: scale, scale };
    }

    // Generate 24-hour signed URLs from private survival-sprites bucket
    const signedMap = new Map<string, string>();
    try {
      const { data: signed } = await supabase.storage
        .from(SPRITE_BUCKET)
        .createSignedUrls(animRows.map(d => d.image_path), 60 * 60 * 24);
      if (signed) {
        signed.forEach((s, idx) => {
          const path = s?.path ?? animRows[idx]?.image_path;
          if (path && s?.signedUrl) signedMap.set(path, s.signedUrl);
        });
      }
    } catch {
      // Fall back if signed URL request threw
    }

    // Prioritize signed URLs from the admin panel's private storage bucket
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

    if (signedMap.size > 0) {
      setLocalCachedAnimations(characterKey, out);
    }

    // Warm every action sheet asynchronously in the background without blocking query resolution
    void Promise.all(
      Object.entries(out).map(([k, a]) => {
        if (k !== '_scale' && k !== 'scale' && a && typeof a === 'object' && 'url' in a) {
          return preloadSpriteSheet((a as SpriteAnimation).url, (a as SpriteAnimation).frame_count);
        }
        return Promise.resolve();
      })
    );

    return out;
  } catch (err) {
    console.warn(`[useSpriteAnimations] failed to load for ${characterKey}:`, err);
    return getLocalCachedAnimations(characterKey) ?? { _scale: cachedScale, scale: cachedScale };
  }
}

export function useSpriteAnimations(characterKey = 'hunter') {
  return useQuery({
    queryKey: ['sprite-animations', characterKey],
    staleTime: 60 * 1000, // 1 minute freshness so admin panel updates reflect quickly
    refetchOnWindowFocus: false,
    initialData: () => getLocalCachedAnimations(characterKey),
    queryFn: () => fetchSpriteAnimationsForKey(characterKey),
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
            void preloadSpriteSheet((v as SpriteAnimation).url, (v as SpriteAnimation).frame_count);
          }
        });
      } else {
        await fetchSpriteAnimationsForKey(key);
      }
    } catch {}
  });
}
