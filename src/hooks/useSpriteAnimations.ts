import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { preloadSpriteSheet } from '@/components/survival/SpriteAnimator';
import { enterGuestSession } from '@/lib/guestEntry';
import {
  loadAllSpritesForCharacterFromLocalDb,
  loadAllSpritesFromLocalDb,
} from '@/utils/spriteStorage';

/** Core actions for user character */
export const CHARACTER_ACTIONS = [
  'idle',        // 1. 기본
  'walk',        // 2. 걷기
  'attack',      // 3. 공격
  'chop',        // 4. 벌목·도끼질 (장작패기 / 나무 베기)
  'gather',      // 5. 채집·채광 (곡괭이 / 손 채집)
  'talk',        // 6. 대화
  'poop',        // 7. 똥싸기 (음식 섭취 후 대기 시 가끔)
  'pick_nose',   // 8. 코딱지파기 (대기 시 20% 확률)
  'celebrate',   // 9. 신난다 (업적 달성, 우두머리 처치, 희귀 광석 채취)
  'hurt',        // 10. 피격 (공격받을 때)
] as const;

export type CharacterAction = (typeof CHARACTER_ACTIONS)[number];

export const SPRITE_ACTIONS = [
  ...CHARACTER_ACTIONS,
  'nose_pick',   // Alias for pick_nose
  'scale',
] as const;
export type SpriteAction = (typeof SPRITE_ACTIONS)[number];

export const SPRITE_ACTION_LABELS: Record<SpriteAction, string> = {
  idle: '1. 기본 (대기)',
  walk: '2. 걷기',
  attack: '3. 공격',
  chop: '4. 벌목 · 도끼질 (장작패기)',
  gather: '5. 채집 · 채광',
  talk: '6. 대화',
  poop: '7. 똥싸기 (음식 섭취 후 대기 시)',
  pick_nose: '8. 코딱지파기 (대기 시 20% 확률)',
  nose_pick: '8. 코딱지파기 (대기 시 20% 확률)',
  celebrate: '9. 신난다 (달성·우두머리·희귀 광석)',
  hurt: '10. 피격 (공격받을 때)',
  scale: '크기 비율 (스케일)',
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
  updated_at?: string;
  /** True persistence source so /admin/sprites can show accurate DB vs Local status badges */
  source?: 'db' | 'local';
}

export type SpriteAnimationsData = Partial<Record<Exclude<SpriteAction, 'scale'>, SpriteAnimation>> & {
  _scale?: number;
  scale?: number;
};

// Memory Cache to provide instant zero-delay render across all entities
const MEMORY_CACHE = new Map<string, SpriteAnimationsData>();
const CACHE_KEY_PREFIX = 'survival_anim_signed_v3_';
const LEGACY_CACHE_PREFIXES = ['survival_anim_cache_', 'survival_anim_signed_v2_'];
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours max cache age (signed URLs are valid for 24h)

function hasValidUrls(data: SpriteAnimationsData): boolean {
  let hasAnySheet = false;
  for (const [k, val] of Object.entries(data)) {
    if (k === '_scale' || k === 'scale') continue;
    if (val && typeof val === 'object' && 'url' in val) {
      const anim = val as SpriteAnimation;
      const u = String(anim.url || '');
      if (!u) return false;
      // Ephemeral blob: URLs do not survive full page reloads in localStorage
      if (u.startsWith('blob:')) continue;
      hasAnySheet = true;
    }
  }
  return hasAnySheet;
}

