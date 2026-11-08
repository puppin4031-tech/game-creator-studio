import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CUSTOM_CATALOG_KEY, useCustomCatalog } from '@/hooks/useCustomCatalog';
import { STRIDE_M } from '@/lib/survival/dinoEggs';
import { ActionCard } from './SpriteAssets';

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : '알 수 없는 오류');

function useSaver() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => PromiseLike<{ error: unknown }>, ok: string) => {
    setBusy(true);
    try {
      const { error } = await fn();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: CUSTOM_CATALOG_KEY });
      toast.success(ok);
    } catch (e) { toast.error(`저장 실패: ${errMsg(e)}`); } finally { setBusy(false); }
  };
  return { busy, run };
}

function PetForm() {
  const { busy, run } = useSaver();
  const [f, setF] = useState({ pet_id: '', name: '', hatch_mode: 'distance', hatch_steps: 500, hatch_meters: 300, max_speed_kmh: 8, weight: 1 });
  const save = async () => {
    const id = slug(f.pet_id);
    if (!id || !f.name.trim()) { toast.error('ID(영문)와 이름을 입력해 주세요.'); return; }
    const { data: u } = await supabase.auth.getUser();
    await run(() => supabase.from('survival_custom_pets').upsert({ ...f, pet_id: id, name: f.name.trim(), updated_by: u.user?.id, updated_at: new Date().toISOString() }), `${f.name} 펫을 저장했어요.`);
  };
  const num = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
      <div className="space-y-1"><Label>ID (영문·숫자)</Label><Input value={f.pet_id} onChange={e => setF({ ...f, pet_id: e.target.value })} placeholder="snow_fox" /></div>
      <div className="space-y-1"><Label>이름</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="아기 눈여우" /></div>
      <div className="space-y-1 sm:col-span-2"><Label>부화 방식</Label>
        <div className="flex gap-2">{(['steps', 'distance'] as const).map(m => <Button key={m} type="button" className="h-11 flex-1" variant={f.hatch_mode === m ? 'default' : 'outline'} onClick={() => setF({ ...f, hatch_mode: m })}>{m === 'steps' ? '걸음 수' : '속도 + 거리'}</Button>)}</div>
      </div>
      {f.hatch_mode === 'steps'
        ? <div className="space-y-1"><Label>필요 걸음 수 (약 {Math.round(f.hatch_steps * STRIDE_M)}m)</Label><Input type="number" min={50} value={f.hatch_steps} onChange={num('hatch_steps')} /></div>
        : <div className="space-y-1"><Label>필요 거리 (m)</Label><Input type="number" min={20} value={f.hatch_meters} onChange={num('hatch_meters')} /></div>}
      <div className="space-y-1"><Label>최대 인정 속도 (km/h, 3~13)</Label><Input type="number" min={3} max={13} value={f.max_speed_kmh} onChange={num('max_speed_kmh')} /></div>
      <div className="space-y-1"><Label>등장 비중 (기본 공룡 1 기준)</Label><Input type="number" min={0} max={100} value={f.weight} onChange={num('weight')} /></div>
      <Button className="h-11 sm:col-span-2" disabled={busy} onClick={save}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 펫 저장</Button>
    </div>
  );
}

