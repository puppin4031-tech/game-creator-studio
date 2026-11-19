import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import SpriteAnimator from '@/components/survival/SpriteAnimator';
import {
  CHARACTER_ACTIONS,
  SPRITE_ACTION_LABELS,
  SPRITE_BUCKET,
  useSpriteAnimations,
  type SpriteAction,
} from '@/hooks/useSpriteAnimations';

import { CREATURES } from '@/lib/survival/entities';
import { TRIBE_CLASS_LIST } from '@/data/tribeClasses';
import { useCustomCatalog } from '@/hooks/useCustomCatalog';
import TribeSprite from '@/components/survival/TribeSprite';

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
    return 'DB 액션 제약조건 오류: 데이터베이스에 해당 액션(또는 scale)이 허용 목록에 없습니다. 최신 SQL 마이그레이션을 적용해 주세요.';
  }
  if (msg.includes('survival_sprite_animations_fps_check') || (msg.includes('check constraint') && msg.includes('fps'))) {
    return 'DB FPS 제약조건 오류: fps 값이 허용 범위(30 이하)를 초과했습니다. DB의 fps 제약조건 확장 SQL을 실행해 주세요.';
  }
  if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('has_role') || msg.includes('Forbidden')) {
    return '권한 오류: Supabase 계정에 main_admin 권한이 부여되어 있는지 확인해 주세요.';
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
      await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      toast.success(`크기 비율을 ${scale.toFixed(1)}배로 저장했어요.`);
    } catch (e) {
      toast.error(`저장 실패: ${formatErrorMessage(e)}`);
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
  const { data } = useSpriteAnimations(CHARACTER);
  const current = data?.[action];
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [frames, setFrames] = useState(4);
  const [fps, setFps] = useState(8);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (current) {
      setFrames(current.frame_count);
      setFps(current.fps);
    }
  }, [current]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const save = async () => {
    setSaving(true);
    try {
      let path = current?.image_path;
      if (file) {
        path = `${CHARACTER.replace(':', '-')}/${action}-${Date.now()}.${file.name.split('.').pop() ?? 'png'}`;
        const { error } = await supabase.storage.from(SPRITE_BUCKET).upload(path, file, { contentType: file.type });
        if (error) throw error;
      }
      if (!path) {
        toast.error('스프라이트 시트 이미지를 선택해 주세요.');
        return;
      }
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from('survival_sprite_animations').upsert(
        {
          character_key: CHARACTER,
          action,
          image_path: path,
          frame_count: frames,
          fps,
          updated_by: u.user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'character_key,action' },
      );
      if (error) throw error;
      if (file && current?.image_path && current.image_path !== path) {
        await supabase.storage.from(SPRITE_BUCKET).remove([current.image_path]);
      }
      setFile(null);
      await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      toast.success(`${SPRITE_ACTION_LABELS[action]} 애니메이션을 저장했어요.`);
    } catch (e) {
      toast.error(`저장 실패: ${formatErrorMessage(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!current) return;
    try {
      const { error } = await supabase.from('survival_sprite_animations').delete().eq('id', current.id);
      if (error) throw error;
      await supabase.storage.from(SPRITE_BUCKET).remove([current.image_path]);
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

  const src = preview ?? current?.url;
  const targetScale = data?.scale ?? 1.0;
  const previewHeight = Math.min(110, Math.round(72 * targetScale));

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
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
      <div className="flex h-32 items-center justify-center rounded bg-muted/60 p-2">
        {src ? (
          <SpriteAnimator url={src} frames={frames} fps={fps} height={previewHeight} />
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
                : action === 'pick_nose'
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
            <span>미등록 (클릭하여 시트 업로드)</span>
          </div>
        )}
      </div>
      <Input
        type="file"
        accept="image/png,image/webp,image/gif"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
      />
      <div className="space-y-1">
        <Label className="text-xs">프레임 수: {frames}</Label>
        <Slider min={1} max={16} step={1} value={[frames]} onValueChange={([v]) => setFrames(v)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">재생 속도: {fps} FPS</Label>
        <Slider min={1} max={24} step={1} value={[fps]} onValueChange={([v]) => setFps(v)} />
      </div>
      <Button className="min-h-11 w-full" onClick={save} disabled={saving || (!file && !current)}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 저장
      </Button>
    </div>
  );
}

export default function SpriteAssets() {
  const { data: catalog } = useCustomCatalog();
  const [target, setTarget] = useState('hunter');

  const targets = [
    { key: 'hunter', label: '👤 유저 캐릭터 (공통 기본 · 9가지 액션)' },
    { key: 'hunter:lv5', label: '👤 유저 캐릭터 (Lv.5~7 전용 외형)' },
    { key: 'hunter:lv8', label: '👤 유저 캐릭터 (Lv.8+ 전용 외형)' },
    ...TRIBE_TARGETS,
    ...DINO_PET_TARGETS,
    ...(catalog?.pets ?? []).map(p => ({
      key: `pet:${p.pet_id}`,
      label: `커스텀 펫 · 🐾 ${p.name}`,
    })),
    ...Object.entries(CREATURES).map(([k, c]) => ({
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
          유저 캐릭터의 9가지 액션 모션(벌목·장작패는 도끼질 포함)과 펫/몹의 스프라이트 시트 및 크기 비율(배율)을 직접 등록·관리합니다.
        </p>
      </div>

      {/* Target Quick Select */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="빠른 대상 선택">
        <Button
          type="button"
          size="sm"
          variant={target === 'hunter' ? 'default' : 'outline'}
          onClick={() => setTarget('hunter')}
          className="text-xs font-bold"
        >
          👤 유저 캐릭터 (9가지)
        </Button>
        {TRIBE_TARGETS.slice(1).map(t => (
          <Button
            key={t.key}
            type="button"
            size="sm"
            variant={target === t.key ? 'default' : 'outline'}
            onClick={() => setTarget(t.key)}
            className="text-xs"
          >
            {t.label.split('·')[1]?.trim() ?? t.label}
          </Button>
        ))}
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
