import { useEffect, useState, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, Trash2, Wand2, Check, RefreshCw, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';
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

import { CREATURES } from '@/lib/survival/entities';
import { TRIBE_CLASS_LIST } from '@/data/tribeClasses';
import { useCustomCatalog } from '@/hooks/useCustomCatalog';
import TribeSprite from '@/components/survival/TribeSprite';
import { getBuiltinMobSprite, PREHISTORIC_MOBS } from '@/utils/mobSpriteFactory';

const TRIBE_TARGETS = [
  { key: 'tribe', label: '부족민 (공통 기본)' },
  ...TRIBE_CLASS_LIST.map(c => ({
    key: `tribe:${c.id}`,
    label: `부족 용병 · ${c.icon} ${c.name} (${c.role})`,
  })),
];

const DINO_PET_TARGETS = [
  { key: 'pet:baby_raptor', label: '공룡 펫 · 🦖 아기 랩터' },
  { key: 'pet:baby_stego', label: '공룡 펫 · 🦕 아기 스테고' },
  { key: 'pet:baby_ptera', label: '공룡 펫 · 🦅 아기 프테라' },
  { key: 'pet:mini_triceratops', label: '공룡 펫 · 🦏 아기 트리케라톱스' },
];

const MOB_ACTIONS: SpriteAction[] = ['idle', 'attack'];
const PET_ACTIONS: SpriteAction[] = ['idle', 'attack', 'walk'];
const TRIBE_ACTIONS: SpriteAction[] = ['walk', 'attack', 'chop', 'gather'];
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
    return 'DB 액션 제약조건 오류: 데이터베이스에 해당 액션이 허용 목록에 없습니다. (최신 SQL 마이그레이션이 적용되었습니다)';
  }
  if (msg.includes('survival_sprite_animations_fps_check') || (msg.includes('check constraint') && msg.includes('fps'))) {
    return 'DB FPS 제약조건 오류: fps 값이 허용 범위를 초과했습니다.';
  }
  if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('has_role') || msg.includes('Forbidden') || msg.includes('42501')) {
    return '권한 안내: Supabase 계정에 main_admin 권한이 없더라도, 로컬 브라우저(IndexedDB)에 안전하게 저장되어 새로고침 후에도 유지됩니다.';
  }
  return msg;
}

