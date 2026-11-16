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
import { SPRITE_ACTIONS, SPRITE_ACTION_LABELS, SPRITE_BUCKET, useSpriteAnimations, type SpriteAction } from '@/hooks/useSpriteAnimations';

import { CREATURES } from '@/lib/survival/entities';
import { HERO_TIERS } from '@/lib/survival/heroTier';
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

function buildTargets() {
  return [
    ...[...HERO_TIERS].reverse().map(h => ({ key: h.key, label: h.label })),
    ...TRIBE_TARGETS,
    ...Object.entries(CREATURES).map(([k, c]) => ({
      key: `mob:${k}`,
      label: `${k.startsWith('custom_') ? '커스텀 몹' : '몹'} · ${c.name}`,
    })),
  ];
}
const MOB_ACTIONS: SpriteAction[] = ['idle', 'attack'];
// 부족 용병은 피격(타격 입는) 모션 없이 오직 걷기(walk)와 행동 액션(attack, gather)만 사용
const TRIBE_ACTIONS: SpriteAction[] = ['walk', 'attack', 'gather'];
const TRIBE_ACTION_TITLE: Partial<Record<SpriteAction, string>> = {
  walk: '걷기 모션 (이동·대기 겸용)',
  attack: '공격 액션 모션 (전투·무기 휘두르기)',
  gather: '채집 액션 모션 (벌목·채광·수집)',
};

export function ActionCard({ action, CHARACTER }: { action: SpriteAction; CHARACTER: string }) {
  const qc = useQueryClient();
  const { data } = useSpriteAnimations(CHARACTER);
  const current = data?.[action];
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [frames, setFrames] = useState(4);
  const [fps, setFps] = useState(8);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (current) { setFrames(current.frame_count); setFps(current.fps); } }, [current]);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file); setPreview(u);
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
      if (!path) { toast.error('스프라이트 시트 이미지를 선택해 주세요.'); return; }
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from('survival_sprite_animations').upsert(
        { character_key: CHARACTER, action, image_path: path, frame_count: frames, fps, updated_by: u.user?.id, updated_at: new Date().toISOString() },
        { onConflict: 'character_key,action' },
      );
      if (error) throw error;
      if (file && current?.image_path && current.image_path !== path) await supabase.storage.from(SPRITE_BUCKET).remove([current.image_path]);
      setFile(null);
      await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      toast.success(`${SPRITE_ACTION_LABELS[action]} 애니메이션을 저장했어요.`);
    } catch (e) {
      toast.error(`저장 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!current) return;
    try {
      const { error } = await supabase.from('survival_sprite_animations').delete().eq('id', current.id);
      if (error) throw error;
      await supabase.storage.from(SPRITE_BUCKET).remove([current.image_path]);
      await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      toast.success('기본 캐릭터로 되돌렸어요.');
    } catch (e) { toast.error(`삭제 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`); }
  };

  const isTribeTarget = CHARACTER === 'tribe' || CHARACTER.startsWith('tribe:');
  const actionTitle = isTribeTarget ? (TRIBE_ACTION_TITLE[action] ?? SPRITE_ACTION_LABELS[action]) : SPRITE_ACTION_LABELS[action];
  const src = preview ?? current?.url;
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{actionTitle} <span className="text-xs text-muted-foreground">({action})</span></h3>
        {current && <Button size="icon" variant="ghost" onClick={remove} aria-label="삭제"><Trash2 className="h-4 w-4" /></Button>}
      </div>
      <div className="flex h-28 items-center justify-center rounded bg-muted">
        {src ? (
          <SpriteAnimator url={src} frames={frames} fps={fps} height={96} />
        ) : isTribeTarget ? (
          <div className="flex flex-col items-center gap-1">
            <TribeSprite
              action={action}
              tribeClass={CHARACTER.startsWith('tribe:') ? (CHARACTER.slice(6) as never) : undefined}
              height={64}
            />
            <span className="text-[11px] text-muted-foreground">기본 4프레임 스프라이트 사용 중</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">기본 그림 사용 중</span>
        )}
      </div>
      <Input type="file" accept="image/png,image/webp,image/gif" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <div className="space-y-1"><Label>프레임 수: {frames}</Label><Slider min={1} max={16} step={1} value={[frames]} onValueChange={([v]) => setFrames(v)} /></div>
      <div className="space-y-1"><Label>재생 속도: {fps} FPS</Label><Slider min={1} max={24} step={1} value={[fps]} onValueChange={([v]) => setFps(v)} /></div>
      <Button className="min-h-11 w-full" onClick={save} disabled={saving || (!file && !current)}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 저장
      </Button>
    </div>
  );
}

export default function SpriteAssets() {
  useCustomCatalog();
  const [target, setTarget] = useState('tribe:tank');
  const targets = buildTargets();
  const isTribe = target === 'tribe' || target.startsWith('tribe:');
  const actions = target.startsWith('hunter') ? SPRITE_ACTIONS : isTribe ? TRIBE_ACTIONS : MOB_ACTIONS;
  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">캐릭터·4대 부족 용병·몹 애니메이션</h1>
        <p className="text-sm text-muted-foreground">
          프레임을 가로 한 줄로 이어 붙인 스프라이트 시트(PNG/WebP)를 올리세요. 부족 용병은 피격 모션 없이 <b>걷기(walk)</b>와 <b>행동 액션(attack / gather)</b>만 사용합니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="4대 부족 용병 빠른 선택">
        {TRIBE_TARGETS.map(t => (
          <Button
            key={t.key}
            type="button"
            size="sm"
            variant={target === t.key ? 'default' : 'outline'}
            onClick={() => setTarget(t.key)}
            className="text-xs"
          >
            {t.label}
          </Button>
        ))}
      </div>
      <select aria-label="대상 선택" className="min-h-11 w-full max-w-xs rounded-md border bg-background px-3" value={target} onChange={e => setTarget(e.target.value)}>
        {targets.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
      </select>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map(a => <ActionCard key={`${target}-${a}`} action={a} CHARACTER={target} />)}
      </div>
    </div>
  );
}
