import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Package, Puzzle, BookOpen, FileText,
  Plus, Trash2, Edit2, Save, X, GripVertical,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const elementTypeConfig = {
  item: { label: '아이템', icon: Package, color: '#22d3ee' },
  quiz: { label: '퀴즈', icon: Puzzle, color: '#a855f7' },
  puzzle: { label: '퍼즐', icon: Puzzle, color: '#f97316' },
  story: { label: '스토리', icon: BookOpen, color: '#10b981' },
};

type ElementType = keyof typeof elementTypeConfig;

export default function ThemeDetail() {
  const { themeId } = useParams<{ themeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<any>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<ElementType>('item');
  const [formIcon, setFormIcon] = useState('package');

  const { data: theme, isLoading: themeLoading } = useQuery({
    queryKey: ['theme', themeId],
    queryFn: async () => {
      const { data, error } = await supabase.from('themes').select('*').eq('id', themeId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!themeId,
  });

  const { data: elements = [], isLoading: elementsLoading } = useQuery({
    queryKey: ['theme-elements', themeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_elements')
        .select('*')
        .eq('theme_id', themeId!)
        .order('element_type')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!themeId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        theme_id: themeId!,
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        element_type: formType as any,
        icon: formIcon || 'package',
      };
      if (editingElement) {
        const { error } = await supabase.from('theme_elements').update(payload).eq('id', editingElement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('theme_elements').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingElement ? '요소 수정 완료' : '요소 추가 완료' });
      queryClient.invalidateQueries({ queryKey: ['theme-elements', themeId] });
      closeDialog();
    },
    onError: (e: any) => toast({ title: '저장 실패', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('theme_elements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: '요소 삭제 완료' });
      queryClient.invalidateQueries({ queryKey: ['theme-elements', themeId] });
    },
    onError: (e: any) => toast({ title: '삭제 실패', description: e.message, variant: 'destructive' }),
  });

  const openCreate = () => {
    setEditingElement(null);
    setFormTitle('');
    setFormDesc('');
    setFormType('item');
    setFormIcon('package');
    setDialogOpen(true);
  };

  const openEdit = (el: any) => {
    setEditingElement(el);
    setFormTitle(el.title);
    setFormDesc(el.description || '');
    setFormType(el.element_type);
    setFormIcon(el.icon || 'package');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingElement(null);
  };

  const filteredElements = activeTab === 'all'
    ? elements
    : elements.filter(e => e.element_type === activeTab);

  const typeCounts = elements.reduce((acc, el) => {
    acc[el.element_type] = (acc[el.element_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (themeLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!theme) {
    return <div className="p-6 text-center text-muted-foreground">테마를 찾을 수 없습니다</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/themes')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> 테마 목록
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: (theme.color_primary || '#6366f1') + '20' }}
            >
              <BookOpen className="h-5 w-5" style={{ color: theme.color_primary || '#6366f1' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{theme.name}</h1>
              <p className="text-muted-foreground text-[15px]">{theme.description}</p>
            </div>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="w-4 h-4" /> 요소 추가
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(elementTypeConfig) as [ElementType, typeof elementTypeConfig[ElementType]][]).map(([type, cfg]) => (
          <Card key={type} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: cfg.color + '20' }}>
                <cfg.icon className="h-4 w-4" style={{ color: cfg.color }} />
              </div>
              <div>
                <div className="text-xl font-bold">{typeCounts[type] || 0}</div>
                <div className="text-xs text-muted-foreground">{cfg.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Elements list */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 h-10">
          <TabsTrigger value="all" className="text-[13px]">전체 ({elements.length})</TabsTrigger>
          {(Object.entries(elementTypeConfig) as [ElementType, typeof elementTypeConfig[ElementType]][]).map(([type, cfg]) => (
            <TabsTrigger key={type} value={type} className="text-[13px] gap-1">
              <cfg.icon className="h-3.5 w-3.5" />
              {cfg.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {elementsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : filteredElements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>등록된 요소가 없습니다</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                <Plus className="w-3.5 h-3.5 mr-1" /> 첫 요소 추가하기
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredElements.map(el => {
                const cfg = elementTypeConfig[el.element_type as ElementType] || elementTypeConfig.item;
                return (
                  <div
                    key={el.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.color + '15' }}>
                      <cfg.icon className="h-4 w-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{el.title}</div>
                      {el.description && (
                        <div className="text-xs text-muted-foreground truncate">{el.description}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{cfg.label}</Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(el)} className="p-1.5 hover:bg-muted rounded">
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`"${el.title}" 요소를 삭제하시겠습니까?`)) deleteMutation.mutate(el.id); }}
                        className="p-1.5 hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingElement ? '요소 수정' : '새 요소 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">유형</label>
              <Select value={formType} onValueChange={v => setFormType(v as ElementType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(elementTypeConfig) as [ElementType, typeof elementTypeConfig[ElementType]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">제목</label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="요소 제목" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">설명</label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="요소 설명 (선택)" rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">아이콘명</label>
              <Input value={formIcon} onChange={e => setFormIcon(e.target.value)} placeholder="lucide 아이콘명 (예: package, puzzle)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>취소</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!formTitle.trim() || saveMutation.isPending}>
              <Save className="w-4 h-4 mr-1" /> {saveMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