export function ScaleControl({ target }: { target: string }) {
  const qc = useQueryClient();
  const { data } = useSpriteAnimations(target);
  const [scale, setScale] = useState(1.0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.scale) setScale(data.scale);
  }, [data?.scale]);

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
      toast.success(`크기 비율을 ${scale.toFixed(1)}배로 저장했어요.`);
    } catch (e) {
      try {
        localStorage.setItem(`survival_scale_${target}`, String(scale));
        toast.info(`로컬 브라우저에 크기 비율(${scale.toFixed(1)}배)이 저장되었습니다.`);
      } catch {
        toast.error(`저장 실패: ${formatErrorMessage(e)}`);
      }
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
        </div>
        <p className="text-xs text-muted-foreground">
          기본 크기 대비 인게임 렌더링 배율입니다. 거대 몬스터(매머드 등)나 보스는 1.5~2.5배, 소형 몹/펫은 0.6~0.9배로 설정하세요.
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

export function ActionCard({ action, CHARACTER }: { action: SpriteAction; CHARACTER: string }) {
  const qc = useQueryClient();
  const fileInputId = useId();
  const { data } = useSpriteAnimations(CHARACTER);
  const current = data?.[action] ?? (action === 'pick_nose' ? data?.nose_pick : action === 'nose_pick' ? data?.pick_nose : undefined);

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [normalizedResult, setNormalizedResult] = useState<NormalizerResult | null>(null);
  const [normalizing, setNormalizing] = useState(false);

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

  const targetCellSize = isMob ? (builtinMob?.cellWidth || 64) : 48;
  const [autoChroma, setAutoChroma] = useState(true);
  const [bgMode, setBgMode] = useState<'auto' | 'hot_pink' | 'white'>('auto');
  const [tolerance, setTolerance] = useState(25);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [frames, setFrames] = useState(4);
  const [fps, setFps] = useState(8);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (current) {
      setFrames(current.frame_count);
      setFps(current.fps);
    } else if (builtinMob) {
      setFrames(builtinMob.frames);
      setFps(builtinMob.fps);
    }
  }, [current, builtinMob?.frames, builtinMob?.fps]);

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
      baselinePadding: 2,
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
  }, [rawFile, frames, autoChroma, bgMode, tolerance, targetCellSize]);

  const save = async () => {
    setSaving(true);
    try {
      const uploadBlob = normalizedResult?.blob ?? rawFile;
      let path = current?.image_path;
      // DB constraint allows 'pick_nose'
      const dbAction = (action === 'nose_pick' ? 'pick_nose' : action);

      if (uploadBlob) {
        path = `${CHARACTER.replace(':', '-')}/${dbAction}-${Date.now()}.png`;
        const { error: storageError } = await supabase.storage
          .from(SPRITE_BUCKET)
          .upload(path, uploadBlob, { contentType: 'image/png', upsert: true });

        if (storageError) {
          console.warn('[ActionCard] Cloud storage upload failed:', storageError);
          // If cloud fails, still save to IndexedDB as guaranteed resilient local fallback
          await saveSpriteToLocalDb(CHARACTER, action, uploadBlob, { frameCount: frames, fps });
          if (action === 'pick_nose' || action === 'nose_pick') {
            await saveSpriteToLocalDb(CHARACTER, 'pick_nose', uploadBlob, { frameCount: frames, fps });
            await saveSpriteToLocalDb(CHARACTER, 'nose_pick', uploadBlob, { frameCount: frames, fps });
          }
          throw storageError;
        }
      }

      if (!path) {
        toast.error('스프라이트 시트 이미지를 업로드해 주세요.');
        return;
      }

      const { data: u } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('survival_sprite_animations').upsert(
        {
          character_key: CHARACTER,
          action: dbAction,
          image_path: path,
          frame_count: frames,
          fps,
          updated_by: u.user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'character_key,action' },
      );

      if (dbError) throw dbError;

      // Also persist normalized blob to IndexedDB for offline / instant fast boot cache
      if (uploadBlob) {
        await saveSpriteToLocalDb(CHARACTER, action, uploadBlob, { frameCount: frames, fps });
        if (action === 'pick_nose' || action === 'nose_pick') {
          await saveSpriteToLocalDb(CHARACTER, 'pick_nose', uploadBlob, { frameCount: frames, fps });
          await saveSpriteToLocalDb(CHARACTER, 'nose_pick', uploadBlob, { frameCount: frames, fps });
        }
      }

      // Cleanup old file from cloud storage if path changed
      if (uploadBlob && current?.image_path && current.image_path !== path && !current.image_path.startsWith('local://')) {
        await supabase.storage.from(SPRITE_BUCKET).remove([current.image_path]);
      }

      // Invalidate memory and react query cache with cache-busting
      clearAnimationCache(CHARACTER);
      const publicUrl = supabase.storage.from(SPRITE_BUCKET).getPublicUrl(path).data?.publicUrl;
      const cacheBustUrl = publicUrl ? `${publicUrl}?v=${Date.now()}` : (normalizedResult?.previewUrl ?? '');
      
      const newAnim: SpriteAnimation = {
        id: `updated-${CHARACTER}-${action}`,
        character_key: CHARACTER,
        action,
        image_path: path,
        frame_count: frames,
        fps,
        url: cacheBustUrl,
      };
      updateLocalAnimationCache(CHARACTER, action, newAnim);

      setRawFile(null);
      await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      toast.success(`✅ ${SPRITE_ACTION_LABELS[action]} 스프라이트가 클라우드에 성공적으로 저장되었습니다.`);
    } catch (e) {
      // If cloud failed but local IndexedDB succeeded
      if (normalizedResult?.blob || rawFile) {
        const localBlob = normalizedResult?.blob ?? rawFile!;
        await saveSpriteToLocalDb(CHARACTER, action, localBlob, { frameCount: frames, fps });
        clearAnimationCache(CHARACTER);
        await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
        toast.warning(`⚠️ 클라우드 저장 실패 (${formatErrorMessage(e)}). 로컬 브라우저(IndexedDB)에 저장되어 새로고침 후에도 유지됩니다.`);
      } else {
        toast.error(`저장 실패: ${formatErrorMessage(e)}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      const dbAction = (action === 'nose_pick' ? 'pick_nose' : action);
      if (current?.id && !current.id.startsWith('local-')) {
        await supabase.from('survival_sprite_animations').delete().eq('id', current.id);
      } else {
        await supabase.from('survival_sprite_animations').delete().eq('character_key', CHARACTER).eq('action', dbAction);
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
      toast.success('스프라이트를 삭제했어요.');
    } catch (e) {
      toast.error(`삭제 실패: ${formatErrorMessage(e)}`);
    }
  };

  const isTribeTarget = CHARACTER === 'tribe' || CHARACTER.startsWith('tribe:');
  const actionTitle = isTribeTarget
    ? TRIBE_ACTION_TITLE[action] ?? SPRITE_ACTION_LABELS[action]
    : SPRITE_ACTION_LABELS[action];

  const displaySrc = normalizedResult?.previewUrl ?? current?.url ?? builtinMob?.url;
  const isUsingBuiltin = !normalizedResult && !current && !!builtinMob;
  const targetScale = data?.scale ?? 1.0;
  const previewHeight = Math.min(110, Math.round(72 * targetScale));

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 transition-all hover:border-primary/40">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          {actionTitle} <span className="text-xs text-muted-foreground">({action})</span>
        </h3>
        {current && (
          <Button size="icon" variant="ghost" onClick={remove} aria-label="삭제">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Live Animated Preview */}
      <div className="relative flex h-32 flex-col items-center justify-center rounded bg-muted/60 p-2 overflow-hidden border">
        {normalizing ? (
          <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>스프라이트 자동 규격화 중...</span>
          </div>
        ) : displaySrc ? (
          <div className="flex flex-col items-center justify-center gap-1">
            <SpriteAnimator url={displaySrc} frames={frames} fps={fps} height={previewHeight} />
            {normalizedResult ? (
              <span className="rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-bold">
                ✓ {normalizedResult.cellWidth}×{normalizedResult.cellHeight}px 발 기준선 정렬 완료
              </span>
            ) : isUsingBuiltin ? (
              <span className="rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                16비트 내장 도트 (업로드 시 대체)
              </span>
            ) : null}
          </div>
        ) : isTribeTarget ? (
          <div className="flex flex-col items-center gap-1">
            <TribeSprite
              action={action}
              tribeClass={CHARACTER.startsWith('tribe:') ? (CHARACTER.slice(6) as never) : undefined}
              height={Math.round(52 * targetScale)}
            />
            <span className="text-[11px] text-muted-foreground">기본 스프라이트 사용 중</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
            <span className="text-2xl">
              {action === 'poop'
                ? '💩'
                : action === 'pick_nose' || action === 'nose_pick'
                ? '👃'
                : action === 'celebrate'
                ? '🎉'
                : action === 'attack'
                ? '⚔️'
                : action === 'chop'
                ? '🪓'
                : action === 'gather'
                ? '⛏️'
                : action === 'walk'
                ? '🚶'
                : action === 'hurt'
                ? '💥'
                : '🧍'}
            </span>
            <span>미등록 (아래에서 파일 업로드)</span>
          </div>
        )}
      </div>

      {/* File Upload Input */}
      <div>
        <label htmlFor={fileInputId} className="sr-only">스프라이트 시트 파일 선택</label>
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
            <Wand2 className="h-3.5 w-3.5 text-primary" /> 자동 규격화 (Auto-Normalize)
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
            배경 자동 투명화 (크로마키)
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
          <Label className="text-xs">프레임 수</Label>
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
        disabled={saving || (!rawFile && !current)}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> 저장 중...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> 규격화 시트 저장
          </>
        )}
      </Button>
    </div>
  );
}

export default function SpriteAssets() {
  const { data: catalog } = useCustomCatalog();
  const [target, setTarget] = useState('hunter');

  const targets = [
    { key: 'hunter', label: '👤 유저 캐릭터 (공통 기본 · 10가지 액션)' },
    { key: 'hunter:lv5', label: '👤 유저 캐릭터 (Lv.5~7 전용 외형)' },
    { key: 'hunter:lv8', label: '👤 유저 캐릭터 (Lv.8+ 전용 외형)' },
    ...TRIBE_TARGETS,
    ...DINO_PET_TARGETS,
    ...(catalog?.pets ?? []).map(p => ({
      key: `pet:${p.pet_id}`,
      label: `커스텀 펫 · 🐾 ${p.name}`,
    })),
    ...PREHISTORIC_MOBS.map(m => ({
      key: `mob:${m.id}`,
      label: `🦖 선사시대 몹 · [${m.tier}] ${m.name}`,
    })),
    ...Object.entries(CREATURES)
      .filter(([k]) => !PREHISTORIC_MOBS.some(m => m.id === k))
      .map(([k, c]) => ({
        key: `mob:${k}`,
        label: `${k.startsWith('custom_') ? '커스텀 몹' : '야생 몹'} · ${c.name}`,
      })),
  ];

  const isTribe = target === 'tribe' || target.startsWith('tribe:');
  const isPet = target.startsWith('pet:');
  const isMob = target.startsWith('mob:');

  const actions: SpriteAction[] =
    target === 'hunter' || target.startsWith('hunter:')
      ? (CHARACTER_ACTIONS as unknown as SpriteAction[])
      : isTribe
      ? TRIBE_ACTIONS
      : isPet
      ? PET_ACTIONS
      : MOB_ACTIONS;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">캐릭터 · 펫 · 몹 스프라이트 스튜디오</h1>
        <p className="text-sm text-muted-foreground">
          유저 캐릭터의 10가지 액션 모션(기본, 걷기, 공격, 벌목, 채집, 대화, 똥싸기, 코딱지파기, 신난다, 피격)과 펫/몹의 스프라이트 시트 및 크기 비율(배율)을 직접 등록·관리합니다. 13종의 선사시대 몹·공룡은 16비트 내장 도트 애니메이션이 기본 탑재되어 있으며, 업로드 시 즉시 커스텀 도트로 오버라이드됩니다.
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
          👤 유저 캐릭터
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
          🦖 선사 몹·공룡 (13종)
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <select
          aria-label="대상 선택"
          className="min-h-11 w-full max-w-sm rounded-md border bg-background px-3 text-sm font-medium"
          value={target}
          onChange={e => setTarget(e.target.value)}
        >
          {targets.map(t => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Scale Control for All Targets (especially Mobs and Pets) */}
      <ScaleControl target={target} />

      {/* Action Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(a => (
          <ActionCard key={`${target}-${a}`} action={a} CHARACTER={target} />
        ))}
      </div>
    </div>
  );
}
