import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Shield, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState<Tables<'profiles'> | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('sub_admin');

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*');
      return data || [];
    },
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('*');
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ profileId, role, regionId }: { profileId: string; role: string; regionId: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: role as any, assigned_region: regionId })
        .eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setEditingProfile(null);
      toast({ title: '업데이트 완료', description: '관리자 정보가 수정되었습니다.' });
    },
  });

  const getRegionName = (regionId: string | null) => {
    if (!regionId) return '미배정';
    return regions.find(r => r.id === regionId)?.name || '알 수 없음';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          관리자 관리
        </h1>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">전체 관리자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>권한</TableHead>
                <TableHead>담당 지역</TableHead>
                <TableHead className="w-[80px]">편집</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.display_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell>
                    <Badge variant={p.role === 'main_admin' ? 'default' : 'secondary'}>
                      {p.role === 'main_admin' ? 'Main Admin' : 'Sub Admin'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getRegionName(p.assigned_region)}</TableCell>
                  <TableCell>
                    <Dialog open={editingProfile?.id === p.id} onOpenChange={open => {
                      if (open) {
                        setEditingProfile(p);
                        setSelectedRole(p.role);
                        setSelectedRegion(p.assigned_region || '');
                      } else {
                        setEditingProfile(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>관리자 수정 — {p.display_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>권한</Label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="main_admin">Main Admin</SelectItem>
                                <SelectItem value="sub_admin">Sub Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>담당 지역</Label>
                            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                              <SelectTrigger><SelectValue placeholder="선택..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">미배정</SelectItem>
                                {regions.map(r => (
                                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => updateMutation.mutate({
                              profileId: p.id,
                              role: selectedRole,
                              regionId: selectedRegion === 'none' ? null : selectedRegion || null,
                            })}
                          >
                            저장
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
