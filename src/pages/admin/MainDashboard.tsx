import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MapPin, CheckSquare, AlertCircle } from 'lucide-react';

export default function MainDashboard() {
  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*');
      return data || [];
    },
  });

  const { data: missions } = useQuery({
    queryKey: ['all-missions'],
    queryFn: async () => {
      const { data } = await supabase.from('missions').select('*');
      return data || [];
    },
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('*');
      return data || [];
    },
  });

  const pendingCount = missions?.filter(m => m.status === '승인대기').length || 0;
  const subAdminCount = profiles?.filter(p => p.role === 'sub_admin').length || 0;

  const stats = [
    { label: '서브 관리자', value: subAdminCount, icon: Users, color: 'text-blue-400' },
    { label: '전체 지역', value: regions?.length || 0, icon: MapPin, color: 'text-primary' },
    { label: '전체 미션', value: missions?.length || 0, icon: CheckSquare, color: 'text-accent' },
    { label: '승인 대기', value: pendingCount, icon: AlertCircle, color: 'text-destructive' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">메인 관리자 대시보드</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
