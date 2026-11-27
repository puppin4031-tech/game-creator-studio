import { useEffect, useState, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Upload,
  Loader2,
  Trash2,
  Wand2,
  RefreshCw,
  SlidersHorizontal,
  Download,
  ExternalLink,
  AlertCircle,
  Film,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import SpriteAnimator from '@/components/survival/SpriteAnimator';
import {
  CHARACTER_ACTIONS,
  SPRITE_ACTION_LABELS,
  SPRITE_BUCKET,
  useSpriteAnimations,
  updateLocalAnimationCache,
  clearAnimationCache,
  resolveStorageSpriteUrl,
  type SpriteAction,
  type SpriteAnimation,
} from '@/hooks/useSpriteAnimations';
import {
  normalizeSpriteSheet,
  type NormalizerOptions,
  type NormalizerResult,
} from '@/utils/spriteNormalizer';
import {
  saveSpriteToLocalDb,
  deleteSpriteFromLocalDb,
} from '@/utils/spriteStorage';

import { useCustomCatalog } from '@/hooks/useCustomCatalog';
import TribeSprite from '@/components/survival/TribeSprite';
import { getBuiltinMobSprite } from '@/utils/mobSpriteFactory';
import { SPRITE_META } from '@/lib/survival/spriteMeta';
import {
  BUILDING_TARGETS,
  NODE_TARGETS,
  PROP_TARGETS,
  GEAR_TARGETS,
  ITEM_TARGETS,
  getAllSpriteRegistryTargets,
} from '@/data/spriteRegistry';

// Bundled image assets under src/assets/survival/
const bundledSprites = import.meta.glob('/src/assets/survival/*.png', { eager: true, import: 'default' }) as Record<string, string>;
export const ALL_PRESET_SPRITES = Object.keys(bundledSprites)
  .map(p => p.replace('/src/assets/survival/', '').replace('.png', ''))
  .sort();

// Bundled WebP default prop artworks for map decorative props
import jungleTreeArt from '@/assets/props/prop_jungle_tree.webp.asset.json';
import palmTreeArt from '@/assets/props/prop_palm_tree.webp.asset.json';
import bushArt from '@/assets/props/prop_bush.webp.asset.json';
import grassTuftArt from '@/assets/props/prop_grass_tuft.webp.asset.json';
import mossyRockArt from '@/assets/props/prop_mossy_rock.webp.asset.json';

const PROP_DEFAULT_URLS: Record<string, string> = {
  'prop-jungle-tree': jungleTreeArt.url,
  'prop-palm-tree': palmTreeArt.url,
  'prop-bush': bushArt.url,
  'prop-grass-tuft': grassTuftArt.url,
  'prop-mossy-rock': mossyRockArt.url,
};

export const getBundledSpriteUrl = (key: string): string | undefined => {
  if (PROP_DEFAULT_URLS[key]) return PROP_DEFAULT_URLS[key];

  let mappedKey = key;
  if (key === 'hunter' || key.startsWith('hunter')) mappedKey = 'char-hunter';
  else if (key === 'tribe' || key === 'tribe:gatherer') mappedKey = 'char-gatherer';
  else if (key === 'tribe:scout' || key === 'tribe:ranged') mappedKey = 'char-scout';
  else if (key === 'tribe:tank' || key === 'tribe:assassin') mappedKey = 'char-hunter';
  else if (key === 'tribe:shaman') mappedKey = 'char-shaman';
  else if (key.startsWith('pet:')) mappedKey = 'item-dino-egg';

  return bundledSprites[`/src/assets/survival/${mappedKey}.png`] ?? bundledSprites[`/src/assets/survival/${key}.png`];
};

const MOB_ACTIONS: SpriteAction[] = ['idle', 'attack'];
const PET_ACTIONS: SpriteAction[] = ['idle', 'attack', 'walk'];
const TRIBE_ACTIONS: SpriteAction[] = ['walk', 'attack', 'chop', 'gather'];
const OBJECT_ACTIONS: SpriteAction[] = ['idle'];

const TRIBE_ACTION_TITLE: Partial<Record<SpriteAction, string>> = {
  walk: '걷기 모션 (이동·대기 겸용)',
  attack: '공격 액션 모션 (전투·무기 휘두르기)',
  chop: '벌목 액션 모션 (장작패기·도끼질)',
  gather: '채집 액션 모션 (채광·열매 수집)',
};

function formatErrorMessage(e: unknown): string {
  if (!e) return '알 수 없는 오류';
  if (typeof e === 'string') return e;
  const anyE = e as Record<string, unknown>;
  const msg = String(anyE.message || anyE.error_description || anyE.details || anyE.hint || e);
  if (msg.includes('survival_sprite_animations_action_check') || (msg.includes('check constraint') && msg.includes('action'))) {
    return `DB 액션 제약조건 오류 (${msg})`;
  }
  if (msg.includes('survival_sprite_animations_fps_check') || (msg.includes('check constraint') && msg.includes('fps'))) {
    return `DB FPS 제약조건 오류 (${msg})`;
  }
  return msg;
}

function formatSavedTime(iso?: string): string {
  if (!iso) return '방금 저장됨';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '방금 저장됨';
    return d.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '방금 저장됨';
  }
}

