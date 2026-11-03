import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useItemCatalog, type CatalogItem } from '@/hooks/useItemCatalog';
import { SPRITE_BUCKET } from '@/hooks/useSpriteAnimations';
import type { ItemCategory, Rarity } from '@/lib/survival/items';

const CATEGORIES: Record<ItemCategory, string> = {
  material: '원자재', ore: '광석', food: '음식', processed: '가공품', tool: '도구', weapon: '무기', armor: '방어구', trinket: '장신구',
};
const RARITIES: Record<Rarity, string> = { common: '일반', uncommon: '고급', rare: '희귀', epic: '영웅' };

type Draft = Omit<CatalogItem, 'imageUrl' | 'edited' | 'spriteKey'> & { file: File | null; isNew: boolean; preview: string | null };

function toDraft(it: CatalogItem | null): Draft {
  return it
    ? { ...it, file: null, isNew: false, preview: it.imageUrl }
    : { itemId: '', name: '', description: '', category: 'material', rarity: 'common', weight: 1, imagePath: null, isCustom: true, file: null, isNew: true, preview: null };
}

function ItemEditor({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const qc = useQueryClient();
  const [d, setD] = useState(draft);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!/^[a-z0-9_]{2,40}$/.test(d.itemId)) { toast.error('아이템 ID는 영문 소문자·숫자·_ 2~40자로 입력해 주세요.'); return; }
    if (!d.name.trim()) { toast.error('이름을 입력해 주세요.'); return; }
    setSaving(true);
    try {
      let path = d.imagePath;
      if (d.file) {
        path = `items/${d.itemId}-${Date.now()}.${d.file.name.split('.').pop() ?? 'png'}`;
        const { error } = await supabase.storage.from(SPRITE_BUCKET).upload(path, d.file, { contentType: d.file.type });
        if (error) throw error;
      }
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from('survival_item_catalog').upsert({
        item_id: d.itemId, name: d.name.trim(), description: d.description.trim(), category: d.category, rarity: d.rarity,
        weight: Number(d.weight) || 0, image_path: path, is_custom: d.isCustom, updated_by: u.user?.id, updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      if (d.file && draft.imagePath && draft.imagePath !== path) await supabase.storage.from(SPRITE_BUCKET).remove([draft.imagePath]);
      await qc.invalidateQueries({ queryKey: ['survival-item-catalog'] });
      toast.success('아이템을 저장했어요.');
      onClose();
    } catch (e) { toast.error(`저장 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`); }
    finally { setSaving(false); }
  };

  const resetOverride = async () => {
    try {
      const { error } = await supabase.from('survival_item_catalog').delete().eq('item_id', d.itemId);
      if (error) throw error;
      if (draft.imagePath) await supabase.storage.from(SPRITE_BUCKET).remove([draft.imagePath]);
      await qc.invalidateQueries({ queryKey: ['survival-item-catalog'] });
      toast.success(d.isCustom ? '아이템을 삭제했어요.' : '기본값으로 되돌렸어요.');
      onClose();
    } catch (e) { toast.error(`실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center rounded border bg-muted">
          {d.preview ? <img src={d.preview} alt="" className="pixelated h-16 w-16 object-contain" /> : <span className="text-xs text-muted-foreground">이미지 없음</span>}
        </div>
        <Input type="file" accept="image/png,image/webp,image/gif" onChange={(e) => { const f = e.target.files?.[0] ?? null; set('file', f); set('preview', f ? URL.createObjectURL(f) : draft.preview); }} />
      </div>
      <div><Label>아이템 ID</Label><Input value={d.itemId} disabled={!d.isNew} onChange={(e) => set('itemId', e.target.value.toLowerCase())} placeholder="예: stone_hammer" /></div>
      <div><Label>이름</Label><Input value={d.name} maxLength={40} onChange={(e) => set('name', e.target.value)} /></div>
      <div><Label>설명</Label><Textarea value={d.description} maxLength={300} onChange={(e) => set('description', e.target.value)} /></div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label>분류</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={d.category} onChange={(e) => set('category', e.target.value as ItemCategory)}>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div><Label>희귀도</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={d.rarity} onChange={(e) => set('rarity', e.target.value as Rarity)}>
            {Object.entries(RARITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div><Label>무게(kg)</Label><Input type="number" min={0} max={200} step={0.5} value={d.weight} onChange={(e) => set('weight', Number(e.target.value))} /></div>
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving} className="flex-1">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}저장</Button>
        {!d.isNew && (
          <Button variant="outline" onClick={resetOverride}>{d.isCustom ? '삭제' : '기본값 복원'}</Button>
        )}
      </div>
    </div>
  );
}

export default function ItemCatalog() {
  const { data, isLoading, error } = useItemCatalog();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ItemCategory | 'all'>('all');
  const [editing, setEditing] = useState<Draft | null>(null);

  const list = useMemo(() => (data ?? []).filter((it) =>
    (cat === 'all' || it.category === cat) && (!q || it.name.includes(q) || it.itemId.includes(q.toLowerCase()))), [data, q, cat]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">생존 아이템 관리</h1>
        <span className="text-sm text-muted-foreground">{data?.length ?? 0}개</span>
        <Button className="ml-auto" onClick={() => setEditing(toDraft(null))}><Plus className="mr-1 h-4 w-4" />새 아이템</Button>
      </div>
      <p className="text-sm text-muted-foreground">게임에 들어있는 아이템은 자동으로 이 목록에 나타납니다. 이름·설명·무게·이미지를 바꾸거나 새 아이템을 등록할 수 있어요.</p>
      <div className="flex flex-wrap gap-2">
        <div className="relative"><Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="검색" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {(['all', ...Object.keys(CATEGORIES)] as const).map((c) => (
          <Button key={c} size="sm" variant={cat === c ? 'default' : 'outline'} onClick={() => setCat(c as ItemCategory | 'all')}>{c === 'all' ? '전체' : CATEGORIES[c as ItemCategory]}</Button>
        ))}
      </div>
      {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}
      {error && <p className="text-destructive">불러오기 실패: {(error as Error).message}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((it) => (
          <button key={it.itemId} type="button" onClick={() => setEditing(toDraft(it))} className="flex flex-col items-center gap-1 rounded-lg border bg-card p-3 text-left hover:border-primary">
            {it.imageUrl ? <img src={it.imageUrl} alt="" className="pixelated h-12 w-12 object-contain" /> : <div className="h-12 w-12 rounded bg-muted" />}
            <b className="text-sm">{it.name}</b>
            <span className="text-[11px] text-muted-foreground">{it.itemId} · {it.weight}kg</span>
            <div className="flex gap-1">
              <Badge variant="secondary">{CATEGORIES[it.category]}</Badge>
              {it.isCustom ? <Badge>신규</Badge> : it.edited && <Badge variant="outline">수정됨</Badge>}
            </div>
          </button>
        ))}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.isNew ? '새 아이템 등록' : '아이템 편집'}</DialogTitle></DialogHeader>
          {editing && <ItemEditor key={editing.itemId || 'new'} draft={editing} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
