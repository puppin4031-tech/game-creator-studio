import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const CATEGORIES = { bug: '버그 신고', idea: '제안', account: '계정', general: '기타' } as const;
type Category = keyof typeof CATEGORIES;

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

export default function SupportInquiryDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState<Category>('bug');
  const [message, setMessage] = useState('');

  const history = useQuery({
    queryKey: ['my-inquiries', user?.id],
    enabled: open && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('support_inquiries')
        .select('id, category, message, status, admin_reply, created_at')
        .order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요해요');
      const { error } = await supabase.from('support_inquiries')
        .insert({ user_id: user.id, email: user.email ?? null, category, message: message.trim() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('문의가 접수됐어요. 답변은 여기서 확인할 수 있어요.'); setMessage(''); void qc.invalidateQueries({ queryKey: ['my-inquiries'] }); },
    onError: (e: Error) => toast.error(`문의 전송 실패: ${e.message}`),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-pixel max-h-[85dvh] overflow-y-auto overscroll-contain">
        <DialogHeader><DialogTitle>문의하기</DialogTitle></DialogHeader>
        {!user ? <p className="text-sm text-muted-foreground">로그인 후 문의할 수 있어요.</p> : (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(CATEGORIES) as Category[]).map((c) => (
                <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}
                  className={`pixel-btn min-h-11 text-xs ${category === c ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>{CATEGORIES[c]}</button>
              ))}
            </div>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 2000))} rows={5} placeholder="어떤 점이 불편하셨나요?" />
            <button type="button" disabled={message.trim().length < 2 || send.isPending} onClick={() => send.mutate()}
              className="pixel-btn flex min-h-11 w-full items-center justify-center bg-primary text-primary-foreground disabled:opacity-50">
              {send.isPending ? <Loader2 className="!h-5 !w-5 animate-spin" /> : '보내기'}
            </button>
            <div className="space-y-2 pt-2">
              <b className="text-sm">내 문의</b>
              {history.isLoading && <Loader2 className="!h-5 !w-5 animate-spin" />}
              {history.data?.length === 0 && <p className="text-xs text-muted-foreground">아직 문의가 없어요.</p>}
              {history.data?.map((q) => (
                <div key={q.id} className="rounded border border-border p-2 text-xs">
                  <div className="flex justify-between text-muted-foreground"><span>{CATEGORIES[q.category as Category] ?? q.category}</span><span>{q.status === 'done' ? '답변 완료' : '접수됨'}</span></div>
                  <p className="mt-1 whitespace-pre-wrap">{q.message}</p>
                  {q.admin_reply && <p className="mt-1 whitespace-pre-wrap border-t border-border pt-1 text-primary">답변: {q.admin_reply}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