function getLocalCachedAnimations(characterKey: string): SpriteAnimationsData | undefined {
  if (MEMORY_CACHE.has(characterKey)) return MEMORY_CACHE.get(characterKey);
  try {
    for (const prefix of LEGACY_CACHE_PREFIXES) {
      localStorage.removeItem(`${prefix}${characterKey}`);
    }
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${characterKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (!parsed._cachedAt || Date.now() - parsed._cachedAt > CACHE_MAX_AGE_MS) {
          localStorage.removeItem(`${CACHE_KEY_PREFIX}${characterKey}`);
          return undefined;
        }
        const cleanData = (parsed.data ?? parsed) as SpriteAnimationsData;
        if (!hasValidUrls(cleanData)) {
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
  MEMORY_CACHE.set(characterKey, data);
  try {
    // Strip ephemeral blob: URLs before writing to localStorage (IndexedDB re-hydrates those on boot)
    const persistable: SpriteAnimationsData = {
      _scale: data._scale,
      scale: data.scale,
    };
    let hasPersistable = false;
    for (const [k, val] of Object.entries(data)) {
      if (k === '_scale' || k === 'scale') continue;
      if (val && typeof val === 'object' && 'url' in val) {
        const anim = val as SpriteAnimation;
        if (anim.url && !anim.url.startsWith('blob:')) {
          persistable[k as Exclude<SpriteAction, 'scale'>] = anim;
          hasPersistable = true;
        }
      }
    }
    if (hasPersistable) {
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}${characterKey}`,
        JSON.stringify({ _cachedAt: Date.now(), data: persistable })
      );
    }
  } catch {}
}

const INFLIGHT_SPRITE_FETCH = new Map<string, Promise<SpriteAnimationsData>>();
let guestSessionPromise: Promise<unknown> | null = null;
let batchBootPreloadPromise: Promise<void> | null = null;

async function ensureSupabaseSession(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    try {
      if (!guestSessionPromise) {
        guestSessionPromise = enterGuestSession().finally(() => {
          guestSessionPromise = null;
        });
      }
      await guestSessionPromise;
    } catch {}
  }
}

/**
 * Generates a working signed URL (or public URL fallback) with a cache-buster `?v=` parameter
 * for a given storage path in `SPRITE_BUCKET`.
 */
export async function resolveStorageSpriteUrl(
  imagePath: string,
  cacheBustTs: number = Date.now()
): Promise<string> {
  let rawUrl = '';
  try {
    const { data: signed } = await supabase.storage
      .from(SPRITE_BUCKET)
      .createSignedUrl(imagePath, 60 * 60 * 24);
    if (signed?.signedUrl) {
      rawUrl = signed.signedUrl;
    }
  } catch {}

  if (!rawUrl) {
    const { data: pub } = supabase.storage.from(SPRITE_BUCKET).getPublicUrl(imagePath);
    rawUrl = pub?.publicUrl || '';
  }
  if (!rawUrl) return '';
  return rawUrl.includes('?') ? `${rawUrl}&v=${cacheBustTs}` : `${rawUrl}?v=${cacheBustTs}`;
}

async function fetchSpriteAnimationsForKey(characterKey: string): Promise<SpriteAnimationsData> {
  if (!characterKey || characterKey === 'none') {
    return { _scale: 1, scale: 1 };
  }

  const inflight = INFLIGHT_SPRITE_FETCH.get(characterKey);
  if (inflight) return inflight;

  const task = (async (): Promise<SpriteAnimationsData> => {
    let cachedScale = 1.0;
    try {
      const raw = localStorage.getItem(`survival_scale_${characterKey}`);
      if (raw) cachedScale = parseFloat(raw) || 1.0;
    } catch {}

    try {
      await ensureSupabaseSession();

      const { data, error } = await supabase
        .from('survival_sprite_animations')
        .select('*')
        .eq('character_key', characterKey);

      const scaleRow = data?.find(d => d.action === 'scale');
      const scale = scaleRow?.fps ? scaleRow.fps / 100 : cachedScale;
      try {
        localStorage.setItem(`survival_scale_${characterKey}`, String(scale));
      } catch {}

      const out: SpriteAnimationsData = { _scale: scale, scale };
      const animRows = (data ?? []).filter(d => d.action !== 'scale');

      if (!error && animRows.length > 0) {
        const signedMap = new Map<string, string>();
        try {
          const { data: signed } = await supabase.storage
            .from(SPRITE_BUCKET)
            .createSignedUrls(
              animRows.map(d => d.image_path),
              60 * 60 * 24
            );
          if (signed) {
            signed.forEach((s, idx) => {
              const path = s?.path ?? animRows[idx]?.image_path;
              if (path && s?.signedUrl) signedMap.set(path, s.signedUrl);
            });
          }
        } catch {}

        const nowTs = Date.now();
        animRows.forEach(row => {
          let rawUrl = signedMap.get(row.image_path);
          if (!rawUrl) {
            const { data: pub } = supabase.storage.from(SPRITE_BUCKET).getPublicUrl(row.image_path);
            rawUrl = pub?.publicUrl;
          }
          if (rawUrl) {
            const cacheBustTime = row.updated_at ? new Date(row.updated_at).getTime() : nowTs;
            const url = rawUrl.includes('?') ? `${rawUrl}&v=${cacheBustTime}` : `${rawUrl}?v=${cacheBustTime}`;
            const item: SpriteAnimation = {
              ...(row as Omit<SpriteAnimation, 'url'>),
              action: row.action as SpriteAction,
              url,
              source: 'db',
            };
            out[row.action as Exclude<SpriteAction, 'scale'>] = item;
            if (row.action === 'pick_nose') {
              out['nose_pick'] = { ...item, action: 'nose_pick' as SpriteAction };
            } else if (row.action === 'nose_pick') {
              out['pick_nose'] = { ...item, action: 'pick_nose' as SpriteAction };
            }
          }
        });
      }

      // Merge any locally saved sprites from IndexedDB ONLY if no DB entry exists or local is strictly newer
      try {
        const localSprites = await loadAllSpritesForCharacterFromLocalDb(characterKey);
        for (const loc of localSprites) {
          if (loc.action === 'scale') continue;
          const actionKey = loc.action as Exclude<SpriteAction, 'scale'>;
          const existingDb = out[actionKey];
          const dbTime = existingDb?.updated_at ? new Date(existingDb.updated_at).getTime() : 0;

          if (!existingDb) {
            const localUrl = URL.createObjectURL(loc.blob);
            const localItem: SpriteAnimation = {
              id: `local-${characterKey}-${loc.action}`,
              character_key: characterKey,
              action: actionKey,
              image_path: `local://${characterKey}/${loc.action}`,
              frame_count: loc.frameCount,
              fps: loc.fps,
              url: localUrl,
              updated_at: new Date(loc.updatedAt).toISOString(),
              source: 'local',
            };
            out[actionKey] = localItem;
            if (actionKey === 'pick_nose') {
              out['nose_pick'] = { ...localItem, action: 'nose_pick' as SpriteAction };
            } else if (actionKey === 'nose_pick') {
              out['pick_nose'] = { ...localItem, action: 'pick_nose' as SpriteAction };
            }
          } else if (dbTime > 0) {
            // DB entry exists — keep `source: 'db'` authoritative
            out[actionKey] = { ...existingDb, source: 'db' };
          }
        }
      } catch (localErr) {
        console.warn('[useSpriteAnimations] Local IndexedDB merge warning:', localErr);
      }

      setLocalCachedAnimations(characterKey, out);

      // Warm every action sheet asynchronously in the background
      void Promise.all(
        Object.entries(out).map(([k, a]) => {
          if (k !== '_scale' && k !== 'scale' && a && typeof a === 'object' && 'url' in a) {
            return preloadSpriteSheet((a as SpriteAnimation).url).catch(() => {});
          }
          return Promise.resolve();
        })
      );

      return out;
    } catch (err) {
      console.warn(`[useSpriteAnimations] failed to load for ${characterKey}:`, err);
      const fallback = getLocalCachedAnimations(characterKey) ?? { _scale: cachedScale, scale: cachedScale };
      MEMORY_CACHE.set(characterKey, fallback);
      return fallback;
    }
  })().finally(() => {
    INFLIGHT_SPRITE_FETCH.delete(characterKey);
  });

  INFLIGHT_SPRITE_FETCH.set(characterKey, task);
  return task;
}

