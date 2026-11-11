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

const TARGETS = [...[...HERO_TIERS].reverse().map(h => ({ key: h.key, label: h.label })), ...Object.entries(CREATURES).map(([k, c]) => ({ key: `mob:${k}`, label: `몹 · ${c.name}` }))];
const MOB_ACTIONS: SpriteAction[] = ['idle', 'attack'];

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

  const src = preview ?? current?.url;
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{SPRITE_ACTION_LABELS[action]} <span className="text-xs text-muted-foreground">({action})</span></h3>
        {current && <Button size="icon" variant="ghost" onClick={remove} aria-label="삭제"><Trash2 className="h-4 w-4" /></Button>}
      </div>
      <div className="flex h-28 items-center justify-center rounded bg-muted">
        {src ? <SpriteAnimator url={src} frames={frames} fps={fps} height={96} /> : <span className="text-sm text-muted-foreground">기본 그림 사용 중</span>}
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
  const [target, setTarget] = useState('hunter');
  const actions = target.startsWith('hunter') ? SPRITE_ACTIONS : MOB_ACTIONS;
  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">캐릭터·몹 애니메이션</h1>
        <p className="text-sm text-muted-foreground">프레임을 가로 한 줄로 이어 붙인 스프라이트 시트(PNG/WebP)를 올리세요. 모든 프레임은 같은 너비여야 합니다.</p>
      </div>
      <select aria-label="대상 선택" className="min-h-11 w-full max-w-xs rounded-md border bg-background px-3" value={target} onChange={e => setTarget(e.target.value)}>
        {TARGETS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
      </select>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map(a => <ActionCard key={`${target}-${a}`} action={a} CHARACTER={target} />)}
      </div>
    </div>
  );
}
