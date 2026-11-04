import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function SupportInbox() {
  const qc = useQueryClient();
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-inquiries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('support_inquiries').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const answer = async (id: string) => {
    setSaving(id);
    try {
      const { error } = await supabase.from('support_inquiries').update({ admin_reply: replies[id]?.trim() || null, status: 'done' }).eq('id', id);
      if (error) throw error;
      toast.success('답변을 저장했어요');
      void qc.invalidateQueries({ queryKey: ['admin-inquiries'] });
    } catch (e) { toast.error(`저장 실패: ${(e as Error).message}`); } finally { setSaving(null); }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">문의함</h1>
      {isLoading && <Loader2 className="animate-spin" />}
      {error && <p className="text-destructive">불러오기 실패</p>}
      {data?.length === 0 && <p className="text-muted-foreground">문의가 없어요.</p>}
      {data?.map((q) => (
        <div key={q.id} className="space-y-2 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={q.status === 'done' ? 'secondary' : 'default'}>{q.status === 'done' ? '완료' : '대기'}</Badge>
            <span>{q.category}</span><span className="text-muted-foreground">{q.email}</span>
            <span className="ml-auto text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString('ko-KR')}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm">{q.message}</p>
          <Textarea rows={2} placeholder="답변 (유저 문의창에 표시)" value={replies[q.id] ?? q.admin_reply ?? ''} onChange={(e) => setReplies((r) => ({ ...r, [q.id]: e.target.value }))} />
          <Button size="sm" disabled={saving === q.id} onClick={() => void answer(q.id)}>답변 저장 · 완료</Button>
        </div>
      ))}
    </div>
  );
}