function MobForm() {
  const { busy, run } = useSaver();
  const [f, setF] = useState({ mob_id: '', name: '', hp: 20, atk: 3, temper: 'neutral', xp: 20, spawn_weight: 1 });
  const save = async () => {
    const id = slug(f.mob_id);
    if (!id || !f.name.trim()) { toast.error('ID(영문)와 이름을 입력해 주세요.'); return; }
    const { data: u } = await supabase.auth.getUser();
    await run(() => supabase.from('survival_custom_mobs').upsert({ ...f, mob_id: id, name: f.name.trim(), updated_by: u.user?.id, updated_at: new Date().toISOString() }), `${f.name} 몹을 저장했어요.`);
  };
  const num = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
      <div className="space-y-1"><Label>ID (영문·숫자)</Label><Input value={f.mob_id} onChange={e => setF({ ...f, mob_id: e.target.value })} placeholder="ice_bear" /></div>
      <div className="space-y-1"><Label>이름</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="빙하 곰" /></div>
      <div className="space-y-1"><Label>체력 (1~500)</Label><Input type="number" value={f.hp} onChange={num('hp')} /></div>
      <div className="space-y-1"><Label>공격력 (0~50)</Label><Input type="number" value={f.atk} onChange={num('atk')} /></div>
      <div className="space-y-1"><Label>경험치</Label><Input type="number" value={f.xp} onChange={num('xp')} /></div>
      <div className="space-y-1"><Label>등장 비중 (0~10)</Label><Input type="number" step="0.1" value={f.spawn_weight} onChange={num('spawn_weight')} /></div>
      <div className="space-y-1 sm:col-span-2"><Label>성향</Label>
        <div className="flex gap-2">{([['passive', '도망'], ['neutral', '반격'], ['aggressive', '선공']] as const).map(([v, l]) => <Button key={v} type="button" className="h-11 flex-1" variant={f.temper === v ? 'default' : 'outline'} onClick={() => setF({ ...f, temper: v })}>{l}</Button>)}</div>
      </div>
      <Button className="h-11 sm:col-span-2" disabled={busy} onClick={save}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 몹 저장</Button>
    </div>
  );
}

function Row({ title, desc, active, onToggle, onDelete, sprites }: { title: string; desc: string; active: boolean; onToggle: (v: boolean) => void; onDelete: () => void; sprites: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1"><b>{title}</b><p className="text-xs text-muted-foreground">{desc}</p></div>
        <Label className="flex items-center gap-2">사용<Switch checked={active} onCheckedChange={onToggle} /></Label>
        <Button size="icon" variant="ghost" className="h-11 w-11" aria-label="삭제" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{sprites}</div>
    </div>
  );
}

export default function PetMobStudio() {
  const { data, isLoading, error } = useCustomCatalog();
  const { run } = useSaver();
  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">펫·몹 제작</h1>
        <p className="text-sm text-muted-foreground">직접 만든 펫과 몹을 등록하고 스프라이트 시트(가로 한 줄 프레임)를 올리세요. 그림이 없으면 기본 그림으로 보여요.</p>
      </div>
      {error && <p className="text-sm text-destructive">목록을 불러오지 못했어요: {errMsg(error)}</p>}
      <Tabs defaultValue="pets">
        <TabsList><TabsTrigger value="pets" className="min-h-11">펫</TabsTrigger><TabsTrigger value="mobs" className="min-h-11">몹</TabsTrigger></TabsList>
        <TabsContent value="pets" className="space-y-4">
          <PetForm />
          {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {data?.pets.map(p => (
            <Row key={p.pet_id} title={p.name} active={p.is_active}
              desc={`${p.hatch_mode === 'steps' ? `${p.hatch_steps}걸음` : `${p.hatch_meters}m`} · 시속 ${p.max_speed_kmh}km 이하 · 비중 ${p.weight}`}
              onToggle={v => run(() => supabase.from('survival_custom_pets').update({ is_active: v }).eq('pet_id', p.pet_id), '변경했어요.')}
              onDelete={() => run(() => supabase.from('survival_custom_pets').delete().eq('pet_id', p.pet_id), '삭제했어요.')}
              sprites={<ActionCard action="idle" CHARACTER={`pet:${p.pet_id}`} />} />
          ))}
        </TabsContent>
        <TabsContent value="mobs" className="space-y-4">
          <MobForm />
          {data?.mobs.map(m => (
            <Row key={m.mob_id} title={m.name} active={m.is_active} desc={`체력 ${m.hp} · 공격 ${m.atk} · 경험치 ${m.xp} · 비중 ${m.spawn_weight}`}
              onToggle={v => run(() => supabase.from('survival_custom_mobs').update({ is_active: v }).eq('mob_id', m.mob_id), '변경했어요.')}
              onDelete={() => run(() => supabase.from('survival_custom_mobs').delete().eq('mob_id', m.mob_id), '삭제했어요.')}
              sprites={<><ActionCard action="idle" CHARACTER={`mob:custom_${m.mob_id}`} /><ActionCard action="attack" CHARACTER={`mob:custom_${m.mob_id}`} /></>} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