/** Clear in-memory and local cache for immediate UI refresh */
export function clearAnimationCache(characterKey?: string) {
  if (characterKey) {
    MEMORY_CACHE.delete(characterKey);
    try {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${characterKey}`);
    } catch {}
  } else {
    MEMORY_CACHE.clear();
  }
}

/** Directly update cache with new sheet for instant zero-latency preview */
export function updateLocalAnimationCache(
  characterKey: string,
  action: SpriteAction,
  anim: SpriteAnimation
) {
  if (action === 'scale') return;
  const current = { ...(MEMORY_CACHE.get(characterKey) ?? { _scale: 1, scale: 1 }) };
  current[action] = anim;
  if (action === 'pick_nose') current['nose_pick'] = { ...anim, action: 'nose_pick' as SpriteAction };
  if (action === 'nose_pick') current['pick_nose'] = { ...anim, action: 'pick_nose' as SpriteAction };
  setLocalCachedAnimations(characterKey, current);
}

export function useSpriteAnimations(characterKey = 'hunter') {
  return useQuery({
    queryKey: ['sprite-animations', characterKey],
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialData: () => getLocalCachedAnimations(characterKey),
    queryFn: () => fetchSpriteAnimationsForKey(characterKey),
  });
}

/**
 * Batch-fetches ALL saved custom sprites from `survival_sprite_animations` in 1 single query at boot,
 * signs all storage paths in 1 batch call, merges any local IndexedDB sprites, and populates `MEMORY_CACHE`.
 * This guarantees every mob, boss (`우두머리`), pet, tribe member, node, prop, and building immediately renders
 * its custom sprite on game start without falling back to `mobSpriteFactory`.
 */
export function preloadCoreSprites(): Promise<void> {
  if (batchBootPreloadPromise) return batchBootPreloadPromise;

  batchBootPreloadPromise = (async () => {
    try {
      await ensureSupabaseSession();

      const [{ data: allRows, error }, localRecords] = await Promise.all([
        supabase.from('survival_sprite_animations').select('*'),
        loadAllSpritesFromLocalDb().catch(() => []),
      ]);

      const byChar = new Map<string, SpriteAnimationsData>();

      if (!error && allRows && allRows.length > 0) {
        const animRows = allRows.filter(r => r.action !== 'scale' && r.image_path);
        const signedMap = new Map<string, string>();

        if (animRows.length > 0) {
          try {
            const paths = Array.from(new Set(animRows.map(r => r.image_path)));
            const { data: signed } = await supabase.storage
              .from(SPRITE_BUCKET)
              .createSignedUrls(paths, 60 * 60 * 24);
            if (signed) {
              signed.forEach((s, idx) => {
                const path = s?.path ?? paths[idx];
                if (path && s?.signedUrl) signedMap.set(path, s.signedUrl);
              });
            }
          } catch {}
        }

        const nowTs = Date.now();
        for (const row of allRows) {
          const charKey = row.character_key;
          if (!charKey) continue;
          const entry = byChar.get(charKey) ?? { _scale: 1, scale: 1 };

          if (row.action === 'scale') {
            const sc = row.fps ? row.fps / 100 : 1;
            entry._scale = sc;
            entry.scale = sc;
            try {
              localStorage.setItem(`survival_scale_${charKey}`, String(sc));
            } catch {}
            byChar.set(charKey, entry);
            continue;
          }

          let rawUrl = signedMap.get(row.image_path);
          if (!rawUrl && row.image_path) {
            const { data: pub } = supabase.storage.from(SPRITE_BUCKET).getPublicUrl(row.image_path);
            rawUrl = pub?.publicUrl;
          }
          if (rawUrl) {
            const cacheBustTime = row.updated_at ? new Date(row.updated_at).getTime() : nowTs;
            const url = rawUrl.includes('?') ? `${rawUrl}&v=${cacheBustTime}` : `${rawUrl}?v=${cacheBustTime}`;
            const anim: SpriteAnimation = {
              ...(row as Omit<SpriteAnimation, 'url'>),
              action: row.action as SpriteAction,
              url,
              source: 'db',
            };
            entry[row.action as Exclude<SpriteAction, 'scale'>] = anim;
            if (row.action === 'pick_nose') {
              entry['nose_pick'] = { ...anim, action: 'nose_pick' as SpriteAction };
            } else if (row.action === 'nose_pick') {
              entry['pick_nose'] = { ...anim, action: 'pick_nose' as SpriteAction };
            }
          }
          byChar.set(charKey, entry);
        }
      }

      // Merge any local IndexedDB sprites not present in DB
      for (const loc of localRecords) {
        if (!loc.characterKey || loc.action === 'scale') continue;
        const entry = byChar.get(loc.characterKey) ?? { _scale: 1, scale: 1 };
        const actionKey = loc.action as Exclude<SpriteAction, 'scale'>;
        if (!entry[actionKey]) {
          const localUrl = URL.createObjectURL(loc.blob);
          const localItem: SpriteAnimation = {
            id: `local-${loc.characterKey}-${loc.action}`,
            character_key: loc.characterKey,
            action: actionKey,
            image_path: `local://${loc.characterKey}/${loc.action}`,
            frame_count: loc.frameCount,
            fps: loc.fps,
            url: localUrl,
            updated_at: new Date(loc.updatedAt).toISOString(),
            source: 'local',
          };
          entry[actionKey] = localItem;
          byChar.set(loc.characterKey, entry);
        }
      }

      for (const [charKey, data] of byChar.entries()) {
        setLocalCachedAnimations(charKey, data);
        Object.entries(data).forEach(([k, val]) => {
          if (k !== '_scale' && k !== 'scale' && val && typeof val === 'object' && 'url' in val) {
            void preloadSpriteSheet((val as SpriteAnimation).url).catch(() => {});
          }
        });
      }
    } catch (err) {
      console.warn('[preloadCoreSprites] Batch preload warning:', err);
    }
  })();

  return batchBootPreloadPromise;
}
