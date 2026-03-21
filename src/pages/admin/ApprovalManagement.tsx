import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, MapPin, Building2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ApprovalManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: missions = [] } = useQuery({
    queryKey: ['pending-missions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('missions')
        .select('*, regions(name)')
        .eq('status', '승인대기')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const { error } = await supabase
        .from('missions')
        .update({ status: '승인완료', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', missionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-missions'] });
      toast({ title: '승인 완료', description: '미션이 승인되었습니다.' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('missions')
        .update({
          status: '반려',
          rejection_reason: reason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-missions'] });
      setRejectId(null);
      setRejectReason('');
      toast({ title: '반려 완료', description: '미션이 반려되었습니다.' });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <CheckCircle className="h-6 w-6 text-primary" />
        승인 관리
      </h1>

      {missions.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            승인 대기 중인 미션이 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {missions.map((m: any) => (
            <Card key={m.id} className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{m.title}</CardTitle>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {m.regions?.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {m.floor}층
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-accent border-accent/50">승인대기</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {m.description && <p className="text-sm text-muted-foreground mb-3">{m.description}</p>}
                {m.quiz_content && (
                  <div className="bg-secondary/50 rounded-lg p-3 mb-3 text-sm">
                    <span className="font-medium">퀴즈:</span> {m.quiz_content}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1" onClick={() => approveMutation.mutate(m.id)}>
                    <CheckCircle className="h-4 w-4" /> 승인
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => setRejectId(m.id)}>
                    <XCircle className="h-4 w-4" /> 반려
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rejectId} onOpenChange={open => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반려 사유</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="반려 사유를 입력해주세요..."
            rows={4}
          />
          <Button
            variant="destructive"
            onClick={() => rejectId && rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
            disabled={!rejectReason.trim()}
          >
            반려 확정
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