export function ScaleControl({ target }: { target: string }) {
  const qc = useQueryClient();
  const { data } = useSpriteAnimations(target);
  const [scale, setScale] = useState(1.0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setScale(data?.scale ?? 1.0);
  }, [data?.scale, target]);

  const saveScale = async () => {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from('survival_sprite_animations').upsert(
        {
          character_key: target,
          action: 'scale',
          image_path: 'scale',
          frame_count: 1,
          fps: Math.round(scale * 100),
          updated_by: u.user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'character_key,action' },
      );
      if (error) throw error;
      try {
        localStorage.setItem(`survival_scale_${target}`, String(scale));
      } catch {}
      clearAnimationCache(target);
      await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      toast.success(`✅ [${target}] 크기 비율을 ${scale.toFixed(1)}배로 DB에 저장했습니다.`);
    } catch (e) {
      try {
        localStorage.setItem(`survival_scale_${target}`, String(scale));
      } catch {}
      toast.error(`Supabase DB 크기 비율 저장 실패: ${formatErrorMessage(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/70 p-4">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <b className="text-sm font-semibold">스프라이트 크기 비율 (스케일)</b>
          <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            {scale.toFixed(1)}배 ({Math.round(scale * 100)}%)
          </span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
            Key: {target}
          </code>
        </div>
        <p className="text-xs text-muted-foreground">
          기본 크기 대비 인게임 렌더링 배율입니다. 거대 몬스터나 보스는 1.5~2.5배, 소형 몹/펫/소품은 0.6~0.9배로 설정하세요.
        </p>
      </div>
      <div className="flex w-full items-center gap-3 sm:w-80">
        <span className="text-xs text-muted-foreground">0.5x</span>
        <Slider
          min={0.5}
          max={3.0}
          step={0.1}
          value={[scale]}
          onValueChange={([v]) => setScale(v)}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground">3.0x</span>
        <Button size="sm" onClick={saveScale} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : '비율 저장'}
        </Button>
      </div>
    </div>
  );
}

export function ActionCard({
  action,
  CHARACTER,
  autoLoadUrl,
}: {
  action: SpriteAction;
  CHARACTER: string;
  autoLoadUrl?: string;
}) {
  const qc = useQueryClient();
  const fileInputId = useId();
  const { data, isLoading: isQueryLoading } = useSpriteAnimations(CHARACTER);
  const current =
    (action !== 'scale' ? data?.[action] : undefined) ??
    (action === 'pick_nose' ? data?.nose_pick : action === 'nose_pick' ? data?.pick_nose : undefined);

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [normalizedResult, setNormalizedResult] = useState<NormalizerResult | null>(null);
  const [normalizing, setNormalizing] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [showRawStrip, setShowRawStrip] = useState(false);

  // Normalizer configuration options
  const isMob = CHARACTER.startsWith('mob:');
  const mobSpecies = isMob ? CHARACTER.replace('mob:', '') : '';
  let builtinMob: ReturnType<typeof getBuiltinMobSprite> | null = null;
  if (isMob) {
    try {
      builtinMob = getBuiltinMobSprite(mobSpecies, action === 'attack' ? 'attack' : 'idle');
    } catch {
      builtinMob = null;
    }
  }

  const isPropSprite = CHARACTER.startsWith('prop-');
  const isNodeSprite = CHARACTER.startsWith('node-');
  const isObject =
    !CHARACTER.startsWith('hunter') &&
    !CHARACTER.startsWith('tribe') &&
    !CHARACTER.startsWith('pet:') &&
    !isMob;
  const objectMeta = isObject
    ? (SPRITE_META as Record<string, { w: number; h: number }>)[CHARACTER]
    : undefined;

  const targetCellSize = isMob
    ? Math.max(128, builtinMob?.cellWidth || 128)
    : isPropSprite
      ? 256
      : isNodeSprite
        ? 192
        : objectMeta
          ? Math.max(96, objectMeta.w, objectMeta.h)
          : 128;

  const [autoChroma, setAutoChroma] = useState(true);
  const [bgMode, setBgMode] = useState<'auto' | 'hot_pink' | 'white'>('auto');
  const [tolerance, setTolerance] = useState(25);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [frames, setFrames] = useState(isObject ? 1 : 4);
  const [fps, setFps] = useState(isObject ? 1 : 8);
  const [saving, setSaving] = useState(false);

  // Sync frameCount & fps immediately when target or DB data loads
  useEffect(() => {
    setSaveErrorMsg(null);
    if (current) {
      setFrames(Math.max(1, current.frame_count || 1));
      setFps(Math.max(1, current.fps || 8));
    } else if (builtinMob) {
      setFrames(builtinMob.frames);
      setFps(builtinMob.fps);
    } else if (isObject) {
      setFrames(1);
      setFps(1);
    } else {
      setFrames(4);
      setFps(8);
    }
  }, [CHARACTER, action, current?.id, current?.frame_count, current?.fps, builtinMob?.frames, builtinMob?.fps, isObject]);

  // Run auto-normalizer when rawFile or options change
  useEffect(() => {
    if (!rawFile) {
      setNormalizedResult(null);
      return;
    }
    let canceled = false;
    setNormalizing(true);

    const normalizerOpts: Partial<NormalizerOptions> = {
      frameCount: frames,
      cellWidth: targetCellSize,
      cellHeight: targetCellSize,
      removeBackground: autoChroma,
      bgMode,
      tolerance,
      baselinePadding: isObject ? 0 : 2,
    };

    normalizeSpriteSheet(rawFile, normalizerOpts)
      .then(res => {
        if (!canceled) {
          setNormalizedResult(res);
          setFrames(res.frameCount);
        }
      })
      .catch(err => {
        if (!canceled) {
          console.warn('[ActionCard] Normalization error:', err);
          toast.error(`이미지 규격화 처리 오류: ${err instanceof Error ? err.message : err}`);
        }
      })
      .finally(() => {
        if (!canceled) setNormalizing(false);
      });

    return () => {
      canceled = true;
    };
  }, [rawFile, frames, autoChroma, bgMode, tolerance, targetCellSize, isObject]);

  // Bundled static asset fallback for objects or built-ins
  const bundledUrl = getBundledSpriteUrl(CHARACTER);
  const displaySrc = normalizedResult?.previewUrl ?? current?.url ?? (isMob ? builtinMob?.url : bundledUrl);

  // Determine explicit persistence status for the card header badge
  const isDbSaved =
    !!current &&
    (current.source === 'db' ||
      (!current.image_path?.startsWith('local://') && !current.id?.startsWith('local-')));
  const isLocalOnlySaved =
    !!current &&
    !isDbSaved &&
    (current.source === 'local' ||
      current.image_path?.startsWith('local://') ||
      current.id?.startsWith('local-'));

  // Auto-load if autoLoadUrl query param is present and no file is loaded yet
  useEffect(() => {
    if (autoLoadUrl && !rawFile && !normalizedResult) {
      loadExistingIntoEditor(autoLoadUrl);
    }
  }, [autoLoadUrl]);

  const loadExistingIntoEditor = async (overrideUrl?: string) => {
    const src = overrideUrl || displaySrc;
    if (!src) {
      toast.error('불러올 기본/내장 이미지가 없습니다.');
      return;
    }
    try {
      setNormalizing(true);
      const res = await fetch(src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const ext = blob.type.includes('webp') ? 'webp' : blob.type.includes('gif') ? 'gif' : 'png';
      const safeName = `${CHARACTER.replace(/[:/]/g, '-')}-${action}.${ext}`;
      const file = new File([blob], safeName, { type: blob.type || 'image/png' });
      setRawFile(file);
      toast.success('기존 이미지를 편집기에 불러왔습니다. 프레임·배경투명화·크기를 조절하고 저장하세요.');
    } catch (e) {
      console.warn('loadExisting error:', e);
      toast.error(`이미지 불러오기 실패: ${e instanceof Error ? e.message : e}`);
    } finally {
      setNormalizing(false);
    }
  };

  const downloadCurrentSprite = async () => {
    const src = displaySrc;
    if (!src) return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${CHARACTER.replace(/[:/]/g, '-')}-${action}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 20000);
      toast.success('스프라이트 이미지를 다운로드했습니다.');
    } catch {
      toast.error('다운로드에 실패했습니다.');
    }
  };

  const save = async () => {
    setSaving(true);
    setSaveErrorMsg(null);
    const uploadBlob = normalizedResult?.blob ?? rawFile;
    const dbAction = action === 'nose_pick' ? 'pick_nose' : action;

    try {
      let path = current?.image_path;

      // 1. Upload normalized PNG blob to Supabase Storage (with upsert: true)
      if (uploadBlob) {
        path = `${CHARACTER.replace(/[:/]/g, '-')}/${dbAction}-${Date.now()}.png`;
        const { error: storageError } = await supabase.storage
          .from(SPRITE_BUCKET)
          .upload(path, uploadBlob, { contentType: 'image/png', upsert: true });

        if (storageError) {
          throw new Error(`Storage 업로드 실패 (${SPRITE_BUCKET}/${path}): ${formatErrorMessage(storageError)}`);
        }
      }

      if (!path || path.startsWith('local://')) {
        toast.error('저장할 새 스프라이트 이미지를 먼저 선택하거나 불러와 주세요.');
        return;
      }

      // 2. Upsert row into survival_sprite_animations
      const nowIso = new Date().toISOString();
      const { data: u } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('survival_sprite_animations').upsert(
        {
          character_key: CHARACTER,
          action: dbAction,
          image_path: path,
          frame_count: frames,
          fps,
          updated_by: u.user?.id,
          updated_at: nowIso,
        },
        { onConflict: 'character_key,action' },
      );

      if (dbError) {
        throw new Error(`DB 테이블(survival_sprite_animations) 저장 실패: ${formatErrorMessage(dbError)}`);
      }

      // 3. Re-fetch immediately from DB to verify true persistence
      const { data: verifiedRow, error: verifyError } = await supabase
        .from('survival_sprite_animations')
        .select('*')
        .eq('character_key', CHARACTER)
        .eq('action', dbAction)
        .maybeSingle();

      if (verifyError || !verifiedRow) {
        throw new Error(
          `DB 저장 검증 실패: survival_sprite_animations 테이블에서 저장된 행(${CHARACTER} / ${dbAction})을 확인할 수 없습니다. ${
            verifyError ? formatErrorMessage(verifyError) : '(RLS 정책 또는 권한 거부)'
          }`
        );
      }

      // 4. Generate verified signed/public URL with cache-buster (?v=${Date.now()})
      const verifiedTs = verifiedRow.updated_at ? new Date(verifiedRow.updated_at).getTime() : Date.now();
      const signedOrPubUrl = await resolveStorageSpriteUrl(verifiedRow.image_path, verifiedTs);

      // 5. Persist normalized blob to IndexedDB for fast offline cache as well
      if (uploadBlob) {
        await saveSpriteToLocalDb(CHARACTER, action, uploadBlob, { frameCount: frames, fps });
        if (action === 'pick_nose' || action === 'nose_pick') {
          await saveSpriteToLocalDb(CHARACTER, 'pick_nose', uploadBlob, { frameCount: frames, fps });
          await saveSpriteToLocalDb(CHARACTER, 'nose_pick', uploadBlob, { frameCount: frames, fps });
        }
      }

      // 6. Cleanup previous storage object if path changed
      if (
        uploadBlob &&
        current?.image_path &&
        current.image_path !== path &&
        !current.image_path.startsWith('local://')
      ) {
        await supabase.storage.from(SPRITE_BUCKET).remove([current.image_path]).catch(() => {});
      }

      // 7. Update global memory & localStorage cache and invalidate React Query
      clearAnimationCache(CHARACTER);
      const newAnim: SpriteAnimation = {
        id: verifiedRow.id,
        character_key: CHARACTER,
        action,
        image_path: verifiedRow.image_path,
        frame_count: verifiedRow.frame_count,
        fps: verifiedRow.fps,
        url: signedOrPubUrl || normalizedResult?.previewUrl || '',
        updated_at: verifiedRow.updated_at ?? nowIso,
        source: 'db',
      };
      updateLocalAnimationCache(CHARACTER, action, newAnim);

      setRawFile(null);
      setNormalizedResult(null);
      await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      toast.success(
        `✅ [${CHARACTER} · ${SPRITE_ACTION_LABELS[action] || action}] Supabase DB 저장 및 검증 완료! (${frames}프레임, ${fps}FPS)`
      );
    } catch (e) {
      const exactErr = formatErrorMessage(e);
      setSaveErrorMsg(exactErr);

      // Also save to local IndexedDB so work in progress isn't lost, while clearly showing the red DB error alert
      if (uploadBlob) {
        await saveSpriteToLocalDb(CHARACTER, action, uploadBlob, { frameCount: frames, fps });
        clearAnimationCache(CHARACTER);
        await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      }
      toast.error(`❌ Supabase DB 저장 실패: ${exactErr}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaveErrorMsg(null);
    try {
      const dbAction = action === 'nose_pick' ? 'pick_nose' : action;
      if (current?.id && !current.id.startsWith('local-')) {
        await supabase.from('survival_sprite_animations').delete().eq('id', current.id);
      } else {
        await supabase
          .from('survival_sprite_animations')
          .delete()
          .eq('character_key', CHARACTER)
          .eq('action', dbAction);
      }
      if (current?.image_path && !current.image_path.startsWith('local://')) {
        await supabase.storage.from(SPRITE_BUCKET).remove([current.image_path]);
      }
      await deleteSpriteFromLocalDb(CHARACTER, action);
      if (action === 'pick_nose' || action === 'nose_pick') {
        await deleteSpriteFromLocalDb(CHARACTER, 'pick_nose');
        await deleteSpriteFromLocalDb(CHARACTER, 'nose_pick');
      }
      clearAnimationCache(CHARACTER);
      setRawFile(null);
      setNormalizedResult(null);
      await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      toast.success('커스텀 스프라이트를 삭제하고 기본 내장 도트로 복원했어요.');
    } catch (e) {
      toast.error(`삭제 실패: ${formatErrorMessage(e)}`);
    }
  };

  const isTribeTarget = CHARACTER === 'tribe' || CHARACTER.startsWith('tribe:');
  const actionTitle = isTribeTarget
    ? TRIBE_ACTION_TITLE[action] ?? SPRITE_ACTION_LABELS[action]
    : isObject
      ? '기본 외형 / 애니메이션'
      : SPRITE_ACTION_LABELS[action] || action;

  const targetScale = data?.scale ?? 1.0;
  const previewHeight = Math.min(108, Math.round((isObject ? objectMeta?.h || 56 : 72) * targetScale));

  return (
    <div
      data-action-card={`${CHARACTER}:${action}`}
      className="space-y-3 rounded-lg border bg-card p-4 transition-all hover:border-primary/40"
    >
      {/* Top Header Row: Action Name + Delete */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">
          {actionTitle} <span className="text-xs text-muted-foreground">({action})</span>
        </h3>
        {current && (
          <Button size="icon" variant="ghost" onClick={remove} aria-label="삭제" title="커스텀 스프라이트 삭제">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      {/* Explicit Save Status Badge Row */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px]">
        {isDbSaved ? (
          <>
            <span
              data-save-status="db-custom"
              className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400"
            >
              ✅ DB 저장됨 (커스텀)
            </span>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{formatSavedTime(current?.updated_at)}</span>
              {current?.url && !current.url.startsWith('blob:') && (
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-semibold text-primary underline hover:opacity-80"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  원본 URL 확인
                </a>
              )}
            </div>
          </>
        ) : isLocalOnlySaved ? (
          <>
            <span
              data-save-status="local-custom"
              className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400"
            >
              💾 로컬 캐시 저장됨 (DB 미동기화)
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatSavedTime(current?.updated_at)}
            </span>
          </>
        ) : (
          <>
            <span
              data-save-status="builtin-default"
              className="inline-flex items-center gap-1 font-semibold text-muted-foreground"
            >
              📦 기본 내장 사용 중
            </span>
            <span className="text-[10px] text-muted-foreground">
              {isMob ? '16비트 내장 4프레임 시트' : '기본 번들 에셋'}
            </span>
          </>
        )}
      </div>

      {/* Red Error Alert Banner if Storage upload or DB upsert failed */}
      {saveErrorMsg && (
        <div
          role="alert"
          data-supabase-error-alert
          className="flex items-start gap-2 rounded-md border-2 border-destructive bg-destructive/10 p-2.5 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-0.5 break-all">
            <div className="font-bold">Supabase 저장 오류 발생</div>
            <div className="text-[11px] leading-snug">{saveErrorMsg}</div>
          </div>
        </div>
      )}

      {/* Live 1-Frame Clipped Animated Preview + Raw Strip Toggle */}
      <div className="relative flex min-h-[144px] flex-col items-center justify-between rounded border bg-muted/60 p-2.5 overflow-hidden">
        <div className="flex w-full items-center justify-between text-[10px] text-muted-foreground">
          <span className="font-mono font-semibold">
            {showRawStrip ? `원본 시트 전체 (${frames}프레임 가로 스트립)` : `인게임 1프레임 클리핑 재생 (${frames}F · ${fps}FPS)`}
          </span>
          {displaySrc && (
            <button
              type="button"
              onClick={() => setShowRawStrip(v => !v)}
              className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted"
            >
              {showRawStrip ? (
                <>
                  <Eye className="h-3 w-3 text-primary" /> 1프레임 애니메이션 보기
                </>
              ) : (
                <>
                  <Film className="h-3 w-3 text-primary" /> 전체 시트 확인
                </>
              )}
            </button>
          )}
        </div>

        <div className="my-auto flex flex-col items-center justify-center py-2">
          {normalizing || isQueryLoading ? (
            <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>{normalizing ? '스프라이트 자동 규격화 중...' : 'DB 스프라이트 불러오는 중...'}</span>
            </div>
          ) : displaySrc ? (
            showRawStrip ? (
              <div className="flex flex-col items-center gap-1">
                <img
                  src={displaySrc}
                  alt={`${CHARACTER} ${action} raw strip`}
                  className={`${isPropSprite ? '' : 'pixelated'} max-h-20 w-auto rounded border border-dashed border-primary/50 bg-background/50 p-1 object-contain`}
                />
                <span className="text-[10px] text-muted-foreground">
                  저장된 원본 가로 스프라이트 시트 ({frames}프레임)
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5">
                <SpriteAnimator
                  url={displaySrc}
                  frames={frames}
                  fps={fps}
                  height={previewHeight}
                  smooth={isPropSprite}
                />
                {normalizedResult ? (
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ✓ {normalizedResult.cellWidth}×{normalizedResult.cellHeight}px 규격화 대기 중 (저장 버튼을 눌러 확정)
                  </span>
                ) : isDbSaved ? (
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ✓ 인게임 실시간 연동 중 ({frames}프레임 1칸 클리핑)
                  </span>
                ) : (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    기본 내장 도트 미리보기 (업로드·저장 시 즉시 교체)
                  </span>
                )}
              </div>
            )
          ) : isTribeTarget ? (
            <div className="flex flex-col items-center gap-1">
              <TribeSprite
                action={action}
                tribeClass={CHARACTER.startsWith('tribe:') ? (CHARACTER.slice(6) as never) : undefined}
                height={Math.round(56 * targetScale)}
              />
              <span className="text-[10px] text-muted-foreground">부족민 기본 내장 스프라이트</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
              <span className="text-2xl">📦</span>
              <span>파일을 업로드하거나 기존 에셋을 불러오세요</span>
            </div>
          )}
        </div>
      </div>

      {/* Existing Sprite Quick Load & Download Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => loadExistingIntoEditor()}
          disabled={normalizing || (!displaySrc && !current)}
          className="flex-1 min-h-9 gap-1.5 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10"
          title="현재 등록된 스프라이트 또는 내장 도트를 편집기에 즉시 불러와 수정합니다."
        >
          <RefreshCw className={`h-3.5 w-3.5 ${normalizing ? 'animate-spin' : ''}`} />
          현재 이미지 편집기로 불러오기
        </Button>
        {displaySrc && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={downloadCurrentSprite}
            className="min-h-9 px-2 text-xs font-bold"
            title="현재 스프라이트 이미지 다운로드"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Preset Asset Copy Loader */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <label className="text-[11px] font-semibold text-muted-foreground shrink-0">
          다른 에셋 복사:
        </label>
        <select
          className="h-8 flex-1 rounded border border-border bg-background px-2 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          defaultValue=""
          onChange={e => {
            const val = e.target.value;
            if (!val) return;
            const targetUrl = bundledSprites[`/src/assets/survival/${val}.png`];
            if (targetUrl) {
              loadExistingIntoEditor(targetUrl);
              toast.info(`[${val}] 에셋을 불러왔습니다. 수정 후 저장하세요.`);
            }
            e.target.value = '';
          }}
        >
          <option value="">다른 기존 도트 파일에서 불러와 편집하기...</option>
          {ALL_PRESET_SPRITES.map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      {/* File Upload Input */}
      <div>
        <label htmlFor={fileInputId} className="sr-only">새 스프라이트 시트 파일 선택</label>
        <Input
          id={fileInputId}
          type="file"
          accept="image/png,image/webp,image/gif"
          onChange={e => setRawFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Auto-Normalizer Controls */}
      <div className="rounded-md border bg-muted/30 p-2.5 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold text-foreground">
            <Wand2 className="h-3.5 w-3.5 text-primary" /> 자동 규격화 · 마젠타 테두리 제거
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(v => !v)}
            className="h-6 px-1.5 text-[11px] text-muted-foreground"
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            {showAdvanced ? '접기' : '설정'}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground cursor-pointer">
            배경 자동 투명화 (크로마키 + 1px 핑크 잔상 제거)
          </Label>
          <Switch checked={autoChroma} onCheckedChange={setAutoChroma} />
        </div>

        {showAdvanced && (
          <div className="space-y-2 pt-1 border-t border-muted">
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <span className="text-muted-foreground">배경 감지:</span>
              <div className="flex gap-1">
                {(['auto', 'hot_pink', 'white'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBgMode(mode)}
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-medium transition-all ${
                      bgMode === mode ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {mode === 'auto' ? '모서리 자동' : mode === 'hot_pink' ? '마젠타(#FF00FF)' : '순백색'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>감지 허용오차 (Tolerance)</span>
                <span>{tolerance}%</span>
              </div>
              <Slider min={5} max={60} step={1} value={[tolerance]} onValueChange={([v]) => setTolerance(v)} />
            </div>
          </div>
        )}
      </div>

      {/* Frame & FPS Controls */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <Label className="text-xs">프레임 수 (가로 분할 칸 수)</Label>
          <span className="font-bold text-primary">{frames} 프레임</span>
        </div>
        <Slider min={1} max={16} step={1} value={[frames]} onValueChange={([v]) => setFrames(v)} />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <Label className="text-xs">재생 속도</Label>
          <span className="font-bold text-primary">{fps} FPS</span>
        </div>
        <Slider min={1} max={24} step={1} value={[fps]} onValueChange={([v]) => setFps(v)} />
      </div>

      {/* Save Button */}
      <Button
        className="min-h-11 w-full gap-2 font-bold"
        onClick={save}
        disabled={saving || (!rawFile && !normalizedResult && !current)}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Supabase DB 저장 및 검증 중...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> 규격화 스프라이트 저장
          </>
        )}
      </Button>
    </div>
  );
}

export default function SpriteAssets() {
  const { data: catalog } = useCustomCatalog();
  const [searchParams] = useSearchParams();
  const initialTarget = searchParams.get('target') || 'hunter';
  const editUrl = searchParams.get('editUrl') || undefined;

  const [target, setTarget] = useState(initialTarget);

  useEffect(() => {
    const t = searchParams.get('target');
    if (t) setTarget(t);
  }, [searchParams]);

  // Unified canonical sprite target list from src/data/spriteRegistry.ts
  const targets = getAllSpriteRegistryTargets(catalog?.pets ?? []);

  const isTribe = target === 'tribe' || target.startsWith('tribe:');
  const isPet = target.startsWith('pet:');
  const isMob = target.startsWith('mob:');
  const isBuilding = BUILDING_TARGETS.some(b => b.key === target);
  const isNode = NODE_TARGETS.some(n => n.key === target);
  const isProp = PROP_TARGETS.some(g => g.key === target);
  const isGear = GEAR_TARGETS.some(g => g.key === target);
  const isItem = ITEM_TARGETS.some(i => i.key === target);

  const actions: SpriteAction[] =
    target === 'hunter' || target.startsWith('hunter:')
      ? (CHARACTER_ACTIONS as unknown as SpriteAction[])
      : isTribe
        ? TRIBE_ACTIONS
        : isPet
          ? PET_ACTIONS
          : isMob
            ? MOB_ACTIONS
            : OBJECT_ACTIONS;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">인게임 스프라이트 스튜디오</h1>
        <p className="text-sm text-muted-foreground">
          유저 캐릭터의 10가지 액션 모션, 부족민, 공룡 펫, 13종 선사 몹·우두머리 보스는 물론 건물, 채집 노드, 배경 장식물, 무기/도구/아이템까지 모든 오브젝트를 단일 키(`spriteRegistry`)로 관리하고 실시간 DB 저장 상태를 검증합니다.
        </p>
      </div>

      {/* Target Quick Category Select */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="카테고리 빠른 선택">
        <Button
          type="button"
          size="sm"
          variant={target.startsWith('hunter') ? 'default' : 'outline'}
          onClick={() => setTarget('hunter')}
          className="text-xs font-bold"
        >
          👤 캐릭터
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isTribe ? 'default' : 'outline'}
          onClick={() => setTarget('tribe')}
          className="text-xs font-bold"
        >
          👥 부족 용병
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isPet ? 'default' : 'outline'}
          onClick={() => setTarget('pet:baby_raptor')}
          className="text-xs font-bold"
        >
          🦕 공룡 펫
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isMob ? 'default' : 'outline'}
          onClick={() => setTarget('mob:boar')}
          className="text-xs font-bold"
        >
          🦖 선사 몹·우두머리
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isBuilding ? 'default' : 'outline'}
          onClick={() => setTarget('base-campfire')}
          className="text-xs font-bold"
        >
          🏕️ 건물·거점
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isNode ? 'default' : 'outline'}
          onClick={() => setTarget('node-oak')}
          className="text-xs font-bold"
        >
          🌲 자연물·노드
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isProp ? 'default' : 'outline'}
          onClick={() => setTarget('prop-jungle-tree')}
          className="text-xs font-bold"
        >
          🌿 배경 장식물
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isGear ? 'default' : 'outline'}
          onClick={() => setTarget('item-hand-axe')}
          className="text-xs font-bold"
        >
          🗡️ 무기·도구·방어구
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isItem ? 'default' : 'outline'}
          onClick={() => setTarget('item-flint')}
          className="text-xs font-bold"
        >
          💎 광석·재료·식량
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <select
          aria-label="대상 선택"
          className="min-h-11 w-full max-w-md rounded-md border bg-background px-3 text-sm font-medium"
          value={target}
          onChange={e => setTarget(e.target.value)}
        >
          {targets.map(t => (
            <option key={t.key} value={t.key}>
              {t.label} ({t.key})
            </option>
          ))}
        </select>
      </div>

      {/* Scale Control for All Targets */}
      <ScaleControl target={target} />

      {/* Action Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(a => (
          <ActionCard
            key={`${target}-${a}`}
            action={a}
            CHARACTER={target}
            autoLoadUrl={editUrl}
          />
        ))}
      </div>
    </div>
  );
}
