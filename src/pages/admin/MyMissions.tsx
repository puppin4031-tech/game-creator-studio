import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Send, MapPin, Building2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  '작성중': 'secondary',
  '승인대기': 'outline',
  '승인완료': 'default',
  '반려': 'destructive',
};

export default function MyMissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: missions = [] } = useQuery({
    queryKey: ['my-missions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('missions')
        .select('*, regions(name)')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const requestApproval = useMutation({
    mutationFn: async (missionId: string) => {
      const { error } = await supabase
        .from('missions')
        .update({ status: '승인대기' })
        .eq('id', missionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-missions'] });
      toast({ title: '승인 요청', description: '미션이 승인 요청되었습니다.' });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-primary" />
        내 미션 현황
      </h1>

      {missions.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            생성한 미션이 없습니다
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {missions.map((m: any) => (
            <Card key={m.id} className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  <Badge variant={statusVariant[m.status] || 'secondary'}>{m.status}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.regions?.name}</span>
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{m.floor}층</span>
                </div>
              </CardHeader>
              <CardContent>
                {m.description && <p className="text-sm text-muted-foreground mb-2">{m.description}</p>}
                {m.status === '반려' && m.rejection_reason && (
                  <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-2">
                    <strong>반려 사유:</strong> {m.rejection_reason}
                  </div>
                )}
                {(m.status === '작성중' || m.status === '반려') && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => requestApproval.mutate(m.id)}>
                    <Send className="h-3.5 w-3.5" /> 승인 요청하기
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
